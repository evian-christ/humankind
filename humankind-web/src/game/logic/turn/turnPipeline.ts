import { S, type SymbolDefinition } from '../../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../../types';
import type { ActiveRelicEffects, EffectResult, SymbolEffectContext } from '../symbolEffects/types';
import {
    applyMerchantStoredGold,
    buildFoodBySlotKey,
    collectDisabledTerrainCoords,
    computeReligionDeferredEffects,
    slotKey,
    type DeferredReligionSlot,
    type SlotEffect,
    type SlotEffectCache,
} from './symbolEffectResolution';
import type { BoardGrid, CreateSymbolInstance } from './turnTypes';

export type { BoardGrid } from './turnTypes';

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

/**
 * TurnPipeline (최소 스캐폴딩)
 * - 현재 store 내부에 있는 setTimeout/phase 제어는 그대로 두고,
 *   “슬롯 효과 계산 호출 형태”만 표준화해 이후 오케스트레이터 분리를 쉽게 만든다.
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
    return {
        slotOrder: buildSlotOrder(boardWidth, boardHeight),
        disabledTerrainCoords: collectDisabledTerrainCoords(board, boardWidth, boardHeight),
        totals: { ...baseTotals },
        symbolsToAdd: [],
        symbolsToSpawnOnBoard: [],
        accumulatedEffects: [],
        religionEffectCache: new Map(),
        religionSlotsToRecalculate: [],
    };
}

export function shouldDeferReligionEffect(symbolId: number): boolean {
    return symbolId === S.christianity || symbolId === S.islam;
}

export function resolveSlotEffect(args: ResolveSlotEffectArgs): EffectResult {
    const { pipeline, deps, symbol, board, x, y, effectCtx, relicEffects } = args;

    if (shouldDeferReligionEffect(symbol.definition.id)) {
        pipeline.religionSlotsToRecalculate.push({ x, y, id: symbol.definition.id });
        return { food: 0, knowledge: 0, gold: 0 };
    }

    const result = computeSingleSlotEffect(deps, {
        symbol,
        board,
        x,
        y,
        effectCtx,
        relicEffects,
        disabledTerrainCoords: pipeline.disabledTerrainCoords,
    });

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
    if (result.food !== 0 || result.knowledge !== 0 || result.gold !== 0) {
        pipeline.accumulatedEffects.push({
            x: slot.x,
            y: slot.y,
            food: result.food,
            gold: result.gold,
            knowledge: result.knowledge,
        });
        pipeline.totals.food += result.food;
        pipeline.totals.knowledge += result.knowledge;
        pipeline.totals.gold += result.gold;
    }
}

export function completeSlotEffects(args: CompleteSlotEffectsArgs): void {
    const { pipeline, board, boardWidth, boardHeight, getAdjacentCoords } = args;
    const religionResult = computeReligionDeferredEffects({
        board,
        religionSlots: pipeline.religionSlotsToRecalculate,
        religionEffectCache: pipeline.religionEffectCache,
        getAdjacentCoords,
    });

    pipeline.accumulatedEffects.push(...religionResult.effects);
    pipeline.totals.food += religionResult.foodDelta;
    pipeline.totals.gold += religionResult.goldDelta;

    applyMerchantStoredGold({
        board,
        width: boardWidth,
        height: boardHeight,
        foodBySlotKey: buildFoodBySlotKey(pipeline.accumulatedEffects),
        getAdjacentCoords,
    });
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
