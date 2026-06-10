import { create } from 'zustand';
import { SYMBOLS, S } from '../data/symbolDefinitions';
import { processSingleSymbolEffects, type ActiveRelicEffects } from '../logic/symbolEffects';
import { RELIC_LIST, type RelicDefinition } from '../data/relicDefinitions';
import { useRelicStore } from './relicStore';
import { RELIC_ID } from '../logic/relics/relicIds';
import { countNonConsumableRelics, isRelicAvailableForShop } from '../logic/relics/relicClassification';
import {
    generateChoices as generateChoicesSelection,
    getSymbolPoolProbabilities as getSymbolPoolProbabilitiesSelection,
    type SelectionChoice,
} from '../logic/selection/selectionLogic';
import type { RewardDefinition } from '../data/rewardDefinitions';
import type { LeaderProgressAwardResult } from '../data/leaders';
import type { PlayerSymbolInstance } from '../types';
import {
    createKnowledgeResearchCreditForLevel,
    createKnowledgeResearchCreditsForLevelGain,
    getEraFromLevel,
    normalizeKnowledgeResearchCredits,
    type KnowledgeResearchCredit,
} from './gameCalculations';
import {
    ELECTION_SYSTEM_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
} from '../data/knowledgeUpgrades';
import { createActiveStatusesForTurn, getActiveStatusIdsFromStates, getActiveStatusIdsForTurn } from '../data/statusDefinitions';
import type { ActiveStatusState } from '../data/statusDefinitions';
import {
    BOARD_HEIGHT,
    BOARD_WIDTH,
    createEmptyBoard,
    createInstance,
    createStartingBoard,
    getStandardSymbolChoiceCount,
    phaseAfterTurnFlowComplete,
} from './gameStoreHelpers';
import { createSelectionFlowActions } from './actions/selectionFlow';
import { createRelicActivationActions } from './actions/relicActivation';
import { createTurnFlowActions } from './actions/turnFlow';
import { createRelicShopFlowActions } from './actions/relicShopFlow';
import { createGameLifecycleActions } from './actions/gameLifecycle';
import { createBoardInteractionActions } from './actions/boardInteraction';
import type { BoardEffectDelta, PendingThreatFloat } from '../logic/turn/turnTypes';

export { type PlayerSymbolInstance } from '../types';
export { BOARD_HEIGHT, BOARD_WIDTH } from './gameStoreHelpers';

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



/** 작물 심볼 ID 목록 (카르멜 산 화덕 재 효과용) */
const _CROP_SYMBOL_IDS = [S.wheat, S.rice, S.banana, S.fish]; // Wheat, Rice, Banana, Fish

// 시대별 심볼 등장 확률 테이블 (종교 미해금)
const _ERA_PROBABILITIES_BASE: Record<number, Record<number, number>> = {
    1: { 1: 75, 2: 0, 3: 0, 4: 25 },
    2: { 1: 40, 2: 45, 3: 0, 4: 15 },
    3: { 1: 20, 2: 35, 3: 35, 4: 10 },
};

// 시대별 심볼 등장 확률 테이블 (특수 0 해금 후)
const _ERA_PROBABILITIES_WITH_SPECIAL: Record<number, Record<number, number>> = {
    1: { 0: 0, 1: 75, 2: 0, 3: 0, 4: 25 },
    2: { 0: 10, 1: 35, 2: 40, 3: 0, 4: 15 },
    3: { 0: 10, 1: 20, 2: 30, 3: 30, 4: 10 },
};

export type GamePhase =
    | 'idle'
    | 'spinning'
    | 'showing_new_threats'
    | 'processing'
    | 'food_payment'
    | 'selection'
    | 'loot_reward_selection'
    | 'oblivion_furnace_board'
    | 'game_over'
    | 'victory';
export type GameEventLogKind =
    | 'turn_start'
    | 'processing_start'
    | 'symbol_effect'
    | 'processing_end'
    | 'turn_end'
    | 'combat'
    | 'relic'
    | 'selection'
    | 'research'
    | 'shop'
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
    leaderId: import('../data/leaders').LeaderId | null;
    leaderProgressLevel: number;
    lastLeaderProgressAward: LeaderProgressAwardResult | null;
    food: number;
    gold: number;
    knowledge: number; // 기존 knowledge
    level: number; // 0 ~ 30
    era: number; // derived from level
    turn: number;
    board: (PlayerSymbolInstance | null)[][];
    playerSymbols: PlayerSymbolInstance[];
    phase: GamePhase;
    isTutorialMode?: boolean;
    tutorialSpinStep?: 'corn_spin' | 'corn_done' | 'monument_spin' | 'monument_processing' | 'monument_done' | null;
    symbolChoices: SelectionChoice[];
    /** 심볼 선택이 고대 유물 잔해(13)·고대 부족 합류(19) 클릭으로 열린 경우 해당 유물 정의 ID (표시·리롤 비활성) */
    symbolSelectionRelicSourceId: number | null;
    /** Symbol that opened the current symbol selection when its name should be shown in the UI. */
    symbolSelectionSymbolSourceId?: number | null;
    /** Whether the current selection is the standard selection granted at the end of each turn. */
    isTurnSymbolSelection?: boolean;
    /** 유물 상점에 표시되는 유물 목록 (3개) */
    relicChoices: (RelicDefinition | null)[];
    /** 람세스 황금의 거래: 이번 입고(상점 갱신)에서 50% 할인된 유물 ID */
    relicHalfPriceRelicId: number | null;
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
    /** 전투 애니메이션 트리거 (공격자 → 대상 좌표 + 피해량) */
    combatAnimation: { ax: number; ay: number; tx: number; ty: number; atkDmg: number; counterDmg: number } | null;
    /** 전투 후 삭제 직전 진동 표시 */
    combatShaking: boolean;
    /** 전투 직전(유물 등) 특정 적 심볼 흔들림 연출 */
    preCombatShakeTarget: { x: number; y: number } | null;
    /** 전투 직전(유물 발동) 흔들릴 유물 definition id */
    preCombatShakeRelicDefId: number | null;
    /** 전투 중/직전 전용 플로팅 텍스트 */
    combatFloats: Array<{ x: number; y: number; text: string; color?: string }>;
    /** 유물 클릭 발동 등: 유물 아이콘 위치 플로팅 텍스트 */
    relicFloats: Array<{ relicInstanceId: string; text: string; color?: string }>;
    /** 지식 업그레이드 아이콘 위 플로팅 (유물과 동일; 기본 생산량 +N 타입 업그레이드는 제외) */
    knowledgeUpgradeFloats: Array<
        | { upgradeId: number; text: string; color?: string }
        | { upgradeId: number; inlineParts: { text: string; color: string }[] }
    >;
    /** 종교 심볼이 선택 풀에 해금되었는지 */
    religionUnlocked: boolean;
    /** 플레이어가 획득한 지식 업그레이드 ID 목록 */
    unlockedKnowledgeUpgrades: number[];
    /** 진시황 전용 이벤트 화폐 통일: 남은 기본 골드 생산량 2배 턴 수 */
    qinCurrencyStandardTurnsRemaining: number;

    /** Unused research picks shown in the UI. Kept in sync with knowledgeResearchCredits. */
    levelUpResearchPoints: number;
    /** Research pick tickets with the upgrade tier range each unspent point can pay for. */
    knowledgeResearchCredits?: KnowledgeResearchCredit[];
    /** 유물 상점 오버레이 열림 여부 */
    isRelicShopOpen: boolean;
    /** 자동 재입고 이후 아직 확인하지 않은 신규 입고 배지 */
    hasNewRelicShopStock: boolean;
    /** 이번 선택 페이즈에서 리롤한 횟수 (리디아 유물: 최대 3회) */
    rerollsThisTurn: number;

    /** Knowledge tree overlay: phase to restore after a research pick resolves */
    returnPhaseAfterDevKnowledgeUpgrade: GamePhase | null;

    barbarianSymbolThreat: number;
    barbarianCampThreat: number;
    naturalDisasterThreat: number;
    pendingDevNaturalDisasterId: number | null;
    activeStatusIds: number[];
    activeStatuses?: ActiveStatusState[];
    /** 첫 배치된 야만인/재해 심볼에 플로팅 텍스트 표시 후 효과 iteration 진행용 */
    pendingNewThreatFloats: PendingThreatFloat[];
    /** 망각의 화로 발동 시 제거할 유물 instanceId */
    pendingOblivionFurnaceRelicId: string | null;
    /** 칙령 발동 시 소비할 심볼 위치/인스턴스 */
    pendingEdictSource: { x: number; y: number; instanceId: string } | null;
    /** 영토 정비(22): 남은 보너스 선택 (첫 턴은 symbolChoices로 이미 지형 3개가 열림) */
    bonusSelectionQueue: Array<'terrain' | 'any'>;
    /** 개척자(68): 다음 generateChoices에서 지형 1칸 이상 강제 */
    forceTerrainInNextSymbolChoices: boolean;
    /** 왕도 개척(54): 다음 일반 심볼 선택은 이벤트만 표시 */
    forceEventsInNextSymbolChoices: boolean;
    /** 사절단(70): 심볼 선택 단계 첫 리롤(들) 무료 */
    freeSelectionRerolls: number;
    pendingFoodPayment: boolean;

    // Actions
    spinBoard: () => void;
    payFoodCost: () => void;
    /** spinning 애니메이션이 끝난 후 호출 — pendingNewThreatFloats 있으면 먼저 플로팅 표시, 없으면 processing 시작 */
    startProcessing: () => void;
    /** 플로팅 표시 후 실제 processing 시작 (뷰에서 호출) */
    continueProcessingAfterNewThreatFloats: () => void;
    selectSymbol: (symbolId: number) => void;
    selectEvent: (eventId: number) => void;
    skipSelection: () => void;
    rerollSymbols: () => void;

    toggleRelicShop: () => void;
    clearRelicShopStockBadge: () => void;
    refreshRelicShop: (force?: boolean) => void;
    buyRelic: (relicId: number) => void;
    selectUpgrade: (upgradeId: number) => void;

    initializeGame: () => void;
    startGameWithDraft: (symbolIds: number[], leaderId: import('../data/leaders').LeaderId) => void;
    startTutorialGame: () => void;
    setupTutorialCornStep: () => void;
    spinTutorialCornStep: () => void;
    setupTutorialSelectionStep: () => void;
    spinTutorialMonumentStep: () => void;
    devAddSymbol: (symbolId: number) => void;
    devRemoveSymbol: (instanceId: string) => void;
    devSetStat: (stat: 'food' | 'gold' | 'knowledge' | 'level' | 'turn', value: number) => void;
    devForceScreen: (screen: 'symbol' | 'upgrade' | 'levelWithResearch') => void;
    devTriggerNaturalDisaster: (symbolId: number) => void;
    /** 망각의 화로: 보드 (x,y) 심볼 파괴 확정 */
    confirmOblivionFurnaceDestroyAt: (x: number, y: number) => void;
    /** 망각의 화로 보드 선택 모드 취소 (유물 유지) */
    cancelOblivionFurnacePick: () => void;
    /** 칙령: idle 시 발동하여 인접 심볼 파괴 대상을 선택 */
    activateEdictAt: (x: number, y: number) => void;
    /** 칙령: 인접 보드 심볼 파괴 확정 */
    confirmEdictDestroyAt: (x: number, y: number) => void;
    /** 칙령 대상 선택 취소 */
    cancelEdictPick: () => void;
    /** 조몬 토기 조각·고대 유물 잔해 등 클릭 발동 유물 */
    activateClickableRelic: (instanceId: string) => void;
    /** 소·양: 평원 인접·idle 시 도축(보드 제거; 소 +10 Food, 양 +5 Food/+5 Gold; 파괴 보상은 집계 반영) */
    butcherPastureAnimalAt: (x: number, y: number) => void;
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
    const adj: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) adj.push({ x: nx, y: ny });
        }
    }
    return adj;
};

/** Fisher-Yates shuffle — 모든 순열에 균등한 확률 보장 */
const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const INITIAL_STARTING_BOARD_STATE = createStartingBoard();

const getSelectionPhaseFreeRerollFloor = (upgrades: readonly number[]): number =>
    upgrades.map(Number).includes(ELECTION_SYSTEM_UPGRADE_ID) ? 1 : 0;


// (선택 풀 구성 로직은 `../logic/selection/selectionLogic.ts`로 이동)

/** 현재 시대에 등장 가능한 심볼 플랫 풀 빌드 (균등 확률용) */
export const getSymbolPoolProbabilities = (era: number, religionUnlocked: boolean): { id: number; name: string; symbolType: number; probability: number }[] =>
    getSymbolPoolProbabilitiesSelection({
        era,
        religionUnlocked,
        upgrades: (useGameStore.getState().unlockedKnowledgeUpgrades || []).map(Number),
        ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
    });


const generateRelicChoices = (): RelicDefinition[] => {
    // 3 unique relics
    const choices: RelicDefinition[] = [];
    const pool = [...RELIC_LIST];
    // Non-consumables are unique; owned consumables may return to later shop stocks.
    const ownedIds = new Set(useRelicStore.getState().relics.map(r => r.definition.id));
    const available = shuffle(pool.filter(r => isRelicAvailableForShop(r.id, ownedIds)));

    for (let i = 0; i < 3; i++) {
        if (available[i]) {
            choices.push(available[i]);
        }
    }
    return choices;
};

/** 황금의 거래: 입고된 유물 중 무작위 1개를 50% 할인 대상으로 지정 */
const pickRelicHalfPriceIdForGoldenTrade = (inStock: RelicDefinition[], hasGoldenTrade: boolean): number | null => {
    if (!hasGoldenTrade || inStock.length === 0) return null;
    return inStock[Math.floor(Math.random() * inStock.length)]!.id;
};

/** 현재 보유 유물에서 ActiveRelicEffects 플래그를 조합 */
const buildActiveRelicEffects = (): ActiveRelicEffects => {
    const relics = useRelicStore.getState().relics;
    const hasRelic = (id: number) => relics.some(r => r.definition.id === id);

    const upgrades = (useGameStore.getState().unlockedKnowledgeUpgrades || []).map((x) => Number(x));

    return {
        relicCount: countNonConsumableRelics(relics),
        quarryEmptyGold: hasRelic(RELIC_ID.EGYPT_SAW),
        bananaFossilBonus: hasRelic(RELIC_ID.GOANNA_BANANA),
        horsemansihpPastureBonus: upgrades.includes(HORSEMANSHIP_UPGRADE_ID),
        terraFossilDisasterFood: hasRelic(RELIC_ID.TERRA_FOSSIL_GRAPE),
        allSymbolsAreCorner: hasRelic(RELIC_ID.GUDEA_FOUNDATION_PEG),
    };
};

export const useGameStore = create<GameState>((set, get) => ({
    leaderId: null,
    leaderProgressLevel: 1,
    lastLeaderProgressAward: null,
    food: 0,
    gold: 0,
    knowledge: 0,
    level: 0,
    era: 0,
    turn: 0,
    board: INITIAL_STARTING_BOARD_STATE.board,
    playerSymbols: INITIAL_STARTING_BOARD_STATE.playerSymbols,
    phase: 'idle' as GamePhase,
    isTutorialMode: false,
    tutorialSpinStep: null,
    symbolChoices: [],
    symbolSelectionRelicSourceId: null,
    symbolSelectionSymbolSourceId: null,
    isTurnSymbolSelection: false,
    relicChoices: generateRelicChoices(),
    relicHalfPriceRelicId: null,
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
    combatAnimation: null,
    combatShaking: false,
    preCombatShakeTarget: null,
    preCombatShakeRelicDefId: null,
    combatFloats: [],
    relicFloats: [],
    knowledgeUpgradeFloats: [],
    religionUnlocked: false,
    unlockedKnowledgeUpgrades: [],
    qinCurrencyStandardTurnsRemaining: 0,

    levelUpResearchPoints: 0,
    knowledgeResearchCredits: [],
    isRelicShopOpen: false,
    hasNewRelicShopStock: false,
    rerollsThisTurn: 0,
    returnPhaseAfterDevKnowledgeUpgrade: null,

    barbarianSymbolThreat: 0,
    barbarianCampThreat: 0,
    naturalDisasterThreat: 0,
    pendingDevNaturalDisasterId: null,
    activeStatusIds: getActiveStatusIdsForTurn(0),
    activeStatuses: createActiveStatusesForTurn(0),
    pendingNewThreatFloats: [],
    pendingOblivionFurnaceRelicId: null,
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

    ...createTurnFlowActions({
        get,
        set,
        boardWidth: BOARD_WIDTH,
        boardHeight: BOARD_HEIGHT,
        processSingleSymbolEffects,
        createInstance,
        getAdjacentCoords,
        buildActiveRelicEffects,
    }),

    ...createSelectionFlowActions({
        get,
        set,
        createInstance,
        phaseAfterTurnFlowComplete,
    }),

    toggleRelicShop: () => {
        set((state) => ({
            isRelicShopOpen: !state.isRelicShopOpen,
            hasNewRelicShopStock: state.isRelicShopOpen ? state.hasNewRelicShopStock : false,
        }));
    },

    clearRelicShopStockBadge: () => {
        set({ hasNewRelicShopStock: false });
    },

    refreshRelicShop: (force = false) => {
        if (!force) return; // 수동 새로고침(5G) 제거 — 10턴마다 자동(force: true)만

        const state = get();

        const hasGoldenTrade = state.leaderId === 'ramesses';

        const newChoices = generateRelicChoices();
        const nextHalfRelicId = pickRelicHalfPriceIdForGoldenTrade(newChoices, hasGoldenTrade);

        set({
            relicChoices: newChoices,
            relicHalfPriceRelicId: nextHalfRelicId,
            hasNewRelicShopStock: true,
        });
    },

    ...createRelicShopFlowActions({
        get,
        set,
    }),

    ...createRelicActivationActions({
        get,
        set,
        phaseAfterTurnFlowComplete,
    }),

    ...createGameLifecycleActions({
        set,
        get,
        createInstance,
        generateRelicChoices,
        pickRelicHalfPriceIdForGoldenTrade,
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
            const L = Math.max(0, Math.min(30, Math.round(value)));
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

    devForceScreen: (screen: 'symbol' | 'upgrade' | 'levelWithResearch') => {
        const state = get();
        if (screen === 'symbol') {
            const res = generateChoicesSelection({
                era: state.era,
                religionUnlocked: state.religionUnlocked,
                upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                ownedSymbolDefIds: state.playerSymbols.map((s) => s.definition.id),
                leaderId: state.leaderId,
                leaderProgressLevel: state.leaderProgressLevel,
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
                symbolSelectionRelicSourceId: null,
                freeSelectionRerolls: Math.max(
                    state.freeSelectionRerolls ?? 0,
                    getSelectionPhaseFreeRerollFloor(state.unlockedKnowledgeUpgrades ?? []),
                ),
            });
        } else if (screen === 'upgrade') {
            const nextCredits = [
                ...(state.knowledgeResearchCredits ?? []),
                createKnowledgeResearchCreditForLevel(Math.max(1, state.level)),
            ];
            set({
                levelUpResearchPoints: nextCredits.length,
                knowledgeResearchCredits: nextCredits,
            });
        } else if (screen === 'levelWithResearch') {
            const nextLevel = Math.min(30, Math.max(0, Math.round(state.level)) + 1);
            if (nextLevel === state.level) return;

            const nextCredits = [
                ...normalizeKnowledgeResearchCredits(
                    state.level,
                    state.levelUpResearchPoints ?? 0,
                    state.knowledgeResearchCredits,
                ),
                ...createKnowledgeResearchCreditsForLevelGain(state.level, nextLevel),
            ];
            set({
                level: nextLevel,
                era: getEraFromLevel(nextLevel),
                levelUpResearchPoints: nextCredits.length,
                knowledgeResearchCredits: nextCredits,
            });
        }
    },

    devTriggerNaturalDisaster: (symbolId: number) => {
        const naturalDisasterIds: readonly number[] = [S.flood, S.earthquake, S.drought, S.plague, S.heatwave];
        if (!naturalDisasterIds.includes(symbolId)) return;
        set({ pendingDevNaturalDisasterId: symbolId });
    },
}));
