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
    description: string;
    base_attack?: number;
    base_hp?: number;
    sprite: string;
}

export const SYMBOLS: Record<number, SymbolDefinition> = {
    1:  { id: 1,  name: "Wheat",           rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Every 6 spins: +8 Food",                                                        sprite: "001.png" },
    2:  { id: 2,  name: "Rice",            rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Every 8 spins: +11 Food",                                                       sprite: "002.png" },
    3:  { id: 3,  name: "Fish",            rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "After 5 spins: +10 Food, destroyed",                                                      sprite: "003.png" },
    4:  { id: 4,  name: "Fishing Boat",    rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Every spin: destroys adjacent Fish",                                             sprite: "004.png" },
    5:  { id: 5,  name: "Banana",          rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food\nAfter 10 spins: permanently +2 Food",                       sprite: "005.png" },
    6:  { id: 6,  name: "Sugar",           rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Per adjacent Sugar: +1 Food",                                                    sprite: "006.png" },
    7:  { id: 7,  name: "Mine",            rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food\nEvery spin: 1% chance to yield Coal",                       sprite: "007.png" },
    8:  { id: 8,  name: "Coal",            rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food\nFuel for Industrial Revolution",                            sprite: "008.png" },
    9:  { id: 9,  name: "Industrial Rev.", rarity: Rarity.INDUSTRIAL,  symbol_type: SymbolType.FRIENDLY, description: "Per adjacent Coal: +1 Food, Coal consumed",                                      sprite: "009.png" },
    10: { id: 10, name: "Revolution",      rarity: Rarity.INDUSTRIAL,  symbol_type: SymbolType.FRIENDLY, description: "Every spin: destroys adjacent symbols\nPer destroyed symbol: replaced with random", sprite: "010.png" },
    11: { id: 11, name: "Cow",             rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food\nPer adjacent Cow: +1 Food",                                 sprite: "011.png" },
    12: { id: 12, name: "Sheep",           rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food\nEvery 10 spins: +1 Gold",                                   sprite: "012.png" },
    13: { id: 13, name: "Library",         rarity: Rarity.CLASSICAL,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 EXP",                                                             sprite: "013.png" },
    14: { id: 14, name: "Ritual",          rarity: Rarity.CLASSICAL,   symbol_type: SymbolType.FRIENDLY, description: "After 3 spins: +3 EXP, destroyed",                                               sprite: "014.png" },
    15: { id: 15, name: "Protestantism",   rarity: Rarity.MEDIEVAL,    symbol_type: SymbolType.FRIENDLY, description: "Per adjacent symbol: +2 Food\nEvery spin: +1 EXP\nAdjacent different religion: -50 Food each", sprite: "015.png" },
    16: { id: 16, name: "Buddhism",        rarity: Rarity.MEDIEVAL,    symbol_type: SymbolType.FRIENDLY, description: "Per adjacent empty slot: +3 Food\nAdjacent different religion: -50 Food each",    sprite: "016.png" },
    17: { id: 17, name: "Hinduism",        rarity: Rarity.MEDIEVAL,    symbol_type: SymbolType.FRIENDLY, description: "Every spin: +5 Food\nEvery spin: +1 EXP\nAdjacent different religion: -50 Food each", sprite: "017.png" },
    18: { id: 18, name: "Islam",           rarity: Rarity.MEDIEVAL,    symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 EXP\nAdjacent different religion: -50 Food each",                  sprite: "018.png" },
    19: { id: 19, name: "Temple",          rarity: Rarity.CLASSICAL,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food\nIf isolated: +5 Food\nPer adjacent religion: +2 Food",      sprite: "019.png" },
    20: { id: 20, name: "Sail",            rarity: Rarity.CLASSICAL,   symbol_type: SymbolType.FRIENDLY, description: "After 5 adjacent Compass: +25 Food, destroyed",                                  sprite: "020.png" },
    21: { id: 21, name: "Compass",         rarity: Rarity.CLASSICAL,   symbol_type: SymbolType.FRIENDLY, description: "After 5 adjacent Sail: +25 Food, destroyed",                                     sprite: "021.png" },
    22: { id: 22, name: "Barbarian",       rarity: Rarity.ANCIENT,     symbol_type: SymbolType.ENEMY,    description: "HP: 10\nBlocks slot",                                                            sprite: "022.png", base_hp: 10 },
    23: { id: 23, name: "Warrior",         rarity: Rarity.ANCIENT,     symbol_type: SymbolType.COMBAT,   description: "Attack: 2\nAttacks: 5",                                                          sprite: "023.png", base_attack: 2 },
    24: { id: 24, name: "Swordsman",       rarity: Rarity.CLASSICAL,   symbol_type: SymbolType.COMBAT,   description: "Attack: 4\nAttacks: 4",                                                          sprite: "024.png", base_attack: 4 },
    25: { id: 25, name: "Knight",          rarity: Rarity.MEDIEVAL,    symbol_type: SymbolType.COMBAT,   description: "Attack: 6\nAttacks: 3",                                                          sprite: "025.png", base_attack: 6 },
    26: { id: 26, name: "Cavalry",         rarity: Rarity.MEDIEVAL,    symbol_type: SymbolType.COMBAT,   description: "Attack: 8\nAttacks: 3",                                                          sprite: "026.png", base_attack: 8 },
    27: { id: 27, name: "Infantry",        rarity: Rarity.INDUSTRIAL,  symbol_type: SymbolType.COMBAT,   description: "Attack: 10\nAttacks: 2",                                                         sprite: "027.png", base_attack: 10 },
    28: { id: 28, name: "AGI",             rarity: Rarity.MODERN,      symbol_type: SymbolType.FRIENDLY, description: "On board: Victory!",                                                              sprite: "028.png" },
    29: { id: 29, name: "Campfire",        rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Every 5 spins: +5 Food\nOn evolve: becomes Town",                                 sprite: "029.png" },
    30: { id: 30, name: "Town",            rarity: Rarity.CLASSICAL,   symbol_type: SymbolType.FRIENDLY, description: "Every 3 spins: +5 Food\nOn evolve: becomes City",                                 sprite: "030.png" },
    31: { id: 31, name: "City",            rarity: Rarity.MEDIEVAL,    symbol_type: SymbolType.FRIENDLY, description: "Every spin: +5 Food",                                                             sprite: "" },
    32: { id: 32, name: "Wine",            rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Every spin: +5 Food\nEvery spin: -1 EXP\nAfter 3 spins: destroyed",               sprite: "" },
    33: { id: 33, name: "Taxation",        rarity: Rarity.CLASSICAL,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: +2 Gold\nAfter 3 spins: destroyed",                                   sprite: "" },
    34: { id: 34, name: "Merchant",        rarity: Rarity.CLASSICAL,   symbol_type: SymbolType.FRIENDLY, description: "Every spin: -3 Food\nPer adjacent symbol: +1 Gold",                               sprite: "" },
    35: { id: 35, name: "Guild",           rarity: Rarity.MEDIEVAL,    symbol_type: SymbolType.FRIENDLY, description: "Every spin: -5 Food\nPer adjacent empty slot: +5 Gold",                            sprite: "" },
    36: { id: 36, name: "Forest",          rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food\nOn destroy: +30 Food",                                       sprite: "" },
    37: { id: 37, name: "Forest Clearing", rarity: Rarity.ANCIENT,     symbol_type: SymbolType.FRIENDLY, description: "Every spin: +1 Food\nEvery spin: destroys adjacent Forest",                       sprite: "" },
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
