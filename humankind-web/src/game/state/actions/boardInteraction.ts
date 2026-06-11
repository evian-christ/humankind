import { NOMADIC_TRADITION_UPGRADE_ID, PASTURE_MANAGEMENT_UPGRADE_ID } from '../../data/knowledgeUpgrades';
import { recordDemoNonConsumableRelicProgress } from '../../data/demoAchievements';
import { S, SymbolType } from '../../data/symbolDefinitions';
import { generateChoices as generateChoicesSelection } from '../../logic/selection/selectionLogic';
import type { GameState } from '../gameStore';
import { RELICS } from '../../data/relicDefinitions';
import {
    aggregateCollectionDestroyEffects,
    appendSymbolDefIdsToPlayer,
    createBoardDestroyResourceEffects,
    createStoredFoodDestroyEffects,
    getBoardOnlyDestroyEffectTotals,
    getStandardSymbolChoiceCount,
    markBoardSymbolsForRemoval,
    removeBoardSymbolsByInstanceIds,
    scarabBonusForOwnedRemoves,
} from '../gameStoreHelpers';
import { useRelicStore } from '../relicStore';
import {
    generateLootRewardChoices,
    getRewardAmounts,
    REWARDS,
    type LootTier,
} from '../../data/rewardDefinitions';
import { resolveKnowledgeProgression } from '../gameCalculations';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
export type GameStoreGet = () => GameState;

interface BoardInteractionDeps {
    get: GameStoreGet;
    set: GameStoreSet;
    getAdjacentCoords: (x: number, y: number) => { x: number; y: number }[];
}

const LOOT_IDS = new Set<number>([S.loot, S.greater_loot, S.radiant_loot]);

const LOOT_TIER_MAP: Record<number, LootTier> = {
    [S.loot]: 'small',
    [S.greater_loot]: 'medium',
    [S.radiant_loot]: 'large',
};

const isBoardDestroyBlockedType = (type: SymbolType) =>
    type === SymbolType.ENEMY || type === SymbolType.DISASTER;

const BOARD_DESTROY_BLINK_DURATION_MS = 360;

const isBoardActionPhase = (phase: GameState['phase']) =>
    phase === 'idle' || phase === 'food_payment';

const phaseAfterBoardAction = (state: GameState): GameState['phase'] =>
    state.pendingFoodPayment ? 'food_payment' : 'idle';

const getNowMs = () =>
    typeof globalThis.performance !== 'undefined' && typeof globalThis.performance.now === 'function'
        ? globalThis.performance.now()
        : Date.now();

const destroyedSymbol = (symbol: { definition: { id: number }; instanceId: string }, x: number, y: number) => ({
    id: symbol.definition.id,
    instanceId: symbol.instanceId,
    x,
    y,
});

export const createBoardInteractionActions = ({ get, set, getAdjacentCoords }: BoardInteractionDeps) => ({
    butcherPastureAnimalAt: (x: number, y: number) => {
        const prev = get();
        if (!isBoardActionPhase(prev.phase)) return;
        const sym = prev.board[x]?.[y];
        const sid = sym?.definition.id;
        if (!sym || sym.is_marked_for_destruction || (sid !== S.cattle && sid !== S.sheep)) return;
        const adjacentPlains = getAdjacentCoords(x, y).filter(
            (p) => prev.board[p.x][p.y]?.definition.id === S.plains,
        );
        if (adjacentPlains.length === 0) return;

        const removed = [sym];
        const symAgg = aggregateCollectionDestroyEffects(removed, false, prev.unlockedKnowledgeUpgrades || []);
        const shBonus = scarabBonusForOwnedRemoves(prev.board, removed.length);
        const hasNomadicTradition = (prev.unlockedKnowledgeUpgrades || []).includes(NOMADIC_TRADITION_UPGRADE_ID);
        const butcherFood = sid === S.cattle ? (hasNomadicTradition ? 20 : 10) : (hasNomadicTradition ? 10 : 5);
        const butcherGoldFlat = sid === S.sheep ? (hasNomadicTradition ? 10 : 5) : 0;
        const dFood = butcherFood + symAgg.food + shBonus.food;
        const dGold = butcherGoldFlat + symAgg.gold + shBonus.gold;
        const dKnowledge = symAgg.knowledge + shBonus.knowledge;

        const instanceIds = [sym.instanceId];
        const newBoard = prev.board.map((col) => [...col]);
        newBoard[x][y] = null;
        if ((prev.unlockedKnowledgeUpgrades || []).includes(PASTURE_MANAGEMENT_UPGRADE_ID)) {
            adjacentPlains.forEach((p) => {
                const plains = newBoard[p.x][p.y];
                if (plains?.definition.id === S.plains) {
                    plains.effect_counter = (plains.effect_counter || 0) + 1;
                }
            });
        }
        const baseFiltered = prev.playerSymbols.filter((s) => !instanceIds.includes(s.instanceId));
        const newSymbols = appendSymbolDefIdsToPlayer(
            baseFiltered,
            symAgg.addSymbolDefIds,
            prev.unlockedKnowledgeUpgrades || [],
        );
        set({
            board: newBoard,
            playerSymbols: newSymbols,
            food: prev.food + dFood,
            gold: prev.gold + dGold,
            ...resolveKnowledgeProgression(prev, dKnowledge),
            forceTerrainInNextSymbolChoices: prev.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices,
            forceEventsInNextSymbolChoices: prev.forceEventsInNextSymbolChoices || symAgg.forceEventsInNextChoices,
            freeSelectionRerolls: (prev.freeSelectionRerolls ?? 0) + symAgg.freeSelectionRerolls,
            isRelicShopOpen: prev.isRelicShopOpen || symAgg.openRelicShop,
            lastEffects: [...prev.lastEffects, { x, y, food: dFood, gold: dGold, knowledge: dKnowledge }],
        });
        if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));
        get().appendEventLog({
            turn: prev.turn,
            kind: 'board_action',
            slot: { x, y },
            symbolId: sid,
            delta: { food: dFood, gold: dGold, knowledge: dKnowledge },
            meta: {
                action: sid === S.cattle ? 'cattle_butcher' : 'sheep_butcher',
                butcherFood,
                butcherGoldFlat,
                destroyedSymbols: [destroyedSymbol(sym, x, y)],
            },
        });
    },
    openLootAt: (x: number, y: number) => {
        const prev = get();
        if (!isBoardActionPhase(prev.phase)) return;
        const loot = prev.board[x]?.[y];
        const sid = loot?.definition.id;
        if (!loot || loot.is_marked_for_destruction || !LOOT_IDS.has(sid ?? -1)) return;

        const tier = LOOT_TIER_MAP[sid!]!;

        set({
            phase: 'loot_reward_selection',
            lootRewardChoices: generateLootRewardChoices(tier),
            pendingLootSlot: { x, y, symbolId: sid! },
        });
        get().appendEventLog({
            turn: prev.turn,
            kind: 'board_action',
            slot: { x, y },
            symbolId: sid,
            meta: {
                action: 'loot_reward_open',
                tier,
            },
        });
    },
    selectLootReward: (rewardId: number) => {
        const prev = get();
        if (prev.phase !== 'loot_reward_selection' || !prev.pendingLootSlot) return;

        const { x, y, symbolId } = prev.pendingLootSlot;
        const loot = prev.board[x]?.[y];
        if (!loot) {
            set({ phase: 'idle', lootRewardChoices: [], pendingLootSlot: null });
            return;
        }

        const reward = REWARDS[rewardId];
        if (!reward) return;

        const { food, gold, knowledge } = getRewardAmounts(reward, prev.era);

        const newBoard = prev.board.map((col) => [...col]);
        newBoard[x][y] = null;
        const newPlayerSymbols = prev.playerSymbols.filter((s) => s.instanceId !== loot.instanceId);

        set({
            board: newBoard,
            playerSymbols: newPlayerSymbols,
            food: prev.food + food,
            gold: prev.gold + gold,
            ...resolveKnowledgeProgression(prev, knowledge),
            lastEffects: [...prev.lastEffects, { x, y, food, gold, knowledge }],
            phase: phaseAfterBoardAction(prev),
            lootRewardChoices: [],
            pendingLootSlot: null,
        });

        let grantedRelic = false;

        if (reward.grantsRelic) {
            const relicPool = Object.values(RELICS);
            const relicDef = relicPool[Math.floor(Math.random() * relicPool.length)];
            if (relicDef) {
                useRelicStore.getState().addRelic(relicDef);
                grantedRelic = true;
            }
        }

        reward.grantedRelicIds?.forEach((relicId) => {
            const relicDef = RELICS[relicId];
            if (relicDef) {
                useRelicStore.getState().addRelic(relicDef);
                grantedRelic = true;
            }
        });

        if (grantedRelic) {
            recordDemoNonConsumableRelicProgress(prev.leaderId, useRelicStore.getState().relics);
        }

        get().appendEventLog({
            turn: prev.turn,
            kind: 'board_action',
            slot: { x, y },
            symbolId,
            delta: { food, gold, knowledge },
            meta: {
                action: 'loot_reward_select',
                rewardId,
                rewardKey: reward.key,
                destroyedSymbols: [destroyedSymbol(loot, x, y)],
            },
        });
    },
    activateEdictAt: (x: number, y: number) => {
        const prev = get();
        if (!isBoardActionPhase(prev.phase)) return;
        const edict = prev.board[x]?.[y];
        if (!edict || edict.definition.id !== S.edict || edict.is_marked_for_destruction) return;

        const hasAdjacentTarget = getAdjacentCoords(x, y).some(({ x: ax, y: ay }) => {
            const cell = prev.board[ax]?.[ay];
            return (
                !!cell &&
                !cell.is_marked_for_destruction &&
                cell.instanceId !== edict.instanceId &&
                !isBoardDestroyBlockedType(cell.definition.type)
            );
        });
        if (!hasAdjacentTarget) return;

        set({
            phase: 'oblivion_furnace_board',
            pendingOblivionFurnaceRelicId: null,
            pendingEdictSource: { x, y, instanceId: edict.instanceId },
        });
        get().appendEventLog({
            turn: prev.turn,
            kind: 'board_action',
            slot: { x, y },
            symbolId: S.edict,
            meta: { action: 'edict_pick_target' },
        });
    },
    confirmEdictDestroyAt: (x: number, y: number) => {
        const state = get();
        if (state.phase !== 'oblivion_furnace_board') return;
        const pending = state.pendingEdictSource;
        if (!pending) return;
        if (x < 0 || x >= state.board.length || y < 0 || y >= state.board[0]!.length) return;

        const target = state.board[x][y];
        const edict = state.board[pending.x]?.[pending.y];
        if (!target || !edict || edict.instanceId !== pending.instanceId) return;
        if (isBoardDestroyBlockedType(target.definition.type)) return;
        if (target.instanceId === edict.instanceId) return;

        const isAdjacent = getAdjacentCoords(pending.x, pending.y).some((pos) => pos.x === x && pos.y === y);
        if (!isAdjacent) return;

        const removed = [edict, target];
        const symAgg = aggregateCollectionDestroyEffects(removed, true, state.unlockedKnowledgeUpgrades || []);
        const storedFoodEffects = createStoredFoodDestroyEffects(removed, state.board, state.unlockedKnowledgeUpgrades || []);
        const boardOnlyDestroyDelta = getBoardOnlyDestroyEffectTotals(storedFoodEffects, state.board);
        const shBonus = scarabBonusForOwnedRemoves(state.board, removed.length);
        const dFood = symAgg.food + shBonus.food + boardOnlyDestroyDelta.food;
        const dGold = symAgg.gold + shBonus.gold + boardOnlyDestroyDelta.gold;
        const dKnowledge = symAgg.knowledge + shBonus.knowledge + boardOnlyDestroyDelta.knowledge;
        const boardEffects = createBoardDestroyResourceEffects(
            { x, y },
            { food: dFood, gold: dGold, knowledge: dKnowledge },
            storedFoodEffects,
        );

        const instanceIds = new Set([edict.instanceId, target.instanceId]);
        const markedBoard = markBoardSymbolsForRemoval(state.board, instanceIds);

        const baseFiltered = state.playerSymbols.filter((s) => !instanceIds.has(s.instanceId));
        const newSymbols = appendSymbolDefIdsToPlayer(
            baseFiltered,
            symAgg.addSymbolDefIds,
            state.unlockedKnowledgeUpgrades || [],
        );

        set({
            board: markedBoard,
            playerSymbols: newSymbols,
            food: state.food + dFood,
            gold: state.gold + dGold,
            ...resolveKnowledgeProgression(state, dKnowledge),
            forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices,
            forceEventsInNextSymbolChoices: state.forceEventsInNextSymbolChoices || symAgg.forceEventsInNextChoices,
            freeSelectionRerolls: (state.freeSelectionRerolls ?? 0) + symAgg.freeSelectionRerolls,
            isRelicShopOpen: state.isRelicShopOpen || symAgg.openRelicShop,
            lastEffects: [...state.lastEffects, ...boardEffects],
            phase: phaseAfterBoardAction(state),
            pendingEdictSource: null,
            pendingOblivionFurnaceRelicId: null,
            destroyRemovalBlinkStartedAtMs: getNowMs(),
        });
        const removeMarked = () => {
            set((current) => ({
                board: removeBoardSymbolsByInstanceIds(current.board, instanceIds),
                destroyRemovalBlinkStartedAtMs: null,
            }));
        };
        setTimeout(removeMarked, BOARD_DESTROY_BLINK_DURATION_MS);
        if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));
        get().appendEventLog({
            turn: state.turn,
            kind: 'board_action',
            slot: { x: pending.x, y: pending.y },
            symbolId: S.edict,
            delta: { food: dFood, gold: dGold, knowledge: dKnowledge },
            meta: {
                action: 'edict_destroy',
                targetSlot: { x, y },
                targetSymbolId: target.definition.id,
                destroyedSymbols: [
                    destroyedSymbol(edict, pending.x, pending.y),
                    destroyedSymbol(target, x, y),
                ],
            },
        });
    },
    cancelEdictPick: () => {
        const state = get();
        if (state.phase !== 'oblivion_furnace_board' || !state.pendingEdictSource) return;
        set({
            phase: phaseAfterBoardAction(state),
            pendingEdictSource: null,
            pendingOblivionFurnaceRelicId: null,
        });
    },
    consumeTribalVillageAt: (x: number, y: number) => {
        const prev = get();
        if (!isBoardActionPhase(prev.phase)) return;
        const sym = prev.board[x]?.[y];
        const sid = sym?.definition.id;
        if (!sym || sym.is_marked_for_destruction || sid !== S.tribal_village) return;

        const removed = [sym];
        const symAgg = aggregateCollectionDestroyEffects(removed, false, prev.unlockedKnowledgeUpgrades || []);
        const shBonus = scarabBonusForOwnedRemoves(prev.board, removed.length);

        const dFood = symAgg.food + shBonus.food;
        const dGold = symAgg.gold + shBonus.gold;
        const dKnowledge = symAgg.knowledge + shBonus.knowledge;

        const instanceIds = [sym.instanceId];
        const newBoard = prev.board.map((col) => [...col]);
        newBoard[x][y] = null;

        const baseFiltered = prev.playerSymbols.filter((s) => !instanceIds.includes(s.instanceId));
        const newSymbols = appendSymbolDefIdsToPlayer(
            baseFiltered,
            symAgg.addSymbolDefIds,
            prev.unlockedKnowledgeUpgrades || [],
        );

        // 첫 번째 standard 선택지 계산
        const knowledgeProgression = resolveKnowledgeProgression(prev, dKnowledge);
        const selCtx = {
            era: knowledgeProgression.era,
            religionUnlocked: prev.religionUnlocked,
            upgrades: (prev.unlockedKnowledgeUpgrades || []).map(Number),
            ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
            ownedSymbolDefIds: newSymbols.map((s) => s.definition.id),
            leaderId: prev.leaderId,
            leaderProgressLevel: prev.leaderProgressLevel,
            choiceCount: getStandardSymbolChoiceCount(newBoard),
            forceTerrainInNextSymbolChoices: prev.forceTerrainInNextSymbolChoices,
            forceEventsInNextSymbolChoices: prev.forceEventsInNextSymbolChoices,
        };

        const firstChoiceRes = generateChoicesSelection(selCtx);
        const choices = firstChoiceRes.choices;

        let nextForceTerrain = prev.forceTerrainInNextSymbolChoices;
        if (firstChoiceRes.consumedForceTerrain) nextForceTerrain = false;

        let nextForceEvents = prev.forceEventsInNextSymbolChoices;
        if (firstChoiceRes.consumedForceEvents) nextForceEvents = false;

        set({
            board: newBoard,
            playerSymbols: newSymbols,
            food: prev.food + dFood,
            gold: prev.gold + dGold,
            ...knowledgeProgression,
            forceTerrainInNextSymbolChoices: nextForceTerrain,
            forceEventsInNextSymbolChoices: nextForceEvents,
            freeSelectionRerolls: (prev.freeSelectionRerolls ?? 0) + symAgg.freeSelectionRerolls,
            isRelicShopOpen: prev.isRelicShopOpen || symAgg.openRelicShop,
            lastEffects: [...prev.lastEffects, { x, y, food: dFood, gold: dGold, knowledge: dKnowledge }],

            // 2회 선택 페이즈 기동
            phase: 'selection',
            symbolChoices: choices,
            bonusSelectionQueue: ['any', 'any'], // 첫 번째는 지금 띄우고, 두 번째가 큐에 대기하여 총 2회 발동
            symbolSelectionRelicSourceId: null,
            symbolSelectionSymbolSourceId: S.tribal_village,
            isTurnSymbolSelection: false,
        });

        if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));

        get().appendEventLog({
            turn: prev.turn,
            kind: 'board_action',
            slot: { x, y },
            symbolId: sid,
            delta: { food: dFood, gold: dGold, knowledge: dKnowledge },
            meta: {
                action: 'tribal_village_consume',
                destroyedSymbols: [destroyedSymbol(sym, x, y)],
            },
        });
    },
});
