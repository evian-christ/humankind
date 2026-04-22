import { describe, expect, it } from 'vitest';
import { S, Sym, type SymbolDefinition } from '../../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../../types';
import {
    collectCombatDestroyedSymbols,
    collectCombatEvents,
    collectLootFromDestroyedCamps,
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

        expect(board[1][0]?.enemy_hp).toBe(5);
        expect(board[1][0]?.is_marked_for_destruction).toBe(false);
        expect(result.animation).toEqual({ ax: 0, ay: 0, tx: 1, ty: 0, atkDmg: 5, counterDmg: 0 });
    });

    it('collects destroyed ids and camp loot', () => {
        const board = createEmptyBoard();
        const camp = createInstance(Sym.barbarian_camp, 'camp');
        camp.is_marked_for_destruction = true;
        board[0][0] = camp;

        const destroyedIds = new Set(collectCombatDestroyedSymbols(board, 5, 4));

        expect(destroyedIds.has('camp')).toBe(true);
        expect(collectLootFromDestroyedCamps(board, 5, 4, destroyedIds)).toEqual([S.loot]);
    });
});
