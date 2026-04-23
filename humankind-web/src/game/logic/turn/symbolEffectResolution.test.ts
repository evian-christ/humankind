import { describe, expect, it } from 'vitest';
import { S, SYMBOLS, Sym, type SymbolDefinition } from '../../data/symbolDefinitions';
import {
    AGRICULTURE_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';
import type { PlayerSymbolInstance } from '../../types';
import { processSingleSymbolEffects } from '../symbolEffects';
import {
    applyMerchantStoredGold,
    buildFoodBySlotKey,
    collectDisabledTerrainCoords,
    computeReligionDeferredEffects,
    slotKey,
} from './symbolEffectResolution';
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

describe('symbolEffectResolution', () => {
    it('collects terrain disabled by flood and initializes flood counter', () => {
        const board = createEmptyBoard();
        const flood = createInstance(SYMBOLS[S.flood]!, 'flood');
        board[1][1] = flood;
        board[0][0] = createInstance(Sym.grassland, 'terrain');
        board[2][2] = createInstance(Sym.wheat, 'normal');

        const disabled = collectDisabledTerrainCoords(board, 5, 4);

        expect(flood.effect_counter).toBe(3);
        expect(disabled.has(slotKey(0, 0))).toBe(true);
        expect(disabled.has(slotKey(2, 2))).toBe(false);
    });

    it('computes deferred Christianity and Islam effects from cached adjacent production', () => {
        const board = createEmptyBoard();
        board[1][1] = createInstance(Sym.christianity, 'christianity');
        board[2][1] = createInstance(Sym.wheat, 'wheat');
        board[2][2] = createInstance(Sym.islam, 'islam');
        board[3][2] = createInstance(Sym.library, 'library');

        const cache = new Map([
            [slotKey(2, 1), { food: 4, gold: 0, knowledge: 0 }],
            [slotKey(3, 2), { food: 0, gold: 0, knowledge: 5 }],
        ]);

        const result = computeReligionDeferredEffects({
            board,
            religionSlots: [
                { x: 1, y: 1, id: S.christianity },
                { x: 2, y: 2, id: S.islam },
            ],
            religionEffectCache: cache,
            getAdjacentCoords,
        });

        expect(result.effects).toEqual([
            { x: 1, y: 1, food: -46, gold: 0, knowledge: 0 },
            { x: 2, y: 2, food: -50, gold: 2, knowledge: 0 },
        ]);
        expect(result.foodDelta).toBe(-96);
        expect(result.goldDelta).toBe(2);
    });

    it('builds food totals by slot and applies pending merchant stored gold', () => {
        const board = createEmptyBoard();
        const merchant = createInstance(Sym.merchant, 'merchant');
        merchant.merchant_store_pending = true;
        merchant.stored_gold = 1;
        board[1][1] = merchant;

        const foodBySlotKey = buildFoodBySlotKey([
            { x: 0, y: 1, food: -2, gold: 0, knowledge: 0 },
            { x: 2, y: 1, food: 4, gold: 0, knowledge: 0 },
            { x: 2, y: 1, food: 3, gold: 0, knowledge: 0 },
        ]);

        applyMerchantStoredGold({
            board,
            width: 5,
            height: 4,
            foodBySlotKey,
            getAdjacentCoords,
        });

        expect(foodBySlotKey.get(slotKey(2, 1))).toBe(7);
        expect(merchant.stored_gold).toBe(8);
        expect(merchant.merchant_store_pending).toBe(false);
    });

    it('adds board grassland count to wheat payout with Three-field System', () => {
        const board = createEmptyBoard();
        const wheat = createInstance(Sym.wheat, 'wheat');
        wheat.effect_counter = 9;
        board[0][0] = wheat;
        board[2][3] = createInstance(Sym.grassland, 'grassland_1');
        board[3][3] = createInstance(Sym.grassland, 'grassland_2');
        board[4][3] = createInstance(Sym.grassland, 'grassland_3');

        const result = processSingleSymbolEffects(
            wheat,
            board,
            0,
            0,
            { upgrades: [THREE_FIELD_SYSTEM_UPGRADE_ID] },
        );

        expect(result.food).toBe(13);
        expect(wheat.effect_counter).toBe(0);
    });

    it('adds board grassland count on top of upgraded crop payout', () => {
        const board = createEmptyBoard();
        const rice = createInstance(Sym.rice, 'rice');
        rice.effect_counter = 19;
        board[0][0] = rice;
        board[2][3] = createInstance(Sym.grassland, 'grassland_1');
        board[3][3] = createInstance(Sym.grassland, 'grassland_2');

        const result = processSingleSymbolEffects(
            rice,
            board,
            0,
            0,
            { upgrades: [AGRICULTURE_UPGRADE_ID, THREE_FIELD_SYSTEM_UPGRADE_ID] },
        );

        expect(result.food).toBe(32);
        expect(rice.effect_counter).toBe(0);
    });
});
