import type { PlayerSymbolInstance } from '../types';
import { RELIGION_SYMBOL_IDS, KNOWLEDGE_PRODUCING_IDS, RELIGION_DOCTRINE_IDS, SymbolType, BARBARIAN_CAMP_SPAWN_INTERVAL, S, SYMBOLS } from '../data/symbolDefinitions';
import { ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID, FEUDALISM_UPGRADE_ID } from '../data/knowledgeUpgrades';

import { useGameStore } from '../state/gameStore';

export interface EffectResult {
    food: number;
    knowledge: number;
    gold: number;
    /** 이번 턴에서 컬렉션에 추가할 심볼 ID 목록 */
    addSymbolIds?: number[];
    /** 이번 턴에서 보드에 추가할 심볼 ID 목록 (빈 슬롯에 배치) */
    spawnOnBoard?: number[];
    /** 강제로 유물 선택 상점을 열어야 하는지 여부 */
    triggerRelicSelection?: boolean;
    /** 유물 상점을 강제로 새로고침해야 하는지 여부 */
    triggerRelicRefresh?: boolean;
    /** 이 심볼의 효과에 기여한 인접 심볼 좌표 */
    contributors?: { x: number; y: number }[];
    /** 영구 턴당 지식 보너스 증가 (gameStore bonusXpPerTurn) */
    bonusXpPerTurnDelta?: number;
    /** 다음 심볼 선택지에 지형 1칸 이상 포함 */
    forceTerrainInNextChoices?: boolean;
    /** 턴 종료 후 칙령: 보유 심볼 1개 제거 UI */
    edictRemovalPending?: boolean;
    /** 다음 심볼 선택 단계에서 소비할 무료 리롤 횟수 */
    freeSelectionRerolls?: number;
}

/** 현재 보유 유물의 활성 효과 플래그 (gameStore에서 조합해서 전달) */
export interface ActiveRelicEffects {
    /** 유물 보유 수 (석판 효과용) */
    relicCount: number;
    /** ID 5: 이집트 구리 톱 - 채석장 인접 빈 슬롯마다 골드 +10 */
    quarryEmptyGold: boolean;
    /** ID 7: 쿠크 늪지대 바나나 화석 - 열대 과수원이 인접한 바나나 당 +20 식량 */
    bananaFossilBonus: boolean;
    /** ID 103: 가나안의 번제물 - 매 턴 빈 슬롯마다 식량 -10 */
    burnOfferingEmptyPenalty: boolean;
    /** ID 107: 예리코 점토 두개골 - 제단/기념비 지식 +20 추가 */
    jerichoMonumentBonus: boolean;
    /** ID 111: 괴베클리 테페 짐승 뼈 - 목장 인접 동물 심볼 5% 잭팟 +150 */
    gobekliAnimalJackpot: boolean;
    /** ID 112: 길가메시 서사시 토판 - 종교 패널티 무효화 */
    gilgameshReligionNoPenalty: boolean;
    /** ID 115: 막달레니안 뼈 낚싯바늘 - 물고기가 골드 +1 추가 */
    fishBoneHookGold: boolean;
    /** 기마술 업그레이드 - 목장 자체 생산량 +10 */
    horsemansihpPastureBonus: boolean;
    /** ID 16: 테라의 화석 포도 — 자연재해 심볼 식량 +2 */
    terraFossilDisasterFood: boolean;
}

export const DEFAULT_RELIC_EFFECTS: ActiveRelicEffects = {
    relicCount: 0,
    quarryEmptyGold: false,
    bananaFossilBonus: false,
    burnOfferingEmptyPenalty: false,
    jerichoMonumentBonus: false,
    gobekliAnimalJackpot: false,
    gilgameshReligionNoPenalty: false,
    fishBoneHookGold: false,
    horsemansihpPastureBonus: false,
    terraFossilDisasterFood: false,
};

const BOARD_WIDTH = 5;
const BOARD_HEIGHT = 4;

const SEA_TERRAIN_ID = S.sea;
const HARBOR_ID = S.harbor;

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

const hasSeaOrHarborAdjacent = (boardGrid: (PlayerSymbolInstance | null)[][], x: number, y: number): boolean =>
    getAdjacentCoords(x, y).some((p) => {
        const nid = boardGrid[p.x][p.y]?.definition.id;
        return nid === SEA_TERRAIN_ID || nid === HARBOR_ID;
    });

const countPlacedSymbols = (boardGrid: (PlayerSymbolInstance | null)[][]): number => {
    let n = 0;
    for (let bx = 0; bx < BOARD_WIDTH; bx++) {
        for (let by = 0; by < BOARD_HEIGHT; by++) {
            if (boardGrid[bx][by]) n++;
        }
    }
    return n;
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

/** 심볼별 기본 식량 생산량 추정치 (상인 인접 시 저장 골드 산정용). food/gold는 모두 게임 표시 단위(1단위) */
const SYMBOL_BASE_FOOD: Record<number, number> = {
    [S.wheat]: 0,
    [S.rice]: 0,
    [S.cattle]: 1,
    [S.banana]: 3,
    [S.fish]: 1,
    [S.sea]: 1,
    [S.stone]: 1,
    [S.copper]: 0,
    [S.grassland]: 2,
    [S.monument]: 0,
    [S.oasis]: 0,
    [S.oral_tradition]: 0,
    [S.rainforest]: 1,
    [S.plains]: 1,
    [S.mountain]: 1,
    [S.totem]: 0,
    [S.offering]: -1,
    [S.omen]: 2,
    [S.campfire]: 1,
    [S.pottery]: 0,
    [S.tribal_village]: 0,
    [S.merchant]: 0,
    [S.horse]: 1,
    [S.library]: 0,
    [S.forest]: 0,
    [S.deer]: 1,
    [S.date]: 1,
    [S.salt]: 1,
    [S.honey]: 0,
    [S.corn]: 2,
    [S.wild_berries]: 2,
    [S.spices]: 0,
    [S.tax]: 0,
    [S.university]: 0,
    [S.harbor]: 2,
    [S.sheep]: 1,
    [S.wool]: 0,
    [S.wild_boar]: 2,
    [S.sawmill]: 0,
    [S.gold_vein]: 0,
    [S.scholar]: 0,
    [S.holy_relic]: 0,
    [S.telescope]: 0,
    [S.scales]: 0,
    [S.pioneer]: 0,
    [S.edict]: 0,
    [S.embassy]: 0,
    [S.wild_seeds]: 1,
};

/** Era 1 심볼 중 랜덤 하나 반환 — 고대 시대(25) 미연구 시 고대 타입 제외 */
const randomEra1SymbolId = (): number => {
    const ids = [S.wheat, S.rice, S.cattle, S.banana, S.fish, S.sea, S.stone, S.copper, S.grassland, S.monument, S.oasis, S.oral_tradition, S.rainforest, S.plains, S.mountain, S.totem, S.offering, S.omen, S.campfire, S.pottery, S.tribal_village, S.deer, S.date, S.warrior];
    const ancientOk = (useGameStore.getState().unlockedKnowledgeUpgrades || []).includes(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID);
    const pool = ancientOk
        ? ids
        : ids.filter((id) => SYMBOLS[id] && SYMBOLS[id].type !== SymbolType.ANCIENT);
    const pick = pool.length > 0 ? pool : [S.wheat];
    return pick[Math.floor(Math.random() * pick.length)];
};

/** 목장 인접 동물 심볼 태그 */
const ANIMAL_SYMBOL_IDS = new Set([S.cattle, S.fish, S.horse]); // Cattle, Fish, Horse

/** 사막이 무작위 파괴하는 대상: 일반·시대 심볼. 지형·유닛·종교 등 제외 */
const DESERT_DESTRUCTIBLE_TYPES = new Set<SymbolType>([
    SymbolType.NORMAL,
    SymbolType.ANCIENT,
    SymbolType.MEDIEVAL,
    SymbolType.MODERN,
]);

export const processSingleSymbolEffects = (
    symbolInstance: PlayerSymbolInstance,
    boardGrid: (PlayerSymbolInstance | null)[][],
    x: number,
    y: number,
    relicEffects: ActiveRelicEffects = DEFAULT_RELIC_EFFECTS,
    disabledTerrainCoords?: ReadonlySet<string>
): EffectResult => {
    const id = symbolInstance.definition.id;
    let food = 0;
    let knowledge = 0;
    let gold = 0;
    const addSymbolIds: number[] = [];
    const spawnOnBoard: number[] = [];
    let triggerRelicSelection = false;
    let triggerRelicRefresh = false;
    const contributors: { x: number; y: number }[] = [];
    let bonusXpPerTurnDelta = 0;
    let forceTerrainInNextChoices = false;
    let edictRemovalPendingFlag = false;
    let freeSelectionRerollsAcc = 0;

    symbolInstance.effect_counter = (symbolInstance.effect_counter || 0);
    const adj = getAdjacentCoords(x, y);
    const state = useGameStore.getState();
    const upgrades = state.unlockedKnowledgeUpgrades || [];

    // 홍수 등으로 이번 턴 생산이 비활성화된 지형은 효과를 발동하지 않음 (순서 무관)
    if (
        disabledTerrainCoords &&
        symbolInstance.definition.type === SymbolType.TERRAIN &&
        disabledTerrainCoords.has(`${x},${y}`)
    ) {
        return { food: 0, gold: 0, knowledge: 0 };
    }

    switch (id) {
        case S.flood: { // Flood: disable adjacent terrain production; counter reaches 0 -> destroy
            // counter 초기값(미설정/0)은 3으로 시작
            if (!symbolInstance.effect_counter || symbolInstance.effect_counter <= 0) {
                symbolInstance.effect_counter = 3;
            }

            // 매 턴 1 감소
            symbolInstance.effect_counter -= 1;
            if (symbolInstance.effect_counter <= 0) {
                symbolInstance.is_marked_for_destruction = true;
            }
            if (relicEffects.terraFossilDisasterFood) food += 2;
            break;
        }

        case S.earthquake: { // Earthquake: Destroyed; on destroy: destroys 1 random adjacent symbol
            if (relicEffects.terraFossilDisasterFood) food += 2;
            symbolInstance.is_marked_for_destruction = true;
            break;
        }

        case S.drought: { // Drought: occupies space; counter reaches 0 -> destroy
            // counter 초기값(미설정/0)은 3으로 시작
            if (!symbolInstance.effect_counter || symbolInstance.effect_counter <= 0) {
                symbolInstance.effect_counter = 3;
            }

            // 매 턴 1 감소
            symbolInstance.effect_counter -= 1;
            if (symbolInstance.effect_counter <= 0) {
                symbolInstance.is_marked_for_destruction = true;
            }
            if (relicEffects.terraFossilDisasterFood) food += 2;
            break;
        }

        case S.wheat: { // Wheat: every 10 turns +10 Food; per adjacent Grassland: counter +1 (×2 with Irrigation).
            const grassAdj = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.grassland);
            grassAdj.forEach((pos) => contributors.push(pos));
            const grassCount = grassAdj.length;
            symbolInstance.effect_counter = (symbolInstance.effect_counter || 0) + 1;
            const irrigated = upgrades.includes(3);
            symbolInstance.effect_counter += grassCount * (irrigated ? 2 : 1);

            if (symbolInstance.effect_counter >= 10) {
                food += 10;
                symbolInstance.effect_counter -= 10;
            }
            break;
        }

        case S.rice: { // Rice: every 20 turns +25 Food; per adjacent Grassland: counter +1 (×2 with Irrigation).
            const grassAdj = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.grassland);
            grassAdj.forEach((pos) => contributors.push(pos));
            const grassCount = grassAdj.length;
            symbolInstance.effect_counter = (symbolInstance.effect_counter || 0) + 1;
            const irrigated = upgrades.includes(3);
            symbolInstance.effect_counter += grassCount * (irrigated ? 2 : 1);

            if (symbolInstance.effect_counter >= 20) {
                food += 25;
                symbolInstance.effect_counter -= 20;
            }
            break;
        }

        case S.cattle: { // Cattle: +1 Food (등자 +3); 10%로 보유에 소 1; 평원 인접·idle 시 도축(+10 Food)
            food += upgrades.includes(19) ? 3 : 1;
            if (Math.random() < 0.1) {
                addSymbolIds.push(S.cattle);
                contributors.push({ x, y });
            }
            // ID 111: 괴베클리 테페 — 평원 인접 시 5% 잭팟
            if (relicEffects.gobekliAnimalJackpot) {
                const nearPasture = adj.some((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.plains);
                if (nearPasture && Math.random() < 0.05) {
                    food += 15;
                }
            }
            break;
        }

        case S.banana: { // Banana: Every spin: +2 Food. Destroyed after 6 spins. Reset if adjacent to Rainforest
            food += 2;
            let nearRainforest = false;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && t.definition.id === S.rainforest) {
                    nearRainforest = true;
                    contributors.push(pos);
                }
            });
            if (nearRainforest) {
                symbolInstance.effect_counter = 0;
            } else {
                symbolInstance.effect_counter++;
            }
            if (symbolInstance.effect_counter >= 6) {
                symbolInstance.is_marked_for_destruction = true;
            }
            break;
        }

        case S.fish: { // Fish: when adjacent to Sea: +2 Food (no base)
            // ID 115: 막달레니안 뼈 낚싯바늘 - 물고기 골드 +1
            if (relicEffects.fishBoneHookGold) gold += 1;
            if (hasSeaOrHarborAdjacent(boardGrid, x, y)) {
                const seaAdj = adj.find(pos => {
                    const nid = boardGrid[pos.x][pos.y]?.definition.id;
                    return nid === SEA_TERRAIN_ID || nid === HARBOR_ID;
                });
                food += 2;
                if (seaAdj) contributors.push(seaAdj);
            }
            // ID 111: 괴베클리 테페 - 목장 인접 시 5% 잭팟
            if (relicEffects.gobekliAnimalJackpot) {
                const nearPasture = adj.some(pos => boardGrid[pos.x][pos.y]?.definition.id === S.plains);
                if (nearPasture && Math.random() < 0.05) food += 15;
            }
            break;
        }

        case S.sea: { // Sea: +1 Gold per 4 adjacent symbols
            const occupiedAdj = adj.filter(pos => boardGrid[pos.x][pos.y] != null);
            const seaGold = Math.floor(occupiedAdj.length / 4);
            gold += seaGold;
            if (seaGold > 0) {
                occupiedAdj.forEach(pos => contributors.push(pos));
            }
            break;
        }

        case S.stone: { // Stone: +1 Gold; if adjacent to any Mountain: +2 Gold once.
            gold += 1;
            const mountainAdj = adj.find(pos => boardGrid[pos.x][pos.y]?.definition.id === S.mountain);
            if (mountainAdj) {
                gold += 2;
                contributors.push(mountainAdj);
            }
            break;
        }

        case S.copper: { // Copper: +1 Gold; if exactly 3 Copper on board: x3
            const copperCount = countOnBoard(boardGrid, S.copper);
            const multiplier = copperCount === 3 ? 3 : 1;
            gold += 1 * multiplier;
            break;
        }

        case S.grassland: // Grassland: Every spin: +2 Food.
            food += 2;
            break;

        case S.monument: // Monument: Every spin: +5 Knowledge
            knowledge += 5;
            // ID 107: 예리코 점토 두개골 - 기념비 지식 +20 추가
            if (relicEffects.jerichoMonumentBonus) knowledge += 20;
            break;

        case S.oasis: { // Oasis: +1 Food per 2 adjacent empty slots
            const emptyAdjCount = adj.filter(pos => !boardGrid[pos.x][pos.y]).length;
            food += Math.floor(emptyAdjCount / 2);
            break;
        }

        case S.oral_tradition: { // Oral Tradition: Destroyed after 10 spins. On destroy: +10 Knowledge per adjacent symbol.
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
                const multiplier = upgrades.includes(208) ? 20 : 10;
                knowledge += adjCount * multiplier;
            }
            break;
        }

        case S.rainforest: { // Rainforest: Every spin: +1 Food.
            food += 1;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && t.definition.id === S.banana) {
                    // ID 7: 쿠크 늪지대 바나나 화석 - 열대 과수원이 매 턴 인접한 바나나 당 식량 +2 생산
                    if (relicEffects.bananaFossilBonus) {
                        food += 2;
                        contributors.push(pos);
                    }
                }
            });
            break;
        }

        case S.plains: // Plains: Every spin: +1 Food (+1 bonus with Horsemanship)
            food += 1;
            if (relicEffects.horsemansihpPastureBonus) food += 1;
            break;

        case S.mountain: { // Mountain: +1 Food.
            food += 1;
            if (upgrades.includes(FEUDALISM_UPGRADE_ID)) food += 1;
            // ID 5: 이집트 구리 톱 - 인접 빈 슬롯마다 골드 +1
            if (relicEffects.quarryEmptyGold) {
                adj.forEach(pos => {
                    if (!boardGrid[pos.x][pos.y]) { gold += 1; }
                });
            }
            if (upgrades.includes(FEUDALISM_UPGRADE_ID)) {
                adj.forEach(pos => {
                    const t = boardGrid[pos.x][pos.y];
                    if (t && t.definition.type === SymbolType.ENEMY) {
                        const maxHp = t.definition.base_hp ?? 10;
                        t.enemy_hp = (t.enemy_hp ?? maxHp) - 3;
                        if (t.enemy_hp <= 0) t.is_marked_for_destruction = true;
                        contributors.push(pos);
                    }
                });
            }
            break;
        }

        case S.totem: { // Totem: Every spin: +20 Knowledge if placed in a corner.
            const isCorner = (x === 0 && y === 0) ||
                (x === 0 && y === BOARD_HEIGHT - 1) ||
                (x === BOARD_WIDTH - 1 && y === 0) ||
                (x === BOARD_WIDTH - 1 && y === BOARD_HEIGHT - 1);
            if (isCorner) {
                knowledge += 20;
            }
            break;
        }

        case S.offering: // Offering: Every spin: -1 Food, +10 Knowledge
            food -= 1;
            knowledge += 10;
            // ID 107: 예리코 점토 두개골 - 제단 지식 +20 추가
            if (relicEffects.jerichoMonumentBonus) knowledge += 20;
            break;

        case S.omen: { // Omen: 50% chance +3 Food
            if (Math.random() < 0.5) {
                food += 3;
            }
            break;
        }

        case S.stone_tablet: // Stone Tablet: Every spin: +5 Knowledge per relic owned
            knowledge += relicEffects.relicCount * 5;
            break;

        case S.campfire: { // Campfire: +1 Food each turn; after 10 turns destroyed (on-destroy effect handled in gameStore)
            food += 1;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 10) {
                symbolInstance.effect_counter = 10;
                symbolInstance.is_marked_for_destruction = true;
            }
            break;
        }

        case S.wild_seeds: { // Wild Seeds: +1 Food each turn; after 5 turns destroyed
            food += 1;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 5) {
                symbolInstance.effect_counter = 5;
                symbolInstance.is_marked_for_destruction = true;
            }
            break;
        }

        case S.pottery: { // Pottery: stores +3 Food per spin. On destroy: releases stored Food
            symbolInstance.effect_counter += 3;
            break;
        }

        case S.tribal_village: // Tribal Village: After 1 spin: adds 2 random Ancient symbols. Destroys self
            addSymbolIds.push(randomEra1SymbolId(), randomEra1SymbolId());
            symbolInstance.is_marked_for_destruction = true;
            break;

        case S.merchant: { // Merchant: Not in corner -> stores gold equal to highest adj food prod. In corner -> gains stored gold.
            const isCorner = (x === 0 && y === 0) ||
                (x === 0 && y === BOARD_HEIGHT - 1) ||
                (x === BOARD_WIDTH - 1 && y === 0) ||
                (x === BOARD_WIDTH - 1 && y === BOARD_HEIGHT - 1);

            if (!isCorner) {
                // Merchant는 "모든 효과가 끝난 뒤" 인접 심볼의 이번 턴 실제 식량 생산량을 보고 저장해야 합니다.
                // 따라서 여기서는 저장 계산만 보류하고, gameStore의 effectPhase 종료 후 후처리에서 처리합니다.
                symbolInstance.merchant_store_pending = true;
            } else {
                gold += symbolInstance.stored_gold ?? 0;
                symbolInstance.stored_gold = 0;
                symbolInstance.merchant_store_pending = false;
            }
            break;
        }

        case S.crab: { // Crab: +3 Food if adjacent to Sea or Harbor.
            let adjacentSea = false;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && (t.definition.id === SEA_TERRAIN_ID || t.definition.id === HARBOR_ID)) {
                    adjacentSea = true;
                    contributors.push(pos);
                }
            });
            if (adjacentSea) food += 3;
            break;
        }

        case S.library: { // Library: +7 Knowledge (Education → University on board)
            knowledge += 7;
            break;
        }

        case S.pearl: { // Pearl: +3 Gold if adjacent to Sea or Harbor.
            let adjacentSea = false;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && (t.definition.id === SEA_TERRAIN_ID || t.definition.id === HARBOR_ID)) {
                    adjacentSea = true;
                    contributors.push(pos);
                }
            });
            if (adjacentSea) gold += 3;
            break;
        }

        case S.desert: { // Desert: random adjacent Normal or era symbol
            const validTargets = adj.filter(pos => {
                const target = boardGrid[pos.x][pos.y];
                return (
                    target &&
                    !target.is_marked_for_destruction &&
                    DESERT_DESTRUCTIBLE_TYPES.has(target.definition.type)
                );
            });
            if (validTargets.length > 0) {
                const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
                const targetInstance = boardGrid[randomTarget.x][randomTarget.y];
                if (targetInstance) {
                    targetInstance.is_marked_for_destruction = true;
                    if (targetInstance.definition.id === S.date) {
                        food += 2;
                        addSymbolIds.push(S.date);
                    }
                    contributors.push(randomTarget);
                }
            }
            break;
        }

        case S.forest: { // Forest: +1 Food per adjacent Forest (no standalone base)
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === S.forest) {
                    food += 1;
                    contributors.push(pos);
                }
            });
            break;
        }

        case S.deer: { // Deer: +1 Food; if 2 or more adjacent Forests: +2 Food.
            food += 1;
            let forestCount = 0;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === S.forest) {
                    forestCount++;
                    contributors.push(pos);
                }
            });
            if (forestCount >= 2) {
                food += 2;
            }
            break;
        }

        case S.date: { // Date: +1 Food.
            food += 1;
            break;
        }

        case S.salt: { // Salt: +1 Food per adjacent terrain symbol
            let adjacentTerrain = 0;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && t.definition.type === SymbolType.TERRAIN) {
                    adjacentTerrain++;
                    contributors.push(pos);
                }
            });
            food += adjacentTerrain;
            break;
        }

        case S.honey: { // Honey: After 5 turns: destroy; on destroy: +5 Food.
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 5) {
                symbolInstance.is_marked_for_destruction = true;
                food += 5;
            }
            break;
        }

        case S.corn: { // Corn: +2 Food
            food += 2;
            break;
        }

        case S.wild_berries: { // Wild Berries: +1 Food for adjacent Forest, +1 Food for adjacent Rainforest
            if (adj.some(pos => boardGrid[pos.x][pos.y]?.definition.id === S.forest)) {
                food += 1;
            }
            if (adj.some(pos => boardGrid[pos.x][pos.y]?.definition.id === S.rainforest)) {
                food += 1;
            }
            break;
        }

        case S.spices: { // Spices: +1 Food per different terrain type placed
            const terrainTypes = new Set<number>();
            for (let bx = 0; bx < BOARD_WIDTH; bx++) {
                for (let by = 0; by < BOARD_HEIGHT; by++) {
                    const s = boardGrid[bx][by];
                    if (s?.definition.type === SymbolType.TERRAIN) {
                        terrainTypes.add(s.definition.id);
                    }
                }
            }
            food += terrainTypes.size;
            if (upgrades.includes(21) && adj.some(pos => boardGrid[pos.x][pos.y]?.definition.id === S.rainforest)) {
                food += 2;
                gold += 3;
            }
            break;
        }

        case S.university: { // University: +1 Knowledge per symbol on the board
            knowledge += countPlacedSymbols(boardGrid);
            break;
        }

        case S.harbor: { // Harbor: +2 Food; +1 Gold per adjacent symbol
            food += 2;
            let adjSym = 0;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]) {
                    adjSym++;
                    contributors.push(pos);
                }
            });
            gold += adjSym;
            break;
        }

        case S.sheep: { // Sheep: +1 Food; 10% 양·10% 양모 보유 추가; 평원 인접·idle 시 도축(+5 Food,+5 Gold)
            food += 1;
            if (Math.random() < 0.1) {
                addSymbolIds.push(S.sheep);
                contributors.push({ x, y });
            }
            if (Math.random() < 0.1) {
                addSymbolIds.push(S.wool);
            }
            break;
        }

        case S.wool: { // Wool: 파괴; 파괴 시 골드 +5 (이번 턴 효과에 반영)
            symbolInstance.is_marked_for_destruction = true;
            gold += 5;
            break;
        }

        case S.wild_boar: { // Wild Boar: +2 Food; 3+ adjacent Forests: +4 Food
            food += 2;
            let fc = 0;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]?.definition.id === S.forest) {
                    fc++;
                    contributors.push(pos);
                }
            });
            if (fc >= 3) food += 4;
            break;
        }

        case S.sawmill: { // Sawmill: same column — Forest +5 Food each; Mountain +5 Know +5 Gold each
            for (let yc = 0; yc < BOARD_HEIGHT; yc++) {
                const s = boardGrid[x][yc];
                if (!s) continue;
                if (s.definition.id === S.forest) food += 5;
                if (s.definition.id === S.mountain) {
                    knowledge += 5;
                    gold += 5;
                }
            }
            break;
        }

        case S.gold_vein: // Gold Vein
            gold += 5;
            break;

        case S.scholar: { // Scholar: adjacent Ancient → destroy; +10 Knowledge each
            let n = 0;
            for (const p of adj) {
                const t = boardGrid[p.x][p.y];
                if (t && !t.is_marked_for_destruction && t.definition.type === SymbolType.ANCIENT) {
                    t.is_marked_for_destruction = true;
                    n++;
                    contributors.push(p);
                }
            }
            knowledge += n * 10;
            break;
        }

        case S.holy_relic: { // Holy Relic: +5 Knowledge; adjacent doctrine → counter; at 10 → +5 Knowledge/turn
            knowledge += 5;
            const hasDoctrine = adj.some((p) => {
                const n = boardGrid[p.x][p.y];
                return n && RELIGION_DOCTRINE_IDS.has(n.definition.id) && !n.is_marked_for_destruction;
            });
            if (hasDoctrine) {
                symbolInstance.effect_counter = (symbolInstance.effect_counter || 0) + 1;
                if (symbolInstance.effect_counter >= 10) {
                    symbolInstance.effect_counter = 0;
                    bonusXpPerTurnDelta += 5;
                }
            }
            break;
        }

        case S.telescope: { // Telescope: Knowledge = slot index (1–20, top-left first)
            knowledge += y * BOARD_WIDTH + x + 1;
            break;
        }

        case S.scales: // Scales
            knowledge += 8;
            break;

        case S.pioneer: // Pioneer: destroyed; next choices include ≥1 terrain
            symbolInstance.is_marked_for_destruction = true;
            forceTerrainInNextChoices = true;
            break;

        case S.edict: // Edict: destroyed; post-turn remove 1 owned symbol
            symbolInstance.is_marked_for_destruction = true;
            edictRemovalPendingFlag = true;
            break;

        case S.embassy: // Embassy: destroyed; next selection phase first reroll free
            symbolInstance.is_marked_for_destruction = true;
            freeSelectionRerollsAcc += 1;
            break;

        case S.tax: // Tax: 골드/식량 정산은 gameStore finishProcessing에서 이번 턴 effects 기준
            break;

        // ── Religion Doctrine Symbols ──

        case S.christianity: // Christianity: 이번 스핀 인접 심볼 산출량 기반 계산은 gameStore에서 수행(옵션 A)
            break;

        case S.islam: // Islam: 이번 스핀 인접 심볼 산출량 기반 계산은 gameStore에서 수행(옵션 A)
            break;

        case S.buddhism: { // Buddhism: +2 Food per empty slot on the board
            let emptySlots = 0;
            for (let bx = 0; bx < BOARD_WIDTH; bx++) {
                for (let by = 0; by < BOARD_HEIGHT; by++) {
                    if (!boardGrid[bx][by]) emptySlots++;
                }
            }
            food += emptySlots * 2;
            break;
        }

        case S.hinduism: // Hinduism: per destroyed symbol this turn — bonus in gameStore finishProcessing
            break;

        // ── Enemy / Combat Symbols ──

        case S.warrior: // Warrior
            if (symbolInstance.definition.type === SymbolType.ENEMY) {
                if (Math.random() < 0.5) food -= 3; else gold -= 1;
            }
            break;

        case S.archer: // Archer
            if (symbolInstance.definition.type === SymbolType.ENEMY) {
                if (Math.random() < 0.5) food -= 2; else gold -= 2;
            }
            break;

        case S.relic_caravan: // Relic Caravan: After 1 spin: refreshes relic shop and destroys self
            symbolInstance.is_marked_for_destruction = true;
            triggerRelicRefresh = true;
            break;

        case S.stargazer: { // Stargazer: +1 Knowledge per 2 empty slots on the board
            let emptySlots = 0;
            for (let bx = 0; bx < BOARD_WIDTH; bx++) {
                for (let by = 0; by < BOARD_HEIGHT; by++) {
                    if (!boardGrid[bx][by]) emptySlots++;
                }
            }
            knowledge += Math.floor(emptySlots / 2);
            break;
        }

        case S.horse: { // Horse: +1 Food, +1 Gold; if adjacent to any Plains: +2 Food once.
            food += 1;
            gold += 1;
            const plainsAdj = adj.find(pos => boardGrid[pos.x][pos.y]?.definition.id === S.plains);
            if (plainsAdj) {
                food += 2;
                contributors.push(plainsAdj);
            }
            break;
        }

        case S.barbarian_camp: { // Barbarian Camp: every N turns: adds 1 random current era Enemy combat unit.
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= BARBARIAN_CAMP_SPAWN_INTERVAL) {
                const enemies = [S.enemy_warrior];
                const enemyId = enemies[Math.floor(Math.random() * enemies.length)];
                addSymbolIds.push(enemyId);
                symbolInstance.effect_counter -= BARBARIAN_CAMP_SPAWN_INTERVAL;
            }
            break;
        }

        case S.loot: { // Loot: Destroyed; on destroy: various chances
            symbolInstance.is_marked_for_destruction = true;
            // 식량 1~10, 골드 1~10, 지식 1~30
            food += Math.floor(Math.random() * 10) + 1;
            gold += Math.floor(Math.random() * 10) + 1;
            knowledge += Math.floor(Math.random() * 30) + 1;

            // 1% 확률로 빛나는 호박석
            if (Math.random() < 0.01) {
                addSymbolIds.push(S.glowing_amber);
            }
            break;
        }

        case S.glowing_amber: { // Glowing Amber: Destroyed; on destroy: adds random current era relic.
            symbolInstance.is_marked_for_destruction = true;
            triggerRelicSelection = true;
            break;
        }

        case S.enemy_warrior: { // Enemy Warrior: -5 Food
            food -= 5;
            break;
        }
    }

    // ── ID 103: 가나안의 번제물 - 빈 슬롯마다 식량 -10 ──
    if (relicEffects.burnOfferingEmptyPenalty && id !== 0) {
        // 이건 보드 전체 빈 슬롯 처리라 gameStore에서 한 번만 처리
        // 심볼별로는 여기서 적용하지 않음 (gameStore에서 처리)
    }

    // ── 교리 패널티: 다른 교리 심볼에 인접 시 -50 Food ──
    if (RELIGION_DOCTRINE_IDS.has(id)) {
        const hasAdjacentDoctrine = adj.some(pos => {
            const t = boardGrid[pos.x][pos.y];
            return t && RELIGION_DOCTRINE_IDS.has(t.definition.id);
        });
        if (hasAdjacentDoctrine && !relicEffects.gilgameshReligionNoPenalty) {
            food -= 50;
        }
    }
    // Adjacency and double bonuses moved to individual symbol cases.

    // Candidate 203: Masonry (Monument Knowledge x2) -> No, 203 is Spearcraft mapping now.
    // Wait, the previous logic had 203 Masonry. Let's completely replace the Candidate effects logic!

    // Candidate 207: Jewelry (Stone produces -0.5 Food but +1.5 Gold)
    if (upgrades.includes(207) && id === S.stone) {
        food -= 0.5;
        gold += 1.5;
    }

    const result: EffectResult = { food, knowledge, gold };
    if (addSymbolIds.length > 0) result.addSymbolIds = addSymbolIds;
    if (spawnOnBoard.length > 0) result.spawnOnBoard = spawnOnBoard;
    if (triggerRelicSelection) result.triggerRelicSelection = true;
    if (triggerRelicRefresh) result.triggerRelicRefresh = true;
    if (contributors.length > 0) result.contributors = contributors;
    if (bonusXpPerTurnDelta > 0) result.bonusXpPerTurnDelta = bonusXpPerTurnDelta;
    if (forceTerrainInNextChoices) result.forceTerrainInNextChoices = true;
    if (edictRemovalPendingFlag) result.edictRemovalPending = true;
    if (freeSelectionRerollsAcc > 0) result.freeSelectionRerolls = freeSelectionRerollsAcc;
    return result;
};
