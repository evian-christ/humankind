import { describe, expect, it } from 'vitest';
import { Sym, type SymbolDefinition } from '../../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../../types';
import {
    collectCombatDestroyedSymbols,
    collectCombatEvents,
    resolveCombatStep,
} from './combatResolution';
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

const getAdjacentCoords = (x: number, y: number) => {
    const adj: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < 5 && ny >= 0 && ny < 4) adj.push({ x: nx, y: ny });
        }
    }
    return adj;
};

const getEffectiveMaxHP = (sym: PlayerSymbolInstance) => sym.definition.base_hp ?? 0;

describe('combatResolution', () => {
    it('collects living combat events in slot order', () => {
        const board = createEmptyBoard();
        board[2][0] = createInstance(Sym.enemy_warrior, 'enemy_2');
        board[0][1] = createInstance(Sym.warrior, 'unit_1');
        board[1][1] = { ...createInstance(Sym.enemy_warrior, 'dead_enemy'), is_marked_for_destruction: true };

        expect(collectCombatEvents(board, 5, 4)).toEqual([
            { ax: 2, ay: 0 },
            { ax: 0, ay: 1 },
        ]);
    });

    it('applies one combat hit and returns the animation payload', () => {
        const board = createEmptyBoard();
        board[0][0] = createInstance(Sym.warrior, 'unit');
        board[1][0] = createInstance(Sym.enemy_warrior, 'enemy');

        const result = resolveCombatStep({
            board,
            width: 5,
            height: 4,
            event: { ax: 0, ay: 0 },
            getAdjacentCoords,
            getEffectiveMaxHP,
        });

        expect(board[1][0]?.enemy_hp).toBe(7);
        expect(board[1][0]?.is_marked_for_destruction).toBe(false);
        expect(result.animation).toEqual({ ax: 0, ay: 0, tx: 1, ty: 0, atkDmg: 3, counterDmg: 0 });
    });

    it('lets upgraded ranged units target the whole board', () => {
        const board = createEmptyBoard();
        board[4][3] = createInstance(Sym.crossbowman, 'crossbow');
        board[0][0] = createInstance(Sym.enemy_warrior, 'enemy_a');
        board[4][2] = createInstance(Sym.enemy_warrior, 'enemy_b');

        const result = resolveCombatStep({
            board,
            width: 5,
            height: 4,
            event: { ax: 4, ay: 3 },
            getAdjacentCoords,
            getEffectiveMaxHP,
        });

        expect(board[0][0]?.enemy_hp).toBe(6);
        expect(board[4][2]?.enemy_hp).toBe(10);
        expect(result.animation).toEqual({ ax: 4, ay: 3, tx: 0, ty: 0, atkDmg: 4, counterDmg: 0 });
    });

    it('collects destroyed ids', () => {
        const board = createEmptyBoard();
        const camp = createInstance(Sym.barbarian_camp, 'camp');
        camp.is_marked_for_destruction = true;
        board[0][0] = camp;

        const destroyedIds = new Set(collectCombatDestroyedSymbols(board, 5, 4));

        expect(destroyedIds.has('camp')).toBe(true);
    });
});
