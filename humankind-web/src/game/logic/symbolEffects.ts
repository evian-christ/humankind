import type { PlayerSymbolInstance } from '../types';
import { RELIGION_SYMBOL_IDS, KNOWLEDGE_PRODUCING_IDS, RELIGION_DOCTRINE_IDS } from '../data/symbolDefinitions';
import { ENEMY_EFFECTS } from '../data/enemyEffectDefinitions';

export interface EffectResult {
    food: number;
    knowledge: number;
    gold: number;
    /** 이번 스핀에서 컬렉션에 추가할 심볼 ID 목록 */
    addSymbolIds?: number[];
    /** 이번 스핀에서 보드에 추가할 심볼 ID 목록 (빈 슬롯에 배치) */
    spawnOnBoard?: number[];
    /** 이 심볼의 효과에 기여한 인접 심볼 좌표 */
    contributors?: { x: number; y: number }[];
}

const BOARD_WIDTH = 5;
const BOARD_HEIGHT = 4;

const getAdjacentCoords = (x: number, y: number): { x: number; y: number }[] => {
    const adj: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) {
                adj.push({ x: nx, y: ny });
            }
        }
    }
    return adj;
};

/** 보드 전체에서 특정 ID의 심볼 개수 세기 */
const countOnBoard = (boardGrid: (PlayerSymbolInstance | null)[][], targetId: number): number => {
    let count = 0;
    for (let bx = 0; bx < BOARD_WIDTH; bx++) {
        for (let by = 0; by < BOARD_HEIGHT; by++) {
            if (boardGrid[bx][by]?.definition.id === targetId) count++;
        }
    }
    return count;
};

/** 보드 전체에서 주어진 ID Set에 속하는 심볼 개수 */
const countOnBoardBySet = (boardGrid: (PlayerSymbolInstance | null)[][], ids: Set<number>): number => {
    let count = 0;
    for (let bx = 0; bx < BOARD_WIDTH; bx++) {
        for (let by = 0; by < BOARD_HEIGHT; by++) {
            const s = boardGrid[bx][by];
            if (s && ids.has(s.definition.id)) count++;
        }
    }
    return count;
};

/** 심볼별 기본 식량 생산량 추정치 (Christianity 효과 계산용) */
const SYMBOL_BASE_FOOD: Record<number, number> = {
    1: 2, 2: 2, 3: 1, 4: 3, 5: 1, 6: 1, 7: 1, 8: 0, 9: 2, 10: 0,
    11: 3, 12: 1, 13: 2, 14: 1, 15: 1, 16: 1, 17: -5, 18: 1, 19: 1, 20: 0,
    21: 0, 22: 2, 23: 2, 24: 0, 25: 0, 26: 0, 27: 0, 28: 0, 29: 2, 30: 2,
};

/** 심볼별 기본 지식 생산량 추정치 (Islam 효과 계산용) */
const SYMBOL_BASE_KNOWLEDGE: Record<number, number> = {
    10: 1,  // Monument
    17: 3,  // Offering
    25: 2,  // Library
    26: 1,  // Scroll
};

/** Era 1 심볼 중 랜덤 하나 반환 (ID 1~21) */
const randomEra1SymbolId = (): number => {
    return Math.floor(Math.random() * 21) + 1;
};



export const processSingleSymbolEffects = (
    symbolInstance: PlayerSymbolInstance,
    boardGrid: (PlayerSymbolInstance | null)[][],
    x: number,
    y: number
): EffectResult => {
    const id = symbolInstance.definition.id;
    let food = 0;
    let knowledge = 0;
    let gold = 0;
    const addSymbolIds: number[] = [];
    const spawnOnBoard: number[] = [];
    const contributors: { x: number; y: number }[] = [];

    symbolInstance.effect_counter = (symbolInstance.effect_counter || 0);
    const adj = getAdjacentCoords(x, y);

    switch (id) {
        case 1: // Wheat: Every spin: +2 Food
            food += 2;
            break;

        case 2: // Rice: Every 4 spins: +10 Food
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 4) {
                food += 10;
                symbolInstance.effect_counter = 0;
            }
            break;

        case 3: { // Cattle: Every spin: +1 Food. +2 Food per adjacent Cattle
            food += 1;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && t.definition.id === 3) { food += 2; contributors.push(pos); }
            });
            break;
        }

        case 4: // Banana: Every spin: +3 Food. Destroyed after 6 spins
            food += 3;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 6) {
                symbolInstance.is_marked_for_destruction = true;
            }
            break;

        case 5: { // Fish: Every spin: +1 Food. +3 Food if adjacent to Coast
            food += 1;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === 6) { food += 3; contributors.push(pos); }
            });
            break;
        }

        case 6: { // Coast: Every spin: +1 Food. +1 Gold per adjacent Coast
            food += 1;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === 6) { gold += 1; contributors.push(pos); }
            });
            break;
        }

        case 7: // Stone: Every spin: +1 Food, +1 Gold
            food += 1;
            gold += 1;
            break;

        case 8: { // Copper: Every spin: +2 Gold. If exactly 3 Copper on board: ×3
            const copperCount = countOnBoard(boardGrid, 8);
            const multiplier = copperCount === 3 ? 3 : 1;
            gold += 2 * multiplier;
            break;
        }

        case 9: // Granary: Every spin: +2 Food. (Adjacent Wheat/Rice double handled below)
            food += 2;
            break;

        case 10: // Monument: Every spin: +1 Knowledge
            knowledge += 1;
            break;

        case 11: { // Oasis: Every spin: +3 Food. +2 Food per adjacent empty slot
            food += 3;
            adj.forEach(pos => {
                if (!boardGrid[pos.x][pos.y]) food += 2;
            });
            break;
        }

        case 12: { // Shrine: Every spin: +1 Food. +2 Food if adjacent to Religion symbol
            food += 1;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && RELIGION_SYMBOL_IDS.has(t.definition.id)) {
                    food += 2;
                    contributors.push(pos);
                }
            });
            break;
        }

        case 13: { // Plantation: Every spin: +2 Food. Adjacent Banana: +4 Food & reset timer
            food += 2;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && t.definition.id === 4) {
                    food += 4;
                    t.effect_counter = 0;
                    contributors.push(pos);
                }
            });
            break;
        }

        case 14: // Pasture: Every spin: +1 Food. (Adjacent Cattle/Horse buff handled below)
            food += 1;
            break;

        case 15: { // Quarry: Every spin: +1 Food. Adjacent Stone: +3 Gold. Adjacent Copper: +2 Gold
            food += 1;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t) {
                    if (t.definition.id === 7) { gold += 3; contributors.push(pos); }
                    if (t.definition.id === 8) { gold += 2; contributors.push(pos); }
                }
            });
            break;
        }

        case 16: { // Totem: +1 Food per Religion symbol anywhere on the board
            const religionCount = countOnBoardBySet(boardGrid, RELIGION_SYMBOL_IDS);
            food += religionCount;
            break;
        }

        case 17: // Offering: Every spin: -5 Food, +3 Knowledge
            food -= 5;
            knowledge += 3;
            break;

        case 18: // Omen: 50% chance +5 Food, 50% chance -3 Food
            if (Math.random() < 0.5) {
                food += 5;
            } else {
                food -= 3;
            }
            break;

        case 19: // Campfire: Every spin: +1 Food. After 10 spins: destroyed
            food += 1;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 10) {
                symbolInstance.is_marked_for_destruction = true;
            }
            break;

        case 20: // Pottery: stores +2 Food internally. On destroy: releases stored Food ×2
            symbolInstance.effect_counter += 2;
            break;

        case 21: // Tribal Village: After 1 spin: adds 2 random Ancient symbols. Destroys self
            addSymbolIds.push(randomEra1SymbolId(), randomEra1SymbolId());
            symbolInstance.is_marked_for_destruction = true;
            break;

        // ── Era 2: Classical ──

        case 22: // Horse: Every spin: +2 Food, +1 Gold
            food += 2;
            gold += 1;
            break;

        case 23: // Iron: Every spin: +2 Food, +2 Gold
            food += 2;
            gold += 2;
            break;

        case 24: { // Galley: +2 Gold. +2 Food per adjacent Coast. Every 8 spins: add random Ancient symbol
            gold += 2;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === 6) { food += 2; contributors.push(pos); }
            });
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 8) {
                addSymbolIds.push(randomEra1SymbolId());
                symbolInstance.effect_counter = 0;
            }
            break;
        }

        case 25: { // Library: +2 Knowledge. +2 Knowledge if adjacent to Scroll
            knowledge += 2;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === 26) { knowledge += 2; contributors.push(pos); }
            });
            break;
        }

        case 26: { // Scroll: +1 Knowledge. +1 Knowledge per adjacent Knowledge-producing symbol
            knowledge += 1;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && KNOWLEDGE_PRODUCING_IDS.has(t.definition.id)) { knowledge += 1; contributors.push(pos); }
            });
            break;
        }

        case 27: { // Market: +1 Gold per adjacent symbol
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]) { gold += 1; contributors.push(pos); }
            });
            break;
        }

        case 28: { // Tax Collector: +3 Gold. Adjacent symbols produce -1 Food
            gold += 3;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]) { food -= 1; contributors.push(pos); }
            });
            break;
        }

        case 29: { // Forge: +2 Food, +1 Gold. Adjacent Copper/Iron: +4 Gold. Adjacent Stone: +2 Food
            food += 2;
            gold += 1;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t) {
                    if (t.definition.id === 8 || t.definition.id === 23) { gold += 4; contributors.push(pos); }
                    if (t.definition.id === 7) { food += 2; contributors.push(pos); }
                }
            });
            break;
        }

        case 30: // Arena: +2 Food. (Destruction bonus handled in store)
            food += 2;
            break;

        // ── Religion Doctrine Symbols ──

        case 31: { // Christianity: Food = highest adjacent food. Gold = 3× adjacent knowledge.
            let maxAdjFood = 0;
            let adjKnowledge = 0;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t) {
                    const baseFood = SYMBOL_BASE_FOOD[t.definition.id] ?? 0;
                    if (baseFood > maxAdjFood) maxAdjFood = baseFood;
                    adjKnowledge += SYMBOL_BASE_KNOWLEDGE[t.definition.id] ?? 0;
                    contributors.push(pos);
                }
            });
            food += maxAdjFood;
            gold += adjKnowledge * 3;
            break;
        }

        case 32: { // Islam: Gold = 3× total knowledge produced by adjacent symbols
            let adjKnowledge = 0;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t) {
                    adjKnowledge += SYMBOL_BASE_KNOWLEDGE[t.definition.id] ?? 0;
                    if (KNOWLEDGE_PRODUCING_IDS.has(t.definition.id)) contributors.push(pos);
                }
            });
            gold += adjKnowledge * 3;
            break;
        }

        case 33: { // Buddhism: +2 Food per empty slot on the board
            let emptySlots = 0;
            for (let bx = 0; bx < BOARD_WIDTH; bx++) {
                for (let by = 0; by < BOARD_HEIGHT; by++) {
                    if (!boardGrid[bx][by]) emptySlots++;
                }
            }
            food += emptySlots * 2;
            break;
        }

        case 34: // Hinduism: destruction bonus handled in gameStore finishProcessing
            break;

        // ── Enemy / Combat Symbols ──

        case 35: { // Barbarian: 턴 기반 강도에서 배정된 적 효과 적용
            const effectId = symbolInstance.enemy_effect_id;
            const effect = effectId ? ENEMY_EFFECTS[effectId] : null;
            if (effect) {
                food -= effect.food_penalty;
                gold -= effect.gold_penalty;

                // debuff 효과: 인접 심볼 생산 감소 (결과에 직접 반영하지 않고 패널티만 적용)
                if (effect.effect_type === 'debuff') {
                    const adjCount = adj.filter(pos => boardGrid[pos.x][pos.y] !== null).length;
                    // 약간의 추가 패널티: 인접 심볼 수 * 1
                    food -= adjCount;
                }

                // destruction 효과: 카운터 기반 인접 심볼 파괴
                if (effect.effect_type === 'destruction') {
                    symbolInstance.effect_counter++;
                    const interval = effectId === 14 ? 5 : 4; // id 14 = 5스핀, id 18 = 4스핀
                    if (symbolInstance.effect_counter >= interval) {
                        symbolInstance.effect_counter = 0;
                        const occupiedAdj = adj.filter(pos => {
                            const s = boardGrid[pos.x][pos.y];
                            return s !== null && !s.is_marked_for_destruction;
                        });
                        if (occupiedAdj.length > 0) {
                            const target = occupiedAdj[Math.floor(Math.random() * occupiedAdj.length)];
                            boardGrid[target.x][target.y]!.is_marked_for_destruction = true;
                        }
                    }
                }
            } else {
                // fallback (효과 미배정 시 기본 동작)
                if (Math.random() < 0.5) food -= 3; else gold -= 1;
            }
            break;
        }

        case 36: // Warrior: Every 10 spins: -3 Food
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 10) {
                food -= 3;
                symbolInstance.effect_counter = 0;
            }
            break;
    }

    // ── 교리 패널티: 다른 교리 심볼에 인접 시 -50 Food ──
    if (RELIGION_DOCTRINE_IDS.has(id)) {
        const hasAdjacentDoctrine = adj.some(pos => {
            const t = boardGrid[pos.x][pos.y];
            return t && RELIGION_DOCTRINE_IDS.has(t.definition.id);
        });
        if (hasAdjacentDoctrine) {
            food -= 50;
        }
    }

    // ── Granary(9) 인접 버프: 인접 Wheat(1) 또는 Rice(2)가 있으면 해당 심볼 food 2배 ──
    if (id === 1 || id === 2) {
        adj.forEach(pos => {
            if (boardGrid[pos.x][pos.y]?.definition.id === 9) {
                contributors.push(pos);
            }
        });
        if (contributors.length > 0) {
            food *= 2;
        }
    }

    // ── Pasture(14) 인접 버프: 인접 Cattle(3) 또는 Horse(22)가 있으면 +2 Food ──
    if (id === 3 || id === 22) {
        adj.forEach(pos => {
            if (boardGrid[pos.x][pos.y]?.definition.id === 14) {
                food += 2;
                contributors.push(pos);
            }
        });
    }

    const result: EffectResult = { food, knowledge, gold };
    if (addSymbolIds.length > 0) result.addSymbolIds = addSymbolIds;
    if (spawnOnBoard.length > 0) result.spawnOnBoard = spawnOnBoard;
    if (contributors.length > 0) result.contributors = contributors;
    return result;
};
