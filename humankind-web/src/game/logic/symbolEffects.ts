import type { PlayerSymbolInstance } from '../types';
import { RELIGION_SYMBOL_IDS, KNOWLEDGE_PRODUCING_IDS, RELIGION_DOCTRINE_IDS, SymbolType } from '../data/symbolDefinitions';
import { ENEMY_EFFECTS } from '../data/enemyEffectDefinitions';

export interface EffectResult {
    food: number;
    knowledge: number;
    gold: number;
    /** 이번 스핀에서 컬렉션에 추가할 심볼 ID 목록 */
    addSymbolIds?: number[];
    /** 이번 스핀에서 보드에 추가할 심볼 ID 목록 (빈 슬롯에 배치) */
    spawnOnBoard?: number[];
    /** 강제로 유물 선택 상점을 열어야 하는지 여부 */
    triggerRelicSelection?: boolean;
    /** 이 심볼의 효과에 기여한 인접 심볼 좌표 */
    contributors?: { x: number; y: number }[];
}

/** 현재 보유 유물의 활성 효과 플래그 (gameStore에서 조합해서 전달) */
export interface ActiveRelicEffects {
    /** 유물 보유 수 (석판 효과용) */
    relicCount: number;
    /** ID 4: 조몬 토기 조각 - 토기가 인접한 다른 토기를 파괴 */
    potteryDestroyAdjacent: boolean;
    /** ID 5: 이집트 구리 톱 - 채석장 인접 빈 슬롯마다 골드 +10 */
    quarryEmptyGold: boolean;
    /** ID 7: 쿠크 늪지대 바나나 화석 - 열대 과수원이 인접한 바나나 당 +20 식량 */
    bananaFossilBonus: boolean;
    /** ID 103: 가나안의 번제물 - 매 스핀 빈 슬롯마다 식량 -10 */
    burnOfferingEmptyPenalty: boolean;
    /** ID 107: 예리코 점토 두개골 - 제단/기념비 지식 +20 추가 */
    jerichoMonumentBonus: boolean;
    /** ID 111: 괴베클리 테페 짐승 뼈 - 목장 인접 동물 심볼 5% 잭팟 +150 */
    gobekliAnimalJackpot: boolean;
    /** ID 112: 길가메시 서사시 토판 - 종교 패널티 무효화 */
    gilgameshReligionNoPenalty: boolean;
    /** ID 115: 막달레니안 뼈 낚싯바늘 - 물고기가 골드 +10 추가 */
    fishBoneHookGold: boolean;
    /** ID 119: 가라만테스 안뜰 수로 - 오아시스 빈 칸 보너스 7→1, 자체 +5 */
    garamantesOasisReduce: boolean;
    /** ID 120: 나일 강 비옥한 흑니 (활성 중) - 식량 2배 */
    nileFloodDoubleFood: boolean;
}

export const DEFAULT_RELIC_EFFECTS: ActiveRelicEffects = {
    relicCount: 0,
    potteryDestroyAdjacent: false,
    quarryEmptyGold: false,
    bananaFossilBonus: false,
    burnOfferingEmptyPenalty: false,
    jerichoMonumentBonus: false,
    gobekliAnimalJackpot: false,
    gilgameshReligionNoPenalty: false,
    fishBoneHookGold: false,
    garamantesOasisReduce: false,
    nileFloodDoubleFood: false,
};

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

/** 심볼별 기본 식량 생산량 추정치 (Christianity 효과 계산용) -> x10 */
const SYMBOL_BASE_FOOD: Record<number, number> = {
    1: 20, 2: 20, 3: 10, 4: 30, 5: 10, 6: 10, 7: 10, 8: 0, 9: 20, 10: 0,
    11: 0, 12: 0, 13: 10, 14: 10, 15: 10, 16: 0, 17: -10, 18: 10, 19: 10, 20: 0,
    21: 0, 22: 20, 23: 20, 24: 0, 25: 0, 26: 0, 27: 0, 28: 0, 29: 20, 30: 20,
};

/** 심볼별 기본 지식 생산량 추정치 (Islam 효과 계산용) -> x10 */
const SYMBOL_BASE_KNOWLEDGE: Record<number, number> = {
    10: 5,   // Monument
    17: 10,  // Offering
    25: 20,  // Library
    26: 10,  // Scroll
};

/** Era 1 심볼 중 랜덤 하나 반환 (ID 1~21) */
const randomEra1SymbolId = (): number => {
    return Math.floor(Math.random() * 21) + 1;
};

/** 목장 인접 동물 심볼 태그 */
const ANIMAL_SYMBOL_IDS = new Set([3, 5, 22]); // Cattle, Fish, Horse

export const processSingleSymbolEffects = (
    symbolInstance: PlayerSymbolInstance,
    boardGrid: (PlayerSymbolInstance | null)[][],
    x: number,
    y: number,
    relicEffects: ActiveRelicEffects = DEFAULT_RELIC_EFFECTS
): EffectResult => {
    const id = symbolInstance.definition.id;
    let food = 0;
    let knowledge = 0;
    let gold = 0;
    const addSymbolIds: number[] = [];
    const spawnOnBoard: number[] = [];
    let triggerRelicSelection = false;
    const contributors: { x: number; y: number }[] = [];

    symbolInstance.effect_counter = (symbolInstance.effect_counter || 0);
    const adj = getAdjacentCoords(x, y);

    switch (id) {
        case 1: // Wheat: Every spin: +2 Food
            food += 20;
            break;

        case 2: // Rice: Every 4 spins: +10 Food
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 4) {
                food += 100;
                symbolInstance.effect_counter = 0;
            }
            break;

        case 3: { // Cattle: Every spin: +1 Food. +2 Food per adjacent Cattle
            food += 10;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && t.definition.id === 3) { food += 20; contributors.push(pos); }
            });
            // ID 111: 괴베클리 테페 - 목장 인접 시 5% 잭팟
            if (relicEffects.gobekliAnimalJackpot) {
                const nearPasture = adj.some(pos => boardGrid[pos.x][pos.y]?.definition.id === 14);
                if (nearPasture && Math.random() < 0.05) {
                    food += 150;
                }
            }
            break;
        }

        case 4: // Banana: Every spin: +20 Food. Destroyed after 6 spins
            food += 20;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 6) {
                symbolInstance.is_marked_for_destruction = true;
            }
            break;

        case 5: { // Fish: Every spin: +1 Food. +3 Food if adjacent to Coast
            food += 10;
            // ID 115: 막달레니안 뼈 낚싯바늘 - 물고기 골드 +10
            if (relicEffects.fishBoneHookGold) {
                gold += 10;
            }
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === 6) { food += 30; contributors.push(pos); }
            });
            // ID 111: 괴베클리 테페 - 목장 인접 시 5% 잭팟
            if (relicEffects.gobekliAnimalJackpot) {
                const nearPasture = adj.some(pos => boardGrid[pos.x][pos.y]?.definition.id === 14);
                if (nearPasture && Math.random() < 0.05) {
                    food += 150;
                }
            }
            break;
        }

        case 6: { // Coast: Every spin: +1 Food. +1 Gold per adjacent Coast
            food += 10;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === 6) { gold += 10; contributors.push(pos); }
            });
            break;
        }

        case 7: // Stone: Every spin: +1 Food, +1 Gold
            food += 10;
            gold += 10;
            break;

        case 8: { // Copper: Every spin: +2 Gold. If exactly 3 Copper on board: ×3
            const copperCount = countOnBoard(boardGrid, 8);
            const multiplier = copperCount === 3 ? 3 : 1;
            gold += 20 * multiplier;
            break;
        }

        case 9: // Granary: Every spin: +2 Food.
            food += 20;
            break;

        case 10: // Monument: Every spin: +5 Knowledge
            knowledge += 5;
            // ID 107: 예리코 점토 두개골 - 기념비 지식 +20 추가
            if (relicEffects.jerichoMonumentBonus) {
                knowledge += 20;
            }
            break;

        case 11: { // Oasis: Every spin: +7 Food per adjacent empty slot
            // ID 119: 가라만테스 안뜰 수로 - 빈 칸 보너스 1, 자체 +5
            if (relicEffects.garamantesOasisReduce) {
                food += 5; // 자체 보너스
                adj.forEach(pos => {
                    if (!boardGrid[pos.x][pos.y]) food += 1; // 빈 칸당 1
                });
            } else {
                adj.forEach(pos => {
                    if (!boardGrid[pos.x][pos.y]) food += 7;
                });
            }
            break;
        }

        case 12: { // Oral Tradition: Destroyed after 10 spins. On destroy: +10 Knowledge per adjacent symbol.
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 10) {
                symbolInstance.is_marked_for_destruction = true;
                let adjCount = 0;
                adj.forEach(pos => {
                    if (boardGrid[pos.x][pos.y]) {
                        adjCount++;
                        contributors.push(pos);
                    }
                });
                knowledge += adjCount * 10;
            }
            break;
        }

        case 13: { // Tropical Farm: Every spin: +10 Food. Adjacent Banana: Banana's destroy timer resets
            food += 10;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && t.definition.id === 4) {
                    t.effect_counter = 0;
                    contributors.push(pos);
                    // ID 7: 쿠크 늪지대 바나나 화석 - 열대 과수원이 매 스핀 인접한 바나나 당 식량 +20 생산
                    if (relicEffects.bananaFossilBonus) {
                        food += 20;
                    }
                }
            });
            break;
        }

        case 14: // Pasture: Every spin: +1 Food.
            food += 10;
            break;

        case 15: { // Quarry: Every spin: +1 Food. Adjacent Stone: +3 Gold. Adjacent Copper: +2 Gold
            food += 10;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t) {
                    if (t.definition.id === 7) { gold += 30; contributors.push(pos); }
                    if (t.definition.id === 8) { gold += 20; contributors.push(pos); }
                }
            });
            // ID 5: 이집트 구리 톱 - 인접 빈 슬롯마다 골드 +10
            if (relicEffects.quarryEmptyGold) {
                adj.forEach(pos => {
                    if (!boardGrid[pos.x][pos.y]) { gold += 10; }
                });
            }
            break;
        }

        case 16: { // Totem: Every spin: +20 Knowledge if placed in a corner.
            const isCorner = (x === 0 && y === 0) ||
                (x === 0 && y === BOARD_HEIGHT - 1) ||
                (x === BOARD_WIDTH - 1 && y === 0) ||
                (x === BOARD_WIDTH - 1 && y === BOARD_HEIGHT - 1);
            if (isCorner) {
                knowledge += 20;
            }
            break;
        }

        case 17: // Offering: Every spin: -10 Food, +10 Knowledge
            // ID 107: 예리코 점토 두개골 - 제단 지식 +20 추가
            food -= 10;
            knowledge += 10;
            if (relicEffects.jerichoMonumentBonus) {
                knowledge += 20;
            }
            break;

        case 18: // Omen: 50% chance +30 Food, 50% chance -15 Food
            if (Math.random() < 0.5) {
                food += 30;
            } else {
                food -= 15;
            }
            break;

        case 39: // Stone Tablet: Every spin: +5 Knowledge per relic owned
            knowledge += relicEffects.relicCount * 5;
            break;

        case 19: // Campfire: Every spin: +1 Food. After 10 spins: destroyed
            food += 10;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 10) {
                symbolInstance.is_marked_for_destruction = true;
            }
            break;

        case 20: { // Pottery: stores +30 Food per spin. On destroy: releases stored Food
            symbolInstance.effect_counter += 30;
            // ID 4: 조몬 토기 조각 - 인접한 다른 토기를 파괴 표시
            if (relicEffects.potteryDestroyAdjacent) {
                adj.forEach(pos => {
                    const t = boardGrid[pos.x][pos.y];
                    if (t && t.definition.id === 20 && !t.is_marked_for_destruction) {
                        t.is_marked_for_destruction = true;
                        contributors.push(pos);
                    }
                });
            }
            break;
        }

        case 21: // Tribal Village: After 1 spin: adds 2 random Ancient symbols. Destroys self
            addSymbolIds.push(randomEra1SymbolId(), randomEra1SymbolId());
            symbolInstance.is_marked_for_destruction = true;
            break;

        // ── Era 2: Classical ──

        case 22: // Horse: Every spin: +2 Food, +1 Gold
            food += 20;
            gold += 10;
            // ID 111: 괴베클리 테페 - 목장 인접 시 5% 잭팟
            if (relicEffects.gobekliAnimalJackpot) {
                const nearPasture = adj.some(pos => boardGrid[pos.x][pos.y]?.definition.id === 14);
                if (nearPasture && Math.random() < 0.05) {
                    food += 150;
                }
            }
            break;

        case 23: // Iron: Every spin: +2 Food, +2 Gold
            food += 20;
            gold += 20;
            break;

        case 24: { // Galley: +2 Gold. +2 Food per adjacent Coast. Every 8 spins: add random Ancient symbol
            gold += 20;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === 6) { food += 20; contributors.push(pos); }
            });
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 8) {
                addSymbolIds.push(randomEra1SymbolId());
                symbolInstance.effect_counter = 0;
            }
            break;
        }

        case 25: { // Library: +2 Knowledge. +2 Knowledge if adjacent to Scroll
            knowledge += 20;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === 26) { knowledge += 20; contributors.push(pos); }
            });
            break;
        }

        case 26: { // Scroll: +1 Knowledge. +1 Knowledge per adjacent Knowledge-producing symbol
            knowledge += 10;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && KNOWLEDGE_PRODUCING_IDS.has(t.definition.id)) { knowledge += 10; contributors.push(pos); }
            });
            break;
        }

        case 27: { // Market: +1 Gold per adjacent symbol
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]) { gold += 10; contributors.push(pos); }
            });
            break;
        }

        case 28: { // Tax Collector: +3 Gold. Adjacent symbols produce -1 Food
            gold += 30;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]) { food -= 10; contributors.push(pos); }
            });
            break;
        }

        case 29: { // Forge: +2 Food, +1 Gold. Adjacent Copper/Iron: +4 Gold. Adjacent Stone: +2 Food
            food += 20;
            gold += 10;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t) {
                    if (t.definition.id === 8 || t.definition.id === 23) { gold += 40; contributors.push(pos); }
                    if (t.definition.id === 7) { food += 20; contributors.push(pos); }
                }
            });
            break;
        }

        case 30: // Arena: +2 Food. (Destruction bonus handled in store)
            food += 20;
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
            food += emptySlots * 20;
            break;
        }

        case 34: // Hinduism: destruction bonus handled in gameStore finishProcessing
            break;

        // ── Enemy / Combat Symbols ──

        case 36: // Warrior
            if (symbolInstance.definition.symbol_type === SymbolType.ENEMY) {
                // 적 유닛 전용: 턴 기반 강도에서 배정된 적 효과 적용
                const effectId = symbolInstance.enemy_effect_id;
                const effect = effectId ? ENEMY_EFFECTS[effectId] : null;
                if (effect) {
                    food -= effect.food_penalty;
                    gold -= effect.gold_penalty;

                    if (effect.effect_type === 'debuff') {
                        const occupiedAdjCount = adj.filter(pos => boardGrid[pos.x][pos.y] !== null).length;
                        food -= occupiedAdjCount * 10;
                    }

                    if (effect.effect_type === 'destruction') {
                        symbolInstance.effect_counter++;
                        const interval = effectId === 14 ? 5 : 4;
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
                    if (Math.random() < 0.5) food -= 30; else gold -= 10;
                }
            }
            break;

        case 37: // Glowing Amber: After 3 spins: destroyed and opens relic selection
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 3) {
                symbolInstance.is_marked_for_destruction = true;
                triggerRelicSelection = true;
            }
            break;

        case 38: // Stargazer: Every spin: +3 Knowledge per empty slot
            adj.forEach(pos => {
                if (!boardGrid[pos.x][pos.y]) knowledge += 3;
            });
            break;
    }

    // ── ID 103: 가나안의 번제물 - 빈 슬롯마다 식량 -10 ──
    if (relicEffects.burnOfferingEmptyPenalty && id !== 0) {
        // 이건 보드 전체 빈 슬롯 처리라 gameStore에서 한 번만 처리
        // 심볼별로는 여기서 적용하지 않음 (gameStore에서 처리)
    }

    // ── 교리 패널티: 다른 교리 심볼에 인접 시 -500 Food ──
    if (RELIGION_DOCTRINE_IDS.has(id)) {
        const hasAdjacentDoctrine = adj.some(pos => {
            const t = boardGrid[pos.x][pos.y];
            return t && RELIGION_DOCTRINE_IDS.has(t.definition.id);
        });
        if (hasAdjacentDoctrine && !relicEffects.gilgameshReligionNoPenalty) {
            food -= 500;
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
                food += 20;
                contributors.push(pos);
            }
        });
    }

    // ── ID 120: 나일 강 비옥한 흑니 - 활성 중 식량 2배 ──
    if (relicEffects.nileFloodDoubleFood && food > 0) {
        food *= 2;
    }

    const result: EffectResult = { food, knowledge, gold };
    if (addSymbolIds.length > 0) result.addSymbolIds = addSymbolIds;
    if (spawnOnBoard.length > 0) result.spawnOnBoard = spawnOnBoard;
    if (triggerRelicSelection) result.triggerRelicSelection = true;
    if (contributors.length > 0) result.contributors = contributors;
    return result;
};
