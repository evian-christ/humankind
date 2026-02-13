import { create } from 'zustand';
import { SYMBOLS, type SymbolDefinition } from '../data/symbolDefinitions';
import { processSingleSymbolEffects } from '../logic/symbolEffects';
import type { PlayerSymbolInstance } from '../types';

export { type PlayerSymbolInstance } from '../types';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;

interface GameState {
    food: number;
    gold: number;
    exp: number;
    level: number;
    turn: number;
    board: (PlayerSymbolInstance | null)[][];
    playerSymbols: SymbolDefinition[];
    isProcessing: boolean;
    lastEffects: Array<{ x: number, y: number, text: string, color: string }>;

    // Actions
    spinBoard: () => void;
    initializeGame: () => void;
}

const createEmptyBoard = (): (PlayerSymbolInstance | null)[][] => {
    return Array(BOARD_WIDTH).fill(null).map(() => Array(BOARD_HEIGHT).fill(null));
};

const getStartingSymbols = (): SymbolDefinition[] => {
    return [
        SYMBOLS[1],  // Wheat
        SYMBOLS[2],  // Rice
        SYMBOLS[3],  // Fish
        SYMBOLS[11], // Cow
        SYMBOLS[12], // Sheep
        SYMBOLS[5],  // Banana
        SYMBOLS[29], // Campfire
    ];
};

let instanceCounter = 0;
const generateInstanceId = (): string => `symbol_${Date.now()}_${instanceCounter++}`;

export const useGameStore = create<GameState>((set, get) => ({
    food: 200,
    gold: 0,
    exp: 0,
    level: 1,
    turn: 0,
    board: createEmptyBoard(),
    playerSymbols: getStartingSymbols(),
    isProcessing: false,
    lastEffects: [],

    spinBoard: () => {
        const state = get();
        if (state.isProcessing) return;

        set({ isProcessing: true, lastEffects: [] });

        // 1. Clear Board & Place Symbols
        const newBoard = createEmptyBoard();
        const shuffledSymbols = [...state.playerSymbols]
            .sort(() => Math.random() - 0.5)
            .slice(0, BOARD_WIDTH * BOARD_HEIGHT);

        const positions: { x: number, y: number }[] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                positions.push({ x, y });
            }
        }
        const shuffledPositions = positions.sort(() => Math.random() - 0.5);

        shuffledSymbols.forEach((symbol, idx) => {
            const pos = shuffledPositions[idx];
            newBoard[pos.x][pos.y] = {
                definition: symbol,
                instanceId: generateInstanceId(),
                effect_counter: 0,
                is_marked_for_destruction: false,
                remaining_attacks: symbol.base_attack ? 3 : 0,
                enemy_hp: symbol.base_hp
            };
        });

        set({ board: newBoard, turn: state.turn + 1 });

        // 2. Process Effects after a delay
        setTimeout(() => {
            const currentBoard = get().board;
            const newEffects: Array<{ x: number, y: number, text: string, color: string }> = [];
            let totalFood = 0;
            let totalExp = 0;
            let totalGold = 0;

            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const symbol = currentBoard[x][y];
                    if (symbol) {
                        const result = processSingleSymbolEffects(symbol, currentBoard, x, y);

                        if (result.food !== 0 || result.exp !== 0 || result.gold !== 0) {
                            const textParts = [];
                            if (result.food !== 0) textParts.push(`${result.food > 0 ? '+' : ''}${result.food}🍎`);
                            if (result.gold !== 0) textParts.push(`${result.gold > 0 ? '+' : ''}${result.gold}💰`);
                            if (result.exp !== 0) textParts.push(`${result.exp > 0 ? '+' : ''}${result.exp}⭐`);

                            newEffects.push({
                                x, y,
                                text: textParts.join(' '),
                                color: result.gold > 0 ? '#fbbf24' : (result.food > 0 ? '#4ade80' : '#ffffff')
                            });

                            totalFood += result.food;
                            totalExp += result.exp;
                            totalGold += result.gold;
                        }

                        // Reset counters
                        if (symbol.definition.id === 1 && symbol.effect_counter >= 6) symbol.effect_counter = 0;
                        if (symbol.definition.id === 2 && symbol.effect_counter >= 8) symbol.effect_counter = 0;
                        if (symbol.definition.id === 12 && symbol.effect_counter >= 10) symbol.effect_counter = 0;
                    }
                }
            }

            set((prev) => {
                let newLevel = prev.level;
                let newExp = prev.exp + totalExp;
                const expToNext = 50 + (prev.level - 1) * 25;

                if (newExp >= expToNext && prev.level < 10) {
                    newExp -= expToNext;
                    newLevel++;
                }

                const cleanBoard = prev.board.map(col => col.map(s => (s?.is_marked_for_destruction ? null : s)));

                return {
                    food: prev.food + totalFood,
                    gold: prev.gold + totalGold,
                    exp: newExp,
                    level: newLevel,
                    board: cleanBoard,
                    lastEffects: newEffects,
                    isProcessing: false
                };
            });
        }, 500);
    },

    initializeGame: () => {
        set({
            food: 200,
            gold: 0,
            exp: 0,
            level: 1,
            turn: 0,
            board: createEmptyBoard(),
            playerSymbols: getStartingSymbols(),
            isProcessing: false,
            lastEffects: []
        });
    },
}));
