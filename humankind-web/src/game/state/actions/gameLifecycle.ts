import { S, SYMBOLS, type SymbolDefinition } from '../../data/symbolDefinitions';
import { isCompleteSymbolSetDeck, OWNED_SYMBOL_SET_IDS, type SymbolSetId } from '../../data/symbolSets';
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
import { clearSavedGame } from '../saveGame';
import { createActiveStatusesForTurn, getActiveStatusIdsFromStates } from '../../data/statusDefinitions';
import { beginGameLifecycle } from '../gameLifecycleRun';
import { createEmptyKnowledgeUpgradeLevels } from '../../data/knowledgeUpgradeTracks';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;

interface GameLifecycleDeps {
    set: GameStoreSet;
    get: () => GameState;
    createInstance: (def: SymbolDefinition, unlockedUpgrades?: readonly number[]) => ReturnType<typeof import('../gameStoreHelpers').createInstance>;
}

const createTutorialBoard = () =>
    Array(5)
        .fill(null)
        .map(() => Array(4).fill(null));

const isTutorialCrop = (symbol: ReturnType<typeof import('../gameStoreHelpers').createInstance>) =>
    symbol.definition.id === S.wheat || symbol.definition.id === S.corn;

const createCommonResetPatch = () => ({
    symbolSetId: null as SymbolSetId | null,
    symbolSetIds: null as SymbolSetId[] | null,
    phase: 'idle' as const,
    symbolChoices: [],
    symbolSelectionSymbolSourceId: null,
    isTurnSymbolSelection: false,
    lastEffects: [],
    counterDisplayOverrides: [],
    runningTotals: { food: 0, gold: 0, knowledge: 0 },
    activeSlot: null,
    activeContributors: [],
    pendingContributors: [],
    effectPhase: null,
    effectPhase3ReachedThisRun: false,
    destroyRemovalBlinkStartedAtMs: null,
    earthquakeFx: null,
    lootMergeFx: null,
    eventLog: [],
    knowledgeUpgradeFloats: [],
    religionUnlocked: true,
    unlockedKnowledgeUpgrades: [],
    knowledgeUpgradeLevels: createEmptyKnowledgeUpgradeLevels(),
    levelUpResearchPoints: 0,
    knowledgeResearchCredits: [],
    pendingBoardExpansions: 0,
    rerollsThisTurn: 0,
    naturalDisasterThreat: 0,
    activeStatusIds: getActiveStatusIdsFromStates(createActiveStatusesForTurn(0)),
    activeStatuses: createActiveStatusesForTurn(0),
    pendingNewThreatFloats: [],
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
}: GameLifecycleDeps) => ({
    initializeGame: () => {
        beginGameLifecycle();
        const { board, playerSymbols: symbols } = createStartingBoard();
        set({
            food: 0,
            gold: 0,
            knowledge: 0,
            era: 0,
            level: 0,
            turn: 0,
            board,
            playerSymbols: symbols,
            prevBoard: createEmptyBoard(),
            ...createCommonResetPatch(),
        });
    },

    startGameWithDraft: (symbolIds: number[], symbolSetIds: readonly SymbolSetId[] | null = null) => {
        if (symbolSetIds != null && (
            !isCompleteSymbolSetDeck(symbolSetIds) ||
            symbolSetIds.some((id) => !OWNED_SYMBOL_SET_IDS.includes(id))
        )) return;
        beginGameLifecycle();
        clearSavedGame();
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
            food: 0,
            gold: 0,
            knowledge: 0,
            era: 0,
            level: 0,
            turn: 0,
            board: placed.board,
            playerSymbols: placed.playerSymbols,
            prevBoard: cloneBoardPreservingSlots(placed.board),
            ...createCommonResetPatch(),
            symbolSetIds: symbolSetIds ? [...symbolSetIds] : null,
        });
    },

    startTutorialGame: () => {
        beginGameLifecycle();
        set({
            food: 0,
            gold: 0,
            knowledge: 45,
            era: 0,
            level: 0,
            turn: 0,
            board: createEmptyBoard(),
            playerSymbols: [],
            prevBoard: createEmptyBoard(),
            ...createCommonResetPatch(),
            isTutorialMode: true,
            tutorialSpinStep: null,
        });
    },

    setupTutorialCornStep: () => {
        const wheat = SYMBOLS[S.wheat];
        const corn = SYMBOLS[S.corn];
        if (!wheat || !corn) return;
        const cropA = createInstance(wheat);
        const cropB = createInstance(corn);
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
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
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
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
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
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
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
        const corn = SYMBOLS[S.corn];
        const mountain = SYMBOLS[S.mountain];
        if (!monument || !corn || !mountain) return;
        set({
            phase: 'selection',
            symbolChoices: [monument, corn, mountain],
            rerollsThisTurn: 0,
        });
    },
});
