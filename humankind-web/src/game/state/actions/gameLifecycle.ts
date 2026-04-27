import type { LeaderId } from '../../data/leaders';
import { LEADERS, getLeaderStartingRelics, isLeaderPlayable } from '../../data/leaders';
import { RELICS } from '../../data/relicDefinitions';
import { TOTAL_STAGE_COUNT, getStageStartingRelicCounts } from '../../data/stages';
import { SYMBOLS, type SymbolDefinition } from '../../data/symbolDefinitions';
import { RELIC_ID } from '../../logic/relics/relicIds';
import type { GameState } from '../gameStore';
import {
    createEmptyBoard,
    createStartingBoard,
    ensureOralTraditionOwned,
    placeOralTraditionAtBoardCenter,
} from '../gameStoreHelpers';
import { useRelicStore } from '../relicStore';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;

interface GameLifecycleDeps {
    set: GameStoreSet;
    createInstance: (def: SymbolDefinition, unlockedUpgrades?: readonly number[]) => ReturnType<typeof import('../gameStoreHelpers').createInstance>;
    generateRelicChoices: () => GameState['relicChoices'];
    pickRelicHalfPriceIdForGoldenTrade: (
        inStock: NonNullable<GameState['relicChoices'][number]>[],
        hasGoldenTrade: boolean,
    ) => number | null;
}

const createCommonResetPatch = () => ({
    phase: 'idle' as const,
    symbolChoices: [],
    symbolSelectionRelicSourceId: null,
    lastEffects: [],
    runningTotals: { food: 0, gold: 0, knowledge: 0 },
    activeSlot: null,
    activeContributors: [],
    pendingContributors: [],
    effectPhase: null,
    effectPhase3ReachedThisRun: false,
    eventLog: [],
    combatAnimation: null,
    combatShaking: false,
    preCombatShakeTarget: null,
    preCombatShakeRelicDefId: null,
    combatFloats: [],
    relicFloats: [],
    knowledgeUpgradeFloats: [],
    religionUnlocked: false,
    unlockedKnowledgeUpgrades: [],
    bonusXpPerTurn: 0,
    levelUpResearchPoints: 0,
    isRelicShopOpen: false,
    hasNewRelicShopStock: false,
    rerollsThisTurn: 0,
    barbarianSymbolThreat: 0,
    barbarianCampThreat: 0,
    naturalDisasterThreat: 0,
    pendingNewThreatFloats: [],
    pendingCombatLootAdds: [],
    pendingDestroySource: null,
    pendingOblivionFurnaceRelicId: null,
    bonusSelectionQueue: [],
    edictRemovalPending: false,
    forceTerrainInNextSymbolChoices: false,
    freeSelectionRerolls: 0,
    destroySelectionMaxSymbols: 3,
    territorialAfterEdictPending: false,
    returnPhaseAfterDevKnowledgeUpgrade: null,
});

export const createGameLifecycleActions = ({
    set,
    createInstance,
    generateRelicChoices,
    pickRelicHalfPriceIdForGoldenTrade,
}: GameLifecycleDeps) => ({
    initializeGame: () => {
        const { board, playerSymbols: symbols } = createStartingBoard();
        set({
            leaderId: null,
            food: 0,
            gold: 0,
            knowledge: 0,
            era: 1,
            level: 0,
            turn: 0,
            stageId: 1,
            board,
            playerSymbols: symbols,
            relicChoices: generateRelicChoices(),
            relicHalfPriceRelicId: null,
            prevBoard: createEmptyBoard(),
            ...createCommonResetPatch(),
        });
    },

    startGameWithDraft: (symbolIds: number[], leaderId: LeaderId, stageId: number) => {
        if (!isLeaderPlayable(leaderId)) return;
        const resolvedStage = stageId >= 1 && stageId <= TOTAL_STAGE_COUNT ? stageId : 1;
        const relicStore = useRelicStore.getState();
        const toRemove = relicStore.relics.map((r) => r.instanceId);
        toRemove.forEach((id) => relicStore.removeRelic(id));

        const leaderRelics = getLeaderStartingRelics(leaderId);
        leaderRelics.forEach((def) => relicStore.addRelic(def));

        const { debris: debrisCount, tribe: tribeCount } = getStageStartingRelicCounts(resolvedStage);
        const debrisDef = RELICS[RELIC_ID.ANCIENT_RELIC_DEBRIS];
        const tribeDef = RELICS[RELIC_ID.ANCIENT_TRIBE_JOIN];
        if (debrisDef) {
            for (let i = 0; i < debrisCount; i++) relicStore.addRelic(debrisDef);
        }
        if (tribeDef) {
            for (let i = 0; i < tribeCount; i++) relicStore.addRelic(tribeDef);
        }

        const leader = LEADERS[leaderId];
        const startingFood = leader?.startingFood ?? 0;
        const startingGold = leader?.startingGold ?? 0;

        const initialRelicChoices = generateRelicChoices();
        const stockedRelics = initialRelicChoices.filter((choice): choice is NonNullable<typeof choice> => choice != null);
        const initialHalfPriceRelicId = pickRelicHalfPriceIdForGoldenTrade(stockedRelics, leaderId === 'ramesses');

        let playerSymbols = symbolIds
            .map((id) => SYMBOLS[id])
            .filter((def): def is SymbolDefinition => def != null)
            .map((def) => createInstance(def));

        playerSymbols = ensureOralTraditionOwned(playerSymbols);

        const board = createEmptyBoard();
        const placed = placeOralTraditionAtBoardCenter(board, playerSymbols);

        set({
            leaderId,
            food: startingFood,
            gold: startingGold,
            knowledge: 0,
            era: 1,
            level: 0,
            turn: 0,
            stageId: resolvedStage,
            board: placed.board,
            playerSymbols: placed.playerSymbols,
            relicChoices: initialRelicChoices,
            relicHalfPriceRelicId: initialHalfPriceRelicId,
            prevBoard: placed.board.map((col) => [...col]),
            ...createCommonResetPatch(),
        });
    },
});
