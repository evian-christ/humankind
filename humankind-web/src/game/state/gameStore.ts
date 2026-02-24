import { create } from 'zustand';
import { SYMBOLS, SymbolType, type SymbolDefinition } from '../data/symbolDefinitions';
import { processSingleSymbolEffects } from '../logic/symbolEffects';
import { useSettingsStore, EFFECT_SPEED_DELAY, COMBAT_BOUNCE_DURATION } from './settingsStore';
import { getEffectsByIntensity } from '../data/enemyEffectDefinitions';
import { RELIC_LIST, type RelicDefinition } from '../data/relicDefinitions';
import { useRelicStore } from './relicStore';
import type { PlayerSymbolInstance } from '../types';

export { type PlayerSymbolInstance } from '../types';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;
export const REROLL_COST = 5;

// 시대별 심볼 등장 확률 테이블 (종교 미해금)
const ERA_PROBABILITIES_BASE: Record<number, Record<number, number>> = {
    1: { 1: 100, 2: 0, 3: 0, 4: 0, 5: 0 },
    2: { 1: 55, 2: 45, 3: 0, 4: 0, 5: 0 },
    3: { 1: 30, 2: 35, 3: 35, 4: 0, 5: 0 },
    4: { 1: 15, 2: 25, 3: 30, 4: 30, 5: 0 },
    5: { 1: 10, 2: 15, 3: 25, 4: 25, 5: 25 },
};

// 시대별 심볼 등장 확률 테이블 (종교 해금 후, 0 = Religion)
const ERA_PROBABILITIES_WITH_RELIGION: Record<number, Record<number, number>> = {
    1: { 0: 0, 1: 100, 2: 0, 3: 0, 4: 0, 5: 0 },
    2: { 0: 10, 1: 50, 2: 40, 3: 0, 4: 0, 5: 0 },
    3: { 0: 10, 1: 25, 2: 30, 3: 35, 4: 0, 5: 0 },
    4: { 0: 5, 1: 13, 2: 22, 3: 30, 4: 30, 5: 0 },
    5: { 0: 0, 1: 10, 2: 15, 3: 25, 4: 25, 5: 25 },
};

// 시대 전환에 필요한 Knowledge
const ERA_KNOWLEDGE_REQUIRED: Record<number, number> = {
    1: 50,
    2: 100,
    3: 175,
    4: 275,
};

type GamePhase = 'idle' | 'spinning' | 'processing' | 'selection' | 'relic_selection' | 'era_unlock' | 'game_over' | 'victory';
/** 10턴마다 식량 납부 비용 (Godot 원본: 100, 150, 200, 250...) */
export const calculateFoodCost = (turn: number): number => {
    const paymentCycle = Math.floor(turn / 10);
    return 100 + (paymentCycle - 1) * 50;
};

export interface GameState {
    food: number;
    gold: number;
    knowledge: number;
    era: number;
    turn: number;
    board: (PlayerSymbolInstance | null)[][];
    playerSymbols: PlayerSymbolInstance[];
    phase: GamePhase;
    symbolChoices: SymbolDefinition[];
    relicChoices: RelicDefinition[];
    lastEffects: Array<{ x: number; y: number; food: number; gold: number; knowledge: number }>;
    /** processing 중 누적 합산 (food, gold, knowledge) */
    runningTotals: { food: number; gold: number; knowledge: number };
    /** 현재 처리 중인 슬롯 좌표 (null이면 하이라이트 없음) */
    activeSlot: { x: number; y: number } | null;
    /** 현재 슬롯의 효과에 기여한 인접 심볼 좌표 */
    activeContributors: { x: number; y: number }[];
    /** spinning 시작 직전의 보드 (릴 시작점용) */
    prevBoard: (PlayerSymbolInstance | null)[][];
    /** 전투 애니메이션 트리거 (공격자 → 대상 좌표 + 피해량) */
    combatAnimation: { ax: number; ay: number; tx: number; ty: number; atkDmg: number; counterDmg: number } | null;
    /** 전투 후 삭제 직전 진동 표시 */
    combatShaking: boolean;
    /** 종교 심볼이 선택 풀에 해금되었는지 */
    religionUnlocked: boolean;
    /** 매 턴 영구 지식 보너스 */
    bonusKnowledgePerTurn: number;
    /** 고전 시대 진입 시 선택 대기 중 */
    pendingEraUnlock: boolean;
    /** 유물 선택 대기 중 */
    pendingRelicSelection: boolean;

    // Actions
    spinBoard: () => void;
    /** spinning 애니메이션이 끝난 후 호출 — processing 시작 */
    startProcessing: () => void;
    selectSymbol: (symbolId: number) => void;
    skipSelection: () => void;
    rerollSymbols: () => void;
    selectRelic: (relicId: number) => void;
    skipRelicSelection: () => void;
    resolveEraUnlock: (choice: 'religion' | 'knowledge') => void;
    initializeGame: () => void;
    devAddSymbol: (symbolId: number) => void;
    devRemoveSymbol: (instanceId: string) => void;
    devSetStat: (stat: 'food' | 'gold' | 'knowledge', value: number) => void;
}

const getAdjacentCoords = (x: number, y: number): { x: number; y: number }[] => {
    const adj: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) adj.push({ x: nx, y: ny });
        }
    }
    return adj;
};

const createEmptyBoard = (): (PlayerSymbolInstance | null)[][] => {
    return Array(BOARD_WIDTH).fill(null).map(() => Array(BOARD_HEIGHT).fill(null));
};

/** Fisher-Yates shuffle — 모든 순열에 균등한 확률 보장 */
const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

let instanceCounter = 0;
const generateInstanceId = (): string => `symbol_${Date.now()}_${instanceCounter++}`;

/** 턴 수 기반 적 강도 계산 (60턴 단위, max 5) */
const getEnemyIntensity = (turn: number): number =>
    Math.min(Math.floor(turn / 60) + 1, 5);

const createInstance = (def: SymbolDefinition, turn: number = 0): PlayerSymbolInstance => {
    const inst: PlayerSymbolInstance = {
        definition: def,
        instanceId: generateInstanceId(),
        effect_counter: 0,
        is_marked_for_destruction: false,
        remaining_attacks: def.base_attack ? 3 : 0,
        enemy_hp: def.base_hp,
    };

    // 적 심볼이면 턴 기반 강도에 맞는 랜덤 효과 배정
    if (def.symbol_type === SymbolType.ENEMY) {
        const intensity = getEnemyIntensity(turn);
        const pool = getEffectsByIntensity(intensity);
        if (pool.length > 0) {
            inst.enemy_effect_id = pool[Math.floor(Math.random() * pool.length)].id;
        }
    }

    return inst;
};

/** CSV v4 기준 시작 심볼 */
const getStartingSymbols = (): PlayerSymbolInstance[] => {
    return [
        SYMBOLS[1],  // Wheat
        SYMBOLS[2],  // Rice
        SYMBOLS[3],  // Cattle
        SYMBOLS[5],  // Fish
        SYMBOLS[4],  // Banana
        SYMBOLS[7],  // Stone
        SYMBOLS[19], // Campfire
    ].map(createInstance);
};

/** 선택 풀에서 제외할 심볼 */
const EXCLUDED_FROM_CHOICES = new Set<number>();

/** 심볼을 시대별로 그룹화 (적 심볼은 이벤트로만 등장하므로 선택 풀에서 제외) */
const getSymbolsByEra = (): Record<number, SymbolDefinition[]> => {
    const result: Record<number, SymbolDefinition[]> = {};
    for (const sym of Object.values(SYMBOLS)) {
        if (EXCLUDED_FROM_CHOICES.has(sym.id)) continue;
        if (sym.symbol_type === SymbolType.ENEMY) continue;
        const e = sym.era as number;
        if (!result[e]) result[e] = [];
        result[e].push(sym);
    }
    return result;
};

/** 시대 기반 가중치로 심볼 3개 생성 (중복 가능) */
const generateChoices = (era: number, religionUnlocked: boolean): SymbolDefinition[] => {
    const probTable = religionUnlocked ? ERA_PROBABILITIES_WITH_RELIGION : ERA_PROBABILITIES_BASE;
    const probs = probTable[era] ?? probTable[1];
    const symbolsByEra = getSymbolsByEra();
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

const generateRelicChoices = (): RelicDefinition[] => {
    // 3 unique relics
    const choices: RelicDefinition[] = [];
    const pool = [...RELIC_LIST];
    // Filter out already owned relics
    const ownedIds = new Set(useRelicStore.getState().relics.map(r => r.definition.id));
    const available = shuffle(pool.filter(r => !ownedIds.has(r.id)));

    for (let i = 0; i < 3; i++) {
        if (available[i]) {
            choices.push(available[i]);
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
    relicChoices: [],
    lastEffects: [],
    runningTotals: { food: 0, gold: 0, knowledge: 0 },
    activeSlot: null,
    activeContributors: [],
    prevBoard: createEmptyBoard(),
    combatAnimation: null,
    combatShaking: false,
    religionUnlocked: false,
    bonusKnowledgePerTurn: 0,
    pendingEraUnlock: false,
    pendingRelicSelection: false,

    spinBoard: () => {
        const state = get();
        if (state.phase !== 'idle') return;

        // 1. Clear Board & Place Symbols (reuse existing instances to preserve counters)
        const newBoard = createEmptyBoard();
        // 전투/적 심볼 우선 배치: 컬렉션에 있으면 거의 항상 보드에 등장
        const combatAndEnemy = shuffle(state.playerSymbols
            .filter(s => s.definition.symbol_type === SymbolType.ENEMY || s.definition.symbol_type === SymbolType.COMBAT));
        const friendly = shuffle(state.playerSymbols
            .filter(s => s.definition.symbol_type === SymbolType.FRIENDLY));
        const shuffledSymbols = [...combatAndEnemy, ...friendly].slice(0, BOARD_WIDTH * BOARD_HEIGHT);

        const positions: { x: number, y: number }[] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                positions.push({ x, y });
            }
        }
        const shuffledPositions = shuffle(positions);

        shuffledSymbols.forEach((instance, idx) => {
            const pos = shuffledPositions[idx];
            newBoard[pos.x][pos.y] = instance;
        });

        const newTurn = state.turn + 1;

        // 1b. Food payment every 10 turns (before effects, Godot 원본 순서)
        let currentFood = state.food;
        let pRelicSelection = false;
        let generatedRelics: RelicDefinition[] = state.relicChoices;
        if (newTurn % 10 === 0) {
            const cost = calculateFoodCost(newTurn);
            if (currentFood < cost) {
                set({ board: newBoard, turn: newTurn, food: currentFood, phase: 'game_over' as GamePhase, lastEffects: [] });
                return;
            }
            currentFood -= cost;
            pRelicSelection = true;
            generatedRelics = generateRelicChoices();
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
            pendingRelicSelection: pRelicSelection,
            relicChoices: generatedRelics,
        });

        // spinning 애니메이션은 GameCanvas ticker가 처리하고,
        // 모든 열이 멈추면 startProcessing()을 호출함
    },

    startProcessing: () => {
        const state = get();
        if (state.phase !== 'spinning') return;

        set({ phase: 'processing' });

        // ── 효과 페이즈 인프라 ────────────────────────────────────────────────
        // 2. 순차 이펙트 처리: 슬롯 1(y=0,x=0)부터 슬롯 20(y=3,x=4)까지
        const slotOrder: { x: number; y: number }[] = [];
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                slotOrder.push({ x, y });
            }
        }

        let totalFood = 0;
        let totalKnowledge = get().bonusKnowledgePerTurn;
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

            // 전투 페이즈에서 파괴된 심볼은 효과 페이즈를 건너뜀
            if (!symbol || symbol.is_marked_for_destruction) {
                processSlot(slotIdx + 1);
                return;
            }

            const result = processSingleSymbolEffects(
                symbol, currentBoard, x, y
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
                        if (s && s.definition.id === 30 && !s.is_marked_for_destruction) {
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
                    if (s && s.definition.id === 20 && s.is_marked_for_destruction) {
                        bonusFood += (s.effect_counter || 0) * 2;
                    }
                }
            }

            // Hinduism (34): 인접 심볼이 파괴되면 +5 Knowledge + 복사본 컬렉션 추가
            let bonusKnowledge = 0;
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const s = currentBoard[x][y];
                    if (s && s.definition.id === 34 && !s.is_marked_for_destruction) {
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dy = -1; dy <= 1; dy++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = x + dx, ny = y + dy;
                                if (nx < 0 || nx >= BOARD_WIDTH || ny < 0 || ny >= BOARD_HEIGHT) continue;
                                const adjSym = currentBoard[nx][ny];
                                if (adjSym && adjSym.is_marked_for_destruction) {
                                    bonusKnowledge += 5;
                                    toAdd.push(adjSym.definition.id);
                                    effects.push({ x, y, food: 0, gold: 0, knowledge: 5 });
                                }
                            }
                        }
                    }
                }
            }

            set((prev) => {
                let newEra = prev.era;
                let newKnowledge = prev.knowledge + tKnowledge + bonusKnowledge;

                while (newEra < 5) {
                    const required = ERA_KNOWLEDGE_REQUIRED[newEra];
                    if (required === undefined || newKnowledge < required) break;
                    newKnowledge -= required;
                    newEra++;
                }

                const cleanBoard = prev.board.map((col) =>
                    col.map((s) => {
                        if (!s) return null;
                        if (s.is_marked_for_destruction) return null;
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
                                    const inst = createInstance(def, prev.turn);
                                    cleanBoard[bx][by] = inst;
                                    newPlayerSymbols.push(inst);
                                    placed = true;
                                }
                            }
                        }
                        if (!placed) {
                            newPlayerSymbols.push(createInstance(def, prev.turn));
                        }
                    }
                }

                for (const symId of toAdd) {
                    const def = SYMBOLS[symId];
                    if (def) {
                        newPlayerSymbols.push(createInstance(def, prev.turn));
                    }
                }

                // combatDestroyedIds는 이미 playerSymbols에서 제거됨
                // 여기선 효과 페이즈 중 파괴된 심볼(Banana 등)만 추가로 처리
                const effectDestroyedIds = new Set<string>();
                for (let bx = 0; bx < BOARD_WIDTH; bx++) {
                    for (let by = 0; by < BOARD_HEIGHT; by++) {
                        const prevSym = prev.board[bx][by];
                        if (prevSym && !cleanBoard[bx][by]) {
                            effectDestroyedIds.add(prevSym.instanceId);
                        }
                    }
                }

                const filteredSymbols = newPlayerSymbols.filter(s => !effectDestroyedIds.has(s.instanceId));
                const choices = generateChoices(newEra, prev.religionUnlocked);
                const crossedToClassical = prev.era === 1 && newEra === 2;

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
                    pendingEraUnlock: crossedToClassical,
                };
            });

            // 결과 확인 시간을 준 후 selection으로 전환
            setTimeout(() => {
                set({ phase: 'selection' as GamePhase });
            }, 500);
        };

        // ── 전투 페이즈: COMBAT ↔ ENEMY 인접 쌍을 하나하나 순차 처리 ─────────
        const combatBoard = get().board;
        const combatEvents: { ax: number; ay: number; tx: number; ty: number }[] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const sym = combatBoard[x][y];
                if (sym?.definition.symbol_type !== SymbolType.COMBAT) continue;
                for (const adj of getAdjacentCoords(x, y)) {
                    const target = combatBoard[adj.x][adj.y];
                    if (target?.definition.symbol_type === SymbolType.ENEMY) {
                        combatEvents.push({ ax: x, ay: y, tx: adj.x, ty: adj.y });
                    }
                }
            }
        }

        // 전투 종료 후: 파괴 심볼 진동 표시 → 보드·컬렉션에서 제거 → 효과 페이즈 시작
        const startEffectPhase = () => {
            const combatDestroyedIds = new Set<string>();
            const b = get().board;
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let y = 0; y < BOARD_HEIGHT; y++) {
                    const sym = b[x][y];
                    if (sym?.is_marked_for_destruction) combatDestroyedIds.add(sym.instanceId);
                }
            }

            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const bounceDur = COMBAT_BOUNCE_DURATION[effectSpeed];

            const doRemoveAndStart = () => {
                if (combatDestroyedIds.size > 0) {
                    set(prev => ({
                        board: prev.board.map(col => col.map(s => s?.is_marked_for_destruction ? null : s)),
                        playerSymbols: prev.playerSymbols.filter(s => !combatDestroyedIds.has(s.instanceId)),
                        combatShaking: false,
                    }));
                }
                set({ activeSlot: null, activeContributors: [], combatAnimation: null, combatShaking: false });

                const initialDelay = EFFECT_SPEED_DELAY[effectSpeed];
                if (initialDelay === 0) {
                    processSlot(0);
                } else {
                    setTimeout(() => processSlot(0), Math.max(initialDelay, 300));
                }
            };

            if (combatDestroyedIds.size > 0 && bounceDur > 0) {
                // 삭제 전 진동 표시
                set({ combatAnimation: null, combatShaking: true });
                setTimeout(doRemoveAndStart, Math.max(bounceDur * 2, 200));
            } else {
                doRemoveAndStart();
            }
        };

        // 전투 이벤트 순차 처리 (공격 bounce → 반격 bounce → 다음)
        const processCombatEvent = (eventIdx: number) => {
            if (eventIdx >= combatEvents.length) {
                startEffectPhase();
                return;
            }

            const { ax, ay, tx, ty } = combatEvents[eventIdx];
            const board = get().board;
            const attacker = board[ax][ay];
            const target = board[tx][ty];

            // 둘 다 살아있을 때만 전투
            let atkDmg = 0;
            let counterDmg = 0;
            if (attacker && !attacker.is_marked_for_destruction &&
                target && !target.is_marked_for_destruction) {
                atkDmg = attacker.definition.base_attack ?? 0;
                counterDmg = target.definition.base_attack ?? 0;

                if (atkDmg > 0) {
                    target.enemy_hp = (target.enemy_hp ?? target.definition.base_hp ?? 0) - atkDmg;
                    if (target.enemy_hp <= 0) target.is_marked_for_destruction = true;
                }
                if (counterDmg > 0) {
                    attacker.enemy_hp = (attacker.enemy_hp ?? attacker.definition.base_hp ?? 0) - counterDmg;
                    if (attacker.enemy_hp <= 0) attacker.is_marked_for_destruction = true;
                }
            }

            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const bounceDur = COMBAT_BOUNCE_DURATION[effectSpeed];

            // instant 모드 — 애니메이션 없이 즉시 진행
            if (bounceDur === 0) {
                processCombatEvent(eventIdx + 1);
                return;
            }

            const stepDelay = bounceDur + 40;

            if (atkDmg > 0 && counterDmg > 0) {
                // 양방향: 공격 bounce → 반격 bounce → 다음
                set({ combatAnimation: { ax, ay, tx, ty, atkDmg, counterDmg: 0 } });
                setTimeout(() => {
                    set({ combatAnimation: { ax: tx, ay: ty, tx: ax, ty: ay, atkDmg: counterDmg, counterDmg: 0 } });
                    setTimeout(() => processCombatEvent(eventIdx + 1), stepDelay);
                }, stepDelay);
            } else if (atkDmg > 0) {
                // 공격만
                set({ combatAnimation: { ax, ay, tx, ty, atkDmg, counterDmg: 0 } });
                setTimeout(() => processCombatEvent(eventIdx + 1), stepDelay);
            } else if (counterDmg > 0) {
                // 반격만
                set({ combatAnimation: { ax: tx, ay: ty, tx: ax, ty: ay, atkDmg: counterDmg, counterDmg: 0 } });
                setTimeout(() => processCombatEvent(eventIdx + 1), stepDelay);
            } else {
                processCombatEvent(eventIdx + 1);
            }
        };

        processCombatEvent(0);
    },

    selectSymbol: (symbolId: number) => {
        const state = get();
        if (state.phase !== 'selection') return;

        const def = SYMBOLS[symbolId];
        if (!def) return;

        let nextPhase: GamePhase = 'idle';
        if (state.pendingRelicSelection) nextPhase = 'relic_selection';
        else if (state.pendingEraUnlock) nextPhase = 'era_unlock';

        set({
            playerSymbols: [...state.playerSymbols, createInstance(def, state.turn)],
            phase: nextPhase,
            symbolChoices: [],
        });
    },

    skipSelection: () => {
        const state = get();
        if (state.phase !== 'selection') return;

        let nextPhase: GamePhase = 'idle';
        if (state.pendingRelicSelection) nextPhase = 'relic_selection';
        else if (state.pendingEraUnlock) nextPhase = 'era_unlock';

        set({ phase: nextPhase, symbolChoices: [] });
    },

    selectRelic: (relicId: number) => {
        const state = get();
        if (state.phase !== 'relic_selection') return;

        const def = RELIC_LIST.find((r) => r.id === relicId);
        if (def) {
            useRelicStore.getState().addRelic(def);
        }

        set({
            phase: state.pendingEraUnlock ? 'era_unlock' : 'idle',
            relicChoices: [],
            pendingRelicSelection: false,
        });
    },

    skipRelicSelection: () => {
        const state = get();
        if (state.phase !== 'relic_selection') return;

        set({
            phase: state.pendingEraUnlock ? 'era_unlock' : 'idle',
            relicChoices: [],
            pendingRelicSelection: false,
        });
    },

    rerollSymbols: () => {
        const state = get();
        if (state.phase !== 'selection') return;
        if (state.gold < REROLL_COST) return;

        set({
            gold: state.gold - REROLL_COST,
            symbolChoices: generateChoices(state.era, state.religionUnlocked),
        });
    },

    resolveEraUnlock: (choice: 'religion' | 'knowledge') => {
        set(prev => ({
            religionUnlocked: choice === 'religion' ? true : prev.religionUnlocked,
            bonusKnowledgePerTurn: choice === 'knowledge' ? prev.bonusKnowledgePerTurn + 1 : prev.bonusKnowledgePerTurn,
            pendingEraUnlock: false,
            phase: 'idle' as GamePhase,
        }));
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
            relicChoices: [],
            lastEffects: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
            prevBoard: createEmptyBoard(),
            combatAnimation: null,
            combatShaking: false,
            religionUnlocked: false,
            bonusKnowledgePerTurn: 0,
            pendingEraUnlock: false,
            pendingRelicSelection: false,
        });
    },

    devAddSymbol: (symbolId: number) => {
        const def = SYMBOLS[symbolId];
        if (!def) return;
        set((prev) => ({
            playerSymbols: [...prev.playerSymbols, createInstance(def, prev.turn)],
        }));
    },

    devRemoveSymbol: (instanceId: string) => {
        set((prev) => ({
            playerSymbols: prev.playerSymbols.filter(s => s.instanceId !== instanceId),
        }));
    },

    devSetStat: (stat: 'food' | 'gold' | 'knowledge', value: number) => {
        set({ [stat]: Math.max(0, value) });
    },
}));
