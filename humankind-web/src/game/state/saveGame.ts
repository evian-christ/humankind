import { SYMBOLS } from '../data/symbolDefinitions';
import { isSymbolSetId, normalizeSymbolSetIds, SYMBOL_SET_DECK_SIZE } from '../data/symbolSets';
import { createActiveStatusesForTurn, getActiveStatusIdsFromStates } from '../data/statusDefinitions';
import type { ActiveStatusState } from '../data/statusDefinitions';
import { GAME_EVENTS, isGameEventDefinition } from '../data/eventDefinitions';
import type { PlayerSymbolInstance } from '../types';
import type { GamePhase, GameState, GameEventLogEntry } from './gameStore';
import { createEmptyBoard, isBoardSlotActive } from './gameStoreHelpers';
import type { KnowledgeResearchCredit } from './gameCalculations';
import {
    createEmptyKnowledgeUpgradeLevels,
    type KnowledgeUpgradeLevels,
} from '../data/knowledgeUpgradeTracks';

const SAVE_KEY = 'humankind.save.v1';
const SUPPORTED_SAVE_VERSIONS = new Set([1, 2, 3, 4, 5, 6]);
const SAVE_VERSION = 6;
const MAX_SAVED_EVENT_LOG = 400;

type SerializedBoard = (string | null | false)[][];
type SavedGamePhase = GamePhase | 'relic_shop_ready' | 'relic_shop' | 'oblivion_furnace_board';

const restorePhase = (phase: SavedGamePhase, hasPendingEdict: boolean): GamePhase => {
    if (phase === 'relic_shop_ready' || phase === 'relic_shop') return 'idle';
    if (phase === 'oblivion_furnace_board') return hasPendingEdict ? 'board_destroy_selection' : 'idle';
    return phase;
};

interface SerializedSymbol {
    definitionId: number;
    instanceId: string;
    effect_counter: number;
    is_marked_for_destruction: boolean;
    rainforest_growth_bonus?: { food: number; gold: number; knowledge: number };
    stored_gold?: number;
    merchant_store_pending?: boolean;
    suppress_destroy_overlay?: boolean;
}

interface SavedGame {
    version: number;
    savedAt: number;
    state: {
        food: number;
        gold: number;
        knowledge: number;
        level: number;
        era: number;
        turn: number;
        phase: SavedGamePhase;
        symbolSetId?: string | null;
        symbolSetIds?: string[] | null;
        board: SerializedBoard;
        playerSymbols: SerializedSymbol[];
        symbolChoices: number[];
        symbolSelectionSymbolSourceId?: number | null;
        isTurnSymbolSelection?: boolean;
        lastEffects?: GameState['lastEffects'];
        prevBoard: SerializedBoard;
        religionUnlocked: boolean;
        unlockedKnowledgeUpgrades: number[];
        knowledgeUpgradeLevels?: Partial<KnowledgeUpgradeLevels>;
        levelUpResearchPoints: number;
        knowledgeResearchCredits?: KnowledgeResearchCredit[];
        pendingBoardExpansions?: number;
        rerollsThisTurn: number;
        returnPhaseAfterDevKnowledgeUpgrade: SavedGamePhase | null;
        naturalDisasterThreat: number;
        activeStatusIds?: number[];
        activeStatuses?: ActiveStatusState[];
        pendingEdictSource: GameState['pendingEdictSource'];
        bonusSelectionQueue: GameState['bonusSelectionQueue'];
        forceTerrainInNextSymbolChoices: boolean;
        forceEventsInNextSymbolChoices?: boolean;
        freeSelectionRerolls: number;
        pendingFoodPayment?: boolean;
        eventLog: GameEventLogEntry[];
    };
}

const storage = (): Storage | null => {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
};

const serializeSymbol = (symbol: PlayerSymbolInstance): SerializedSymbol => ({
    definitionId: symbol.definition.id,
    instanceId: symbol.instanceId,
    effect_counter: symbol.effect_counter,
    is_marked_for_destruction: symbol.is_marked_for_destruction,
    rainforest_growth_bonus: symbol.rainforest_growth_bonus,
    stored_gold: symbol.stored_gold,
    merchant_store_pending: symbol.merchant_store_pending,
    suppress_destroy_overlay: symbol.suppress_destroy_overlay,
});

const deserializeSymbol = (
    saved: SerializedSymbol,
): PlayerSymbolInstance | null => {
    const baseDefinition = SYMBOLS[saved.definitionId];
    if (!baseDefinition) return null;
    return {
        definition: baseDefinition,
        instanceId: saved.instanceId,
        effect_counter: saved.effect_counter ?? 0,
        is_marked_for_destruction: saved.is_marked_for_destruction ?? false,
        rainforest_growth_bonus: saved.rainforest_growth_bonus,
        stored_gold: saved.stored_gold,
        merchant_store_pending: saved.merchant_store_pending,
        suppress_destroy_overlay: saved.suppress_destroy_overlay,
    };
};

const serializeBoard = (board: (PlayerSymbolInstance | null)[][]): SerializedBoard =>
    board.map((col, x) =>
        Array.from({ length: col.length }, (_, y) =>
            isBoardSlotActive(board, x, y) ? col[y]?.instanceId ?? null : false,
        ),
    );

const deserializeBoard = (
    savedBoard: SerializedBoard,
    symbolByInstanceId: Map<string, PlayerSymbolInstance>,
): (PlayerSymbolInstance | null)[][] => {
    const board = savedBoard.length > 0
        ? savedBoard.map((col) => new Array<PlayerSymbolInstance | null>(col.length))
        : createEmptyBoard();
    for (let x = 0; x < savedBoard.length; x++) {
        for (let y = 0; y < (savedBoard[x]?.length ?? 0); y++) {
            const instanceId = savedBoard[x]?.[y];
            if (instanceId === false) continue;
            board[x][y] = typeof instanceId === 'string'
                ? symbolByInstanceId.get(instanceId) ?? null
                : null;
        }
    }
    return board;
};

const EVENT_CHOICE_SAVE_OFFSET = 10000;

const serializeSelectionChoiceId = (choice: GameState['symbolChoices'][number]): number =>
    isGameEventDefinition(choice) ? EVENT_CHOICE_SAVE_OFFSET + choice.id : choice.id;

const mapSelectionChoices = (
    ids: number[],
): GameState['symbolChoices'] =>
    ids
        .map((id) => {
            if (id >= EVENT_CHOICE_SAVE_OFFSET) return GAME_EVENTS[id - EVENT_CHOICE_SAVE_OFFSET] ?? null;
            const definition = SYMBOLS[id];
            return definition ?? null;
        })
        .filter((choice): choice is GameState['symbolChoices'][number] => choice != null);

export function hasSavedGame(): boolean {
    const raw = storage()?.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
        const save = JSON.parse(raw) as Partial<SavedGame>;
        return (
            save.version != null && SUPPORTED_SAVE_VERSIONS.has(save.version)
        )
            && save.state != null
            && save.state.phase !== 'game_over'
            && save.state.phase !== 'victory';
    } catch {
        return false;
    }
}

export function clearSavedGame(): void {
    storage()?.removeItem(SAVE_KEY);
}

export function saveGameState(state: GameState): void {
    if (state.isTutorialMode) return;
    if (state.phase === 'game_over' || state.phase === 'victory') {
        clearSavedGame();
        return;
    }

    const store = storage();
    if (!store) return;

    const save: SavedGame = {
        version: SAVE_VERSION,
        savedAt: Date.now(),
        state: {
            food: state.food,
            gold: state.gold,
            knowledge: state.knowledge,
            level: state.level,
            era: state.era,
            turn: state.turn,
            phase: state.phase,
            symbolSetId: state.symbolSetId ?? null,
            symbolSetIds: state.symbolSetIds ?? null,
            board: serializeBoard(state.board),
            playerSymbols: state.playerSymbols.map(serializeSymbol),
            symbolChoices: state.symbolChoices.map(serializeSelectionChoiceId),
            symbolSelectionSymbolSourceId: state.symbolSelectionSymbolSourceId ?? null,
            isTurnSymbolSelection: state.isTurnSymbolSelection ?? false,
            lastEffects: [],
            prevBoard: serializeBoard(state.prevBoard),
            religionUnlocked: state.religionUnlocked,
            unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades,
            knowledgeUpgradeLevels: state.knowledgeUpgradeLevels,
            levelUpResearchPoints: state.levelUpResearchPoints,
            knowledgeResearchCredits: state.knowledgeResearchCredits ?? [],
            pendingBoardExpansions: state.pendingBoardExpansions,
            rerollsThisTurn: state.rerollsThisTurn,
            returnPhaseAfterDevKnowledgeUpgrade: state.returnPhaseAfterDevKnowledgeUpgrade,
            naturalDisasterThreat: state.naturalDisasterThreat,
            activeStatusIds: state.activeStatusIds,
            activeStatuses: state.activeStatuses,
            pendingEdictSource: state.pendingEdictSource,
            bonusSelectionQueue: state.bonusSelectionQueue,
            forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
            forceEventsInNextSymbolChoices: state.forceEventsInNextSymbolChoices,
            freeSelectionRerolls: state.freeSelectionRerolls,
            pendingFoodPayment: state.pendingFoodPayment,
            eventLog: state.eventLog.slice(-MAX_SAVED_EVENT_LOG),
        },
    };

    store.setItem(SAVE_KEY, JSON.stringify(save));
}

export function loadSavedGamePatch(): Partial<GameState> | null {
    const raw = storage()?.getItem(SAVE_KEY);
    if (!raw) return null;

    try {
        const save = JSON.parse(raw) as SavedGame;
        if (
            !SUPPORTED_SAVE_VERSIONS.has(save.version)
        ) return null;
        if (save.state.phase === 'game_over' || save.state.phase === 'victory') {
            clearSavedGame();
            return null;
        }

        const knowledgeUpgradeLevels = createEmptyKnowledgeUpgradeLevels();
        const unlockedKnowledgeUpgrades: number[] = [];
        const playerSymbols = save.state.playerSymbols
            .map((symbol) => deserializeSymbol(symbol))
            .filter((symbol): symbol is PlayerSymbolInstance => symbol != null);
        const symbolByInstanceId = new Map(playerSymbols.map((symbol) => [symbol.instanceId, symbol]));

        const activeStatuses = createActiveStatusesForTurn(save.state.turn);

        const phase = restorePhase(save.state.phase, save.state.pendingEdictSource != null);
        const savedSymbolSetIds = normalizeSymbolSetIds(save.state.symbolSetIds);

        return {
            isTutorialMode: false,
            food: save.state.food,
            gold: save.state.gold,
            knowledge: save.state.knowledge,
            level: save.state.level,
            era: save.state.era,
            turn: save.state.turn,
            phase,
            symbolSetId: isSymbolSetId(save.state.symbolSetId) ? save.state.symbolSetId : null,
            symbolSetIds: savedSymbolSetIds.length === SYMBOL_SET_DECK_SIZE ? savedSymbolSetIds : null,
            board: deserializeBoard(save.state.board, symbolByInstanceId),
            playerSymbols,
            symbolChoices: mapSelectionChoices(save.state.symbolChoices),
            symbolSelectionSymbolSourceId: save.state.symbolSelectionSymbolSourceId ?? null,
            isTurnSymbolSelection:
                save.state.isTurnSymbolSelection ??
                (
                    phase === 'selection' &&
                    save.state.symbolSelectionSymbolSourceId == null &&
                    save.state.bonusSelectionQueue.length === 0
                ),
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
            eventLog: save.state.eventLog ?? [],
            prevBoard: deserializeBoard(save.state.prevBoard, symbolByInstanceId),
            knowledgeUpgradeFloats: [],
            religionUnlocked: true,
            unlockedKnowledgeUpgrades,
            knowledgeUpgradeLevels,
            levelUpResearchPoints: 0,
            knowledgeResearchCredits: [],
            pendingBoardExpansions: save.state.pendingBoardExpansions ?? 0,
            rerollsThisTurn: save.state.rerollsThisTurn,
            returnPhaseAfterDevKnowledgeUpgrade: null,
            naturalDisasterThreat: save.state.naturalDisasterThreat,
            activeStatusIds: getActiveStatusIdsFromStates(activeStatuses),
            activeStatuses,
            pendingNewThreatFloats: [],
            pendingEdictSource: save.state.pendingEdictSource,
            bonusSelectionQueue: save.state.bonusSelectionQueue,
            forceTerrainInNextSymbolChoices: save.state.forceTerrainInNextSymbolChoices,
            forceEventsInNextSymbolChoices: save.state.forceEventsInNextSymbolChoices ?? false,
            freeSelectionRerolls: save.state.freeSelectionRerolls,
            pendingFoodPayment: save.state.pendingFoodPayment ?? save.state.phase === 'food_payment',
        };
    } catch {
        return null;
    }
}
