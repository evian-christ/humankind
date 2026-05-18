import { MILITARY_SCIENCE_UPGRADE_ID, NOMADIC_TRADITION_UPGRADE_ID, PASTURE_MANAGEMENT_UPGRADE_ID, TRACKING_UPGRADE_ID } from '../../data/knowledgeUpgrades';
import { S, SYMBOLS, SymbolType } from '../../data/symbolDefinitions';
import { isMeleeUnit, isRangedUnit } from '../../data/unitUpgrades';
import type { GameState } from '../gameStore';
import { RELICS } from '../../data/relicDefinitions';
import {
    aggregateCollectionDestroyEffects,
    appendSymbolDefIdsToPlayer,
    scarabBonusForOwnedRemoves,
} from '../gameStoreHelpers';
import { useRelicStore } from '../relicStore';
import {
    generateLootRewardChoices,
    getRewardAmounts,
    REWARDS,
    type LootTier,
} from '../../data/rewardDefinitions';

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

export const createBoardInteractionActions = ({ get, set, getAdjacentCoords }: BoardInteractionDeps) => ({
    butcherPastureAnimalAt: (x: number, y: number) => {
        const prev = get();
        if (prev.phase !== 'idle') return;
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
        const butcherFood = sid === S.cattle ? (hasNomadicTradition ? 15 : 10) : 5;
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
            knowledge: prev.knowledge + dKnowledge,
            bonusXpPerTurn: prev.bonusXpPerTurn + symAgg.bonusXpPerTurnDelta,
            forceTerrainInNextSymbolChoices: prev.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices,
            freeSelectionRerolls: (prev.freeSelectionRerolls ?? 0) + symAgg.freeSelectionRerolls,
            isRelicShopOpen: prev.isRelicShopOpen || symAgg.openRelicShop,
            lastEffects: [...prev.lastEffects, { x, y, food: dFood, gold: dGold, knowledge: dKnowledge }],
        });
        if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));
        get().appendEventLog({
            turn: prev.turn,
            kind: 'system',
            slot: { x, y },
            symbolId: sid,
            delta: { food: dFood, gold: dGold, knowledge: dKnowledge },
            meta: {
                action: sid === S.cattle ? 'cattle_butcher' : 'sheep_butcher',
                butcherFood,
                butcherGoldFlat,
            },
        });
    },
    trainHorseUnitAt: (x: number, y: number) => {
        const prev = get();
        if (prev.phase !== 'idle') return;
        const horse = prev.board[x]?.[y];
        if (!horse || horse.definition.id !== S.horse || horse.is_marked_for_destruction) return;
        const trainedCavalryId = (prev.unlockedKnowledgeUpgrades || []).includes(MILITARY_SCIENCE_UPGRADE_ID)
            ? S.cavalry_corps
            : S.cavalry;

        const targetCoord = getAdjacentCoords(x, y).find(({ x: ax, y: ay }) => {
            const candidate = prev.board[ax]?.[ay];
            return !!candidate &&
                !candidate.is_marked_for_destruction &&
                isMeleeUnit(candidate.definition) &&
                candidate.definition.id !== trainedCavalryId;
        });
        if (!targetCoord) return;

        const target = prev.board[targetCoord.x][targetCoord.y];
        const cavalryDef = SYMBOLS[trainedCavalryId]!;
        if (!target) return;

        const prevMax = target.definition.base_hp ?? 0;
        const nextMax = cavalryDef.base_hp ?? 0;
        const currentHp = target.enemy_hp ?? prevMax;
        const damageTaken = Math.max(0, prevMax - currentHp);
        const upgradedTarget = {
            ...target,
            definition: cavalryDef,
            remaining_attacks: cavalryDef.base_attack ? 3 : 0,
            enemy_hp: Math.max(1, nextMax - damageTaken),
        };

        const newBoard = prev.board.map((col) => [...col]);
        newBoard[x][y] = null;
        newBoard[targetCoord.x][targetCoord.y] = upgradedTarget;
        const newPlayerSymbols = prev.playerSymbols
            .filter((symbol) => symbol.instanceId !== horse.instanceId)
            .map((symbol) => symbol.instanceId === target.instanceId ? upgradedTarget : symbol);

        set({
            board: newBoard,
            playerSymbols: newPlayerSymbols,
        });

        get().appendEventLog({
            turn: prev.turn,
            kind: 'system',
            slot: { x, y },
            symbolId: S.horse,
            delta: { food: 0, gold: 0, knowledge: 0 },
            meta: {
                action: 'horse_train',
                targetSlot: targetCoord,
                fromSymbolId: target.definition.id,
                toSymbolId: trainedCavalryId,
            },
        });
    },
    trainDeerUnitAt: (x: number, y: number) => {
        const prev = get();
        if (prev.phase !== 'idle') return;
        if (!(prev.unlockedKnowledgeUpgrades || []).includes(TRACKING_UPGRADE_ID)) return;
        const deer = prev.board[x]?.[y];
        if (!deer || deer.definition.id !== S.deer || deer.is_marked_for_destruction) return;

        const targetCoord = getAdjacentCoords(x, y).find(({ x: ax, y: ay }) => {
            const candidate = prev.board[ax]?.[ay];
            return !!candidate &&
                !candidate.is_marked_for_destruction &&
                isRangedUnit(candidate.definition) &&
                candidate.definition.id !== S.tracker_archer;
        });
        if (!targetCoord) return;

        const target = prev.board[targetCoord.x][targetCoord.y];
        const trackerArcherDef = SYMBOLS[S.tracker_archer]!;
        if (!target) return;

        const prevMax = target.definition.base_hp ?? 0;
        const nextMax = trackerArcherDef.base_hp ?? 0;
        const currentHp = target.enemy_hp ?? prevMax;
        const damageTaken = Math.max(0, prevMax - currentHp);
        const upgradedTarget = {
            ...target,
            definition: trackerArcherDef,
            remaining_attacks: trackerArcherDef.base_attack ? 3 : 0,
            enemy_hp: Math.max(1, nextMax - damageTaken),
        };

        const newBoard = prev.board.map((col) => [...col]);
        newBoard[x][y] = null;
        newBoard[targetCoord.x][targetCoord.y] = upgradedTarget;
        const newPlayerSymbols = prev.playerSymbols
            .filter((symbol) => symbol.instanceId !== deer.instanceId)
            .map((symbol) => symbol.instanceId === target.instanceId ? upgradedTarget : symbol);

        set({
            board: newBoard,
            playerSymbols: newPlayerSymbols,
        });

        get().appendEventLog({
            turn: prev.turn,
            kind: 'system',
            slot: { x, y },
            symbolId: S.deer,
            delta: { food: 0, gold: 0, knowledge: 0 },
            meta: {
                action: 'deer_train',
                targetSlot: targetCoord,
                fromSymbolId: target.definition.id,
                toSymbolId: S.tracker_archer,
            },
        });
    },
    openLootAt: (x: number, y: number) => {
        const prev = get();
        if (prev.phase !== 'idle') return;
        const loot = prev.board[x]?.[y];
        const sid = loot?.definition.id;
        if (!loot || loot.is_marked_for_destruction || !LOOT_IDS.has(sid ?? -1)) return;

        const tier = LOOT_TIER_MAP[sid!]!;
        const choices = generateLootRewardChoices(tier);

        set({
            phase: 'loot_reward_selection',
            lootRewardChoices: choices,
            pendingLootSlot: { x, y, symbolId: sid! },
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
            knowledge: prev.knowledge + knowledge,
            lastEffects: [...prev.lastEffects, { x, y, food, gold, knowledge }],
            phase: 'idle',
            lootRewardChoices: [],
            pendingLootSlot: null,
        });

        if (reward.grantsRelic) {
            const relicPool = Object.values(RELICS);
            const relicDef = relicPool[Math.floor(Math.random() * relicPool.length)];
            if (relicDef) useRelicStore.getState().addRelic(relicDef);
        }

        get().appendEventLog({
            turn: prev.turn,
            kind: 'system',
            slot: { x, y },
            symbolId,
            delta: { food, gold, knowledge },
            meta: { action: 'loot_open', rewardKey: reward.key },
        });
    },
    activateEdictAt: (x: number, y: number) => {
        const prev = get();
        if (prev.phase !== 'idle') return;
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
        const shBonus = scarabBonusForOwnedRemoves(state.board, removed.length);
        const dFood = symAgg.food + shBonus.food;
        const dGold = symAgg.gold + shBonus.gold;
        const dKnowledge = symAgg.knowledge + shBonus.knowledge;

        const instanceIds = new Set([edict.instanceId, target.instanceId]);
        const newBoard = state.board.map((col) => [...col]);
        newBoard[pending.x][pending.y] = null;
        newBoard[x][y] = null;

        const baseFiltered = state.playerSymbols.filter((s) => !instanceIds.has(s.instanceId));
        const newSymbols = appendSymbolDefIdsToPlayer(
            baseFiltered,
            symAgg.addSymbolDefIds,
            state.unlockedKnowledgeUpgrades || [],
        );

        set({
            board: newBoard,
            playerSymbols: newSymbols,
            food: state.food + dFood,
            gold: state.gold + dGold,
            knowledge: state.knowledge + dKnowledge,
            bonusXpPerTurn: state.bonusXpPerTurn + symAgg.bonusXpPerTurnDelta,
            forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices,
            freeSelectionRerolls: (state.freeSelectionRerolls ?? 0) + symAgg.freeSelectionRerolls,
            isRelicShopOpen: state.isRelicShopOpen || symAgg.openRelicShop,
            lastEffects: [...state.lastEffects, { x, y, food: dFood, gold: dGold, knowledge: dKnowledge }],
            phase: 'idle',
            pendingEdictSource: null,
            pendingOblivionFurnaceRelicId: null,
        });
        if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));
        get().appendEventLog({
            turn: state.turn,
            kind: 'system',
            slot: { x: pending.x, y: pending.y },
            symbolId: S.edict,
            delta: { food: dFood, gold: dGold, knowledge: dKnowledge },
            meta: {
                action: 'edict_destroy',
                targetSlot: { x, y },
                targetSymbolId: target.definition.id,
            },
        });
    },
    cancelEdictPick: () => {
        const state = get();
        if (state.phase !== 'oblivion_furnace_board' || !state.pendingEdictSource) return;
        set({
            phase: 'idle',
            pendingEdictSource: null,
            pendingOblivionFurnaceRelicId: null,
        });
    },
});
