import { describe, expect, it } from 'vitest';
import {
    aggregateCollectionDestroyEffects,
    createStartingBoard,
    ensureStartingWildSeedsOwned,
    createInstance,
    placeOralTraditionAtBoardCenter,
} from './gameStoreHelpers';
import { S, SYMBOLS } from '../data/symbolDefinitions';

describe('gameStoreHelpers starting layout', () => {
    it('creates a starting board with oral tradition and five wild seeds in fixed slots', () => {
        const { board, playerSymbols } = createStartingBoard();

        expect(playerSymbols.map((sym) => sym.definition.id)).toEqual([
            S.oral_tradition,
            S.wild_seeds,
            S.wild_seeds,
            S.wild_seeds,
            S.wild_seeds,
            S.wild_seeds,
        ]);
        expect(board[2][1]?.definition.id).toBe(S.oral_tradition);
        expect(board[0][1]?.definition.id).toBe(S.wild_seeds);
        expect(board[1][2]?.definition.id).toBe(S.wild_seeds);
        expect(board[4][1]?.definition.id).toBe(S.wild_seeds);
        expect(board[3][2]?.definition.id).toBe(S.wild_seeds);
        expect(board[2][3]?.definition.id).toBe(S.wild_seeds);
    });

    it('tops up missing starting wild seeds to five copies', () => {
        const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);
        const withOneSeed = [
            oral,
            createInstance(SYMBOLS[S.wild_seeds]!, []),
        ];

        const result = ensureStartingWildSeedsOwned(withOneSeed);

        expect(result.filter((sym) => sym.definition.id === S.wild_seeds)).toHaveLength(5);
    });

    it('moves the center occupant when anchoring oral tradition', () => {
        const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);
        const wildSeed = createInstance(SYMBOLS[S.wild_seeds]!, []);
        const board = Array(5).fill(null).map(() => Array(4).fill(null));
        board[0][0] = oral;
        board[2][1] = wildSeed;

        const result = placeOralTraditionAtBoardCenter(board, [oral, wildSeed]);
        const placedIds = result.board.flat().filter(Boolean).map((sym) => sym!.instanceId);

        expect(result.board[2][1]?.instanceId).toBe(oral.instanceId);
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

    it('forces event choices when royal colony is destroyed from collection', () => {
        const colony = createInstance(SYMBOLS[S.royal_colony]!, []);

        const result = aggregateCollectionDestroyEffects([colony], false, []);

        expect(result.forceEventsInNextChoices).toBe(true);
    });
});
