import { RELIC_ID } from '../../logic/relics/relicIds';
import { useRelicStore } from '../relicStore';
import type { GameState } from '../gameStore';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
export type GameStoreGet = () => GameState;

interface RelicShopFlowDeps {
    get: GameStoreGet;
    set: GameStoreSet;
}

export const createRelicShopFlowActions = ({ get, set }: RelicShopFlowDeps) => ({
    buyRelic: (relicId: number) => {
        const state = get();
        const relicIndex = state.relicChoices.findIndex((r) => r && r.id === relicId);
        if (relicIndex === -1) return;

        const def = state.relicChoices[relicIndex];
        if (!def) return;

        const hasGoldenTrade = state.leaderId === 'ramesses';
        const isHalfPrice = state.relicHalfPriceRelicId === relicId;
        const effectiveCost = hasGoldenTrade && isHalfPrice ? Math.floor(def.cost * 0.5) : def.cost;

        if (state.gold < effectiveCost) return;

        useRelicStore.getState().addRelic(def);

        set((s) => {
            const newChoices = [...s.relicChoices];
            newChoices[relicIndex] = null;
            return {
                gold: s.gold - effectiveCost,
                relicChoices: newChoices,
                relicHalfPriceRelicId: s.relicHalfPriceRelicId === relicId ? null : s.relicHalfPriceRelicId,
            };
        });

        if (def.id === RELIC_ID.TEN_COMMANDMENTS) {
            // Unlock is passive; no immediate state patch required.
        }
    },
});
