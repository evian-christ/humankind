import type { LeaderId } from '../../data/leaders';
import { LEADERS, getLeaderStartingRelics, isLeaderPlayable } from '../../data/leaders';
import { TOTAL_STAGE_COUNT } from '../../data/stages';
import { SYMBOLS, type SymbolDefinition } from '../../data/symbolDefinitions';
import type { GameState } from '../gameStore';
import {
    createEmptyBoard,
    createStartingBoard,
    ensureStartingWildSeedsOwned,
    ensureOralTraditionOwned,
    placeStartingWildSeeds,
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
    pendingDestroySource: null,
    pendingOblivionFurnaceRelicId: null,
    pendingEdictSource: null,
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
        playerSymbols = ensureStartingWildSeedsOwned(playerSymbols);

        const board = createEmptyBoard();
        const oralPlaced = placeOralTraditionAtBoardCenter(board, playerSymbols);
        const placed = placeStartingWildSeeds(oralPlaced.board, oralPlaced.playerSymbols);

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
