import { describe, expect, it } from 'vitest';
import { S, SYMBOLS, Sym, type SymbolDefinition } from '../../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../../types';
import type { EffectResult } from '../symbolEffects/types';
import {
    applyGeneratedSymbols,
    applySlotEffectResult,
    buildSlotOrder,
    collectRemovedSymbolInstanceIds,
    computeTurnStartBaseTotals,
    createSlotEffectPipeline,
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
            state: { stageId: 1 },
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
            },
        });

        expect(shouldDeferReligionEffect(S.christianity)).toBe(true);
        expect(shouldDeferReligionEffect(S.buddhism)).toBe(true);
        expect(result).toEqual({ food: 0, knowledge: 0, gold: 0 });
        expect(pipeline.religionSlotsToRecalculate).toEqual([{ x: 1, y: 1, id: S.christianity }]);
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
