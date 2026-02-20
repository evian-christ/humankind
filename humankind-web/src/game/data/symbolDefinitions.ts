export enum SymbolType {
    FRIENDLY = 0,
    ENEMY = 1,
    COMBAT = 2
}

export enum Era {
    RELIGION = 0,
    ANCIENT = 1,
    CLASSICAL = 2,
    MEDIEVAL = 3,
    INDUSTRIAL = 4,
    MODERN = 5
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
}

/**
 * Symbols_v4.csv 기반 심볼 정의 (ID 1~36)
 * Era 1 (Ancient): ID 1~21, 35~36
 * Era 2 (Classical): ID 22~30
 * Religion: ID 31~34
 */
export const SYMBOLS: Record<number, SymbolDefinition> = {
    // ── Era 1: Ancient ──
    1:  { id: 1,  name: "Wheat",         era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food.",                                                                        sprite: "001.png" },
    2:  { id: 2,  name: "Rice",          era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every 4 spins: +10 Food.",                                                                    sprite: "002.png" },
    3:  { id: 3,  name: "Cattle",        era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food. +2 Food per adjacent Cattle.",                                            sprite: "011.png" },
    4:  { id: 4,  name: "Banana",        era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +3 Food. Destroyed after 6 spins.",                                                sprite: "005.png" },
    5:  { id: 5,  name: "Fish",          era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food. +3 Food if adjacent to Coast.",                                           sprite: "003.png" },
    6:  { id: 6,  name: "Coast",         era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food. +1 Gold per adjacent Coast.",                                             sprite: "" },
    7:  { id: 7,  name: "Stone",         era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food, +1 Gold.",                                                                sprite: "" },
    8:  { id: 8,  name: "Copper",        era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Gold. If exactly 3 Copper on the board: all Copper produce ×3.",               sprite: "" },
    9:  { id: 9,  name: "Granary",       era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food. Adjacent Wheat and Rice produce double.",                                  sprite: "" },
    10: { id: 10, name: "Monument",      era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Knowledge.",                                                                    sprite: "" },
    11: { id: 11, name: "Oasis",         era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +3 Food. +2 Food per adjacent empty slot.",                                        sprite: "" },
    12: { id: 12, name: "Shrine",        era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food. +2 Food if adjacent to any Religion symbol.",                             sprite: "" },
    13: { id: 13, name: "Plantation",    era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food. If adjacent to Banana: +4 Food and Banana's destroy timer resets.",      sprite: "" },
    14: { id: 14, name: "Pasture",       era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food. Adjacent Cattle and Horse produce +2 extra Food.",                       sprite: "pasture.png" },
    15: { id: 15, name: "Quarry",        era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food. If adjacent to Stone: +3 Gold. If adjacent to Copper: +2 Gold.",         sprite: "" },
    16: { id: 16, name: "Totem",         era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food per Religion symbol anywhere on the board.",                              sprite: "" },
    17: { id: 17, name: "Offering",      era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: -5 Food, +3 Knowledge.",                                                          sprite: "" },
    18: { id: 18, name: "Omen",          era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: 50% chance +5 Food, 50% chance -3 Food.",                                         sprite: "" },
    19: { id: 19, name: "Campfire",      era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food. After 10 spins: destroyed and adjacent symbols produce double food this spin.", sprite: "029.png" },
    20: { id: 20, name: "Pottery",       era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: stores +2 Food internally. On destroy: releases stored Food ×2.",                 sprite: "" },
    21: { id: 21, name: "Tribal Village",era: Era.ANCIENT,   symbol_type: SymbolType.FRIENDLY, description: "After 1 spin: immediately adds 2 random Ancient symbols. Then destroys self.",                sprite: "" },

    // ── Religion (era-agnostic, first appears in Classical era) ──
    31: { id: 31, name: "Christianity", era: Era.RELIGION, symbol_type: SymbolType.FRIENDLY, description: "Every spin: produces Food equal to the highest Food produced by an adjacent symbol this spin. Adjacent to a Religion symbol: -50 Food.", sprite: "015.png" },
    32: { id: 32, name: "Islam",        era: Era.RELIGION, symbol_type: SymbolType.FRIENDLY, description: "Every spin: gains Gold equal to 3× the total Knowledge produced by adjacent symbols this spin. Adjacent to a Religion symbol: -50 Food.", sprite: "018.png" },
    33: { id: 33, name: "Buddhism",     era: Era.RELIGION, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food per empty slot on the board. Adjacent to a Religion symbol: -50 Food.", sprite: "016.png" },
    34: { id: 34, name: "Hinduism",     era: Era.RELIGION, symbol_type: SymbolType.FRIENDLY, description: "When an adjacent symbol is destroyed: +5 Knowledge and adds a copy of that symbol to your collection. Adjacent to a Religion symbol: -50 Food.", sprite: "017.png" },

    // ── Enemy Symbols ──
    35: { id: 35, name: "Barbarian",  era: Era.ANCIENT, symbol_type: SymbolType.ENEMY,  description: "Every spin: 50% chance −3 Food, 50% chance −1 Gold.", base_attack: 5, base_hp: 10, sprite: "022.png" },

    // ── Combat Symbols ──
    36: { id: 36, name: "Warrior",    era: Era.ANCIENT, symbol_type: SymbolType.COMBAT, description: "Every 10 spins: -3 Food.", base_attack: 5, base_hp: 10, sprite: "" },

    // ── Era 2: Classical ──
    22: { id: 22, name: "Horse",         era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food, +1 Gold.",                                                               sprite: "" },
    23: { id: 23, name: "Iron",          era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food, +2 Gold.",                                                               sprite: "" },
    24: { id: 24, name: "Galley",        era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Gold. +2 Food per adjacent Coast. Every 8 spins: adds a random Ancient symbol.", sprite: "" },
    25: { id: 25, name: "Library",       era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Knowledge. +2 Knowledge if adjacent to Scroll.",                               sprite: "013.png" },
    26: { id: 26, name: "Scroll",        era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Knowledge. +1 Knowledge per adjacent symbol that produces Knowledge.",         sprite: "" },
    27: { id: 27, name: "Market",        era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Gold per adjacent symbol.",                                                    sprite: "" },
    28: { id: 28, name: "Tax Collector", era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +3 Gold. Adjacent symbols produce -1 Food this spin.",                            sprite: "" },
    29: { id: 29, name: "Forge",         era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food, +1 Gold. If adjacent to Copper or Iron: +4 Gold. If adjacent to Stone: +2 Food.", sprite: "" },
    30: { id: 30, name: "Arena",         era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food. Whenever any symbol is destroyed this spin: +4 Food, +2 Gold.",          sprite: "" },
};

/** Religion 심볼 ID 목록 (Shrine, Totem, Offering + 4대 교리 심볼) */
export const RELIGION_SYMBOL_IDS = new Set([12, 16, 17, 31, 32, 33, 34]);

/** 종교 교리 심볼 ID 목록 (패널티 체크용) */
export const RELIGION_DOCTRINE_IDS = new Set([31, 32, 33, 34]);

/** Knowledge를 생산하는 심볼 ID 목록 */
export const KNOWLEDGE_PRODUCING_IDS = new Set([10, 17, 25, 26]); // Monument, Offering, Library, Scroll

/** Gold를 생산하는 심볼 ID 목록 */
export const GOLD_PRODUCING_IDS = new Set([6, 7, 8, 15, 22, 23, 24, 27, 28, 29]); // Coast, Stone, Copper, Quarry, Horse, Iron, Galley, Market, Tax Collector, Forge

export const getSymbolColor = (era: Era): number => {
    switch (era) {
        case Era.RELIGION: return 0xffffff;
        case Era.ANCIENT: return 0x8B4513;
        case Era.CLASSICAL: return 0x22c55e;
        case Era.MEDIEVAL: return 0xf97316;
        case Era.INDUSTRIAL: return 0x3b82f6;
        case Era.MODERN: return 0xeab308;
        default: return 0x9ca3af;
    }
};

export const getSymbolColorHex = (era: Era): string => {
    switch (era) {
        case Era.RELIGION: return '#ffffff';
        case Era.ANCIENT: return '#8B4513';
        case Era.CLASSICAL: return '#22c55e';
        case Era.MEDIEVAL: return '#f97316';
        case Era.INDUSTRIAL: return '#3b82f6';
        case Era.MODERN: return '#eab308';
        default: return '#9ca3af';
    }
};
