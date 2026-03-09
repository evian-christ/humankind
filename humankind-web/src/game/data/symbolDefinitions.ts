export enum SymbolType {
    FRIENDLY = 0,
    ENEMY = 1,
    COMBAT = 2
}

export enum Era {
    SPECIAL = 0,
    ANCIENT = 1,
    MEDIEVAL = 2,
    MODERN = 3
}

export interface SymbolDefinition {
    id: number;
    name: string;
    era: Era;
    symbol_type: SymbolType;
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
    31: { id: 31, name: "Christianity", era: Era.SPECIAL, symbol_type: SymbolType.FRIENDLY, description: "+Food equal to the highest Food produced by an adjacent symbol; adjacent to a Religion symbol: -500 Food.", sprite: "031.png", tags: ["religion"] },
    32: { id: 32, name: "Islam", era: Era.SPECIAL, symbol_type: SymbolType.FRIENDLY, description: "+Gold equal to 3x the total Knowledge produced by adjacent symbols; adjacent to a Religion symbol: -500 Food.", sprite: "032.png", tags: ["religion"] },
    33: { id: 33, name: "Buddhism", era: Era.SPECIAL, symbol_type: SymbolType.FRIENDLY, description: "+20 Food per empty slot; adjacent to a Religion symbol: -500 Food.", sprite: "033.png", tags: ["religion"] },
    34: { id: 34, name: "Hinduism", era: Era.SPECIAL, symbol_type: SymbolType.FRIENDLY, description: "Adjacent symbol destroyed: +50 Knowledge, adds copy to collection; adjacent to a Religion symbol: -500 Food.", sprite: "034.png", tags: ["religion"] },

    // ── Ancient ──
    1: { id: 1, name: "Wheat", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every 4 turns: +100 Food; when adjacent to Grassland: counter +1.", sprite: "001.png", tags: [] },
    2: { id: 2, name: "Rice", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every 8 turns: +200 Food; when adjacent to Grassland: counter +2.", sprite: "002.png", tags: [] },
    3: { id: 3, name: "Cattle", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+10 Food; when adjacent to Plains: +20 Food.", sprite: "003.png", tags: [] },
    4: { id: 4, name: "Banana", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+20 Food; 6 turns: destroyed.", sprite: "004.png", tags: [] },
    5: { id: 5, name: "Fish", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+10 Food; when adjacent to Sea: +30 Food.", sprite: "005.png", tags: [] },
    6: { id: 6, name: "Sea", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+10 Food; per adjacent Sea: +10 Gold.", sprite: "-", tags: ["terrain"] },
    7: { id: 7, name: "Stone", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+10 Food, +10 Gold; when adjacent to Mountain: +30 Gold.", sprite: "007.png", tags: [] },
    8: { id: 8, name: "Copper", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+20 Gold; if exactly 3 Copper on board: all Copper x3; when adjacent to Mountain: +20 Gold.", sprite: "008.png", tags: [] },
    9: { id: 9, name: "Grassland", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+20 Food.", sprite: "-", tags: ["terrain"] },
    10: { id: 10, name: "Monument", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+5 Knowledge.", sprite: "010.png", tags: [] },
    11: { id: 11, name: "Oasis", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Per adjacent empty slot: +7 Food.", sprite: "011.png", tags: [] },
    12: { id: 12, name: "Oral Tradition", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "10 turns: destroyed; on destroy: +10 Knowledge per adjacent symbol.", sprite: "012.png", tags: [] },
    13: { id: 13, name: "Rainforest", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+10 Food; when adjacent to Banana: reset Banana counter.", sprite: "013.png", tags: [] },
    14: { id: 14, name: "Plains", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+10 Food; per turn: +10 Food.", sprite: "-", tags: ["terrain"] },
    15: { id: 15, name: "Mountain", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+10 Food.", sprite: "015.png", tags: ["terrain"] },
    16: { id: 16, name: "Totem", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "In a corner: +20 Knowledge.", sprite: "016.png", tags: [] },
    17: { id: 17, name: "Offering", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "-10 Food, +10 Knowledge.", sprite: "017.png", tags: [] },
    18: { id: 18, name: "Omen", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "50% chance: +30 Food, 50% chance: -15 Food.", sprite: "018.png", tags: [] },
    19: { id: 19, name: "Campfire", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+10 Food; 10 turns: destroyed; on destroy: adjacent symbols x2 Food this turn.", sprite: "019.png", tags: [] },
    20: { id: 20, name: "Pottery", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Counter +30; on destroy: Food equal to Counter.", sprite: "020.png", tags: [] },
    21: { id: 21, name: "Tribal Village", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Destroyed; on destroy: adds 2 random Ancient symbols.", sprite: "021.png", tags: [] },
    22: { id: 22, name: "Merchant", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Not in corner: stores Gold equal to highest adjacent Food; in corner: gains stored Gold.", sprite: "-", tags: ["expert"] },
    24: { id: 24, name: "Crab", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "When adjacent to Sea: +30 Food.", sprite: "-", tags: [] },
    25: { id: 25, name: "Library", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+5 Knowledge.", sprite: "-", tags: [] },
    26: { id: 26, name: "Pearl", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "When adjacent to Sea: +50 Gold.", sprite: "-", tags: [] },
    27: { id: 27, name: "Desert", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Destroys 1 random adjacent symbol.", sprite: "-", tags: ["terrain"] },

    35: { id: 35, name: "Warrior", era: Era.ANCIENT, symbol_type: SymbolType.COMBAT, description: "Ancient era melee unit.", base_attack: 5, base_hp: 10, sprite: "035.png", tags: ["melee"] },
    37: { id: 37, name: "Camel Caravan", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Destroyed; on destroy: refreshes relic shop.", sprite: "-", tags: [] },
    38: { id: 38, name: "Stargazer", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+3 Knowledge per empty slot.", sprite: "038.png", tags: ["expert"] },

    39: { id: 39, name: "Stone Tablet", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+5 Knowledge per relic owned.", sprite: "039.png", tags: [] },
    36: { id: 36, name: "Archer", era: Era.ANCIENT, symbol_type: SymbolType.COMBAT, description: "Ancient ranged unit.", base_attack: 3, base_hp: 5, sprite: "-", tags: ["ranged"] },
    23: { id: 23, name: "Horse", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+10 Food, +10 Gold; when adjacent to Plains: +20 Food.", sprite: "023.png", tags: [] },

    // ── Ancient Package Unlocks (Placeholders) ──
    51: { id: 51, name: "Bear", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "-", tags: [] },
    52: { id: 52, name: "Bronze", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "-", tags: [] },
    53: { id: 53, name: "Spearman", era: Era.ANCIENT, symbol_type: SymbolType.COMBAT, description: "To be implemented.", base_attack: 4, base_hp: 12, sprite: "-", tags: ["melee"] },
    54: { id: 54, name: "Boat", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "-", tags: [] },
    55: { id: 55, name: "Shaman", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "-", tags: [] },
    56: { id: 56, name: "Loom", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "-", tags: [] },
    57: { id: 57, name: "Gem", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "-", tags: [] },
    58: { id: 58, name: "Storyteller", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "-", tags: [] },
    59: { id: 59, name: "Market", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "-", tags: [] },
    60: { id: 60, name: "Altar", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "-", tags: [] },
};

/** Religion 심볼 ID 목록 (Shrine, Totem, Offering + 4대 교리 심볼) */
export const RELIGION_SYMBOL_IDS = new Set([12, 16, 17, 31, 32, 33, 34]);

/** 종교 교리 심볼 ID 목록 (패널티 체크용) */
export const RELIGION_DOCTRINE_IDS = new Set([31, 32, 33, 34]);

/** Knowledge를 생산하는 심볼 ID 목록 */
export const KNOWLEDGE_PRODUCING_IDS = new Set([10, 16, 17, 25, 26, 38, 39]);

/** Gold를 생산하는 심볼 ID 목록 */
export const GOLD_PRODUCING_IDS = new Set([6, 7, 8, 15, 22]);

export const getSymbolColor = (era: Era): number => {
    switch (era) {
        case Era.SPECIAL: return 16777215; // 백색
        case Era.ANCIENT: return 9127187; // 기존 고대
        case Era.MEDIEVAL: return 16347926; // 오렌지/중세
        case Era.MODERN: return 3900150; // 파랑/현대
        default: return 0x9ca3af;
    }
};

export const getSymbolColorHex = (era: Era): string => {
    switch (era) {
        case Era.SPECIAL: return '#ffffff';
        case Era.ANCIENT: return '#8B4513';
        case Era.MEDIEVAL: return '#f97316';
        case Era.MODERN: return '#3b82f6';
        default: return '#9ca3af';
    }
};
