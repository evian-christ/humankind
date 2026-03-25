import { create } from 'zustand';
import { SYMBOLS, SymbolType, type SymbolDefinition, RELIGION_DOCTRINE_IDS, EXCLUDED_FROM_BASE_POOL, TAX_SYMBOL_ID, EDICT_SYMBOL_ID } from '../data/symbolDefinitions';
import { SYMBOL_CANDIDATES } from '../data/symbolCandidates';
import { processSingleSymbolEffects, type ActiveRelicEffects } from '../logic/symbolEffects';
import { useSettingsStore, EFFECT_SPEED_DELAY, COMBAT_BOUNCE_DURATION } from './settingsStore';
import { RELIC_LIST, type RelicDefinition } from '../data/relicDefinitions';
import { useRelicStore } from './relicStore';
import type { PlayerSymbolInstance } from '../types';
import { t } from '../../i18n';

export { type PlayerSymbolInstance } from '../types';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;
export const REROLL_COST = 5;

/**
 * 지도자 스킬을 "지식 업그레이드"로 치환한 ID들.
 * - 이들은 업그레이드 선택지로 등장하지 않도록 `KNOWLEDGE_UPGRADES.type`으로 숨김 처리함.
 */
const LEADER_KNOWLEDGE_UPGRADES = {
    ramesses: { main: 11, sub: 12 },
    pericles: { main: 13, sub: 14 },
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
    CLOVIS_SPEAR: 1,          // 클로비스 투창촉: 적 체력 -1
    LYDIA_COIN: 2,            // 리디아 호박금 주화: 리롤 50% 할인, 턴당 최대 3회
    UR_WHEEL: 3,              // 우르 전차 바퀴: 매 턴 최저 식량 심볼 파괴 + G+50, 5턴 후 소멸
    JOMON_POTTERY: 4,         // 조몬 토기 조각: 토기 인접 파괴
    EGYPT_SAW: 5,             // 이집트 구리 톱: 채석장 빈 슬롯 G+10
    BABYLON_MAP: 6,           // 바빌로니아 세계 지도: 매 턴 F+10, 보드 20번 심볼 -이면 영구 +10
    GOANNA_BANANA: 7,         // 쿠크 늪지대 바나나 화석: 열대 과수원 인접 바나나 F+20
    TEN_COMMANDMENTS: 8,      // 십계명 석판: 돌→석판
    NILE_SILT: 9,             // 나일 강 흑니: 5턴 동안 식량 2배
    GOBEKLI_PILLAR: 10,       // 괴베클리 테페 신전 석주: 빈 슬롯당 F+5
    CATALHOYUK: 11,           // 차탈회위크 여신상: 심볼 15개↑ 일 때 F+80
    SCARAB: 12,               // 쇠똥구리 부적: 심볼 파괴 시 G+30
} as const;


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

type GamePhase = 'idle' | 'spinning' | 'showing_new_threats' | 'processing' | 'upgrade_selection' | 'selection' | 'destroy_selection' | 'draft_selection' | 'game_over' | 'victory';
/** 10턴마다 식량 납부 비용 (식량 1단위) */
export const calculateFoodCost = (turn: number): number => {
    const paymentCycle = Math.floor(turn / 10);
    return 100 + (paymentCycle - 1) * 50;
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
    board: (PlayerSymbolInstance | null)[][];
    playerSymbols: PlayerSymbolInstance[];
    phase: GamePhase;
    symbolChoices: SymbolDefinition[];
    /** 유물 상점에 표시되는 유물 목록 (3개) */
    relicChoices: (RelicDefinition | null)[];
    /** 람세스 효과: 이번 상점 새로고침에서 '반값'으로 표시된 유물 ID */
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
    /** 종교 심볼이 선택 풀에 해금되었는지 */
    religionUnlocked: boolean;
    /** 플레이어가 획득한 지식 업그레이드 ID 목록 */
    unlockedKnowledgeUpgrades: number[];
    /** 매 턴 영구 지식 보너스 */
    bonusXpPerTurn: number;
    /** 중세 시대 등 진입 시 선택 대기 중 (추후 레벨업 보상으로 통합 가능) */

    /** 지식 업그레이드 선택지 */
    upgradeChoices: import('../data/knowledgeUpgrades').KnowledgeUpgrade[];
    /** 레벨업 선택 대기 중 */
    pendingLevelUpSelection: boolean;
    /** 레벨업 직전의 레벨 (업그레이드 화면에서 "Lv.X → Lv.Y" 표시용) */
    levelBeforeUpgrade: number;
    /** 유물 상점 오버레이 열림 여부 */
    isRelicShopOpen: boolean;
    /** 이번 선택 페이즈에서 리롤한 횟수 (리디아 유물: 최대 3회) */
    rerollsThisTurn: number;

    /** 업그레이드 선택에서 (페리클레스) 카드당 1회 리롤 사용 여부 */
    knowledgeUpgradeRerollUsed: boolean[];

    barbarianSymbolThreat: number;
    barbarianCampThreat: number;
    naturalDisasterThreat: number;
    /** 첫 배치된 야만인/재해 심볼에 플로팅 텍스트 표시 후 효과 iteration 진행용 */
    pendingNewThreatFloats: { x: number; y: number; label: string }[];

    /** destroy_selection 진입 시 출처 (8 희생 / 22 영토 / 69 칙령) */
    pendingDestroySource: typeof SACRIFICIAL_RITE_UPGRADE_ID | typeof TERRITORIAL_REORG_UPGRADE_ID | typeof EDICT_SYMBOL_ID | null;
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

    initializeGame: () => void;
    /** 프리게임: 드래프트 선택 진입 (첫 선택지 표시) */
    enterDraftSelection: () => void;
    /** 프리게임: 다음 드래프트 선택지 3개 갱신 */
    setSymbolChoicesForDraft: () => void;
    /** 프리게임: 드래프트 결과 + 리더로 본게임 시작 */
    startGameWithDraft: (symbolIds: number[], leaderId: import('../data/leaders').LeaderId) => void;
    devAddSymbol: (symbolId: number) => void;
    devRemoveSymbol: (instanceId: string) => void;
    devSetStat: (stat: 'food' | 'gold' | 'knowledge', value: number) => void;
    devForceScreen: (screen: 'symbol' | 'relic' | 'upgrade') => void;
    confirmDestroySymbols: (instanceIds: string[]) => void;
    finishDestroySelection: () => void;

    /** F12 로그 오버레이용 */
    appendEventLog: (entry: Omit<GameEventLogEntry, 'id' | 'ts'> & { ts?: number; id?: string }) => void;
    clearEventLog: () => void;
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

import {
    KNOWLEDGE_UPGRADES,
    FEUDALISM_UPGRADE_ID,
    SACRIFICIAL_RITE_UPGRADE_ID,
    TERRITORIAL_REORG_UPGRADE_ID,
    type KnowledgeUpgrade,
    type KnowledgeUpgradeType,
} from '../data/knowledgeUpgrades';
import { KNOWLEDGE_UPGRADE_CANDIDATES } from '../data/knowledgeUpgradeCandidates';
import { getLeaderStartingRelics, LEADERS } from '../data/leaders';

/** 현재 시대에 맞는 지식 업그레이드 선택지 3개 생성 (이미 업그레이드된 것 제외) */
const generateUpgradeChoices = (unlocked: number[], currentEra: number): KnowledgeUpgrade[] => {
    // KNOWLEDGE_UPGRADES만 사용 — 후보(CANDIDATES)는 표시하지 않음
    const upgradeEraByType = (type: KnowledgeUpgradeType): number | null => {
        if (typeof type !== 'number') return null; // 지도자 전용 타입: 선택지로 등장하지 않게
        switch (type) {
            case SymbolType.ANCIENT: return 1;
            case SymbolType.MEDIEVAL: return 2;
            case SymbolType.MODERN: return 3;
            default: return null;
        }
    };

    const level = useGameStore.getState().level;
    const medievalUnlocked = unlocked.includes(FEUDALISM_UPGRADE_ID) || currentEra >= 2;

    const pool = Object.values(KNOWLEDGE_UPGRADES).filter((u) => {
        if (unlocked.includes(u.id)) return false;
        const upgradeEra = upgradeEraByType(u.type);
        if (upgradeEra == null) return false;

        if (u.id === FEUDALISM_UPGRADE_ID) {
            return level >= 10;
        }
        if (u.type === SymbolType.MEDIEVAL) {
            return medievalUnlocked;
        }
        return upgradeEra <= currentEra;
    });
    const shuffled = shuffle(pool);
    return shuffled.slice(0, 3);
};

/** 현재 보유 유물에서 ActiveRelicEffects 플래그를 조합 */
const buildActiveRelicEffects = (): ActiveRelicEffects => {
    const relics = useRelicStore.getState().relics;
    const hasRelic = (id: number) => relics.some(r => r.definition.id === id);
    const getRelicInstance = (id: number) => relics.find(r => r.definition.id === id);

    // ID 9: 나일 강 흑니 — effect_counter < 5 인 동안 활성
    const nileRelic = getRelicInstance(RELIC_ID.NILE_SILT);
    const nileActive = nileRelic ? nileRelic.effect_counter < 5 : false;

    const upgrades = useGameStore.getState().unlockedKnowledgeUpgrades || [];

    return {
        relicCount: relics.length,
        potteryDestroyAdjacent: hasRelic(RELIC_ID.JOMON_POTTERY),
        quarryEmptyGold: hasRelic(RELIC_ID.EGYPT_SAW),
        bananaFossilBonus: hasRelic(RELIC_ID.GOANNA_BANANA),
        burnOfferingEmptyPenalty: false,
        jerichoMonumentBonus: false,
        gobekliAnimalJackpot: false,
        gilgameshReligionNoPenalty: false,
        fishBoneHookGold: false,
        nileFloodDoubleFood: nileActive,
        horsemansihpPastureBonus: upgrades.includes(7),
    };
};

export const useGameStore = create<GameState>((set, get) => ({
    food: 0,
    gold: 0,
    knowledge: 0,
    level: 1,
    era: 1,
    turn: 0,
    board: (() => { const s = createStartingBoard(); return s.board; })(),
    playerSymbols: (() => { const s = createStartingBoard(); return s.playerSymbols; })(),
    phase: 'idle' as GamePhase,
    symbolChoices: [],
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
    religionUnlocked: false,
    unlockedKnowledgeUpgrades: [],
    bonusXpPerTurn: 0,

    upgradeChoices: [],
    pendingLevelUpSelection: false,
    levelBeforeUpgrade: 1,
    isRelicShopOpen: false,
    rerollsThisTurn: 0,
    knowledgeUpgradeRerollUsed: [],

    barbarianSymbolThreat: 0,
    barbarianCampThreat: 0,
    naturalDisasterThreat: 0,
    pendingNewThreatFloats: [],
    pendingDestroySource: null,
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
        let combatAndEnemy = shuffle(newPlayerSymbols
            .filter(s => s.definition.type === SymbolType.ENEMY || s.definition.type === SymbolType.UNIT));
        // ID 1: 클로비스 투창촉 - 야만인(적) 등장 시 HP -1
        if (useRelicStore.getState().relics.some(r => r.definition.id === RELIC_ID.CLOVIS_SPEAR)) {
            combatAndEnemy = combatAndEnemy.map(sym => {
                if (sym.definition.type === SymbolType.ENEMY) {
                    return { ...sym, enemy_hp: Math.max(1, (sym.enemy_hp ?? sym.definition.base_hp ?? 1) - 1) };
                }
                return sym;
            });
        }
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
        const upgrades = state.unlockedKnowledgeUpgrades || [];
        const baseKnowledge =
            (upgrades.includes(1) ? 4 : 2) +
            (upgrades.includes(10) ? 2 : 0) +
            (upgrades.includes(16) ? 2 : 0) +
            (upgrades.includes(24) ? 5 : 0);
        const leaderBonusKnowledge =
            (upgrades.includes(LEADER_KNOWLEDGE_UPGRADES.ramesses.sub)
                ? useRelicStore.getState().relics.length
                : 0) +
            (upgrades.includes(LEADER_KNOWLEDGE_UPGRADES.pericles.main)
                ? (() => {
                    const distinctSymbolTypes = new Set(state.playerSymbols.map(s => s.definition.type));
                    return Math.floor(distinctSymbolTypes.size / 5) * 2;
                })()
                : 0);
        const baseGold =
            (upgrades.includes(6) ? 2 : 0) + (upgrades.includes(10) ? 2 : 0) + (upgrades.includes(24) ? 5 : 0);

        let startFood = (upgrades.includes(10) ? 5 : 0) + (upgrades.includes(24) ? 10 : 0);
        let startGold = baseGold;

        // 206 Weaving (+10 Gold if you have Farm or Pasture)
        if (upgrades.includes(206)) {
            let hasTextileSource = false;
            for (let bx = 0; bx < BOARD_WIDTH; bx++) {
                for (let by = 0; by < BOARD_HEIGHT; by++) {
                    const sym = state.board[bx][by];
                    if (sym?.definition.id === 14 || sym?.definition.id === 9) {
                        hasTextileSource = true;
                        break;
                    }
                }
                if (hasTextileSource) break;
            }
            if (hasTextileSource) startGold += 10;
        }

        set({
            phase: 'processing',
            effectPhase3ReachedThisRun: false,
            runningTotals: { food: startFood, gold: startGold, knowledge: baseKnowledge + get().bonusXpPerTurn + leaderBonusKnowledge }
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'processing_start',
            meta: { base: { food: startFood, gold: startGold, knowledge: baseKnowledge + get().bonusXpPerTurn + leaderBonusKnowledge } }
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
        const upgradesFinish = get().unlockedKnowledgeUpgrades || [];
        const baseKnowledgeFinish =
            (upgradesFinish.includes(1) ? 4 : 2) +
            (upgradesFinish.includes(10) ? 2 : 0);
        const baseGoldFinish = startGold;
        let totalKnowledge = baseKnowledgeFinish + get().bonusXpPerTurn + leaderBonusKnowledge;
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

            // effectPhase 진행 중 심볼 인스턴스의 플래그(campfire_double_food 등)가 변경될 수 있으므로,
            // 여기서는 "현재 보드 스냅샷"을 기준으로 계산한다.
            const currentBoardRef = get().board;

            // campfire_double_food는 '이번 스핀 인접 심볼 식량 2배' 버프이므로,
            // 종교 계산이 끝난 뒤에 동일한 조건(result.food > 0일 때만 플래그 소비)을 맞춰 반영한다.
            const campfireDoubleFlags = new Map<string, boolean>();
            const doctrineFood = new Map<string, number>();
            const doctrineGold = new Map<string, number>();

            for (const s of religionSlotsToRecalculate) {
                const key = getKey(s.x, s.y);
                const sym = currentBoardRef[s.x][s.y];
                campfireDoubleFlags.set(key, !!sym?.campfire_double_food);
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

                    // 유물 ID 9: 나일 강 비옥한 흑니 - 활성 중 식량 2배
                    if (relicEffects.nileFloodDoubleFood && food > 0) {
                        food *= 2;
                    }

                    // campfire 폭발 버프는 "이번 스핀 식량 2배"이며,
                    // symbolEffects 결과가 양수일 때만 적용된다(기존 engine 로직 준수).
                    const campfireDouble = campfireDoubleFlags.get(key) ?? false;
                    if (campfireDouble && food > 0) {
                        food *= 2;
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

                const campfireDouble = campfireDoubleFlags.get(key) ?? false;
                // 기존 engine과 동일하게 '실제로 2배가 적용된 경우에만' 플래그를 소비한다.
                if (campfireDouble && food > 0) {
                    sym.campfire_double_food = false;
                }
            }

            // 캐시에는 인접 심볼 계산용 값만 필요하므로, doctrine는 여기서 추가로 채우지 않는다.
        };

        const processSlot = (slotIdx: number) => {
            if (slotIdx >= slotOrder.length) {
                // effectPhase 종료 직전에 종교 심볼(31/32)을 최종 계산한다.
                computeReligionEffects();

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

            // ── Campfire 폭발 버프: 이번 턴 식량 2배 ──
            if (symbol.campfire_double_food && result.food > 0) {
                result.food *= 2;
                symbol.campfire_double_food = false; // 플래그 소비
            }

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


            // ── Pottery (20): 조몬 토기 조각 유물 — 파괴 전파 패스 ──
            // processSlot에서 이미 파괴 표시된 심볼은 스킵되므로,
            // 여기서 파괴 예정 토기 → 인접 토기 전파를 한 번 더 돌린다.
            if (hasRelic(RELIC_ID.JOMON_POTTERY)) {
                let changed = true;
                while (changed) {
                    changed = false;
                    for (let x = 0; x < BOARD_WIDTH; x++) {
                        for (let y = 0; y < BOARD_HEIGHT; y++) {
                            const s = currentBoard[x][y];
                            if (!s || s.definition.id !== 20 || !s.is_marked_for_destruction) continue;
                            // 파괴 예정인 토기 → 인접 토기 파괴 표시
                            for (let dx = -1; dx <= 1; dx++) {
                                for (let dy = -1; dy <= 1; dy++) {
                                    if (dx === 0 && dy === 0) continue;
                                    const nx = x + dx, ny = y + dy;
                                    if (nx < 0 || nx >= BOARD_WIDTH || ny < 0 || ny >= BOARD_HEIGHT) continue;
                                    const nb = currentBoard[nx][ny];
                                    if (nb && nb.definition.id === 20 && !nb.is_marked_for_destruction) {
                                        nb.is_marked_for_destruction = true;
                                        changed = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ── Barbarian Camp (40) 파괴 시 전리품(41) 추가 ──
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const s = currentBoard[x][y];
                    if (s && s.definition.id === 40 && s.is_marked_for_destruction) {
                        toAdd.push(41);
                    }
                }
            }

            // ── Pottery (20): 파괴 시 저장된 식량 방출 ──
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const s = currentBoard[x][y];
                    if (s && s.definition.id === 20 && s.is_marked_for_destruction) {
                        bonusFood += s.effect_counter || 0;
                    }
                }
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

            // ── 유물 ID 3: 우르의 전차 바퀴 ──
            // 매 턴 식량 생산량 가장 낮은 심볼 파괴 + G+50. 5턴 후 유물 소멸.
            const urWheelRelic = getRelicInst(RELIC_ID.UR_WHEEL);
            if (urWheelRelic) {
                // 식량 기준 최저 심볼(파괴 안 된 것 중) 찾기
                let minFood = Infinity;
                let minSymbol: { x: number; y: number } | null = null;
                for (let x = 0; x < BOARD_WIDTH; x++) {
                    for (let y = 0; y < BOARD_HEIGHT; y++) {
                        const s = currentBoard[x][y];
                        if (!s || s.is_marked_for_destruction) continue;
                        const baseFood = (() => {
                            switch (s.definition.id) {
                                case 1: return 2; case 2: return 2; case 3: return 1;
                                case 4: return 2; case 5: return 0; case 6: return 0;
                                case 7: return 0; case 9: return 2; case 13: return 1;
                                case 14: return 1; case 19: return 1; case 22: return 2;
                                case 23: return 1;
                                default: return 0;
                            }
                        })();
                        if (baseFood < minFood) { minFood = baseFood; minSymbol = { x, y }; }
                    }
                }
                if (minSymbol) {
                    const sym = currentBoard[minSymbol.x][minSymbol.y];
                    if (sym) sym.is_marked_for_destruction = true;
                    bonusGold += 5;
                    effects.push({ x: minSymbol.x, y: minSymbol.y, food: 0, gold: 5, knowledge: 0 });
                }
                // 5턴 후 유물 소멸
                useRelicStore.getState().incrementRelicCounter(urWheelRelic.instanceId);
                if (urWheelRelic.effect_counter + 1 >= 5) {
                    useRelicStore.getState().removeRelic(urWheelRelic.instanceId);
                }
            }

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
                effects.push({ x: 0, y: 0, food: baseBonus, gold: 0, knowledge: 0 });
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

            // ── 유물 ID 9: 나일 강 비옥한 흑니 ──
            // 활성 5턴 후 소멸 (카운터 증가)
            const nileRelic = getRelicInst(RELIC_ID.NILE_SILT);
            if (nileRelic && nileRelic.effect_counter < 5) {
                useRelicStore.getState().incrementRelicCounter(nileRelic.instanceId);
                if (nileRelic.effect_counter + 1 >= 5) {
                    useRelicStore.getState().removeRelic(nileRelic.instanceId);
                }
            }

            // ── 유물 ID 10: 괴베클리 테페 신전 석주 — 빈 슬롯당 F+5 ──
            if (hasRelic(RELIC_ID.GOBEKLI_PILLAR)) {
                let emptySlots = 0;
                for (let x = 0; x < BOARD_WIDTH; x++)
                    for (let y = 0; y < BOARD_HEIGHT; y++)
                        if (!currentBoard[x][y]) emptySlots++;
                const pillarFood = emptySlots * 0.5;
                if (pillarFood > 0) {
                    bonusFood += pillarFood;
                    effects.push({ x: 0, y: 0, food: pillarFood, gold: 0, knowledge: 0 });
                }
            }

            // ── 유물 ID 16: 차탈회위크 여신상 — 보드 심볼 15개 이상 시 F+80 ──
            if (hasRelic(RELIC_ID.CATALHOYUK)) {
                let symbolCount = 0;
                for (let x = 0; x < BOARD_WIDTH; x++)
                    for (let y = 0; y < BOARD_HEIGHT; y++)
                        if (currentBoard[x][y]) symbolCount++;
                if (symbolCount >= 15) {
                    bonusFood += 8;
                    effects.push({ x: 0, y: 0, food: 8, gold: 0, knowledge: 0 });
                }
            }

            // ── 유물 ID 18: 고대 이집트 쇠똥구리 부적 — 심볼 파괴 시 G+30 ──
            if (destroyedCount > 0 && hasRelic(RELIC_ID.SCARAB)) {
                const scarabGold = destroyedCount * 3;
                bonusGold += scarabGold;
                effects.push({ x: 0, y: 0, food: 0, gold: scarabGold, knowledge: 0 });
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

            set((prev) => {
                let newLevel = prev.level;
                let newKnowledge = prev.knowledge + tKnowledge + bonusKnowledge;
                let pendingLevelUp = false;

                while (newLevel < 30) {
                    const required = getKnowledgeRequiredForLevel(newLevel);
                    if (newKnowledge < required) break;
                    newKnowledge -= required;
                    newLevel++;
                    pendingLevelUp = true;
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
                    levelBeforeUpgrade: pendingLevelUp ? prev.level : prev.levelBeforeUpgrade,
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
                    pendingLevelUpSelection: pendingLevelUp,
                };
            });

            // 결과 확인 시간을 준 후 upgrade_selection 또는 selection으로 전환
            setTimeout(() => {
                const finalState = get();
                if (finalState.phase === 'processing') {
                    // 식량 납부 및 유물 상점 자동 갱신 (10턴마다)
                    if (finalState.turn > 0 && finalState.turn % 10 === 0) {
                        const cost = calculateFoodCost(finalState.turn);
                        if (finalState.food < cost) {
                            set({ phase: 'game_over' as GamePhase });
                            return;
                        }
                        set((s) => ({
                            food: s.food - cost,
                        }));
                        get().refreshRelicShop(true); // Auto refresh shop inventory every 10 turns
                    }
                    // 레벨업이 있으면 upgrade_selection 먼저
                    if (finalState.pendingLevelUpSelection) {
                        const upgradeChoices = generateUpgradeChoices(finalState.unlockedKnowledgeUpgrades || [], finalState.era);
                        set({
                            phase: 'upgrade_selection' as GamePhase,
                            upgradeChoices,
                            knowledgeUpgradeRerollUsed: new Array(upgradeChoices.length).fill(false),
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
                    set({ phase: 'selection' as GamePhase });
                }
            }, 600);
        };

        // ── 전투 페이즈: UNIT(아군) ↔ ENEMY(적) 인접 쌍을 하나하나 순차 처리 ─────────
        const combatBoard = get().board;
        const combatEvents: { ax: number; ay: number; tx: number; ty: number }[] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const sym = combatBoard[x][y];
                // 아군 전투 유닛만 공격자: UNIT 타입이고 base_attack 보유
                if (!sym || sym.definition.type !== SymbolType.UNIT || sym.definition.base_attack === undefined) continue;

                if (sym.definition.tags?.includes('ranged')) { // 궁수: 보드 전체 사거리
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
                    set(prev => ({
                        board: prev.board.map(col => col.map(s => s?.is_marked_for_destruction ? null : s)),
                        playerSymbols: prev.playerSymbols.filter(s => !combatDestroyedIds.has(s.instanceId)),
                        combatShaking: false,
                    }));
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

        processCombatEvent(0);
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
                phase: q.length > 0 ? 'selection' : 'idle',
            });
            return;
        }

        set({
            playerSymbols: newSymbols,
            phase: 'idle',
            symbolChoices: [],
        });
    },

    skipSelection: () => {
        const state = get();
        if (state.phase !== 'selection') return;

        if ((state.bonusSelectionQueue?.length ?? 0) > 0) {
            set({ phase: 'idle', symbolChoices: [], bonusSelectionQueue: [] });
            return;
        }
        set({ phase: 'idle', symbolChoices: [] });
    },

    toggleRelicShop: () => {
        set((state) => ({ isRelicShopOpen: !state.isRelicShopOpen }));
    },

    refreshRelicShop: (force = false) => {
        const state = get();
        if (!force && state.gold < 5) return; // 골드 5 소모 (상점 새로고침)

        const upgrades = state.unlockedKnowledgeUpgrades || [];
        const hasGoldenTrade = upgrades.includes(LEADER_KNOWLEDGE_UPGRADES.ramesses.main);
        const isAutoHalfPrice = !!force && state.turn > 0 && state.turn % 10 === 0;

        const newChoices = generateRelicChoices();
        const nextHalfRelicId =
            hasGoldenTrade && isAutoHalfPrice && newChoices.length > 0
                ? newChoices[Math.floor(Math.random() * newChoices.length)]?.id ?? null
                : null;

        if (!force) {
            set((s) => ({ gold: s.gold - 5, relicChoices: newChoices, relicHalfPriceRelicId: nextHalfRelicId }));
        } else {
            set({ relicChoices: newChoices, relicHalfPriceRelicId: nextHalfRelicId });
        }
    },

    buyRelic: (relicId: number) => {
        const state = get();
        const relicIndex = state.relicChoices.findIndex(r => r && r.id === relicId);
        if (relicIndex === -1) return;

        const def = state.relicChoices[relicIndex];
        if (!def) return;

        const hasGoldenTrade = (state.unlockedKnowledgeUpgrades || []).includes(LEADER_KNOWLEDGE_UPGRADES.ramesses.main);
        const isHalfPrice = state.relicHalfPriceRelicId === relicId;
        const effectiveCostUnscaled = !hasGoldenTrade
            ? def.cost
            : isHalfPrice
                ? Math.floor(def.cost * 0.5)
                : Math.floor(def.cost * 0.8);
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
                pendingLevelUpSelection: false,
                upgradeChoices: [],
                knowledgeUpgradeRerollUsed: [],
            });
            return;
        }

        if (upgradeId === TERRITORIAL_REORG_UPGRADE_ID) {
            set({
                unlockedKnowledgeUpgrades: [...(state.unlockedKnowledgeUpgrades || []), upgradeId],
                phase: 'destroy_selection',
                pendingDestroySource: TERRITORIAL_REORG_UPGRADE_ID,
                destroySelectionMaxSymbols: 3,
                pendingLevelUpSelection: false,
                upgradeChoices: [],
                knowledgeUpgradeRerollUsed: [],
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
        set({
            unlockedKnowledgeUpgrades: newUnlocked,
            bonusXpPerTurn: state.bonusXpPerTurn + bonusXpDelta,
            religionUnlocked: religionUnlocked,
            upgradeChoices: [],
            pendingLevelUpSelection: false,
            knowledgeUpgradeRerollUsed: [],
            board: newBoard,
            playerSymbols: newPlayerSymbols,
            knowledge: state.knowledge + addedKnowledge,
            gold: state.gold + addedGold,
            ...(edictAfterUpgrade
                ? {
                      edictRemovalPending: false,
                      phase: 'destroy_selection' as GamePhase,
                      pendingDestroySource: EDICT_SYMBOL_ID,
                      destroySelectionMaxSymbols: 1,
                  }
                : { phase: 'selection' as GamePhase }),
        });
    },

    skipUpgradeSelection: () => {
        const state = get();
        if (state.phase !== 'upgrade_selection') return;
        const edictAfterUpgrade = state.edictRemovalPending;
        set({
            upgradeChoices: [],
            pendingLevelUpSelection: false,
            knowledgeUpgradeRerollUsed: [],
            ...(edictAfterUpgrade
                ? {
                      edictRemovalPending: false,
                      phase: 'destroy_selection' as GamePhase,
                      pendingDestroySource: EDICT_SYMBOL_ID,
                      destroySelectionMaxSymbols: 1,
                  }
                : { phase: 'selection' as GamePhase }),
        });
    },

    rerollSymbols: () => {
        const state = get();
        if (state.phase !== 'selection') return;

        const hasLydia = useRelicStore.getState().relics.some(r => r.definition.id === RELIC_ID.LYDIA_COIN);

        // ID 2: 리디아의 호박금 주화 — 비용 50% 할인, 턴당 최대 3회
        const rerollCostUnscaled = hasLydia ? Math.floor(REROLL_COST * 0.5) : REROLL_COST;
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

        const unlocked = state.unlockedKnowledgeUpgrades || [];
        const canDemocraticOrder = unlocked.includes(LEADER_KNOWLEDGE_UPGRADES.pericles.sub);
        if (!canDemocraticOrder) return;
        if (!state.upgradeChoices[slotIndex]) return;
        if (state.knowledgeUpgradeRerollUsed[slotIndex]) return;

        const upgradeEraByType = (type: KnowledgeUpgradeType): number | null => {
            if (typeof type !== 'number') return null; // 지도자 전용 타입: 선택지로 등장하지 않게
            switch (type) {
                case SymbolType.ANCIENT: return 1;
                case SymbolType.MEDIEVAL: return 2;
                case SymbolType.MODERN: return 3;
                default: return null;
            }
        };

        // 현재 화면의 업그레이드 3개는 제외 (한 번 리롤하면 다른 카드로 교체)
        const excludedIds = new Set<number>(state.upgradeChoices.map(u => u.id));
        const level = state.level;
        const medievalUnlocked = unlocked.includes(FEUDALISM_UPGRADE_ID) || state.era >= 2;
        const pool = Object.values(KNOWLEDGE_UPGRADES).filter((u) => {
            if (unlocked.includes(u.id) || excludedIds.has(u.id)) return false;
            const upgradeEra = upgradeEraByType(u.type);
            if (upgradeEra == null) return false;
            if (u.id === FEUDALISM_UPGRADE_ID) return level >= 10;
            if (u.type === SymbolType.MEDIEVAL) return medievalUnlocked;
            return upgradeEra <= state.era;
        });

        if (pool.length === 0) return;

        const next = pool[Math.floor(Math.random() * pool.length)];
        const nextRerollUsed = [...state.knowledgeUpgradeRerollUsed];
        nextRerollUsed[slotIndex] = true;

        set({
            upgradeChoices: state.upgradeChoices.map((u, idx) => (idx === slotIndex ? next : u)),
            knowledgeUpgradeRerollUsed: nextRerollUsed,
        });
    },


    confirmDestroySymbols: (instanceIds: string[]) => {
        const state = get();
        if (state.phase !== 'destroy_selection') return;
        const newSymbols = state.playerSymbols.filter((s) => !instanceIds.includes(s.instanceId));
        const goldAdd = instanceIds.length * 10;
        const src = state.pendingDestroySource;

        if (src === EDICT_SYMBOL_ID) {
            const terr = state.territorialAfterEdictPending;
            set({
                playerSymbols: newSymbols,
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                territorialAfterEdictPending: false,
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
            set({
                playerSymbols: newSymbols,
                gold: state.gold + goldAdd,
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                symbolChoices: generateTerrainOnlyChoices(state.era, state.religionUnlocked),
                bonusSelectionQueue: ['terrain', 'any', 'any', 'any'],
            });
            return;
        }

        const edictChain = get().edictRemovalPending;
        set({
            playerSymbols: newSymbols,
            gold: state.gold + goldAdd,
            phase: edictChain ? 'destroy_selection' : 'idle',
            pendingDestroySource: edictChain ? EDICT_SYMBOL_ID : null,
            destroySelectionMaxSymbols: edictChain ? 1 : 3,
            edictRemovalPending: false,
        });
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
        set({ phase: 'idle', pendingDestroySource: null, destroySelectionMaxSymbols: 3 });
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
            board,
            playerSymbols: symbols,
            phase: 'idle',
            symbolChoices: [],
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
            religionUnlocked: false,
            unlockedKnowledgeUpgrades: [],
            bonusXpPerTurn: 0,

            upgradeChoices: [],
            pendingLevelUpSelection: false,
            isRelicShopOpen: false,
            rerollsThisTurn: 0,
            knowledgeUpgradeRerollUsed: [],

            barbarianSymbolThreat: 0,
            barbarianCampThreat: 0,
            naturalDisasterThreat: 0,
            pendingNewThreatFloats: [],
            pendingDestroySource: null,
            bonusSelectionQueue: [],
            edictRemovalPending: false,
            forceTerrainInNextSymbolChoices: false,
            freeSelectionRerolls: 0,
            destroySelectionMaxSymbols: 3,
            territorialAfterEdictPending: false,
        });
    },

    enterDraftSelection: () => {
        const choices = generateChoices(1, false);
        set({ phase: 'draft_selection', symbolChoices: choices });
    },

    setSymbolChoicesForDraft: () => {
        const choices = generateChoices(1, false);
        set({ symbolChoices: choices });
    },

    startGameWithDraft: (symbolIds: number[], leaderId: import('../data/leaders').LeaderId) => {
        const relicStore = useRelicStore.getState();
        const toRemove = relicStore.relics.map((r) => r.instanceId);
        toRemove.forEach((id) => relicStore.removeRelic(id));
        const leaderRelics = getLeaderStartingRelics(leaderId);
        leaderRelics.forEach((def) => relicStore.addRelic(def));

        const leader = LEADERS[leaderId];
        const startingFood = (leader?.startingFood ?? 0);
        const startingGold = (leader?.startingGold ?? 0);

        const leaderKnowledgeUpgrades =
            leaderId === 'ramesses'
                ? [LEADER_KNOWLEDGE_UPGRADES.ramesses.main, LEADER_KNOWLEDGE_UPGRADES.ramesses.sub]
                : [LEADER_KNOWLEDGE_UPGRADES.pericles.main, LEADER_KNOWLEDGE_UPGRADES.pericles.sub];

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
            board,
            playerSymbols,
            phase: 'idle',
            symbolChoices: [],
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
            religionUnlocked: false,
            unlockedKnowledgeUpgrades: leaderKnowledgeUpgrades,
            bonusXpPerTurn: 0,
            upgradeChoices: [],
            pendingLevelUpSelection: false,
            isRelicShopOpen: false,
            rerollsThisTurn: 0,
            knowledgeUpgradeRerollUsed: [],
            barbarianSymbolThreat: 0,
            barbarianCampThreat: 0,
            naturalDisasterThreat: 0,
            pendingNewThreatFloats: [],
            pendingDestroySource: null,
            bonusSelectionQueue: [],
            edictRemovalPending: false,
            forceTerrainInNextSymbolChoices: false,
            freeSelectionRerolls: 0,
            destroySelectionMaxSymbols: 3,
            territorialAfterEdictPending: false,
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

    devSetStat: (stat: 'food' | 'gold' | 'knowledge', value: number) => {
        set({ [stat]: Math.max(0, value) });
    },

    devForceScreen: (screen: 'symbol' | 'relic' | 'upgrade') => {
        const state = get();
        if (screen === 'symbol') {
            const choices = generateChoices(state.era, state.religionUnlocked);
            set({ phase: 'selection', symbolChoices: choices });
        } else if (screen === 'relic') {
            set({ isRelicShopOpen: true, relicChoices: generateRelicChoices(), relicHalfPriceRelicId: null });
        } else if (screen === 'upgrade') {
            const choices = generateUpgradeChoices(state.unlockedKnowledgeUpgrades, state.era);
            set({
                phase: 'upgrade_selection',
                upgradeChoices: choices,
                pendingLevelUpSelection: true,
                knowledgeUpgradeRerollUsed: new Array(choices.length).fill(false),
            });
        }
    },
}));
