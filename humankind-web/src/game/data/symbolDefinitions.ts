export enum SymbolType {
    RELIGION = 0,
    NORMAL = 1,
    MEDIEVAL = 2,
    MODERN = 3,
    TERRAIN = 4,
    ANCIENT = 5,
    UNIT = 6,
    ENEMY = 7,
    DISASTER = 8
}

export interface SymbolDefinition {
    id: number;
    name: string;
    type: SymbolType;
    description: string;
    base_attack?: number;
    base_hp?: number;
    sprite: string;
}

/**
 * gameData.yaml에서 자동 생성된 파일입니다.
 * 직접 수정하지 마세요. gameData.yaml을 수정한 뒤
 * npx tsx scripts/generate-from-yaml.ts 를 실행하세요.
 */
export const SYMBOLS: Record<number, SymbolDefinition> = {
    // ── Religion ──
    31: { id: 31, name: "Christianity", type: SymbolType.RELIGION, description: "+Food equal to the highest Food produced by an adjacent symbol; adjacent to a Religion symbol: -50 Food.", sprite: "031.png" },
    32: { id: 32, name: "Islam", type: SymbolType.RELIGION, description: "+2 Gold per adjacent symbol that produces Knowledge; adjacent to a Religion symbol: -50 Food.", sprite: "032.png" },
    33: { id: 33, name: "Buddhism", type: SymbolType.RELIGION, description: "+2 Food per empty slot; adjacent to a Religion symbol: -50 Food.", sprite: "033.png" },
    34: { id: 34, name: "Hinduism", type: SymbolType.RELIGION, description: "+5 Food and +5 Knowledge per symbol destroyed this turn; adjacent to a Religion symbol: -50 Food.", sprite: "034.png" },

    // ── Normal ──
    1: { id: 1, name: "Wheat", type: SymbolType.NORMAL, description: "Every 6 turns: +6 Food; when adjacent to Grassland: counter +1.", sprite: "001.png" },
    2: { id: 2, name: "Rice", type: SymbolType.NORMAL, description: "Every 12 turns: +15 Food; when adjacent to Grassland: counter +2.", sprite: "002.png" },
    3: { id: 3, name: "Cattle", type: SymbolType.NORMAL, description: "+1 Food; when adjacent to Plains: +2 additional Food.", sprite: "003.png" },
    4: { id: 4, name: "Banana", type: SymbolType.NORMAL, description: "+2 Food; 6 turns: destroyed; when adjacent to Rainforest: reset counter.", sprite: "004.png" },
    5: { id: 5, name: "Fish", type: SymbolType.NORMAL, description: "When adjacent to Sea: +2 Food.", sprite: "005.png" },
    6: { id: 6, name: "Sea", type: SymbolType.TERRAIN, description: "+1 Gold per 4 adjacent symbols.", sprite: "006.png" },
    7: { id: 7, name: "Stone", type: SymbolType.NORMAL, description: "+1 Gold; when adjacent to Mountain: +2 additional Gold.", sprite: "007.png" },
    8: { id: 8, name: "Copper", type: SymbolType.NORMAL, description: "+1 Gold; if exactly 3 Copper on board: x3 Gold production.", sprite: "008.png" },
    9: { id: 9, name: "Grassland", type: SymbolType.TERRAIN, description: "+2 Food.", sprite: "009.png" },
    10: { id: 10, name: "Monument", type: SymbolType.ANCIENT, description: "+5 Knowledge.", sprite: "010.png" },
    11: { id: 11, name: "Oasis", type: SymbolType.TERRAIN, description: "+1 Food per 2 adjacent empty slots.", sprite: "011.png" },
    12: { id: 12, name: "Oral Tradition", type: SymbolType.ANCIENT, description: "10 turns: destroyed; on destroy: +10 Knowledge per adjacent symbol.", sprite: "012.png" },
    13: { id: 13, name: "Rainforest", type: SymbolType.TERRAIN, description: "+1 Food.", sprite: "013.png" },
    14: { id: 14, name: "Plains", type: SymbolType.TERRAIN, description: "+1 Food.", sprite: "014.png" },
    15: { id: 15, name: "Mountain", type: SymbolType.TERRAIN, description: "+1 Food.", sprite: "015.png" },
    16: { id: 16, name: "Totem", type: SymbolType.ANCIENT, description: "In a corner: +20 Knowledge.", sprite: "016.png" },
    17: { id: 17, name: "Offering", type: SymbolType.ANCIENT, description: "-1 Food, +10 Knowledge.", sprite: "017.png" },
    18: { id: 18, name: "Omen", type: SymbolType.ANCIENT, description: "50% chance for +3 Food, 50% chance for -1 Food.", sprite: "018.png" },
    19: { id: 19, name: "Campfire", type: SymbolType.ANCIENT, description: "+1 Food; 10 turns: destroyed; on destroy: copies the effect of the adjacent symbol with the highest Food produced this turn.", sprite: "019.png" },
    20: { id: 20, name: "Pottery", type: SymbolType.ANCIENT, description: "+3 Food stored per turn; on destroy: gain Food equal to stored Counter.", sprite: "020.png" },
    21: { id: 21, name: "Tribal Village", type: SymbolType.ANCIENT, description: "Destroyed; on destroy: adds 2 random Ancient symbols.", sprite: "021.png" },
    22: { id: 22, name: "Merchant", type: SymbolType.NORMAL, description: "Not in corner: stores Gold equal to highest adjacent Food; in corner: gains stored Gold.", sprite: "022.png" },
    24: { id: 24, name: "Crab", type: SymbolType.NORMAL, description: "When adjacent to Sea: +3 Food.", sprite: "024.png" },
    25: { id: 25, name: "Library", type: SymbolType.NORMAL, description: "+7 Knowledge.", sprite: "025.png" },
    26: { id: 26, name: "Pearl", type: SymbolType.NORMAL, description: "When adjacent to Sea: +3 Gold.", sprite: "026.png" },
    27: { id: 27, name: "Desert", type: SymbolType.TERRAIN, description: "Destroys 1 random adjacent Normal or era symbol.", sprite: "027.png" },
    28: { id: 28, name: "Forest", type: SymbolType.TERRAIN, description: "Per adjacent Forest: +1 Food.", sprite: "028.png" },
    29: { id: 29, name: "Deer", type: SymbolType.NORMAL, description: "+1 Food; if 2 or more adjacent Forests: +2 Food.", sprite: "029.png" },
    30: { id: 30, name: "Date", type: SymbolType.NORMAL, description: "+1 Food; when destroyed by Desert: +2 Food and adds Date.", sprite: "030.png" },

    35: { id: 35, name: "Warrior", type: SymbolType.UNIT, description: "Ancient era melee unit.", base_attack: 5, base_hp: 10, sprite: "035.png" },
    37: { id: 37, name: "Relic Caravan", type: SymbolType.NORMAL, description: "Destroyed; on destroy: refreshes relic shop.", sprite: "037.png" },
    38: { id: 38, name: "Stargazer", type: SymbolType.NORMAL, description: "+1 Knowledge per 2 empty slots.", sprite: "038.png" },

    39: { id: 39, name: "Stone Tablet", type: SymbolType.NORMAL, description: "+5 Knowledge per relic owned.", sprite: "039.png" },
    36: { id: 36, name: "Archer", type: SymbolType.UNIT, description: "Ancient ranged unit.", base_attack: 3, base_hp: 5, sprite: "036.png" },
    23: { id: 23, name: "Horse", type: SymbolType.NORMAL, description: "+1 Food, +1 Gold; when adjacent to Plains: +2 additional Food.", sprite: "023.png" },
    40: { id: 40, name: "Barbarian Camp", type: SymbolType.ENEMY, description: "Every 8 turns: adds 1 random current era enemy combat unit; Destroyed; on destroy: adds Loot.", base_hp: 20, sprite: "040.png" },
    41: { id: 41, name: "Loot", type: SymbolType.NORMAL, description: "Destroyed; on destroy: get random reward.", sprite: "041.png" },
    42: { id: 42, name: "Glowing Amber", type: SymbolType.NORMAL, description: "Destroyed; on destroy: adds random current era relic.", sprite: "042.png" },
    43: { id: 43, name: "Enemy Warrior", type: SymbolType.ENEMY, description: "-5 Food.", base_attack: 5, base_hp: 10, sprite: "043.png" },
    44: { id: 44, name: "Flood", type: SymbolType.DISASTER, description: "Disables all adjacent terrain symbols. When counter reaches 0: Destroy.", sprite: "044.png" },
    45: { id: 45, name: "Earthquake", type: SymbolType.DISASTER, description: "Destroyed. On destroy: destroy 1 random adjacent symbol.", sprite: "045.png" },
    46: { id: 46, name: "Drought", type: SymbolType.DISASTER, description: "When counter reaches 0: Destroy.", sprite: "046.png" },

    // 47: Salt
    47: { id: 47, name: "Salt", type: SymbolType.NORMAL, description: "+1 Food per adjacent terrain symbol.", sprite: "047.png" },
    // 48: Honey
    48: { id: 48, name: "Honey", type: SymbolType.NORMAL, description: "After 5 turns: destroyed; on destruction: +5 Food.", sprite: "048.png" },
    // 49: Corn
    49: { id: 49, name: "Corn", type: SymbolType.NORMAL, description: "+1 Food.", sprite: "049.png" },
    // 50: Wild Berries
    50: { id: 50, name: "Wild Berries", type: SymbolType.NORMAL, description: "When adjacent to Forest: +1 Food. When adjacent to Rainforest: +1 Food.", sprite: "050.png" },
    // 51: Hay
    51: { id: 51, name: "Hay", type: SymbolType.NORMAL, description: "When adjacent to Plains: counter +1. On destroy: gain Food equal to Counter.", sprite: "051.png" },
    // 52: Spices
    52: { id: 52, name: "Spices", type: SymbolType.NORMAL, description: "+1 Food per different terrain type placed.", sprite: "052.png" },
    // 53: Tax (Medieval) — 실제 정산은 gameStore finishProcessing에서 이번 턴 effects 기준
    53: {
        id: 53,
        name: "Tax",
        type: SymbolType.MEDIEVAL,
        description:
            "+Gold equal to a random adjacent symbol's Food produced this turn; -Food equal to that amount.",
        sprite: "053.png",
    },
    54: {
        id: 54,
        name: "University",
        type: SymbolType.NORMAL,
        description: "+1 Knowledge per symbol placed on the board.",
        sprite: "054.png",
    },
    55: {
        id: 55,
        name: "Harbor",
        type: SymbolType.NORMAL,
        description: "+2 Food. Symbols adjacent to Harbor count as adjacent to Sea. +1 Gold per adjacent symbol.",
        sprite: "055.png",
    },
    56: {
        id: 56,
        name: "Aqueduct",
        type: SymbolType.NORMAL,
        description: "Adjacent Wheat, Rice, and Rye produce double Food this turn.",
        sprite: "056.png",
    },
    57: { id: 57, name: "Rye", type: SymbolType.NORMAL, description: "+2 Food; when adjacent to Plains: +2 additional Food.", sprite: "057.png" },
    58: {
        id: 58,
        name: "Sheep",
        type: SymbolType.NORMAL,
        description: "+2 Food; when adjacent to Plains: +2 additional Food and +2 Gold.",
        sprite: "058.png",
    },
    59: {
        id: 59,
        name: "Wild Boar",
        type: SymbolType.NORMAL,
        description: "+2 Food; if 3 or more adjacent Forests: +4 additional Food.",
        sprite: "059.png",
    },
    60: {
        id: 60,
        name: "Sawmill",
        type: SymbolType.NORMAL,
        description: "Per Forest in the same column: +5 Food. Per Mountain in the same column: +5 Knowledge and +5 Gold.",
        sprite: "060.png",
    },
    61: { id: 61, name: "Gold Vein", type: SymbolType.NORMAL, description: "+5 Gold.", sprite: "061.png" },
    62: {
        id: 62,
        name: "Knight",
        type: SymbolType.UNIT,
        description: "Medieval melee unit (+3 Attack / +3 HP vs Warrior).",
        base_attack: 8,
        base_hp: 13,
        sprite: "062.png",
    },
    63: {
        id: 63,
        name: "Caravel",
        type: SymbolType.UNIT,
        description: "Medieval naval unit (+7 HP vs Warrior).",
        base_attack: 5,
        base_hp: 17,
        sprite: "063.png",
    },
    64: {
        id: 64,
        name: "Scholar",
        type: SymbolType.MEDIEVAL,
        description:
            "Destroys adjacent Ancient symbols. +10 Knowledge per Ancient symbol destroyed.",
        sprite: "064.png",
    },
    65: {
        id: 65,
        name: "Holy Relic",
        type: SymbolType.MEDIEVAL,
        description:
            "+5 Knowledge. Each turn adjacent to a Religion doctrine symbol: +1 toward a counter; at 10: permanently +5 Knowledge per turn and reset counter.",
        sprite: "065.png",
    },
    66: {
        id: 66,
        name: "Telescope",
        type: SymbolType.MEDIEVAL,
        description: "+Knowledge equal to this slot number (1–20, top-left first).",
        sprite: "066.png",
    },
    67: { id: 67, name: "Scales", type: SymbolType.MEDIEVAL, description: "+8 Knowledge.", sprite: "067.png" },
    68: {
        id: 68,
        name: "Pioneer",
        type: SymbolType.MEDIEVAL,
        description: "Destroyed; on destroy: next symbol selection includes at least one Terrain symbol.",
        sprite: "068.png",
    },
    69: {
        id: 69,
        name: "Edict",
        type: SymbolType.MEDIEVAL,
        description: "Destroyed; on destroy: choose 1 owned symbol to remove (no on-destroy effects).",
        sprite: "069.png",
    },
    70: {
        id: 70,
        name: "Embassy",
        type: SymbolType.MEDIEVAL,
        description: "Destroyed; on destroy: next turn, the first symbol-selection reroll costs 0 Gold.",
        sprite: "070.png",
    },
    71: {
        id: 71,
        name: "Wild Seeds",
        type: SymbolType.ANCIENT,
        description: "+1 Food. Destroyed after 5 turns.",
        sprite: "071.png",
    },
};

/** 세금 심볼 ID — 턴 종료 정산 시 인접 슬롯의 이번 턴 식량 합계를 참조 */
export const TAX_SYMBOL_ID = 53;

/** 칙령(69): 파괴 후 보유 심볼 1개 제거 UI */
export const EDICT_SYMBOL_ID = 69;

/** 야만인 주둔지(40): 이 턴 수마다 무작위 적 전투 유닛 1기 추가 */
export const BARBARIAN_CAMP_SPAWN_INTERVAL = 8;

/** 종교 심볼 ID 목록 (4대 교리 심볼) */
export const RELIGION_SYMBOL_IDS = new Set([31, 32, 33, 34]);

/** 종교 교리 심볼 ID 목록 (패널티 체크용) */
export const RELIGION_DOCTRINE_IDS = new Set([31, 32, 33, 34]);

/** 기본적으로 상점 풀에 등장할 수 없는 심볼 ID 목록 */
export const EXCLUDED_FROM_BASE_POOL = new Set<number>([
    22, 23, 24, 25, 26, 31, 32, 33, 34, 36, 39, 41, 42, 43,
    44, 45, 46,
    54, 55, 56, 57, 58, 59, 60, 61, 62, 63,
]);

/** 해당 심볼이 아무 조건 없이 기본 상점 풀에 포함되는지 여부 */
export const isBasePool = (s: SymbolDefinition) => {
    return (s.type === SymbolType.NORMAL || s.type === SymbolType.TERRAIN || s.type === SymbolType.ANCIENT || s.type === SymbolType.UNIT) &&
        !EXCLUDED_FROM_BASE_POOL.has(s.id) &&
        !RELIGION_DOCTRINE_IDS.has(s.id);
};

/** Knowledge를 생산하는 심볼 ID 목록 */
export const KNOWLEDGE_PRODUCING_IDS = new Set([10, 16, 17, 25, 26, 38, 39, 54, 60, 64, 65, 66, 67]);

/** Gold를 생산하는 심볼 ID 목록 */
export const GOLD_PRODUCING_IDS = new Set([6, 7, 8, 15, 22, TAX_SYMBOL_ID, 55, 58, 60, 61]);

export const getSymbolColor = (type: SymbolType): number => {
    switch (type) {
        case SymbolType.RELIGION: return 16777215; // 백색
        case SymbolType.NORMAL: return 0xffffff; // 일반 흰색
        case SymbolType.ANCIENT: return 0x8b4513; // 고대 갈색 (9127187)
        case SymbolType.MEDIEVAL: return 16347926; // 오렌지/중세
        case SymbolType.MODERN: return 3900150; // 파랑/현대
        case SymbolType.TERRAIN: return 0x22c55e; // 녹색 지형
        case SymbolType.UNIT: return 0x3b82f6; // 유닛 (파랑계열)
        case SymbolType.ENEMY: return 0xef4444; // 적 (빨강)
        default: return 0x9ca3af;
    }
};

export const getSymbolColorHex = (type: SymbolType): string => {
    switch (type) {
        case SymbolType.RELIGION: return '#ffffff';
        case SymbolType.NORMAL: return '#ffffff';
        case SymbolType.ANCIENT: return '#8b4513';
        case SymbolType.MEDIEVAL: return '#f97316';
        case SymbolType.MODERN: return '#3b82f6';
        case SymbolType.TERRAIN: return '#22c55e';
        case SymbolType.UNIT: return '#3b82f6';
        case SymbolType.ENEMY: return '#ef4444';
        default: return '#9ca3af';
    }
};
