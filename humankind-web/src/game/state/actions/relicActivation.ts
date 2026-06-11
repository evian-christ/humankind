import { RELIC_ID } from '../../logic/relics/relicIds';
import {
    generateChoices as generateChoicesSelection,
    generateEventOnlyChoices,
    generateTerrainOnlyChoices as generateTerrainOnlyChoicesSelection,
    generateUnitOnlyChoices,
} from '../../logic/selection/selectionLogic';
import { useRelicStore } from '../relicStore';
import type { GameState } from '../gameStore';
import { ELECTION_SYSTEM_UPGRADE_ID } from '../../data/knowledgeUpgrades';
import { getTrojanGoldLootReward } from '../gameCalculations';
import { getStandardSymbolChoiceCount } from '../gameStoreHelpers';

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

const getSelectionPhaseFreeRerollFloor = (upgrades: readonly number[]): number =>
    upgrades.map(Number).includes(ELECTION_SYSTEM_UPGRADE_ID) ? 1 : 0;

export const createRelicActivationActions = ({
    get,
    set,
    phaseAfterTurnFlowComplete,
}: RelicActivationDeps) => ({
    activateClickableRelic: (instanceId: string) => {
        const state = get();
        if (state.phase !== 'idle' && state.phase !== 'food_payment') return;
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
            const goldGain = getTrojanGoldLootReward(state.level);
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
                ownedSymbolDefIds: state.playerSymbols.map((s) => s.definition.id),
                choiceCount: getStandardSymbolChoiceCount(state.board),
                forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
                forceEventsInNextSymbolChoices: state.forceEventsInNextSymbolChoices,
            });
            set({
                phase: 'selection',
                symbolChoices: res.choices,
                symbolSelectionRelicSourceId: RELIC_ID.ANCIENT_RELIC_DEBRIS,
                symbolSelectionSymbolSourceId: null,
                isTurnSymbolSelection: false,
                freeSelectionRerolls: Math.max(
                    state.freeSelectionRerolls ?? 0,
                    getSelectionPhaseFreeRerollFloor(state.unlockedKnowledgeUpgrades ?? []),
                ),
                forceTerrainInNextSymbolChoices:
                    state.forceTerrainInNextSymbolChoices && res.consumedForceTerrain
                        ? false
                        : state.forceTerrainInNextSymbolChoices,
                forceEventsInNextSymbolChoices:
                    state.forceEventsInNextSymbolChoices && res.consumedForceEvents
                        ? false
                        : state.forceEventsInNextSymbolChoices,
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
                symbolSelectionSymbolSourceId: null,
                isTurnSymbolSelection: false,
                freeSelectionRerolls: Math.max(
                    state.freeSelectionRerolls ?? 0,
                    getSelectionPhaseFreeRerollFloor(state.unlockedKnowledgeUpgrades ?? []),
                ),
            });
            get().appendEventLog({
                turn: state.turn,
                kind: 'relic',
                meta: { relicId: defId, action: 'tribe_join_terrain_pick' },
            });
            return;
        }

        if (defId === RELIC_ID.MILITARY_LEVY) {
            useRelicStore.getState().removeRelic(instanceId);
            const choices = generateUnitOnlyChoices({
                era: state.era,
                religionUnlocked: state.religionUnlocked,
                upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
                ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                leaderId: state.leaderId,
                leaderProgressLevel: state.leaderProgressLevel,
            });
            set({
                phase: 'selection',
                symbolChoices: choices,
                symbolSelectionRelicSourceId: RELIC_ID.MILITARY_LEVY,
                symbolSelectionSymbolSourceId: null,
                isTurnSymbolSelection: false,
                freeSelectionRerolls: Math.max(
                    state.freeSelectionRerolls ?? 0,
                    getSelectionPhaseFreeRerollFloor(state.unlockedKnowledgeUpgrades ?? []),
                ),
            });
            get().appendEventLog({
                turn: state.turn,
                kind: 'relic',
                meta: { relicId: defId, action: 'military_levy_unit_pick' },
            });
            return;
        }

        if (defId === RELIC_ID.PROPHECY_DIE) {
            useRelicStore.getState().removeRelic(instanceId);
            const choices = generateEventOnlyChoices({
                era: state.era,
                ownedSymbolDefIds: state.playerSymbols.map((symbol) => symbol.definition.id),
                leaderId: state.leaderId,
                leaderProgressLevel: state.leaderProgressLevel,
            });
            set({
                phase: 'selection',
                symbolChoices: choices,
                symbolSelectionRelicSourceId: RELIC_ID.PROPHECY_DIE,
                symbolSelectionSymbolSourceId: null,
                isTurnSymbolSelection: false,
                freeSelectionRerolls: Math.max(
                    state.freeSelectionRerolls ?? 0,
                    getSelectionPhaseFreeRerollFloor(state.unlockedKnowledgeUpgrades ?? []),
                ),
            });
            get().appendEventLog({
                turn: state.turn,
                kind: 'relic',
                meta: { relicId: defId, action: 'prophecy_die_event_pick' },
            });
            return;
        }

        set({ phase: phaseAfterTurnFlowComplete() });
    },
});
