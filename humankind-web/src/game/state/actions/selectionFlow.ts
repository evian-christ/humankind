import { SYMBOLS, S } from '../../data/symbolDefinitions';
import {
    CAPITAL_RELOCATION_DESTROY_COUNT,
    CAPITAL_RELOCATION_FOOD_REWARD,
    CAPITAL_RELOCATION_KNOWLEDGE_REWARD,
    DESERT_CARAVAN_FOOD,
    EVERY_TERRAIN_BOUNTY_EACH,
    FOREST_HARVEST_FOOD,
    GAME_EVENTS,
    GRASSLAND_FESTIVAL_FOOD,
    MARITIME_TRADE_PER_SEA,
    MOUNTAIN_LOOKOUT_PER_MOUNTAIN,
    OASIS_BLESSING_PER_EMPTY,
    PLAINS_PASTURE_PER_CATTLE,
    PLAINS_PASTURE_PER_SHEEP,
    eraScaleIndex,
} from '../../data/eventDefinitions';
import {
    generateChoices as generateChoicesSelection,
    generateTerrainOnlyChoices as generateTerrainOnlyChoicesSelection,
} from '../../logic/selection/selectionLogic';
import {
    aggregateCollectionDestroyEffects,
    appendSymbolDefIdsToPlayer,
    cloneBoardPreservingSlots,
    createStoredFoodDestroyEffects,
    getBoardOnlyDestroyEffectTotals,
    getStandardSymbolChoiceCount,
    markBoardSymbolsForRemoval,
    removeBoardSymbolsByInstanceIds,
} from '../gameStoreHelpers';
import { getRerollCost, resolveKnowledgeProgression } from '../gameCalculations';
import { saveGameState } from '../saveGame';
import type { GamePhase, GameState } from '../gameStore';
import type { PlayerSymbolInstance } from '../../types';
import type { BoardEffectDelta } from '../../logic/turn/turnTypes';
import { scheduleGameLifecycleTimeout } from '../gameLifecycleRun';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
export type GameStoreGet = () => GameState;

interface ChoiceResolution {
    choices: ReturnType<typeof generateChoicesSelection>['choices'];
    forceTerrainInNextSymbolChoices: boolean;
    forceEventsInNextSymbolChoices: boolean;
}

interface SelectionFlowDeps {
    get: GameStoreGet;
    set: GameStoreSet;
    createInstance: (typeof import('../gameStoreHelpers'))['createInstance'];
    phaseAfterTurnFlowComplete: () => GamePhase;
}

const BOARD_DESTROY_BLINK_DURATION_MS = 360;

const getNowMs = () =>
    typeof globalThis.performance !== 'undefined' && typeof globalThis.performance.now === 'function'
        ? globalThis.performance.now()
        : Date.now();

const withSelectionPhaseFreeReroll = (
    _state: GameState,
    patch: Partial<GameState>,
): Partial<GameState> => patch;

const resolveStandardChoices = (state: GameState): ChoiceResolution => {
    const res = generateChoicesSelection({
        era: state.era,
        religionUnlocked: state.religionUnlocked,
        upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
        symbolSetId: state.symbolSetId,
        symbolSetIds: state.symbolSetIds,
        ownedSymbolDefIds: state.playerSymbols.map((s) => s.definition.id),
        choiceCount: getStandardSymbolChoiceCount(state.board),
        forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
        forceEventsInNextSymbolChoices: state.forceEventsInNextSymbolChoices,
    });

    return {
        choices: res.choices,
        forceTerrainInNextSymbolChoices:
            state.forceTerrainInNextSymbolChoices && res.consumedForceTerrain
                ? false
                : state.forceTerrainInNextSymbolChoices,
        forceEventsInNextSymbolChoices:
            state.forceEventsInNextSymbolChoices && res.consumedForceEvents
                ? false
                : state.forceEventsInNextSymbolChoices,
    };
};

const resolveTerrainChoices = (state: GameState) =>
    generateTerrainOnlyChoicesSelection({
        era: state.era,
        religionUnlocked: state.religionUnlocked,
        upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
        symbolSetId: state.symbolSetId,
        symbolSetIds: state.symbolSetIds,
    });

const countBoardSymbols = (board: GameState['board'], symbolId: number): number => {
    let count = 0;
    for (const col of board) {
        for (const cell of col) {
            if (cell?.definition.id === symbolId) count++;
        }
    }
    return count;
};

const countBoardEmptySlots = (board: GameState['board']): number => {
    let count = 0;
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < (board[x]?.length ?? 0); y++) {
            if (!Object.prototype.hasOwnProperty.call(board[x], y)) continue;
            if (board[x][y] == null) count++;
        }
    }
    return count;
};

const countOwnedSymbols = (playerSymbols: PlayerSymbolInstance[], symbolId: number): number =>
    playerSymbols.reduce((acc, s) => (s.definition.id === symbolId ? acc + 1 : acc), 0);

/** 보드 위 모든 바나나의 효과를 즉시 한 번 더 적용하고, 보드 플로팅용 결과를 생성 */
const triggerBananaEffectsOnce = (
    board: GameState['board'],
): { foodGain: number; effects: BoardEffectDelta[] } => {
    let foodGain = 0;
    const effects: BoardEffectDelta[] = [];

    for (let x = 0; x < board.length; x += 1) {
        const col = board[x];
        for (let y = 0; y < (col?.length ?? 0); y += 1) {
            const cell = col?.[y];
            if (cell?.definition.id === S.banana) {
                const nearRainforest = [
                    { x: x - 1, y: y - 1 },
                    { x, y: y - 1 },
                    { x: x + 1, y: y - 1 },
                    { x: x - 1, y },
                    { x: x + 1, y },
                    { x: x - 1, y: y + 1 },
                    { x, y: y + 1 },
                    { x: x + 1, y: y + 1 },
                ].some((pos) => board[pos.x]?.[pos.y]?.definition.id === S.rainforest);

                // 기본 식량 +1; 열대우림에 인접 시 식량 +1.
                const food = nearRainforest ? 2 : 1;

                foodGain += food;
                effects.push({
                    x,
                    y,
                    food,
                    gold: 0,
                    knowledge: 0,
                });
            }
        }
    }
    return { foodGain, effects };
};

const pickRandomSymbols = (symbols: PlayerSymbolInstance[], count: number): PlayerSymbolInstance[] => {
    const pool = [...symbols];
    const picked: PlayerSymbolInstance[] = [];
    const limit = Math.min(count, pool.length);
    for (let i = 0; i < limit; i++) {
        const index = Math.floor(Math.random() * pool.length);
        const [symbol] = pool.splice(index, 1);
        if (symbol) picked.push(symbol);
    }
    return picked;
};

const findBoardSlotByInstanceId = (board: GameState['board'], instanceId: string) => {
    for (let x = 0; x < board.length; x++) {
        const col = board[x];
        if (!col) continue;
        for (let y = 0; y < col.length; y++) {
            if (col[y]?.instanceId === instanceId) return { x, y };
        }
    }
    return null;
};

const makeDestroyedSymbolSnapshots = (
    symbols: readonly PlayerSymbolInstance[],
    board: GameState['board'],
) => symbols.map((symbol) => {
    const slot = findBoardSlotByInstanceId(board, symbol.instanceId);
    return {
        id: symbol.definition.id,
        instanceId: symbol.instanceId,
        ...(slot ?? {}),
    };
});

const resolveCompletedSelectionPhase = (
    state: GameState,
    phaseAfterTurnFlowComplete: () => GamePhase,
): GamePhase => state.pendingFoodPayment ? 'food_payment' : phaseAfterTurnFlowComplete();

export const isPlagueBlockingSelection = (state: Pick<GameState, 'board' | 'isTurnSymbolSelection'>): boolean =>
    state.isTurnSymbolSelection === true &&
    state.board.some((col) => col.some((cell) => cell?.definition.id === S.plague));

const resolveAfterSelection = (state: GameState, phaseAfterTurnFlowComplete: () => GamePhase) => {
    const q = [...(state.bonusSelectionQueue || [])];
    if (q.length > 0) {
        q.shift();
        const nextType = q[0];
        const standard = nextType === 'terrain' || q.length === 0 ? null : resolveStandardChoices(state);
        const nextChoices =
            q.length === 0
                ? []
                : nextType === 'terrain'
                  ? resolveTerrainChoices(state)
                  : standard!.choices;
        const nextForceTerrain =
            q.length === 0 || nextType === 'terrain'
                ? state.forceTerrainInNextSymbolChoices
                : standard!.forceTerrainInNextSymbolChoices;

        return withSelectionPhaseFreeReroll(state, {
            bonusSelectionQueue: q,
            symbolChoices: nextChoices,
            isTurnSymbolSelection: false,
            forceTerrainInNextSymbolChoices: nextForceTerrain,
            phase: q.length > 0
                ? 'selection' as GamePhase
                : resolveCompletedSelectionPhase(state, phaseAfterTurnFlowComplete),
            symbolSelectionSymbolSourceId: q.length > 0 ? state.symbolSelectionSymbolSourceId ?? null : null,
        });
    }

    return {
        phase: resolveCompletedSelectionPhase(state, phaseAfterTurnFlowComplete),
        symbolChoices: [],
        symbolSelectionSymbolSourceId: null,
        isTurnSymbolSelection: false,
    };
};

export const createSelectionFlowActions = ({
    get,
    set,
    createInstance,
    phaseAfterTurnFlowComplete,
}: SelectionFlowDeps) => ({
    selectSymbol: (symbolId: number) => {
        const state = get();
        if (state.phase !== 'selection') return;

        if (isPlagueBlockingSelection(state)) return;

        const def = SYMBOLS[symbolId];
        if (!def) return;

        const choiceIds = state.symbolChoices.map((choice) => choice.id);

        set({
            playerSymbols: [...state.playerSymbols, createInstance(def, state.unlockedKnowledgeUpgrades || [])],
            ...resolveAfterSelection(state, phaseAfterTurnFlowComplete),
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'selection',
            symbolId,
            meta: {
                action: 'select_symbol',
                choiceIds,
                sourceSymbolId: state.symbolSelectionSymbolSourceId ?? null,
            },
        });
        saveGameState(get());
    },

    selectEvent: (eventId: number) => {
        const state = get();
        if (state.phase !== 'selection') return;
        if (isPlagueBlockingSelection(state)) return;

        const event = GAME_EVENTS[eventId];
        if (!event) return;

        const patch: Partial<GameState> = {};
        const eraIdx = eraScaleIndex(state.era);
        let foodDelta = 0;
        let goldDelta = 0;
        let knowledgeDelta = 0;
        let destroyedSymbols: ReturnType<typeof makeDestroyedSymbolSnapshots> = [];
        let addedSymbolIds: number[] = [];
        let destroyedBoardIds: Set<string> | null = null;
        let destroyBlinkStartedAtMs: number | null = null;
        let boardForSelectionResolution: GameState['board'] | null = null;

        if (event.reward) {
            foodDelta += event.reward.food ?? 0;
            goldDelta += event.reward.gold ?? 0;
            knowledgeDelta += event.reward.knowledge ?? 0;
        } else if (event.key === 'grassland_festival') {
            foodDelta += GRASSLAND_FESTIVAL_FOOD[eraIdx];
        } else if (event.key === 'plains_pasture') {
            const cattleCount = countBoardSymbols(state.board, S.cattle);
            const sheepCount = countBoardSymbols(state.board, S.sheep);
            foodDelta += cattleCount * PLAINS_PASTURE_PER_CATTLE[eraIdx];
            goldDelta += sheepCount * PLAINS_PASTURE_PER_SHEEP[eraIdx];
        } else if (event.key === 'maritime_trade') {
            const seaCount = countBoardSymbols(state.board, S.sea);
            const perSea = MARITIME_TRADE_PER_SEA[eraIdx];
            foodDelta += seaCount * perSea;
            goldDelta += seaCount * perSea;
        } else if (event.key === 'forest_harvest') {
            foodDelta += FOREST_HARVEST_FOOD[eraIdx];
            const forestDef = SYMBOLS[S.forest];
            if (forestDef) {
                addedSymbolIds = [forestDef.id];
                patch.playerSymbols = [
                    ...state.playerSymbols,
                    createInstance(forestDef, state.unlockedKnowledgeUpgrades || []),
                ];
            }
        } else if (event.key === 'jungle_expedition') {
            const bananaTrigger = triggerBananaEffectsOnce(state.board);
            foodDelta += bananaTrigger.foodGain;
            if (bananaTrigger.effects.length > 0) {
                patch.board = cloneBoardPreservingSlots(state.board);
                patch.lastEffects = [...(state.lastEffects ?? []), ...bananaTrigger.effects];
            }
        } else if (event.key === 'desert_caravan') {
            foodDelta += DESERT_CARAVAN_FOOD[eraIdx];
        } else if (event.key === 'mountain_lookout') {
            const mountainCount = countOwnedSymbols(state.playerSymbols, S.mountain);
            const per = MOUNTAIN_LOOKOUT_PER_MOUNTAIN[eraIdx];
            foodDelta += mountainCount * per;
            goldDelta += mountainCount * per;
            knowledgeDelta += mountainCount * per;
        } else if (event.key === 'oasis_blessing') {
            const emptySlots = countBoardEmptySlots(state.board);
            foodDelta += emptySlots * OASIS_BLESSING_PER_EMPTY[eraIdx];
        } else if (event.key === 'every_terrain_bounty') {
            const bounty = EVERY_TERRAIN_BOUNTY_EACH[eraIdx];
            foodDelta += bounty;
            goldDelta += bounty;
            knowledgeDelta += bounty;
        } else if (event.key === 'capital_relocation') {
            const removed = pickRandomSymbols(state.playerSymbols, CAPITAL_RELOCATION_DESTROY_COUNT);
            const removedIds = new Set(removed.map((symbol) => symbol.instanceId));
            const markedBoard = markBoardSymbolsForRemoval(state.board, removedIds);
            destroyedBoardIds = removedIds;
            destroyBlinkStartedAtMs = getNowMs();
            boardForSelectionResolution = removeBoardSymbolsByInstanceIds(state.board, removedIds);
            destroyedSymbols = makeDestroyedSymbolSnapshots(removed, state.board);
            const symAgg = aggregateCollectionDestroyEffects(removed, false, state.unlockedKnowledgeUpgrades || []);
            addedSymbolIds = symAgg.addSymbolDefIds;
            const symbolDestroyEffects = createStoredFoodDestroyEffects(removed, state.board, state.unlockedKnowledgeUpgrades || []);
            const boardOnlyDestroyDelta = getBoardOnlyDestroyEffectTotals(symbolDestroyEffects, state.board);
            const baseFiltered = state.playerSymbols.filter((symbol) => !removedIds.has(symbol.instanceId));
            patch.playerSymbols = appendSymbolDefIdsToPlayer(
                baseFiltered,
                symAgg.addSymbolDefIds,
                state.unlockedKnowledgeUpgrades || [],
            );
            patch.board = markedBoard;
            patch.destroyRemovalBlinkStartedAtMs = destroyBlinkStartedAtMs;
            foodDelta += CAPITAL_RELOCATION_FOOD_REWARD + symAgg.food + boardOnlyDestroyDelta.food;
            goldDelta += symAgg.gold + boardOnlyDestroyDelta.gold;
            knowledgeDelta += CAPITAL_RELOCATION_KNOWLEDGE_REWARD + symAgg.knowledge + boardOnlyDestroyDelta.knowledge;
            if (symbolDestroyEffects.length > 0) {
                patch.lastEffects = [...(state.lastEffects ?? []), ...symbolDestroyEffects];
            }
            patch.forceTerrainInNextSymbolChoices = state.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices;
            patch.forceEventsInNextSymbolChoices = state.forceEventsInNextSymbolChoices || symAgg.forceEventsInNextChoices;
            patch.freeSelectionRerolls = (state.freeSelectionRerolls ?? 0) + symAgg.freeSelectionRerolls;
        }

        if (foodDelta !== 0) patch.food = state.food + foodDelta;
        if (goldDelta !== 0) patch.gold = state.gold + goldDelta;
        if (knowledgeDelta !== 0) Object.assign(patch, resolveKnowledgeProgression(state, knowledgeDelta));
        set({
            ...patch,
            ...resolveAfterSelection({
                ...state,
                ...patch,
                ...(boardForSelectionResolution ? { board: boardForSelectionResolution } : {}),
            }, phaseAfterTurnFlowComplete),
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'selection',
            delta: { food: foodDelta, gold: goldDelta, knowledge: knowledgeDelta },
            meta: {
                action: 'select_event',
                eventId,
                eventKey: event.key,
                sourceSymbolId: state.symbolSelectionSymbolSourceId ?? null,
                destroyedSymbols,
                addSymbolIds: addedSymbolIds,
            },
        });
        if (destroyedBoardIds && destroyBlinkStartedAtMs != null) {
            const removedIds = destroyedBoardIds;
            const blinkStartedAtMs = destroyBlinkStartedAtMs;
            scheduleGameLifecycleTimeout(() => {
                set((current) => {
                    const isCurrentBlink = current.destroyRemovalBlinkStartedAtMs === blinkStartedAtMs;
                    return {
                        board: removeBoardSymbolsByInstanceIds(current.board, removedIds),
                        ...(isCurrentBlink ? { destroyRemovalBlinkStartedAtMs: null } : {}),
                    };
                });
            }, BOARD_DESTROY_BLINK_DURATION_MS);
        }
        saveGameState(get());
    },

    skipSelection: () => {
        const state = get();
        if (state.phase !== 'selection') return;

        set({
            ...resolveAfterSelection(state, phaseAfterTurnFlowComplete),
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'selection',
            delta: { food: 0, gold: 0, knowledge: 0 },
            meta: {
                action: 'skip_selection',
                sourceSymbolId: state.symbolSelectionSymbolSourceId ?? null,
            },
        });
    },

    rerollSymbols: () => {
        const state = get();
        if (state.phase !== 'selection') return;

        if (isPlagueBlockingSelection(state)) return;
        if (state.symbolSelectionSymbolSourceId === S.tribal_village) {
            return;
        }

        const rerollCost = getRerollCost(state.level, 1, state.rerollsThisTurn);

        const freeLeft = state.freeSelectionRerolls ?? 0;
        const choiceResolution = resolveStandardChoices(state);

        if (freeLeft > 0) {
            set({
                freeSelectionRerolls: freeLeft - 1,
                symbolChoices: choiceResolution.choices,
                forceTerrainInNextSymbolChoices: choiceResolution.forceTerrainInNextSymbolChoices,
                forceEventsInNextSymbolChoices: choiceResolution.forceEventsInNextSymbolChoices,
                rerollsThisTurn: state.rerollsThisTurn + 1,
            });
            get().appendEventLog({
                turn: state.turn,
                kind: 'selection',
                meta: {
                    action: 'reroll',
                    free: true,
                    choices: choiceResolution.choices.map((choice) => choice.id),
                },
            });
            return;
        }

        if (state.gold < rerollCost) return;

        set({
            gold: state.gold - rerollCost,
            symbolChoices: choiceResolution.choices,
            forceTerrainInNextSymbolChoices: choiceResolution.forceTerrainInNextSymbolChoices,
            forceEventsInNextSymbolChoices: choiceResolution.forceEventsInNextSymbolChoices,
            rerollsThisTurn: state.rerollsThisTurn + 1,
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'selection',
            delta: { food: 0, gold: -rerollCost, knowledge: 0 },
            meta: {
                action: 'reroll',
                free: false,
                cost: rerollCost,
                choices: choiceResolution.choices.map((choice) => choice.id),
            },
        });
    },

    selectUpgrade: (_upgradeId: number) => {},

});
