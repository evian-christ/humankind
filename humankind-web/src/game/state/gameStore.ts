import { create } from 'zustand';
import { SYMBOLS, type SymbolDefinition } from '../data/symbolDefinitions';
import { processSingleSymbolEffects } from '../logic/symbolEffects';
import type { PlayerSymbolInstance } from '../types';

export { type PlayerSymbolInstance } from '../types';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;
export const REROLL_COST = 5;

// Godot 원본과 동일한 레벨별 희귀도 확률 테이블 (키: rarity, 값: %)
const LEVEL_PROBABILITIES: Record<number, Record<number, number>> = {
    1:  { 1: 100, 2: 0,  3: 0,  4: 0,  5: 0  },
    2:  { 1: 85,  2: 15, 3: 0,  4: 0,  5: 0  },
    3:  { 1: 70,  2: 30, 3: 0,  4: 0,  5: 0  },
    4:  { 1: 55,  2: 35, 3: 10, 4: 0,  5: 0  },
    5:  { 1: 45,  2: 35, 3: 20, 4: 0,  5: 0  },
    6:  { 1: 35,  2: 35, 3: 25, 4: 5,  5: 0  },
    7:  { 1: 25,  2: 35, 3: 30, 4: 10, 5: 0  },
    8:  { 1: 20,  2: 30, 3: 35, 4: 15, 5: 0  },
    9:  { 1: 15,  2: 25, 3: 35, 4: 22, 5: 3  },
    10: { 1: 10,  2: 20, 3: 30, 4: 20, 5: 20 },
};

type GamePhase = 'idle' | 'processing' | 'selection' | 'game_over' | 'victory';

/** 10턴마다 식량 납부 비용 (Godot 원본: 100, 150, 200, 250...) */
const calculateFoodCost = (turn: number): number => {
    const paymentCycle = Math.floor(turn / 10);
    return 100 + (paymentCycle - 1) * 50;
};

/** 보드에 AGI(ID 28)가 있는지 체크 */
const checkAgiVictory = (board: (PlayerSymbolInstance | null)[][]): boolean => {
    for (let x = 0; x < BOARD_WIDTH; x++) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            if (board[x][y]?.definition.id === 28) return true;
        }
    }
    return false;
};

interface GameState {
    food: number;
    gold: number;
    exp: number;
    level: number;
    turn: number;
    board: (PlayerSymbolInstance | null)[][];
    playerSymbols: PlayerSymbolInstance[];
    phase: GamePhase;
    symbolChoices: SymbolDefinition[];
    lastEffects: Array<{ x: number, y: number, text: string, color: string }>;

    // Actions
    spinBoard: () => void;
    selectSymbol: (symbolId: number) => void;
    skipSelection: () => void;
    rerollSymbols: () => void;
    initializeGame: () => void;
}

const createEmptyBoard = (): (PlayerSymbolInstance | null)[][] => {
    return Array(BOARD_WIDTH).fill(null).map(() => Array(BOARD_HEIGHT).fill(null));
};

let instanceCounter = 0;
const generateInstanceId = (): string => `symbol_${Date.now()}_${instanceCounter++}`;

const createInstance = (def: SymbolDefinition): PlayerSymbolInstance => ({
    definition: def,
    instanceId: generateInstanceId(),
    effect_counter: 0,
    is_marked_for_destruction: false,
    remaining_attacks: def.base_attack ? 3 : 0,
    enemy_hp: def.base_hp
});

const getStartingSymbols = (): PlayerSymbolInstance[] => {
    return [
        SYMBOLS[1],  // Wheat
        SYMBOLS[2],  // Rice
        SYMBOLS[3],  // Fish
        SYMBOLS[11], // Cow
        SYMBOLS[12], // Sheep
        SYMBOLS[5],  // Banana
        SYMBOLS[29], // Campfire
    ].map(createInstance);
};

/** 심볼을 희귀도별로 그룹화 (Godot 원본 로직) */
const getSymbolsByRarity = (level: number): Record<number, SymbolDefinition[]> => {
    const result: Record<number, SymbolDefinition[]> = {};
    for (const sym of Object.values(SYMBOLS)) {
        // AGI(ID 28)는 레벨 10 미만이면 제외
        if (sym.id === 28 && level < 10) continue;
        const r = sym.rarity as number;
        if (!result[r]) result[r] = [];
        result[r].push(sym);
    }
    return result;
};

/** 레벨 기반 가중치로 심볼 3개 생성 (Godot 원본 로직, 중복 가능) */
const generateChoices = (level: number): SymbolDefinition[] => {
    const probs = LEVEL_PROBABILITIES[level] ?? LEVEL_PROBABILITIES[1];
    const symbolsByRarity = getSymbolsByRarity(level);
    const choices: SymbolDefinition[] = [];

    for (let i = 0; i < 3; i++) {
        const roll = Math.floor(Math.random() * 100);
        let cumulative = 0;
        let selectedRarity = 1;

        for (const [rarity, prob] of Object.entries(probs)) {
            cumulative += prob;
            if (roll < cumulative) {
                selectedRarity = Number(rarity);
                break;
            }
        }

        const pool = symbolsByRarity[selectedRarity];
        if (pool && pool.length > 0) {
            choices.push(pool[Math.floor(Math.random() * pool.length)]);
        } else {
            choices.push(SYMBOLS[1]); // fallback: Wheat
        }
    }

    return choices;
};

export const useGameStore = create<GameState>((set, get) => ({
    food: 200,
    gold: 0,
    exp: 0,
    level: 1,
    turn: 0,
    board: createEmptyBoard(),
    playerSymbols: getStartingSymbols(),
    phase: 'idle' as GamePhase,
    symbolChoices: [],
    lastEffects: [],

    spinBoard: () => {
        const state = get();
        if (state.phase !== 'idle') return;

        set({ phase: 'processing', lastEffects: [] });

        // 1. Clear Board & Place Symbols (reuse existing instances to preserve counters)
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

        shuffledSymbols.forEach((instance, idx) => {
            const pos = shuffledPositions[idx];
            newBoard[pos.x][pos.y] = instance;
        });

        const newTurn = state.turn + 1;

        // 1b. Food payment every 10 turns (before effects, Godot 원본 순서)
        let currentFood = state.food;
        if (newTurn % 10 === 0) {
            const cost = calculateFoodCost(newTurn);
            if (currentFood < cost) {
                set({ board: newBoard, turn: newTurn, food: currentFood, phase: 'game_over' as GamePhase, lastEffects: [] });
                return;
            }
            currentFood -= cost;
        }

        set({ board: newBoard, turn: newTurn, food: currentFood });

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
                            if (result.food !== 0) textParts.push(`${result.food > 0 ? '+' : ''}${result.food}`);
                            if (result.gold !== 0) textParts.push(`${result.gold > 0 ? '+' : ''}${result.gold}G`);
                            if (result.exp !== 0) textParts.push(`${result.exp > 0 ? '+' : ''}${result.exp}XP`);

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

                // AGI 승리 체크 (이펙트 처리 후)
                if (checkAgiVictory(cleanBoard)) {
                    return {
                        food: prev.food + totalFood,
                        gold: prev.gold + totalGold,
                        exp: newExp,
                        level: newLevel,
                        board: cleanBoard,
                        lastEffects: newEffects,
                        phase: 'victory' as GamePhase,
                        symbolChoices: [],
                    };
                }

                const choices = generateChoices(newLevel);

                return {
                    food: prev.food + totalFood,
                    gold: prev.gold + totalGold,
                    exp: newExp,
                    level: newLevel,
                    board: cleanBoard,
                    lastEffects: newEffects,
                    phase: 'selection' as GamePhase,
                    symbolChoices: choices,
                };
            });
        }, 500);
    },

    selectSymbol: (symbolId: number) => {
        const state = get();
        if (state.phase !== 'selection') return;

        const def = SYMBOLS[symbolId];
        if (!def) return;

        set({
            playerSymbols: [...state.playerSymbols, createInstance(def)],
            phase: 'idle',
            symbolChoices: [],
        });
    },

    skipSelection: () => {
        if (get().phase !== 'selection') return;
        set({ phase: 'idle', symbolChoices: [] });
    },

    rerollSymbols: () => {
        const state = get();
        if (state.phase !== 'selection') return;
        if (state.gold < REROLL_COST) return;

        set({
            gold: state.gold - REROLL_COST,
            symbolChoices: generateChoices(state.level),
        });
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
            phase: 'idle' as GamePhase,
            symbolChoices: [],
            lastEffects: []
        });
    },
}));
