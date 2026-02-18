import type { PlayerSymbolInstance } from '../types';
import { RELIGION_SYMBOL_IDS, KNOWLEDGE_PRODUCING_IDS, GOLD_PRODUCING_IDS } from '../data/symbolDefinitions';

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

/** Era 1 심볼 중 랜덤 하나 반환 */
const randomEra1SymbolId = (): number => {
    // Era 1 심볼: id 1~30
    return Math.floor(Math.random() * 30) + 1;
};

/** Era 2 심볼 중 랜덤 하나 반환 */
const randomEra2SymbolId = (): number => {
    // Era 2 심볼: id 31~50
    return Math.floor(Math.random() * 20) + 31;
};

/** 아무 심볼 랜덤 */
const randomAnySymbolId = (): number => {
    return Math.floor(Math.random() * 50) + 1;
};

export const processSingleSymbolEffects = (
    symbolInstance: PlayerSymbolInstance,
    boardGrid: (PlayerSymbolInstance | null)[][],
    x: number,
    y: number,
    currentFood?: number
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

        case 9: // Granary: Every spin: +2 Food. Adjacent Wheat/Rice produce double (handled as buff marker)
            food += 2;
            break;

        case 10: { // Monument: Every spin: +2 Knowledge. +1 Food per adjacent symbol
            knowledge += 2;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]) { food += 1; contributors.push(pos); }
            });
            break;
        }


        case 15: { // Palace: Every spin: +3 Food, +1 Gold. +1 Food per City on board
            food += 3;
            gold += 1;
            break;
        }

        case 16: { // Shrine: Every spin: +1 Food, +1 Knowledge. +2 Food if adjacent to Religion
            food += 1;
            knowledge += 1;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && RELIGION_SYMBOL_IDS.has(t.definition.id)) {
                    food += 2;
                    contributors.push(pos);
                }
            });
            break;
        }

        case 17: { // Plantation: Every spin: +2 Food. If adjacent to Banana: +4 Food & reset Banana timer
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

        case 18: // Pasture: Every spin: +1 Food. Adjacent Cattle/Horse +2 extra (handled as buff)
            food += 1;
            break;

        case 19: { // Quarry: Every spin: +1 Food. Adjacent Stone: +3 Gold. Adjacent Copper: +2 Gold
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

        case 20: { // Totem: +1 Food per Religion symbol anywhere on the board
            const religionCount = countOnBoardBySet(boardGrid, RELIGION_SYMBOL_IDS);
            food += religionCount;
            break;
        }

        case 21: // Offering: sacrifice 5 Food → +4 Knowledge
            if (currentFood !== undefined && currentFood >= 5) {
                food -= 5;
                knowledge += 4;
            }
            break;

        case 22: // Omen: 50% chance +6 Food, 50% chance -2 Food
            if (Math.random() < 0.5) {
                food += 6;
            } else {
                food -= 2;
            }
            break;

        case 23: // Campfire: Every spin: +2 Food. Destroyed after 10 spins
            food += 2;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 10) {
                symbolInstance.is_marked_for_destruction = true;
            }
            break;

        case 24: // Pottery: stores +2 Food internally. On destroy: releases stored Food ×2
            symbolInstance.effect_counter += 2;
            break;

        case 25: { // Hunting Ground: +2 Food. Adjacent Forest: +3 Food. Destroys adjacent Deer: +6 Food each
            food += 2;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t) {
                    if (t.definition.id === 26) { food += 3; contributors.push(pos); }
                    if (t.definition.id === 27) {
                        t.is_marked_for_destruction = true;
                        food += 6;
                        contributors.push(pos);
                    }
                }
            });
            break;
        }

        case 26: // Forest: +1 Food. (On destroy: +20 Food handled in destruction)
            food += 1;
            break;

        case 27: // Deer: +2 Food. Every 10 spins: adds another Deer to board
            food += 2;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 10) {
                spawnOnBoard.push(27);
                symbolInstance.effect_counter = 0;
            }
            break;

        case 28: { // Oasis: +3 Food. +2 Food per adjacent empty slot
            food += 3;
            // 빈 슬롯은 심볼이 없으므로 contributor 불필요
            adj.forEach(pos => {
                if (!boardGrid[pos.x][pos.y]) food += 2;
            });
            break;
        }

        case 29: // Flood Plain: +3 Food. 20% chance adjacent symbols produce double
            food += 3;
            break;

        case 30: // Tribal Village: On appear: adds 2 random Era 1 symbols. Destroys self
            addSymbolIds.push(randomEra1SymbolId(), randomEra1SymbolId());
            symbolInstance.is_marked_for_destruction = true;
            break;

        // ── Era 2: Classical ──

        case 31: { // Horse: +2 Food, +1 Gold. Adjacent Pasture: +4 Food extra
            food += 2;
            gold += 1;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === 18) { food += 4; contributors.push(pos); }
            });
            break;
        }

        case 32: { // Iron: +2 Food, +2 Gold
            food += 2;
            gold += 2;
            break;
        }

        case 34: { // Galley: +2 Gold. +2 Food per adjacent Coast. Every 8 spins: add random symbol
            gold += 2;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === 6) { food += 2; contributors.push(pos); }
            });
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 8) {
                addSymbolIds.push(randomAnySymbolId());
                symbolInstance.effect_counter = 0;
            }
            break;
        }

        case 35: { // Library: +3 Knowledge. +2 Knowledge if adjacent to Scroll
            knowledge += 3;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === 36) { knowledge += 2; contributors.push(pos); }
            });
            break;
        }

        case 36: { // Scroll: +2 Knowledge. +1 Knowledge per adjacent Knowledge-producing symbol
            knowledge += 2;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && KNOWLEDGE_PRODUCING_IDS.has(t.definition.id)) { knowledge += 1; contributors.push(pos); }
            });
            break;
        }

        case 37: { // Market: +1 Gold per adjacent symbol. Every 5 spins: convert 8 Gold → random Era 2 symbol
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]) { gold += 1; contributors.push(pos); }
            });
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 5) {
                addSymbolIds.push(randomEra2SymbolId());
                symbolInstance.effect_counter = 0;
            }
            break;
        }

        case 38: { // Tax Collector: +3 Gold. Adjacent symbols produce -1 Food (simplified)
            gold += 3;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]) { food -= 1; contributors.push(pos); }
            });
            break;
        }

        case 39: { // Merchant: +2 Gold. +1 Gold per unique resource type adjacent
            gold += 2;
            let hasFood = false, hasGold = false, hasKnowledge = false;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t) {
                    const tid = t.definition.id;
                    if (!hasFood && ![8, 34, 38, 46, 48].includes(tid)) { hasFood = true; contributors.push(pos); }
                    if (!hasGold && GOLD_PRODUCING_IDS.has(tid)) { hasGold = true; contributors.push(pos); }
                    if (!hasKnowledge && KNOWLEDGE_PRODUCING_IDS.has(tid)) { hasKnowledge = true; contributors.push(pos); }
                }
            });
            if (hasFood) gold += 1;
            if (hasGold) gold += 1;
            if (hasKnowledge) gold += 1;
            break;
        }

        case 40: // Vineyard: +2 Food, +2 Gold. Every 6 spins: produce Wine
            food += 2;
            gold += 2;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 6) {
                gold += 5;
                symbolInstance.effect_counter = 0;
            }
            break;

        case 41: // Oracle: +2 Knowledge. (Reveal next choices - UI feature, TODO)
            knowledge += 2;
            break;

        case 43: // Aqueduct: +2 Food. Adjacent food-producing symbols +2 extra Food
            food += 2;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && t.definition.id !== 38) {
                    food += 2;
                    contributors.push(pos);
                }
            });
            break;

        case 44: { // Forge: +2 Food, +1 Gold. Adjacent Copper/Iron: +4 Gold. Adjacent Stone: +2 Food
            food += 2;
            gold += 1;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t) {
                    if (t.definition.id === 8 || t.definition.id === 32) { gold += 4; contributors.push(pos); }
                    if (t.definition.id === 7) { food += 2; contributors.push(pos); }
                }
            });
            break;
        }

        case 45: // Great Wall: +4 Food, +2 Knowledge. Prevents row destruction (handled in store)
            food += 4;
            knowledge += 2;
            break;

        case 46: { // Caravan: +1 Gold per Gold-producing symbol on entire board
            const goldProducers = countOnBoardBySet(boardGrid, GOLD_PRODUCING_IDS);
            gold += goldProducers;
            break;
        }

        case 47: { // Pantheon: +2 Food, +2 Knowledge. No Religion on board: +5 Food extra
            food += 2;
            knowledge += 2;
            const religionOnBoard = countOnBoardBySet(boardGrid, RELIGION_SYMBOL_IDS);
            if (religionOnBoard === 0) food += 5;
            break;
        }

        case 48: // Harbor: +2 Gold. Every 6 spins: add random symbol
            gold += 2;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 6) {
                addSymbolIds.push(randomAnySymbolId());
                symbolInstance.effect_counter = 0;
            }
            break;

        case 50: // Arena: +2 Food. (Destruction bonus handled in store's destruction pass)
            food += 2;
            break;
    }

    // ── Granary 인접 버프 체크: Wheat(1) 또는 Rice(2)가 인접 Granary(9)가 있으면 2배 ──
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

    // ── Pasture 인접 버프 체크: Cattle(3) 또는 Horse(31)이 인접 Pasture(18)가 있으면 +2 Food ──
    if (id === 3 || id === 31) {
        adj.forEach(pos => {
            if (boardGrid[pos.x][pos.y]?.definition.id === 18) {
                if (id === 3) { food += 2; contributors.push(pos); }
                // Horse(31)은 이미 자체 로직에서 처리
            }
        });
    }

    const result: EffectResult = { food, knowledge, gold };
    if (addSymbolIds.length > 0) result.addSymbolIds = addSymbolIds;
    if (spawnOnBoard.length > 0) result.spawnOnBoard = spawnOnBoard;
    if (contributors.length > 0) result.contributors = contributors;
    return result;
};
