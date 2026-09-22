import { create } from 'zustand';
import { SYMBOLS, S } from '../data/symbolDefinitions';
import type { SymbolSetId } from '../data/symbolSets';
import { processSingleSymbolEffects } from '../logic/symbolEffects';
import {
    generateChoices as generateChoicesSelection,
    getSymbolPoolProbabilities as getSymbolPoolProbabilitiesSelection,
    type SelectionChoice,
} from '../logic/selection/selectionLogic';
import type { RewardDefinition } from '../data/rewardDefinitions';
import type { PlayerSymbolInstance } from '../types';
import { getEraFromLevel, type KnowledgeResearchCredit } from './gameCalculations';
import {
    createEmptyKnowledgeUpgradeLevels,
    type KnowledgeUpgradeLevels,
} from '../data/knowledgeUpgradeTracks';
import { createActiveStatusesForTurn, getActiveStatusIdsFromStates, getActiveStatusIdsForTurn } from '../data/statusDefinitions';
import type { ActiveStatusState } from '../data/statusDefinitions';
import {
    BOARD_HEIGHT,
    BOARD_WIDTH,
    createEmptyBoard,
    createInstance,
    createStartingBoard,
    expandBoardAt,
    getRemainingBoardExpansionCapacity,
    getStandardSymbolChoiceCount,
    phaseAfterTurnFlowComplete,
    shiftBoardToMatchExpansion,
} from './gameStoreHelpers';
import { createSelectionFlowActions } from './actions/selectionFlow';
import { createTurnFlowActions } from './actions/turnFlow';
import { createGameLifecycleActions } from './actions/gameLifecycle';
import { createBoardInteractionActions } from './actions/boardInteraction';
import type { BoardEffectDelta, PendingThreatFloat } from '../logic/turn/turnTypes';

export { type PlayerSymbolInstance } from '../types';
export { BOARD_HEIGHT, BOARD_WIDTH, MAX_BOARD_HEIGHT, MAX_BOARD_WIDTH } from './gameStoreHelpers';

/**
 * 1920×1080 기준 보드·셀 실제 픽셀 크기.
 * 렌더 시 `Math.min(viewW/1920, viewH/1080)` 만 곱하면 끝.
 */
export const BOARD_LAYOUT_WIDTH_PX  = 912;    // 1920 기준 보드 가로
export const BOARD_LAYOUT_HEIGHT_PX = 664;    // 1920 기준 보드 세로
export const BOARD_CELL_WIDTH_PX    = 170.4;  // 1920 기준 셀 가로
export const BOARD_CELL_HEIGHT_PX   = 163.2;  // 1920 기준 셀 세로
export const BOARD_COL_GAP_PX       = 12;     // 1920 기준 열 간격
/** slot_bg 스프라이트가 보드 바깥으로 더 나오는 여백(1920 기준) */
export const BOARD_BG_SPRITE_PADDING_PX = 8;
export type GamePhase =
    | 'idle'
    | 'spinning'
    | 'showing_new_threats'
    | 'processing'
    | 'food_payment'
    | 'board_expansion_ready'
    | 'board_expansion_placement'
    | 'selection'
    | 'loot_reward_selection'
    | 'board_destroy_selection'
    | 'game_over'
    | 'victory';
export type GameEventLogKind =
    | 'turn_start'
    | 'processing_start'
    | 'symbol_effect'
    | 'processing_end'
    | 'turn_end'
    | 'selection'
    | 'research'
    | 'threat'
    | 'board_action'
    | 'system';

export interface GameEventLogEntry {
    id: string;
    ts: number;
    turn: number;
    kind: GameEventLogKind;
    /** 주체 슬롯 (있으면) */
    slot?: { x: number; y: number };
    /** 주체 심볼 (있으면) */
    symbolId?: number;
    /** 수치 변화 (있으면) */
    delta?: { food: number; gold: number; knowledge: number };
    /** 기여자 스냅샷 (있으면) */
    contributors?: Array<{ x: number; y: number; symbolId?: number }>;
    /** 추가 정보 (디테일용) */
    meta?: Record<string, unknown>;
}

export interface GameState {
    food: number;
    gold: number;
    knowledge: number; // 기존 knowledge
    level: number;
    era: number; // derived from level
    turn: number;
    board: (PlayerSymbolInstance | null)[][];
    playerSymbols: PlayerSymbolInstance[];
    symbolSetId?: SymbolSetId | null;
    symbolSetIds?: SymbolSetId[] | null;
    phase: GamePhase;
    isTutorialMode?: boolean;
    tutorialSpinStep?:
        | 'corn_spin'
        | 'corn_done'
        | 'monument_spin'
        | 'monument_processing'
        | 'monument_done'
        | 'adjacency_spin'
        | 'adjacency_processing'
        | 'adjacency_done'
        | null;
    symbolChoices: SelectionChoice[];
    /** Symbol that opened the current symbol selection when its name should be shown in the UI. */
    symbolSelectionSymbolSourceId?: number | null;
    /** Whether the current selection is the standard selection granted at the end of each turn. */
    isTurnSymbolSelection?: boolean;
    lastEffects: BoardEffectDelta[];
    counterDisplayOverrides: Array<{ x: number; y: number; text: string | null }>;
    /** processing 중 누적 합산 (food, gold, knowledge) */
    runningTotals: { food: number; gold: number; knowledge: number };
    /** 현재 처리 중인 슬롯 좌표 (null이면 하이라이트 없음) */
    activeSlot: { x: number; y: number } | null;
    /** 현재 슬롯의 효과에 기여한 인접 심볼 좌표 */
    activeContributors: { x: number; y: number }[];
    /** phase 1 시작 시 미리 저장해두는 이번 슬롯의 예정 contributor 목록 (X 숨김용) */
    pendingContributors: { x: number; y: number }[];
    /** 상호작용 표시 단계: 1=들어올림만, 2=contributor wobble 중, 3=wobble 끝남 */
    effectPhase: 1 | 2 | 3 | null;
    /** 이번 processing에서 phase 3을 한 번이라도 거쳤으면 true → 파괴 마킹을 계속 표시 */
    effectPhase3ReachedThisRun: boolean;
    /** Marked symbols are blinking just before they are removed from the board. */
    destroyRemovalBlinkStartedAtMs?: number | null;
    /** Earthquake column shake before marked symbols fade. */
    earthquakeFx?: {
        column: number;
        affected: { x: number; y: number }[];
        startedAtMs: number;
        durationMs: number;
    } | null;
    /** 인접 전리품 합류: 흡수 스프라이트 이동 연출 타임링 (Pixi 렌더용) */
    lootMergeFx: {
        absorbed: { x: number; y: number };
        receiver: { x: number; y: number };
        durationMs: number;
        startedAtPerfMs: number;
    } | null;
    /** F12 로그 오버레이용 이벤트 로그 (시간순 누적) */
    eventLog: GameEventLogEntry[];
    /** spinning 시작 직전의 보드 (릴 시작점용) */
    prevBoard: (PlayerSymbolInstance | null)[][];
    /** 지식 업그레이드 아이콘 위 플로팅 (기본 생산량 +N 타입 업그레이드는 제외) */
    knowledgeUpgradeFloats: Array<
        | { upgradeId: number; text: string; color?: string }
        | { upgradeId: number; inlineParts: { text: string; color: string }[] }
    >;
    /** Save compatibility: religion symbols are now available from game start. */
    religionUnlocked: boolean;
    /** Legacy save compatibility. New games and loaded saves keep this empty. */
    unlockedKnowledgeUpgrades: number[];
    /** Legacy save compatibility; no knowledge upgrade levels are used. */
    knowledgeUpgradeLevels?: KnowledgeUpgradeLevels;
    /** Legacy save compatibility; research points are no longer awarded. */
    levelUpResearchPoints: number;
    /** Legacy save compatibility; always empty. */
    knowledgeResearchCredits?: KnowledgeResearchCredit[];
    /** Era upgrades grant three single-slot board expansions. */
    pendingBoardExpansions: number;
    /** 이번 선택 페이즈에서 리롤한 횟수 */
    rerollsThisTurn: number;

    /** Legacy save compatibility; no research overlay uses this field. */
    returnPhaseAfterDevKnowledgeUpgrade: GamePhase | null;

    naturalDisasterThreat: number;
    pendingDevNaturalDisasterId: number | null;
    activeStatusIds: number[];
    activeStatuses?: ActiveStatusState[];
    /** 첫 배치된 재해 심볼에 플로팅 텍스트 표시 후 효과 iteration 진행용 */
    pendingNewThreatFloats: PendingThreatFloat[];
    /** 칙령 발동 시 소비할 심볼 위치/인스턴스 */
    pendingEdictSource: { x: number; y: number; instanceId: string } | null;
    /** 영토 정비(22): 남은 보너스 선택 (첫 턴은 symbolChoices로 이미 지형 3개가 열림) */
    bonusSelectionQueue: Array<'terrain' | 'any'>;
    /** 개척자(68): 다음 generateChoices에서 지형 1칸 이상 강제 */
    forceTerrainInNextSymbolChoices: boolean;
    /** 왕도 개척(54): 다음 일반 선택은 이벤트만 표시 */
    forceEventsInNextSymbolChoices: boolean;
    /** 사절단(70): 심볼 선택 단계 첫 리롤(들) 무료 */
    freeSelectionRerolls: number;
    pendingFoodPayment: boolean;

    // Actions
    spinBoard: () => void;
    payFoodCost: () => void;
    claimBoardExpansion: () => void;
    /** spinning 애니메이션이 끝난 후 호출 — pendingNewThreatFloats 있으면 먼저 플로팅 표시, 없으면 processing 시작 */
    startProcessing: () => void;
    /** 플로팅 표시 후 실제 processing 시작 (뷰에서 호출) */
    continueProcessingAfterNewThreatFloats: () => void;
    selectSymbol: (symbolId: number) => void;
    selectEvent: (eventId: number) => void;
    skipSelection: () => void;
    rerollSymbols: () => void;

    selectUpgrade: (upgradeId: number) => void;
    expandBoardSlotAt: (x: number, y: number) => void;

    initializeGame: () => void;
    startGameWithDraft: (symbolIds: number[], symbolSetIds?: readonly SymbolSetId[] | null) => void;
    startTutorialGame: () => void;
    setupTutorialCornStep: () => void;
    spinTutorialCornStep: () => void;
    setupTutorialSelectionStep: () => void;
    spinTutorialMonumentStep: () => void;
    setupTutorialAdjacencyStep: () => void;
    spinTutorialAdjacencyStep: () => void;
    devAddSymbol: (symbolId: number) => void;
    devRemoveSymbol: (instanceId: string) => void;
    devSetStat: (stat: 'food' | 'gold' | 'knowledge' | 'level' | 'turn', value: number) => void;
    devAddBoardExpansion: () => void;
    devForceScreen: (screen: 'symbol' | 'level') => void;
    devTriggerNaturalDisaster: (symbolId: number) => void;
    /** 칙령: idle 시 발동하여 인접 심볼 파괴 대상을 선택 */
    activateEdictAt: (x: number, y: number) => void;
    /** 칙령: 인접 보드 심볼 파괴 확정 */
    confirmEdictDestroyAt: (x: number, y: number) => void;
    /** 칙령 대상 선택 취소 */
    cancelEdictPick: () => void;
    /** 부족 마을: idle 시 소모하여 심볼 선택 페이즈를 연속 발동 */
    consumeTribalVillageAt: (x: number, y: number) => void;

    /** 전리품: idle 시 개봉 — 보상 선택지 3개 표시 */
    openLootAt: (x: number, y: number) => void;
    /** 전리품 보상 선택지 목록 (loot_reward_selection phase) */
    lootRewardChoices: RewardDefinition[];
    /** 개봉 중인 전리품의 위치와 심볼 ID */
    pendingLootSlot: { x: number; y: number; symbolId: number } | null;
    /** 전리품 보상 선택 확정 */
    selectLootReward: (rewardId: number) => void;

    /** F12 로그 오버레이용 */
    appendEventLog: (entry: Omit<GameEventLogEntry, 'id' | 'ts'> & { ts?: number; id?: string }) => void;
    clearEventLog: () => void;
}

const getAdjacentCoords = (x: number, y: number): { x: number; y: number }[] => {
    const board = useGameStore.getState().board;
    const adj: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (
                nx >= 0 &&
                nx < board.length &&
                ny >= 0 &&
                ny < (board[nx]?.length ?? 0) &&
                Object.prototype.hasOwnProperty.call(board[nx], ny)
            ) adj.push({ x: nx, y: ny });
        }
    }
    return adj;
};

const INITIAL_STARTING_BOARD_STATE = createStartingBoard();

const getSelectionPhaseFreeRerollFloor = (_upgrades: readonly number[]): number => 0;


// (선택 풀 구성 로직은 `../logic/selection/selectionLogic.ts`로 이동)

/** 현재 시대에 등장 가능한 심볼 플랫 풀 빌드 (균등 확률용) */
export const getSymbolPoolProbabilities = (era: number, religionUnlocked: boolean, symbolSetIds?: readonly SymbolSetId[] | null, symbolSetId?: SymbolSetId | null): { id: number; name: string; symbolType: number; probability: number }[] =>
    getSymbolPoolProbabilitiesSelection({
        era,
        religionUnlocked,
        upgrades: (useGameStore.getState().unlockedKnowledgeUpgrades || []).map(Number),
        symbolSetIds: symbolSetIds ?? useGameStore.getState().symbolSetIds,
        symbolSetId: symbolSetId ?? useGameStore.getState().symbolSetId,
    });

export const useGameStore = create<GameState>((set, get) => ({
    food: 0,
    gold: 0,
    knowledge: 0,
    level: 0,
    era: 0,
    turn: 0,
    board: INITIAL_STARTING_BOARD_STATE.board,
    playerSymbols: INITIAL_STARTING_BOARD_STATE.playerSymbols,
    symbolSetId: null,
    symbolSetIds: null,
    phase: 'idle' as GamePhase,
    isTutorialMode: false,
    tutorialSpinStep: null,
    symbolChoices: [],
    symbolSelectionSymbolSourceId: null,
    isTurnSymbolSelection: false,
    lastEffects: [],
    counterDisplayOverrides: [],
    runningTotals: { food: 0, gold: 0, knowledge: 0 },
    activeSlot: null,
    activeContributors: [],
    pendingContributors: [],
    effectPhase: null,
    effectPhase3ReachedThisRun: false,
    destroyRemovalBlinkStartedAtMs: null,
    earthquakeFx: null,
    lootMergeFx: null,
    eventLog: [],
    prevBoard: createEmptyBoard(),
    knowledgeUpgradeFloats: [],
    religionUnlocked: true,
    unlockedKnowledgeUpgrades: [],
    knowledgeUpgradeLevels: createEmptyKnowledgeUpgradeLevels(),

    levelUpResearchPoints: 0,
    knowledgeResearchCredits: [],
    pendingBoardExpansions: 0,
    rerollsThisTurn: 0,
    returnPhaseAfterDevKnowledgeUpgrade: null,

    naturalDisasterThreat: 0,
    pendingDevNaturalDisasterId: null,
    activeStatusIds: getActiveStatusIdsForTurn(0),
    activeStatuses: createActiveStatusesForTurn(0),
    pendingNewThreatFloats: [],
    pendingEdictSource: null,
    bonusSelectionQueue: [],
    forceTerrainInNextSymbolChoices: false,
    forceEventsInNextSymbolChoices: false,
    freeSelectionRerolls: 0,
    pendingFoodPayment: false,
    lootRewardChoices: [],
    pendingLootSlot: null,

    appendEventLog: (entry) => {
        const MAX = 2000;
        const ts = entry.ts ?? Date.now();
        const id = entry.id ?? `${ts}-${Math.random().toString(16).slice(2)}`;
        set((s) => {
            const base = entry as Omit<GameEventLogEntry, 'id' | 'ts'> & Partial<Pick<GameEventLogEntry, 'id' | 'ts'>>;
            const next = [...s.eventLog, { ...base, id, ts } as GameEventLogEntry];
            return { eventLog: next.length > MAX ? next.slice(next.length - MAX) : next };
        });
    },
    clearEventLog: () => set({ eventLog: [] }),

    expandBoardSlotAt: (x, y) => {
        const state = get();
        if (state.pendingBoardExpansions <= 0) return;
        const expanded = expandBoardAt(state.board, x, y);
        if (!expanded) return;
        const shiftedPrev = shiftBoardToMatchExpansion(state.prevBoard, expanded.shiftX, expanded.shiftY, expanded.board);
        const remainingBoardExpansions = state.pendingBoardExpansions - 1;
        set({
            board: expanded.board,
            prevBoard: shiftedPrev,
            pendingBoardExpansions: remainingBoardExpansions,
            phase:
                state.phase === 'board_expansion_placement' && remainingBoardExpansions === 0
                    ? 'selection'
                    : state.phase,
            isTurnSymbolSelection:
                state.phase === 'board_expansion_placement' && remainingBoardExpansions === 0
                    ? true
                    : state.isTurnSymbolSelection,
            lastEffects: [],
            counterDisplayOverrides: [],
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
        });
    },

    ...createTurnFlowActions({
        get,
        set,
        boardWidth: BOARD_WIDTH,
        boardHeight: BOARD_HEIGHT,
        processSingleSymbolEffects,
        createInstance,
        getAdjacentCoords,
    }),

    ...createSelectionFlowActions({
        get,
        set,
        createInstance,
        phaseAfterTurnFlowComplete,
    }),

    ...createGameLifecycleActions({
        set,
        get,
        createInstance,
    }),

    ...createBoardInteractionActions({
        get,
        set,
        getAdjacentCoords,
    }),

    devAddSymbol: (symbolId: number) => {
        const def = SYMBOLS[symbolId];
        if (!def) return;
        set((prev) => ({
            playerSymbols: [
                ...prev.playerSymbols,
                createInstance(def, prev.unlockedKnowledgeUpgrades || []),
            ],
        }));
    },

    devRemoveSymbol: (instanceId: string) => {
        set((prev) => ({
            playerSymbols: prev.playerSymbols.filter(s => s.instanceId !== instanceId),
        }));
    },

    devSetStat: (stat: 'food' | 'gold' | 'knowledge' | 'level' | 'turn', value: number) => {
        if (stat === 'level') {
            const L = Math.max(0, Math.round(value));
            set({ level: L, era: getEraFromLevel(L) });
            return;
        }
        if (stat === 'turn') {
            const nextTurn = Math.max(0, Math.round(value));
            const activeStatuses = createActiveStatusesForTurn(nextTurn);
            set({
                turn: nextTurn,
                activeStatuses,
                activeStatusIds: getActiveStatusIdsFromStates(activeStatuses),
            });
            return;
        }
        set({ [stat]: Math.max(0, value) });
    },

    devAddBoardExpansion: () => {
        set((state) => {
            const remainingCapacity = getRemainingBoardExpansionCapacity(state.board);
            if (state.pendingBoardExpansions >= remainingCapacity) return {};
            return { pendingBoardExpansions: state.pendingBoardExpansions + 1 };
        });
    },

    devForceScreen: (screen: 'symbol' | 'level') => {
        const state = get();
        if (screen === 'symbol') {
            const res = generateChoicesSelection({
                era: state.era,
                religionUnlocked: state.religionUnlocked,
                upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                symbolSetId: state.symbolSetId,
                symbolSetIds: state.symbolSetIds,
                ownedSymbolDefIds: state.playerSymbols.map((s) => s.definition.id),
                choiceCount: getStandardSymbolChoiceCount(state.board),
                forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
                forceEventsInNextSymbolChoices: state.forceEventsInNextSymbolChoices,
            });
            const choices = res.choices;
            if (res.consumedForceTerrain) set({ forceTerrainInNextSymbolChoices: false });
            if (res.consumedForceEvents) set({ forceEventsInNextSymbolChoices: false });
            set({
                phase: 'selection',
                symbolChoices: choices,
                freeSelectionRerolls: Math.max(
                    state.freeSelectionRerolls ?? 0,
                    getSelectionPhaseFreeRerollFloor(state.unlockedKnowledgeUpgrades ?? []),
                ),
            });
        } else if (screen === 'level') {
            const nextLevel = Math.max(0, Math.round(state.level)) + 1;
            set({
                level: nextLevel,
                era: getEraFromLevel(nextLevel),
                levelUpResearchPoints: 0,
                knowledgeResearchCredits: [],
            });
        }
    },

    devTriggerNaturalDisaster: (symbolId: number) => {
        const naturalDisasterIds: readonly number[] = [S.flood, S.earthquake, S.drought, S.plague, S.heatwave];
        if (!naturalDisasterIds.includes(symbolId)) return;
        set({ pendingDevNaturalDisasterId: symbolId });
    },
}));
