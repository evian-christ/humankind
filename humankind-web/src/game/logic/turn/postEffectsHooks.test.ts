import { describe, expect, it } from 'vitest';
import { SYMBOLS_BY_KEY, type SymbolDefinition } from '../../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../../types';
import { runPostEffectsHooks, type BoardGrid } from './postEffectsHooks';

const instance = (
    definition: SymbolDefinition,
    instanceId: string,
    isMarkedForDestruction = false,
): PlayerSymbolInstance => ({
    definition,
    instanceId,
    effect_counter: 0,
    is_marked_for_destruction: isMarkedForDestruction,
});

const board = (width: number, height: number): BoardGrid =>
    Array.from({ length: width }, () => Array.from({ length: height }, () => null));

describe('runPostEffectsHooks', () => {
    it('collects symbols marked for destruction', () => {
        const grid = board(2, 1);
        grid[0][0] = instance(SYMBOLS_BY_KEY.corn, 'corn', true);

        const result = runPostEffectsHooks({ board: grid, boardWidth: 2, boardHeight: 1, effects: [] });

        expect(result.destroyedCount).toBe(1);
        expect(result.destroyedSymbols).toEqual([
            { id: SYMBOLS_BY_KEY.corn.id, x: 0, y: 0 },
        ]);
    });

    it('grants Caravanserai resources for a destroyed producing symbol', () => {
        const grid = board(2, 1);
        grid[0][0] = instance(SYMBOLS_BY_KEY.corn, 'corn', true);
        grid[1][0] = instance(SYMBOLS_BY_KEY.caravanserai, 'caravanserai');
        const effects = [{ x: 0, y: 0, food: 2, gold: 0, knowledge: 0 }];

        const result = runPostEffectsHooks({ board: grid, boardWidth: 2, boardHeight: 1, effects });

        expect(result.bonusFood).toBe(10);
        expect(result.bonusGold).toBe(0);
        expect(result.bonusKnowledge).toBe(0);
        expect(effects).toContainEqual({ x: 1, y: 0, food: 10, gold: 0, knowledge: 0 });
    });

    it('charges the AGI core with positive knowledge and triggers victory at 500', () => {
        const grid = board(1, 1);
        const core = instance(SYMBOLS_BY_KEY.agi_core, 'agi');
        core.effect_counter = 495;
        grid[0][0] = core;

        const result = runPostEffectsHooks({
            board: grid,
            boardWidth: 1,
            boardHeight: 1,
            effects: [{ x: 0, y: 0, food: 0, gold: 0, knowledge: 5 }],
        });

        expect(core.effect_counter).toBe(500);
        expect(result.agiVictory).toBe(true);
    });
});
