import { create } from 'zustand';
import { GameState, SymbolInstance, BOARD_WIDTH, BOARD_HEIGHT } from '../types';

interface GameStore extends GameState {
    // Actions
    addFood: (amount: number) => void;
    addGold: (amount: number) => void;
    addExp: (amount: number) => void;
    setBoard: (board: (SymbolInstance | null)[][]) => void;
    setProcessing: (isProcessing: boolean) => void;
    incrementTurn: () => void;
}

// Initialize empty board
const createEmptyBoard = (): (SymbolInstance | null)[][] => {
    return Array(BOARD_WIDTH).fill(null).map(() =>
        Array(BOARD_HEIGHT).fill(null)
    );
};

export const useGameStore = create<GameStore>((set) => ({
    // Initial state
    food: 100,
    gold: 0,
    exp: 0,
    level: 1,
    turn: 0,
    board: createEmptyBoard(),
    playerSymbols: [],
    isProcessing: false,

    // Actions
    addFood: (amount) => set((state) => ({ food: state.food + amount })),
    addGold: (amount) => set((state) => ({ gold: state.gold + amount })),
    addExp: (amount) => set((state) => ({ exp: state.exp + amount })),
    setBoard: (board) => set({ board }),
    setProcessing: (isProcessing) => set({ isProcessing }),
    incrementTurn: () => set((state) => ({ turn: state.turn + 1 })),
}));
