import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '../gameStore';
import { createRelicShopFlowActions } from './relicShopFlow';
import { MAX_RELICS, useRelicStore } from '../relicStore';
import { RELICS } from '../../data/relicDefinitions';

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
});
