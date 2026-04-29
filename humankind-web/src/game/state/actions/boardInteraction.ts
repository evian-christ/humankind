import { NOMADIC_TRADITION_UPGRADE_ID, PASTURE_MANAGEMENT_UPGRADE_ID, TRACKING_UPGRADE_ID } from '../../data/knowledgeUpgrades';
import { S, SYMBOLS } from '../../data/symbolDefinitions';
import { isMeleeUnit, isRangedUnit } from '../../data/unitUpgrades';
import type { GameState } from '../gameStore';
import { RELICS } from '../../data/relicDefinitions';
import {
    aggregateCollectionDestroyEffects,
    appendSymbolDefIdsToPlayer,
    scarabAndHinduismBonusForOwnedRemoves,
} from '../gameStoreHelpers';
import { useRelicStore } from '../relicStore';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
export type GameStoreGet = () => GameState;

interface BoardInteractionDeps {
    get: GameStoreGet;
    set: GameStoreSet;
    getAdjacentCoords: (x: number, y: number) => { x: number; y: number }[];
}

const LOOT_IDS = new Set<number>([S.loot, S.greater_loot, S.radiant_loot]);

const rollLootReward = (symbolId: number): { food: number; gold: number; knowledge: number; relicId?: number } => {
    const r = Math.random();
    if (symbolId === S.loot) {
        if (r < 0.45) return { food: 15, gold: 5, knowledge: 0 };
        if (r < 0.8) return { food: 10, gold: 8, knowledge: 0 };
        return { food: 10, gold: 5, knowledge: 3 };
    }
    if (symbolId === S.greater_loot) {
        if (r < 0.45) return { food: 30, gold: 10, knowledge: 0 };
        if (r < 0.8) return { food: 20, gold: 16, knowledge: 0 };
        return { food: 20, gold: 10, knowledge: 8 };
    }
    if (r < 0.35) return { food: 65, gold: 20, knowledge: 0 };
    if (r < 0.65) return { food: 50, gold: 32, knowledge: 0 };
    if (r < 0.9) return { food: 50, gold: 20, knowledge: 15 };
    const relicPool = Object.values(RELICS);
    const relicDef = relicPool[Math.floor(Math.random() * relicPool.length)];
    return { food: 50, gold: 20, knowledge: 0, relicId: relicDef?.id };
};

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
        const shBonus = scarabAndHinduismBonusForOwnedRemoves(prev.board, removed.length);
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
            edictRemovalPending: prev.edictRemovalPending || symAgg.edictRemovalPending,
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

        const targetCoord = getAdjacentCoords(x, y).find(({ x: ax, y: ay }) => {
            const candidate = prev.board[ax]?.[ay];
            return !!candidate &&
                !candidate.is_marked_for_destruction &&
                isMeleeUnit(candidate.definition) &&
                candidate.definition.id !== S.cavalry;
        });
        if (!targetCoord) return;

        const target = prev.board[targetCoord.x][targetCoord.y];
        const cavalryDef = SYMBOLS[S.cavalry]!;
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
                toSymbolId: S.cavalry,
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

        const reward = rollLootReward(sid!);
        const newBoard = prev.board.map((col) => [...col]);
        newBoard[x][y] = null;
        const newPlayerSymbols = prev.playerSymbols.filter((symbol) => symbol.instanceId !== loot.instanceId);

        set({
            board: newBoard,
            playerSymbols: newPlayerSymbols,
            food: prev.food + reward.food,
            gold: prev.gold + reward.gold,
            knowledge: prev.knowledge + reward.knowledge,
            lastEffects: [...prev.lastEffects, { x, y, food: reward.food, gold: reward.gold, knowledge: reward.knowledge }],
        });

        if (reward.relicId) {
            const relicDef = RELICS[reward.relicId];
            if (relicDef) useRelicStore.getState().addRelic(relicDef);
        }

        get().appendEventLog({
            turn: prev.turn,
            kind: 'system',
            slot: { x, y },
            symbolId: sid,
            delta: { food: reward.food, gold: reward.gold, knowledge: reward.knowledge },
            meta: {
                action: 'loot_open',
                relicId: reward.relicId ?? null,
            },
        });
    },
});
