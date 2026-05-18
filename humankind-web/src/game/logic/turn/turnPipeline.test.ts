import { describe, expect, it } from 'vitest';
import { S, SYMBOLS, Sym, type SymbolDefinition } from '../../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../../types';
import { processSingleSymbolEffects } from '../symbolEffects';
import type { EffectResult } from '../symbolEffects/types';
import {
    applyGeneratedSymbols,
    applySlotEffectResult,
    buildSlotOrder,
    collectRemovedSymbolInstanceIds,
    commitLootMerge,
    computeTurnStartBaseTotals,
    createSlotEffectPipeline,
    type ProcessSlotArgs,
    removeMarkedSymbolsFromBoard,
    resolveSlotEffect,
    shouldDeferReligionEffect,
} from './turnPipeline';
import type { BoardGrid } from './turnTypes';

const createEmptyBoard = (): BoardGrid => Array(5).fill(null).map(() => Array(4).fill(null));

const createInstance = (definition: SymbolDefinition, id: string): PlayerSymbolInstance => ({
    definition,
    instanceId: id,
    effect_counter: 0,
    is_marked_for_destruction: false,
    remaining_attacks: definition.base_attack ? 3 : 0,
    enemy_hp: definition.base_hp,
});

describe('turnPipeline', () => {
    it('computes turn start base totals through the injected calculator', () => {
        const result = computeTurnStartBaseTotals({
            state: {},
            getHudTurnStartPassiveTotals: () => ({ food: 1, gold: 2, knowledge: 3 }),
        });

        expect(result).toEqual({ food: 1, gold: 2, knowledge: 3 });
    });

    it('builds slot order row-first for the board', () => {
        expect(buildSlotOrder(3, 2)).toEqual([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
            { x: 2, y: 1 },
        ]);
    });

    it('tracks deferred religion effects without calling symbol effect deps', () => {
        const board = createEmptyBoard();
        const christianity = createInstance(Sym.christianity, 'christianity');
        board[1][1] = christianity;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const result = resolveSlotEffect({
            pipeline,
            deps: {
                processSingleSymbolEffects: () => {
                    throw new Error('should not compute deferred religion immediately');
                },
            },
            symbol: christianity,
            board,
            x: 1,
            y: 1,
            effectCtx: { upgrades: [] },
            relicEffects: {
                relicCount: 0,
                quarryEmptyGold: false,
                bananaFossilBonus: false,
                horsemansihpPastureBonus: false,
                terraFossilDisasterFood: false,
                allSymbolsAreCorner: false,
            },
        });

        expect(shouldDeferReligionEffect(S.christianity)).toBe(true);
        expect(shouldDeferReligionEffect(S.buddhism)).toBe(true);
        expect(result).toEqual({ food: 0, knowledge: 0, gold: 0 });
        expect(pipeline.religionSlotsToRecalculate).toEqual([{ x: 1, y: 1, id: S.christianity }]);
    });

    it('captures counter display deltas while resolving slot effects', () => {
        const board = createEmptyBoard();
        const wheat = createInstance(Sym.wheat, 'wheat');
        board[0][0] = wheat;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const result = resolveSlotEffect({
            pipeline,
            deps: {
                processSingleSymbolEffects: ({ symbol }) => {
                    symbol.effect_counter += 1;
                    return { food: 0, knowledge: 0, gold: 0 };
                },
            },
            symbol: wheat,
            board,
            x: 0,
            y: 0,
            effectCtx: { upgrades: [] },
            relicEffects: {
                relicCount: 0,
                quarryEmptyGold: false,
                bananaFossilBonus: false,
                horsemansihpPastureBonus: false,
                terraFossilDisasterFood: false,
                allSymbolsAreCorner: false,
            },
        });

        expect(result.counterDelta).toBe(1);
        expect(result.counterAnchor).toBe('bottom-right');
        expect(result.counterDisplayTextBefore).toBeNull();
    });

    it('reports wrapped progress counters as gained progress instead of net display loss', () => {
        const board = createEmptyBoard();
        const wheat = createInstance(Sym.wheat, 'wheat');
        wheat.effect_counter = 9;
        board[0][0] = wheat;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const result = resolveSlotEffect({
            pipeline,
            deps: {
                processSingleSymbolEffects: ({ symbol }) => {
                    symbol.effect_counter += 2;
                    symbol.effect_counter -= 10;
                    return { food: 10, knowledge: 0, gold: 0 };
                },
            },
            symbol: wheat,
            board,
            x: 0,
            y: 0,
            effectCtx: { upgrades: [] },
            relicEffects: {
                relicCount: 0,
                quarryEmptyGold: false,
                bananaFossilBonus: false,
                horsemansihpPastureBonus: false,
                terraFossilDisasterFood: false,
                allSymbolsAreCorner: false,
            },
        });

        expect(wheat.effect_counter).toBe(1);
        expect(result.counterDelta).toBe(2);
        expect(result.counterDisplayTextBefore).toBe('9');
    });

    it('infers wrapped progress when handlers assign the final remainder directly', () => {
        const board = createEmptyBoard();
        const banana = createInstance(Sym.banana, 'banana');
        banana.effect_counter = 9;
        board[0][0] = banana;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const result = resolveSlotEffect({
            pipeline,
            deps: {
                processSingleSymbolEffects: ({ symbol }) => {
                    symbol.effect_counter = 1;
                    return { food: 10, knowledge: 0, gold: 0 };
                },
            },
            symbol: banana,
            board,
            x: 0,
            y: 0,
            effectCtx: { upgrades: [] },
            relicEffects: {
                relicCount: 0,
                quarryEmptyGold: false,
                bananaFossilBonus: false,
                horsemansihpPastureBonus: false,
                terraFossilDisasterFood: false,
                allSymbolsAreCorner: false,
            },
        });

        expect(result.counterDelta).toBe(2);
        expect(result.counterAnchor).toBe('bottom-right');
        expect(result.counterDisplayTextBefore).toBe('9');
    });

    it('does not let a loot already absorbed this turn absorb another loot', () => {
        const board = createEmptyBoard();
        const lootA = createInstance(Sym.loot, 'loot_a');
        const lootB = createInstance(Sym.loot, 'loot_b');
        const lootC = createInstance(Sym.loot, 'loot_c');
        board[0][0] = lootA;
        board[0][1] = lootB;
        board[0][2] = lootC;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });
        const deps = {
            processSingleSymbolEffects: (args: ProcessSlotArgs) =>
                processSingleSymbolEffects(
                    args.symbol,
                    args.board,
                    args.x,
                    args.y,
                    args.effectCtx,
                    args.relicEffects,
                    args.disabledTerrainCoords,
                ),
        };
        const relicEffects = {
            relicCount: 0,
            quarryEmptyGold: false,
            bananaFossilBonus: false,
            horsemansihpPastureBonus: false,
            terraFossilDisasterFood: false,
            allSymbolsAreCorner: false,
        };

        const firstResult = resolveSlotEffect({
            pipeline,
            deps,
            symbol: lootA,
            board,
            x: 0,
            y: 0,
            effectCtx: { upgrades: [] },
            relicEffects,
        });
        commitLootMerge(board, firstResult.lootMerge!);

        const absorbedSlotResult = resolveSlotEffect({
            pipeline,
            deps,
            symbol: lootB,
            board,
            x: 0,
            y: 1,
            effectCtx: { upgrades: [] },
            relicEffects,
        });

        expect(lootB.is_marked_for_destruction).toBe(true);
        expect(absorbedSlotResult).toEqual({ food: 0, knowledge: 0, gold: 0 });
        expect(lootC.is_marked_for_destruction).toBe(false);
    });

    it('applies immediate slot effects to totals and accumulated effects', () => {
        const board = createEmptyBoard();
        const wheat = createInstance(Sym.wheat, 'wheat');
        board[0][0] = wheat;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 1, gold: 2, knowledge: 3 },
        });
        const effect: EffectResult = { food: 4, gold: 5, knowledge: 6, addSymbolIds: [SYMBOLS[S.rice]!.id] };

        applySlotEffectResult(pipeline, { x: 0, y: 0 }, effect);

        expect(pipeline.totals).toEqual({ food: 5, gold: 7, knowledge: 9 });
        expect(pipeline.accumulatedEffects).toEqual([{ x: 0, y: 0, food: 4, gold: 5, knowledge: 6 }]);
    });

    it('keeps counter-only slot effects for board floats without changing resource totals', () => {
        const board = createEmptyBoard();
        const wheat = createInstance(Sym.wheat, 'wheat');
        board[0][0] = wheat;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 1, gold: 2, knowledge: 3 },
        });
        const effect: EffectResult = {
            food: 0,
            gold: 0,
            knowledge: 0,
            counterDelta: 1,
            counterAnchor: 'bottom-right',
        };

        applySlotEffectResult(pipeline, { x: 0, y: 0 }, effect);

        expect(pipeline.totals).toEqual({ food: 1, gold: 2, knowledge: 3 });
        expect(pipeline.accumulatedEffects).toEqual([
            { x: 0, y: 0, food: 0, gold: 0, knowledge: 0, counter: 1, counterAnchor: 'bottom-right' },
        ]);
    });

    it('removes marked board symbols and tracks removed instance ids before spawned replacements', () => {
        const board = createEmptyBoard();
        const marked = { ...createInstance(Sym.wheat, 'marked'), is_marked_for_destruction: true };
        board[0][0] = marked;

        const cleanBoard = removeMarkedSymbolsFromBoard(board);
        const generated = applyGeneratedSymbols({
            board: cleanBoard,
            playerSymbols: [marked],
            symbolsToSpawnOnBoard: [S.rice],
            symbolsToAdd: [],
            symbolDefinitions: SYMBOLS,
            unlockedKnowledgeUpgrades: [],
            boardWidth: 5,
            boardHeight: 4,
            createSymbolInstance: (definition) => createInstance(definition, `generated_${definition.id}`),
        });
        const removedIds = collectRemovedSymbolInstanceIds(board, cleanBoard);

        expect(cleanBoard[0][0]).toBeNull();
        expect(generated.board[0][0]?.definition.id).toBe(S.rice);
        expect(removedIds.has('marked')).toBe(true);
    });
});
