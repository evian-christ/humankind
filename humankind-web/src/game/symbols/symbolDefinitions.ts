export enum Rarity {
    ANCIENT = 1,
    CLASSICAL = 2,
    MEDIEVAL = 3,
    INDUSTRIAL = 4,
    MODERN = 5,
}

export enum SymbolType {
    FRIENDLY = 0,
    ENEMY = 1,
    COMBAT = 2,
}

export type SymbolDefinition = {
    id: number;
    name: string;
    iconPath: string;
    rarity: Rarity;
    symbolType: SymbolType;
    passiveFood: number;
    effects: any[];
    effectText: string;
    baseAttack?: number;
    baseHp?: number;
};

export const SYMBOLS: SymbolDefinition[] = [
    { id: 1, name: "Wheat", iconPath: "/symbols/001.png", rarity: Rarity.ANCIENT, symbolType: SymbolType.FRIENDLY, passiveFood: 0, effects: [], effectText: "Provide 8 food every 6 turns." },
    { id: 2, name: "Rice", iconPath: "/symbols/002.png", rarity: Rarity.ANCIENT, symbolType: SymbolType.FRIENDLY, passiveFood: 0, effects: [], effectText: "Provide 10 food every 8 turns." },
    { id: 3, name: "Fish", iconPath: "/symbols/003.png", rarity: Rarity.ANCIENT, symbolType: SymbolType.FRIENDLY, passiveFood: 0, effects: [], effectText: "Destroyed when spun. Provides 15 food." },
    { id: 11, name: "Cow", iconPath: "/symbols/011.png", rarity: Rarity.ANCIENT, symbolType: SymbolType.FRIENDLY, passiveFood: 0, effects: [], effectText: "Provide 10 food every 7 turns." },
    { id: 12, name: "Sheep", iconPath: "/symbols/012.png", rarity: Rarity.ANCIENT, symbolType: SymbolType.FRIENDLY, passiveFood: 0, effects: [], effectText: "Provide 8 food and 5 gold every 6 turns." },
];

export function getRarityName(rarity: Rarity): string {
    switch (rarity) {
        case Rarity.ANCIENT: return "Ancient";
        case Rarity.CLASSICAL: return "Classical";
        case Rarity.MEDIEVAL: return "Medieval";
        case Rarity.INDUSTRIAL: return "Industrial";
        case Rarity.MODERN: return "Modern";
        default: return "Unknown";
    }
}

export function getRarityColor(rarity: Rarity): string {
    switch (rarity) {
        case Rarity.ANCIENT: return "#ffffff";
        case Rarity.CLASSICAL: return "#22c55e";
        case Rarity.MEDIEVAL: return "#3b82f6";
        case Rarity.INDUSTRIAL: return "#a855f7";
        case Rarity.MODERN: return "#fbbf24";
        default: return "#9ca3af";
    }
}
