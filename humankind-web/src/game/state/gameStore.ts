import { create } from 'zustand';
import { SYMBOLS, type SymbolDefinition } from '../data/symbolDefinitions';
import { processSingleSymbolEffects } from '../logic/symbolEffects';
import { useSettingsStore, EFFECT_SPEED_DELAY } from './settingsStore';
import type { PlayerSymbolInstance } from '../types';

export { type PlayerSymbolInstance } from '../types';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;
export const REROLL_COST = 5;

// 시대별 심볼 등장 확률 테이블 (키: era, 값: %)
const ERA_PROBABILITIES: Record<number, Record<number, number>> = {
    1: { 1: 100, 2: 0,   3: 0,   4: 0,   5: 0  },
    2: { 1: 55,  2: 45,  3: 0,   4: 0,   5: 0  },
    3: { 1: 30,  2: 35,  3: 35,  4: 0,   5: 0  },
    4: { 1: 15,  2: 25,  3: 30,  4: 30,  5: 0  },
    5: { 1: 10,  2: 15,  3: 25,  4: 25,  5: 25 },
};

// 시대 전환에 필요한 Knowledge
const ERA_KNOWLEDGE_REQUIRED: Record<number, number> = {
    1: 50,
    2: 100,
    3: 175,
    4: 275,
};

type GamePhase = 'idle' | 'spinning' | 'processing' | 'selection' | 'game_over' | 'victory';

/** 10턴마다 식량 납부 비용 (Godot 원본: 100, 150, 200, 250...) */
export const calculateFoodCost = (turn: number): number => {
    const paymentCycle = Math.floor(turn / 10);
    return 100 + (paymentCycle - 1) * 50;
};

interface GameState {
    food: number;
    gold: number;
    knowledge: number;
    era: number;
    turn: number;
    board: (PlayerSymbolInstance | null)[][];
    playerSymbols: PlayerSymbolInstance[];
    phase: GamePhase;
    symbolChoices: SymbolDefinition[];
    lastEffects: Array<{ x: number; y: number; food: number; gold: number; knowledge: number }>;
    /** processing 중 누적 합산 (food, gold, knowledge) */
    runningTotals: { food: number; gold: number; knowledge: number };
    /** 현재 처리 중인 슬롯 좌표 (null이면 하이라이트 없음) */
    activeSlot: { x: number; y: number } | null;
    /** 현재 슬롯의 효과에 기여한 인접 심볼 좌표 */
    activeContributors: { x: number; y: number }[];
    /** spinning 시작 직전의 보드 (릴 시작점용) */
    prevBoard: (PlayerSymbolInstance | null)[][];

    // Actions
    spinBoard: () => void;
    /** spinning 애니메이션이 끝난 후 호출 — processing 시작 */
    startProcessing: () => void;
    selectSymbol: (symbolId: number) => void;
    skipSelection: () => void;
    rerollSymbols: () => void;
    initializeGame: () => void;
    devAddSymbol: (symbolId: number) => void;
    devRemoveSymbol: (instanceId: string) => void;
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

/** CSV v4 기준 시작 심볼 */
const getStartingSymbols = (): PlayerSymbolInstance[] => {
    return [
        SYMBOLS[1],  // Wheat
        SYMBOLS[2],  // Rice
        SYMBOLS[3],  // Cattle
        SYMBOLS[5],  // Fish
        SYMBOLS[4],  // Banana
        SYMBOLS[7],  // Stone
        SYMBOLS[23], // Campfire
    ].map(createInstance);
};

/** 선택 풀에서 제외할 심볼 (Swordsman은 Iron 업그레이드로만 획득) */
const EXCLUDED_FROM_CHOICES = new Set([33]);

/** 심볼을 시대별로 그룹화 */
const getSymbolsByEra = (_era: number): Record<number, SymbolDefinition[]> => {
    const result: Record<number, SymbolDefinition[]> = {};
    for (const sym of Object.values(SYMBOLS)) {
        if (EXCLUDED_FROM_CHOICES.has(sym.id)) continue;
        const e = sym.era as number;
        if (!result[e]) result[e] = [];
        result[e].push(sym);
    }
    return result;
};

/** 시대 기반 가중치로 심볼 3개 생성 (중복 가능) */
const generateChoices = (era: number): SymbolDefinition[] => {
    const probs = ERA_PROBABILITIES[era] ?? ERA_PROBABILITIES[1];
    const symbolsByEra = getSymbolsByEra(era);
    const choices: SymbolDefinition[] = [];

    for (let i = 0; i < 3; i++) {
        const roll = Math.floor(Math.random() * 100);
        let cumulative = 0;
        let selectedEra = 1;

        for (const [eraKey, prob] of Object.entries(probs)) {
            cumulative += prob;
            if (roll < cumulative) {
                selectedEra = Number(eraKey);
                break;
            }
        }

        const pool = symbolsByEra[selectedEra];
        if (pool && pool.length > 0) {
            choices.push(pool[Math.floor(Math.random() * pool.length)]);
        } else {
            choices.push(SYMBOLS[1]); // fallback: Wheat
        }
    }

    return choices;
};

export const useGameStore = create<GameState>((set, get) => ({
    food: 0,
    gold: 0,
    knowledge: 0,
    era: 1,
    turn: 0,
    board: createEmptyBoard(),
    playerSymbols: getStartingSymbols(),
    phase: 'idle' as GamePhase,
    symbolChoices: [],
    lastEffects: [],
    runningTotals: { food: 0, gold: 0, knowledge: 0 },
    activeSlot: null,
    activeContributors: [],
    prevBoard: createEmptyBoard(),

    spinBoard: () => {
        const state = get();
        if (state.phase !== 'idle') return;

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

        // board와 phase를 한 번에 set → renderBoard 시 릴이 새 board를 읽음
        // prevBoard: 스핀 전 보드를 저장 (릴 시작점용)
        set({
            prevBoard: state.board,
            board: newBoard,
            turn: newTurn,
            food: currentFood,
            phase: 'spinning',
            lastEffects: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
        });

        // spinning 애니메이션은 GameCanvas ticker가 처리하고,
        // 모든 열이 멈추면 startProcessing()을 호출함
    },

    startProcessing: () => {
        const state = get();
        if (state.phase !== 'spinning') return;

        set({ phase: 'processing' });

        // 2. 순차 이펙트 처리: 슬롯 1(y=0,x=0)부터 슬롯 20(y=3,x=4)까지
        const slotOrder: { x: number; y: number }[] = [];
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                slotOrder.push({ x, y });
            }
        }

        let totalFood = 0;
        let totalKnowledge = 0;
        let totalGold = 0;
        const symbolsToAdd: number[] = [];
        const symbolsToSpawnOnBoard: number[] = [];
        const accumulatedEffects: Array<{ x: number; y: number; food: number; gold: number; knowledge: number }> = [];

        const processSlot = (slotIdx: number) => {
            if (slotIdx >= slotOrder.length) {
                // 마지막 효과 후 0.5초 대기 → 스탯 합산
                set({ activeSlot: null, activeContributors: [] });
                setTimeout(() => {
                    finishProcessing(totalFood, totalKnowledge, totalGold, symbolsToAdd, symbolsToSpawnOnBoard, accumulatedEffects);
                }, 500);
                return;
            }

            const { x, y } = slotOrder[slotIdx];
            const currentState = get();
            const currentBoard = currentState.board;
            const symbol = currentBoard[x][y];

            if (!symbol) {
                processSlot(slotIdx + 1);
                return;
            }

            const result = processSingleSymbolEffects(
                symbol, currentBoard, x, y, currentState.food + totalFood
            );

            if (result.addSymbolIds) symbolsToAdd.push(...result.addSymbolIds);
            if (result.spawnOnBoard) symbolsToSpawnOnBoard.push(...result.spawnOnBoard);

            if (result.food !== 0 || result.knowledge !== 0 || result.gold !== 0) {
                accumulatedEffects.push({ x, y, food: result.food, gold: result.gold, knowledge: result.knowledge });
                totalFood += result.food;
                totalKnowledge += result.knowledge;
                totalGold += result.gold;
            }

            set({
                activeSlot: { x, y },
                activeContributors: result.contributors ?? [],
                lastEffects: [...accumulatedEffects],
                runningTotals: { food: totalFood, gold: totalGold, knowledge: totalKnowledge },
            });

            const delay = EFFECT_SPEED_DELAY[useSettingsStore.getState().effectSpeed];
            if (delay === 0) {
                processSlot(slotIdx + 1);
            } else {
                setTimeout(() => processSlot(slotIdx + 1), delay);
            }
        };

        const finishProcessing = (
            tFood: number, tKnowledge: number, tGold: number,
            toAdd: number[], toSpawn: number[],
            effects: Array<{ x: number; y: number; food: number; gold: number; knowledge: number }>
        ) => {
            const currentBoard = get().board;

            let destroyedCount = 0;
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    if (currentBoard[x][y]?.is_marked_for_destruction) destroyedCount++;
                }
            }
            let bonusFood = 0;
            let bonusGold = 0;
            if (destroyedCount > 0) {
                for (let x = 0; x < BOARD_WIDTH; x++) {
                    for (let y = 0; y < BOARD_HEIGHT; y++) {
                        const s = currentBoard[x][y];
                        if (s && s.definition.id === 50 && !s.is_marked_for_destruction) {
                            const arenaFood = destroyedCount * 4;
                            const arenaGold = destroyedCount * 2;
                            bonusFood += arenaFood;
                            bonusGold += arenaGold;
                            effects.push({ x, y, food: arenaFood, gold: arenaGold, knowledge: 0 });
                        }
                    }
                }
            }

            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const s = currentBoard[x][y];
                    if (s && s.definition.id === 26 && s.is_marked_for_destruction) {
                        bonusFood += 20;
                    }
                }
            }

            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const s = currentBoard[x][y];
                    if (s && s.definition.id === 24 && s.is_marked_for_destruction) {
                        bonusFood += (s.effect_counter || 0) * 2;
                    }
                }
            }

            set((prev) => {
                let newEra = prev.era;
                let newKnowledge = prev.knowledge + tKnowledge;

                while (newEra < 5) {
                    const required = ERA_KNOWLEDGE_REQUIRED[newEra];
                    if (required === undefined || newKnowledge < required) break;
                    newKnowledge -= required;
                    newEra++;
                }

                const protectedRows = new Set<number>();
                for (let bx = 0; bx < BOARD_WIDTH; bx++) {
                    for (let by = 0; by < BOARD_HEIGHT; by++) {
                        const s = prev.board[bx][by];
                        if (s && s.definition.id === 45 && !s.is_marked_for_destruction) {
                            protectedRows.add(by);
                        }
                    }
                }

                const cleanBoard = prev.board.map((col) =>
                    col.map((s, cy) => {
                        if (!s) return null;
                        if (s.is_marked_for_destruction) {
                            if (protectedRows.has(cy)) {
                                s.is_marked_for_destruction = false;
                                return s;
                            }
                            return null;
                        }
                        return s;
                    })
                );

                const newPlayerSymbols = [...prev.playerSymbols];

                for (const symId of toSpawn) {
                    const def = SYMBOLS[symId];
                    if (def) {
                        let placed = false;
                        for (let bx = 0; bx < BOARD_WIDTH && !placed; bx++) {
                            for (let by = 0; by < BOARD_HEIGHT && !placed; by++) {
                                if (!cleanBoard[bx][by]) {
                                    const inst = createInstance(def);
                                    cleanBoard[bx][by] = inst;
                                    newPlayerSymbols.push(inst);
                                    placed = true;
                                }
                            }
                        }
                        if (!placed) {
                            newPlayerSymbols.push(createInstance(def));
                        }
                    }
                }

                for (const symId of toAdd) {
                    const def = SYMBOLS[symId];
                    if (def) {
                        newPlayerSymbols.push(createInstance(def));
                    }
                }

                const destroyedIds = new Set<string>();
                for (let bx = 0; bx < BOARD_WIDTH; bx++) {
                    for (let by = 0; by < BOARD_HEIGHT; by++) {
                        const prevSym = prev.board[bx][by];
                        if (prevSym && !cleanBoard[bx][by]) {
                            destroyedIds.add(prevSym.instanceId);
                        }
                    }
                }

                const filteredSymbols = newPlayerSymbols.filter(s => !destroyedIds.has(s.instanceId));
                const choices = generateChoices(newEra);

                return {
                    food: prev.food + tFood + bonusFood,
                    gold: prev.gold + tGold + bonusGold,
                    knowledge: newKnowledge,
                    runningTotals: { food: 0, gold: 0, knowledge: 0 },
                    activeSlot: null,
                    activeContributors: [],
                    era: newEra,
                    board: cleanBoard,
                    playerSymbols: filteredSymbols,
                    lastEffects: [...effects],
                    phase: 'processing' as GamePhase,
                    symbolChoices: choices,
                };
            });

            // 결과 확인 시간을 준 후 selection으로 전환
            setTimeout(() => {
                set({ phase: 'selection' as GamePhase });
            }, 500);
        };

        const initialDelay = EFFECT_SPEED_DELAY[useSettingsStore.getState().effectSpeed];
        if (initialDelay === 0) {
            processSlot(0);
        } else {
            setTimeout(() => processSlot(0), Math.max(initialDelay, 300));
        }
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
            symbolChoices: generateChoices(state.era),
        });
    },

    initializeGame: () => {
        set({
            food: 0,
            gold: 0,
            knowledge: 0,
            era: 1,
            turn: 0,
            board: createEmptyBoard(),
            playerSymbols: getStartingSymbols(),
            phase: 'idle' as GamePhase,
            symbolChoices: [],
            lastEffects: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
            prevBoard: createEmptyBoard(),
        });
    },

    devAddSymbol: (symbolId: number) => {
        const def = SYMBOLS[symbolId];
        if (!def) return;
        set((prev) => ({
            playerSymbols: [...prev.playerSymbols, createInstance(def)],
        }));
    },

    devRemoveSymbol: (instanceId: string) => {
        set((prev) => ({
            playerSymbols: prev.playerSymbols.filter(s => s.instanceId !== instanceId),
        }));
    },
}));
