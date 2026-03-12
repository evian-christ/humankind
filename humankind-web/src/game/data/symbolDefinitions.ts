export enum SymbolType {
    RELIGION = 0,
    NORMAL = 1,
    MEDIEVAL = 2,
    MODERN = 3,
    TERRAIN = 4,
    ANCIENT = 5,
    UNIT = 6,
    ENEMY = 7
}

export interface SymbolDefinition {
    id: number;
    name: string;
    type: SymbolType;
    description: string;
    base_attack?: number;
    base_hp?: number;
    sprite: string;
    tags?: string[];
}

/**
 * gameData.yaml에서 자동 생성된 파일입니다.
 * 직접 수정하지 마세요. gameData.yaml을 수정한 뒤
 * npx tsx scripts/generate-from-yaml.ts 를 실행하세요.
 */
export const SYMBOLS: Record<number, SymbolDefinition> = {
    // ── Religion ──
    31: { id: 31, name: "Christianity", type: SymbolType.RELIGION, description: "+Food equal to the highest Food produced by an adjacent symbol; adjacent to a Religion symbol: -500 Food.", sprite: "031.png", tags: [] },
    32: { id: 32, name: "Islam", type: SymbolType.RELIGION, description: "+Gold equal to 3x the total Knowledge produced by adjacent symbols; adjacent to a Religion symbol: -500 Food.", sprite: "032.png", tags: [] },
    33: { id: 33, name: "Buddhism", type: SymbolType.RELIGION, description: "+20 Food per empty slot; adjacent to a Religion symbol: -500 Food.", sprite: "033.png", tags: [] },
    34: { id: 34, name: "Hinduism", type: SymbolType.RELIGION, description: "Adjacent symbol destroyed: +50 Knowledge, adds copy to collection; adjacent to a Religion symbol: -500 Food.", sprite: "034.png", tags: [] },

    // ── Normal ──
    1: { id: 1, name: "Wheat", type: SymbolType.NORMAL, description: "Every 4 turns: +100 Food; when adjacent to Grassland: counter +1.", sprite: "001.png", tags: [] },
    2: { id: 2, name: "Rice", type: SymbolType.NORMAL, description: "Every 8 turns: +200 Food; when adjacent to Grassland: counter +2.", sprite: "002.png", tags: [] },
    3: { id: 3, name: "Cattle", type: SymbolType.NORMAL, description: "+10 Food; when adjacent to Plains: +20 Food.", sprite: "003.png", tags: [] },
    4: { id: 4, name: "Banana", type: SymbolType.NORMAL, description: "+20 Food; 6 turns: destroyed; when adjacent to Rainforest: reset counter.", sprite: "004.png", tags: [] },
    5: { id: 5, name: "Fish", type: SymbolType.NORMAL, description: "+10 Food; when adjacent to Sea: +30 Food.", sprite: "005.png", tags: [] },
    6: { id: 6, name: "Sea", type: SymbolType.TERRAIN, description: "+10 Food; per adjacent Sea: +10 Gold.", sprite: "006.png", tags: [] },
    7: { id: 7, name: "Stone", type: SymbolType.NORMAL, description: "+10 Food, +10 Gold; when adjacent to Mountain: +30 Gold.", sprite: "007.png", tags: [] },
    8: { id: 8, name: "Copper", type: SymbolType.NORMAL, description: "+20 Gold; if exactly 3 Copper on board: all Copper x3; when adjacent to Mountain: +20 Gold.", sprite: "008.png", tags: [] },
    9: { id: 9, name: "Grassland", type: SymbolType.TERRAIN, description: "+20 Food.", sprite: "009.png", tags: [] },
    10: { id: 10, name: "Monument", type: SymbolType.ANCIENT, description: "+5 Knowledge.", sprite: "010.png", tags: [] },
    11: { id: 11, name: "Oasis", type: SymbolType.TERRAIN, description: "Per adjacent empty slot: +7 Food.", sprite: "011.png", tags: [] },
    12: { id: 12, name: "Oral Tradition", type: SymbolType.ANCIENT, description: "10 turns: destroyed; on destroy: +10 Knowledge per adjacent symbol.", sprite: "012.png", tags: [] },
    13: { id: 13, name: "Rainforest", type: SymbolType.TERRAIN, description: "+10 Food.", sprite: "013.png", tags: [] },
    14: { id: 14, name: "Plains", type: SymbolType.TERRAIN, description: "+10 Food; per turn: +10 Food.", sprite: "014.png", tags: [] },
    15: { id: 15, name: "Mountain", type: SymbolType.TERRAIN, description: "+10 Food.", sprite: "015.png", tags: [] },
    16: { id: 16, name: "Totem", type: SymbolType.ANCIENT, description: "In a corner: +20 Knowledge.", sprite: "016.png", tags: [] },
    17: { id: 17, name: "Offering", type: SymbolType.ANCIENT, description: "-10 Food, +10 Knowledge.", sprite: "017.png", tags: [] },
    18: { id: 18, name: "Omen", type: SymbolType.ANCIENT, description: "50% chance: +30 Food, 50% chance: -15 Food.", sprite: "018.png", tags: [] },
    19: { id: 19, name: "Campfire", type: SymbolType.ANCIENT, description: "+10 Food; 10 turns: destroyed; on destroy: adjacent symbols x2 Food this turn.", sprite: "019.png", tags: [] },
    20: { id: 20, name: "Pottery", type: SymbolType.ANCIENT, description: "Counter +30; on destroy: Food equal to Counter.", sprite: "020.png", tags: [] },
    21: { id: 21, name: "Tribal Village", type: SymbolType.ANCIENT, description: "Destroyed; on destroy: adds 2 random Ancient symbols.", sprite: "021.png", tags: [] },
    22: { id: 22, name: "Merchant", type: SymbolType.NORMAL, description: "Not in corner: stores Gold equal to highest adjacent Food; in corner: gains stored Gold.", sprite: "022.png", tags: ["expert"] },
    24: { id: 24, name: "Crab", type: SymbolType.NORMAL, description: "When adjacent to Sea: +30 Food.", sprite: "024.png", tags: [] },
    25: { id: 25, name: "Library", type: SymbolType.NORMAL, description: "+5 Knowledge.", sprite: "025.png", tags: [] },
    26: { id: 26, name: "Pearl", type: SymbolType.NORMAL, description: "When adjacent to Sea: +50 Gold.", sprite: "026.png", tags: [] },
    27: { id: 27, name: "Desert", type: SymbolType.TERRAIN, description: "Destroys 1 random adjacent Normal symbol.", sprite: "027.png", tags: [] },
    28: { id: 28, name: "Forest", type: SymbolType.TERRAIN, description: "+10 Food; per adjacent Forest: +10 Food.", sprite: "028.png", tags: [] },
    29: { id: 29, name: "Deer", type: SymbolType.NORMAL, description: "+10 Food; if 2 or more adjacent Forests: +40 Food.", sprite: "029.png", tags: [] },
    30: { id: 30, name: "Date", type: SymbolType.NORMAL, description: "+10 Food; when destroyed by Desert: +20 Food and adds Date.", sprite: "030.png", tags: [] },

    35: { id: 35, name: "Warrior", type: SymbolType.UNIT, description: "Ancient era melee unit.", base_attack: 5, base_hp: 10, sprite: "035.png", tags: ["melee"] },
    37: { id: 37, name: "Relic Caravan", type: SymbolType.NORMAL, description: "Destroyed; on destroy: refreshes relic shop.", sprite: "037.png", tags: [] },
    38: { id: 38, name: "Stargazer", type: SymbolType.NORMAL, description: "+3 Knowledge per empty slot.", sprite: "038.png", tags: ["expert"] },

    39: { id: 39, name: "Stone Tablet", type: SymbolType.NORMAL, description: "+5 Knowledge per relic owned.", sprite: "039.png", tags: [] },
    36: { id: 36, name: "Archer", type: SymbolType.UNIT, description: "Ancient ranged unit.", base_attack: 3, base_hp: 5, sprite: "036.png", tags: ["ranged"] },
    23: { id: 23, name: "Horse", type: SymbolType.NORMAL, description: "+10 Food, +10 Gold; when adjacent to Plains: +20 Food.", sprite: "023.png", tags: [] },
    40: { id: 40, name: "Barbarian Camp", type: SymbolType.ENEMY, description: "Every 10 turns: adds 1 random current era enemy combat unit; Destroyed; on destroy: adds Loot.", base_hp: 10, sprite: "040.png", tags: [] },
    41: { id: 41, name: "Loot", type: SymbolType.NORMAL, description: "Destroyed; on destroy: get random reward.", sprite: "041.png", tags: [] },
    42: { id: 42, name: "Glowing Amber", type: SymbolType.NORMAL, description: "Destroyed; on destroy: adds random current era relic.", sprite: "042.png", tags: [] },
    43: { id: 43, name: "Enemy Warrior", type: SymbolType.ENEMY, description: "-5 Food.", base_attack: 5, base_hp: 10, sprite: "043.png", tags: ["melee"] },


    // ── Normal Package Unlocks (Placeholders) ──
    51: { id: 51, name: "Bear", type: SymbolType.NORMAL, description: "To be implemented.", sprite: "-", tags: [] },
    52: { id: 52, name: "Bronze", type: SymbolType.NORMAL, description: "To be implemented.", sprite: "-", tags: [] },
    53: { id: 53, name: "Spearman", type: SymbolType.NORMAL, description: "To be implemented.", base_attack: 4, base_hp: 12, sprite: "-", tags: ["melee"] },
    54: { id: 54, name: "Boat", type: SymbolType.NORMAL, description: "To be implemented.", sprite: "-", tags: [] },
    55: { id: 55, name: "Shaman", type: SymbolType.NORMAL, description: "To be implemented.", sprite: "-", tags: [] },
    56: { id: 56, name: "Loom", type: SymbolType.NORMAL, description: "To be implemented.", sprite: "-", tags: [] },
    57: { id: 57, name: "Gem", type: SymbolType.NORMAL, description: "To be implemented.", sprite: "-", tags: [] },
    58: { id: 58, name: "Storyteller", type: SymbolType.NORMAL, description: "To be implemented.", sprite: "-", tags: [] },
    59: { id: 59, name: "Market", type: SymbolType.NORMAL, description: "To be implemented.", sprite: "-", tags: [] },
    60: { id: 60, name: "Altar", type: SymbolType.NORMAL, description: "To be implemented.", sprite: "-", tags: [] },
};

/** Religion 심볼 ID 목록 (Shrine, Totem, Offering + 4대 교리 심볼) */
export const RELIGION_SYMBOL_IDS = new Set([12, 16, 17, 31, 32, 33, 34]);

/** 종교 교리 심볼 ID 목록 (패널티 체크용) */
export const RELIGION_DOCTRINE_IDS = new Set([31, 32, 33, 34]);

/** 기본적으로 상점 풀에 등장할 수 없는 심볼 ID 목록 */
export const EXCLUDED_FROM_BASE_POOL = new Set<number>([
    22, 23, 24, 25, 26, 36, 39, 41, 42, 43, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60
]);

/** 해당 심볼이 아무 조건 없이 기본 상점 풀에 포함되는지 여부 */
export const isBasePool = (s: SymbolDefinition) => {
    return (s.type === SymbolType.NORMAL || s.type === SymbolType.TERRAIN || s.type === SymbolType.ANCIENT || s.type === SymbolType.UNIT) &&
        !EXCLUDED_FROM_BASE_POOL.has(s.id) &&
        !RELIGION_DOCTRINE_IDS.has(s.id);
};

/** Knowledge를 생산하는 심볼 ID 목록 */
export const KNOWLEDGE_PRODUCING_IDS = new Set([10, 16, 17, 25, 26, 38, 39]);

/** Gold를 생산하는 심볼 ID 목록 */
export const GOLD_PRODUCING_IDS = new Set([6, 7, 8, 15, 22]);

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
