// Game constants
export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;
export const CELL_SIZE = 100;
export const CELL_PADDING = 10;

// Symbol types matching Godot
export enum SymbolType {
    AGRICULTURE = 0,
    INDUSTRY = 1,
    RELIGION = 2,
    COMBAT = 3,
    ENEMY = 4,
    SETTLEMENT = 5,
    EXPLORATION = 6,
    ECONOMY = 7,
    FOREST = 8,
    ENVIRONMENT = 9,
}

// Rarity levels
export enum Rarity {
    COMMON = 0,
    UNCOMMON = 1,
    RARE = 2,
    EPIC = 3,
    LEGENDARY = 4,
}

// Position type
export interface Position {
    x: number;
    y: number;
}

// Symbol definition (matches Godot .tres structure)
export interface SymbolDefinition {
    id: number;
    name: string;
    type: SymbolType;
    rarity: Rarity;
    baseFood: number;
    baseGold: number;
    baseExp: number;
    counterMax: number;
    attackPower?: number;
    attackCount?: number;
    enemyHp?: number;
    description: string;
    iconPath: string;
}

// Symbol instance on board
export interface SymbolInstance {
    definition: SymbolDefinition;
    counter: number;
    position: Position;
    id: string; // unique instance ID
}

// Game state
export interface GameState {
    food: number;
    gold: number;
    exp: number;
    level: number;
    turn: number;
    board: (SymbolInstance | null)[][];
    playerSymbols: SymbolDefinition[];
    isProcessing: boolean;
}
