import { RELICS } from '../data/relicDefinitions';
import { SYMBOLS } from '../data/symbolDefinitions';
import { createActiveStatusesForTurn, getActiveStatusIdsFromStates } from '../data/statusDefinitions';
import type { ActiveStatusState } from '../data/statusDefinitions';
import { GAME_EVENTS, isGameEventDefinition } from '../data/eventDefinitions';
import { resolveUpgradedUnitDefinition } from '../data/unitUpgrades';
import type { PlayerSymbolInstance } from '../types';
import type { GamePhase, GameState, GameEventLogEntry } from './gameStore';
import { createEmptyBoard } from './gameStoreHelpers';
import { normalizeKnowledgeResearchCredits, type KnowledgeResearchCredit } from './gameCalculations';
import { useRelicStore, type RelicInstance } from './relicStore';

const SAVE_KEY = 'humankind.save.v1';
const SAVE_VERSION = 1;
const MAX_SAVED_EVENT_LOG = 400;

type SerializedBoard = (string | null)[][];

interface SerializedSymbol {
    definitionId: number;
    instanceId: string;
    effect_counter: number;
    is_marked_for_destruction: boolean;
    remaining_attacks?: number;
    enemy_hp?: number;
    banana_permanent_food_bonus?: number;
    stored_gold?: number;
    merchant_store_pending?: boolean;
    suppress_destroy_overlay?: boolean;
    spawnedByBarbarianInvasion?: boolean;
    barbarianInvasionTurnsRemaining?: number;
}

interface SerializedRelic {
    definitionId: number;
    instanceId: string;
    effect_counter: number;
    bonus_stacks: number;
}

interface SavedGame {
    version: typeof SAVE_VERSION;
    savedAt: number;
    state: {
        leaderId: GameState['leaderId'];
        leaderProgressLevel?: number;
        food: number;
        gold: number;
        knowledge: number;
        level: number;
        era: number;
        turn: number;
        phase: GamePhase;
        board: SerializedBoard;
        playerSymbols: SerializedSymbol[];
        symbolChoices: number[];
        symbolSelectionRelicSourceId: number | null;
        symbolSelectionSymbolSourceId?: number | null;
        isTurnSymbolSelection?: boolean;
        relicChoices: Array<number | null>;
        relicHalfPriceRelicId: number | null;
        lastEffects?: GameState['lastEffects'];
        prevBoard: SerializedBoard;
        religionUnlocked: boolean;
        unlockedKnowledgeUpgrades: number[];
        qinCurrencyStandardTurnsRemaining?: number;
        levelUpResearchPoints: number;
        knowledgeResearchCredits?: KnowledgeResearchCredit[];
        isRelicShopOpen: boolean;
        hasNewRelicShopStock: boolean;
        rerollsThisTurn: number;
        returnPhaseAfterDevKnowledgeUpgrade: GamePhase | null;
        barbarianSymbolThreat: number;
        barbarianCampThreat: number;
        naturalDisasterThreat: number;
        activeStatusIds?: number[];
        activeStatuses?: ActiveStatusState[];
        pendingDestroySource: GameState['pendingDestroySource'];
        pendingOblivionFurnaceRelicId: string | null;
        pendingEdictSource: GameState['pendingEdictSource'];
        bonusSelectionQueue: GameState['bonusSelectionQueue'];
        edictRemovalPending: boolean;
        forceTerrainInNextSymbolChoices: boolean;
        forceEventsInNextSymbolChoices?: boolean;
        freeSelectionRerolls: number;
        destroySelectionMaxSymbols: number;
        territorialAfterEdictPending: boolean;
        pendingFoodPayment?: boolean;
        eventLog: GameEventLogEntry[];
    };
    relics: SerializedRelic[];
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
    remaining_attacks: symbol.remaining_attacks,
    enemy_hp: symbol.enemy_hp,
    banana_permanent_food_bonus: symbol.banana_permanent_food_bonus,
    stored_gold: symbol.stored_gold,
    merchant_store_pending: symbol.merchant_store_pending,
    suppress_destroy_overlay: symbol.suppress_destroy_overlay,
    spawnedByBarbarianInvasion: symbol.spawnedByBarbarianInvasion,
    barbarianInvasionTurnsRemaining: symbol.barbarianInvasionTurnsRemaining,
});

const deserializeSymbol = (
    saved: SerializedSymbol,
    unlockedUpgrades: readonly number[],
): PlayerSymbolInstance | null => {
    const baseDefinition = SYMBOLS[saved.definitionId];
    if (!baseDefinition) return null;
    const definition = resolveUpgradedUnitDefinition(baseDefinition, unlockedUpgrades);
    return {
        definition,
        instanceId: saved.instanceId,
        effect_counter: saved.effect_counter ?? 0,
        is_marked_for_destruction: saved.is_marked_for_destruction ?? false,
        remaining_attacks: saved.remaining_attacks ?? (definition.base_attack ? 3 : 0),
        enemy_hp: saved.enemy_hp ?? definition.base_hp,
        banana_permanent_food_bonus: saved.banana_permanent_food_bonus,
        stored_gold: saved.stored_gold,
        merchant_store_pending: saved.merchant_store_pending,
        suppress_destroy_overlay: saved.suppress_destroy_overlay,
        spawnedByBarbarianInvasion: saved.spawnedByBarbarianInvasion,
        barbarianInvasionTurnsRemaining: saved.barbarianInvasionTurnsRemaining,
    };
};

const serializeBoard = (board: (PlayerSymbolInstance | null)[][]): SerializedBoard =>
    board.map((col) => col.map((symbol) => symbol?.instanceId ?? null));

const deserializeBoard = (
    savedBoard: SerializedBoard,
    symbolByInstanceId: Map<string, PlayerSymbolInstance>,
): (PlayerSymbolInstance | null)[][] => {
    const board = createEmptyBoard();
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            const instanceId = savedBoard[x]?.[y] ?? null;
            board[x][y] = instanceId ? symbolByInstanceId.get(instanceId) ?? null : null;
        }
    }
    return board;
};

const serializeRelic = (relic: RelicInstance): SerializedRelic => ({
    definitionId: relic.definition.id,
    instanceId: relic.instanceId,
    effect_counter: relic.effect_counter,
    bonus_stacks: relic.bonus_stacks,
});

const deserializeRelic = (saved: SerializedRelic): RelicInstance | null => {
    const definition = RELICS[saved.definitionId];
    if (!definition) return null;
    return {
        definition,
        instanceId: saved.instanceId,
        effect_counter: saved.effect_counter ?? 0,
        bonus_stacks: saved.bonus_stacks ?? 0,
    };
};

const EVENT_CHOICE_SAVE_OFFSET = 10000;

const serializeSelectionChoiceId = (choice: GameState['symbolChoices'][number]): number =>
    isGameEventDefinition(choice) ? EVENT_CHOICE_SAVE_OFFSET + choice.id : choice.id;

const mapSelectionChoices = (
    ids: number[],
    unlockedUpgrades: readonly number[],
): GameState['symbolChoices'] =>
    ids
        .map((id) => {
            if (id >= EVENT_CHOICE_SAVE_OFFSET) return GAME_EVENTS[id - EVENT_CHOICE_SAVE_OFFSET] ?? null;
            const definition = SYMBOLS[id];
            return definition ? resolveUpgradedUnitDefinition(definition, unlockedUpgrades) : null;
        })
        .filter((choice): choice is GameState['symbolChoices'][number] => choice != null);

export function hasSavedGame(): boolean {
    const raw = storage()?.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
        const save = JSON.parse(raw) as Partial<SavedGame>;
        return save.version === SAVE_VERSION
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
            leaderId: state.leaderId,
            leaderProgressLevel: state.leaderProgressLevel,
            food: state.food,
            gold: state.gold,
            knowledge: state.knowledge,
            level: state.level,
            era: state.era,
            turn: state.turn,
            phase: state.phase,
            board: serializeBoard(state.board),
            playerSymbols: state.playerSymbols.map(serializeSymbol),
            symbolChoices: state.symbolChoices.map(serializeSelectionChoiceId),
            symbolSelectionRelicSourceId: state.symbolSelectionRelicSourceId,
            symbolSelectionSymbolSourceId: state.symbolSelectionSymbolSourceId ?? null,
            isTurnSymbolSelection: state.isTurnSymbolSelection ?? false,
            relicChoices: state.relicChoices.map((relic) => relic?.id ?? null),
            relicHalfPriceRelicId: state.relicHalfPriceRelicId,
            lastEffects: [],
            prevBoard: serializeBoard(state.prevBoard),
            religionUnlocked: state.religionUnlocked,
            unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades,
            qinCurrencyStandardTurnsRemaining: state.qinCurrencyStandardTurnsRemaining,
            levelUpResearchPoints: state.levelUpResearchPoints,
            knowledgeResearchCredits: state.knowledgeResearchCredits ?? [],
            isRelicShopOpen: state.isRelicShopOpen,
            hasNewRelicShopStock: state.hasNewRelicShopStock,
            rerollsThisTurn: state.rerollsThisTurn,
            returnPhaseAfterDevKnowledgeUpgrade: state.returnPhaseAfterDevKnowledgeUpgrade,
            barbarianSymbolThreat: state.barbarianSymbolThreat,
            barbarianCampThreat: state.barbarianCampThreat,
            naturalDisasterThreat: state.naturalDisasterThreat,
            activeStatusIds: state.activeStatusIds,
            activeStatuses: state.activeStatuses,
            pendingDestroySource: state.pendingDestroySource,
            pendingOblivionFurnaceRelicId: state.pendingOblivionFurnaceRelicId,
            pendingEdictSource: state.pendingEdictSource,
            bonusSelectionQueue: state.bonusSelectionQueue,
            edictRemovalPending: state.edictRemovalPending,
            forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
            forceEventsInNextSymbolChoices: state.forceEventsInNextSymbolChoices,
            freeSelectionRerolls: state.freeSelectionRerolls,
            destroySelectionMaxSymbols: state.destroySelectionMaxSymbols,
            territorialAfterEdictPending: state.territorialAfterEdictPending,
            pendingFoodPayment: state.pendingFoodPayment,
            eventLog: state.eventLog.slice(-MAX_SAVED_EVENT_LOG),
        },
        relics: useRelicStore.getState().relics.map(serializeRelic),
    };

    store.setItem(SAVE_KEY, JSON.stringify(save));
}

export function loadSavedGamePatch(): Partial<GameState> | null {
    const raw = storage()?.getItem(SAVE_KEY);
    if (!raw) return null;

    try {
        const save = JSON.parse(raw) as SavedGame;
        if (save.version !== SAVE_VERSION) return null;
        if (save.state.phase === 'game_over' || save.state.phase === 'victory') {
            clearSavedGame();
            return null;
        }

        const playerSymbols = save.state.playerSymbols
            .map((symbol) => deserializeSymbol(symbol, save.state.unlockedKnowledgeUpgrades))
            .filter((symbol): symbol is PlayerSymbolInstance => symbol != null);
        const symbolByInstanceId = new Map(playerSymbols.map((symbol) => [symbol.instanceId, symbol]));
        const relics = save.relics
            .map(deserializeRelic)
            .filter((relic): relic is RelicInstance => relic != null);
        useRelicStore.getState().hydrateRelics(relics);
        const knowledgeResearchCredits = normalizeKnowledgeResearchCredits(
            save.state.level,
            save.state.levelUpResearchPoints,
            save.state.knowledgeResearchCredits,
        );

        const activeStatuses =
            save.state.activeStatuses ??
            (save.state.activeStatusIds
                ? save.state.activeStatusIds.map((id) => ({
                    id,
                    remainingTurns: Math.max(1, createActiveStatusesForTurn(save.state.turn).find((status) => status.id === id)?.remainingTurns ?? 1),
                }))
                : createActiveStatusesForTurn(save.state.turn));

        return {
            leaderId: save.state.leaderId,
            leaderProgressLevel: save.state.leaderProgressLevel ?? 1,
            lastLeaderProgressAward: null,
            isTutorialMode: false,
            food: save.state.food,
            gold: save.state.gold,
            knowledge: save.state.knowledge,
            level: save.state.level,
            era: save.state.era,
            turn: save.state.turn,
            phase: save.state.phase,
            board: deserializeBoard(save.state.board, symbolByInstanceId),
            playerSymbols,
            symbolChoices: mapSelectionChoices(save.state.symbolChoices, save.state.unlockedKnowledgeUpgrades),
            symbolSelectionRelicSourceId: save.state.symbolSelectionRelicSourceId,
            symbolSelectionSymbolSourceId: save.state.symbolSelectionSymbolSourceId ?? null,
            isTurnSymbolSelection:
                save.state.isTurnSymbolSelection ??
                (
                    save.state.phase === 'selection' &&
                    save.state.symbolSelectionRelicSourceId == null &&
                    save.state.symbolSelectionSymbolSourceId == null &&
                    save.state.bonusSelectionQueue.length === 0
                ),
            relicChoices: save.state.relicChoices.map((id) => (id == null ? null : RELICS[id] ?? null)),
            relicHalfPriceRelicId: save.state.relicHalfPriceRelicId,
            lastEffects: [],
            counterDisplayOverrides: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
            effectPhase: null,
            effectPhase3ReachedThisRun: false,
            destroyRemovalBlinkStartedAtMs: null,
            lootMergeFx: null,
            eventLog: save.state.eventLog ?? [],
            prevBoard: deserializeBoard(save.state.prevBoard, symbolByInstanceId),
            combatAnimation: null,
            combatShaking: false,
            preCombatShakeTarget: null,
            preCombatShakeRelicDefId: null,
            combatFloats: [],
            relicFloats: [],
            knowledgeUpgradeFloats: [],
            religionUnlocked: save.state.religionUnlocked,
            unlockedKnowledgeUpgrades: save.state.unlockedKnowledgeUpgrades,
            qinCurrencyStandardTurnsRemaining: save.state.qinCurrencyStandardTurnsRemaining ?? 0,
            levelUpResearchPoints: knowledgeResearchCredits.length,
            knowledgeResearchCredits,
            isRelicShopOpen: save.state.isRelicShopOpen,
            hasNewRelicShopStock: save.state.hasNewRelicShopStock,
            rerollsThisTurn: save.state.rerollsThisTurn,
            returnPhaseAfterDevKnowledgeUpgrade: save.state.returnPhaseAfterDevKnowledgeUpgrade,
            barbarianSymbolThreat: save.state.barbarianSymbolThreat,
            barbarianCampThreat: save.state.barbarianCampThreat,
            naturalDisasterThreat: save.state.naturalDisasterThreat,
            activeStatusIds: getActiveStatusIdsFromStates(activeStatuses),
            activeStatuses,
            pendingNewThreatFloats: [],
            pendingDestroySource: save.state.pendingDestroySource,
            pendingOblivionFurnaceRelicId: save.state.pendingOblivionFurnaceRelicId,
            pendingEdictSource: save.state.pendingEdictSource,
            bonusSelectionQueue: save.state.bonusSelectionQueue,
            edictRemovalPending: save.state.edictRemovalPending,
            forceTerrainInNextSymbolChoices: save.state.forceTerrainInNextSymbolChoices,
            forceEventsInNextSymbolChoices: save.state.forceEventsInNextSymbolChoices ?? false,
            freeSelectionRerolls: save.state.freeSelectionRerolls,
            destroySelectionMaxSymbols: save.state.destroySelectionMaxSymbols,
            territorialAfterEdictPending: save.state.territorialAfterEdictPending,
            pendingFoodPayment: save.state.pendingFoodPayment ?? save.state.phase === 'food_payment',
        };
    } catch {
        return null;
    }
}
