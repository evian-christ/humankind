import { create } from 'zustand';
import { getStageFoodPaymentBase, getStagePassiveBonus, getStageStartingRelicCounts } from '../data/stages';
import { SYMBOLS, SymbolType, type SymbolDefinition, RELIGION_DOCTRINE_IDS, EXCLUDED_FROM_BASE_POOL, TAX_SYMBOL_ID, EDICT_SYMBOL_ID } from '../data/symbolDefinitions';
import { SYMBOL_CANDIDATES } from '../data/symbolCandidates';
import { processSingleSymbolEffects, type ActiveRelicEffects } from '../logic/symbolEffects';
import { useSettingsStore, EFFECT_SPEED_DELAY, COMBAT_BOUNCE_DURATION } from './settingsStore';
import { RELIC_LIST, RELICS, type RelicDefinition } from '../data/relicDefinitions';
import { useRelicStore } from './relicStore';
import type { PlayerSymbolInstance } from '../types';
import { t } from '../../i18n';

export { type PlayerSymbolInstance } from '../types';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;
/** 레벨에 따라 증가하는 리롤 비용: 2G(Lv1) → 5G(Lv10+) */
export const getRerollCost = (level: number): number => Math.min(2 + Math.floor((level - 1) / 3), 5);

/**
 * 지도자 스킬을 "지식 업그레이드"로 치환한 ID들.
 * - 이들은 업그레이드 선택지로 등장하지 않도록 `KNOWLEDGE_UPGRADES.type`으로 숨김 처리함.
 */
const LEADER_KNOWLEDGE_UPGRADES = {
    ramesses: { main: 11, sub: 12 },
    shihuang: { main: 13, sub: 14 },
} as const;

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

/** 유물 ID 목록 (relicDefinitions + relicCandidates) */
const RELIC_ID = {
    CLOVIS_SPEAR: 1,          // 클로비스 투창촉: 매 턴 전투 직전 무작위 적 체력 -1
    LYDIA_COIN: 2,            // 리디아 호박금 주화: 리롤 50% 할인, 턴당 최대 3회
    UR_WHEEL: 3,              // 우르 전차 바퀴: 3턴간 매 턴 최저 식량 심볼 파괴·파괴당 G+10
    JOMON_POTTERY: 4,         // 조몬 토기 조각: 유물에 식량 저장(턴당+1), 클릭 시 2배 지급 후 제거
    EGYPT_SAW: 5,             // 이집트 구리 톱: 채석장 빈 슬롯 G+10
    BABYLON_MAP: 6,           // 바빌로니아 세계 지도: 매 턴 F+10, 보드 20번 심볼 -이면 영구 +10
    GOANNA_BANANA: 7,         // 쿠크 늪지대 바나나 화석: 열대 과수원 인접 바나나 F+20
    TEN_COMMANDMENTS: 8,      // 십계명 석판: 돌→석판
    NILE_SILT: 9,             // 나일 흑니: 3턴간 이번 턴 보드 식량 합만큼 추가 생산 후 제거
    GOBEKLI_PILLAR: 10,       // 괴베클리 석주: 빈 슬롯당 식량 +1
    CATALHOYUK: 11,           // 차탈회위크 여신상: 심볼 15개↑ 일 때 식량 +5
    SCARAB: 12,               // 쇠똥구리 부적: 턴 종료 시 이번 턴 파괴 예정 심볼당 G+3
    ANCIENT_RELIC_DEBRIS: 13, // 고대 유물 잔해: 클릭 시 심볼 선택 1회 후 제거
    EPICURUS_PLAQUE: 14,      // 에피쿠로스 명판: 보드에 종교 없으면 지식 +3
    OBLIVION_FURNACE: 15,     // 망각의 화로: 클릭 → 보유 심볼 1 파괴 후 유물 제거
    TERRA_FOSSIL_GRAPE: 16,   // 테라 화석 포도: 자연재해 심볼 식량 +2
    ANTONINIANUS: 17,         // 안토니니아누스 은화: 심볼 선택 스킵 시 골드 +2
    ANDEAN_CHUNO: 18,         // 안데스의 추뇨: 매 턴 식량 +2
    ANCIENT_TRIBE_JOIN: 19,   // 고대 부족 합류: 클릭 시 지형만 3개 선택 1회 후 제거
} as const;

/** destroy_selection 출처: 망각의 화로(15) — `RELIC_ID.OBLIVION_FURNACE` 와 동일 */
export const OBLIVION_FURNACE_PENDING = RELIC_ID.OBLIVION_FURNACE;


/** 작물 심볼 ID 목록 (카르멜 산 화덕 재 효과용) */
const CROP_SYMBOL_IDS = [1, 2, 4, 5]; // Wheat, Rice, Banana, Fish

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

// 레벨업에 필요한 경험치(Knowledge)
// 1~10렙: 50
// 11~20렙: 100
// 21~30렙: 200
const getKnowledgeRequiredForLevel = (currentLevel: number): number => {
    if (currentLevel < 10) return 50;
    if (currentLevel < 20) return 100;
    return 200;
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

type GamePhase = 'idle' | 'spinning' | 'showing_new_threats' | 'processing' | 'upgrade_selection' | 'selection' | 'destroy_selection' | 'game_over' | 'victory';
/** 10·20·30…턴마다 식량 납부 비용 — 난이도(stageId)에 따라 첫 납부액만 다름 */
export const calculateFoodCost = (turn: number, stageId: number = 1): number => {
    const base = getStageFoodPaymentBase(stageId);
    const nth = Math.floor(turn / 10);
    if (nth < 1) return base;
    return base + (nth - 1) * 50;
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
    food: number;
    gold: number;
    knowledge: number; // 기존 knowledge
    level: number; // 1 ~ 30
    era: number; // derived from level
    turn: number;
    /** 난이도(프리게임 스테이지 1~4) — 식량 납부·시작 유물·기본 생산 보너스 */
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

    /** 지식 업그레이드 선택지 */
    upgradeChoices: import('../data/knowledgeUpgrades').KnowledgeUpgrade[];
    /**
     * 이번 턴에 남은 지식 업그레이드 선택 횟수 (한 번에 레벨이 여러 번 오르면 길이만큼 연속 선택).
     * 각 요소는 해당 선택이 대응하는 **도달 레벨** (예: 5→7이면 [6, 7]).
     */
    knowledgeUpgradePickQueue: number[];
    /** 레벨업 직전의 레벨 (업그레이드 화면 백업 표시용; 화면은 pickQueue[0] 우선) */
    levelBeforeUpgrade: number;
    /** 유물 상점 오버레이 열림 여부 */
    isRelicShopOpen: boolean;
    /** 이번 선택 페이즈에서 리롤한 횟수 (리디아 유물: 최대 3회) */
    rerollsThisTurn: number;

    /** 이번 지식 업그레이드 선택 화면에서 전역 리롤 1회 소비 여부 (한 슬롯만 바꿀 수 있음) */
    knowledgeUpgradeGlobalRerollUsed: boolean;
    /** devForceScreen('upgrade')로 연 경우: 닫을 때 복귀할 phase (null = 일반 레벨업 → 심볼 선택) */
    returnPhaseAfterDevKnowledgeUpgrade: GamePhase | null;

    barbarianSymbolThreat: number;
    barbarianCampThreat: number;
    naturalDisasterThreat: number;
    /** 첫 배치된 야만인/재해 심볼에 플로팅 텍스트 표시 후 효과 iteration 진행용 */
    pendingNewThreatFloats: { x: number; y: number; label: string }[];
    /** 전투로 보드에서 제거된 야만인 주둔지(40)마다 전리품(41) 심볼 ID — 효과 페이즈 종료 시 toAdd에 합침 */
    pendingCombatLootAdds: number[];

    /** destroy_selection 진입 시 출처 (8 희생 / 22 영토 / 69 칙령 / 망각의 화로) */
    pendingDestroySource: typeof SACRIFICIAL_RITE_UPGRADE_ID | typeof TERRITORIAL_REORG_UPGRADE_ID | typeof EDICT_SYMBOL_ID | typeof OBLIVION_FURNACE_PENDING | null;
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
    refreshRelicShop: (force?: boolean) => void;
    buyRelic: (relicId: number) => void;
    selectUpgrade: (upgradeId: number) => void;
    skipUpgradeSelection: () => void;
    rerollUpgradeCard: (slotIndex: number) => void;
    /** DEV: 지식 업그레이드 선택지 전부 다시 뽑기 */
    debugRerollKnowledgeUpgradeChoices: () => void;

    initializeGame: () => void;
    /** 프리게임: 보유 심볼(symbolIds) + 리더 + 난이도별 시작 유물로 본게임 시작 */
    startGameWithDraft: (symbolIds: number[], leaderId: import('../data/leaders').LeaderId, stageId: number) => void;
    devAddSymbol: (symbolId: number) => void;
    devRemoveSymbol: (instanceId: string) => void;
    devSetStat: (stat: 'food' | 'gold' | 'knowledge' | 'level', value: number) => void;
    devForceScreen: (screen: 'symbol' | 'upgrade') => void;
    confirmDestroySymbols: (instanceIds: string[]) => void;
    finishDestroySelection: () => void;
    /** 조몬 토기 조각·고대 유물 잔해 등 클릭 발동 유물 */
    activateClickableRelic: (instanceId: string) => void;

    /** F12 로그 오버레이용 */
    appendEventLog: (entry: Omit<GameEventLogEntry, 'id' | 'ts'> & { ts?: number; id?: string }) => void;
    clearEventLog: () => void;
}

const hasTextileSourceOnBoard = (board: (PlayerSymbolInstance | null)[][]): boolean => {
    for (let bx = 0; bx < BOARD_WIDTH; bx++) {
        for (let by = 0; by < BOARD_HEIGHT; by++) {
            const sym = board[bx][by];
            if (sym?.definition.id === 14 || sym?.definition.id === 9) return true;
        }
    }
    return false;
};

/** 난이도 + "기본 생산 +N" 업그레이드만 반영한 순수 기본 생산량. */
export function getHudTurnStartPassiveTotals(state: GameState): { food: number; gold: number; knowledge: number } {
    const upgrades = state.unlockedKnowledgeUpgrades || [];
    const knowledge =
        (upgrades.includes(1) ? 4 : 2) +
        (upgrades.includes(10) ? 2 : 0) +
        (upgrades.includes(16) ? 2 : 0) + 
        (upgrades.includes(24) ? 5 : 0);
    const gold =
        (upgrades.includes(6) ? 2 : 0) + (upgrades.includes(10) ? 2 : 0) + (upgrades.includes(24) ? 5 : 0);
    const food = (upgrades.includes(10) ? 5 : 0) + (upgrades.includes(24) ? 10 : 0);
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
            if (!cell || cell.definition.id !== 35) continue;

            if (upgrades.includes(19)) {
                const horsePos = getAdjacentCoords(x, y).find((p) => b[p.x][p.y]?.definition.id === 23);
                if (horsePos) {
                    const horseInst = b[horsePos.x][horsePos.y]!;
                    b[horsePos.x][horsePos.y] = null;
                    removeFromList(horseInst.instanceId);
                    const knight: PlayerSymbolInstance = {
                        ...cell,
                        definition: SYMBOLS[62],
                        enemy_hp: SYMBOLS[62].base_hp,
                        remaining_attacks: SYMBOLS[62].base_attack ? 3 : 0,
                    };
                    b[x][y] = knight;
                    const wi = symList.findIndex((s) => s.instanceId === cell.instanceId);
                    if (wi >= 0) symList[wi] = knight;
                    continue;
                }
            }

            if (upgrades.includes(21)) {
                const seaAdj = getAdjacentCoords(x, y).some((p) => b[p.x][p.y]?.definition.id === 6);
                if (seaAdj) {
                    const caravel: PlayerSymbolInstance = {
                        ...cell,
                        definition: SYMBOLS[63],
                        enemy_hp: SYMBOLS[63].base_hp,
                        remaining_attacks: SYMBOLS[63].base_attack ? 3 : 0,
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


const createInstance = (def: SymbolDefinition): PlayerSymbolInstance => {
    let finalDef = def;
    // Relic ID 8 (십계명 석판): Unlocks 'Stone Tablet' (ID 39) in the symbol selection pool.

    const inst: PlayerSymbolInstance = {
        definition: finalDef,
        instanceId: generateInstanceId(),
        effect_counter: 0,
        is_marked_for_destruction: false,
        remaining_attacks: finalDef.base_attack ? 3 : 0,
        enemy_hp: finalDef.base_hp,
    };

    return inst;
};

/** 시작 심볼: Wheat x2, Stone x1 */
const getStartingSymbols = (): PlayerSymbolInstance[] => {
    return [
        SYMBOLS[1],  // Wheat
        SYMBOLS[1],  // Wheat
        SYMBOLS[7],  // Stone
    ].map(createInstance);
};

/**
 * 시작 보드: 고정 슬롯에 시작 심볼을 배치한 채 반환
 * 슬롯 7 (x=1, y=1) → Wheat
 * 슬롯 9 (x=3, y=1) → Wheat
 * 슬롯 13 (x=2, y=2) → Stone
 */
const createStartingBoard = (): { board: (PlayerSymbolInstance | null)[][], playerSymbols: PlayerSymbolInstance[] } => {
    const symbols = getStartingSymbols();
    const board = createEmptyBoard();
    board[1][1] = symbols[0]; // Wheat  — 슬롯 7
    board[3][1] = symbols[1]; // Wheat  — 슬롯 9
    board[2][2] = symbols[2]; // Stone  — 슬롯 13
    return { board, playerSymbols: symbols };
};


/** 유물에 의해 대체될 심볼 맵 (Relic ID -> [Original Symbol ID, Replacement Symbol ID]) */
const SYMBOL_REPLACEMENTS_BY_RELIC: Record<number, [number, number]> = {
    // 8: [7, 39] // (Disabled: Now adds Tablet as additional symbol)
};

/** 심볼을 시대별로 그룹화 (적 심볼은 이벤트로만 등장하므로 선택 풀에서 제외) */
const getSymbolsByEra = (): Record<number, SymbolDefinition[]> => {
    const result: Record<number, SymbolDefinition[]> = {};
    const hasRelic = (relicId: number) => useRelicStore.getState().relics.some(r => r.definition.id === relicId);

    // 현재 유물에 의해 대체되어야 할 심볼 ID들과 그 대체물들 파악
    const activeReplacements = new Map<number, number>();
    for (const [relicId, [oldId, newId]] of Object.entries(SYMBOL_REPLACEMENTS_BY_RELIC)) {
        if (hasRelic(Number(relicId))) {
            activeReplacements.set(oldId, newId);
        }
    }

    for (const sym of Object.values(SYMBOLS)) {
        let finalSym = sym;

        // 1. 제외 목록에 있고, 어떤 유물의 대체물도 아니라면 건너뜜
        const isReplacementTarget = Array.from(activeReplacements.values()).includes(sym.id);
        const upgrades = useGameStore.getState().unlockedKnowledgeUpgrades || [];
        const feudal = upgrades.includes(FEUDALISM_UPGRADE_ID);

        if (feudal && (sym.type === SymbolType.ANCIENT || sym.id === 35 || sym.id === 36)) continue;

        // 업그레이드로 해금되는 심볼들 예외 처리
        let isUnlocked = !EXCLUDED_FROM_BASE_POOL.has(sym.id);
        if (sym.id === 25 && upgrades.includes(1) && !upgrades.includes(16)) isUnlocked = true; // Writing -> Library
        if (sym.id === 25 && upgrades.includes(16)) isUnlocked = false;
        if (sym.id === 54 && upgrades.includes(16)) isUnlocked = true; // Education -> University
        if (sym.id === 36 && upgrades.includes(5)) isUnlocked = true; // Archery -> Archer
        if (sym.id === 22 && upgrades.includes(6)) isUnlocked = true; // Currency -> Merchant
        if (sym.id === 23 && upgrades.includes(7)) isUnlocked = true; // Horsemanship -> Horse
        if ((sym.id === 24 || sym.id === 26) && upgrades.includes(9)) isUnlocked = true; // Celestial Navigation -> Crab, Pearl
        if (sym.id === 39 && hasRelic(8)) isUnlocked = true; // Ten Commandments -> Tablet (Pool Unlock)
        if (RELIGION_DOCTRINE_IDS.has(sym.id) && useGameStore.getState().religionUnlocked) isUnlocked = true; // Theology -> Religion (Doctrine)
        if (sym.id === 55 && upgrades.includes(17)) isUnlocked = true;
        if ((sym.id === 56 || sym.id === 57) && upgrades.includes(18)) isUnlocked = true;
        if (sym.id === 58 && upgrades.includes(19)) isUnlocked = true;
        if ((sym.id === 59 || sym.id === 60) && upgrades.includes(20)) isUnlocked = true;
        if (sym.id === 61 && upgrades.includes(21)) isUnlocked = true;

        // 금지(Ban) 목록
        if (sym.id === 4 && upgrades.includes(201)) isUnlocked = false; // Hunting -> Ban Banana
        if (sym.id === 35 && upgrades.includes(203)) isUnlocked = false; // Spearcraft -> Ban Warrior

        if (!isUnlocked && !isReplacementTarget) continue;

        // 2. 현재 활성화된 유물에 의해 대체되어야 하는 심볼인 경우 대체
        if (activeReplacements.has(sym.id)) {
            const replacementId = activeReplacements.get(sym.id)!;
            finalSym = SYMBOLS[replacementId] || sym;
        }

        // 3. 만약 이 심볼이 다른 심볼을 대체한 놈인데, 원래는 제외 목록에 있었다면 통과시켜야 함
        // (위의 1번에서 이미 처리됨)

        if (finalSym.type === SymbolType.ENEMY) continue;
        let e = finalSym.type as number;

        // ANCIENT (5), UNIT (6), RELIGION (0) 기물들은 확률 테이블 상 NORMAL (1)에 편입되거나 
        // 종교 해금 시 별도 카테고리(0)로 분류됩니다.
        if (e === SymbolType.ANCIENT || e === SymbolType.UNIT) {
            e = SymbolType.NORMAL;
        }

        // 종교 심볼은 해금되었을 때만 결과 풀에 넣음 (범주 0)
        // 만약 해금 안 되었는데 지형/고대 등에 섞여있는 종교 관련 심볼이 있다면 NORMAL로 처리할 수도 있지만
        // 여기서는 명시적인 RELIGION 타입만 0으로 분류
        if (e === SymbolType.RELIGION && !useGameStore.getState().religionUnlocked) continue;

        if (!result[e]) result[e] = [];

        // 중복 방지 (이미 대체된 심볼이 들어와 있을 수 있음)
        if (!result[e].find(s => s.id === finalSym.id)) {
            result[e].push(finalSym);
        }
    }
    return result;
};

/** 현재 시대에 등장 가능한 심볼 플랫 풀 빌드 (균등 확률용) */
const buildFlatPool = (era: number, religionUnlocked: boolean): SymbolDefinition[] => {
    const symbolsByEra = getSymbolsByEra();
    const flat: SymbolDefinition[] = [];
    const feudal = useGameStore.getState().unlockedKnowledgeUpgrades?.includes(FEUDALISM_UPGRADE_ID);

    for (const [catStr, syms] of Object.entries(symbolsByEra)) {
        if (!syms || syms.length === 0) continue;
        const cat = Number(catStr);
        // Category 0 = Religion: 종교 해금 시에만 포함
        if (cat === SymbolType.RELIGION && !religionUnlocked) continue;
        // Category 2 = Medieval: 시대 2+ 또는 중세시대(15) 해금
        if (cat === SymbolType.MEDIEVAL && era < 2 && !feudal) continue;
        // Category 3 = Modern: era 3 이상
        if (cat === SymbolType.MODERN && era < 3) continue;
        flat.push(...syms);
    }

    return flat;
};

/** 지형 심볼만 3개 (영토 정비 보너스 선택용) */
const generateTerrainOnlyChoices = (era: number, religionUnlocked: boolean): SymbolDefinition[] => {
    const pool = buildFlatPool(era, religionUnlocked).filter((s) => s.type === SymbolType.TERRAIN);
    const choices: SymbolDefinition[] = [];
    for (let i = 0; i < 3; i++) {
        if (pool.length > 0) {
            choices.push(pool[Math.floor(Math.random() * pool.length)]);
        } else {
            choices.push(SYMBOLS[9]);
        }
    }
    return choices;
};

/** 심볼 3개 생성 — 중세시대(15) 해금 시 지형 가중 x0.2 */
const generateChoices = (era: number, religionUnlocked: boolean): SymbolDefinition[] => {
    const store = useGameStore.getState();
    const pool = buildFlatPool(era, religionUnlocked);
    const upgrades = store.unlockedKnowledgeUpgrades || [];
    const feudalTerrainWeight = upgrades.includes(FEUDALISM_UPGRADE_ID);

    const terrainSyms = pool.filter((s) => s.type === SymbolType.TERRAIN);
    const otherSyms = pool.filter((s) => s.type !== SymbolType.TERRAIN);

    const pickOne = (): SymbolDefinition => {
        if (terrainSyms.length === 0 && otherSyms.length === 0) return SYMBOLS[1];
        if (terrainSyms.length === 0) return otherSyms[Math.floor(Math.random() * otherSyms.length)];
        if (otherSyms.length === 0) return terrainSyms[Math.floor(Math.random() * terrainSyms.length)];
        const tw = feudalTerrainWeight ? 0.2 * terrainSyms.length : terrainSyms.length;
        const ow = otherSyms.length;
        if (Math.random() * (tw + ow) < tw) {
            return terrainSyms[Math.floor(Math.random() * terrainSyms.length)];
        }
        return otherSyms[Math.floor(Math.random() * otherSyms.length)];
    };

    if (store.forceTerrainInNextSymbolChoices) {
        useGameStore.setState({ forceTerrainInNextSymbolChoices: false });
        const choices: SymbolDefinition[] = [];
        const tPick =
            terrainSyms.length > 0
                ? terrainSyms[Math.floor(Math.random() * terrainSyms.length)]
                : otherSyms[Math.floor(Math.random() * otherSyms.length)] ?? SYMBOLS[9];
        choices.push(tPick);
        while (choices.length < 3) {
            choices.push(pickOne());
        }
        return choices;
    }

    const choices: SymbolDefinition[] = [];
    for (let i = 0; i < 3; i++) {
        choices.push(pickOne());
    }
    return choices;
};

/** 개발자용: 현재 상태에서 각 심볼이 한 번 픽될 확률(%) 반환 (균등) */
export const getSymbolPoolProbabilities = (era: number, religionUnlocked: boolean): { id: number; name: string; symbolType: number; probability: number }[] => {
    const pool = buildFlatPool(era, religionUnlocked);
    if (pool.length === 0) return [];

    const prob = 100 / pool.length;

    return pool
        .map(sym => ({ id: sym.id, name: sym.name, symbolType: sym.type, probability: prob }))
        .sort((a, b) => a.symbolType - b.symbolType || a.id - b.id);
};


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
    type KnowledgeUpgrade,
    type KnowledgeUpgradeType,
} from '../data/knowledgeUpgrades';
import { KNOWLEDGE_UPGRADE_CANDIDATES } from '../data/knowledgeUpgradeCandidates';
import { getLeaderStartingRelics, isLeaderPlayable, LEADERS } from '../data/leaders';

const upgradeEraByType = (type: KnowledgeUpgradeType): number | null => {
    if (typeof type !== 'number') return null;
    switch (type) {
        case SymbolType.ANCIENT: return 1;
        case SymbolType.MEDIEVAL: return 2;
        case SymbolType.MODERN: return 3;
        default: return null;
    }
};

/**
 * 현재 화면에 나온 ID·이미 해금된 ID를 제외한, 시대·레벨 규칙에 맞는 지식 업그레이드 후보 풀.
 * (generateUpgradeChoices / 리롤이 동일 규칙 사용)
 * Lv.11+ (중세 시대 진입 후): 고대(SymbolType.ANCIENT) 업그레이드는 풀에서 제외하고 중세만 노출.
 */
function buildKnowledgeUpgradeAlternativesPool(
    unlocked: number[],
    currentEra: number,
    level: number,
    excludeIds: Set<number>,
): KnowledgeUpgrade[] {
    const medievalUnlocked = unlocked.includes(FEUDALISM_UPGRADE_ID) || currentEra >= 2;
    return Object.values(KNOWLEDGE_UPGRADES).filter((u) => {
        if (unlocked.includes(u.id) || excludeIds.has(u.id)) return false;
        const upgradeEra = upgradeEraByType(u.type);
        if (upgradeEra == null) return false;
        if (level >= 11) {
            return u.type === SymbolType.MEDIEVAL && medievalUnlocked;
        }
        if (u.id === FEUDALISM_UPGRADE_ID) return level >= 10;
        if (u.type === SymbolType.MEDIEVAL) return medievalUnlocked;
        return upgradeEra <= currentEra;
    });
}

/** 리롤 가능한 대체 후보 개수 (현재 선택지 ID 제외) */
export function countKnowledgeUpgradeRerollAlternatives(
    unlocked: number[],
    era: number,
    level: number,
    currentChoiceIds: number[],
): number {
    return buildKnowledgeUpgradeAlternativesPool(unlocked, era, level, new Set(currentChoiceIds)).length;
}

/** 현재 시대에 맞는 지식 업그레이드 선택지 3개 생성 (이미 업그레이드된 것 제외) */
const generateUpgradeChoices = (unlocked: number[], eraForPick: number, levelForPick: number): KnowledgeUpgrade[] => {
    /** 레벨 10 도달 시(중세시대 미선택): 선택지는 중세시대 카드 1장만 */
    if (levelForPick === 10 && !unlocked.includes(FEUDALISM_UPGRADE_ID)) {
        const feudal = KNOWLEDGE_UPGRADES[FEUDALISM_UPGRADE_ID];
        return feudal ? [feudal] : [];
    }

    const pool = buildKnowledgeUpgradeAlternativesPool(unlocked, eraForPick, levelForPick, new Set());
    const shuffled = shuffle(pool);
    return shuffled.slice(0, 3);
};

/** 현재 보유 유물에서 ActiveRelicEffects 플래그를 조합 */
const buildActiveRelicEffects = (): ActiveRelicEffects => {
    const relics = useRelicStore.getState().relics;
    const hasRelic = (id: number) => relics.some(r => r.definition.id === id);
    const getRelicInstance = (id: number) => relics.find(r => r.definition.id === id);

    const upgrades = useGameStore.getState().unlockedKnowledgeUpgrades || [];

    return {
        relicCount: relics.length,
        quarryEmptyGold: hasRelic(RELIC_ID.EGYPT_SAW),
        bananaFossilBonus: hasRelic(RELIC_ID.GOANNA_BANANA),
        burnOfferingEmptyPenalty: false,
        jerichoMonumentBonus: false,
        gobekliAnimalJackpot: false,
        gilgameshReligionNoPenalty: false,
        fishBoneHookGold: false,
        horsemansihpPastureBonus: upgrades.includes(7),
        terraFossilDisasterFood: hasRelic(RELIC_ID.TERRA_FOSSIL_GRAPE),
    };
};

export const useGameStore = create<GameState>((set, get) => ({
    food: 0,
    gold: 0,
    knowledge: 0,
    level: 1,
    era: 1,
    turn: 0,
    stageId: 1,
    board: (() => { const s = createStartingBoard(); return s.board; })(),
    playerSymbols: (() => { const s = createStartingBoard(); return s.playerSymbols; })(),
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

    upgradeChoices: [],
    knowledgeUpgradePickQueue: [],
    levelBeforeUpgrade: 1,
    isRelicShopOpen: false,
    rerollsThisTurn: 0,
    knowledgeUpgradeGlobalRerollUsed: false,
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
        const state = get();
        if (state.phase !== 'idle') return;

        let { barbarianSymbolThreat, barbarianCampThreat, naturalDisasterThreat } = state;

        const newPlayerSymbols = [...state.playerSymbols];
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
                const enemyDef = SYMBOLS[43];
                if (enemyDef) {
                    const inst = createInstance(enemyDef);
                    newPlayerSymbols.push(inst);
                    newThreats.push({ instanceId: inst.instanceId, label: threatLabel('threat.barbarian_invasion') });
                }
            }

            // 2번: 야만인 주둔지 (확률 통과 시 당 턴 즉시 1기 추가)
            barbarianCampThreat += castleSlow ? 0.1 : 0.2;
            if (Math.random() * 100 < barbarianCampThreat) {
                barbarianCampThreat = 0;
                const campDef = SYMBOLS[40];
                if (campDef) {
                    const inst = createInstance(campDef);
                    newPlayerSymbols.push(inst);
                    newThreats.push({ instanceId: inst.instanceId, label: threatLabel('threat.barbarian_camp') });
                }
            }

            // 3번: 자연재해
            naturalDisasterThreat += 0.5;
            if (Math.random() * 100 < naturalDisasterThreat) {
                naturalDisasterThreat = 0;
                const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
                const FLOOD_ID = 44;
                const EARTHQUAKE_ID = 45;
                const DROUGHT_ID = 46;
                const pick = [FLOOD_ID, EARTHQUAKE_ID, DROUGHT_ID][Math.floor(Math.random() * 3)];

                const addDisaster = (symId: number, counterMin: number, counterMax: number, labelKey: string) => {
                    const def = SYMBOLS[symId];
                    if (!def) return;
                    const inst = createInstance(def);
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
                        const inst = createInstance(def);
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

        const newThreatLabels = new Map<string, string>(newThreats.map(n => [n.instanceId, n.label]));
        const pendingNewThreatFloats: { x: number; y: number; label: string }[] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const inst = placedBoard[x][y];
                if (inst && newThreatLabels.has(inst.instanceId)) {
                    pendingNewThreatFloats.push({ x, y, label: newThreatLabels.get(inst.instanceId)! });
                }
            }
        }

        const newTurn = state.turn + 1;

        // board와 phase를 한 번에 set → renderBoard 시 릴이 새 board를 읽음
        set({
            playerSymbols: placedSymbols,
            barbarianSymbolThreat,
            barbarianCampThreat,
            naturalDisasterThreat,
            pendingNewThreatFloats,
            prevBoard: state.board,
            board: placedBoard,
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
        const FLOOD_ID = 44;
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
        const RELIGION_RECALC_IDS = new Set<number>([31, 32]);
        const religionEffectCache = new Map<string, { food: number; knowledge: number; gold: number }>();
        const religionSlotsToRecalculate: { x: number; y: number; id: number }[] = [];
        const relicEffects = buildActiveRelicEffects();

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
                            adjSym.definition.id === 31 || adjSym.definition.id === 32
                                ? (doctrineFood.get(adjKey) ?? 0)
                                : (religionEffectCache.get(adjKey)?.food ?? 0);

                        const adjKnowledgeFromCache =
                            adjSym.definition.id === 31 || adjSym.definition.id === 32
                                ? 0
                                : (religionEffectCache.get(adjKey)?.knowledge ?? 0);

                        maxAdjFood = Math.max(maxAdjFood, adjFoodFromCache);
                        if (adjKnowledgeFromCache > 0) knowledgeProducerCount++;
                    }

                    if (maxAdjFood === -Infinity) maxAdjFood = 0;

                    let food = 0;
                    let gold = 0;
                    if (sym.definition.id === 31) {
                        food = maxAdjFood;
                    } else if (sym.definition.id === 32) {
                        // 지식을 생산하는 인접 심볼 1개당 골드 +2
                        gold = knowledgeProducerCount * 2;
                    }

                    // 교리(종교 심볼) 인접 페널티: 인접한 다른 교리 심볼이 있으면 -500 Food
                    const hasAdjacentDoctrine = adj.some(pos => {
                        const t = currentBoardRef[pos.x][pos.y];
                        return t && RELIGION_DOCTRINE_IDS.has(t.definition.id);
                    });
                    if (hasAdjacentDoctrine && !relicEffects.gilgameshReligionNoPenalty) {
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
                            if (!sym || sym.definition.id !== 22) continue;
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
            const rawResult = isReligionRecalc ? { food: 0, knowledge: 0, gold: 0 } : processSingleSymbolEffects(
                symbol, currentBoard, x, y, relicEffects, disabledTerrainCoords
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

            let destroyedCount = 0;
            const destroyedSymbols: { id: number; x: number; y: number }[] = [];
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const s = currentBoard[x][y];
                    if (s?.is_marked_for_destruction) {
                        destroyedCount++;
                        destroyedSymbols.push({ id: s.definition.id, x, y });
                    }
                }
            }
            let bonusFood = 0;
            let bonusGold = 0;
            let bonusKnowledge = 0;
            /** 보드 심볼 슬롯 생산이 아닌 유물 자체 효과로 들어오는 자원 — 해당 유물 아이콘 위 플로팅 */
            const relicOwnEffectFloats: { relicInstanceId: string; text: string; color?: string }[] = [];
            /** 턴 말 지식 업그레이드(지도자 스킬 등) 직접 생산 — 해당 업그레이드 아이콘 위 플로팅 */
            const knowledgeOwnEffectFloats: Array<
                | { upgradeId: number; text: string; color?: string }
                | { upgradeId: number; inlineParts: { text: string; color: string }[] }
            > = [];

            // ── 유물 ID 9: 나일 강 비옥한 흑니 — 효과 페이즈 집계 `effects`의 식량 합만큼 추가(3턴 후 제거는 하단에서 카운터 처리)
            const nileRelicInst = getRelicInst(RELIC_ID.NILE_SILT);
            if (nileRelicInst && nileRelicInst.effect_counter > 0) {
                const boardFoodProduced = effects.reduce((s, e) => s + (e.food ?? 0), 0);
                if (boardFoodProduced !== 0) {
                    bonusFood += boardFoodProduced;
                    // (0,0) effects는 보드 1칸에 lastEffects 플로팅이 중복됨 — 유물 아이콘 플로팅만 사용
                    relicOwnEffectFloats.push({
                        relicInstanceId: nileRelicInst.instanceId,
                        text: `+${boardFoodProduced}`,
                        color: '#4ade80',
                    });
                }
            }

            // ── Barbarian Camp (40) 파괴 시 전리품(41) 추가 (효과 페이즈 등으로 보드에 남아 파괴 표시된 경우)
            // 전투로 이미 보드에서 제거된 주둔지는 pendingCombatLootAdds → 위에서 toAdd에 합쳐짐
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const s = currentBoard[x][y];
                    if (s && s.definition.id === 40 && s.is_marked_for_destruction) {
                        toAdd.push(41);
                    }
                }
            }

            // ── Pottery (20): 파괴 시 저장 식량 방출
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const s = currentBoard[x][y];
                    if (s && s.definition.id === 20 && s.is_marked_for_destruction) {
                        bonusFood += s.effect_counter || 0;
                    }
                }
            }

            // ── 유물 ID 4: 조몬 토기 조각 — 매 턴 유물에 식량 1 저장(bonus_stacks)
            const jomonRelicInst = getRelicInst(RELIC_ID.JOMON_POTTERY);
            if (jomonRelicInst) {
                useRelicStore.getState().incrementRelicBonus(jomonRelicInst.instanceId, 1);
            }

            // ── Hay (51): 파괴 시 저장된 카운터만큼 식량 획득 ──
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const s = currentBoard[x][y];
                    if (s && s.definition.id === 51 && s.is_marked_for_destruction) {
                        bonusFood += s.effect_counter || 0;
                    }
                }
            }

            // ── Campfire (19): 파괴 시 인접 심볼 중 "이번 턴 식량 생산"이 가장 높은 심볼의 효과 복사 ──
            // - "이번 턴 식량 생산" 판단은 effects 누적(food 합산) 기준
            // - 복사는 해당 슬롯의 food/gold/knowledge 수치 결과를 그대로 1회 추가
            {
                const effectBySlot = new Map<string, { food: number; gold: number; knowledge: number }>();
                for (const e of effects) {
                    const k = `${e.x},${e.y}`;
                    const prev = effectBySlot.get(k) ?? { food: 0, gold: 0, knowledge: 0 };
                    effectBySlot.set(k, {
                        food: prev.food + (e.food ?? 0),
                        gold: prev.gold + (e.gold ?? 0),
                        knowledge: prev.knowledge + (e.knowledge ?? 0),
                    });
                }

                for (let cx = 0; cx < BOARD_WIDTH; cx++) {
                    for (let cy = 0; cy < BOARD_HEIGHT; cy++) {
                        const camp = currentBoard[cx][cy];
                        if (!camp || camp.definition.id !== 19 || !camp.is_marked_for_destruction) continue;

                        let bestPos: { x: number; y: number } | null = null;
                        let bestFood = -Infinity;
                        for (const pos of getAdjacentCoords(cx, cy)) {
                            const adj = currentBoard[pos.x][pos.y];
                            if (!adj) continue;
                            const adjFood = effectBySlot.get(`${pos.x},${pos.y}`)?.food ?? 0;
                            if (adjFood > bestFood) {
                                bestFood = adjFood;
                                bestPos = pos;
                            }
                        }

                        if (!bestPos || bestFood <= 0) continue;

                        const src = effectBySlot.get(`${bestPos.x},${bestPos.y}`);
                        if (!src) continue;
                        if (src.food === 0 && src.gold === 0 && src.knowledge === 0) continue;

                        bonusFood += src.food;
                        bonusGold += src.gold;
                        bonusKnowledge += src.knowledge;
                        effects.push({ x: cx, y: cy, food: src.food, gold: src.gold, knowledge: src.knowledge });
                    }
                }
            }

            // ── Earthquake (45): 파괴 시 무작위 인접 심볼 1개 파괴 ──
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const s = currentBoard[x][y];
                    if (!s || s.definition.id !== 45 || !s.is_marked_for_destruction) continue;

                    const candidates: { x: number; y: number }[] = [];
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = x + dx, ny = y + dy;
                            if (nx < 0 || nx >= BOARD_WIDTH || ny < 0 || ny >= BOARD_HEIGHT) continue;
                            const nb = currentBoard[nx][ny];
                            if (!nb || nb.is_marked_for_destruction) continue;
                            candidates.push({ x: nx, y: ny });
                        }
                    }

                    if (candidates.length > 0) {
                        const pick = candidates[Math.floor(Math.random() * candidates.length)];
                        const target = currentBoard[pick.x][pick.y];
                        if (target) target.is_marked_for_destruction = true;
                    }
                }
            }

            // ── 유물 ID 3: 우르의 전차 바퀴 — 보드 슬롯 효과 iteration 종료 후: 유물 흔들림 → 최저 식량 심볼 파괴·G+10 → 턴 카운터 감소
            const urWheelRelicForPlan = getRelicInst(RELIC_ID.UR_WHEEL);
            let urWheelMinTarget: { x: number; y: number } | null = null;
            let urWheelInstanceId: string | null = null;
            if (urWheelRelicForPlan && urWheelRelicForPlan.effect_counter > 0) {
                urWheelInstanceId = urWheelRelicForPlan.instanceId;
                let minFoodUr = Infinity;
                for (let ux = 0; ux < BOARD_WIDTH; ux++) {
                    for (let uy = 0; uy < BOARD_HEIGHT; uy++) {
                        const s = currentBoard[ux][uy];
                        if (!s || s.is_marked_for_destruction) continue;
                        const baseFood = (() => {
                            switch (s.definition.id) {
                                case 1: return 2; case 2: return 2; case 3: return 1;
                                case 4: return 2; case 5: return 0; case 6: return 0;
                                case 7: return 0; case 9: return 2; case 13: return 1;
                                case 14: return 1; case 19: return 1; case 22: return 2;
                                case 23: return 1; case 71: return 1;
                                default: return 0;
                            }
                        })();
                        if (baseFood < minFoodUr) {
                            minFoodUr = baseFood;
                            urWheelMinTarget = { x: ux, y: uy };
                        }
                    }
                }
            }

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
            // ── Hinduism (34): 이번 턴 파괴 예정 심볼 1개당 식량/지식 +5 (힌두교 타일마다)
            let finalDestroyedCount = 0;
            for (let hx = 0; hx < BOARD_WIDTH; hx++) {
                for (let hy = 0; hy < BOARD_HEIGHT; hy++) {
                    if (currentBoard[hx][hy]?.is_marked_for_destruction) finalDestroyedCount++;
                }
            }
            if (finalDestroyedCount > 0) {
                for (let hx = 0; hx < BOARD_WIDTH; hx++) {
                    for (let hy = 0; hy < BOARD_HEIGHT; hy++) {
                        const hs = currentBoard[hx][hy];
                        if (!hs || hs.definition.id !== 34 || hs.is_marked_for_destruction) continue;
                        const delta = finalDestroyedCount * 5;
                        bonusFood += delta;
                        bonusKnowledge += delta;
                        effects.push({ x: hx, y: hy, food: delta, gold: 0, knowledge: delta });
                    }
                }
            }

            // ── 유물 ID 6: 바빌로니아 세계 지도 ──
            // 매 턴 F+10(+ 누적 보너스). 보드 마지막 슬롯(x=4,y=3) 심볼이 0이하 식량이면 영구 +10.
            const babylonRelic = getRelicInst(RELIC_ID.BABYLON_MAP);
            if (babylonRelic) {
                const baseBonus = 1 + babylonRelic.bonus_stacks;
                bonusFood += baseBonus;
                relicOwnEffectFloats.push({
                    relicInstanceId: babylonRelic.instanceId,
                    text: `+${baseBonus}`,
                    color: '#4ade80',
                });
                // 보드 마지막 자리 (x=4, y=3) 검사
                const lastSym = currentBoard[BOARD_WIDTH - 1][BOARD_HEIGHT - 1];
                if (lastSym) {
                    const lastEffect = effects.find(e => e.x === BOARD_WIDTH - 1 && e.y === BOARD_HEIGHT - 1);
                    const lastFood = lastEffect?.food ?? 0;
                    if (lastFood <= 0) {
                        useRelicStore.getState().incrementRelicBonus(babylonRelic.instanceId, 1);
                    }
                }
            }

            // ── 유물 ID 9: 나일 강 비옥한 흑니 — 턴 끝마다 남은 턴(effect_counter) -1, 0이면 제거 (식량 보너스는 상단에서 처리)
            const nileForDecrement = getRelicInst(RELIC_ID.NILE_SILT);
            if (nileForDecrement && nileForDecrement.effect_counter > 0) {
                useRelicStore.getState().decrementRelicCounterOrRemove(nileForDecrement.instanceId);
            }

            // ── 유물 ID 10: 괴베클리 테페 신전 석주 — 빈 슬롯당 식량 +1 ──
            const gobekliRelic = getRelicInst(RELIC_ID.GOBEKLI_PILLAR);
            if (gobekliRelic) {
                let emptySlots = 0;
                for (let x = 0; x < BOARD_WIDTH; x++)
                    for (let y = 0; y < BOARD_HEIGHT; y++)
                        if (!currentBoard[x][y]) emptySlots++;
                if (emptySlots > 0) {
                    bonusFood += emptySlots;
                    relicOwnEffectFloats.push({
                        relicInstanceId: gobekliRelic.instanceId,
                        text: `+${emptySlots}`,
                        color: '#4ade80',
                    });
                }
            }

            // ── 유물 ID 11: 차탈회위크 여신상 — 보드 심볼 15개 이상 시 식량 +5 ──
            const catalRelic = getRelicInst(RELIC_ID.CATALHOYUK);
            if (catalRelic) {
                let symbolCount = 0;
                for (let x = 0; x < BOARD_WIDTH; x++)
                    for (let y = 0; y < BOARD_HEIGHT; y++)
                        if (currentBoard[x][y]) symbolCount++;
                if (symbolCount >= 15) {
                    bonusFood += 5;
                    relicOwnEffectFloats.push({
                        relicInstanceId: catalRelic.instanceId,
                        text: '+5',
                        color: '#4ade80',
                    });
                }
            }

            // ── 유물 ID 14: 에피쿠로스의 원자론 명판 — 보드에 종교 심볼이 없으면 지식 +3 ──
            const epicurusRelic = getRelicInst(RELIC_ID.EPICURUS_PLAQUE);
            if (epicurusRelic) {
                let hasReligionOnBoard = false;
                for (let rx = 0; rx < BOARD_WIDTH; rx++) {
                    for (let ry = 0; ry < BOARD_HEIGHT; ry++) {
                        const c = currentBoard[rx][ry];
                        if (c && c.definition.type === SymbolType.RELIGION) {
                            hasReligionOnBoard = true;
                            break;
                        }
                    }
                    if (hasReligionOnBoard) break;
                }
                if (!hasReligionOnBoard) {
                    bonusKnowledge += 3;
                    relicOwnEffectFloats.push({
                        relicInstanceId: epicurusRelic.instanceId,
                        text: '+3',
                        color: '#60a5fa',
                    });
                }
            }

            // ── 유물 ID 18: 안데스의 추뇨 — 매 턴 식량 +2 ──
            const andeanRelic = getRelicInst(RELIC_ID.ANDEAN_CHUNO);
            if (andeanRelic) {
                bonusFood += 2;
                relicOwnEffectFloats.push({
                    relicInstanceId: andeanRelic.instanceId,
                    text: '+2',
                    color: '#4ade80',
                });
            }

            // ── 진시황 천하부강 (지식 업그레이드 13): 보드 심볼 2개당 식량 +1, 빈 칸 2개당 지식 +1 (파괴 예정 칸은 빈 칸으로 계산)
            const upgradesLeader = get().unlockedKnowledgeUpgrades || [];
            if (upgradesLeader.includes(LEADER_KNOWLEDGE_UPGRADES.shihuang.main)) {
                let placedSymbols = 0;
                let emptySlots = 0;
                for (let qx = 0; qx < BOARD_WIDTH; qx++) {
                    for (let qy = 0; qy < BOARD_HEIGHT; qy++) {
                        const cell = currentBoard[qx][qy];
                        if (cell && !cell.is_marked_for_destruction) placedSymbols++;
                        else emptySlots++;
                    }
                }
                const qinFood = Math.floor(placedSymbols / 2);
                const qinKnowledge = Math.floor(emptySlots / 2);
                if (qinFood > 0) bonusFood += qinFood;
                if (qinKnowledge > 0) bonusKnowledge += qinKnowledge;
                if (qinFood > 0 || qinKnowledge > 0) {
                    const inlineParts: { text: string; color: string }[] = [];
                    if (qinFood > 0) inlineParts.push({ text: `+${qinFood}`, color: '#4ade80' });
                    if (qinKnowledge > 0) inlineParts.push({ text: `+${qinKnowledge}`, color: '#60a5fa' });
                    knowledgeOwnEffectFloats.push({
                        upgradeId: LEADER_KNOWLEDGE_UPGRADES.shihuang.main,
                        inlineParts,
                    });
                }
            }

            // ── 람세스 유물 금고(지식 업그레이드 12): 보유 유물 1개당 지식 +1/턴 ──
            if (upgradesLeader.includes(LEADER_KNOWLEDGE_UPGRADES.ramesses.sub)) {
                const relicVaultKnowledge = useRelicStore.getState().relics.length;
                if (relicVaultKnowledge > 0) {
                    bonusKnowledge += relicVaultKnowledge;
                    knowledgeOwnEffectFloats.push({
                        upgradeId: LEADER_KNOWLEDGE_UPGRADES.ramesses.sub,
                        text: `+${relicVaultKnowledge}`,
                        color: '#60a5fa',
                    });
                }
            }

            // ── 영구 턴당 지식 보너스(`bonusXpPerTurn`)는 기본 생산이 아니라 별도 심볼/효과 보너스 ──
            if ((state.bonusXpPerTurn ?? 0) > 0) {
                bonusKnowledge += state.bonusXpPerTurn ?? 0;
            }

            // ── 베틀(206): 초원/평원이 있으면 골드 +10/턴 — 기본 생산이 아닌 조건부 보너스 ──
            if (upgradesLeader.includes(206) && hasTextileSourceOnBoard(state.board)) {
                bonusGold += 10;
                knowledgeOwnEffectFloats.push({ upgradeId: 206, text: '+10', color: '#fbbf24' });
            }

            // ── 유물 ID 12: 고대 이집트 쇠똥구리 부적 — 심볼 파괴 시 G+3/파괴 (유물 자체 보너스) ──
            const scarabRelic = getRelicInst(RELIC_ID.SCARAB);
            if (destroyedCount > 0 && scarabRelic) {
                const scarabGold = destroyedCount * 3;
                bonusGold += scarabGold;
                relicOwnEffectFloats.push({
                    relicInstanceId: scarabRelic.instanceId,
                    text: `+${scarabGold}`,
                    color: '#fbbf24',
                });
            }

            // ── Tax (53): 무작위 인접 심볼 슬롯의 이번 턴 식량 합계만큼 G+, F- (effects 집계 후 정산)
            const foodBySlotKey = new Map<string, number>();
            for (const e of effects) {
                const k = `${e.x},${e.y}`;
                foodBySlotKey.set(k, (foodBySlotKey.get(k) ?? 0) + e.food);
            }
            for (let tx = 0; tx < BOARD_WIDTH; tx++) {
                for (let ty = 0; ty < BOARD_HEIGHT; ty++) {
                    const cell = currentBoard[tx][ty];
                    if (!cell || cell.definition.id !== TAX_SYMBOL_ID || cell.is_marked_for_destruction) continue;
                    const adjOccupied: { x: number; y: number }[] = [];
                    for (const pos of getAdjacentCoords(tx, ty)) {
                        const n = currentBoard[pos.x][pos.y];
                        if (n && !n.is_marked_for_destruction) adjOccupied.push(pos);
                    }
                    if (adjOccupied.length === 0) continue;
                    const pick = adjOccupied[Math.floor(Math.random() * adjOccupied.length)];
                    const F = Math.max(0, foodBySlotKey.get(`${pick.x},${pick.y}`) ?? 0);
                    if (F <= 0) continue;
                    bonusFood -= F;
                    bonusGold += F;
                    effects.push({ x: tx, y: ty, food: -F, gold: F, knowledge: 0 });
                }
            }

            const eraBeforeKnowledgeFinish = get().era;
            const upgradesForQinEra = get().unlockedKnowledgeUpgrades || [];

            set((prev) => {
                let newLevel = prev.level;
                let newKnowledge = prev.knowledge + tKnowledge + bonusKnowledge;
                const knowledgeUpgradePickQueue: number[] = [];

                while (newLevel < 30) {
                    const required = getKnowledgeRequiredForLevel(newLevel);
                    if (newKnowledge < required) break;
                    newKnowledge -= required;
                    newLevel++;
                    knowledgeUpgradePickQueue.push(newLevel);
                }

                const newEra = getEraFromLevel(newLevel);

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
                                    const inst = createInstance(def);
                                    cleanBoard[bx][by] = inst;
                                    newPlayerSymbols.push(inst);
                                    placed = true;
                                }
                            }
                        }
                        if (!placed) {
                            newPlayerSymbols.push(createInstance(def));
                        }
                    }
                }

                for (const symId of toAdd) {
                    const def = SYMBOLS[symId];
                    if (def) {
                        newPlayerSymbols.push(createInstance(def));
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
                const choices = prev.edictRemovalPending ? [] : generateChoices(newEra, prev.religionUnlocked);

                return {
                    food: prev.food + tFood + bonusFood,
                    gold: prev.gold + tGold + bonusGold,
                    knowledge: newKnowledge,
                    level: newLevel,
                    levelBeforeUpgrade:
                        knowledgeUpgradePickQueue.length > 0
                            ? knowledgeUpgradePickQueue[0] - 1
                            : prev.levelBeforeUpgrade,
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
                    knowledgeUpgradePickQueue,
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
                    upgradesForQinEra.includes(LEADER_KNOWLEDGE_UPGRADES.shihuang.sub) &&
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

            // 결과 확인 시간을 준 후 upgrade_selection 또는 selection으로 전환
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
                    // 레벨업이 있으면 (여러 레벨이면 큐만큼 연속) upgrade_selection 먼저
                    if (finalState.knowledgeUpgradePickQueue.length > 0) {
                        const pickLevel = finalState.knowledgeUpgradePickQueue[0];
                        const upgradeChoices = generateUpgradeChoices(
                            finalState.unlockedKnowledgeUpgrades || [],
                            getEraFromLevel(pickLevel),
                            pickLevel,
                        );
                        set({
                            phase: 'upgrade_selection' as GamePhase,
                            upgradeChoices,
                            knowledgeUpgradeGlobalRerollUsed: false,
                            levelBeforeUpgrade: pickLevel - 1,
                        });
                        return;
                    }
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
        const pickRandomLivingEnemy = (): { x: number; y: number } | null => {
            const enemyPositions: { x: number; y: number }[] = [];
            for (let cx = 0; cx < BOARD_WIDTH; cx++) {
                for (let cy = 0; cy < BOARD_HEIGHT; cy++) {
                    const sym = combatBoard[cx][cy];
                    if (sym?.definition.type === SymbolType.ENEMY && !sym.is_marked_for_destruction) {
                        enemyPositions.push({ x: cx, y: cy });
                    }
                }
            }
            if (enemyPositions.length === 0) return null;
            return enemyPositions[Math.floor(Math.random() * enemyPositions.length)];
        };

        const applyClovisDamage = (pos: { x: number; y: number }) => {
            const target = combatBoard[pos.x][pos.y];
            if (!target || target.is_marked_for_destruction || target.definition.type !== SymbolType.ENEMY) return;
            const maxHP = target.definition.base_hp ?? 0;
            const cur = target.enemy_hp ?? maxHP;
            target.enemy_hp = cur - 1;
            if (target.enemy_hp <= 0) target.is_marked_for_destruction = true;
            // 플로팅 -1
            set((s) => {
                const next = [...(s.combatFloats ?? []), { x: pos.x, y: pos.y, text: '-1', color: '#ef4444' }];
                return { combatFloats: next.length > 80 ? next.slice(next.length - 80) : next };
            });
        };
        const combatEvents: { ax: number; ay: number; tx: number; ty: number }[] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const sym = combatBoard[x][y];
                // 아군 전투 유닛만 공격자: UNIT 타입이고 base_attack 보유
                if (!sym || sym.definition.type !== SymbolType.UNIT || sym.definition.base_attack === undefined) continue;

                if (sym.definition.id === 36) { // 궁수: 보드 전체 사거리
                    for (let tx = 0; tx < BOARD_WIDTH; tx++) {
                        for (let ty = 0; ty < BOARD_HEIGHT; ty++) {
                            const target = combatBoard[tx][ty];
                            if (target?.definition.type === SymbolType.ENEMY) {
                                combatEvents.push({ ax: x, ay: y, tx, ty });
                            }
                        }
                    }
                } else { // 근접: 인접 칸만
                    for (const adj of getAdjacentCoords(x, y)) {
                        const target = combatBoard[adj.x][adj.y];
                        if (target?.definition.type === SymbolType.ENEMY) {
                            combatEvents.push({ ax: x, ay: y, tx: adj.x, ty: adj.y });
                        }
                    }
                }
            }
        }

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
                    const LOOT_SYMBOL_ID = 41;
                    set(prev => {
                        const lootFromCamps: number[] = [];
                        for (let cx = 0; cx < BOARD_WIDTH; cx++) {
                            for (let cy = 0; cy < BOARD_HEIGHT; cy++) {
                                const s = prev.board[cx][cy];
                                if (
                                    s?.is_marked_for_destruction &&
                                    combatDestroyedIds.has(s.instanceId) &&
                                    s.definition.id === 40
                                ) {
                                    lootFromCamps.push(LOOT_SYMBOL_ID);
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

        // 전투 이벤트 순차 처리 (공격 bounce → 반격 bounce → 다음)
        const processCombatEvent = (eventIdx: number) => {
            if (eventIdx >= combatEvents.length) {
                startEffectPhase();
                return;
            }

            const { ax, ay, tx, ty } = combatEvents[eventIdx];
            const board = get().board;
            const attacker = board[ax][ay];
            const target = board[tx][ty];

            // 둘 다 살아있을 때만 전투
            let atkDmg = 0;
            let counterDmg = 0;
            if (attacker && !attacker.is_marked_for_destruction &&
                target && !target.is_marked_for_destruction) {

                atkDmg = attacker.definition.base_attack ?? 0;
                const isAdjacent = Math.abs(ax - tx) <= 1 && Math.abs(ay - ty) <= 1;
                counterDmg = isAdjacent ? (target.definition.base_attack ?? 0) : 0;

                const upgrades = get().unlockedKnowledgeUpgrades || [];

                const getEffectiveMaxHP = (sym: PlayerSymbolInstance) => {
                    let hp = sym.definition.base_hp ?? 0;
                    // 아군 유닛(UNIT 타입)에게만 업그레이드 체력 보너스 적용
                    if (sym.definition.type === SymbolType.UNIT && upgrades.includes(2)) {
                        if (sym.definition.id === 35 || sym.definition.id === 62 || sym.definition.id === 63) hp += 10;
                        if (sym.definition.id === 36) hp += 3;
                    }
                    return hp;
                };

                if (atkDmg > 0) {
                    const maxHP = getEffectiveMaxHP(target);
                    target.enemy_hp = (target.enemy_hp ?? maxHP) - atkDmg;
                    if (target.enemy_hp <= 0) target.is_marked_for_destruction = true;
                }
                if (counterDmg > 0) {
                    const maxHP = getEffectiveMaxHP(attacker);
                    attacker.enemy_hp = (attacker.enemy_hp ?? maxHP) - counterDmg;
                    if (attacker.enemy_hp <= 0) attacker.is_marked_for_destruction = true;
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

            if (atkDmg > 0 && counterDmg > 0) {
                // 양방향: 공격 bounce → 반격 bounce → 다음
                set({ combatAnimation: { ax, ay, tx, ty, atkDmg, counterDmg: 0 } });
                setTimeout(() => {
                    set({ combatAnimation: { ax: tx, ay: ty, tx: ax, ty: ay, atkDmg: counterDmg, counterDmg: 0 } });
                    setTimeout(() => processCombatEvent(eventIdx + 1), stepDelay);
                }, stepDelay);
            } else if (atkDmg > 0) {
                // 공격만
                set({ combatAnimation: { ax, ay, tx, ty, atkDmg, counterDmg: 0 } });
                setTimeout(() => processCombatEvent(eventIdx + 1), stepDelay);
            } else if (counterDmg > 0) {
                // 반격만
                set({ combatAnimation: { ax: tx, ay: ty, tx: ax, ty: ay, atkDmg: counterDmg, counterDmg: 0 } });
                setTimeout(() => processCombatEvent(eventIdx + 1), stepDelay);
            } else {
                processCombatEvent(eventIdx + 1);
            }
        };

        // 클로비스 연출이 있으면 먼저 처리 후 전투 진행
        if (hasClovis) {
            const pos = pickRandomLivingEnemy();
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

        const newSymbols = [...state.playerSymbols, createInstance(def)];
        const q = [...(state.bonusSelectionQueue || [])];
        if (q.length > 0) {
            q.shift();
            const nextType = q[0];
            const nextChoices =
                q.length === 0
                    ? []
                    : nextType === 'terrain'
                      ? generateTerrainOnlyChoices(state.era, state.religionUnlocked)
                      : generateChoices(state.era, state.religionUnlocked);
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
        set((state) => ({ isRelicShopOpen: !state.isRelicShopOpen }));
    },

    refreshRelicShop: (force = false) => {
        if (!force) return; // 수동 새로고침(5G) 제거 — 10턴마다 자동(force: true)만

        const state = get();

        const upgrades = state.unlockedKnowledgeUpgrades || [];
        const hasGoldenTrade = upgrades.includes(LEADER_KNOWLEDGE_UPGRADES.ramesses.main);

        const newChoices = generateRelicChoices();
        const nextHalfRelicId = pickRelicHalfPriceIdForGoldenTrade(newChoices, hasGoldenTrade);

        set({ relicChoices: newChoices, relicHalfPriceRelicId: nextHalfRelicId });
    },

    buyRelic: (relicId: number) => {
        const state = get();
        const relicIndex = state.relicChoices.findIndex(r => r && r.id === relicId);
        if (relicIndex === -1) return;

        const def = state.relicChoices[relicIndex];
        if (!def) return;

        const hasGoldenTrade = (state.unlockedKnowledgeUpgrades || []).includes(LEADER_KNOWLEDGE_UPGRADES.ramesses.main);
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
        if (state.phase !== 'upgrade_selection') return;

        const upgrade = KNOWLEDGE_UPGRADES[upgradeId] || KNOWLEDGE_UPGRADE_CANDIDATES[upgradeId];
        if (!upgrade) return;

        // ID 8: 희생 제의 -> 파괴 선택 모드로 전환
        if (upgradeId === SACRIFICIAL_RITE_UPGRADE_ID) {
            set({
                unlockedKnowledgeUpgrades: [...(state.unlockedKnowledgeUpgrades || []), upgradeId],
                phase: 'destroy_selection',
                pendingDestroySource: SACRIFICIAL_RITE_UPGRADE_ID,
                destroySelectionMaxSymbols: 3,
                knowledgeUpgradePickQueue: (state.knowledgeUpgradePickQueue || []).slice(1),
                upgradeChoices: [],
                knowledgeUpgradeGlobalRerollUsed: false,
                returnPhaseAfterDevKnowledgeUpgrade: null,
            });
            return;
        }

        if (upgradeId === TERRITORIAL_REORG_UPGRADE_ID) {
            set({
                unlockedKnowledgeUpgrades: [...(state.unlockedKnowledgeUpgrades || []), upgradeId],
                phase: 'destroy_selection',
                pendingDestroySource: TERRITORIAL_REORG_UPGRADE_ID,
                destroySelectionMaxSymbols: 3,
                knowledgeUpgradePickQueue: (state.knowledgeUpgradePickQueue || []).slice(1),
                upgradeChoices: [],
                knowledgeUpgradeGlobalRerollUsed: false,
                returnPhaseAfterDevKnowledgeUpgrade: null,
            });
            return;
        }

        const newUnlocked = [...(state.unlockedKnowledgeUpgrades || []), upgradeId];

        // 업그레이드 효과 적용
        let religionUnlocked = state.religionUnlocked;
        if (upgradeId === 4) religionUnlocked = true; // Theology

        let bonusXpDelta = 0;
        if (upgradeId === 1) bonusXpDelta = 2; // Writing System: +2 base Knowledge

        let newBoard = [...state.board.map((row) => [...row])];
        let newPlayerSymbols = [...state.playerSymbols];
        let addedKnowledge = 0;
        let addedGold = 0;

        // 201 Hunting: Destroy 1 Banana(4) for +100 Gold
        if (upgradeId === 201) {
            const idx = newPlayerSymbols.findIndex(s => s.definition.id === 4);
            if (idx !== -1) {
                newPlayerSymbols.splice(idx, 1);
                addedGold += 10;
            }
        }

        // 204 Shipbuilding: All Oasis(11) -> Sea(6)
        if (upgradeId === 204) {
            newPlayerSymbols = newPlayerSymbols.map(s =>
                s.definition.id === 11 ? { ...s, definition: SYMBOLS[6] } : s
            );
        }

        // 205 Shamanism: Destroy 1 Omen(18) for +50 Knowledge
        if (upgradeId === 205) {
            const idx = newPlayerSymbols.findIndex(s => s.definition.id === 18);
            if (idx !== -1) {
                newPlayerSymbols.splice(idx, 1);
                addedKnowledge += 50;
            }
        }

        // 16 Education: Library(25) → University(54)
        if (upgradeId === 16) {
            newPlayerSymbols = newPlayerSymbols.map((s) =>
                s.definition.id === 25 ? { ...s, definition: SYMBOLS[54] } : s
            );
        }

        // newPlayerSymbols에 맞춰 newBoard 갱신
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
        const restQueue = (state.knowledgeUpgradePickQueue || []).slice(1);
        const baseUnlock = {
            unlockedKnowledgeUpgrades: newUnlocked,
            bonusXpPerTurn: state.bonusXpPerTurn + bonusXpDelta,
            religionUnlocked: religionUnlocked,
            board: newBoard,
            playerSymbols: newPlayerSymbols,
            knowledge: state.knowledge + addedKnowledge,
            gold: state.gold + addedGold,
        };

        if (edictAfterUpgrade) {
            set({
                ...baseUnlock,
                upgradeChoices: [],
                knowledgeUpgradePickQueue: restQueue,
                knowledgeUpgradeGlobalRerollUsed: false,
                edictRemovalPending: false,
                phase: 'destroy_selection' as GamePhase,
                pendingDestroySource: EDICT_SYMBOL_ID,
                destroySelectionMaxSymbols: 1,
                returnPhaseAfterDevKnowledgeUpgrade: null,
            });
            return;
        }

        if (state.returnPhaseAfterDevKnowledgeUpgrade != null) {
            const pickLevel = restQueue[0];
            if (restQueue.length > 0) {
                set({
                    ...baseUnlock,
                    upgradeChoices: generateUpgradeChoices(newUnlocked, getEraFromLevel(pickLevel), pickLevel),
                    knowledgeUpgradePickQueue: restQueue,
                    knowledgeUpgradeGlobalRerollUsed: false,
                    levelBeforeUpgrade: pickLevel - 1,
                    phase: 'upgrade_selection' as GamePhase,
                    returnPhaseAfterDevKnowledgeUpgrade: null,
                });
            } else {
                set({
                    ...baseUnlock,
                    upgradeChoices: [],
                    knowledgeUpgradePickQueue: [],
                    knowledgeUpgradeGlobalRerollUsed: false,
                    phase: state.returnPhaseAfterDevKnowledgeUpgrade,
                    returnPhaseAfterDevKnowledgeUpgrade: null,
                    symbolSelectionRelicSourceId: null,
                });
            }
            return;
        }

        if (restQueue.length > 0) {
            const pickLevel = restQueue[0];
            set({
                ...baseUnlock,
                upgradeChoices: generateUpgradeChoices(newUnlocked, getEraFromLevel(pickLevel), pickLevel),
                knowledgeUpgradePickQueue: restQueue,
                knowledgeUpgradeGlobalRerollUsed: false,
                levelBeforeUpgrade: pickLevel - 1,
                phase: 'upgrade_selection' as GamePhase,
                returnPhaseAfterDevKnowledgeUpgrade: null,
            });
            return;
        }

        set({
            ...baseUnlock,
            upgradeChoices: [],
            knowledgeUpgradePickQueue: [],
            knowledgeUpgradeGlobalRerollUsed: false,
            phase: 'selection' as GamePhase,
            returnPhaseAfterDevKnowledgeUpgrade: null,
            symbolSelectionRelicSourceId: null,
            symbolChoices:
                state.symbolChoices.length > 0
                    ? state.symbolChoices
                    : generateChoices(state.era, state.religionUnlocked),
        });
    },

    skipUpgradeSelection: () => {
        const state = get();
        if (state.phase !== 'upgrade_selection') return;
        const edictAfterUpgrade = state.edictRemovalPending;
        const restQueue = (state.knowledgeUpgradePickQueue || []).slice(1);

        if (edictAfterUpgrade) {
            set({
                upgradeChoices: [],
                knowledgeUpgradePickQueue: restQueue,
                knowledgeUpgradeGlobalRerollUsed: false,
                edictRemovalPending: false,
                phase: 'destroy_selection' as GamePhase,
                pendingDestroySource: EDICT_SYMBOL_ID,
                destroySelectionMaxSymbols: 1,
                returnPhaseAfterDevKnowledgeUpgrade: null,
            });
            return;
        }

        if (state.returnPhaseAfterDevKnowledgeUpgrade != null) {
            const pickLevel = restQueue[0];
            if (restQueue.length > 0) {
                set({
                    upgradeChoices: generateUpgradeChoices(
                        state.unlockedKnowledgeUpgrades || [],
                        getEraFromLevel(pickLevel),
                        pickLevel,
                    ),
                    knowledgeUpgradePickQueue: restQueue,
                    knowledgeUpgradeGlobalRerollUsed: false,
                    levelBeforeUpgrade: pickLevel - 1,
                    phase: 'upgrade_selection' as GamePhase,
                    returnPhaseAfterDevKnowledgeUpgrade: null,
                });
            } else {
                set({
                    upgradeChoices: [],
                    knowledgeUpgradePickQueue: [],
                    knowledgeUpgradeGlobalRerollUsed: false,
                    phase: state.returnPhaseAfterDevKnowledgeUpgrade,
                    returnPhaseAfterDevKnowledgeUpgrade: null,
                    symbolSelectionRelicSourceId: null,
                });
            }
            return;
        }

        if (restQueue.length > 0) {
            const pickLevel = restQueue[0];
            set({
                upgradeChoices: generateUpgradeChoices(
                    state.unlockedKnowledgeUpgrades || [],
                    getEraFromLevel(pickLevel),
                    pickLevel,
                ),
                knowledgeUpgradePickQueue: restQueue,
                knowledgeUpgradeGlobalRerollUsed: false,
                levelBeforeUpgrade: pickLevel - 1,
                phase: 'upgrade_selection' as GamePhase,
                returnPhaseAfterDevKnowledgeUpgrade: null,
            });
            return;
        }

        set({
            upgradeChoices: [],
            knowledgeUpgradePickQueue: [],
            knowledgeUpgradeGlobalRerollUsed: false,
            phase: 'selection' as GamePhase,
            returnPhaseAfterDevKnowledgeUpgrade: null,
            symbolSelectionRelicSourceId: null,
            symbolChoices:
                state.symbolChoices.length > 0
                    ? state.symbolChoices
                    : generateChoices(state.era, state.religionUnlocked),
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
                symbolChoices: generateChoices(state.era, state.religionUnlocked),
            });
            return;
        }

        if (state.gold < rerollCost) return;

        set({
            gold: state.gold - rerollCost,
            symbolChoices: generateChoices(state.era, state.religionUnlocked),
            rerollsThisTurn: state.rerollsThisTurn + 1,
        });
    },

    rerollUpgradeCard: (slotIndex: number) => {
        const state = get();
        if (state.phase !== 'upgrade_selection') return;
        if (state.knowledgeUpgradeGlobalRerollUsed) return;
        if (!state.upgradeChoices[slotIndex]) return;

        const pickLevel = state.knowledgeUpgradePickQueue?.[0] ?? state.level;
        const eraForPick = getEraFromLevel(pickLevel);
        const unlocked = state.unlockedKnowledgeUpgrades || [];
        const excludedIds = new Set(state.upgradeChoices.map((u) => u.id));
        const pool = buildKnowledgeUpgradeAlternativesPool(unlocked, eraForPick, pickLevel, excludedIds);
        if (pool.length === 0) return;

        const next = pool[Math.floor(Math.random() * pool.length)];
        set({
            upgradeChoices: state.upgradeChoices.map((u, idx) => (idx === slotIndex ? next : u)),
            knowledgeUpgradeGlobalRerollUsed: true,
        });
    },

    debugRerollKnowledgeUpgradeChoices: () => {
        if (!import.meta.env.DEV) return;
        const state = get();
        if (state.phase !== 'upgrade_selection') return;
        const pickLevel = state.knowledgeUpgradePickQueue?.[0] ?? state.level;
        const choices = generateUpgradeChoices(
            state.unlockedKnowledgeUpgrades || [],
            getEraFromLevel(pickLevel),
            pickLevel,
        );
        set({
            upgradeChoices: choices,
            knowledgeUpgradeGlobalRerollUsed: false,
        });
    },

    confirmDestroySymbols: (instanceIds: string[]) => {
        const state = get();
        if (state.phase !== 'destroy_selection') return;
        const src = state.pendingDestroySource;

        if (src === OBLIVION_FURNACE_PENDING) {
            const relicInstId = state.pendingOblivionFurnaceRelicId;
            if (!relicInstId || instanceIds.length !== 1) return;
            const newSymbols = state.playerSymbols.filter((s) => !instanceIds.includes(s.instanceId));
            useRelicStore.getState().removeRelic(relicInstId);
            set({
                playerSymbols: newSymbols,
                phase: phaseAfterTurnFlowComplete(state.level),
                pendingDestroySource: null,
                pendingOblivionFurnaceRelicId: null,
                destroySelectionMaxSymbols: 3,
            });
            return;
        }

        const newSymbols = state.playerSymbols.filter((s) => !instanceIds.includes(s.instanceId));
        const goldAdd = instanceIds.length * 10;

        if (src === EDICT_SYMBOL_ID) {
            const terr = state.territorialAfterEdictPending;
            const q = state.knowledgeUpgradePickQueue || [];
            if (q.length > 0) {
                const pickLevel = q[0];
                set({
                    playerSymbols: newSymbols,
                    phase: 'upgrade_selection',
                    pendingDestroySource: null,
                    destroySelectionMaxSymbols: 3,
                    territorialAfterEdictPending: false,
                    upgradeChoices: generateUpgradeChoices(
                        state.unlockedKnowledgeUpgrades || [],
                        getEraFromLevel(pickLevel),
                        pickLevel,
                    ),
                    levelBeforeUpgrade: pickLevel - 1,
                    knowledgeUpgradeGlobalRerollUsed: false,
                    knowledgeUpgradePickQueue: q,
                });
                return;
            }
            set({
                playerSymbols: newSymbols,
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                territorialAfterEdictPending: false,
                symbolSelectionRelicSourceId: null,
                symbolChoices: terr
                    ? generateTerrainOnlyChoices(state.era, state.religionUnlocked)
                    : generateChoices(state.era, state.religionUnlocked),
                ...(terr ? { bonusSelectionQueue: ['terrain', 'any', 'any', 'any'] } : {}),
            });
            return;
        }

        if (src === TERRITORIAL_REORG_UPGRADE_ID) {
            const edictChain = get().edictRemovalPending;
            if (edictChain) {
                set({
                    playerSymbols: newSymbols,
                    gold: state.gold + goldAdd,
                    edictRemovalPending: false,
                    phase: 'destroy_selection',
                    pendingDestroySource: EDICT_SYMBOL_ID,
                    destroySelectionMaxSymbols: 1,
                    territorialAfterEdictPending: true,
                    bonusSelectionQueue: ['terrain', 'any', 'any', 'any'],
                });
                return;
            }
            const qUp = state.knowledgeUpgradePickQueue || [];
            if (qUp.length > 0) {
                const pickLevel = qUp[0];
                set({
                    playerSymbols: newSymbols,
                    gold: state.gold + goldAdd,
                    phase: 'upgrade_selection',
                    pendingDestroySource: null,
                    destroySelectionMaxSymbols: 3,
                    upgradeChoices: generateUpgradeChoices(
                        state.unlockedKnowledgeUpgrades || [],
                        getEraFromLevel(pickLevel),
                        pickLevel,
                    ),
                    levelBeforeUpgrade: pickLevel - 1,
                    knowledgeUpgradeGlobalRerollUsed: false,
                    knowledgeUpgradePickQueue: qUp,
                    bonusSelectionQueue: ['terrain', 'any', 'any', 'any'],
                });
                return;
            }
            set({
                playerSymbols: newSymbols,
                gold: state.gold + goldAdd,
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                symbolSelectionRelicSourceId: null,
                symbolChoices: generateTerrainOnlyChoices(state.era, state.religionUnlocked),
                bonusSelectionQueue: ['terrain', 'any', 'any', 'any'],
            });
            return;
        }

        const qSac = state.knowledgeUpgradePickQueue || [];
        if (qSac.length > 0 && src === SACRIFICIAL_RITE_UPGRADE_ID) {
            const pickLevel = qSac[0];
            set({
                playerSymbols: newSymbols,
                gold: state.gold + goldAdd,
                phase: 'upgrade_selection',
                upgradeChoices: generateUpgradeChoices(
                    state.unlockedKnowledgeUpgrades || [],
                    getEraFromLevel(pickLevel),
                    pickLevel,
                ),
                levelBeforeUpgrade: pickLevel - 1,
                knowledgeUpgradeGlobalRerollUsed: false,
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                edictRemovalPending: false,
                knowledgeUpgradePickQueue: qSac,
            });
            return;
        }

        const edictChain = get().edictRemovalPending;
        set({
            playerSymbols: newSymbols,
            gold: state.gold + goldAdd,
            phase: edictChain ? 'destroy_selection' : phaseAfterTurnFlowComplete(state.level),
            pendingDestroySource: edictChain ? EDICT_SYMBOL_ID : null,
            destroySelectionMaxSymbols: edictChain ? 1 : 3,
            edictRemovalPending: false,
        });
    },

    finishDestroySelection: () => {
        if (get().phase !== 'destroy_selection') return;
        const src = get().pendingDestroySource;
        if (src === OBLIVION_FURNACE_PENDING) {
            set({
                phase: phaseAfterTurnFlowComplete(get().level),
                pendingDestroySource: null,
                pendingOblivionFurnaceRelicId: null,
                destroySelectionMaxSymbols: 3,
            });
            return;
        }
        if (src === EDICT_SYMBOL_ID) {
            const st = get();
            const terr = st.territorialAfterEdictPending;
            const q = st.knowledgeUpgradePickQueue || [];
            if (q.length > 0) {
                const pickLevel = q[0];
                set({
                    phase: 'upgrade_selection',
                    pendingDestroySource: null,
                    destroySelectionMaxSymbols: 3,
                    territorialAfterEdictPending: false,
                    upgradeChoices: generateUpgradeChoices(
                        st.unlockedKnowledgeUpgrades || [],
                        getEraFromLevel(pickLevel),
                        pickLevel,
                    ),
                    levelBeforeUpgrade: pickLevel - 1,
                    knowledgeUpgradeGlobalRerollUsed: false,
                    knowledgeUpgradePickQueue: q,
                });
                return;
            }
            set({
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                territorialAfterEdictPending: false,
                symbolSelectionRelicSourceId: null,
                symbolChoices: terr
                    ? generateTerrainOnlyChoices(st.era, st.religionUnlocked)
                    : generateChoices(st.era, st.religionUnlocked),
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

    activateClickableRelic: (instanceId: string) => {
        const state = get();
        if (state.phase !== 'idle') return;
        const relic = useRelicStore.getState().relics.find((r) => r.instanceId === instanceId);
        if (!relic) return;
        const defId = relic.definition.id;

        if (defId === RELIC_ID.OBLIVION_FURNACE) {
            if (state.playerSymbols.length === 0) return;
            set({
                phase: 'destroy_selection',
                pendingDestroySource: OBLIVION_FURNACE_PENDING,
                pendingOblivionFurnaceRelicId: instanceId,
                destroySelectionMaxSymbols: 1,
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
            const choices = generateChoices(state.era, state.religionUnlocked);
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
            const choices = generateTerrainOnlyChoices(state.era, state.religionUnlocked);
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
            level: 1,
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

            upgradeChoices: [],
            knowledgeUpgradePickQueue: [],
            isRelicShopOpen: false,
            rerollsThisTurn: 0,
            knowledgeUpgradeGlobalRerollUsed: false,

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
            levelBeforeUpgrade: 1,
        });
    },

    startGameWithDraft: (symbolIds: number[], leaderId: import('../data/leaders').LeaderId, stageId: number) => {
        if (!isLeaderPlayable(leaderId)) return;
        const resolvedStage = stageId >= 1 && stageId <= 6 ? stageId : 1;
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

        const leaderKnowledgeUpgrades =
            leaderId === 'ramesses'
                ? [LEADER_KNOWLEDGE_UPGRADES.ramesses.main, LEADER_KNOWLEDGE_UPGRADES.ramesses.sub]
                : [LEADER_KNOWLEDGE_UPGRADES.shihuang.main, LEADER_KNOWLEDGE_UPGRADES.shihuang.sub];

        const initialRelicChoices = generateRelicChoices();
        const initialHalfPriceRelicId = pickRelicHalfPriceIdForGoldenTrade(
            initialRelicChoices,
            leaderId === 'ramesses',
        );

        const playerSymbols = symbolIds
            .map((id) => SYMBOLS[id])
            .filter((def): def is SymbolDefinition => def != null)
            .map(createInstance);

        const board = createEmptyBoard();

        set({
            food: startingFood,
            gold: startingGold,
            knowledge: 0,
            era: 1,
            level: 1,
            turn: 0,
            stageId: resolvedStage,
            board,
            playerSymbols,
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
            prevBoard: createEmptyBoard(),
            combatAnimation: null,
            combatShaking: false,
            religionUnlocked: false,
            unlockedKnowledgeUpgrades: leaderKnowledgeUpgrades,
            bonusXpPerTurn: 0,
            upgradeChoices: [],
            knowledgeUpgradePickQueue: [],
            isRelicShopOpen: false,
            rerollsThisTurn: 0,
            knowledgeUpgradeGlobalRerollUsed: false,
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
            levelBeforeUpgrade: 1,
            knowledgeUpgradeFloats: [],
        });
    },

    devAddSymbol: (symbolId: number) => {
        const def = SYMBOLS[symbolId] || SYMBOL_CANDIDATES[symbolId];
        if (!def) return;
        set((prev) => ({
            playerSymbols: [...prev.playerSymbols, createInstance(def)],
        }));
    },

    devRemoveSymbol: (instanceId: string) => {
        set((prev) => ({
            playerSymbols: prev.playerSymbols.filter(s => s.instanceId !== instanceId),
        }));
    },

    devSetStat: (stat: 'food' | 'gold' | 'knowledge' | 'level', value: number) => {
        if (stat === 'level') {
            const L = Math.max(1, Math.min(30, Math.round(value)));
            set({ level: L, era: getEraFromLevel(L) });
            return;
        }
        set({ [stat]: Math.max(0, value) });
    },

    devForceScreen: (screen: 'symbol' | 'upgrade') => {
        const state = get();
        if (screen === 'symbol') {
            const choices = generateChoices(state.era, state.religionUnlocked);
            set({ phase: 'selection', symbolChoices: choices, symbolSelectionRelicSourceId: null });
        } else if (screen === 'upgrade') {
            const L = state.level;
            const choices = generateUpgradeChoices(
                state.unlockedKnowledgeUpgrades || [],
                getEraFromLevel(L),
                L,
            );
            const returnPhase: GamePhase =
                state.phase === 'upgrade_selection' ? 'idle' : state.phase;
            set({
                phase: 'upgrade_selection',
                upgradeChoices: choices,
                knowledgeUpgradePickQueue: [L],
                levelBeforeUpgrade: L - 1,
                knowledgeUpgradeGlobalRerollUsed: false,
                returnPhaseAfterDevKnowledgeUpgrade: returnPhase,
            });
        }
    },
}));
