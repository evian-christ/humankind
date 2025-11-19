import { create } from 'zustand';
import type { SymbolDefinition } from '../symbols/symbolDefinitions';
import { SYMBOLS } from '../symbols/symbolDefinitions';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;

export interface SymbolInstance {
    definition: SymbolDefinition;
    counter: number;
    instanceId: string;
}

interface GameState {
    food: number;
    gold: number;
    exp: number;
    level: number;
    turn: number;
    board: (SymbolInstance | null)[][];
    playerSymbols: SymbolDefinition[];
    isProcessing: boolean;

    addFood: (amount: number) => void;
    addGold: (amount: number) => void;
    addExp: (amount: number) => void;
    incrementTurn: () => void;
    setProcessing: (isProcessing: boolean) => void;
    addSymbolToCollection: (symbol: SymbolDefinition) => void;
    spinBoard: () => void;
    clearBoard: () => void;
    initializeGame: () => void;
}

const createEmptyBoard = (): (SymbolInstance | null)[][] => {
    return Array(BOARD_WIDTH).fill(null).map(() => Array(BOARD_HEIGHT).fill(null));
};

const getStartingSymbols = (): SymbolDefinition[] => {
    return [
        SYMBOLS[0],  // Wheat
        SYMBOLS[1],  // Rice
        SYMBOLS[2],  // Fish
        SYMBOLS[3],  // Cow
        SYMBOLS[4],  // Sheep
    ];
};

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

let instanceCounter = 0;
const generateInstanceId = (): string => {
    return `symbol_${Date.now()}_${instanceCounter++}`;
};

export const useGameStore = create<GameState>((set, get) => ({
    food: 100,
    gold: 0,
    exp: 0,
    level: 1,
    turn: 0,
    board: createEmptyBoard(),
    playerSymbols: getStartingSymbols(),
    isProcessing: false,

    addFood: (amount) => set((state) => ({ food: state.food + amount })),
    addGold: (amount) => set((state) => ({ gold: state.gold + amount })),
    addExp: (amount) => {
        set((state) => {
            const newExp = state.exp + amount;
            const expToNext = state.level * 100;
            if (newExp >= expToNext) {
                return {
                    exp: newExp - expToNext,
                    level: state.level + 1,
                };
            }
            return { exp: newExp };
        });
    },
    incrementTurn: () => set((state) => ({ turn: state.turn + 1 })),
    setProcessing: (isProcessing) => set({ isProcessing }),

    addSymbolToCollection: (symbol) => set((state) => ({
        playerSymbols: [...state.playerSymbols, symbol],
    })),

    spinBoard: () => {
        const state = get();
        const newBoard = createEmptyBoard();
        const shuffled = shuffleArray(state.playerSymbols);

        // Create array of all 20 possible positions
        const allPositions: Array<{ x: number, y: number }> = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                allPositions.push({ x, y });
            }
        }

        // Shuffle positions and place symbols randomly
        const shuffledPositions = shuffleArray(allPositions);

        shuffled.forEach((symbol, index) => {
            if (index < shuffledPositions.length) {
                const pos = shuffledPositions[index];
                newBoard[pos.x][pos.y] = {
                    definition: symbol,
                    counter: 0,
                    instanceId: generateInstanceId(),
                };
            }
        });

        set({ board: newBoard });
    },

    clearBoard: () => set({ board: createEmptyBoard() }),

    initializeGame: () => {
        set({
            food: 100,
            gold: 0,
            exp: 0,
            level: 1,
            turn: 0,
            board: createEmptyBoard(),
            playerSymbols: getStartingSymbols(),
            isProcessing: false,
        });
    },
}));
