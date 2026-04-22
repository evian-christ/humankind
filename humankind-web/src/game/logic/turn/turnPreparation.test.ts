import { describe, expect, it } from 'vitest';
import { S, SYMBOLS, Sym, type SymbolDefinition } from '../../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../../types';
import type { GameRng } from './rng';
import { prepareTurn } from './turnPreparation';
import type { BoardGrid } from './turnTypes';

const makeRng = (): GameRng => ({
    next: () => 0.99,
    int: (min) => min,
    pick: (items) => {
        if (items.length === 0) throw new Error('empty');
        return items[0]!;
    },
    shuffle: (items) => [...items],
});

const createInstanceFactory = () => {
    let id = 0;
    return (definition: SymbolDefinition): PlayerSymbolInstance => ({
        definition,
        instanceId: `test_${id++}`,
        effect_counter: 0,
        is_marked_for_destruction: false,
        remaining_attacks: definition.base_attack ? 3 : 0,
        enemy_hp: definition.base_hp,
    });
};

const createEmptyBoard = (): BoardGrid => Array(5).fill(null).map(() => Array(4).fill(null));

describe('prepareTurn', () => {
    it('places at most 20 symbols on a 5x4 board', () => {
        const createInstance = createInstanceFactory();
        const playerSymbols = Array.from({ length: 25 }, () => createInstance(Sym.wheat));

        const result = prepareTurn({
            board: createEmptyBoard(),
            playerSymbols,
            turn: 3,
            era: 2,
            boardWidth: 5,
            boardHeight: 4,
            unlockedKnowledgeUpgrades: [],
            threatState: {
                barbarianSymbolThreat: 0,
                barbarianCampThreat: 0,
                naturalDisasterThreat: 0,
            },
            rng: makeRng(),
            createSymbolInstance: createInstance,
            getThreatLabel: (key) => key,
        });

        const placedCount = result.board.flat().filter(Boolean).length;

        expect(result.board).toHaveLength(5);
        expect(result.board.every((col) => col.length === 4)).toBe(true);
        expect(placedCount).toBe(20);
    });

    it('keeps Oral Tradition fixed at the center on the first turn', () => {
        const createInstance = createInstanceFactory();
        const oral = createInstance(SYMBOLS[S.oral_tradition]!);
        const playerSymbols = [createInstance(Sym.wheat), oral, createInstance(Sym.rice)];

        const result = prepareTurn({
            board: createEmptyBoard(),
            playerSymbols,
            turn: 0,
            era: 2,
            boardWidth: 5,
            boardHeight: 4,
            unlockedKnowledgeUpgrades: [],
            threatState: {
                barbarianSymbolThreat: 0,
                barbarianCampThreat: 0,
                naturalDisasterThreat: 0,
            },
            rng: makeRng(),
            createSymbolInstance: createInstance,
            getThreatLabel: (key) => key,
        });

        expect(result.board[2][1]?.instanceId).toBe(oral.instanceId);
        expect(result.turn).toBe(1);
    });
});
