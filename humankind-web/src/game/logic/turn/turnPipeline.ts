import { MILITARY_SCIENCE_UPGRADE_ID, PLANTATION_UPGRADE_ID } from '../../data/knowledgeUpgrades';
import { S, SYMBOLS, SymbolType, type SymbolDefinition } from '../../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../../types';
import { getEffectiveAdjacentCoords } from '../symbolEffects/core';
import type { ActiveRelicEffects, EffectResult, LootMergeResolution, SymbolEffectContext } from '../symbolEffects/types';
import {
    buildFoodBySlotKey,
    collectDisabledTerrainCoords,
    computeMerchantDeferredEffects,
    computeReligionDeferredEffects,
    slotKey,
    type DeferredReligionSlot,
    type SlotEffect,
    type SlotEffectCache,
} from './symbolEffectResolution';
import type { BoardCounterFloatAnchor, BoardGrid, CreateSymbolInstance } from './turnTypes';

export type { BoardGrid } from './turnTypes';

/** 타임라인 페이즈 3 직전 — 전리품 합류를 보드에 반영 */
export function commitLootMerge(board: BoardGrid, merge: LootMergeResolution): void {
    const absorbed = board[merge.absorbed.x]?.[merge.absorbed.y];
    const receiver = board[merge.receiver.x]?.[merge.receiver.y];
    const nextDef = SYMBOLS[merge.nextDefinitionId];
    if (!absorbed || !receiver || !nextDef) return;
    absorbed.is_marked_for_destruction = true;
    absorbed.suppress_destroy_overlay = true;
    receiver.definition = nextDef;
}

export interface ProcessSlotArgs {
    symbol: PlayerSymbolInstance;
    board: BoardGrid;
    x: number;
    y: number;
    effectCtx: SymbolEffectContext;
    relicEffects: ActiveRelicEffects;
    disabledTerrainCoords?: ReadonlySet<string>;
}

export interface TurnPipelineDeps {
    processSingleSymbolEffects: (args: ProcessSlotArgs) => EffectResult;
}

export interface ResourceTotals {
    food: number;
    gold: number;
    knowledge: number;
}

export interface TurnStartBaseInput<TState> {
    state: TState;
    getHudTurnStartPassiveTotals: (state: TState) => ResourceTotals;
}

export interface SlotEffectPipeline {
    slotOrder: Array<{ x: number; y: number }>;
    disabledTerrainCoords: Set<string>;
    totals: ResourceTotals;
    symbolsToAdd: number[];
    symbolsToSpawnOnBoard: number[];
    accumulatedEffects: SlotEffect[];
    religionEffectCache: SlotEffectCache;
    religionSlotsToRecalculate: DeferredReligionSlot[];
    allSymbolsAdjacent: boolean;
}

export interface CreateSlotEffectPipelineArgs {
    board: BoardGrid;
    boardWidth: number;
    boardHeight: number;
    baseTotals: ResourceTotals;
}

export interface ResolveSlotEffectArgs {
    pipeline: SlotEffectPipeline;
    deps: TurnPipelineDeps;
    symbol: PlayerSymbolInstance;
    board: BoardGrid;
    x: number;
    y: number;
    effectCtx: SymbolEffectContext;
    relicEffects: ActiveRelicEffects;
}

export interface CompleteSlotEffectsArgs {
    pipeline: SlotEffectPipeline;
    board: BoardGrid;
    boardWidth: number;
    boardHeight: number;
    getAdjacentCoords: (x: number, y: number) => Array<{ x: number; y: number }>;
    unlockedKnowledgeUpgrades?: readonly number[];
    relicEffects?: ActiveRelicEffects;
}

export interface ApplyGeneratedSymbolsArgs {
    board: BoardGrid;
    playerSymbols: PlayerSymbolInstance[];
    symbolsToSpawnOnBoard: readonly number[];
    symbolsToAdd: readonly number[];
    symbolDefinitions: Record<number, SymbolDefinition>;
    unlockedKnowledgeUpgrades: readonly number[];
    boardWidth: number;
    boardHeight: number;
    createSymbolInstance: CreateSymbolInstance;
}

type CounterFloatMode = 'direct-progress' | 'direct-countdown' | 'display-countdown';

interface CounterFloatConfig {
    anchor: BoardCounterFloatAnchor;
    mode: CounterFloatMode;
    wrapThreshold?: number;
}

function getCounterFloatConfig(symbol: PlayerSymbolInstance, effectCtx?: SymbolEffectContext): CounterFloatConfig | null {
    const def = symbol.definition;
    if (def.id === S.flood || def.id === S.drought || def.id === S.heatwave) return { anchor: 'bottom-right', mode: 'direct-countdown' };
    if (def.id === S.wheat) return { anchor: 'bottom-right', mode: 'direct-progress', wrapThreshold: 10 };
    if (def.id === S.rice) return { anchor: 'bottom-right', mode: 'direct-progress', wrapThreshold: 20 };
    if (def.id === S.banana) {
        return {
            anchor: 'bottom-right',
            mode: 'direct-progress',
            wrapThreshold: effectCtx?.upgrades.includes(PLANTATION_UPGRADE_ID) ? 7 : 10,
        };
    }
    if (def.type !== SymbolType.ENEMY && def.base_hp === undefined) {
        return { anchor: 'bottom-right', mode: 'direct-progress' };
    }
    return null;
}

function getCounterDisplayValue(rawValue: number): number {
    return rawValue;
}

export interface UnplacedHorseEffectResult extends ResourceTotals {
    count: number;
}

function getCounterDisplayText(symbol: PlayerSymbolInstance, rawValue: number): string | null {
    if (symbol.definition.id === S.banana) {
        return rawValue > 0 ? String(rawValue) : null;
    }
    return rawValue > 0 ? String(rawValue) : null;
}

function createCounterMutationTracker(symbol: PlayerSymbolInstance, effectCtx: SymbolEffectContext) {
    const config = getCounterFloatConfig(symbol, effectCtx);
    if (!config) return null;

    let currentValue = symbol.effect_counter || 0;
    const initialValue = currentValue;
    const initialDisplayValue = getCounterDisplayValue(initialValue);
    const textBefore = getCounterDisplayText(symbol, initialValue);
    let positiveDelta = 0;
    let negativeDelta = 0;
    const originalDescriptor = Object.getOwnPropertyDescriptor(symbol, 'effect_counter');

    Object.defineProperty(symbol, 'effect_counter', {
        configurable: true,
        enumerable: true,
        get: () => currentValue,
        set: (nextValue) => {
            const normalizedValue = Number(nextValue) || 0;
            const beforeDisplayValue = getCounterDisplayValue(currentValue);
            const afterDisplayValue = getCounterDisplayValue(normalizedValue);
            const delta = afterDisplayValue - beforeDisplayValue;
            if (delta > 0) positiveDelta += delta;
            if (delta < 0) negativeDelta += delta;
            currentValue = normalizedValue;
        },
    });

    return {
        finish(): Pick<EffectResult, 'counterDelta' | 'counterAnchor' | 'counterDisplayTextBefore'> | null {
            if (originalDescriptor) {
                Object.defineProperty(symbol, 'effect_counter', {
                    ...originalDescriptor,
                    value: currentValue,
                });
            } else {
                Object.defineProperty(symbol, 'effect_counter', {
                    configurable: true,
                    enumerable: true,
                    writable: true,
                    value: currentValue,
                });
            }

            const finalDisplayValue = getCounterDisplayValue(currentValue);
            let counterDelta = 0;
            if (config.mode === 'direct-countdown') {
                counterDelta = negativeDelta || positiveDelta;
            } else if (config.mode === 'display-countdown') {
                if (negativeDelta) {
                    counterDelta = negativeDelta;
                } else if (config.wrapThreshold && finalDisplayValue > initialDisplayValue) {
                    counterDelta = -(initialDisplayValue + config.wrapThreshold - finalDisplayValue);
                } else {
                    counterDelta = positiveDelta;
                }
            } else if (positiveDelta) {
                counterDelta = positiveDelta;
            } else if (config.wrapThreshold && currentValue < initialValue) {
                counterDelta = config.wrapThreshold - initialValue + currentValue;
            } else {
                counterDelta = negativeDelta;
            }

            return counterDelta
                ? { counterDelta, counterAnchor: config.anchor, counterDisplayTextBefore: textBefore }
                : null;
        },
    };
}

/**
 * TurnPipeline
 * - 슬롯 효과 계산과 누적 결과 갱신만 담당한다.
 * - 연출 지연과 run 취소는 state/actions의 턴 타임라인 계층에서 처리한다.
 */
export function computeSingleSlotEffect(deps: TurnPipelineDeps, args: ProcessSlotArgs): EffectResult {
    return deps.processSingleSymbolEffects(args);
}

export function computeTurnStartBaseTotals<TState>(input: TurnStartBaseInput<TState>): ResourceTotals {
    return input.getHudTurnStartPassiveTotals(input.state);
}

export function buildSlotOrder(boardWidth: number, boardHeight: number): Array<{ x: number; y: number }> {
    const slotOrder: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < boardHeight; y++) {
        for (let x = 0; x < boardWidth; x++) {
            slotOrder.push({ x, y });
        }
    }
    return slotOrder;
}

export function createSlotEffectPipeline(args: CreateSlotEffectPipelineArgs): SlotEffectPipeline {
    const { board, boardWidth, boardHeight, baseTotals } = args;
    const allSymbolsAdjacent = false;
    const getPhaseAdjacentCoords = (x: number, y: number) =>
        getEffectiveAdjacentCoords(board, x, y, allSymbolsAdjacent);
    return {
        slotOrder: buildSlotOrder(boardWidth, boardHeight),
        disabledTerrainCoords: collectDisabledTerrainCoords(board, boardWidth, boardHeight, getPhaseAdjacentCoords),
        totals: { ...baseTotals },
        symbolsToAdd: [],
        symbolsToSpawnOnBoard: [],
        accumulatedEffects: [],
        religionEffectCache: new Map(),
        religionSlotsToRecalculate: [],
        allSymbolsAdjacent,
    };
}

export function shouldDeferReligionEffect(symbolId: number): boolean {
    return symbolId === S.christianity || symbolId === S.islam || symbolId === S.buddhism || symbolId === S.hinduism;
}

export function resolveSlotEffect(args: ResolveSlotEffectArgs): EffectResult {
    const { pipeline, deps, symbol, board, x, y, effectCtx, relicEffects } = args;

    if (symbol.is_marked_for_destruction) {
        return { food: 0, knowledge: 0, gold: 0 };
    }

    if (shouldDeferReligionEffect(symbol.definition.id)) {
        pipeline.religionSlotsToRecalculate.push({ x, y, id: symbol.definition.id });
        return { food: 0, knowledge: 0, gold: 0 };
    }

    const counterTracker = createCounterMutationTracker(symbol, effectCtx);
    const result = computeSingleSlotEffect(deps, {
        symbol,
        board,
        x,
        y,
        effectCtx,
        relicEffects,
        disabledTerrainCoords: pipeline.disabledTerrainCoords,
    });
    const counterResult = counterTracker?.finish();
    if (counterResult) {
        result.counterDelta = counterResult.counterDelta;
        result.counterAnchor = counterResult.counterAnchor;
        result.counterDisplayTextBefore = counterResult.counterDisplayTextBefore;
    }

    pipeline.religionEffectCache.set(slotKey(x, y), {
        food: result.food,
        knowledge: result.knowledge,
        gold: result.gold,
    });

    if (result.addSymbolIds) pipeline.symbolsToAdd.push(...result.addSymbolIds);
    if (result.spawnOnBoard) pipeline.symbolsToSpawnOnBoard.push(...result.spawnOnBoard);

    return result;
}

export function applySlotEffectResult(
    pipeline: SlotEffectPipeline,
    slot: { x: number; y: number },
    result: EffectResult,
): void {
    if (result.food !== 0 || result.knowledge !== 0 || result.gold !== 0 || result.counterDelta) {
        const effect: SlotEffect = {
            x: slot.x,
            y: slot.y,
            food: result.food,
            gold: result.gold,
            knowledge: result.knowledge,
        };
        if (result.counterDelta) effect.counter = result.counterDelta;
        if (result.counterAnchor) effect.counterAnchor = result.counterAnchor;
        if (result.counterDisplayTextBefore !== undefined) {
            effect.counterDisplayTextBefore = result.counterDisplayTextBefore;
        }
        pipeline.accumulatedEffects.push(effect);
    }
    if (result.food !== 0 || result.knowledge !== 0 || result.gold !== 0) {
        pipeline.totals.food += result.food;
        pipeline.totals.knowledge += result.knowledge;
        pipeline.totals.gold += result.gold;
    }
}

export function completeSlotEffects(args: CompleteSlotEffectsArgs): void {
    const { pipeline, board, boardWidth, boardHeight, getAdjacentCoords, unlockedKnowledgeUpgrades = [], relicEffects } = args;
    const getPhaseAdjacentCoords = (x: number, y: number) =>
        pipeline.allSymbolsAdjacent
            ? getEffectiveAdjacentCoords(board, x, y, true)
            : getAdjacentCoords(x, y);
    const religionResult = computeReligionDeferredEffects({
        board,
        religionSlots: pipeline.religionSlotsToRecalculate,
        religionEffectCache: pipeline.religionEffectCache,
        getAdjacentCoords: getPhaseAdjacentCoords,
        unlockedKnowledgeUpgrades,
        allSymbolsAreCorner: relicEffects?.allSymbolsAreCorner ?? false,
    });

    pipeline.accumulatedEffects.push(...religionResult.effects);
    pipeline.totals.food += religionResult.foodDelta;
    pipeline.totals.gold += religionResult.goldDelta;
    pipeline.totals.knowledge += religionResult.knowledgeDelta;

    const merchantResult = computeMerchantDeferredEffects({
        board,
        width: boardWidth,
        height: boardHeight,
        foodBySlotKey: buildFoodBySlotKey(pipeline.accumulatedEffects),
        getAdjacentCoords: getPhaseAdjacentCoords,
        unlockedKnowledgeUpgrades,
    });

    pipeline.accumulatedEffects.push(...merchantResult.effects);
    pipeline.totals.gold += merchantResult.goldDelta;
}

export function computeUnplacedHorseEffects(
    board: BoardGrid,
    playerSymbols: readonly PlayerSymbolInstance[],
    unlockedKnowledgeUpgrades: readonly number[] = [],
): UnplacedHorseEffectResult {
    const boardInstanceIds = new Set<string>();
    for (const col of board) {
        for (const symbol of col) {
            if (symbol && !symbol.is_marked_for_destruction) {
                boardInstanceIds.add(symbol.instanceId);
            }
        }
    }

    const count = playerSymbols.filter(
        (symbol) =>
            symbol.definition.id === S.horse &&
            !symbol.is_marked_for_destruction &&
            !boardInstanceIds.has(symbol.instanceId),
    ).length;
    const hasMilitaryScience = unlockedKnowledgeUpgrades.map(Number).includes(MILITARY_SCIENCE_UPGRADE_ID);

    return {
        count,
        food: count * (hasMilitaryScience ? 3 : 2),
        gold: count * (hasMilitaryScience ? 4 : 2),
        knowledge: 0,
    };
}

export function applyUnplacedHorseEffects(
    pipeline: SlotEffectPipeline,
    result: UnplacedHorseEffectResult,
): void {
    if (result.count === 0) return;
    pipeline.totals.food += result.food;
    pipeline.totals.gold += result.gold;
    pipeline.totals.knowledge += result.knowledge;
}

export function removeMarkedSymbolsFromBoard(board: BoardGrid): BoardGrid {
    return board.map((col) =>
        col.map((symbol) => {
            if (!symbol) return null;
            if (symbol.is_marked_for_destruction) return null;
            return symbol;
        }),
    );
}

export function applyGeneratedSymbols(args: ApplyGeneratedSymbolsArgs): {
    board: BoardGrid;
    playerSymbols: PlayerSymbolInstance[];
} {
    const {
        board,
        playerSymbols,
        symbolsToSpawnOnBoard,
        symbolsToAdd,
        symbolDefinitions,
        unlockedKnowledgeUpgrades,
        boardWidth,
        boardHeight,
        createSymbolInstance,
    } = args;
    const nextBoard = board.map((col) => [...col]);
    const nextPlayerSymbols = [...playerSymbols];

    for (const symbolId of symbolsToSpawnOnBoard) {
        const def = symbolDefinitions[symbolId];
        if (def) {
            let placed = false;
            for (let x = 0; x < boardWidth && !placed; x++) {
                for (let y = 0; y < boardHeight && !placed; y++) {
                    if (!nextBoard[x][y]) {
                        const inst = createSymbolInstance(def, unlockedKnowledgeUpgrades);
                        nextBoard[x][y] = inst;
                        nextPlayerSymbols.push(inst);
                        placed = true;
                    }
                }
            }
            if (!placed) {
                nextPlayerSymbols.push(createSymbolInstance(def, unlockedKnowledgeUpgrades));
            }
        }
    }

    for (const symbolId of symbolsToAdd) {
        const def = symbolDefinitions[symbolId];
        if (def) {
            nextPlayerSymbols.push(createSymbolInstance(def, unlockedKnowledgeUpgrades));
        }
    }

    return { board: nextBoard, playerSymbols: nextPlayerSymbols };
}

export function collectRemovedSymbolInstanceIds(previousBoard: BoardGrid, nextBoard: BoardGrid): Set<string> {
    const removedIds = new Set<string>();
    for (let x = 0; x < previousBoard.length; x++) {
        for (let y = 0; y < (previousBoard[x]?.length ?? 0); y++) {
            const prevSymbol = previousBoard[x][y];
            if (prevSymbol && !nextBoard[x]?.[y]) {
                removedIds.add(prevSymbol.instanceId);
            }
        }
    }
    return removedIds;
}
