export enum SymbolType {
    FRIENDLY = 0,
    ENEMY = 1,
    COMBAT = 2
}

export enum Rarity {
    ANCIENT = 1,
    CLASSICAL = 2,
    MEDIEVAL = 3,
    INDUSTRIAL = 4,
    MODERN = 5
}

export interface SymbolDefinition {
    id: number;
    name: string;
    rarity: Rarity;
    symbol_type: SymbolType;
    passive_food: number;
    effect_text: string;
    base_attack?: number;
    base_hp?: number;
    sprite: string;
}

export const SYMBOLS: Record<number, SymbolDefinition> = {
    1: { id: 1, name: "Wheat", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "Provide 8 food every 6 turns.", sprite: "001.png" },
    2: { id: 2, name: "Rice", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "Provide 11 food every 8 turns.", sprite: "002.png" },
    3: { id: 3, name: "Fish", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "Destroyed after 5 turns. +10 food on destruction.", sprite: "003.png" },
    4: { id: 4, name: "Fishing Boat", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "Destroy nearby Fish.", sprite: "004.png" },
    5: { id: 5, name: "Banana", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "+1 food, permanently +2 after 10 placements.", sprite: "005.png" },
    6: { id: 6, name: "Sugar", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "+1 food for each nearby Sugar.", sprite: "006.png" },
    7: { id: 7, name: "Mine", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 1, effect_text: "1% chance to yield Coal.", sprite: "007.png" },
    8: { id: 8, name: "Coal", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 1, effect_text: "Fuel for Industrial Revolution.", sprite: "008.png" },
    9: { id: 9, name: "Industrial Rev.", rarity: Rarity.INDUSTRIAL, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "Consume nearby Coal. +1 food per coal consumed.", sprite: "009.png" },
    10: { id: 10, name: "Revolution", rarity: Rarity.INDUSTRIAL, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "Destroy nearby symbols and replace with random.", sprite: "010.png" },
    11: { id: 11, name: "Cow", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 1, effect_text: "+1 food if adjacent to another Cow.", sprite: "011.png" },
    12: { id: 12, name: "Sheep", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 1, effect_text: "+1 Gold every 10 turns.", sprite: "012.png" },
    13: { id: 13, name: "Library", rarity: Rarity.CLASSICAL, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "+1 EXP.", sprite: "013.png" },
    14: { id: 14, name: "Ritual", rarity: Rarity.CLASSICAL, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "Destroyed after 3 turns. +3 EXP.", sprite: "014.png" },
    15: { id: 15, name: "Protestantism", rarity: Rarity.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "+2 food/symbol, +1 EXP. -50 near religion.", sprite: "015.png" },
    16: { id: 16, name: "Buddhism", rarity: Rarity.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "+3 food/empty slot. -50 near religion.", sprite: "016.png" },
    17: { id: 17, name: "Hinduism", rarity: Rarity.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, passive_food: 5, effect_text: "+1 EXP. -50 near religion.", sprite: "017.png" },
    18: { id: 18, name: "Islam", rarity: Rarity.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "+2 EXP. -50 near religion.", sprite: "018.png" },
    19: { id: 19, name: "Temple", rarity: Rarity.CLASSICAL, symbol_type: SymbolType.FRIENDLY, passive_food: 1, effect_text: "+5 if isolated, +2 near religion.", sprite: "019.png" },
    20: { id: 20, name: "Sail", rarity: Rarity.CLASSICAL, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "Destroyed near Compass x5. +25 Food.", sprite: "020.png" },
    21: { id: 21, name: "Compass", rarity: Rarity.CLASSICAL, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "Destroyed near Sail x5. +25 Food.", sprite: "021.png" },
    22: { id: 22, name: "Barbarian", rarity: Rarity.ANCIENT, symbol_type: SymbolType.ENEMY, passive_food: 0, base_hp: 10, effect_text: "Enemy unit.", sprite: "022.png" },
    23: { id: 23, name: "Warrior", rarity: Rarity.ANCIENT, symbol_type: SymbolType.COMBAT, passive_food: 0, base_attack: 2, effect_text: "Combat unit. 5 attacks.", sprite: "023.png" },
    24: { id: 24, name: "Swordsman", rarity: Rarity.CLASSICAL, symbol_type: SymbolType.COMBAT, passive_food: 0, base_attack: 4, effect_text: "Combat unit. 4 attacks.", sprite: "024.png" },
    25: { id: 25, name: "Knight", rarity: Rarity.MEDIEVAL, symbol_type: SymbolType.COMBAT, passive_food: 0, base_attack: 6, effect_text: "Combat unit. 3 attacks.", sprite: "025.png" },
    26: { id: 26, name: "Cavalry", rarity: Rarity.MEDIEVAL, symbol_type: SymbolType.COMBAT, passive_food: 0, base_attack: 8, effect_text: "Combat unit. 3 attacks.", sprite: "026.png" },
    27: { id: 27, name: "Infantry", rarity: Rarity.INDUSTRIAL, symbol_type: SymbolType.COMBAT, passive_food: 0, base_attack: 10, effect_text: "Combat unit. 2 attacks.", sprite: "027.png" },
    28: { id: 28, name: "AGI", rarity: Rarity.MODERN, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "Victory condition.", sprite: "028.png" },
    29: { id: 29, name: "Campfire", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "+5 Food every 5 turns. Evolves to Town.", sprite: "029.png" },
    30: { id: 30, name: "Town", rarity: Rarity.CLASSICAL, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "+5 Food every 3 turns. Evolves to City.", sprite: "030.png" },
    31: { id: 31, name: "City", rarity: Rarity.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, passive_food: 5, effect_text: "+5 Food passive.", sprite: "028.png" },
    32: { id: 32, name: "Wine", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 5, effect_text: "+5 Food, -1 EXP. Destroyed in 3 turns.", sprite: "029.png" },
    33: { id: 33, name: "Taxation", rarity: Rarity.CLASSICAL, symbol_type: SymbolType.FRIENDLY, passive_food: 0, effect_text: "+2 Gold for 3 turns, then destroyed.", sprite: "030.png" },
    34: { id: 34, name: "Merchant", rarity: Rarity.CLASSICAL, symbol_type: SymbolType.FRIENDLY, passive_food: -3, effect_text: "+1 Gold per nearby symbol.", sprite: "028.png" },
    35: { id: 35, name: "Guild", rarity: Rarity.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, passive_food: -5, effect_text: "+5 Gold per nearby empty slot.", sprite: "029.png" },
    36: { id: 36, name: "Forest", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 1, effect_text: "+30 Food when destroyed.", sprite: "030.png" },
    37: { id: 37, name: "Forest Clearing", rarity: Rarity.ANCIENT, symbol_type: SymbolType.FRIENDLY, passive_food: 1, effect_text: "Destroys nearby Forest.", sprite: "029.png" },
};

export const getSymbolColor = (rarity: Rarity): number => {
    switch (rarity) {
        case Rarity.ANCIENT: return 0xffffff;
        case Rarity.CLASSICAL: return 0x22c55e;
        case Rarity.MEDIEVAL: return 0x3b82f6;
        case Rarity.INDUSTRIAL: return 0xa855f7;
        case Rarity.MODERN: return 0xeab308;
        default: return 0x9ca3af;
    }
};

export const getSymbolColorHex = (rarity: Rarity): string => {
    switch (rarity) {
        case Rarity.ANCIENT: return '#ffffff';
        case Rarity.CLASSICAL: return '#22c55e';
        case Rarity.MEDIEVAL: return '#3b82f6';
        case Rarity.INDUSTRIAL: return '#a855f7';
        case Rarity.MODERN: return '#eab308';
        default: return '#9ca3af';
    }
};
