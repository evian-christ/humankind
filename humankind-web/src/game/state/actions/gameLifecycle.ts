import type { LeaderId } from '../../data/leaders';
import { recordDemoNonConsumableRelicProgress } from '../../data/demoAchievements';
import { LEADERS, getLeaderProgressState, getLeaderStartingRelics, isLeaderPlayable } from '../../data/leaders';
import { S, SYMBOLS, type SymbolDefinition } from '../../data/symbolDefinitions';
import type { GameState } from '../gameStore';
import {
    createEmptyBoard,
    createStartingBoard,
    cloneBoardPreservingSlots,
    ensureStartingWildSeedsOwned,
    ensureOralTraditionOwned,
    placeStartingWildSeeds,
    placeOralTraditionAtBoardCenter,
} from '../gameStoreHelpers';
import { useRelicStore } from '../relicStore';
import { clearSavedGame } from '../saveGame';
import { createActiveStatusesForTurn, getActiveStatusIdsFromStates } from '../../data/statusDefinitions';
import { beginGameLifecycle } from '../gameLifecycleRun';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;

interface GameLifecycleDeps {
    set: GameStoreSet;
    get: () => GameState;
    createInstance: (def: SymbolDefinition, unlockedUpgrades?: readonly number[]) => ReturnType<typeof import('../gameStoreHelpers').createInstance>;
    generateRelicChoices: (cultureLevel?: number) => GameState['relicChoices'];
    pickRelicHalfPriceIdForGoldenTrade: (
        inStock: NonNullable<GameState['relicChoices'][number]>[],
        hasGoldenTrade: boolean,
    ) => number | null;
}

const createTutorialBoard = () =>
    Array(5)
        .fill(null)
        .map(() => Array(4).fill(null));

const isTutorialCrop = (symbol: ReturnType<typeof import('../gameStoreHelpers').createInstance>) =>
    symbol.definition.id === S.wheat || symbol.definition.id === S.rice;

const createCommonResetPatch = () => ({
    phase: 'idle' as const,
    symbolChoices: [],
    symbolSelectionRelicSourceId: null,
    symbolSelectionSymbolSourceId: null,
    isTurnSymbolSelection: false,
    lastEffects: [],
    counterDisplayOverrides: [],
    runningTotals: { food: 0, gold: 0, knowledge: 0, military: 0 },
    activeSlot: null,
    activeContributors: [],
    pendingContributors: [],
    effectPhase: null,
    effectPhase3ReachedThisRun: false,
    destroyRemovalBlinkStartedAtMs: null,
    earthquakeFx: null,
    lootMergeFx: null,
    eventLog: [],
    combatAnimation: null,
    combatShaking: false,
    preCombatShakeTarget: null,
    preCombatShakeRelicDefId: null,
    combatFloats: [],
    relicFloats: [],
    knowledgeUpgradeFloats: [],
    culture: 0,
    cultureLevel: 0,
    religionUnlocked: false,
    unlockedKnowledgeUpgrades: [],
    qinCurrencyStandardTurnsRemaining: 0,
    levelUpResearchPoints: 0,
    knowledgeResearchCredits: [],
    pendingBoardExpansions: 0,
    isRelicShopOpen: false,
    hasNewRelicShopStock: false,
    rerollsThisTurn: 0,
    barbarianSymbolThreat: 0,
    barbarianCampThreat: 0,
    naturalDisasterThreat: 0,
    activeStatusIds: getActiveStatusIdsFromStates(createActiveStatusesForTurn(0)),
    activeStatuses: createActiveStatusesForTurn(0),
    pendingNewThreatFloats: [],
    pendingOblivionFurnaceRelicId: null,
    pendingEdictSource: null,
    bonusSelectionQueue: [],
    forceTerrainInNextSymbolChoices: false,
    forceEventsInNextSymbolChoices: false,
    freeSelectionRerolls: 0,
    pendingFoodPayment: false,
    lootRewardChoices: [],
    pendingLootSlot: null,
    returnPhaseAfterDevKnowledgeUpgrade: null,
    isTutorialMode: false,
    tutorialSpinStep: null,
});

export const createGameLifecycleActions = ({
    set,
    get,
    createInstance,
    generateRelicChoices,
    pickRelicHalfPriceIdForGoldenTrade,
}: GameLifecycleDeps) => ({
    initializeGame: () => {
        beginGameLifecycle();
        const { board, playerSymbols: symbols } = createStartingBoard();
        set({
            leaderId: null,
            leaderProgressLevel: 1,
            lastLeaderProgressAward: null,
            food: 0,
            gold: 0,
            military: 0,
            knowledge: 0,
            era: 0,
            level: 0,
            turn: 0,
            board,
            playerSymbols: symbols,
            relicChoices: generateRelicChoices(),
            relicHalfPriceRelicId: null,
            prevBoard: createEmptyBoard(),
            ...createCommonResetPatch(),
        });
    },

    startGameWithDraft: (symbolIds: number[], leaderId: LeaderId) => {
        if (!isLeaderPlayable(leaderId)) return;
        beginGameLifecycle();
        clearSavedGame();
        const relicStore = useRelicStore.getState();
        const toRemove = relicStore.relics.map((r) => r.instanceId);
        toRemove.forEach((id) => relicStore.removeRelic(id));

        const leaderRelics = getLeaderStartingRelics(leaderId);
        leaderRelics.forEach((def) => relicStore.addRelic(def));
        recordDemoNonConsumableRelicProgress(leaderId, useRelicStore.getState().relics);

        const leader = LEADERS[leaderId];
        const leaderProgressLevel = getLeaderProgressState(leaderId).level;
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
            leaderProgressLevel,
            lastLeaderProgressAward: null,
            food: startingFood,
            gold: startingGold,
            military: 0,
            knowledge: 0,
            era: 0,
            level: 0,
            turn: 0,
            board: placed.board,
            playerSymbols: placed.playerSymbols,
            relicChoices: initialRelicChoices,
            relicHalfPriceRelicId: initialHalfPriceRelicId,
            prevBoard: cloneBoardPreservingSlots(placed.board),
            ...createCommonResetPatch(),
        });
    },

    startTutorialGame: () => {
        beginGameLifecycle();
        const relicStore = useRelicStore.getState();
        relicStore.resetRelics();
        set({
            leaderId: null,
            leaderProgressLevel: 1,
            lastLeaderProgressAward: null,
            food: 0,
            gold: 0,
            military: 0,
            knowledge: 45,
            era: 0,
            level: 0,
            turn: 0,
            board: createEmptyBoard(),
            playerSymbols: [],
            relicChoices: generateRelicChoices(),
            relicHalfPriceRelicId: null,
            prevBoard: createEmptyBoard(),
            ...createCommonResetPatch(),
            isTutorialMode: true,
            tutorialSpinStep: null,
        });
    },

    setupTutorialCornStep: () => {
        const wheat = SYMBOLS[S.wheat];
        const rice = SYMBOLS[S.rice];
        if (!wheat || !rice) return;
        const cropA = createInstance(wheat);
        const cropB = createInstance(rice);
        const board = createTutorialBoard();
        board[1][1] = cropA;
        board[3][1] = cropB;
        set({
            board,
            prevBoard: cloneBoardPreservingSlots(board),
            playerSymbols: [cropA, cropB],
            tutorialSpinStep: null,
            phase: 'idle',
        });
    },

    spinTutorialCornStep: () => {
        const state = get();
        const [cropA, cropB] = state.playerSymbols;
        if (!cropA || !cropB) return;
        const board = createTutorialBoard();
        board[1][0] = cropA;
        board[4][2] = cropB;
        set({
            prevBoard: cloneBoardPreservingSlots(state.board),
            board,
            turn: 1,
            phase: 'spinning',
            tutorialSpinStep: 'corn_spin',
            lastEffects: [],
            counterDisplayOverrides: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0, military: 0 },
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
            effectPhase: null,
            effectPhase3ReachedThisRun: false,
            lootMergeFx: null,
        });
    },

    spinTutorialMonumentStep: () => {
        const state = get();
        const cropSymbols = state.playerSymbols.filter(isTutorialCrop);
        const monument = state.playerSymbols.find((symbol) => symbol.definition.id === S.monument);
        if (cropSymbols.length < 2 || !monument) return;
        const board = createTutorialBoard();
        board[1][0] = cropSymbols[0];
        board[4][2] = cropSymbols[1];
        board[2][1] = monument;
        set({
            prevBoard: cloneBoardPreservingSlots(state.board),
            board,
            turn: state.turn + 1,
            phase: 'spinning',
            tutorialSpinStep: 'monument_spin',
            lastEffects: [],
            counterDisplayOverrides: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0, military: 0 },
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
            effectPhase: null,
            effectPhase3ReachedThisRun: false,
            lootMergeFx: null,
        });
    },

    setupTutorialAdjacencyStep: () => {
        const state = get();
        if (!state.isTutorialMode || state.tutorialSpinStep !== 'monument_done') return;
        const seaDefinition = SYMBOLS[S.sea];
        const pearlDefinition = SYMBOLS[S.pearl];
        if (!seaDefinition || !pearlDefinition) return;

        const sea = state.playerSymbols.find((symbol) => symbol.definition.id === S.sea)
            ?? createInstance(seaDefinition);
        const pearl = state.playerSymbols.find((symbol) => symbol.definition.id === S.pearl)
            ?? createInstance(pearlDefinition);
        const playerSymbols = [
            ...state.playerSymbols.filter((symbol) => symbol.definition.id !== S.sea && symbol.definition.id !== S.pearl),
            sea,
            pearl,
        ];
        const cropSymbols = playerSymbols.filter(isTutorialCrop);
        const monument = playerSymbols.find((symbol) => symbol.definition.id === S.monument);
        const board = createTutorialBoard();
        if (cropSymbols[0]) board[0][0] = cropSymbols[0];
        if (cropSymbols[1]) board[4][3] = cropSymbols[1];
        if (monument) board[2][2] = monument;
        board[2][1] = sea;
        board[3][1] = pearl;
        set({
            board,
            prevBoard: board.map((col) => [...col]),
            playerSymbols,
            phase: 'idle',
        });
    },

    spinTutorialAdjacencyStep: () => {
        const state = get();
        const cropSymbols = state.playerSymbols.filter(isTutorialCrop);
        const monument = state.playerSymbols.find((symbol) => symbol.definition.id === S.monument);
        const sea = state.playerSymbols.find((symbol) => symbol.definition.id === S.sea);
        const pearl = state.playerSymbols.find((symbol) => symbol.definition.id === S.pearl);
        if (cropSymbols.length < 2 || !monument || !sea || !pearl) return;

        const board = createTutorialBoard();
        board[2][1] = sea;
        board[1][0] = cropSymbols[0];
        board[2][0] = cropSymbols[1];
        board[1][1] = monument;
        board[3][2] = pearl;
        set({
            prevBoard: state.board.map((col) => [...col]),
            board,
            turn: state.turn + 1,
            phase: 'spinning',
            tutorialSpinStep: 'adjacency_spin',
            lastEffects: [],
            counterDisplayOverrides: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0, military: 0 },
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
            effectPhase: null,
            effectPhase3ReachedThisRun: false,
            lootMergeFx: null,
        });
    },

    setupTutorialSelectionStep: () => {
        const state = get();
        if (!state.isTutorialMode || state.tutorialSpinStep !== 'corn_done' || state.phase !== 'idle') return;
        const monument = SYMBOLS[S.monument];
        const rice = SYMBOLS[S.rice];
        const mountain = SYMBOLS[S.mountain];
        if (!monument || !rice || !mountain) return;
        set({
            phase: 'selection',
            symbolChoices: [monument, rice, mountain],
            symbolSelectionRelicSourceId: null,
            rerollsThisTurn: 0,
        });
    },
});
