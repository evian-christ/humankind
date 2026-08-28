import { describe, expect, it } from 'vitest';
import {
    aggregateCollectionDestroyEffects,
    createStoredFoodDestroyEffects,
    createStartingBoard,
    expandBoardAt,
    getActiveBoardCoords,
    getBoardExpansionCandidates,
    getRemainingBoardExpansionCapacity,
    hasDesertOnlyTerrainSymbols,
    ensureStartingWildSeedsOwned,
    createInstance,
    placeOralTraditionAtBoardCenter,
} from './gameStoreHelpers';
import { S, SYMBOLS } from '../data/symbolDefinitions';

describe('gameStoreHelpers starting layout', () => {
    it('creates a starting board with oral tradition and one wild seed in fixed slots', () => {
        const { board, playerSymbols } = createStartingBoard();

        expect(playerSymbols.map((sym) => sym.definition.id)).toEqual([
            S.oral_tradition,
            S.wild_seeds,
        ]);
        expect(board).toHaveLength(3);
        expect(board.every((col) => col.length === 2)).toBe(true);
        expect(board[1][0]?.definition.id).toBe(S.oral_tradition);
        expect(board[1][1]?.definition.id).toBe(S.wild_seeds);
    });

    it('tops up missing starting wild seeds to one copy', () => {
        const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);

        const result = ensureStartingWildSeedsOwned([oral]);

        expect(result.filter((sym) => sym.definition.id === S.wild_seeds)).toHaveLength(1);
    });

    it('adds one irregular slot and preserves holes when expanding above the board', () => {
        const { board } = createStartingBoard();

        expect(getBoardExpansionCandidates(board)).toHaveLength(10);
        const expanded = expandBoardAt(board, 1, -1);

        expect(expanded).not.toBeNull();
        expect(getActiveBoardCoords(expanded!.board)).toHaveLength(7);
        expect(Object.prototype.hasOwnProperty.call(expanded!.board[0], 0)).toBe(false);
        expect(expanded!.board[1][0]).toBeNull();
        expect(expanded!.board[1][1]?.definition.id).toBe(S.oral_tradition);
    });

    it('does not offer expansions beyond the 8x6 board limit', () => {
        const fullBoard = Array(8).fill(null).map(() => Array(6).fill(null));

        expect(getActiveBoardCoords(fullBoard)).toHaveLength(48);
        expect(getRemainingBoardExpansionCapacity(fullBoard)).toBe(0);
        expect(getBoardExpansionCandidates(fullBoard)).toEqual([]);
        expect(expandBoardAt(fullBoard, 8, 0)).toBeNull();
        expect(expandBoardAt(fullBoard, 0, 6)).toBeNull();
    });

    it('allows the final slot inside the 8x6 board limit', () => {
        const board = Array(8).fill(null).map(() => Array(6).fill(null));
        delete board[7][5];

        expect(getRemainingBoardExpansionCapacity(board)).toBe(1);
        expect(getBoardExpansionCandidates(board)).toContainEqual({ x: 7, y: 5 });
        const expanded = expandBoardAt(board, 7, 5);

        expect(expanded).not.toBeNull();
        expect(getActiveBoardCoords(expanded!.board)).toHaveLength(48);
    });

    it('moves the center occupant when anchoring oral tradition', () => {
        const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);
        const wildSeed = createInstance(SYMBOLS[S.wild_seeds]!, []);
        const board = Array(3).fill(null).map(() => Array(2).fill(null));
        board[0][0] = oral;
        board[1][0] = wildSeed;

        const result = placeOralTraditionAtBoardCenter(board, [oral, wildSeed]);
        const placedIds = result.board.flat().filter(Boolean).map((sym) => sym!.instanceId);

        expect(result.board[1][0]?.instanceId).toBe(oral.instanceId);
        expect(placedIds).toEqual(expect.arrayContaining([oral.instanceId, wildSeed.instanceId]));
        expect(placedIds).toHaveLength(2);
    });

    it('does not grant random symbols when tribal village is destroyed from collection', () => {
        const removed = [createInstance(SYMBOLS[S.tribal_village]!, [])];

        const result = aggregateCollectionDestroyEffects(removed, false, []);

        expect(result.addSymbolDefIds).toEqual([]);
    });

    it('releases tax storehouse food when destroyed from collection', () => {
        const storehouse = createInstance(SYMBOLS[S.tax_storehouse]!, []);
        storehouse.effect_counter = 24;

        const result = aggregateCollectionDestroyEffects([storehouse], false, []);

        expect(result.food).toBe(24);
    });

    it('creates Oral Tradition board destroy culture from adjacent symbols', () => {
        const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);
        const wheat = createInstance(SYMBOLS[S.wheat]!, []);
        const rice = createInstance(SYMBOLS[S.corn]!, []);
        const board = Array(5).fill(null).map(() => Array(4).fill(null));
        board[2][1] = oral;
        board[1][1] = wheat;
        board[3][2] = rice;

        const effects = createStoredFoodDestroyEffects([oral], board);

        expect(effects).toEqual([{ x: 2, y: 1, food: 0, gold: 0, knowledge: 0, culture: 20 }]);
    });

    it('detects a desert-only terrain collection for the extra board expansion', () => {
        const desert = createInstance(SYMBOLS[S.desert]!, []);
        const oasis = createInstance(SYMBOLS[S.oasis]!, []);
        const wheat = createInstance(SYMBOLS[S.wheat]!, []);
        const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);

        expect(hasDesertOnlyTerrainSymbols([desert, oasis, wheat, oral])).toBe(true);
        // 사막이 없으면 조건을 만족하지 않는다.
        expect(hasDesertOnlyTerrainSymbols([oasis, wheat])).toBe(false);
        // 다른 지형을 하나라도 보유하면 조건이 깨진다.
        expect(
            hasDesertOnlyTerrainSymbols([desert, createInstance(SYMBOLS[S.grassland]!, [])]),
        ).toBe(false);
    });

    it('forces event choices when royal colony is destroyed from collection', () => {
        const colony = createInstance(SYMBOLS[S.royal_colony]!, []);

        const result = aggregateCollectionDestroyEffects([colony], false, []);

        expect(result.forceEventsInNextChoices).toBe(true);
    });
});
