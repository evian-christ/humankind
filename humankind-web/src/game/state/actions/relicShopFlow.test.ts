import { describe, expect, it, vi } from 'vitest';
import type { GameState } from '../gameStore';
import { createRelicShopFlowActions } from './relicShopFlow';

describe('relic shop flow', () => {
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
});
