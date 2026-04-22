import { create } from 'zustand';
import {
    getStageFoodPaymentBase,
    getStagePassiveBonus,
    getStageStartingRelicCounts,
    TOTAL_STAGE_COUNT,
} from '../data/stages';
import { SYMBOLS, SymbolType, type SymbolDefinition, RELIGION_DOCTRINE_IDS, EXCLUDED_FROM_BASE_POOL, TAX_SYMBOL_ID, EDICT_SYMBOL_ID, S, Sym } from '../data/symbolDefinitions';
import { processSingleSymbolEffects, type ActiveRelicEffects } from '../logic/symbolEffects';
import { useSettingsStore, EFFECT_SPEED_DELAY, COMBAT_BOUNCE_DURATION } from './settingsStore';
import { RELIC_LIST, RELICS, type RelicDefinition } from '../data/relicDefinitions';
import { useRelicStore } from './relicStore';
import { RELIC_ID } from '../logic/relics/relicIds';
import { runPostEffectsHooks } from '../logic/turn/postEffectsHooks';
import { applyFixedDamageToEnemy, buildCombatEvents, pickRandomLivingEnemy, resolveCombatTarget } from '../logic/combat/combatEngine';
import {
    buildFlatPool as buildFlatPoolSelection,
    generateChoices as generateChoicesSelection,
    generateTerrainOnlyChoices as generateTerrainOnlyChoicesSelection,
    getSymbolPoolProbabilities as getSymbolPoolProbabilitiesSelection,
} from '../logic/selection/selectionLogic';
import { applyKnowledgeAndLevelUps } from '../logic/progression/eraTransition';
import type { PlayerSymbolInstance } from '../types';
import { t } from '../../i18n';

export { type PlayerSymbolInstance } from '../types';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;

/** 보드 중앙 칸 (5×4, 0-based): x=2, y=1 */
const ORAL_TRADITION_ANCHOR = { x: 2, y: 1 } as const;

const ensureOralTraditionOwned = (playerSymbols: PlayerSymbolInstance[]): PlayerSymbolInstance[] => {
    if (playerSymbols.some((s) => s.definition.id === S.oral_tradition)) return playerSymbols;
    const def = SYMBOLS[S.oral_tradition];
    if (!def) return playerSymbols;
    return [...playerSymbols, createInstance(def, [])];
};

const placeOralTraditionAtBoardCenter = (
    board: (PlayerSymbolInstance | null)[][],
    playerSymbols: PlayerSymbolInstance[],
): { board: (PlayerSymbolInstance | null)[][]; playerSymbols: PlayerSymbolInstance[] } => {
    const symList = [...playerSymbols];
    const oralIdx = symList.findIndex((s) => s.definition.id === S.oral_tradition);
    if (oralIdx < 0) return { board, playerSymbols: symList };

    const oralInst = symList[oralIdx]!;
    const b = board.map((col) => [...col]);

    const { x: ax, y: ay } = ORAL_TRADITION_ANCHOR;

    // 보드 어딘가에 이미 oral이 있으면(예: 시작 배치) 그 칸을 비움 — 중앙으로만 남기기
    for (let x = 0; x < BOARD_WIDTH; x++) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            const cell = b[x][y];
            if (cell && cell.instanceId === oralInst.instanceId) b[x][y] = null;
        }
    }

    const occupant = b[ax][ay];
    if (occupant && occupant.instanceId !== oralInst.instanceId) {
        // oral이 원래 있던 위치로 기존 중앙 점유 심볼을 스왑(인스턴스 유지)
        let ox = -1;
        let oy = -1;
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const cell = b[x][y];
                if (cell && cell.instanceId === oralInst.instanceId) {
                    ox = x;
                    oy = y;
                }
            }
        }
        if (ox >= 0) b[ox][oy] = occupant;
    }

    b[ax][ay] = oralInst;
    return { board: b, playerSymbols: symList };
};

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
/** 레벨에 따라 증가하는 리롤 비용: 2G(Lv0) → 5G(Lv9+) */
export const getRerollCost = (level: number): number => Math.min(2 + Math.floor(level / 3), 5);



/** 1→2 단계: 본체만 보여줌(들어올림) 후, activate 보여주기 전 대기(ms) */
const PHASE1_DELAY: Record<import('./settingsStore').EffectSpeed, number> = {
    '1x': 220,
    '2x': 150,
    '4x': 90,
    'instant': 0,
};
/** 2→3 단계: activate(contributors) 보여준 후, 생산량 표시 전 대기(ms) */
const PHASE2_DELAY: Record<import('./settingsStore').EffectSpeed, number> = {
    '1x': 360,
    '2x': 280,
    '4x': 180,
    'instant': 0,
};

/** 작물 심볼 ID 목록 (카르멜 산 화덕 재 효과용) */
const CROP_SYMBOL_IDS = [S.wheat, S.rice, S.banana, S.fish]; // Wheat, Rice, Banana, Fish

// 시대별 심볼 등장 확률 테이블 (종교 미해금)
const ERA_PROBABILITIES_BASE: Record<number, Record<number, number>> = {
    1: { 1: 75, 2: 0, 3: 0, 4: 25 },
    2: { 1: 40, 2: 45, 3: 0, 4: 15 },
    3: { 1: 20, 2: 35, 3: 35, 4: 10 },
};

// 시대별 심볼 등장 확률 테이블 (특수 0 해금 후)
const ERA_PROBABILITIES_WITH_SPECIAL: Record<number, Record<number, number>> = {
    1: { 0: 0, 1: 75, 2: 0, 3: 0, 4: 25 },
    2: { 0: 10, 1: 35, 2: 40, 3: 0, 4: 15 },
    3: { 0: 10, 1: 20, 2: 30, 3: 30, 4: 10 },
};

// 레벨업 1회당 필요 지식(Knowledge): Lv.0→1은 50부터, 레벨마다 +5씩 증가 (Lv.29→30은 195).
const KNOWLEDGE_LEVELUP_BASE = 50;
const KNOWLEDGE_LEVELUP_STEP = 5;

export const getKnowledgeRequiredForLevel = (currentLevel: number): number => {
    const L = Math.max(0, Math.min(29, Math.floor(currentLevel)));
    return KNOWLEDGE_LEVELUP_BASE + L * KNOWLEDGE_LEVELUP_STEP;
};

// 레벨을 기반으로 현재 시대를 반환 (1: Ancient, 2: Medieval, 3: Modern)
export const getEraFromLevel = (level: number): number => {
    if (level <= 10) return 1;
    if (level <= 20) return 2;
    return 3;
};

/** 데모 승리: 이 레벨 이상이면 턴(선택 흐름) 종료 시 victory */
export const DEMO_VICTORY_LEVEL = 15;

const phaseAfterTurnFlowComplete = (level: number): GamePhase =>
    level >= DEMO_VICTORY_LEVEL ? 'victory' : 'idle';

type GamePhase =
    | 'idle'
    | 'spinning'
    | 'showing_new_threats'
    | 'processing'
    | 'selection'
    | 'destroy_selection'
    | 'oblivion_furnace_board'
    | 'game_over'
    | 'victory';
/** 10·20·30…턴마다 식량 납부 비용 — 선택한 스테이지 규칙을 반영 */
export const calculateFoodCost = (turn: number, stageId: number = 1): number => {
    const base = getStageFoodPaymentBase(stageId);
    const nth = Math.floor(turn / 10);
    if (nth < 1) return base;
    // nth: 1@10턴, 2@20턴… — 증가분이 회차마다 커지는(가속) 누적 합
    // extra(nth) = 50*1 + 60*2 + 70*3 + ... = Σ (40 + 10*k) * k, k=1..(nth-1)
    let extra = 0;
    for (let k = 1; k <= nth - 1; k++) {
        extra += (40 + 10 * k) * k;
    }
    return base + extra;
};

export type GameEventLogKind =
    | 'turn_start'
    | 'processing_start'
    | 'symbol_effect'
    | 'processing_end'
    | 'turn_end'
    | 'combat'
    | 'relic'
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
    food: number;
    gold: number;
    knowledge: number; // 기존 knowledge
    level: number; // 0 ~ 30
    era: number; // derived from level
    turn: number;
    /** 프리게임 스테이지 ID — 식량 납부·시작 유물·기본 생산 보너스 */
    stageId: number;
    board: (PlayerSymbolInstance | null)[][];
    playerSymbols: PlayerSymbolInstance[];
    phase: GamePhase;
    symbolChoices: SymbolDefinition[];
    /** 심볼 선택이 고대 유물 잔해(13)·고대 부족 합류(19) 클릭으로 열린 경우 해당 유물 정의 ID (표시·리롤 비활성) */
    symbolSelectionRelicSourceId: number | null;
    /** 유물 상점에 표시되는 유물 목록 (3개) */
    relicChoices: (RelicDefinition | null)[];
    /** 람세스 황금의 거래: 이번 입고(상점 갱신)에서 50% 할인된 유물 ID */
    relicHalfPriceRelicId: number | null;
    lastEffects: Array<{ x: number; y: number; food: number; gold: number; knowledge: number }>;
    /** processing 중 누적 합산 (food, gold, knowledge) */
    runningTotals: { food: number; gold: number; knowledge: number };
    /** 현재 처리 중인 슬롯 좌표 (null이면 하이라이트 없음) */
    activeSlot: { x: number; y: number } | null;
    /** 현재 슬롯의 효과에 기여한 인접 심볼 좌표 */
    activeContributors: { x: number; y: number }[];
    /** phase 1 시작 시 미리 저장해두는 이번 슬롯의 예정 contributor 목록 (X 숨김용) */
    pendingContributors: { x: number; y: number }[];
    /** 상호작용 표시 단계: 1=들어올림만, 2=contributor wobble 중, 3=wobble 끝남(파괴 X 등 표시 가능) */
    effectPhase: 1 | 2 | 3 | null;
    /** 이번 processing에서 phase 3을 한 번이라도 거쳤으면 true → 파괴 X를 계속 표시 */
    effectPhase3ReachedThisRun: boolean;
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
    /** 매 턴 영구 지식 보너스 */
    bonusXpPerTurn: number;

    /** Unused research picks: +1 per level gained, -1 when confirming a knowledge upgrade (no per-level queue). */
    levelUpResearchPoints: number;
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
    /** 첫 배치된 야만인/재해 심볼에 플로팅 텍스트 표시 후 효과 iteration 진행용 */
    pendingNewThreatFloats: { x: number; y: number; label: string }[];
    /** 전투로 보드에서 제거된 야만인 주둔지마다 전리품 심볼 — 효과 페이즈 종료 시 toAdd에 합침 */
    pendingCombatLootAdds: number[];

    /** destroy_selection 진입 시 출처 (22 영토 정비 / 69 칙령) */
    pendingDestroySource: typeof TERRITORIAL_REORG_UPGRADE_ID | typeof EDICT_SYMBOL_ID | null;
    /** 망각의 화로 발동 시 제거할 유물 instanceId */
    pendingOblivionFurnaceRelicId: string | null;
    /** 영토 정비(22): 남은 보너스 선택 (첫 턴은 symbolChoices로 이미 지형 3개가 열림) */
    bonusSelectionQueue: Array<'terrain' | 'any'>;
    /** 칙령(69) 등: 턴 처리 끝난 뒤 보유 심볼 제거 단계 필요 */
    edictRemovalPending: boolean;
    /** 개척자(68): 다음 generateChoices에서 지형 1칸 이상 강제 */
    forceTerrainInNextSymbolChoices: boolean;
    /** 사절단(70): 심볼 선택 단계 첫 리롤(들) 무료 */
    freeSelectionRerolls: number;
    /** 파괴/제거 선택 시 최대 개수 (희생·영토 3, 칙령 1) */
    destroySelectionMaxSymbols: number;
    /** 영토 정비(22) 직후 칙령(69)이 끼어든 경우: 칙령 처리 뒤 지형→심볼 보너스 선택 유지 */
    territorialAfterEdictPending: boolean;

    // Actions
    spinBoard: () => void;
    /** spinning 애니메이션이 끝난 후 호출 — pendingNewThreatFloats 있으면 먼저 플로팅 표시, 없으면 processing 시작 */
    startProcessing: () => void;
    /** 플로팅 표시 후 실제 processing 시작 (뷰에서 호출) */
    continueProcessingAfterNewThreatFloats: () => void;
    selectSymbol: (symbolId: number) => void;
    skipSelection: () => void;
    rerollSymbols: () => void;

    toggleRelicShop: () => void;
    clearRelicShopStockBadge: () => void;
    refreshRelicShop: (force?: boolean) => void;
    buyRelic: (relicId: number) => void;
    selectUpgrade: (upgradeId: number) => void;

        initializeGame: () => void;
    /** 프리게임: 보유 심볼(symbolIds) + 리더 + 스테이지별 시작 유물로 본게임 시작 */
    startGameWithDraft: (symbolIds: number[], leaderId: import('../data/leaders').LeaderId, stageId: number) => void;
    devAddSymbol: (symbolId: number) => void;
    devRemoveSymbol: (instanceId: string) => void;
    devSetStat: (stat: 'food' | 'gold' | 'knowledge' | 'level' | 'turn', value: number) => void;
    devForceScreen: (screen: 'symbol' | 'upgrade') => void;
    confirmDestroySymbols: (instanceIds: string[]) => void;
    finishDestroySelection: () => void;
    /** 망각의 화로: 보드 (x,y) 심볼 파괴 확정 */
    confirmOblivionFurnaceDestroyAt: (x: number, y: number) => void;
    /** 망각의 화로 보드 선택 모드 취소 (유물 유지) */
    cancelOblivionFurnacePick: () => void;
    /** 조몬 토기 조각·고대 유물 잔해 등 클릭 발동 유물 */
    activateClickableRelic: (instanceId: string) => void;
    /** 소·양: 평원 인접·idle 시 도축(보드 제거; 소 +10 Food, 양 +5 Food/+5 Gold; 파괴 보상은 집계 반영) */
    butcherPastureAnimalAt: (x: number, y: number) => void;

    /** F12 로그 오버레이용 */
    appendEventLog: (entry: Omit<GameEventLogEntry, 'id' | 'ts'> & { ts?: number; id?: string }) => void;
    clearEventLog: () => void;
}

/** 스테이지 보너스 + "기본 생산 +N" 업그레이드만 반영한 순수 기본 생산량. */
export function getHudTurnStartPassiveTotals(state: GameState): { food: number; gold: number; knowledge: number } {
    const upgrades = state.unlockedKnowledgeUpgrades || [];
    const knowledge =
        2 +
        (upgrades.includes(1) ? 2 : 0) +
        (upgrades.includes(32) ? 2 : 0) +
        (upgrades.includes(10) ? 2 : 0) +
        (upgrades.includes(16) ? 2 : 0) + 
        (upgrades.includes(24) ? 5 : 0);
    const gold =
        (upgrades.includes(6) ? 2 : 0) + (upgrades.includes(10) ? 2 : 0) + (upgrades.includes(24) ? 5 : 0);
    const food =
        (upgrades.includes(34) ? 2 : 0) +
        (upgrades.includes(10) ? 5 : 0) +
        (upgrades.includes(24) ? 10 : 0);
    const stageBonus = getStagePassiveBonus(state.stageId ?? 1);
    return {
        food: food + stageBonus.food,
        gold: gold + stageBonus.gold,
        knowledge: knowledge + stageBonus.knowledge,
    };
}

const getAdjacentCoords = (x: number, y: number): { x: number; y: number }[] => {
    const adj: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) adj.push({ x: nx, y: ny });
        }
    }
    return adj;
};

/** 등자(19)/조선(21): 전사+말→기사, 전사+바다→캐러벨 (보드 배치 직후) */
const applyWarriorEliteTransforms = (
    board: (PlayerSymbolInstance | null)[][],
    playerSymbols: PlayerSymbolInstance[]
): { board: (PlayerSymbolInstance | null)[][]; playerSymbols: PlayerSymbolInstance[] } => {
    const upgrades = useGameStore.getState().unlockedKnowledgeUpgrades || [];
    const b = board.map((col) => [...col]);
    const symList = [...playerSymbols];

    const removeFromList = (instanceId: string) => {
        const idx = symList.findIndex((s) => s.instanceId === instanceId);
        if (idx >= 0) symList.splice(idx, 1);
    };

    for (let x = 0; x < BOARD_WIDTH; x++) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            const cell = b[x][y];
            if (!cell || cell.definition.id !== S.warrior) continue;

            if (upgrades.includes(STIRRUP_UPGRADE_ID)) {
                const horsePos = getAdjacentCoords(x, y).find((p) => b[p.x][p.y]?.definition.id === S.horse);
                if (horsePos) {
                    const horseInst = b[horsePos.x][horsePos.y]!;
                    b[horsePos.x][horsePos.y] = null;
                    removeFromList(horseInst.instanceId);
                    const knDef = Sym.knight;
                    const knBase = knDef.base_hp ?? 0;
                    const knHp = knBase + (upgrades.includes(2) ? getBronzeWorkingHpBonus(knDef) : 0);
                    const knight: PlayerSymbolInstance = {
                        ...cell,
                        definition: knDef,
                        enemy_hp: knHp,
                        remaining_attacks: knDef.base_attack ? 3 : 0,
                    };
                    b[x][y] = knight;
                    const wi = symList.findIndex((s) => s.instanceId === cell.instanceId);
                    if (wi >= 0) symList[wi] = knight;
                    continue;
                }
            }

            if (upgrades.includes(21)) {
                const seaAdj = getAdjacentCoords(x, y).some((p) => b[p.x][p.y]?.definition.id === S.sea);
                if (seaAdj) {
                    const cvDef = Sym.caravel;
                    const cvBase = cvDef.base_hp ?? 0;
                    const cvHp = cvBase + (upgrades.includes(2) ? getBronzeWorkingHpBonus(cvDef) : 0);
                    const caravel: PlayerSymbolInstance = {
                        ...cell,
                        definition: cvDef,
                        enemy_hp: cvHp,
                        remaining_attacks: cvDef.base_attack ? 3 : 0,
                    };
                    b[x][y] = caravel;
                    const wi = symList.findIndex((s) => s.instanceId === cell.instanceId);
                    if (wi >= 0) symList[wi] = caravel;
                }
            }
        }
    }

    return { board: b, playerSymbols: symList };
};

const createEmptyBoard = (): (PlayerSymbolInstance | null)[][] => {
    return Array(BOARD_WIDTH).fill(null).map(() => Array(BOARD_HEIGHT).fill(null));
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

let instanceCounter = 0;
const generateInstanceId = (): string => `symbol_${Date.now()}_${instanceCounter++}`;

/** 지식 업그레이드 2 (청동 기술): 전사·기사·캐러벨 +10, 궁수 +3 — 전투 `getEffectiveMaxHP`와 동일 규칙 */
export const getBronzeWorkingHpBonus = (def: SymbolDefinition): number => {
    if (def.type !== SymbolType.UNIT) return 0;
    if (def.id === S.warrior || def.id === S.knight || def.id === S.caravel) return 10;
    if (def.id === S.archer) return 3;
    return 0;
};

const createInstance = (def: SymbolDefinition, unlockedUpgrades: number[] = []): PlayerSymbolInstance => {
    let finalDef = def;
    // Relic ID 8 (십계명 석판): Unlocks Stone Tablet in the symbol selection pool.

    const baseHp = finalDef.base_hp;
    let enemy_hp: number | undefined;
    if (baseHp === undefined) enemy_hp = undefined;
    else {
        const bonus = unlockedUpgrades.includes(2) ? getBronzeWorkingHpBonus(finalDef) : 0;
        enemy_hp = baseHp + bonus;
    }

    const inst: PlayerSymbolInstance = {
        definition: finalDef,
        instanceId: generateInstanceId(),
        effect_counter: 0,
        is_marked_for_destruction: false,
        remaining_attacks: finalDef.base_attack ? 3 : 0,
        enemy_hp,
    };

    return inst;
};

/** 투기장·심볼 효과와 동일한 고대 풀 랜덤 (Tribal Village 등) — 고대 시대(25) 미연구 시 고대 타입 심볼 제외 */
const randomEra1SymbolIdForDestroy = (): number => {
    const ids = [
        S.wheat, S.rice, S.cattle, S.banana, S.fish, S.sea, S.stone, S.copper, S.grassland, S.monument, S.oasis,
        S.oral_tradition, S.rainforest, S.plains, S.mountain, S.totem, S.omen, S.campfire, S.pottery,
        S.tribal_village, S.deer, S.date, S.warrior,
    ];
    const ancientOk = (useGameStore.getState().unlockedKnowledgeUpgrades || []).includes(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID);
    const pool = ancientOk
        ? ids
        : ids.filter((id) => SYMBOLS[id] && SYMBOLS[id].type !== SymbolType.ANCIENT);
    const pick = pool.length > 0 ? pool : [S.wheat];
    return pick[Math.floor(Math.random() * pick.length)];
};

/** 보유 심볼만 제거할 때 보드 `finishProcessing` 파괴 보상과 맞춘 누적 효과 */
interface CollectionDestroyAgg {
    food: number;
    gold: number;
    knowledge: number;
    addSymbolDefIds: number[];
    openRelicShop: boolean;
    refreshRelicShop: boolean;
    bonusXpPerTurnDelta: number;
    forceTerrainInNextChoices: boolean;
    edictRemovalPending: boolean;
    freeSelectionRerolls: number;
}

const aggregateCollectionDestroyEffects = (
    removed: PlayerSymbolInstance[],
    skipEdictFromSymbol69: boolean,
): CollectionDestroyAgg => {
    const out: CollectionDestroyAgg = {
        food: 0,
        gold: 0,
        knowledge: 0,
        addSymbolDefIds: [],
        openRelicShop: false,
        refreshRelicShop: false,
        bonusXpPerTurnDelta: 0,
        forceTerrainInNextChoices: false,
        edictRemovalPending: false,
        freeSelectionRerolls: 0,
    };
    for (const sym of removed) {
        const id = sym.definition.id;
        switch (id) {
            case S.pottery:
                out.food += sym.effect_counter || 0;
                break;
            case S.tribal_village:
                out.addSymbolDefIds.push(randomEra1SymbolIdForDestroy(), randomEra1SymbolIdForDestroy());
                break;
            case S.relic_caravan:
                out.refreshRelicShop = true;
                break;
            case S.barbarian_camp:
                out.addSymbolDefIds.push(S.loot);
                break;
            case S.loot:
                out.food += Math.floor(Math.random() * 10) + 1;
                out.gold += Math.floor(Math.random() * 10) + 1;
                out.knowledge += Math.floor(Math.random() * 30) + 1;
                if (Math.random() < 0.01) out.addSymbolDefIds.push(S.glowing_amber);
                break;
            case S.glowing_amber:
                out.openRelicShop = true;
                break;
            case S.honey:
                out.food += 5;
                break;
            case S.wool:
                out.gold += 5;
                break;
            case S.pioneer:
                out.forceTerrainInNextChoices = true;
                break;
            case S.edict:
                if (!skipEdictFromSymbol69) out.edictRemovalPending = true;
                break;
            case S.embassy:
                out.freeSelectionRerolls += 1;
                break;
            default:
                break;
        }
    }
    return out;
};

const scarabAndHinduismBonusForOwnedRemoves = (
    board: (PlayerSymbolInstance | null)[][],
    removeCount: number,
): { gold: number; food: number; knowledge: number } => {
    let gold = 0;
    let food = 0;
    let knowledge = 0;
    if (removeCount <= 0) return { gold, food, knowledge };
    const relics = useRelicStore.getState().relics;
    if (relics.some((r) => r.definition.id === RELIC_ID.SCARAB)) {
        gold += removeCount * 3;
    }
    let hinduTiles = 0;
    for (let x = 0; x < BOARD_WIDTH; x++) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            const s = board[x][y];
            if (s && s.definition.id === S.hinduism && !s.is_marked_for_destruction) hinduTiles++;
        }
    }
    if (hinduTiles > 0) {
        const d = hinduTiles * 5 * removeCount;
        food += d;
        knowledge += d;
    }
    return { gold, food, knowledge };
};

const appendSymbolDefIdsToPlayer = (
    base: PlayerSymbolInstance[],
    defIds: number[],
    unlockedUpgrades: number[],
): PlayerSymbolInstance[] => {
    const next = [...base];
    for (const id of defIds) {
        const def = SYMBOLS[id];
        if (def) next.push(createInstance(def, unlockedUpgrades));
    }
    return next;
};

/** 시작 심볼: Oral Tradition만 */
const getStartingSymbols = (): PlayerSymbolInstance[] => {
    return [Sym.oral_tradition].map((d) => createInstance(d, []));
};

/** 시작 보드: 중앙에 Oral Tradition만 배치 */
const createStartingBoard = (): { board: (PlayerSymbolInstance | null)[][], playerSymbols: PlayerSymbolInstance[] } => {
    const symbols = getStartingSymbols();
    const board = createEmptyBoard();
    board[ORAL_TRADITION_ANCHOR.x][ORAL_TRADITION_ANCHOR.y] = symbols[0];
    return { board, playerSymbols: symbols };
};

const INITIAL_STARTING_BOARD_STATE = createStartingBoard();


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
    // Filter out already owned relics
    const ownedIds = new Set(useRelicStore.getState().relics.map(r => r.definition.id));
    const available = shuffle(pool.filter(r => !ownedIds.has(r.id)));

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

import {
    KNOWLEDGE_UPGRADES,
    FEUDALISM_UPGRADE_ID,
    SACRIFICIAL_RITE_UPGRADE_ID,
    TERRITORIAL_REORG_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    KNOWLEDGE_TIER_LEVEL_2_UPGRADE_IDS,
    PASTORALISM_UPGRADE_ID,
    AGRICULTURE_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    STIRRUP_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    HUNTING_UPGRADE_ID,
} from '../data/knowledgeUpgrades';
import { getLeaderStartingRelics, isLeaderPlayable, LEADERS } from '../data/leaders';

const upgradeEraBySymbolType = (type: number): number | null => {
    switch (type) {
        case SymbolType.ANCIENT: return 1;
        case SymbolType.MEDIEVAL: return 2;
        case SymbolType.MODERN: return 3;
        default: return null;
    }
};

/** Skill tree: whether this upgrade can be researched at the current level (era / prerequisites). */
export function isUpgradeLegalForKnowledgePick(
    upgradeId: number,
    unlocked: number[],
    level: number,
): boolean {
    const uid = Number(upgradeId);
    const have = new Set((unlocked ?? []).map((x) => Number(x)));
    const u = KNOWLEDGE_UPGRADES[uid];
    if (!u) return false;
    if (have.has(uid)) return false;
    const upgradeEra = upgradeEraBySymbolType(u.type);
    if (upgradeEra == null) return false;
    const currentEra = getEraFromLevel(level);
    const medievalUnlocked = have.has(FEUDALISM_UPGRADE_ID) || currentEra >= 2;
    if (uid === FEUDALISM_UPGRADE_ID) return level >= 10;
    if (u.type === SymbolType.MEDIEVAL) return medievalUnlocked;
    // 고대 시대(25) 연구 전: 다른 고대 지식 카드 불가(Lv2 트리 행은 예외)
    if (
        u.type === SymbolType.ANCIENT &&
        uid !== ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID &&
        !KNOWLEDGE_TIER_LEVEL_2_UPGRADE_IDS.includes(uid) &&
        !have.has(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID)
    ) {
        return false;
    }
    if (uid === IRRIGATION_UPGRADE_ID && !have.has(AGRICULTURE_UPGRADE_ID)) return false;
    if (uid === HORSEMANSHIP_UPGRADE_ID && !have.has(PASTORALISM_UPGRADE_ID)) return false;
    if (uid === SEAFARING_UPGRADE_ID && !have.has(FISHERIES_UPGRADE_ID)) return false;
    if (uid === CELESTIAL_NAVIGATION_UPGRADE_ID && !have.has(SEAFARING_UPGRADE_ID)) return false;
    return upgradeEra <= currentEra;
}

/** 현재 보유 유물에서 ActiveRelicEffects 플래그를 조합 */
const buildActiveRelicEffects = (): ActiveRelicEffects => {
    const relics = useRelicStore.getState().relics;
    const hasRelic = (id: number) => relics.some(r => r.definition.id === id);

    const upgrades = (useGameStore.getState().unlockedKnowledgeUpgrades || []).map((x) => Number(x));

    return {
        relicCount: relics.length,
        quarryEmptyGold: hasRelic(RELIC_ID.EGYPT_SAW),
        bananaFossilBonus: hasRelic(RELIC_ID.GOANNA_BANANA),
        horsemansihpPastureBonus: upgrades.includes(HORSEMANSHIP_UPGRADE_ID),
        terraFossilDisasterFood: hasRelic(RELIC_ID.TERRA_FOSSIL_GRAPE),
    };
};

export const useGameStore = create<GameState>((set, get) => ({
    leaderId: null,
    food: 0,
    gold: 0,
    knowledge: 0,
    level: 0,
    era: 1,
    turn: 0,
    stageId: 1,
    board: INITIAL_STARTING_BOARD_STATE.board,
    playerSymbols: INITIAL_STARTING_BOARD_STATE.playerSymbols,
    phase: 'idle' as GamePhase,
    symbolChoices: [],
    symbolSelectionRelicSourceId: null,
    relicChoices: generateRelicChoices(),
    relicHalfPriceRelicId: null,
    lastEffects: [],
    runningTotals: { food: 0, gold: 0, knowledge: 0 },
    activeSlot: null,
    activeContributors: [],
    pendingContributors: [],
    effectPhase: null,
    effectPhase3ReachedThisRun: false,
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
    bonusXpPerTurn: 0,

    levelUpResearchPoints: 0,
    isRelicShopOpen: false,
    hasNewRelicShopStock: false,
    rerollsThisTurn: 0,
    returnPhaseAfterDevKnowledgeUpgrade: null,

    barbarianSymbolThreat: 0,
    barbarianCampThreat: 0,
    naturalDisasterThreat: 0,
    pendingNewThreatFloats: [],
    pendingCombatLootAdds: [],
    pendingDestroySource: null,
    pendingOblivionFurnaceRelicId: null,
    bonusSelectionQueue: [],
    edictRemovalPending: false,
    forceTerrainInNextSymbolChoices: false,
    freeSelectionRerolls: 0,
    destroySelectionMaxSymbols: 3,
    territorialAfterEdictPending: false,

    appendEventLog: (entry) => {
        const MAX = 2000;
        const ts = entry.ts ?? Date.now();
        const id = entry.id ?? `${ts}-${Math.random().toString(16).slice(2)}`;
        set((s) => {
            const next = [...s.eventLog, { ...(entry as any), id, ts } as GameEventLogEntry];
            return { eventLog: next.length > MAX ? next.slice(next.length - MAX) : next };
        });
    },
    clearEventLog: () => set({ eventLog: [] }),

    spinBoard: () => {
        let state = get();
        if ((state.levelUpResearchPoints ?? 0) > 0) return;
        if (state.phase !== 'idle') return;

        let { barbarianSymbolThreat, barbarianCampThreat, naturalDisasterThreat } = state;

        const newPlayerSymbols = [...state.playerSymbols];
        const spinUpgrades = state.unlockedKnowledgeUpgrades || [];
        /** 이번 턴 새로 추가된 위협 심볼 (플로팅 라벨용) */
        const newThreats: { instanceId: string; label: string }[] = [];

        get().appendEventLog({ turn: state.turn + 1, kind: 'turn_start' });

        // Threat increment logic (카운트다운 알림 없음 — 첫 배치 시 셀 위 플로팅으로만 표시)
        if (state.era === 1) {
            const lang = useSettingsStore.getState().language;
            const threatLabel = (key: string) => t(key, lang);
            const castleSlow = (state.unlockedKnowledgeUpgrades || []).includes(23);

            // 1번: 야만인 전사 침공 (확률 통과 시 당 턴 즉시 1기 추가)
            barbarianSymbolThreat += castleSlow ? 0.5 : 1;
            if (Math.random() * 100 < barbarianSymbolThreat) {
                barbarianSymbolThreat = 0;
                const enemyDef = Sym.enemy_warrior;
                if (enemyDef) {
                    const inst = createInstance(enemyDef, spinUpgrades);
                    newPlayerSymbols.push(inst);
                    newThreats.push({ instanceId: inst.instanceId, label: threatLabel('threat.barbarian_invasion') });
                }
            }

            // 2번: 야만인 주둔지 (확률 통과 시 당 턴 즉시 1기 추가)
            barbarianCampThreat += castleSlow ? 0.1 : 0.2;
            if (Math.random() * 100 < barbarianCampThreat) {
                barbarianCampThreat = 0;
                const campDef = Sym.barbarian_camp;
                if (campDef) {
                    const inst = createInstance(campDef, spinUpgrades);
                    newPlayerSymbols.push(inst);
                    newThreats.push({ instanceId: inst.instanceId, label: threatLabel('threat.barbarian_camp') });
                }
            }

            // 3번: 자연재해
            naturalDisasterThreat += 0.5;
            if (Math.random() * 100 < naturalDisasterThreat) {
                naturalDisasterThreat = 0;
                const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
                const FLOOD_ID = S.flood;
                const EARTHQUAKE_ID = S.earthquake;
                const DROUGHT_ID = S.drought;
                const pick = [FLOOD_ID, EARTHQUAKE_ID, DROUGHT_ID][Math.floor(Math.random() * 3)];

                const addDisaster = (symId: number, counterMin: number, counterMax: number, labelKey: string) => {
                    const def = SYMBOLS[symId];
                    if (!def) return;
                    const inst = createInstance(def, spinUpgrades);
                    inst.effect_counter = randInt(counterMin, counterMax);
                    newPlayerSymbols.push(inst);
                    newThreats.push({ instanceId: inst.instanceId, label: threatLabel(labelKey) });
                };

                if (pick === FLOOD_ID) {
                    const count = randInt(2, 3);
                    for (let i = 0; i < count; i++) addDisaster(FLOOD_ID, 6, 8, 'threat.flood');
                } else if (pick === EARTHQUAKE_ID) {
                    const def = SYMBOLS[EARTHQUAKE_ID];
                    if (def) {
                        const inst = createInstance(def, spinUpgrades);
                        newPlayerSymbols.push(inst);
                        newThreats.push({ instanceId: inst.instanceId, label: threatLabel('threat.earthquake') });
                    }
                } else {
                    const count = randInt(3, 6);
                    for (let i = 0; i < count; i++) addDisaster(DROUGHT_ID, 5, 8, 'threat.drought');
                }
            }
        }

        // 1. Clear Board & Place Symbols (reuse existing instances to preserve counters)
        const newBoard = createEmptyBoard();
        // 전투/적 심볼 우선 배치: 컬렉션에 있으면 거의 항상 보드에 등장
        const combatAndEnemy = shuffle(newPlayerSymbols
            .filter(s => s.definition.type === SymbolType.ENEMY || s.definition.type === SymbolType.UNIT));
        const friendly = shuffle(newPlayerSymbols
            .filter(s => s.definition.type !== SymbolType.ENEMY && s.definition.type !== SymbolType.UNIT));
        const shuffledSymbols = [...combatAndEnemy, ...friendly].slice(0, BOARD_WIDTH * BOARD_HEIGHT);

        const positions: { x: number, y: number }[] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                positions.push({ x, y });
            }
        }
        const shuffledPositions = shuffle(positions);

        shuffledSymbols.forEach((instance, idx) => {
            const pos = shuffledPositions[idx];
            newBoard[pos.x][pos.y] = instance;
        });

        const { board: placedBoard, playerSymbols: placedSymbols } = applyWarriorEliteTransforms(
            newBoard,
            newPlayerSymbols
        );

        // 첫 스핀(턴 0 → 1)에서만 구전 설화를 보드 중앙에 고정
        const anchored =
            state.turn === 0
                ? placeOralTraditionAtBoardCenter(placedBoard, placedSymbols)
                : { board: placedBoard, playerSymbols: placedSymbols };
        const anchoredBoard = anchored.board;
        const anchoredSymbols = anchored.playerSymbols;

        const newThreatLabels = new Map<string, string>(newThreats.map(n => [n.instanceId, n.label]));
        const pendingNewThreatFloats: { x: number; y: number; label: string }[] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const inst = anchoredBoard[x][y];
                if (inst && newThreatLabels.has(inst.instanceId)) {
                    pendingNewThreatFloats.push({ x, y, label: newThreatLabels.get(inst.instanceId)! });
                }
            }
        }

        const newTurn = state.turn + 1;

        // board와 phase를 한 번에 set → renderBoard 시 릴이 새 board를 읽음
        set({
            playerSymbols: anchoredSymbols,
            barbarianSymbolThreat,
            barbarianCampThreat,
            naturalDisasterThreat,
            pendingNewThreatFloats,
            prevBoard: state.board,
            board: anchoredBoard,
            turn: newTurn,
            phase: 'spinning',
            lastEffects: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
            effectPhase: null,
            effectPhase3ReachedThisRun: false,
            rerollsThisTurn: 0,
        });

        // spinning 애니메이션은 GameCanvas ticker가 처리하고,
        // 모든 열이 멈추면 startProcessing()을 호출함
    },

    startProcessing: () => {
        const state = get();
        if (state.pendingNewThreatFloats?.length) {
            set({ phase: 'showing_new_threats' });
            return;
        }
        const baseTotals = getHudTurnStartPassiveTotals(state);
        const startFood = baseTotals.food;
        const startGold = baseTotals.gold;
        const startKnowledge = baseTotals.knowledge;

        set(() => ({
            phase: 'processing',
            effectPhase3ReachedThisRun: false,
            runningTotals: { food: startFood, gold: startGold, knowledge: startKnowledge },
        }));
        get().appendEventLog({
            turn: state.turn,
            kind: 'processing_start',
            meta: { base: { food: startFood, gold: startGold, knowledge: startKnowledge } },
        });

        // ── 홍수(44): 인접 지형 생산 비활성화(순서 무관) ──
        const FLOOD_ID = S.flood;
        const disabledTerrainCoords = new Set<string>();
        for (let bx = 0; bx < BOARD_WIDTH; bx++) {
            for (let by = 0; by < BOARD_HEIGHT; by++) {
                const s = get().board[bx][by];
                if (!s || s.definition.id !== FLOOD_ID) continue;

                // counter가 0/미설정이면 이번 턴부터 활성(3으로 시작)
                if (!s.effect_counter || s.effect_counter <= 0) s.effect_counter = 3;
                if (s.effect_counter <= 0) continue;

                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = bx + dx;
                        const ny = by + dy;
                        if (nx < 0 || nx >= BOARD_WIDTH || ny < 0 || ny >= BOARD_HEIGHT) continue;
                        const n = get().board[nx][ny];
                        if (n?.definition.type === SymbolType.TERRAIN) {
                            disabledTerrainCoords.add(`${nx},${ny}`);
                        }
                    }
                }
            }
        }

        // ── 효과 페이즈 인프라 ────────────────────────────────────────────────
        // 2. 순차 이펙트 처리: 슬롯 1(y=0,x=0)부터 슬롯 20(y=3,x=4)까지
        const slotOrder: { x: number; y: number }[] = [];
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                slotOrder.push({ x, y });
            }
        }

        let totalFood = startFood;
        const baseGoldFinish = startGold;
        // `startKnowledge`는 순수 기본 생산량만 담고, 유물/지도자/심볼식 턴당 보너스는 finishProcessing에서 별도 합산한다.
        let totalKnowledge = startKnowledge;
        let totalGold = baseGoldFinish;
        const symbolsToAdd: number[] = [];
        const symbolsToSpawnOnBoard: number[] = [];
        const accumulatedEffects: Array<{ x: number; y: number; food: number; gold: number; knowledge: number }> = [];

        // 종교 심볼(31=Christianity, 32=Islam)은 인접 심볼의 "이번 스핀 산출량"을 기준으로 계산해야 해서,
        // 기존 symbolEffects.ts의 정적 테이블 계산과 충돌하지 않도록 effectPhase에서 임시 보류 후 여기서 최종 계산한다.
        const RELIGION_RECALC_IDS = new Set<number>([S.christianity, S.islam]);
        const religionEffectCache = new Map<string, { food: number; knowledge: number; gold: number }>();
        const religionSlotsToRecalculate: { x: number; y: number; id: number }[] = [];
        const relicEffects = buildActiveRelicEffects();
        const effectCtx = { upgrades: (state.unlockedKnowledgeUpgrades || []).map((id) => Number(id)) };

        const getKey = (x: number, y: number) => `${x},${y}`;
        const computeReligionEffects = () => {
            if (religionSlotsToRecalculate.length === 0) return;

            // effectPhase 진행 중 심볼 인스턴스의 상태가 변경될 수 있으므로,
            // 여기서는 "현재 보드 스냅샷"을 기준으로 계산한다.
            const currentBoardRef = get().board;
            const doctrineFood = new Map<string, number>();
            const doctrineGold = new Map<string, number>();

            for (const s of religionSlotsToRecalculate) {
                const key = getKey(s.x, s.y);
                doctrineFood.set(key, 0);
                doctrineGold.set(key, 0);
            }

            // Christianity(31)은 인접 심볼의 food 중 최대값, Islam(32)은 인접 지식 생산 심볼 개수에 비례한 골드.
            // doctrine끼리 인접해 있으면 max(Christianity)가 서로 영향을 줄 수 있으므로,
            // 소규모 고정점 반복으로 안정화한다(실전 보드에선 1~2회로 충분할 가능성이 큼).
            const MAX_ITERS = 4;
            for (let iter = 0; iter < MAX_ITERS; iter++) {
                let anyChanged = false;

                for (const slot of religionSlotsToRecalculate) {
                    const key = getKey(slot.x, slot.y);
                    const sym = currentBoardRef[slot.x][slot.y];
                    if (!sym) continue;
                    if (sym.is_marked_for_destruction) continue;

                    // 빈 슬롯은 식량/지식 0으로 취급한다(텍스트의 "인접 심볼"을 정량화).
                    let maxAdjFood = -Infinity;
                    let knowledgeProducerCount = 0;

                    const adj = getAdjacentCoords(slot.x, slot.y);
                    for (const pos of adj) {
                        const adjSym = currentBoardRef[pos.x][pos.y];
                        if (!adjSym) {
                            maxAdjFood = Math.max(maxAdjFood, 0);
                            continue;
                        }
                        const adjKey = getKey(pos.x, pos.y);

                        // 이번 스핀에 실제로 계산된 값은 religionEffectCache에 들어있다.
                        // 종교 심볼(31/32)은 여기서 계산하므로 현재 반복값을 사용한다.
                        const adjFoodFromCache =
                            adjSym.definition.id === S.christianity || adjSym.definition.id === S.islam
                                ? (doctrineFood.get(adjKey) ?? 0)
                                : (religionEffectCache.get(adjKey)?.food ?? 0);

                        const adjKnowledgeFromCache =
                            adjSym.definition.id === S.christianity || adjSym.definition.id === S.islam
                                ? 0
                                : (religionEffectCache.get(adjKey)?.knowledge ?? 0);

                        maxAdjFood = Math.max(maxAdjFood, adjFoodFromCache);
                        if (adjKnowledgeFromCache > 0) knowledgeProducerCount++;
                    }

                    if (maxAdjFood === -Infinity) maxAdjFood = 0;

                    let food = 0;
                    let gold = 0;
                    if (sym.definition.id === S.christianity) {
                        food = maxAdjFood;
                    } else if (sym.definition.id === S.islam) {
                        // 지식을 생산하는 인접 심볼 1개당 골드 +2
                        gold = knowledgeProducerCount * 2;
                    }

                    // 교리(종교 심볼) 인접 페널티: 인접한 다른 교리 심볼이 있으면 -500 Food
                    const hasAdjacentDoctrine = adj.some(pos => {
                        const t = currentBoardRef[pos.x][pos.y];
                        return t && RELIGION_DOCTRINE_IDS.has(t.definition.id);
                    });
                    if (hasAdjacentDoctrine) {
                        food -= 50;
                    }

                    const prevFood = doctrineFood.get(key) ?? 0;
                    const prevGold = doctrineGold.get(key) ?? 0;
                    if (prevFood !== food || prevGold !== gold) anyChanged = true;
                    doctrineFood.set(key, food);
                    doctrineGold.set(key, gold);

                    if (anyChanged && iter === MAX_ITERS - 1) {
                        // 마지막 반복이라도 변동이 있으면 그대로 최종값을 사용한다.
                    }
                }

                if (!anyChanged) break;
            }

            // 최종값을 totals/lastEffects에 반영
            for (const slot of religionSlotsToRecalculate) {
                const key = getKey(slot.x, slot.y);
                const sym = currentBoardRef[slot.x][slot.y];
                if (!sym || sym.is_marked_for_destruction) continue;

                const food = doctrineFood.get(key) ?? 0;
                const gold = doctrineGold.get(key) ?? 0;

                if (food !== 0 || gold !== 0) {
                    accumulatedEffects.push({ x: slot.x, y: slot.y, food, gold, knowledge: 0 });
                    totalFood += food;
                    totalGold += gold;
                }

            }

            // 캐시에는 인접 심볼 계산용 값만 필요하므로, doctrine는 여기서 추가로 채우지 않는다.
        };

        const processSlot = (slotIdx: number) => {
            if (slotIdx >= slotOrder.length) {
                // effectPhase 종료 직전에 종교 심볼(31/32)을 최종 계산한다.
                computeReligionEffects();

                // Merchant(22): 이번 턴의 "실제 인접 심볼 식량"을 기준으로
                // effectPhase 전체 종료 후 저장값을 갱신한다.
                {
                    const foodBySlotKey = new Map<string, number>();
                    for (const e of accumulatedEffects) {
                        const k = `${e.x},${e.y}`;
                        foodBySlotKey.set(k, (foodBySlotKey.get(k) ?? 0) + (e.food ?? 0));
                    }

                    const currentBoardRef = get().board;
                    const computeIsCorner = (cx: number, cy: number) =>
                        (cx === 0 && cy === 0) ||
                        (cx === 0 && cy === BOARD_HEIGHT - 1) ||
                        (cx === BOARD_WIDTH - 1 && cy === 0) ||
                        (cx === BOARD_WIDTH - 1 && cy === BOARD_HEIGHT - 1);

                    for (let mx = 0; mx < BOARD_WIDTH; mx++) {
                        for (let my = 0; my < BOARD_HEIGHT; my++) {
                            const sym = currentBoardRef[mx][my];
                            if (!sym || sym.definition.id !== S.merchant) continue;
                            if (!sym.merchant_store_pending) continue;
                            if (computeIsCorner(mx, my)) continue; // 안전장치: corner merchant는 즉시 현금화 처리됨

                            let maxAdjFood = 0;
                            for (const pos of getAdjacentCoords(mx, my)) {
                                const adjFood = foodBySlotKey.get(`${pos.x},${pos.y}`) ?? 0;
                                const adjPositive = Math.max(0, adjFood);
                                if (adjPositive > maxAdjFood) maxAdjFood = adjPositive;
                            }

                            sym.stored_gold = (sym.stored_gold ?? 0) + maxAdjFood;
                            sym.merchant_store_pending = false;
                        }
                    }
                }

                // 마지막 효과 후 0.5초 대기 → 스탯 합산. effectPhase/effectPhase3ReachedThisRun은 유지해 X가 0.5초 동안 계속 보이게 하고, finishProcessing에서 보드 제거와 함께 한 번에 초기화
                set({ activeSlot: null, activeContributors: [], pendingContributors: [] });
                set({
                    lastEffects: [...accumulatedEffects],
                    runningTotals: { food: totalFood, gold: totalGold, knowledge: totalKnowledge },
                });
                setTimeout(() => {
                    finishProcessing(totalFood, totalKnowledge, totalGold, symbolsToAdd, symbolsToSpawnOnBoard, accumulatedEffects);
                }, 500);
                return;
            }

            const { x, y } = slotOrder[slotIdx];
            const currentState = get();
            const currentBoard = currentState.board;
            const symbol = currentBoard[x][y];

            // 전투 페이즈에서 파괴된 심볼은 보드에서 null로 제거된 상태.
            // 효과 페이즈 중 파괴 표시(is_marked_for_destruction)된 심볼은
            // 여전히 자신의 효과를 발동해야 하므로 null 체크만 수행.
            if (!symbol) {
                processSlot(slotIdx + 1);
                return;
            }

            // Christianity/Islam(31/32)은 여기서 임시 보류하고, effectPhase 종료 후 computeReligionEffects()에서
            // 인접 심볼의 '이번 스핀 실제 산출량'을 기반으로 최종 계산한다.
            const isReligionRecalc = RELIGION_RECALC_IDS.has(symbol.definition.id);
            const rawResult = isReligionRecalc
                ? { food: 0, knowledge: 0, gold: 0 }
                : processSingleSymbolEffects(
                      symbol,
                      currentBoard,
                      x,
                      y,
                      effectCtx,
                      relicEffects,
                      disabledTerrainCoords
                  );
            // `processSingleSymbolEffects`의 food/gold는 게임 표시 단위(1단위)입니다.
            const result = rawResult;

            if (isReligionRecalc) {
                religionSlotsToRecalculate.push({ x, y, id: symbol.definition.id });
            } else {
                religionEffectCache.set(getKey(x, y), {
                    food: result.food,
                    knowledge: result.knowledge,
                    gold: result.gold,
                });
            }

            if (result.addSymbolIds) symbolsToAdd.push(...result.addSymbolIds);
            if (result.spawnOnBoard) symbolsToSpawnOnBoard.push(...result.spawnOnBoard);

            if (result.triggerRelicRefresh) {
                get().refreshRelicShop(true);
            }
            if (result.triggerRelicSelection) {
                set({ isRelicShopOpen: true });
            }

            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const phase1 = PHASE1_DELAY[effectSpeed];
            const phase2 = PHASE2_DELAY[effectSpeed];
            const delay = EFFECT_SPEED_DELAY[effectSpeed];

            // 1) 본체 심볼만 들어올림 (phase 1) — pendingContributors를 미리 설정해 X 숨김 타이밍 정확히 맞춤
            set({
                activeSlot: { x, y },
                activeContributors: [],
                pendingContributors: result.contributors ?? [],
                effectPhase: 1,
            });

            const hasContributors = (result.contributors ?? []).length > 0;

            const showPhase2 = () => {
                // 2) activate되는 contributors 보여주기 (phase 2, 밝은 초록 틴트 + 위아래 wobble)
                set({ activeContributors: result.contributors ?? [], effectPhase: 2 });
            };

            const applyEffectsAndContinue = () => {
                set({ effectPhase: 3, effectPhase3ReachedThisRun: true }); // wobble 끝 → 파괴 X 등 표시 가능, 이후 계속 표시
                if (result.food !== 0 || result.knowledge !== 0 || result.gold !== 0) {
                    accumulatedEffects.push({ x, y, food: result.food, gold: result.gold, knowledge: result.knowledge });
                    totalFood += result.food;
                    totalKnowledge += result.knowledge;
                    totalGold += result.gold;
                }

                if (result.bonusXpPerTurnDelta) {
                    set((s) => ({ bonusXpPerTurn: s.bonusXpPerTurn + result.bonusXpPerTurnDelta! }));
                }
                if (result.forceTerrainInNextChoices) {
                    set({ forceTerrainInNextSymbolChoices: true });
                }
                if (result.edictRemovalPending) {
                    set({ edictRemovalPending: true });
                }
                if (result.freeSelectionRerolls) {
                    set((s) => ({
                        freeSelectionRerolls: (s.freeSelectionRerolls ?? 0) + result.freeSelectionRerolls!,
                    }));
                }

                set({
                    lastEffects: [...accumulatedEffects],
                    runningTotals: { food: totalFood, gold: totalGold, knowledge: totalKnowledge },
                });

                // F12 이벤트 로그: 기본 UI는 간단히 유지하고, 상세는 로그 오버레이에서 확인
                if (
                    result.food !== 0 || result.gold !== 0 || result.knowledge !== 0 ||
                    (result.addSymbolIds && result.addSymbolIds.length > 0) ||
                    (result.spawnOnBoard && result.spawnOnBoard.length > 0) ||
                    result.triggerRelicRefresh || result.triggerRelicSelection
                ) {
                    const contributors = (result.contributors ?? []).map(({ x: cx, y: cy }) => ({
                        x: cx,
                        y: cy,
                        symbolId: currentBoard[cx]?.[cy]?.definition?.id,
                    }));
                    get().appendEventLog({
                        turn: get().turn,
                        kind: 'symbol_effect',
                        slot: { x, y },
                        symbolId: symbol.definition.id,
                        delta: { food: result.food ?? 0, gold: result.gold ?? 0, knowledge: result.knowledge ?? 0 },
                        contributors,
                        meta: {
                            addSymbolIds: result.addSymbolIds ?? [],
                            spawnOnBoard: result.spawnOnBoard ?? [],
                            triggerRelicRefresh: !!result.triggerRelicRefresh,
                            triggerRelicSelection: !!result.triggerRelicSelection,
                        },
                    });
                }

                if (delay === 0) {
                    processSlot(slotIdx + 1);
                } else {
                    setTimeout(() => processSlot(slotIdx + 1), delay);
                }
            };

            // 3단계: phase1 → (phase2 있으면) → phase3(생산량). contributor 없으면 phase2 건너뜀
            if (!hasContributors) {
                if (phase1 === 0) {
                    applyEffectsAndContinue();
                } else {
                    setTimeout(applyEffectsAndContinue, phase1);
                }
            } else if (phase1 === 0 && phase2 === 0) {
                showPhase2();
                applyEffectsAndContinue();
            } else if (phase1 === 0) {
                showPhase2();
                setTimeout(applyEffectsAndContinue, phase2);
            } else {
                setTimeout(() => {
                    showPhase2();
                    if (phase2 === 0) {
                        applyEffectsAndContinue();
                    } else {
                        setTimeout(applyEffectsAndContinue, phase2);
                    }
                }, phase1);
            }
        };

        const finishProcessing = (
            tFood: number, tKnowledge: number, tGold: number,
            toAdd: number[], toSpawn: number[],
            effects: Array<{ x: number; y: number; food: number; gold: number; knowledge: number }>
        ) => {
            get().appendEventLog({
                turn: state.turn,
                kind: 'processing_end',
                meta: { totals: { food: tFood, gold: tGold, knowledge: tKnowledge } },
            });
            const combatLootQueue = get().pendingCombatLootAdds ?? [];
            if (combatLootQueue.length > 0) {
                toAdd.push(...combatLootQueue);
                set({ pendingCombatLootAdds: [] });
            }
            const currentBoard = get().board;
            const relics = useRelicStore.getState().relics;
            const hasRelic = (id: number) => relics.some(r => r.definition.id === id);
            const getRelicInst = (id: number) => relics.find(r => r.definition.id === id);
            const post = runPostEffectsHooks({
                board: currentBoard,
                boardWidth: BOARD_WIDTH,
                boardHeight: BOARD_HEIGHT,
                effects,
                leaderId: state.leaderId,
                bonusXpPerTurn: state.bonusXpPerTurn ?? 0,
                unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades || [],
                toAdd,
                getAdjacentCoords,
                relics,
                relicStoreApi: useRelicStore.getState(),
            });

            const destroyedCount = post.destroyedCount;
            const destroyedSymbols = post.destroyedSymbols;
            let bonusFood = post.bonusFood;
            let bonusGold = post.bonusGold;
            let bonusKnowledge = post.bonusKnowledge;
            const relicOwnEffectFloats = post.relicOwnEffectFloats;
            const knowledgeOwnEffectFloats = post.knowledgeOwnEffectFloats;

            // ── 유물 ID 3: 우르의 전차 바퀴 — 보드 슬롯 효과 iteration 종료 후: 유물 흔들림 → 최저 식량 심볼 파괴·G+10 → 턴 카운터 감소
            const urWheelInstanceId: string | null = post.urWheelPlan?.instanceId ?? null;
            const urWheelMinTarget: { x: number; y: number } | null = post.urWheelPlan?.target ?? null;

            const urWheelShakeMs = 360;
            const urWheelBounceDur = COMBAT_BOUNCE_DURATION[useSettingsStore.getState().effectSpeed];

            const applyUrWheelDestroyAndDecrement = () => {
                if (!urWheelInstanceId) return;
                const r = useRelicStore.getState().relics.find((x) => x.instanceId === urWheelInstanceId);
                if (!r || r.effect_counter <= 0) return;
                const boardRef = get().board;
                if (urWheelMinTarget) {
                    const sym = boardRef[urWheelMinTarget.x][urWheelMinTarget.y];
                    if (sym) {
                        sym.is_marked_for_destruction = true;
                        bonusGold += 10;
                        // 골드 플로팅은 유물 아이콘(relicOwnEffectFloats)만 — 슬롯 lastEffects에 넣지 않아 파괴 칸에 중복 표시 안 함
                        relicOwnEffectFloats.push({
                            relicInstanceId: urWheelInstanceId,
                            text: '+10',
                            color: '#fbbf24',
                        });
                    }
                }
                useRelicStore.getState().decrementRelicCounterOrRemove(r.instanceId);
            };

            const runFinishProcessingTail = () => {
            // ── 유물 ID 9: 나일 강 비옥한 흑니 — 턴 끝마다 남은 턴(effect_counter) -1, 0이면 제거 (식량 보너스는 상단에서 처리)
            const nileForDecrement = getRelicInst(RELIC_ID.NILE_SILT);
            if (nileForDecrement && nileForDecrement.effect_counter > 0) {
                useRelicStore.getState().decrementRelicCounterOrRemove(nileForDecrement.instanceId);
            }

            const eraBeforeKnowledgeFinish = get().era;
            const upgradesForQinEra = get().unlockedKnowledgeUpgrades || [];

            set((prev) => {
                const finishUpgrades = prev.unlockedKnowledgeUpgrades || [];
                const prog = applyKnowledgeAndLevelUps(
                    {
                        level: prev.level,
                        knowledge: prev.knowledge,
                        deltaKnowledge: tKnowledge + bonusKnowledge,
                        getEraFromLevel,
                    },
                    getKnowledgeRequiredForLevel
                );
                const newLevel = prog.newLevel;
                const newKnowledge = prog.newKnowledge;
                const gainedResearchPicks = prog.gainedResearchPicks;
                const newEra = prog.newEra;

                const cleanBoard = prev.board.map((col) =>
                    col.map((s) => {
                        if (!s) return null;
                        if (s.is_marked_for_destruction) return null;
                        return s;
                    })
                );

                const newPlayerSymbols = [...prev.playerSymbols];

                for (const symId of toSpawn) {
                    const def = SYMBOLS[symId];
                    if (def) {
                        let placed = false;
                        for (let bx = 0; bx < BOARD_WIDTH && !placed; bx++) {
                            for (let by = 0; by < BOARD_HEIGHT && !placed; by++) {
                                if (!cleanBoard[bx][by]) {
                                    const inst = createInstance(def, finishUpgrades);
                                    cleanBoard[bx][by] = inst;
                                    newPlayerSymbols.push(inst);
                                    placed = true;
                                }
                            }
                        }
                        if (!placed) {
                            newPlayerSymbols.push(createInstance(def, finishUpgrades));
                        }
                    }
                }

                for (const symId of toAdd) {
                    const def = SYMBOLS[symId];
                    if (def) {
                        newPlayerSymbols.push(createInstance(def, finishUpgrades));
                    }
                }

                // combatDestroyedIds는 이미 playerSymbols에서 제거됨
                // 여기선 효과 페이즈 중 파괴된 심볼(Banana 등)만 추가로 처리
                const effectDestroyedIds = new Set<string>();
                for (let bx = 0; bx < BOARD_WIDTH; bx++) {
                    for (let by = 0; by < BOARD_HEIGHT; by++) {
                        const prevSym = prev.board[bx][by];
                        if (prevSym && !cleanBoard[bx][by]) {
                            effectDestroyedIds.add(prevSym.instanceId);
                        }
                    }
                }

                const filteredSymbols = newPlayerSymbols.filter(s => !effectDestroyedIds.has(s.instanceId));
                const selCtx = {
                    era: newEra,
                    religionUnlocked: prev.religionUnlocked,
                    upgrades: (prev.unlockedKnowledgeUpgrades || []).map(Number),
                    ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                    forceTerrainInNextSymbolChoices: prev.forceTerrainInNextSymbolChoices,
                };
                const nextChoiceRes = prev.edictRemovalPending ? { choices: [] as SymbolDefinition[], consumedForceTerrain: false } : generateChoicesSelection(selCtx);
                const choices = nextChoiceRes.choices;

                return {
                    food: prev.food + tFood + bonusFood,
                    gold: prev.gold + tGold + bonusGold,
                    knowledge: newKnowledge,
                    level: newLevel,
                    runningTotals: { food: 0, gold: 0, knowledge: 0 },
                    activeSlot: null,
                    activeContributors: [],
                    pendingContributors: [],
                    effectPhase: null,
                    effectPhase3ReachedThisRun: false,
                    era: newEra,
                    board: cleanBoard,
                    playerSymbols: filteredSymbols,
                    lastEffects: [...effects],
                    phase: 'processing' as GamePhase,
                    symbolChoices: choices,
                    forceTerrainInNextSymbolChoices:
                        prev.forceTerrainInNextSymbolChoices && nextChoiceRes.consumedForceTerrain
                            ? false
                            : prev.forceTerrainInNextSymbolChoices,
                    levelUpResearchPoints: (prev.levelUpResearchPoints ?? 0) + gainedResearchPicks,
                    relicFloats: [...(prev.relicFloats ?? []), ...relicOwnEffectFloats],
                    knowledgeUpgradeFloats:
                        knowledgeOwnEffectFloats.length > 0
                            ? [...(prev.knowledgeUpgradeFloats ?? []), ...knowledgeOwnEffectFloats]
                            : prev.knowledgeUpgradeFloats,
                };
            });

            // ── 진시황 천하통일의 기틀 (지식 업그레이드 14): 시대가 올라갈 때마다 고대 유물 잔해·고대 부족 합류 각 1개
            {
                const eraAfter = get().era;
                if (
                    get().leaderId === 'shihuang' &&
                    eraAfter > eraBeforeKnowledgeFinish
                ) {
                    const debrisDef = RELICS[RELIC_ID.ANCIENT_RELIC_DEBRIS];
                    const tribeDef = RELICS[RELIC_ID.ANCIENT_TRIBE_JOIN];
                    const rs = useRelicStore.getState();
                    for (let e = eraBeforeKnowledgeFinish + 1; e <= eraAfter; e++) {
                        if (debrisDef) rs.addRelic(debrisDef);
                        if (tribeDef) rs.addRelic(tribeDef);
                    }
                    get().appendEventLog({
                        turn: get().turn,
                        kind: 'relic',
                        meta: {
                            action: 'shihuang_era_relics',
                            erasEntered: eraAfter - eraBeforeKnowledgeFinish,
                        },
                    });
                }
            }

            // After a short delay, leave processing (symbol selection, idle, etc.)
            setTimeout(() => {
                const finalState = get();
                if (finalState.phase === 'processing') {
                    // 식량 납부 및 유물 상점 자동 갱신 (10턴마다)
                    if (finalState.turn > 0 && finalState.turn % 10 === 0) {
                        const cost = calculateFoodCost(finalState.turn, finalState.stageId);
                        if (finalState.food < cost) {
                            set({ phase: 'game_over' as GamePhase });
                            return;
                        }
                        set((s) => ({
                            food: s.food - cost,
                        }));
                        get().refreshRelicShop(true); // Auto refresh shop inventory every 10 turns
                    }
                    // Level-ups add research points only; unlocks use the knowledge tree overlay.
                    // 칙령(69): 보유 심볼 1개 제거 후 심볼 선택
                    if (finalState.edictRemovalPending) {
                        set({
                            edictRemovalPending: false,
                            phase: 'destroy_selection' as GamePhase,
                            pendingDestroySource: EDICT_SYMBOL_ID,
                            destroySelectionMaxSymbols: 1,
                        });
                        return;
                    }
                    set({ phase: 'selection' as GamePhase, symbolSelectionRelicSourceId: null });
                }
            }, 600);
            };

            if (urWheelInstanceId) {
                if (urWheelMinTarget && urWheelBounceDur > 0) {
                    set({ preCombatShakeRelicDefId: RELIC_ID.UR_WHEEL });
                    setTimeout(() => {
                        set({ preCombatShakeRelicDefId: null });
                        applyUrWheelDestroyAndDecrement();
                        runFinishProcessingTail();
                    }, urWheelShakeMs);
                    return;
                }
                applyUrWheelDestroyAndDecrement();
            }
            runFinishProcessingTail();
        };

        // ── 전투 페이즈: UNIT(아군) ↔ ENEMY(적) 인접 쌍을 하나하나 순차 처리 ─────────
        const combatBoard = get().board;
        // ID 1: 클로비스 투창촉 — 전투 시작 직전 연출(흔들림 2회) 후 무작위 적 1기 체력 -1 + 플로팅 -1
        const hasClovis = useRelicStore.getState().relics.some(r => r.definition.id === RELIC_ID.CLOVIS_SPEAR);
        const getEffectiveMaxHP = (sym: PlayerSymbolInstance) => {
            const upgrades = get().unlockedKnowledgeUpgrades || [];
            let hp = sym.definition.base_hp ?? 0;
            if (upgrades.includes(2)) hp += getBronzeWorkingHpBonus(sym.definition);
            return hp;
        };

        const applyClovisDamage = (pos: { x: number; y: number }) => {
            applyFixedDamageToEnemy(combatBoard, pos, 1, getEffectiveMaxHP);
            // 플로팅 -1
            set((s) => {
                const next = [...(s.combatFloats ?? []), { x: pos.x, y: pos.y, text: '-1', color: '#ef4444' }];
                return { combatFloats: next.length > 80 ? next.slice(next.length - 80) : next };
            });
        };

        // UNIT + ENEMY 모두 슬롯 순(1→20)으로 각자 1회 공격. 반격 없음.
        const combatEvents = buildCombatEvents(combatBoard, BOARD_WIDTH, BOARD_HEIGHT).filter(({ ax, ay }) => {
            const s = combatBoard[ax][ay];
            return !!s && !s.is_marked_for_destruction;
        });

        // 전투 종료 후: 파괴 심볼 진동 표시 → 보드·컬렉션에서 제거 → 효과 페이즈 시작
        const startEffectPhase = () => {
            const combatDestroyedIds = new Set<string>();
            const b = get().board;
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const sym = b[x][y];
                    if (sym?.is_marked_for_destruction) combatDestroyedIds.add(sym.instanceId);
                }
            }

            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const bounceDur = COMBAT_BOUNCE_DURATION[effectSpeed];

            const doRemoveAndStart = () => {
                if (combatDestroyedIds.size > 0) {
                    set(prev => {
                        const lootFromCamps: number[] = [];
                        for (let cx = 0; cx < BOARD_WIDTH; cx++) {
                            for (let cy = 0; cy < BOARD_HEIGHT; cy++) {
                                const s = prev.board[cx][cy];
                                if (
                                    s?.is_marked_for_destruction &&
                                    combatDestroyedIds.has(s.instanceId) &&
                                    s.definition.id === S.barbarian_camp
                                ) {
                                    lootFromCamps.push(S.loot);
                                }
                            }
                        }
                        return {
                            board: prev.board.map(col => col.map(s => s?.is_marked_for_destruction ? null : s)),
                            playerSymbols: prev.playerSymbols.filter(s => !combatDestroyedIds.has(s.instanceId)),
                            combatShaking: false,
                            pendingCombatLootAdds:
                                lootFromCamps.length > 0
                                    ? [...(prev.pendingCombatLootAdds ?? []), ...lootFromCamps]
                                    : prev.pendingCombatLootAdds,
                        };
                    });
                }
                set({ activeSlot: null, activeContributors: [], pendingContributors: [], effectPhase: null, effectPhase3ReachedThisRun: false, combatAnimation: null, combatShaking: false });

                const initialDelay = EFFECT_SPEED_DELAY[effectSpeed];
                if (initialDelay === 0) {
                    processSlot(0);
                } else {
                    setTimeout(() => processSlot(0), Math.max(initialDelay, 300));
                }
            };

            if (combatDestroyedIds.size > 0 && bounceDur > 0) {
                // 삭제 전 진동 표시
                set({ combatAnimation: null, combatShaking: true });
                setTimeout(doRemoveAndStart, Math.max(bounceDur * 2, 200));
            } else {
                doRemoveAndStart();
            }
        };

        // 전투 이벤트 순차 처리 — 각 심볼은 자기 조건에 맞는 대상 1곳에만 공격 1회. 반격 없음.
        const processCombatEvent = (eventIdx: number) => {
            if (eventIdx >= combatEvents.length) {
                startEffectPhase();
                return;
            }

            const { ax, ay } = combatEvents[eventIdx];
            const board = get().board;
            const attacker = board[ax][ay];
            const picked = resolveCombatTarget({
                board,
                width: BOARD_WIDTH,
                height: BOARD_HEIGHT,
                ax,
                ay,
                getAdjacentCoords,
            });
            const tx = picked?.tx ?? -1;
            const ty = picked?.ty ?? -1;
            const target = picked ? board[tx][ty] : null;

            let atkDmg = 0;
            if (
                picked &&
                attacker &&
                !attacker.is_marked_for_destruction &&
                target &&
                !target.is_marked_for_destruction
            ) {
                atkDmg = attacker.definition.base_attack ?? 0;

                if (atkDmg > 0) {
                    const maxHP = getEffectiveMaxHP(target);
                    target.enemy_hp = (target.enemy_hp ?? maxHP) - atkDmg;
                    if (target.enemy_hp <= 0) target.is_marked_for_destruction = true;
                }
            }

            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const bounceDur = COMBAT_BOUNCE_DURATION[effectSpeed];

            // instant 모드 — 애니메이션 없이 즉시 진행
            if (bounceDur === 0) {
                processCombatEvent(eventIdx + 1);
                return;
            }

            const stepDelay = bounceDur + 40;

            if (atkDmg > 0 && picked) {
                set({ combatAnimation: { ax, ay, tx, ty, atkDmg, counterDmg: 0 } });
                setTimeout(() => processCombatEvent(eventIdx + 1), stepDelay);
            } else {
                processCombatEvent(eventIdx + 1);
            }
        };

        // 클로비스 연출이 있으면 먼저 처리 후 전투 진행
        if (hasClovis) {
            const pos = pickRandomLivingEnemy(combatBoard, BOARD_WIDTH, BOARD_HEIGHT);
            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const bounceDur = COMBAT_BOUNCE_DURATION[effectSpeed];

            // instant 모드: 연출 없이 즉시 반영
            if (!pos || bounceDur === 0) {
                if (pos) applyClovisDamage(pos);
                set({ preCombatShakeTarget: null, preCombatShakeRelicDefId: null });
                processCombatEvent(0);
            } else {
                // 약 2번 흔들리도록 짧게 흔들림 상태 유지
                const SHAKE_MS = 360;
                const AFTER_DAMAGE_PAUSE_MS = 180;
                // 흔들림은 '피해 대상'이 아니라 '유물 아이콘'이 흔들려야 함
                set({ preCombatShakeTarget: null, preCombatShakeRelicDefId: RELIC_ID.CLOVIS_SPEAR });
                setTimeout(() => {
                    set({ preCombatShakeRelicDefId: null });
                    if (pos) applyClovisDamage(pos);
                    setTimeout(() => processCombatEvent(0), AFTER_DAMAGE_PAUSE_MS);
                }, SHAKE_MS);
            }
        } else {
            set({ preCombatShakeTarget: null, preCombatShakeRelicDefId: null });
            processCombatEvent(0);
        }
    },

    continueProcessingAfterNewThreatFloats: () => {
        set({ pendingNewThreatFloats: [] });
        get().startProcessing();
    },

    selectSymbol: (symbolId: number) => {
        const state = get();
        if (state.phase !== 'selection') return;

        const def = SYMBOLS[symbolId];
        if (!def) return;

        const newSymbols = [...state.playerSymbols, createInstance(def, state.unlockedKnowledgeUpgrades || [])];
        const q = [...(state.bonusSelectionQueue || [])];
        if (q.length > 0) {
            q.shift();
            const nextType = q[0];
            const nextChoices =
                q.length === 0
                    ? []
                    : nextType === 'terrain'
                      ? generateTerrainOnlyChoicesSelection({
                            era: state.era,
                            religionUnlocked: state.religionUnlocked,
                            upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                            ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                        })
                      : (() => {
                            const res = generateChoicesSelection({
                                era: state.era,
                                religionUnlocked: state.religionUnlocked,
                                upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                                ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                                forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
                            });
                            if (res.consumedForceTerrain) {
                                set({ forceTerrainInNextSymbolChoices: false });
                            }
                            return res.choices;
                        })();
            set({
                playerSymbols: newSymbols,
                bonusSelectionQueue: q,
                symbolChoices: nextChoices,
                symbolSelectionRelicSourceId: null,
                phase: q.length > 0 ? 'selection' : phaseAfterTurnFlowComplete(state.level),
            });
            return;
        }

        set({
            playerSymbols: newSymbols,
            phase: phaseAfterTurnFlowComplete(state.level),
            symbolChoices: [],
            symbolSelectionRelicSourceId: null,
        });
    },

    skipSelection: () => {
        const state = get();
        if (state.phase !== 'selection') return;

        const antRelic = useRelicStore.getState().relics.find((r) => r.definition.id === RELIC_ID.ANTONINIANUS);
        const skipGold = antRelic ? 2 : 0;

        const relicFloatsNext =
            skipGold > 0 && antRelic
                ? [
                      ...(state.relicFloats ?? []),
                      { relicInstanceId: antRelic.instanceId, text: '+2', color: '#fbbf24' },
                  ]
                : (state.relicFloats ?? []);

        if ((state.bonusSelectionQueue?.length ?? 0) > 0) {
            set({
                phase: phaseAfterTurnFlowComplete(state.level),
                symbolChoices: [],
                symbolSelectionRelicSourceId: null,
                bonusSelectionQueue: [],
                gold: state.gold + skipGold,
                relicFloats: relicFloatsNext,
            });
            return;
        }
        set({
            phase: phaseAfterTurnFlowComplete(state.level),
            symbolChoices: [],
            symbolSelectionRelicSourceId: null,
            gold: state.gold + skipGold,
            relicFloats: relicFloatsNext,
        });
    },

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

    buyRelic: (relicId: number) => {
        const state = get();
        const relicIndex = state.relicChoices.findIndex(r => r && r.id === relicId);
        if (relicIndex === -1) return;

        const def = state.relicChoices[relicIndex];
        if (!def) return;

        const hasGoldenTrade = state.leaderId === 'ramesses';
        const isHalfPrice = state.relicHalfPriceRelicId === relicId;
        const effectiveCostUnscaled =
            hasGoldenTrade && isHalfPrice ? Math.floor(def.cost * 0.5) : def.cost;
        const effectiveCost = effectiveCostUnscaled;

        if (state.gold < effectiveCost) return; // 골드 부족

        useRelicStore.getState().addRelic(def);

        set((s) => {
            const newChoices = [...s.relicChoices];
            newChoices[relicIndex] = null; // 품절 처리
            return {
                gold: s.gold - effectiveCost,
                relicChoices: newChoices,
                relicHalfPriceRelicId: s.relicHalfPriceRelicId === relicId ? null : s.relicHalfPriceRelicId
            };
        });

        // ── 유물 획득 즉시 효과 ──
        if (def.id === 8) { // 십계명 석판
            // (Effect: Unlocks Tablet in pool, no immediate acquisition)
        }
    },

    selectUpgrade: (upgradeId: number) => {
        const state = get();
        const pts = state.levelUpResearchPoints ?? 0;
        if (pts <= 0) return;

        const pickLevel = state.level;
        const uid = Number(upgradeId);
        const unlockedNorm = (state.unlockedKnowledgeUpgrades || []).map((x) => Number(x));
        if (!KNOWLEDGE_UPGRADES[uid]) return;
        if (!isUpgradeLegalForKnowledgePick(uid, unlockedNorm, pickLevel)) return;

        const nextResearchPts = Math.max(0, pts - 1);

        const upgrade = KNOWLEDGE_UPGRADES[uid];

        if (uid === TERRITORIAL_REORG_UPGRADE_ID) {
            set({
                unlockedKnowledgeUpgrades: [...unlockedNorm, uid],
                phase: 'destroy_selection',
                pendingDestroySource: TERRITORIAL_REORG_UPGRADE_ID,
                destroySelectionMaxSymbols: 3,
                levelUpResearchPoints: nextResearchPts,
                returnPhaseAfterDevKnowledgeUpgrade: null,
            });
            return;
        }

        const newUnlocked = [...unlockedNorm, uid];

        if (uid === SACRIFICIAL_RITE_UPGRADE_ID) {
            const oblDef = RELICS[RELIC_ID.OBLIVION_FURNACE];
            if (oblDef) {
                const rs = useRelicStore.getState();
                for (let i = 0; i < 3; i++) rs.addRelic(oblDef);
            }
        }

        // Apply upgrade effects
        let religionUnlocked = state.religionUnlocked;
        if (uid === 4) religionUnlocked = true; // Theology

        let bonusXpDelta = 0;
        if (uid === 1) bonusXpDelta = 2; // Writing System: +2 base Knowledge

        let newBoard = [...state.board.map((row) => [...row])];
        let newPlayerSymbols = [...state.playerSymbols];

        // 16 Education: Library → University
        if (uid === 16) {
            newPlayerSymbols = newPlayerSymbols.map((s) =>
                s.definition.id === S.library ? { ...s, definition: Sym.university } : s
            );
        }

        // 2 Bronze Working: migrate HP for owned units
        if (uid === 2) {
            const migrateBronzeHp = (s: PlayerSymbolInstance): PlayerSymbolInstance => {
                if (s.definition.type !== SymbolType.UNIT) return s;
                const bonus = getBronzeWorkingHpBonus(s.definition);
                if (bonus === 0) return s;
                const base = s.definition.base_hp ?? 0;
                const newMax = base + bonus;
                const cur = s.enemy_hp ?? base;
                const migrated = Math.min(newMax, cur + bonus);
                return { ...s, enemy_hp: migrated };
            };
            newPlayerSymbols = newPlayerSymbols.map(migrateBronzeHp);
        }

        // Sync board from updated playerSymbols
        for (let y = 0; y < state.board.length; y++) {
            for (let x = 0; x < state.board[y].length; x++) {
                const cell = state.board[y][x];
                if (cell) {
                    const match = newPlayerSymbols.find(s => s.instanceId === cell.instanceId);
                    if (match) {
                        newBoard[y][x] = match;
                    } else {
                        newBoard[y][x] = null;
                    }
                }
            }
        }

        const edictAfterUpgrade = state.edictRemovalPending;
        const baseUnlock = {
            unlockedKnowledgeUpgrades: newUnlocked,
            bonusXpPerTurn: state.bonusXpPerTurn + bonusXpDelta,
            religionUnlocked: religionUnlocked,
            board: newBoard,
            playerSymbols: newPlayerSymbols,
            knowledge: state.knowledge,
            gold: state.gold,
            levelUpResearchPoints: nextResearchPts,
        };

        if (edictAfterUpgrade) {
            set({
                ...baseUnlock,
                edictRemovalPending: false,
                phase: 'destroy_selection' as GamePhase,
                pendingDestroySource: EDICT_SYMBOL_ID,
                destroySelectionMaxSymbols: 1,
                returnPhaseAfterDevKnowledgeUpgrade: null,
            });
            return;
        }

        if (state.returnPhaseAfterDevKnowledgeUpgrade != null) {
            set({
                ...baseUnlock,
                phase: state.returnPhaseAfterDevKnowledgeUpgrade,
                returnPhaseAfterDevKnowledgeUpgrade: null,
                symbolSelectionRelicSourceId: null,
            });
            return;
        }

        set({
            ...baseUnlock,
            phase: 'selection' as GamePhase,
            returnPhaseAfterDevKnowledgeUpgrade: null,
            symbolSelectionRelicSourceId: null,
            symbolChoices:
                state.symbolChoices.length > 0
                    ? state.symbolChoices
                    : (() => {
                          const res = generateChoicesSelection({
                              era: state.era,
                              religionUnlocked: state.religionUnlocked,
                              upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                              ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                              forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
                          });
                          if (res.consumedForceTerrain) {
                              set({ forceTerrainInNextSymbolChoices: false });
                          }
                          return res.choices;
                      })(),
        });
    },

    rerollSymbols: () => {
        const state = get();
        if (state.phase !== 'selection') return;
        if (
            state.symbolSelectionRelicSourceId === RELIC_ID.ANCIENT_RELIC_DEBRIS ||
            state.symbolSelectionRelicSourceId === RELIC_ID.ANCIENT_TRIBE_JOIN
        ) {
            return;
        }

        const hasLydia = useRelicStore.getState().relics.some(r => r.definition.id === RELIC_ID.LYDIA_COIN);

        // ID 2: 리디아의 호박금 주화 — 비용 50% 할인, 턴당 최대 3회
        const baseRerollCost = getRerollCost(state.level);
        const rerollCostUnscaled = hasLydia ? Math.floor(baseRerollCost * 0.5) : baseRerollCost;
        const rerollCost = rerollCostUnscaled;
        const maxRerolls = hasLydia ? 3 : Infinity;

        if (state.rerollsThisTurn >= maxRerolls) return;

        const freeLeft = state.freeSelectionRerolls ?? 0;
        if (freeLeft > 0) {
            set({
                freeSelectionRerolls: freeLeft - 1,
                symbolChoices: (() => {
                    const res = generateChoicesSelection({
                        era: state.era,
                        religionUnlocked: state.religionUnlocked,
                        upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                        ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                        forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
                    });
                    if (res.consumedForceTerrain) {
                        set({ forceTerrainInNextSymbolChoices: false });
                    }
                    return res.choices;
                })(),
            });
            return;
        }

        if (state.gold < rerollCost) return;

        set({
            gold: state.gold - rerollCost,
            symbolChoices: (() => {
                const res = generateChoicesSelection({
                    era: state.era,
                    religionUnlocked: state.religionUnlocked,
                    upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                    ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                    forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
                });
                if (res.consumedForceTerrain) {
                    set({ forceTerrainInNextSymbolChoices: false });
                }
                return res.choices;
            })(),
            rerollsThisTurn: state.rerollsThisTurn + 1,
        });
    },

    confirmDestroySymbols: (instanceIds: string[]) => {
        const state = get();
        if (state.phase !== 'destroy_selection') return;
        const src = state.pendingDestroySource;

        const removed = state.playerSymbols.filter((s) => instanceIds.includes(s.instanceId));
        const skipEd69 = src === EDICT_SYMBOL_ID;
        const symAgg = aggregateCollectionDestroyEffects(removed, skipEd69);
        const shBonus = scarabAndHinduismBonusForOwnedRemoves(state.board, removed.length);
        const dFood = symAgg.food + shBonus.food;
        const dGold = symAgg.gold + shBonus.gold;
        const dKnowledge = symAgg.knowledge + shBonus.knowledge;

        const rewardPatch = (s: GameState) => ({
            food: s.food + dFood,
            gold: s.gold + dGold,
            knowledge: s.knowledge + dKnowledge,
            bonusXpPerTurn: s.bonusXpPerTurn + symAgg.bonusXpPerTurnDelta,
            forceTerrainInNextSymbolChoices: s.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices,
            edictRemovalPending: s.edictRemovalPending || symAgg.edictRemovalPending,
            freeSelectionRerolls: (s.freeSelectionRerolls ?? 0) + symAgg.freeSelectionRerolls,
            isRelicShopOpen: s.isRelicShopOpen || symAgg.openRelicShop,
        });

        const baseFiltered = state.playerSymbols.filter((s) => !instanceIds.includes(s.instanceId));
        const newSymbols = appendSymbolDefIdsToPlayer(
            baseFiltered,
            symAgg.addSymbolDefIds,
            state.unlockedKnowledgeUpgrades || [],
        );
        const goldAdd = instanceIds.length * 10;

        const afterSetRelicRefresh = () => {
            if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));
        };

        if (src === EDICT_SYMBOL_ID) {
            const terr = state.territorialAfterEdictPending;
            set({
                ...rewardPatch(state),
                playerSymbols: newSymbols,
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                territorialAfterEdictPending: false,
                symbolSelectionRelicSourceId: null,
                symbolChoices: terr
                    ? generateTerrainOnlyChoicesSelection({
                          era: state.era,
                          religionUnlocked: state.religionUnlocked,
                          upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                          ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                      })
                    : (() => {
                          const res = generateChoicesSelection({
                              era: state.era,
                              religionUnlocked: state.religionUnlocked,
                              upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                              ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                              forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
                          });
                          if (res.consumedForceTerrain) {
                              set({ forceTerrainInNextSymbolChoices: false });
                          }
                          return res.choices;
                      })(),
                ...(terr ? { bonusSelectionQueue: ['terrain', 'any', 'any', 'any'] } : {}),
            });
            afterSetRelicRefresh();
            return;
        }

        if (src === TERRITORIAL_REORG_UPGRADE_ID) {
            const edictChain = get().edictRemovalPending;
            if (edictChain) {
                set({
                    ...rewardPatch(state),
                    playerSymbols: newSymbols,
                    gold: state.gold + dGold + goldAdd,
                    edictRemovalPending: false,
                    phase: 'destroy_selection',
                    pendingDestroySource: EDICT_SYMBOL_ID,
                    destroySelectionMaxSymbols: 1,
                    territorialAfterEdictPending: true,
                    bonusSelectionQueue: ['terrain', 'any', 'any', 'any'],
                });
                afterSetRelicRefresh();
                return;
            }
            set({
                ...rewardPatch(state),
                playerSymbols: newSymbols,
                gold: state.gold + dGold + goldAdd,
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                symbolSelectionRelicSourceId: null,
                symbolChoices: generateTerrainOnlyChoicesSelection({
                    era: state.era,
                    religionUnlocked: state.religionUnlocked,
                    upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                    ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                }),
                bonusSelectionQueue: ['terrain', 'any', 'any', 'any'],
            });
            afterSetRelicRefresh();
            return;
        }

        // No other destroy_selection sources (legacy Sacrificial Rite used this path).
        return;
    },

    finishDestroySelection: () => {
        if (get().phase !== 'destroy_selection') return;
        const src = get().pendingDestroySource;
        if (src === EDICT_SYMBOL_ID) {
            const st = get();
            const terr = st.territorialAfterEdictPending;
            set({
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                territorialAfterEdictPending: false,
                symbolSelectionRelicSourceId: null,
                symbolChoices: terr
                    ? generateTerrainOnlyChoicesSelection({
                          era: st.era,
                          religionUnlocked: st.religionUnlocked,
                          upgrades: (st.unlockedKnowledgeUpgrades || []).map(Number),
                          ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                      })
                    : (() => {
                          const res = generateChoicesSelection({
                              era: st.era,
                              religionUnlocked: st.religionUnlocked,
                              upgrades: (st.unlockedKnowledgeUpgrades || []).map(Number),
                              ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                              forceTerrainInNextSymbolChoices: st.forceTerrainInNextSymbolChoices,
                          });
                          if (res.consumedForceTerrain) {
                              set({ forceTerrainInNextSymbolChoices: false });
                          }
                          return res.choices;
                      })(),
                ...(terr ? { bonusSelectionQueue: ['terrain', 'any', 'any', 'any'] } : {}),
            });
            return;
        }
        if (get().edictRemovalPending) {
            set({
                phase: 'destroy_selection',
                pendingDestroySource: EDICT_SYMBOL_ID,
                destroySelectionMaxSymbols: 1,
                edictRemovalPending: false,
            });
            return;
        }
        set({
            phase: phaseAfterTurnFlowComplete(get().level),
            pendingDestroySource: null,
            destroySelectionMaxSymbols: 3,
        });
    },

    confirmOblivionFurnaceDestroyAt: (x, y) => {
        const state = get();
        if (state.phase !== 'oblivion_furnace_board') return;
        const relicInstId = state.pendingOblivionFurnaceRelicId;
        if (!relicInstId) return;
        if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) return;
        const sym = state.board[x][y];
        if (!sym) return;

        const instanceIds = [sym.instanceId];
        const removed = [sym];
        const symAgg = aggregateCollectionDestroyEffects(removed, false);
        const shBonus = scarabAndHinduismBonusForOwnedRemoves(state.board, removed.length);
        const dFood = symAgg.food + shBonus.food;
        const dGold = symAgg.gold + shBonus.gold;
        const dKnowledge = symAgg.knowledge + shBonus.knowledge;

        const rewardPatch = (s: GameState) => ({
            food: s.food + dFood,
            gold: s.gold + dGold,
            knowledge: s.knowledge + dKnowledge,
            bonusXpPerTurn: s.bonusXpPerTurn + symAgg.bonusXpPerTurnDelta,
            forceTerrainInNextSymbolChoices: s.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices,
            edictRemovalPending: s.edictRemovalPending || symAgg.edictRemovalPending,
            freeSelectionRerolls: (s.freeSelectionRerolls ?? 0) + symAgg.freeSelectionRerolls,
            isRelicShopOpen: s.isRelicShopOpen || symAgg.openRelicShop,
        });

        const newBoard = state.board.map((col) => [...col]);
        newBoard[x][y] = null;

        const baseFiltered = state.playerSymbols.filter((s) => !instanceIds.includes(s.instanceId));
        const newSymbols = appendSymbolDefIdsToPlayer(
            baseFiltered,
            symAgg.addSymbolDefIds,
            state.unlockedKnowledgeUpgrades || [],
        );

        useRelicStore.getState().removeRelic(relicInstId);
        set({
            ...rewardPatch(state),
            board: newBoard,
            playerSymbols: newSymbols,
            phase: phaseAfterTurnFlowComplete(state.level),
            pendingOblivionFurnaceRelicId: null,
            destroySelectionMaxSymbols: 3,
        });
        if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));
    },

    cancelOblivionFurnacePick: () => {
        const state = get();
        if (state.phase !== 'oblivion_furnace_board') return;
        set({
            phase: phaseAfterTurnFlowComplete(state.level),
            pendingOblivionFurnaceRelicId: null,
            destroySelectionMaxSymbols: 3,
        });
    },

    activateClickableRelic: (instanceId: string) => {
        const state = get();
        if (state.phase !== 'idle') return;
        const relic = useRelicStore.getState().relics.find((r) => r.instanceId === instanceId);
        if (!relic) return;
        const defId = relic.definition.id;

        if (defId === RELIC_ID.OBLIVION_FURNACE) {
            let hasBoardSymbol = false;
            for (let bx = 0; bx < BOARD_WIDTH; bx++) {
                for (let by = 0; by < BOARD_HEIGHT; by++) {
                    if (state.board[bx][by]) {
                        hasBoardSymbol = true;
                        break;
                    }
                }
                if (hasBoardSymbol) break;
            }
            if (!hasBoardSymbol) return;
            set({
                phase: 'oblivion_furnace_board',
                pendingOblivionFurnaceRelicId: instanceId,
            });
            return;
        }

        if (defId === RELIC_ID.JOMON_POTTERY) {
            const stored = relic.bonus_stacks;
            const foodGain = stored * 2;
            if (stored <= 0) return;
            // 플로팅을 띄우기 위해 아이콘은 잠깐 유지한 뒤 제거
            set((s) => ({
                food: s.food + foodGain,
                relicFloats: [...(s.relicFloats ?? []), { relicInstanceId: instanceId, text: `+${foodGain}`, color: '#4ade80' }],
            }));
            // 중복 클릭 방지: 저장량을 즉시 0으로 만들고, 약간의 연출 후 제거
            useRelicStore.getState().incrementRelicBonus(instanceId, -stored);
            setTimeout(() => useRelicStore.getState().removeRelic(instanceId), 260);
            get().appendEventLog({
                turn: state.turn,
                kind: 'relic',
                delta: { food: foodGain, gold: 0, knowledge: 0 },
                meta: { relicId: defId, action: 'jomon_cashout' },
            });
            return;
        }

        if (defId === RELIC_ID.ANCIENT_RELIC_DEBRIS) {
            useRelicStore.getState().removeRelic(instanceId);
            const res = generateChoicesSelection({
                era: state.era,
                religionUnlocked: state.religionUnlocked,
                upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
            });
            const choices = res.choices;
            if (res.consumedForceTerrain) set({ forceTerrainInNextSymbolChoices: false });
            set({
                phase: 'selection',
                symbolChoices: choices,
                symbolSelectionRelicSourceId: RELIC_ID.ANCIENT_RELIC_DEBRIS,
            });
            get().appendEventLog({
                turn: state.turn,
                kind: 'relic',
                meta: { relicId: defId, action: 'debris_symbol_pick' },
            });
            return;
        }

        if (defId === RELIC_ID.ANCIENT_TRIBE_JOIN) {
            useRelicStore.getState().removeRelic(instanceId);
            const choices = generateTerrainOnlyChoicesSelection({
                era: state.era,
                religionUnlocked: state.religionUnlocked,
                upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
            });
            set({
                phase: 'selection',
                symbolChoices: choices,
                symbolSelectionRelicSourceId: RELIC_ID.ANCIENT_TRIBE_JOIN,
            });
            get().appendEventLog({
                turn: state.turn,
                kind: 'relic',
                meta: { relicId: defId, action: 'tribe_join_terrain_pick' },
            });
        }
    },

    initializeGame: () => {
        const { board, playerSymbols: symbols } = createStartingBoard();
        set({
            food: 0,
            gold: 0,
            knowledge: 0,
            era: 1,
            level: 0,
            turn: 0,
            stageId: 1,
            board,
            playerSymbols: symbols,
            phase: 'idle',
            symbolChoices: [],
            symbolSelectionRelicSourceId: null,
            relicChoices: generateRelicChoices(),
            relicHalfPriceRelicId: null,
            lastEffects: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
            effectPhase: null,
            effectPhase3ReachedThisRun: false,
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
            bonusXpPerTurn: 0,

            levelUpResearchPoints: 0,
            isRelicShopOpen: false,
            hasNewRelicShopStock: false,
            rerollsThisTurn: 0,

            barbarianSymbolThreat: 0,
            barbarianCampThreat: 0,
            naturalDisasterThreat: 0,
            pendingNewThreatFloats: [],
            pendingCombatLootAdds: [],
            pendingDestroySource: null,
            pendingOblivionFurnaceRelicId: null,
            bonusSelectionQueue: [],
            edictRemovalPending: false,
            forceTerrainInNextSymbolChoices: false,
            freeSelectionRerolls: 0,
            destroySelectionMaxSymbols: 3,
            territorialAfterEdictPending: false,
            returnPhaseAfterDevKnowledgeUpgrade: null,
        });
    },

    startGameWithDraft: (symbolIds: number[], leaderId: import('../data/leaders').LeaderId, stageId: number) => {
        if (!isLeaderPlayable(leaderId)) return;
        const resolvedStage = stageId >= 1 && stageId <= TOTAL_STAGE_COUNT ? stageId : 1;
        const relicStore = useRelicStore.getState();
        const toRemove = relicStore.relics.map((r) => r.instanceId);
        toRemove.forEach((id) => relicStore.removeRelic(id));
        const leaderRelics = getLeaderStartingRelics(leaderId);
        leaderRelics.forEach((def) => relicStore.addRelic(def));
        const { debris: debrisCount, tribe: tribeCount } = getStageStartingRelicCounts(resolvedStage);
        const debrisDef = RELICS[RELIC_ID.ANCIENT_RELIC_DEBRIS];
        const tribeDef = RELICS[RELIC_ID.ANCIENT_TRIBE_JOIN];
        if (debrisDef) {
            for (let i = 0; i < debrisCount; i++) relicStore.addRelic(debrisDef);
        }
        if (tribeDef) {
            for (let i = 0; i < tribeCount; i++) relicStore.addRelic(tribeDef);
        }

        const leader = LEADERS[leaderId];
        const startingFood = (leader?.startingFood ?? 0);
        const startingGold = (leader?.startingGold ?? 0);

        const initialRelicChoices = generateRelicChoices();
        const initialHalfPriceRelicId = pickRelicHalfPriceIdForGoldenTrade(
            initialRelicChoices,
            leaderId === 'ramesses',
        );

        let playerSymbols = symbolIds
            .map((id) => SYMBOLS[id])
            .filter((def): def is SymbolDefinition => def != null)
            .map((def) => createInstance(def));

        playerSymbols = ensureOralTraditionOwned(playerSymbols);

        const board = createEmptyBoard();
        const placed = placeOralTraditionAtBoardCenter(board, playerSymbols);

        set({
            leaderId,
            food: startingFood,
            gold: startingGold,
            knowledge: 0,
            era: 1,
            level: 0,
            turn: 0,
            stageId: resolvedStage,
            board: placed.board,
            playerSymbols: placed.playerSymbols,
            phase: 'idle',
            symbolChoices: [],
            symbolSelectionRelicSourceId: null,
            relicChoices: initialRelicChoices,
            relicHalfPriceRelicId: initialHalfPriceRelicId,
            lastEffects: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
            effectPhase: null,
            effectPhase3ReachedThisRun: false,
            eventLog: [],
            prevBoard: placed.board.map((col) => [...col]),
            combatAnimation: null,
            combatShaking: false,
            religionUnlocked: false,
            unlockedKnowledgeUpgrades: [],
            bonusXpPerTurn: 0,
            levelUpResearchPoints: 0,
            isRelicShopOpen: false,
            hasNewRelicShopStock: false,
            rerollsThisTurn: 0,
            barbarianSymbolThreat: 0,
            barbarianCampThreat: 0,
            naturalDisasterThreat: 0,
            pendingNewThreatFloats: [],
            pendingCombatLootAdds: [],
            pendingDestroySource: null,
            pendingOblivionFurnaceRelicId: null,
            bonusSelectionQueue: [],
            edictRemovalPending: false,
            forceTerrainInNextSymbolChoices: false,
            freeSelectionRerolls: 0,
            destroySelectionMaxSymbols: 3,
            territorialAfterEdictPending: false,
            returnPhaseAfterDevKnowledgeUpgrade: null,
            knowledgeUpgradeFloats: [],
        });
    },

    butcherPastureAnimalAt: (x: number, y: number) => {
        const prev = get();
        if (prev.phase !== 'idle') return;
        const sym = prev.board[x]?.[y];
        const sid = sym?.definition.id;
        if (!sym || sym.is_marked_for_destruction || (sid !== S.cattle && sid !== S.sheep)) return;
        const plainsNear = getAdjacentCoords(x, y).some(
            (p) => prev.board[p.x][p.y]?.definition.id === S.plains,
        );
        if (!plainsNear) return;

        const removed = [sym];
        const symAgg = aggregateCollectionDestroyEffects(removed, false);
        const shBonus = scarabAndHinduismBonusForOwnedRemoves(prev.board, removed.length);
        const butcherFood = sid === S.cattle ? 10 : 5;
        const butcherGoldFlat = sid === S.sheep ? 5 : 0;
        const dFood = butcherFood + symAgg.food + shBonus.food;
        const dGold = butcherGoldFlat + symAgg.gold + shBonus.gold;
        const dKnowledge = symAgg.knowledge + shBonus.knowledge;

        const instanceIds = [sym.instanceId];
        const newBoard = prev.board.map((col) => [...col]);
        newBoard[x][y] = null;
        const baseFiltered = prev.playerSymbols.filter((s) => !instanceIds.includes(s.instanceId));
        const newSymbols = appendSymbolDefIdsToPlayer(
            baseFiltered,
            symAgg.addSymbolDefIds,
            prev.unlockedKnowledgeUpgrades || [],
        );

        set({
            board: newBoard,
            playerSymbols: newSymbols,
            food: prev.food + dFood,
            gold: prev.gold + dGold,
            knowledge: prev.knowledge + dKnowledge,
            bonusXpPerTurn: prev.bonusXpPerTurn + symAgg.bonusXpPerTurnDelta,
            forceTerrainInNextSymbolChoices: prev.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices,
            edictRemovalPending: prev.edictRemovalPending || symAgg.edictRemovalPending,
            freeSelectionRerolls: (prev.freeSelectionRerolls ?? 0) + symAgg.freeSelectionRerolls,
            isRelicShopOpen: prev.isRelicShopOpen || symAgg.openRelicShop,
            lastEffects: [...prev.lastEffects, { x, y, food: dFood, gold: dGold, knowledge: dKnowledge }],
        });
        if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));
        get().appendEventLog({
            turn: prev.turn,
            kind: 'system',
            slot: { x, y },
            symbolId: sid,
            delta: { food: dFood, gold: dGold, knowledge: dKnowledge },
            meta: {
                action: sid === S.cattle ? 'cattle_butcher' : 'sheep_butcher',
                butcherFood,
                butcherGoldFlat,
            },
        });
    },

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
            const L = Math.max(1, Math.min(30, Math.round(value)));
            set({ level: L, era: getEraFromLevel(L) });
            return;
        }
        if (stat === 'turn') {
            set({ turn: Math.max(0, Math.round(value)) });
            return;
        }
        set({ [stat]: Math.max(0, value) });
    },

    devForceScreen: (screen: 'symbol' | 'upgrade') => {
        const state = get();
        if (screen === 'symbol') {
            const res = generateChoicesSelection({
                era: state.era,
                religionUnlocked: state.religionUnlocked,
                upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
            });
            const choices = res.choices;
            if (res.consumedForceTerrain) set({ forceTerrainInNextSymbolChoices: false });
            set({ phase: 'selection', symbolChoices: choices, symbolSelectionRelicSourceId: null });
        } else if (screen === 'upgrade') {
            set({
                levelUpResearchPoints: (state.levelUpResearchPoints ?? 0) + 1,
            });
        }
    },
}));
