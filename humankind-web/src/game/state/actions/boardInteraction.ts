import { NOMADIC_TRADITION_UPGRADE_ID, PASTURE_MANAGEMENT_UPGRADE_ID } from '../../data/knowledgeUpgrades';
import { S } from '../../data/symbolDefinitions';
import type { GameState } from '../gameStore';
import {
    aggregateCollectionDestroyEffects,
    appendSymbolDefIdsToPlayer,
    scarabAndHinduismBonusForOwnedRemoves,
} from '../gameStoreHelpers';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
export type GameStoreGet = () => GameState;

interface BoardInteractionDeps {
    get: GameStoreGet;
    set: GameStoreSet;
    getAdjacentCoords: (x: number, y: number) => { x: number; y: number }[];
}

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
});
