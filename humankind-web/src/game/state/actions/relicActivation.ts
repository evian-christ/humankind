import { RELIC_ID } from '../../logic/relics/relicIds';
import {
    generateChoices as generateChoicesSelection,
    generateTerrainOnlyChoices as generateTerrainOnlyChoicesSelection,
} from '../../logic/selection/selectionLogic';
import { useRelicStore } from '../relicStore';
import type { GameState } from '../gameStore';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
export type GameStoreGet = () => GameState;

interface RelicActivationDeps {
    get: GameStoreGet;
    set: GameStoreSet;
    phaseAfterTurnFlowComplete: () => GameState['phase'];
}

const getEraReward = (era: number, rewards: readonly [number, number, number]): number => {
    const eraIndex = Number.isFinite(era) ? Math.max(0, Math.min(2, Math.floor(era) - 1)) : 0;
    return rewards[eraIndex];
};

export const createRelicActivationActions = ({
    get,
    set,
    phaseAfterTurnFlowComplete,
}: RelicActivationDeps) => ({
    activateClickableRelic: (instanceId: string) => {
        const state = get();
        if (state.phase !== 'idle') return;
        const relic = useRelicStore.getState().relics.find((r) => r.instanceId === instanceId);
        if (!relic) return;
        const defId = relic.definition.id;

        if (defId === RELIC_ID.OBLIVION_FURNACE) {
            const hasBoardSymbol = state.board.some((col) => col.some(Boolean));
            if (!hasBoardSymbol) return;
            set({
                phase: 'oblivion_furnace_board',
                pendingOblivionFurnaceRelicId: instanceId,
            });
            return;
        }

        if (defId === RELIC_ID.JOMON_POTTERY) {
            const stored = relic.bonus_stacks;
            const foodGain = stored * 2;
            if (stored <= 0) return;
            set((s) => ({
                food: s.food + foodGain,
                relicFloats: [
                    ...(s.relicFloats ?? []),
                    { relicInstanceId: instanceId, text: `+${foodGain}`, color: '#4ade80' },
                ],
            }));
            useRelicStore.getState().incrementRelicBonus(instanceId, -stored);
            setTimeout(() => useRelicStore.getState().removeRelic(instanceId), 260);
            get().appendEventLog({
                turn: state.turn,
                kind: 'relic',
                delta: { food: foodGain, gold: 0, knowledge: 0 },
                meta: { relicId: defId, action: 'jomon_cashout' },
            });
            return;
        }

        if (defId === RELIC_ID.TROY_GOLD_LOOT) {
            const goldGain = getEraReward(state.era, [25, 50, 100]);
            set((s) => ({
                gold: s.gold + goldGain,
                relicFloats: [
                    ...(s.relicFloats ?? []),
                    { relicInstanceId: instanceId, text: `+${goldGain}`, color: '#fbbf24' },
                ],
            }));
            setTimeout(() => useRelicStore.getState().removeRelic(instanceId), 260);
            get().appendEventLog({
                turn: state.turn,
                kind: 'relic',
                delta: { food: 0, gold: goldGain, knowledge: 0 },
                meta: { relicId: defId, action: 'troy_gold_cashout' },
            });
            return;
        }

        if (defId === RELIC_ID.EGYPTIAN_GRANARY_MODEL) {
            const foodGain = getEraReward(state.era, [30, 50, 100]);
            set((s) => ({
                food: s.food + foodGain,
                relicFloats: [
                    ...(s.relicFloats ?? []),
                    { relicInstanceId: instanceId, text: `+${foodGain}`, color: '#4ade80' },
                ],
            }));
            setTimeout(() => useRelicStore.getState().removeRelic(instanceId), 260);
            get().appendEventLog({
                turn: state.turn,
                kind: 'relic',
                delta: { food: foodGain, gold: 0, knowledge: 0 },
                meta: { relicId: defId, action: 'granary_food_cashout' },
            });
            return;
        }

        if (defId === RELIC_ID.ANCIENT_RELIC_DEBRIS) {
            useRelicStore.getState().removeRelic(instanceId);
            const res = generateChoicesSelection({
                era: state.era,
                religionUnlocked: state.religionUnlocked,
                upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
            });
            set({
                phase: 'selection',
                symbolChoices: res.choices,
                symbolSelectionRelicSourceId: RELIC_ID.ANCIENT_RELIC_DEBRIS,
                forceTerrainInNextSymbolChoices:
                    state.forceTerrainInNextSymbolChoices && res.consumedForceTerrain
                        ? false
                        : state.forceTerrainInNextSymbolChoices,
            });
            get().appendEventLog({
                turn: state.turn,
                kind: 'relic',
                meta: { relicId: defId, action: 'debris_symbol_pick' },
            });
            return;
        }

        if (defId === RELIC_ID.ANCIENT_TRIBE_JOIN) {
            useRelicStore.getState().removeRelic(instanceId);
            const choices = generateTerrainOnlyChoicesSelection({
                era: state.era,
                religionUnlocked: state.religionUnlocked,
                upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
            });
            set({
                phase: 'selection',
                symbolChoices: choices,
                symbolSelectionRelicSourceId: RELIC_ID.ANCIENT_TRIBE_JOIN,
            });
            get().appendEventLog({
                turn: state.turn,
                kind: 'relic',
                meta: { relicId: defId, action: 'tribe_join_terrain_pick' },
            });
            return;
        }

        set({ phase: phaseAfterTurnFlowComplete() });
    },
});
