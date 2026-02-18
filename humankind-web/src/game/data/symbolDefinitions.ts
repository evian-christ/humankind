export enum SymbolType {
    FRIENDLY = 0,
    ENEMY = 1,
    COMBAT = 2
}

export enum Era {
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
 * Symbols_v4.csv 기반 심볼 정의 (50개)
 * 스프라이트: 001~030.png 존재, 나머지는 빈 문자열 (점선 박스+이름 표시)
 */
/**
 * 스프라이트 매핑 (이전 심볼 엑셀 id 기준):
 *   001.png=Wheat, 002.png=Rice, 003.png=Fish, 005.png=Banana,
 *   011.png=Cow(→Cattle), 013.png=Library,
 *   029.png=Campfire
 *   그 외 이전 스프라이트는 새 CSV v4 심볼과 매치되지 않으므로 비워둠.
 */
export const SYMBOLS: Record<number, SymbolDefinition> = {
    // ── Era 1: Ancient ──
    1:  { id: 1,  name: "Wheat",          era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food.",                                                                          sprite: "001.png" },
    2:  { id: 2,  name: "Rice",           era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every 4 spins: +10 Food.",                                                                      sprite: "002.png" },
    3:  { id: 3,  name: "Cattle",         era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food. +2 Food per adjacent Cattle.",                                              sprite: "011.png" },
    4:  { id: 4,  name: "Banana",         era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +3 Food. Destroyed after 6 spins.",                                                  sprite: "005.png" },
    5:  { id: 5,  name: "Fish",           era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food. +3 Food if adjacent to Coast.",                                             sprite: "003.png" },
    6:  { id: 6,  name: "Coast",          era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food. +1 Gold per adjacent Coast.",                                               sprite: "" },
    7:  { id: 7,  name: "Stone",          era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food, +1 Gold.",                                                                  sprite: "" },
    8:  { id: 8,  name: "Copper",         era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Gold. If exactly 3 Copper on the board: all Copper produce ×3.",                   sprite: "" },
    9:  { id: 9,  name: "Granary",        era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food. Adjacent Wheat and Rice produce double.",                                    sprite: "" },
    10: { id: 10, name: "Monument",       era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Knowledge. +1 Food per adjacent symbol.",                                         sprite: "" },
    15: { id: 15, name: "Palace",         era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +3 Food, +1 Gold. +1 Food per City on the board.",                                    sprite: "" },
    16: { id: 16, name: "Shrine",         era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food, +1 Knowledge. +2 Food if adjacent to any Religion symbol.",                  sprite: "" },
    17: { id: 17, name: "Plantation",     era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food. If adjacent to Banana: +4 Food and Banana's destroy timer resets.",          sprite: "" },
    18: { id: 18, name: "Pasture",        era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food. Adjacent Cattle and Horse produce +2 extra Food.",                           sprite: "pasture.png" },
    19: { id: 19, name: "Quarry",         era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food. If adjacent to Stone: +3 Gold. If adjacent to Copper: +2 Gold.",             sprite: "" },
    20: { id: 20, name: "Totem",          era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food per Religion symbol anywhere on the board.",                                  sprite: "" },
    21: { id: 21, name: "Offering",       era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: sacrifice 5 Food → +4 Knowledge. If you can't pay: does nothing.",                    sprite: "" },
    22: { id: 22, name: "Omen",           era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: 50% chance +6 Food, 50% chance -2 Food.",                                             sprite: "" },
    23: { id: 23, name: "Campfire",       era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food. Destroyed after 10 spins. All symbols that were ever adjacent gain permanent +1 Food.", sprite: "029.png" },
    24: { id: 24, name: "Pottery",        era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: stores +2 Food internally. On destroy: releases stored Food ×2.",                     sprite: "" },
    25: { id: 25, name: "Hunting Ground", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food. If adjacent to Forest: +3 Food. Destroys adjacent Deer and gains +6 Food per Deer.", sprite: "" },
    26: { id: 26, name: "Forest",         era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "+1 Food. On destroy: +20 Food.",                                                                 sprite: "" },
    27: { id: 27, name: "Deer",           era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food. Every 10 spins: adds another Deer to a random empty slot on the board.",      sprite: "" },
    28: { id: 28, name: "Oasis",          era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +3 Food. +2 Food per adjacent empty slot.",                                           sprite: "" },
    29: { id: 29, name: "Flood Plain",    era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +3 Food. 20% chance each spin: adjacent symbols produce double this spin.",            sprite: "" },
    30: { id: 30, name: "Tribal Village", era: Era.ANCIENT, symbol_type: SymbolType.FRIENDLY, description: "On appear: immediately adds 2 random Era 1 symbols to your collection. Then destroys self.",      sprite: "" },

    // ── Era 2: Classical ──
    31: { id: 31, name: "Horse",          era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food, +1 Gold. If adjacent to Pasture: +4 Food extra.",                          sprite: "" },
    32: { id: 32, name: "Iron",           era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food, +2 Gold.",                                                              sprite: "" },
    34: { id: 34, name: "Galley",         era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Gold. +2 Food per adjacent Coast. Every 8 spins: adds a random symbol.",         sprite: "" },
    35: { id: 35, name: "Library",        era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +3 Knowledge. +2 Knowledge if adjacent to Scroll.",                                 sprite: "013.png" },
    36: { id: 36, name: "Scroll",         era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Knowledge. +1 Knowledge per adjacent symbol that produces Knowledge.",            sprite: "" },
    37: { id: 37, name: "Market",         era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Gold per adjacent symbol. Every 5 spins: converts 8 Gold into a random Era 2 symbol.", sprite: "" },
    38: { id: 38, name: "Tax Collector",  era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +3 Gold. Adjacent symbols produce -1 Food this spin.",                              sprite: "" },
    39: { id: 39, name: "Merchant",       era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Gold. +1 Gold per unique resource type adjacent.",                                sprite: "" },
    40: { id: 40, name: "Vineyard",       era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food, +2 Gold. Every 6 spins: produces a Wine symbol. Wine gives +5 Gold then destroys self.", sprite: "" },
    41: { id: 41, name: "Oracle",         era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Knowledge. Reveals next symbol choices before spinning.",                         sprite: "" },
    43: { id: 43, name: "Aqueduct",       era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food. Adjacent food-producing symbols produce +2 extra Food.",                    sprite: "" },
    44: { id: 44, name: "Forge",          era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food, +1 Gold. If adjacent to Copper or Iron: +4 Gold. If adjacent to Stone: +2 Food.", sprite: "" },
    45: { id: 45, name: "Great Wall",     era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +4 Food, +2 Knowledge. Prevents all symbols in the same row from being destroyed.",  sprite: "" },
    46: { id: 46, name: "Caravan",        era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Gold per symbol on the entire board that produces Gold.",                         sprite: "" },
    47: { id: 47, name: "Pantheon",       era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food, +2 Knowledge. If no Religion symbol on the board: +5 Food extra.",          sprite: "" },
    48: { id: 48, name: "Harbor",         era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Gold. Every 6 spins: adds a random symbol to your collection.",                   sprite: "" },
    50: { id: 50, name: "Arena",          era: Era.CLASSICAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Food. Whenever any symbol is destroyed this spin: +4 Food, +2 Gold.",             sprite: "" },
};

/** Religion 심볼 ID 목록 (Shrine, Totem, Offering, Pantheon 등 종교 관련) */
export const RELIGION_SYMBOL_IDS = new Set([16, 20, 21, 47]);

/** Knowledge를 생산하는 심볼 ID 목록 */
export const KNOWLEDGE_PRODUCING_IDS = new Set([10, 16, 21, 35, 36, 41, 45, 47]);

/** Gold를 생산하는 심볼 ID 목록 */
export const GOLD_PRODUCING_IDS = new Set([6, 7, 8, 15, 19, 31, 32, 34, 37, 38, 39, 40, 44, 46, 48]);


/** Wine 심볼 (Vineyard가 생성하는 임시 심볼 - 현재 정의에 없으므로 나중에 추가) */
export const WINE_SYMBOL_ID = -1; // placeholder

export const getSymbolColor = (era: Era): number => {
    switch (era) {
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
        case Era.ANCIENT: return '#8B4513';
        case Era.CLASSICAL: return '#22c55e';
        case Era.MEDIEVAL: return '#f97316';
        case Era.INDUSTRIAL: return '#3b82f6';
        case Era.MODERN: return '#eab308';
        default: return '#9ca3af';
    }
};
