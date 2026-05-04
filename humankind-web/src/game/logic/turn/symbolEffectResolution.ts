import { RELIGION_DOCTRINE_IDS, S, SymbolType } from '../../data/symbolDefinitions';
import { GUILD_UPGRADE_ID, THEOCRACY_UPGRADE_ID } from '../../data/knowledgeUpgrades';
import { isCorner } from '../symbolEffects/core';
import type { BoardGrid, BoardCoord, ResourceDelta } from './turnTypes';

export type SlotEffect = BoardCoord & ResourceDelta;

export interface DeferredReligionSlot extends BoardCoord {
    id: number;
}

export type SlotEffectCache = Map<string, ResourceDelta>;

export interface DeferredReligionResult {
    effects: SlotEffect[];
    foodDelta: number;
    goldDelta: number;
    knowledgeDelta: number;
}

export const slotKey = (x: number, y: number): string => `${x},${y}`;

/**
 * 홍수 심볼의 카운터가 비어 있으면 기존 처리와 동일하게 3으로 초기화한다.
 * 즉, 좌표 수집 함수지만 flood 인스턴스의 effect_counter를 의도적으로 mutate한다.
 */
export function collectDisabledTerrainCoords(board: BoardGrid, width: number, height: number): Set<string> {
    const disabledTerrainCoords = new Set<string>();

    for (let bx = 0; bx < width; bx++) {
        for (let by = 0; by < height; by++) {
            const sym = board[bx][by];
            if (!sym || sym.definition.id !== S.flood) continue;

            if (!sym.effect_counter || sym.effect_counter <= 0) sym.effect_counter = 3;
            if (sym.effect_counter <= 0) continue;

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = bx + dx;
                    const ny = by + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    const neighbor = board[nx][ny];
                    if (neighbor?.definition.type === SymbolType.TERRAIN) {
                        disabledTerrainCoords.add(slotKey(nx, ny));
                    }
                }
            }
        }
    }

    return disabledTerrainCoords;
}

export function computeReligionDeferredEffects(args: {
    board: BoardGrid;
    religionSlots: DeferredReligionSlot[];
    religionEffectCache: SlotEffectCache;
    getAdjacentCoords: (x: number, y: number) => BoardCoord[];
    unlockedKnowledgeUpgrades?: readonly number[];
}): DeferredReligionResult {
    const { board, religionSlots, religionEffectCache, getAdjacentCoords, unlockedKnowledgeUpgrades = [] } = args;
    const effects: SlotEffect[] = [];
    let foodDelta = 0;
    let goldDelta = 0;
    let knowledgeDelta = 0;
    const hasTheocracy = unlockedKnowledgeUpgrades.includes(THEOCRACY_UPGRADE_ID);

    if (religionSlots.length === 0) {
        return { effects, foodDelta, goldDelta, knowledgeDelta };
    }

    const doctrineFood = new Map<string, number>();
    const doctrineGold = new Map<string, number>();
    const doctrineKnowledge = new Map<string, number>();
    const emptySlotCount = board.reduce((count, col) => count + col.filter((cell) => cell === null).length, 0);
    const presentReligionIds = new Set<number>();

    for (const slot of religionSlots) {
        const key = slotKey(slot.x, slot.y);
        doctrineFood.set(key, 0);
        doctrineGold.set(key, 0);
        doctrineKnowledge.set(key, 0);

        const sym = board[slot.x][slot.y];
        if (sym && !sym.is_marked_for_destruction) {
            presentReligionIds.add(sym.definition.id);
        }
    }

    const maxIters = 4;
    for (let iter = 0; iter < maxIters; iter++) {
        let anyChanged = false;
        let knowledgeProducerCount = 0;
        let boardWideMaxFood = 0;

        for (let x = 0; x < board.length; x++) {
            for (let y = 0; y < board[x].length; y++) {
                const sym = board[x][y];
                if (!sym || sym.is_marked_for_destruction) continue;

                const key = slotKey(x, y);
                const producedFood = RELIGION_DOCTRINE_IDS.has(sym.definition.id)
                    ? (doctrineFood.get(key) ?? 0)
                    : (religionEffectCache.get(key)?.food ?? 0);
                const producedKnowledge = RELIGION_DOCTRINE_IDS.has(sym.definition.id)
                    ? (doctrineKnowledge.get(key) ?? 0)
                    : (religionEffectCache.get(key)?.knowledge ?? 0);
                if (producedFood > boardWideMaxFood) boardWideMaxFood = producedFood;
                if (producedKnowledge > 0) knowledgeProducerCount++;
            }
        }

        for (const slot of religionSlots) {
            const key = slotKey(slot.x, slot.y);
            const sym = board[slot.x][slot.y];
            if (!sym || sym.is_marked_for_destruction) continue;

            const hasOtherReligionOnBoard = [...presentReligionIds].some((id) => id !== sym.definition.id);
            if (hasOtherReligionOnBoard) {
                const prevFood = doctrineFood.get(key) ?? 0;
                const prevGold = doctrineGold.get(key) ?? 0;
                const prevKnowledge = doctrineKnowledge.get(key) ?? 0;
                if (prevFood !== 0 || prevGold !== 0 || prevKnowledge !== 0) anyChanged = true;
                doctrineFood.set(key, 0);
                doctrineGold.set(key, 0);
                doctrineKnowledge.set(key, 0);
                continue;
            }

            let maxAdjFood = -Infinity;
            const adj = getAdjacentCoords(slot.x, slot.y);

            for (const pos of adj) {
                const adjSym = board[pos.x][pos.y];
                if (!adjSym) continue;

                const adjKey = slotKey(pos.x, pos.y);
                const isDeferredDoctrine = RELIGION_DOCTRINE_IDS.has(adjSym.definition.id);
                const adjFoodFromCache = isDeferredDoctrine
                    ? (doctrineFood.get(adjKey) ?? 0)
                    : (religionEffectCache.get(adjKey)?.food ?? 0);

                maxAdjFood = Math.max(maxAdjFood, adjFoodFromCache);
            }

            if (maxAdjFood === -Infinity) maxAdjFood = 0;

            let food = 0;
            let gold = 0;
            let knowledge = 0;
            if (sym.definition.id === S.christianity) {
                food = hasTheocracy ? Math.max(boardWideMaxFood, maxAdjFood) : maxAdjFood;
            } else if (sym.definition.id === S.islam) {
                gold = knowledgeProducerCount * (hasTheocracy ? 3 : 2);
            } else if (sym.definition.id === S.buddhism) {
                food = emptySlotCount * (hasTheocracy ? 4 : 2);
            } else if (sym.definition.id === S.hinduism && isCorner(slot.x, slot.y)) {
                food = hasTheocracy ? 20 : 10;
                knowledge = hasTheocracy ? 20 : 10;
            }

            const prevFood = doctrineFood.get(key) ?? 0;
            const prevGold = doctrineGold.get(key) ?? 0;
            const prevKnowledge = doctrineKnowledge.get(key) ?? 0;
            if (prevFood !== food || prevGold !== gold || prevKnowledge !== knowledge) anyChanged = true;
            doctrineFood.set(key, food);
            doctrineGold.set(key, gold);
            doctrineKnowledge.set(key, knowledge);
        }

        if (!anyChanged) break;
    }

    for (const slot of religionSlots) {
        const key = slotKey(slot.x, slot.y);
        const sym = board[slot.x][slot.y];
        if (!sym || sym.is_marked_for_destruction) continue;

        const hasOtherReligionOnBoard = [...presentReligionIds].some((id) => id !== sym.definition.id);
        if (hasOtherReligionOnBoard) {
            sym.is_marked_for_destruction = true;
            continue;
        }

        const food = doctrineFood.get(key) ?? 0;
        const gold = doctrineGold.get(key) ?? 0;
        const knowledge = doctrineKnowledge.get(key) ?? 0;

        if (food !== 0 || gold !== 0 || knowledge !== 0) {
            effects.push({ x: slot.x, y: slot.y, food, gold, knowledge });
            foodDelta += food;
            goldDelta += gold;
            knowledgeDelta += knowledge;
        }
    }

    return { effects, foodDelta, goldDelta, knowledgeDelta };
}

export function buildFoodBySlotKey(effects: readonly SlotEffect[]): Map<string, number> {
    const foodBySlotKey = new Map<string, number>();
    for (const effect of effects) {
        const key = slotKey(effect.x, effect.y);
        foodBySlotKey.set(key, (foodBySlotKey.get(key) ?? 0) + effect.food);
    }
    return foodBySlotKey;
}

export interface DeferredMerchantResult {
    effects: SlotEffect[];
    goldDelta: number;
}

/**
 * Merchant(22)의 merchant_store_pending 및 legacy stored_gold를 의도적으로 mutate한다.
 * effectPhase 전체 종료 후 실제 인접 심볼의 식량 생산량을 참조해 즉시 골드를 생산한다.
 */
export function computeMerchantDeferredEffects(args: {
    board: BoardGrid;
    width: number;
    height: number;
    foodBySlotKey: ReadonlyMap<string, number>;
    getAdjacentCoords: (x: number, y: number) => BoardCoord[];
    unlockedKnowledgeUpgrades?: readonly number[];
}): DeferredMerchantResult {
    const { board, width, height, foodBySlotKey, getAdjacentCoords, unlockedKnowledgeUpgrades = [] } = args;
    const effects: SlotEffect[] = [];
    let goldDelta = 0;
    const hasGuild = unlockedKnowledgeUpgrades.includes(GUILD_UPGRADE_ID);

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const sym = board[x][y];
            if (!sym || sym.definition.id !== S.merchant) continue;
            if (!sym.merchant_store_pending) continue;

            const adjacentSymbols = getAdjacentCoords(x, y).filter((pos) => board[pos.x][pos.y] != null);
            const gold = hasGuild
                ? adjacentSymbols.reduce(
                      (maxFood, pos) => Math.max(maxFood, Math.max(0, foodBySlotKey.get(slotKey(pos.x, pos.y)) ?? 0)),
                      0,
                  )
                : (() => {
                      const picked =
                          adjacentSymbols.length > 0
                              ? adjacentSymbols[Math.floor(Math.random() * adjacentSymbols.length)]!
                              : null;
                      return picked ? Math.max(0, foodBySlotKey.get(slotKey(picked.x, picked.y)) ?? 0) : 0;
                  })();

            sym.stored_gold = 0;
            sym.merchant_store_pending = false;

            if (gold > 0) {
                effects.push({ x, y, food: 0, gold, knowledge: 0 });
                goldDelta += gold;
            }
        }
    }

    return { effects, goldDelta };
}
