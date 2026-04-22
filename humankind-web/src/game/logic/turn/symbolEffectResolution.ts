import { RELIGION_DOCTRINE_IDS, S, SymbolType } from '../../data/symbolDefinitions';
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
}): DeferredReligionResult {
    const { board, religionSlots, religionEffectCache, getAdjacentCoords } = args;
    const effects: SlotEffect[] = [];
    let foodDelta = 0;
    let goldDelta = 0;

    if (religionSlots.length === 0) {
        return { effects, foodDelta, goldDelta };
    }

    const doctrineFood = new Map<string, number>();
    const doctrineGold = new Map<string, number>();

    for (const slot of religionSlots) {
        const key = slotKey(slot.x, slot.y);
        doctrineFood.set(key, 0);
        doctrineGold.set(key, 0);
    }

    const maxIters = 4;
    for (let iter = 0; iter < maxIters; iter++) {
        let anyChanged = false;

        for (const slot of religionSlots) {
            const key = slotKey(slot.x, slot.y);
            const sym = board[slot.x][slot.y];
            if (!sym || sym.is_marked_for_destruction) continue;

            let maxAdjFood = -Infinity;
            let knowledgeProducerCount = 0;
            const adj = getAdjacentCoords(slot.x, slot.y);

            for (const pos of adj) {
                const adjSym = board[pos.x][pos.y];
                if (!adjSym) {
                    maxAdjFood = Math.max(maxAdjFood, 0);
                    continue;
                }

                const adjKey = slotKey(pos.x, pos.y);
                const isDeferredDoctrine = adjSym.definition.id === S.christianity || adjSym.definition.id === S.islam;
                const adjFoodFromCache = isDeferredDoctrine
                    ? (doctrineFood.get(adjKey) ?? 0)
                    : (religionEffectCache.get(adjKey)?.food ?? 0);
                const adjKnowledgeFromCache = isDeferredDoctrine
                    ? 0
                    : (religionEffectCache.get(adjKey)?.knowledge ?? 0);

                maxAdjFood = Math.max(maxAdjFood, adjFoodFromCache);
                if (adjKnowledgeFromCache > 0) knowledgeProducerCount++;
            }

            if (maxAdjFood === -Infinity) maxAdjFood = 0;

            let food = 0;
            let gold = 0;
            if (sym.definition.id === S.christianity) {
                food = maxAdjFood;
            } else if (sym.definition.id === S.islam) {
                gold = knowledgeProducerCount * 2;
            }

            const hasAdjacentDoctrine = adj.some((pos) => {
                const target = board[pos.x][pos.y];
                return target && RELIGION_DOCTRINE_IDS.has(target.definition.id);
            });
            if (hasAdjacentDoctrine) {
                food -= 50;
            }

            const prevFood = doctrineFood.get(key) ?? 0;
            const prevGold = doctrineGold.get(key) ?? 0;
            if (prevFood !== food || prevGold !== gold) anyChanged = true;
            doctrineFood.set(key, food);
            doctrineGold.set(key, gold);
        }

        if (!anyChanged) break;
    }

    for (const slot of religionSlots) {
        const key = slotKey(slot.x, slot.y);
        const sym = board[slot.x][slot.y];
        if (!sym || sym.is_marked_for_destruction) continue;

        const food = doctrineFood.get(key) ?? 0;
        const gold = doctrineGold.get(key) ?? 0;

        if (food !== 0 || gold !== 0) {
            effects.push({ x: slot.x, y: slot.y, food, gold, knowledge: 0 });
            foodDelta += food;
            goldDelta += gold;
        }
    }

    return { effects, foodDelta, goldDelta };
}

export function buildFoodBySlotKey(effects: readonly SlotEffect[]): Map<string, number> {
    const foodBySlotKey = new Map<string, number>();
    for (const effect of effects) {
        const key = slotKey(effect.x, effect.y);
        foodBySlotKey.set(key, (foodBySlotKey.get(key) ?? 0) + effect.food);
    }
    return foodBySlotKey;
}

/**
 * Merchant(22)의 stored_gold 및 merchant_store_pending을 의도적으로 mutate한다.
 * effectPhase 전체 종료 후 이번 턴 실제 인접 식량 생산량을 저장하는 기존 동작을 보존한다.
 */
export function applyMerchantStoredGold(args: {
    board: BoardGrid;
    width: number;
    height: number;
    foodBySlotKey: ReadonlyMap<string, number>;
    getAdjacentCoords: (x: number, y: number) => BoardCoord[];
}): void {
    const { board, width, height, foodBySlotKey, getAdjacentCoords } = args;
    const isCorner = (x: number, y: number) =>
        (x === 0 && y === 0) ||
        (x === 0 && y === height - 1) ||
        (x === width - 1 && y === 0) ||
        (x === width - 1 && y === height - 1);

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const sym = board[x][y];
            if (!sym || sym.definition.id !== S.merchant) continue;
            if (!sym.merchant_store_pending) continue;
            if (isCorner(x, y)) continue;

            let maxAdjFood = 0;
            for (const pos of getAdjacentCoords(x, y)) {
                const adjFood = foodBySlotKey.get(slotKey(pos.x, pos.y)) ?? 0;
                const adjPositive = Math.max(0, adjFood);
                if (adjPositive > maxAdjFood) maxAdjFood = adjPositive;
            }

            sym.stored_gold = (sym.stored_gold ?? 0) + maxAdjFood;
            sym.merchant_store_pending = false;
        }
    }
}
