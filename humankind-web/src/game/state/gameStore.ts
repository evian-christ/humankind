import { create } from 'zustand';
import { SYMBOLS, SymbolType, type SymbolDefinition, RELIGION_DOCTRINE_IDS } from '../data/symbolDefinitions';
import { SYMBOL_CANDIDATES } from '../data/symbolCandidates';
import { processSingleSymbolEffects, type ActiveRelicEffects } from '../logic/symbolEffects';
import { useSettingsStore, EFFECT_SPEED_DELAY, COMBAT_BOUNCE_DURATION } from './settingsStore';

import { RELIC_LIST, type RelicDefinition } from '../data/relicDefinitions';
import { useRelicStore } from './relicStore';
import type { PlayerSymbolInstance } from '../types';

export { type PlayerSymbolInstance } from '../types';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;
export const REROLL_COST = 50;

/** 유물 ID 목록 (relicDefinitions + relicCandidates) */
const RELIC_ID = {
    CLOVIS_SPEAR: 1,          // 클로비스 투창촉: 적 체력 -1
    LYDIA_COIN: 2,            // 리디아 호박금 주화: 리롤 50% 할인, 턴당 최대 3회
    UR_WHEEL: 3,              // 우르 전차 바퀴: 매 스핀 최저 식량 심볼 파괴 + G+50, 5턴 후 소멸
    JOMON_POTTERY: 4,         // 조몬 토기 조각: 토기 인접 파괴
    EGYPT_SAW: 5,             // 이집트 구리 톱: 채석장 빈 슬롯 G+10
    BABYLON_MAP: 6,           // 바빌로니아 세계 지도: 매 턴 F+10, 보드 20번 심볼 -이면 영구 +10
    GOANNA_BANANA: 7,         // 쿠크 늪지대 바나나 화석: 열대 과수원 인접 바나나 F+20
    TEN_COMMANDMENTS: 8,      // 십계명 석판: 돌→석판
    NILE_SILT: 9,             // 나일 강 흑니: 5스핀 동안 식량 2배
    GOBEKLI_PILLAR: 10,       // 괴베클리 테페 신전 석주: 빈 슬롯당 F+5
    CATALHOYUK: 11,           // 차탈회위크 여신상: 심볼 15개↑ 일 때 F+80
    SCARAB: 12,               // 쇠똥구리 부적: 심볼 파괴 시 G+30
} as const;


/** 작물 심볼 ID 목록 (카르멜 산 화덕 재 효과용) */
const CROP_SYMBOL_IDS = [1, 2, 4, 5]; // Wheat, Rice, Banana, Fish

// 시대별 심볼 등장 확률 테이블 (종교 미해금)
const ERA_PROBABILITIES_BASE: Record<number, Record<number, number>> = {
    1: { 1: 100, 2: 0, 3: 0 },
    2: { 1: 50, 2: 50, 3: 0 },
    3: { 1: 30, 2: 35, 3: 35 },
};

// 시대별 심볼 등장 확률 테이블 (특수 0 해금 후)
const ERA_PROBABILITIES_WITH_SPECIAL: Record<number, Record<number, number>> = {
    1: { 0: 0, 1: 100, 2: 0, 3: 0 },
    2: { 0: 10, 1: 45, 2: 45, 3: 0 },
    3: { 0: 10, 1: 25, 2: 30, 3: 35 },
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

type GamePhase = 'idle' | 'spinning' | 'processing' | 'upgrade_selection' | 'selection' | 'destroy_selection' | 'game_over' | 'victory';
/** 10턴마다 식량 납부 비용 (Godot 원본: 100, 150, 200, 250... -> x10: 1000, 1500, 2000, 2500...) */
export const calculateFoodCost = (turn: number): number => {
    const paymentCycle = Math.floor(turn / 10);
    return 1000 + (paymentCycle - 1) * 500;
};

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
    lastEffects: Array<{ x: number; y: number; food: number; gold: number; knowledge: number }>;
    /** processing 중 누적 합산 (food, gold, knowledge) */
    runningTotals: { food: number; gold: number; knowledge: number };
    /** 현재 처리 중인 슬롯 좌표 (null이면 하이라이트 없음) */
    activeSlot: { x: number; y: number } | null;
    /** 현재 슬롯의 효과에 기여한 인접 심볼 좌표 */
    activeContributors: { x: number; y: number }[];
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

    // Actions
    spinBoard: () => void;
    /** spinning 애니메이션이 끝난 후 호출 — processing 시작 */
    startProcessing: () => void;
    selectSymbol: (symbolId: number) => void;
    skipSelection: () => void;
    rerollSymbols: () => void;

    toggleRelicShop: () => void;
    refreshRelicShop: (force?: boolean) => void;
    buyRelic: (relicId: number) => void;
    selectUpgrade: (upgradeId: number) => void;
    skipUpgradeSelection: () => void;

    initializeGame: () => void;
    devAddSymbol: (symbolId: number) => void;
    devRemoveSymbol: (instanceId: string) => void;
    devSetStat: (stat: 'food' | 'gold' | 'knowledge', value: number) => void;
    devForceScreen: (screen: 'symbol' | 'relic' | 'upgrade') => void;
    confirmDestroySymbols: (instanceIds: string[]) => void;
    finishDestroySelection: () => void;
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

/** 선택 풀에서 제외할 심볼 */
const EXCLUDED_FROM_CHOICES = new Set<number>([22, 23, 24, 25, 26, 36, 39, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60]);
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

        // 업그레이드로 해금되는 심볼들 예외 처리
        let isUnlocked = !EXCLUDED_FROM_CHOICES.has(sym.id);
        if (sym.id === 25 && upgrades.includes(1)) isUnlocked = true; // Writing -> Library
        if (sym.id === 36 && upgrades.includes(5)) isUnlocked = true; // Archery -> Archer
        if (sym.id === 22 && upgrades.includes(6)) isUnlocked = true; // Currency -> Merchant
        if (sym.id === 23 && upgrades.includes(7)) isUnlocked = true; // Horsemanship -> Horse
        if ((sym.id === 24 || sym.id === 26) && upgrades.includes(9)) isUnlocked = true; // Celestial Navigation -> Crab, Pearl
        if (sym.id === 39 && hasRelic(8)) isUnlocked = true; // Ten Commandments -> Tablet (Pool Unlock)
        if (RELIGION_DOCTRINE_IDS.has(sym.id) && useGameStore.getState().religionUnlocked) isUnlocked = true; // Theology -> Religion

        // 패키지 업그레이드 해금 및 금지(Ban)
        if (sym.id === 51 && upgrades.includes(201)) isUnlocked = true; // Hunting -> Bear
        if (sym.id === 52 && upgrades.includes(202)) isUnlocked = true; // Metallurgy -> Bronze
        if (sym.id === 53 && upgrades.includes(203)) isUnlocked = true; // Spearcraft -> Spearman
        if (sym.id === 54 && upgrades.includes(204)) isUnlocked = true; // Shipbuilding -> Boat
        if (sym.id === 55 && upgrades.includes(205)) isUnlocked = true; // Shamanism -> Shaman
        if (sym.id === 56 && upgrades.includes(206)) isUnlocked = true; // Weaving -> Loom
        if (sym.id === 57 && upgrades.includes(207)) isUnlocked = true; // Jewelry -> Gem
        if (sym.id === 58 && upgrades.includes(208)) isUnlocked = true; // Epic Tales -> Storyteller
        if (sym.id === 59 && upgrades.includes(209)) isUnlocked = true; // Trade -> Market

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

        if (finalSym.symbol_type === SymbolType.ENEMY) continue;
        const e = finalSym.era as number;
        if (!result[e]) result[e] = [];

        // 중복 방지 (이미 대체된 심볼이 들어와 있을 수 있음)
        if (!result[e].find(s => s.id === finalSym.id)) {
            result[e].push(finalSym);
        }
    }
    return result;
};

/** 시대 기반 가중치로 심볼 3개 생성 (중복 가능) */
const generateChoices = (era: number, religionUnlocked: boolean): SymbolDefinition[] => {
    const probTable = religionUnlocked ? ERA_PROBABILITIES_WITH_SPECIAL : ERA_PROBABILITIES_BASE;
    const probs = probTable[era] ?? probTable[1];
    const symbolsByEra = getSymbolsByEra();
    const choices: SymbolDefinition[] = [];

    for (let i = 0; i < 3; i++) {
        const roll = Math.floor(Math.random() * 100);
        let cumulative = 0;
        let selectedEra = 1;

        for (const [eraKey, prob] of Object.entries(probs)) {
            cumulative += prob;
            if (roll < cumulative) {
                selectedEra = Number(eraKey);
                break;
            }
        }

        const pool = symbolsByEra[selectedEra];
        if (pool && pool.length > 0) {
            choices.push(pool[Math.floor(Math.random() * pool.length)]);
        } else {
            choices.push(SYMBOLS[1]); // fallback: Wheat
        }
    }

    return choices;
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

import { KNOWLEDGE_UPGRADES, type KnowledgeUpgrade } from '../data/knowledgeUpgrades';
import { KNOWLEDGE_UPGRADE_CANDIDATES } from '../data/knowledgeUpgradeCandidates';

/** 현재 시대에 맞는 지식 업그레이드 선택지 3개 생성 (이미 업그레이드된 것 제외) */
const generateUpgradeChoices = (unlocked: number[], currentEra: number): KnowledgeUpgrade[] => {
    // KNOWLEDGE_UPGRADES만 사용 — 후보(CANDIDATES)는 표시하지 않음
    const pool = Object.values(KNOWLEDGE_UPGRADES).filter(
        (u) => u.era <= currentEra && !unlocked.includes(u.id)
    );
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
        garamantesOasisReduce: false,
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
    lastEffects: [],
    runningTotals: { food: 0, gold: 0, knowledge: 0 },
    activeSlot: null,
    activeContributors: [],
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

    spinBoard: () => {
        const state = get();
        if (state.phase !== 'idle') return;

        // 1. Clear Board & Place Symbols (reuse existing instances to preserve counters)
        const newBoard = createEmptyBoard();
        // 전투/적 심볼 우선 배치: 컬렉션에 있으면 거의 항상 보드에 등장
        let combatAndEnemy = shuffle(state.playerSymbols
            .filter(s => s.definition.symbol_type === SymbolType.ENEMY || s.definition.symbol_type === SymbolType.COMBAT));
        // ID 1: 클로비스 투창촉 - 야만인(적) 등장 시 HP -1
        if (useRelicStore.getState().relics.some(r => r.definition.id === RELIC_ID.CLOVIS_SPEAR)) {
            combatAndEnemy = combatAndEnemy.map(sym => {
                if (sym.definition.symbol_type === SymbolType.ENEMY) {
                    return { ...sym, enemy_hp: Math.max(1, (sym.enemy_hp ?? sym.definition.base_hp ?? 1) - 1) };
                }
                return sym;
            });
        }
        const friendly = shuffle(state.playerSymbols
            .filter(s => s.definition.symbol_type === SymbolType.FRIENDLY));
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

        const newTurn = state.turn + 1;

        // board와 phase를 한 번에 set → renderBoard 시 릴이 새 board를 읽음
        // prevBoard: 스핀 전 보드를 저장 (릴 시작점용)
        set({
            prevBoard: state.board,
            board: newBoard,
            turn: newTurn,
            phase: 'spinning',
            lastEffects: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
            rerollsThisTurn: 0,  // 매 스핀 리롤 횟수 리셋
        });

        // spinning 애니메이션은 GameCanvas ticker가 처리하고,
        // 모든 열이 멈추면 startProcessing()을 호출함
    },

    startProcessing: () => {
        const state = get();
        const upgrades = state.unlockedKnowledgeUpgrades || [];
        const baseKnowledge = (upgrades.includes(1) ? 4 : 2) + (upgrades.includes(10) ? 2 : 0);
        const baseGold = (upgrades.includes(6) ? 2 : 0) + (upgrades.includes(10) ? 2 : 0);

        let startFood = upgrades.includes(10) ? 5 : 0;
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

        set({ phase: 'processing', runningTotals: { food: startFood, gold: startGold, knowledge: baseKnowledge + get().bonusXpPerTurn } });

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
        const baseKnowledgeFinish = upgradesFinish.includes(1) ? 4 : 2;
        const baseGoldFinish = startGold;
        let totalKnowledge = baseKnowledgeFinish + get().bonusXpPerTurn;
        let totalGold = baseGoldFinish;
        const symbolsToAdd: number[] = [];
        const symbolsToSpawnOnBoard: number[] = [];
        const accumulatedEffects: Array<{ x: number; y: number; food: number; gold: number; knowledge: number }> = [];

        const processSlot = (slotIdx: number) => {
            if (slotIdx >= slotOrder.length) {
                // 마지막 효과 후 0.5초 대기 → 스탯 합산
                set({ activeSlot: null, activeContributors: [] });
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

            const result = processSingleSymbolEffects(
                symbol, currentBoard, x, y, buildActiveRelicEffects()
            );

            // ── Campfire 폭발 버프: 이번 스핀 식량 2배 ──
            if (symbol.campfire_double_food && result.food > 0) {
                result.food *= 2;
                symbol.campfire_double_food = false; // 플래그 소비
            }

            if (result.addSymbolIds) symbolsToAdd.push(...result.addSymbolIds);
            if (result.spawnOnBoard) symbolsToSpawnOnBoard.push(...result.spawnOnBoard);

            if (result.triggerRelicRefresh) {
                get().refreshRelicShop(true);
            }
            if (result.triggerRelicSelection) {
                set({ isRelicShopOpen: true });
            }

            if (result.food !== 0 || result.knowledge !== 0 || result.gold !== 0) {
                accumulatedEffects.push({ x, y, food: result.food, gold: result.gold, knowledge: result.knowledge });
                totalFood += result.food;
                totalKnowledge += result.knowledge;
                totalGold += result.gold;
            }

            set({
                activeSlot: { x, y },
                activeContributors: result.contributors ?? [],
                lastEffects: [...accumulatedEffects],
                runningTotals: { food: totalFood, gold: totalGold, knowledge: totalKnowledge },
            });

            const delay = EFFECT_SPEED_DELAY[useSettingsStore.getState().effectSpeed];
            if (delay === 0) {
                processSlot(slotIdx + 1);
            } else {
                setTimeout(() => processSlot(slotIdx + 1), delay);
            }
        };

        const finishProcessing = (
            tFood: number, tKnowledge: number, tGold: number,
            toAdd: number[], toSpawn: number[],
            effects: Array<{ x: number; y: number; food: number; gold: number; knowledge: number }>
        ) => {
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

            // ── Pottery (20): 파괴 시 저장된 식량 방출 ──
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const s = currentBoard[x][y];
                    if (s && s.definition.id === 20 && s.is_marked_for_destruction) {
                        bonusFood += (s.effect_counter || 0);
                    }
                }
            }

            // ── Hinduism (34): 인접 심볼이 파괴되면 +50 Knowledge + 복사본 컬렉션 추가 ──
            let bonusKnowledge = 0;
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const s = currentBoard[x][y];
                    if (s && s.definition.id === 34 && !s.is_marked_for_destruction) {
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dy = -1; dy <= 1; dy++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = x + dx, ny = y + dy;
                                if (nx < 0 || nx >= BOARD_WIDTH || ny < 0 || ny >= BOARD_HEIGHT) continue;
                                const adjSym = currentBoard[nx][ny];
                                if (adjSym && adjSym.is_marked_for_destruction) {
                                    bonusKnowledge += 50;
                                    toAdd.push(adjSym.definition.id);
                                    effects.push({ x, y, food: 0, gold: 0, knowledge: 50 });
                                }
                            }
                        }
                    }
                }
            }

            // ── 유물 ID 3: 우르의 전차 바퀴 ──
            // 매 스핀 식량 생산량 가장 낮은 심볼 파괴 + G+50. 5턴 후 유물 소멸.
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
                                case 1: return 20; case 2: return 25; case 3: return 10;
                                case 4: return 20; case 5: return 10; case 6: return 10;
                                case 7: return 10; case 9: return 20; case 13: return 10;
                                case 14: return 10; case 19: return 10; case 22: return 20;
                                case 23: return 10;
                                default: return 0;
                            }
                        })();
                        if (baseFood < minFood) { minFood = baseFood; minSymbol = { x, y }; }
                    }
                }
                if (minSymbol) {
                    const sym = currentBoard[minSymbol.x][minSymbol.y];
                    if (sym) sym.is_marked_for_destruction = true;
                    bonusGold += 50;
                    effects.push({ x: minSymbol.x, y: minSymbol.y, food: 0, gold: 50, knowledge: 0 });
                }
                // 5턴 후 유물 소멸
                useRelicStore.getState().incrementRelicCounter(urWheelRelic.instanceId);
                if (urWheelRelic.effect_counter + 1 >= 5) {
                    useRelicStore.getState().removeRelic(urWheelRelic.instanceId);
                }
            }

            // ── 유물 ID 6: 바빌로니아 세계 지도 ──
            // 매 턴 F+10(+ 누적 보너스). 보드 마지막 슬롯(x=4,y=3) 심볼이 0이하 식량이면 영구 +10.
            const babylonRelic = getRelicInst(RELIC_ID.BABYLON_MAP);
            if (babylonRelic) {
                const baseBonus = 10 + babylonRelic.bonus_stacks * 10;
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
            // 활성 5스핀 후 소멸 (카운터 증가)
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
                const pillarFood = emptySlots * 5;
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
                    bonusFood += 80;
                    effects.push({ x: 0, y: 0, food: 80, gold: 0, knowledge: 0 });
                }
            }

            // ── 유물 ID 18: 고대 이집트 쇠똥구리 부적 — 심볼 파괴 시 G+30 ──
            if (destroyedCount > 0 && hasRelic(RELIC_ID.SCARAB)) {
                const scarabGold = destroyedCount * 30;
                bonusGold += scarabGold;
                effects.push({ x: 0, y: 0, food: 0, gold: scarabGold, knowledge: 0 });
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
                const choices = generateChoices(newEra, prev.religionUnlocked);

                return {
                    food: prev.food + tFood + bonusFood,
                    gold: prev.gold + tGold + bonusGold,
                    knowledge: newKnowledge,
                    level: newLevel,
                    levelBeforeUpgrade: pendingLevelUp ? prev.level : prev.levelBeforeUpgrade,
                    runningTotals: { food: 0, gold: 0, knowledge: 0 },
                    activeSlot: null,
                    activeContributors: [],
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
                    // 레벨업이 있으면 upgrade_selection 먼저, 아니면 바로 selection
                    if (finalState.pendingLevelUpSelection) {
                        const upgradeChoices = generateUpgradeChoices(finalState.unlockedKnowledgeUpgrades || [], finalState.era);
                        set({ phase: 'upgrade_selection' as GamePhase, upgradeChoices });
                    } else {
                        set({ phase: 'selection' as GamePhase });
                    }
                }
            }, 600);
        };

        // ── 전투 페이즈: COMBAT ↔ ENEMY 인접 쌍을 하나하나 순차 처리 ─────────
        const combatBoard = get().board;
        const combatEvents: { ax: number; ay: number; tx: number; ty: number }[] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const sym = combatBoard[x][y];
                if (sym?.definition.symbol_type !== SymbolType.COMBAT) continue;

                if (sym.definition.id === 36) { // 궁수 (Archer)
                    for (let tx = 0; tx < BOARD_WIDTH; tx++) {
                        for (let ty = 0; ty < BOARD_HEIGHT; ty++) {
                            const target = combatBoard[tx][ty];
                            if (target?.definition.symbol_type === SymbolType.ENEMY) {
                                combatEvents.push({ ax: x, ay: y, tx, ty });
                            }
                        }
                    }
                } else {
                    for (const adj of getAdjacentCoords(x, y)) {
                        const target = combatBoard[adj.x][adj.y];
                        if (target?.definition.symbol_type === SymbolType.ENEMY) {
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
                set({ activeSlot: null, activeContributors: [], combatAnimation: null, combatShaking: false });

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
                    // 아군 유닛(COMBAT)에게만 업그레이드 체력 보너스 적용
                    if (sym.definition.symbol_type === SymbolType.COMBAT && upgrades.includes(2)) {
                        if (sym.definition.id === 35) hp += 10;
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

    selectSymbol: (symbolId: number) => {
        const state = get();
        if (state.phase !== 'selection') return;

        const def = SYMBOLS[symbolId];
        if (!def) return;

        set({
            playerSymbols: [...state.playerSymbols, createInstance(def)],
            phase: 'idle',
            symbolChoices: [],
        });
    },

    skipSelection: () => {
        const state = get();
        if (state.phase !== 'selection') return;

        set({ phase: 'idle', symbolChoices: [] });
    },

    toggleRelicShop: () => {
        set((state) => ({ isRelicShopOpen: !state.isRelicShopOpen }));
    },

    refreshRelicShop: (force = false) => {
        const state = get();
        if (!force && state.gold < 50) return; // 골드 50 소모 (임의 지정, 필요에 따라 수정 가능)

        if (!force) {
            set((s) => ({ gold: s.gold - 50, relicChoices: generateRelicChoices() }));
        } else {
            set({ relicChoices: generateRelicChoices() });
        }
    },

    buyRelic: (relicId: number) => {
        const state = get();
        const relicIndex = state.relicChoices.findIndex(r => r && r.id === relicId);
        if (relicIndex === -1) return;

        const def = state.relicChoices[relicIndex];
        if (!def || state.gold < def.cost) return; // 골드 부족

        useRelicStore.getState().addRelic(def);

        set((s) => {
            const newChoices = [...s.relicChoices];
            newChoices[relicIndex] = null; // 품절 처리
            return {
                gold: s.gold - def.cost,
                relicChoices: newChoices
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
        if (upgradeId === 8) {
            set({
                unlockedKnowledgeUpgrades: [...(state.unlockedKnowledgeUpgrades || []), upgradeId],
                phase: 'destroy_selection',
                pendingLevelUpSelection: false,
                upgradeChoices: [],
            });
            return;
        }

        const newUnlocked = [...(state.unlockedKnowledgeUpgrades || []), upgradeId];

        // 업그레이드 효과 적용
        let religionUnlocked = state.religionUnlocked;
        if (upgradeId === 4) religionUnlocked = true; // Theology

        let bonusXpDelta = 0;
        if (upgradeId === 1) bonusXpDelta = 2; // Writing System: +2 base Knowledge

        let newBoard = [...state.board.map(row => [...row])];
        let newPlayerSymbols = [...state.playerSymbols];
        let addedKnowledge = 0;
        let addedGold = 0;

        // 201 Hunting: Destroy 1 Banana(4) for +100 Gold
        if (upgradeId === 201) {
            const idx = newPlayerSymbols.findIndex(s => s.definition.id === 4);
            if (idx !== -1) {
                newPlayerSymbols.splice(idx, 1);
                addedGold += 100;
            }
        }

        // 202 Metallurgy: All Copper(8) -> Bronze(52)
        if (upgradeId === 202) {
            newPlayerSymbols = newPlayerSymbols.map(s =>
                s.definition.id === 8 ? { ...s, definition: SYMBOLS[52] } : s
            );
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

        // 209 Trade: Up to 2 Wheat(1) -> Gem(57)
        if (upgradeId === 209) {
            let replaced = 0;
            for (let i = 0; i < newPlayerSymbols.length; i++) {
                if (newPlayerSymbols[i].definition.id === 1) {
                    newPlayerSymbols[i] = { ...newPlayerSymbols[i], definition: SYMBOLS[57] };
                    replaced++;
                    if (replaced === 2) break;
                }
            }
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

        set({
            unlockedKnowledgeUpgrades: newUnlocked,
            bonusXpPerTurn: state.bonusXpPerTurn + bonusXpDelta,
            religionUnlocked: religionUnlocked,
            upgradeChoices: [],
            pendingLevelUpSelection: false,
            board: newBoard,
            playerSymbols: newPlayerSymbols,
            knowledge: state.knowledge + addedKnowledge,
            gold: state.gold + addedGold,
            phase: 'selection' as GamePhase,
        });
    },

    skipUpgradeSelection: () => {
        const state = get();
        if (state.phase !== 'upgrade_selection') return;
        set({
            upgradeChoices: [],
            pendingLevelUpSelection: false,
            phase: 'selection' as GamePhase,
        });
    },

    rerollSymbols: () => {
        const state = get();
        if (state.phase !== 'selection') return;

        const hasLydia = useRelicStore.getState().relics.some(r => r.definition.id === RELIC_ID.LYDIA_COIN);

        // ID 2: 리디아의 호박금 주화 — 비용 50% 할인, 턴당 최대 3회
        const rerollCost = hasLydia ? Math.floor(REROLL_COST * 0.5) : REROLL_COST;
        const maxRerolls = hasLydia ? 3 : Infinity;

        if (state.rerollsThisTurn >= maxRerolls) return;
        if (state.gold < rerollCost) return;

        set({
            gold: state.gold - rerollCost,
            symbolChoices: generateChoices(state.era, state.religionUnlocked),
            rerollsThisTurn: state.rerollsThisTurn + 1,
        });
    },


    confirmDestroySymbols: (instanceIds: string[]) => {
        const state = get();
        if (state.phase !== 'destroy_selection') return;
        const newSymbols = state.playerSymbols.filter(s => !instanceIds.includes(s.instanceId));
        set({
            playerSymbols: newSymbols,
            gold: state.gold + instanceIds.length * 100,
            phase: 'idle',
        });
    },

    finishDestroySelection: () => {
        if (get().phase !== 'destroy_selection') return;
        set({ phase: 'idle' });
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
            lastEffects: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
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
            set({ isRelicShopOpen: true, relicChoices: generateRelicChoices() });
        } else if (screen === 'upgrade') {
            const choices = generateUpgradeChoices(state.unlockedKnowledgeUpgrades, state.era);
            set({ phase: 'upgrade_selection', upgradeChoices: choices, pendingLevelUpSelection: true });
        }
    },
}));
