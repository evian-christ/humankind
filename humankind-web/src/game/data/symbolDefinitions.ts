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
    31: { id: 31, name: "Christianity", era: Era.SPECIAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: produces Food equal to the highest Food produced by an adjacent symbol this spin. Adjacent to a Religion symbol: -500 Food.", sprite: "031.png", tags: ["religion"] },
    32: { id: 32, name: "Islam", era: Era.SPECIAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: gains Gold equal to 3× the total Knowledge produced by adjacent symbols this spin. Adjacent to a Religion symbol: -500 Food.", sprite: "032.png", tags: ["religion"] },
    33: { id: 33, name: "Buddhism", era: Era.SPECIAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +20 Food per empty slot on the board. Adjacent to a Religion symbol: -500 Food.", sprite: "033.png", tags: ["religion"] },
    34: { id: 34, name: "Hinduism", era: Era.SPECIAL, symbol_type: SymbolType.FRIENDLY, description: "When an adjacent symbol is destroyed: +50 Knowledge and adds a copy of that symbol to your collection. Adjacent to a Religion symbol: -500 Food.", sprite: "034.png", tags: ["religion"] },

    // ── Ancient ──
    1: { id: 1, name: "Wheat", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +20 Food.", sprite: "001.png", tags: ["food"] },
    2: { id: 2, name: "Rice", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every 4 spins: +100 Food.", sprite: "002.png", tags: ["food"] },
    3: { id: 3, name: "Cattle", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +10 Food. +20 Food per adjacent Cattle.", sprite: "003.png", tags: ["food"] },
    4: { id: 4, name: "Banana", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +20 Food. Destroyed after 6 spins.", sprite: "004.png", tags: ["food"] },
    5: { id: 5, name: "Fish", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +10 Food. +30 Food if adjacent to Sea.", sprite: "005.png", tags: ["food"] },
    6: { id: 6, name: "Sea", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +10 Food. +10 Gold per adjacent Sea.", sprite: "006.png", tags: [] },
    7: { id: 7, name: "Stone", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +10 Food, +10 Gold.", sprite: "007.png", tags: ["mineral"] },
    8: { id: 8, name: "Copper", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +20 Gold. If exactly 3 Copper on the board: all Copper produce ×3.", sprite: "008.png", tags: ["mineral"] },
    9: { id: 9, name: "Farm", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +20 Food. Adjacent Wheat and Rice produce double (triple with Irrigation).", sprite: "009.png", tags: [] },
    10: { id: 10, name: "Monument", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +5 Knowledge.", sprite: "010.png", tags: [] },
    11: { id: 11, name: "Oasis", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +7 Food per adjacent empty slot.", sprite: "011.png", tags: [] },
    12: { id: 12, name: "Oral Tradition", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Destroyed after 10 spins. On destroy: +10 Knowledge per adjacent symbol.", sprite: "012.png", tags: [] },
    13: { id: 13, name: "Tropical Farm", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +10 Food. If adjacent to Banana: Banana's destroy timer resets.", sprite: "013.png", tags: [] },
    14: { id: 14, name: "Pasture", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +10 Food. Adjacent Cattle and Horse produce +20 extra Food.", sprite: "014.png", tags: [] },
    15: { id: 15, name: "Quarry", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +10 Food. If adjacent to Stone: +30 Gold. If adjacent to Copper: +20 Gold.", sprite: "015.png", tags: [] },
    16: { id: 16, name: "Totem", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +20 Knowledge if placed in a corner.", sprite: "016.png", tags: [] },
    17: { id: 17, name: "Offering", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: -10 Food, +10 Knowledge.", sprite: "017.png", tags: [] },
    18: { id: 18, name: "Omen", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: 50% chance +40 Food, 50% chance -10 Food.", sprite: "018.png", tags: [] },
    19: { id: 19, name: "Campfire", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +10 Food. After 10 spins: destroyed and adjacent symbols produce double Food this spin.", sprite: "019.png", tags: [] },
    20: { id: 20, name: "Pottery", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: stores +30 Food internally. On destroy: releases all stored Food.", sprite: "020.png", tags: [] },
    21: { id: 21, name: "Tribal Village", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "After 1 spin: immediately adds 2 random Ancient symbols. Then destroys self.", sprite: "021.png", tags: [] },
    22: { id: 22, name: "Merchant", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Not in corner: stores gold equal to highest adjacent food prod. In corner: gains stored gold.", sprite: "022.png", tags: ["expert"] },
    24: { id: 24, name: "Crab", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +30 Food if adjacent to Sea.", sprite: "024.png", tags: [] },
    25: { id: 25, name: "Library", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +5 Knowledge.", sprite: "025.png", tags: [] },
    26: { id: 26, name: "Pearl", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +50 Gold if adjacent to Sea.", sprite: "026.png", tags: [] },

    35: { id: 35, name: "Warrior", era: Era.ANCIENT, symbol_type: SymbolType.COMBAT, description: "Ancient era melee unit.", base_attack: 5, base_hp: 10, sprite: "036.png", tags: ["melee"] },
    37: { id: 37, name: "Glowing Amber", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +0 Food. After 3 spins: destroyed and opens relic selection.", sprite: "037.png", tags: [] },
    38: { id: 38, name: "Stargazer", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +3 Knowledge per empty slot.", sprite: "038.png", tags: ["expert"] },

    39: { id: 39, name: "Stone Tablet", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +5 Knowledge per relic owned.", sprite: "039.png", tags: [] },
    36: { id: 36, name: "Archer", era: Era.ANCIENT, symbol_type: SymbolType.COMBAT, description: "Ancient era ranged unit.", base_attack: 3, base_hp: 5, sprite: "040.png", tags: ["ranged"] },
    23: { id: 23, name: "Horse", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +10 Food, +10 Gold.", sprite: "023.png", tags: [] },

    // ── Ancient Package Unlocks (Placeholders) ──
    51: { id: 51, name: "Bear", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "051.png", tags: [] },
    52: { id: 52, name: "Bronze", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "052.png", tags: [] },
    53: { id: 53, name: "Spearman", era: Era.ANCIENT, symbol_type: SymbolType.COMBAT, description: "To be implemented.", base_attack: 4, base_hp: 12, sprite: "053.png", tags: ["melee"] },
    54: { id: 54, name: "Boat", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "054.png", tags: [] },
    55: { id: 55, name: "Shaman", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "055.png", tags: [] },
    56: { id: 56, name: "Loom", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "056.png", tags: [] },
    57: { id: 57, name: "Gem", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "057.png", tags: [] },
    58: { id: 58, name: "Storyteller", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "058.png", tags: [] },
    59: { id: 59, name: "Market", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "059.png", tags: [] },
    60: { id: 60, name: "Altar", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "To be implemented.", sprite: "060.png", tags: [] },
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
