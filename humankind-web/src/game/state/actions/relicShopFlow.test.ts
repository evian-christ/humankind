import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '../gameStore';
import { createRelicShopFlowActions } from './relicShopFlow';
import { MAX_RELICS, useRelicStore } from '../relicStore';
import { RELICS } from '../../data/relicDefinitions';
import { RELIC_ID } from '../../logic/relics/relicIds';

describe('relic shop flow', () => {
    beforeEach(() => {
        useRelicStore.getState().resetRelics();
    });

    it('blocks relic purchases during symbol selection', () => {
        const state = {
            phase: 'selection',
            relicChoices: [{ id: 1, cost: 0 }],
            gold: 100,
        } as unknown as GameState;
        const set = vi.fn();
        const actions = createRelicShopFlowActions({
            get: () => state,
            set,
        });

        actions.buyRelic(1);

        expect(set).not.toHaveBeenCalled();
    });

    it('does not charge gold when the relic inventory is full', () => {
        const relic = RELICS[1]!;
        for (let index = 0; index < MAX_RELICS; index += 1) {
            useRelicStore.getState().addRelic(relic);
        }
        const state = {
            phase: 'idle',
            relicChoices: [relic],
            relicHalfPriceRelicId: null,
            leaderId: null,
            level: 0,
            gold: 100,
        } as unknown as GameState;
        const set = vi.fn();
        const actions = createRelicShopFlowActions({
            get: () => state,
            set,
        });

        actions.buyRelic(relic.id);

        expect(set).not.toHaveBeenCalled();
        expect(useRelicStore.getState().relics).toHaveLength(MAX_RELICS);
    });

    it('allows buying a consumable when the non-consumable inventory is full', () => {
        const permanentRelic = RELICS[RELIC_ID.CLOVIS_SPEAR]!;
        const consumableRelic = RELICS[RELIC_ID.PROPHECY_DIE]!;
        for (let index = 0; index < MAX_RELICS; index += 1) {
            useRelicStore.getState().addRelic(permanentRelic);
        }
        const state = {
            phase: 'idle',
            relicChoices: [consumableRelic],
            relicHalfPriceRelicId: null,
            leaderId: null,
            level: 0,
            gold: 100,
            turn: 1,
            appendEventLog: vi.fn(),
        } as unknown as GameState;
        const set = vi.fn();
        const actions = createRelicShopFlowActions({
            get: () => state,
            set,
        });

        actions.buyRelic(consumableRelic.id);

        expect(useRelicStore.getState().relics).toHaveLength(MAX_RELICS + 1);
        expect(set).toHaveBeenCalled();
    });
});
