import { describe, expect, it } from 'vitest';
import {
    aggregateCollectionDestroyEffects,
    createStartingBoard,
    ensureStartingWildSeedsOwned,
    createInstance,
} from './gameStoreHelpers';
import { S, SYMBOLS } from '../data/symbolDefinitions';
import { SymbolType } from '../data/symbolTypes';

describe('gameStoreHelpers starting layout', () => {
    it('creates a starting board with oral tradition and two wild seeds in fixed slots', () => {
        const { board, playerSymbols } = createStartingBoard();

        expect(playerSymbols.map((sym) => sym.definition.id)).toEqual([
            S.oral_tradition,
            S.wild_seeds,
            S.wild_seeds,
        ]);
        expect(board[2][1]?.definition.id).toBe(S.oral_tradition);
        expect(board[1][2]?.definition.id).toBe(S.wild_seeds);
        expect(board[3][2]?.definition.id).toBe(S.wild_seeds);
    });

    it('tops up missing starting wild seeds to two copies', () => {
        const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);
        const withOneSeed = [
            oral,
            createInstance(SYMBOLS[S.wild_seeds]!, []),
        ];

        const result = ensureStartingWildSeedsOwned(withOneSeed);

        expect(result.filter((sym) => sym.definition.id === S.wild_seeds)).toHaveLength(2);
    });

    it('grants two random normal symbols when tribal village is destroyed from collection', () => {
        const removed = [createInstance(SYMBOLS[S.tribal_village]!, [])];

        const result = aggregateCollectionDestroyEffects(removed, false, []);

        expect(result.addSymbolDefIds).toHaveLength(2);
        expect(result.addSymbolDefIds.every((id) => SYMBOLS[id]?.type === SymbolType.NORMAL)).toBe(true);
    });
});
