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
    computeUnplacedHorseEffects,
    computeTurnStartBaseTotals,
    createSlotEffectPipeline,
    type ProcessSlotArgs,
    removeMarkedSymbolsFromBoard,
    resolveSlotEffect,
} from './turnPipeline';
import {
    CARAVANSERAI_UPGRADE_ID,
    DESERT_STORAGE_UPGRADE_ID,
    GUILD_UPGRADE_ID,
    MILITARY_SCIENCE_UPGRADE_ID,
    THEOCRACY_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';
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

    it('resolves Christianity immediately on its own slot', () => {
        const board = createEmptyBoard();
        const christianity = createInstance(Sym.christianity, 'christianity');
        const wheat = createInstance(Sym.wheat, 'wheat');
        wheat.effect_counter = 9;
        board[1][1] = christianity;
        board[2][1] = wheat;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const result = resolveSlotEffect({
            pipeline,
            deps: {
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
        applySlotEffectResult(pipeline, { x: 1, y: 1 }, result);

        expect(result.food).toBe(10);
        expect(result.contributors).toEqual([{ x: 2, y: 1 }]);
        expect(pipeline.accumulatedEffects.at(-1)).toEqual({ x: 1, y: 1, food: 10, gold: 0, knowledge: 0 });
    });

    it('resolves Buddhism immediately and marks it on religion conflict', () => {
        const board = createEmptyBoard();
        const buddhism = createInstance(Sym.buddhism, 'buddhism');
        const christianity = createInstance(Sym.christianity, 'christianity');
        board[0][1] = buddhism;
        board[1][1] = christianity;
        board[4][3] = createInstance(Sym.wheat, 'wheat');
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const result = resolveSlotEffect({
            pipeline,
            deps: {
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
            },
            symbol: buddhism,
            board,
            x: 0,
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

        expect(result).toEqual({ food: 0, knowledge: 0, gold: 0 });
        expect(buddhism.is_marked_for_destruction).toBe(true);
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

    it('resolves campfire on its own slot from prior adjacent food production', () => {
        const board = createEmptyBoard();
        const wheat = createInstance(Sym.wheat, 'wheat');
        const fish = createInstance(Sym.fish, 'fish');
        const campfire = createInstance(Sym.campfire, 'campfire');
        board[1][0] = wheat;
        board[2][1] = fish;
        board[1][1] = campfire;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });
        pipeline.accumulatedEffects.push(
            { x: 1, y: 0, food: 6, gold: 0, knowledge: 0 },
            { x: 2, y: 1, food: 4, gold: 0, knowledge: 0 },
        );

        const result = resolveSlotEffect({
            pipeline,
            deps: {
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
            },
            symbol: campfire,
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
        applySlotEffectResult(pipeline, { x: 1, y: 1 }, result);

        expect(campfire.is_marked_for_destruction).toBe(true);
        expect(result.food).toBe(6);
        expect(result.contributors).toEqual([{ x: 1, y: 0 }]);
        expect(pipeline.totals.food).toBe(6);
        expect(pipeline.accumulatedEffects.at(-1)).toEqual({ x: 1, y: 1, food: 6, gold: 0, knowledge: 0 });
    });

    it('includes adjacent food producers that resolve after campfire without mutating them', () => {
        const board = createEmptyBoard();
        const campfire = createInstance(Sym.campfire, 'campfire');
        const futureWheat = createInstance(Sym.wheat, 'future-wheat');
        const grassland = createInstance(Sym.grassland, 'grassland');
        futureWheat.effect_counter = 9;
        board[1][1] = campfire;
        board[2][1] = futureWheat;
        board[2][0] = grassland;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const result = resolveSlotEffect({
            pipeline,
            deps: {
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
            },
            symbol: campfire,
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
        applySlotEffectResult(pipeline, { x: 1, y: 1 }, result);

        expect(result.food).toBe(10);
        expect(result.contributors).toEqual([{ x: 2, y: 1 }]);
        expect(futureWheat.effect_counter).toBe(9);
        expect(futureWheat.is_marked_for_destruction).toBe(false);
        expect(pipeline.accumulatedEffects.at(-1)).toEqual({ x: 1, y: 1, food: 10, gold: 0, knowledge: 0 });
    });

    it('releases stored food immediately when another symbol destroys pottery', () => {
        const board = createEmptyBoard();
        const desert = createInstance(Sym.desert, 'desert');
        const pottery = createInstance(Sym.pottery, 'pottery');
        pottery.effect_counter = 7;
        board[1][1] = desert;
        board[0][1] = pottery;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const result = resolveSlotEffect({
            pipeline,
            deps: {
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
            },
            symbol: desert,
            board,
            x: 1,
            y: 1,
            effectCtx: { upgrades: [DESERT_STORAGE_UPGRADE_ID] },
            relicEffects: {
                relicCount: 0,
                quarryEmptyGold: false,
                bananaFossilBonus: false,
                horsemansihpPastureBonus: false,
                terraFossilDisasterFood: false,
                allSymbolsAreCorner: false,
            },
        });
        applySlotEffectResult(pipeline, { x: 1, y: 1 }, result);

        expect(pottery.is_marked_for_destruction).toBe(true);
        expect(result.food).toBe(20);
        expect(result.gold).toBe(2);
        expect(result.extraEffects).toEqual([{ x: 0, y: 1, food: 7, gold: 0, knowledge: 0 }]);
        expect(pipeline.totals.food).toBe(27);
        expect(pipeline.totals.gold).toBe(2);
        expect(pipeline.accumulatedEffects).toEqual([
            { x: 1, y: 1, food: 20, gold: 2, knowledge: 0 },
            { x: 0, y: 1, food: 7, gold: 0, knowledge: 0 },
        ]);
    });

    it('adds Date, Dye, Papyrus, and Oral Tradition destroy bonuses during the destroying slot', () => {
        const board = createEmptyBoard();
        const destroyer = createInstance(Sym.desert, 'destroyer');
        const date = createInstance(Sym.date, 'date');
        const dye = createInstance(Sym.dye, 'dye');
        const papyrus = createInstance(Sym.papyrus, 'papyrus');
        const oral = createInstance(Sym.oral_tradition, 'oral');
        board[1][1] = destroyer;
        board[0][0] = date;
        board[1][0] = dye;
        board[2][0] = papyrus;
        board[0][1] = oral;
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
                    date.is_marked_for_destruction = true;
                    dye.is_marked_for_destruction = true;
                    papyrus.is_marked_for_destruction = true;
                    oral.is_marked_for_destruction = true;
                    return { food: 0, knowledge: 0, gold: 0 };
                },
            },
            symbol: destroyer,
            board,
            x: 1,
            y: 1,
            effectCtx: { upgrades: [DESERT_STORAGE_UPGRADE_ID, CARAVANSERAI_UPGRADE_ID] },
            relicEffects: {
                relicCount: 0,
                quarryEmptyGold: false,
                bananaFossilBonus: false,
                horsemansihpPastureBonus: false,
                terraFossilDisasterFood: false,
                allSymbolsAreCorner: false,
            },
        });
        applySlotEffectResult(pipeline, { x: 1, y: 1 }, result);

        expect(result.extraEffects).toEqual([
            { x: 0, y: 0, food: 20, gold: 0, knowledge: 0 },
            { x: 0, y: 1, food: 0, gold: 0, knowledge: 30 },
            { x: 1, y: 0, food: 0, gold: 20, knowledge: 0 },
            { x: 2, y: 0, food: 0, gold: 0, knowledge: 20 },
        ]);
        expect(pipeline.totals).toEqual({ food: 20, gold: 20, knowledge: 50 });
    });

    it('refreshes the relic shop immediately when Relic Caravan is destroyed', () => {
        const board = createEmptyBoard();
        const destroyer = createInstance(Sym.desert, 'destroyer');
        const caravan = createInstance(Sym.relic_caravan, 'relic-caravan');
        board[1][1] = destroyer;
        board[0][1] = caravan;
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
                    caravan.is_marked_for_destruction = true;
                    return { food: 0, knowledge: 0, gold: 0 };
                },
            },
            symbol: destroyer,
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

        expect(result.triggerRelicRefresh).toBe(true);
    });

    it('destroys the earthquake column immediately on the earthquake slot', () => {
        const board = createEmptyBoard();
        const wheat = createInstance(Sym.wheat, 'wheat');
        const earthquake = createInstance(Sym.earthquake, 'earthquake');
        const fish = createInstance(Sym.fish, 'fish');
        const rice = createInstance(Sym.rice, 'rice');
        board[2][0] = wheat;
        board[2][1] = earthquake;
        board[2][3] = fish;
        board[3][1] = rice;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const result = resolveSlotEffect({
            pipeline,
            deps: {
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
            },
            symbol: earthquake,
            board,
            x: 2,
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

        expect(wheat.is_marked_for_destruction).toBe(true);
        expect(earthquake.is_marked_for_destruction).toBe(true);
        expect(fish.is_marked_for_destruction).toBe(true);
        expect(rice.is_marked_for_destruction).toBe(false);
        expect(result.earthquakeFx).toEqual({
            column: 2,
            affected: [
                { x: 2, y: 0 },
                { x: 2, y: 1 },
                { x: 2, y: 3 },
            ],
        });
    });

    it('resolves Tax immediately from a random adjacent food producer without reducing food', () => {
        const board = createEmptyBoard();
        const tax = createInstance(Sym.tax, 'tax');
        const wheat = createInstance(Sym.wheat, 'wheat');
        wheat.effect_counter = 9;
        board[1][1] = tax;
        board[2][1] = wheat;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const result = resolveSlotEffect({
            pipeline,
            deps: {
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
            },
            symbol: tax,
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
        applySlotEffectResult(pipeline, { x: 1, y: 1 }, result);

        expect(result.food).toBe(0);
        expect(result.gold).toBe(10);
        expect(result.contributors).toEqual([{ x: 2, y: 1 }]);
        expect(pipeline.accumulatedEffects.at(-1)).toEqual({ x: 1, y: 1, food: 0, gold: 10, knowledge: 0 });
    });

    it('resolves Merchant immediately from the highest future adjacent food producer', () => {
        const board = createEmptyBoard();
        const merchant = createInstance(Sym.merchant, 'merchant');
        const wheat = createInstance(Sym.wheat, 'wheat');
        const fish = createInstance(Sym.fish, 'fish');
        wheat.effect_counter = 9;
        merchant.stored_gold = 3;
        board[1][1] = merchant;
        board[1][0] = fish;
        board[2][1] = wheat;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const result = resolveSlotEffect({
            pipeline,
            deps: {
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
            },
            symbol: merchant,
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

        expect(result.gold).toBe(10);
        expect(result.contributors).toEqual([{ x: 2, y: 1 }]);
        expect(merchant.merchant_store_pending).toBe(false);
        expect(merchant.stored_gold).toBe(0);
        expect(wheat.effect_counter).toBe(9);
    });

    it('lets Guild Merchant use the highest future food producer on the board', () => {
        const board = createEmptyBoard();
        const merchant = createInstance(Sym.merchant, 'merchant');
        const wheat = createInstance(Sym.wheat, 'wheat');
        wheat.effect_counter = 9;
        board[1][1] = merchant;
        board[4][3] = wheat;
        const pipeline = createSlotEffectPipeline({
            board,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const result = resolveSlotEffect({
            pipeline,
            deps: {
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
            },
            symbol: merchant,
            board,
            x: 1,
            y: 1,
            effectCtx: { upgrades: [GUILD_UPGRADE_ID] },
            relicEffects: {
                relicCount: 0,
                quarryEmptyGold: false,
                bananaFossilBonus: false,
                horsemansihpPastureBonus: false,
                terraFossilDisasterFood: false,
                allSymbolsAreCorner: false,
            },
        });

        expect(result.gold).toBe(10);
        expect(result.contributors).toEqual([{ x: 4, y: 3 }]);
    });

    it('resolves Islam and Hinduism immediately on their own slots', () => {
        const islamBoard = createEmptyBoard();
        const islam = createInstance(Sym.islam, 'islam');
        islamBoard[1][1] = islam;
        islamBoard[2][1] = createInstance(Sym.library, 'library');
        const islamPipeline = createSlotEffectPipeline({
            board: islamBoard,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const islamResult = resolveSlotEffect({
            pipeline: islamPipeline,
            deps: {
                processSingleSymbolEffects: ({ symbol }) => ({
                    food: 0,
                    gold: 0,
                    knowledge: symbol.definition.id === S.library ? 5 : 0,
                }),
            },
            symbol: islam,
            board: islamBoard,
            x: 1,
            y: 1,
            effectCtx: { upgrades: [THEOCRACY_UPGRADE_ID] },
            relicEffects: {
                relicCount: 0,
                quarryEmptyGold: false,
                bananaFossilBonus: false,
                horsemansihpPastureBonus: false,
                terraFossilDisasterFood: false,
                allSymbolsAreCorner: false,
            },
        });

        const hinduBoard = createEmptyBoard();
        const hinduism = createInstance(Sym.hinduism, 'hinduism');
        hinduBoard[0][0] = hinduism;
        hinduBoard[1][0] = createInstance(Sym.wheat, 'wheat');
        hinduBoard[2][0] = createInstance(Sym.rice, 'rice');
        const hinduPipeline = createSlotEffectPipeline({
            board: hinduBoard,
            boardWidth: 5,
            boardHeight: 4,
            baseTotals: { food: 0, gold: 0, knowledge: 0 },
        });

        const hinduResult = resolveSlotEffect({
            pipeline: hinduPipeline,
            deps: {
                processSingleSymbolEffects: () => ({ food: 0, gold: 0, knowledge: 0 }),
            },
            symbol: hinduism,
            board: hinduBoard,
            x: 0,
            y: 0,
            effectCtx: { upgrades: [THEOCRACY_UPGRADE_ID] },
            relicEffects: {
                relicCount: 0,
                quarryEmptyGold: false,
                bananaFossilBonus: false,
                horsemansihpPastureBonus: false,
                terraFossilDisasterFood: false,
                allSymbolsAreCorner: false,
            },
        });

        expect(islamResult.food).toBe(3);
        expect(hinduResult.food).toBe(3);
    });

    it('counts horse effects for owned horses that are not placed on the board', () => {
        const board = createEmptyBoard();
        const placedHorse = createInstance(Sym.horse, 'horse_placed');
        const unplacedHorse = createInstance(Sym.horse, 'horse_unplaced');
        const markedHorse = { ...createInstance(Sym.horse, 'horse_marked'), is_marked_for_destruction: true };
        board[0][0] = placedHorse;

        const result = computeUnplacedHorseEffects(board, [placedHorse, unplacedHorse, markedHorse], []);

        expect(result).toEqual({ count: 1, food: 2, gold: 2, knowledge: 0 });
    });

    it('uses Military Science values for unplaced horse effects', () => {
        const board = createEmptyBoard();
        const horseA = createInstance(Sym.horse, 'horse_a');
        const horseB = createInstance(Sym.horse, 'horse_b');

        const result = computeUnplacedHorseEffects(board, [horseA, horseB], [MILITARY_SCIENCE_UPGRADE_ID]);

        expect(result).toEqual({ count: 2, food: 6, gold: 8, knowledge: 0 });
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
