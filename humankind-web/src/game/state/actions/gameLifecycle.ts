import type { LeaderId } from '../../data/leaders';
import { LEADERS, getLeaderStartingRelics, isLeaderPlayable } from '../../data/leaders';
import { S, SYMBOLS, type SymbolDefinition } from '../../data/symbolDefinitions';
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
import { clearSavedGame } from '../saveGame';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;

interface GameLifecycleDeps {
    set: GameStoreSet;
    get: () => GameState;
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
    counterDisplayOverrides: [],
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
        const { board, playerSymbols: symbols } = createStartingBoard();
        set({
            leaderId: null,
            food: 0,
            gold: 0,
            knowledge: 0,
            era: 1,
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
        clearSavedGame();
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
            board: placed.board,
            playerSymbols: placed.playerSymbols,
            relicChoices: initialRelicChoices,
            relicHalfPriceRelicId: initialHalfPriceRelicId,
            prevBoard: placed.board.map((col) => [...col]),
            ...createCommonResetPatch(),
        });
    },

    startTutorialGame: () => {
        const relicStore = useRelicStore.getState();
        relicStore.resetRelics();
        set({
            leaderId: null,
            food: 0,
            gold: 0,
            knowledge: 45,
            era: 1,
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
        const corn = SYMBOLS[S.corn];
        if (!corn) return;
        const cornA = createInstance(corn);
        const cornB = createInstance(corn);
        const board = createEmptyBoard();
        board[1][1] = cornA;
        board[3][1] = cornB;
        set({
            board,
            prevBoard: board.map((col) => [...col]),
            playerSymbols: [cornA, cornB],
            tutorialSpinStep: null,
            phase: 'idle',
        });
    },

    spinTutorialCornStep: () => {
        const state = get();
        const [cornA, cornB] = state.playerSymbols;
        if (!cornA || !cornB) return;
        const board = createEmptyBoard();
        board[1][0] = cornA;
        board[4][2] = cornB;
        set({
            prevBoard: state.board.map((col) => [...col]),
            board,
            turn: 1,
            phase: 'spinning',
            tutorialSpinStep: 'corn_spin',
            lastEffects: [],
            counterDisplayOverrides: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
            effectPhase: null,
            effectPhase3ReachedThisRun: false,
        });
    },

    spinTutorialMonumentStep: () => {
        const state = get();
        const cornSymbols = state.playerSymbols.filter((symbol) => symbol.definition.id === S.corn);
        const monument = state.playerSymbols.find((symbol) => symbol.definition.id === S.monument);
        if (cornSymbols.length < 2 || !monument) return;
        const board = createEmptyBoard();
        board[1][0] = cornSymbols[0];
        board[4][2] = cornSymbols[1];
        board[2][1] = monument;
        set({
            prevBoard: state.board.map((col) => [...col]),
            board,
            turn: state.turn + 1,
            phase: 'spinning',
            tutorialSpinStep: 'monument_spin',
            lastEffects: [],
            counterDisplayOverrides: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
            effectPhase: null,
            effectPhase3ReachedThisRun: false,
        });
    },

    setupTutorialSelectionStep: () => {
        const monument = SYMBOLS[S.monument];
        const corn = SYMBOLS[S.corn];
        const mountain = SYMBOLS[S.mountain];
        if (!monument || !corn || !mountain) return;
        set({
            phase: 'selection',
            symbolChoices: [monument, corn, mountain],
            symbolSelectionRelicSourceId: null,
            rerollsThisTurn: 0,
        });
    },
});
