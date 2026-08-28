import { S, SymbolType } from '../../../data/symbolDefinitions';
import {
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    EDUCATION_UPGRADE_ID,
    FISHERY_GUILD_UPGRADE_ID,
    MILITARY_SCIENCE_UPGRADE_ID,
    MARITIME_TRADE_UPGRADE_ID,
    OCEANIC_ROUTES_UPGRADE_ID,
    SCIENTIFIC_THEORY_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    SHIPBUILDING_UPGRADE_ID,
    TANNING_UPGRADE_ID,
    TROPICAL_DEVELOPMENT_UPGRADE_ID,
} from '../../../data/knowledgeUpgrades';
import {
    addRainforestGrowth,
    CASSAVA_GROWTH_AMOUNT,
    CASSAVA_GROWTH_KIND,
    countOnBoard,
    getSameColumnCoordsBySymbolId,
    getSameRowCoordsBySymbolId,
    isCoastAt,
    SEA_TERRAIN_ID,
} from '../core';
import type { SymbolEffectHandler } from '../core';
import type { BoardGrid } from '../types';

const getBoardCoordsBySymbolId = (boardGrid: BoardGrid, targetId: number): { x: number; y: number }[] => {
    const coords: { x: number; y: number }[] = [];
    for (let bx = 0; bx < boardGrid.length; bx++) {
        for (let by = 0; by < (boardGrid[bx]?.length ?? 0); by++) {
            if (boardGrid[bx]?.[by]?.definition.id === targetId) coords.push({ x: bx, y: by });
        }
    }
    return coords;
};

const getEffectiveSeaCount = (boardGrid: BoardGrid, upgrades: number[]): number => {
    const seaCount = getBoardCoordsBySymbolId(boardGrid, SEA_TERRAIN_ID).length;
    return seaCount * (upgrades.includes(SHIPBUILDING_UPGRADE_ID) ? 2 : 1);
};

export const handleNormalEffects: SymbolEffectHandler = ({ symbolInstance, boardGrid, x, y, adj, upgrades, relicEffects, state }) => {
    switch (symbolInstance.definition.id) {
        case S.wheat: {
            const grassAdj = getSameRowCoordsBySymbolId(boardGrid, x, y, S.grassland);
            const grassCount = grassAdj.length;
            if (grassCount > 0) grassAdj.forEach((pos) => state.contributors.push(pos));
            symbolInstance.effect_counter = (symbolInstance.effect_counter || 0) + 1;
            if (grassCount > 0) {
                symbolInstance.effect_counter += 1;
            }
            if (symbolInstance.effect_counter >= 10) {
                state.food += 10;
                symbolInstance.effect_counter -= 10;
            }
            return true;
        }

        case S.corn: {
            const grassAdj = getSameRowCoordsBySymbolId(boardGrid, x, y, S.grassland);
            const grassCount = grassAdj.length;
            if (grassCount > 0) grassAdj.forEach((pos) => state.contributors.push(pos));
            symbolInstance.effect_counter = (symbolInstance.effect_counter || 0) + 1;
            if (grassCount > 0) {
                symbolInstance.effect_counter += 1;
            }
            if (symbolInstance.effect_counter >= 20) {
                state.food += 25;
                symbolInstance.effect_counter -= 20;
            }
            return true;
        }

        case S.rice: {
            const grassAdj = getSameRowCoordsBySymbolId(boardGrid, x, y, S.grassland);
            if (grassAdj.length > 0) grassAdj.forEach((pos) => state.contributors.push(pos));
            symbolInstance.effect_counter = (symbolInstance.effect_counter || 0) + 1;
            if (grassAdj.length > 0) {
                symbolInstance.effect_counter += 1;
            }
            if (symbolInstance.effect_counter >= 40) {
                state.food += 60;
                symbolInstance.effect_counter -= 40;
            }
            return true;
        }

        case S.cattle: {
            state.food += 1;
            const plainsCol = getSameColumnCoordsBySymbolId(boardGrid, x, y, S.plains);
            if (plainsCol.length > 0) {
                state.food += 1;
                state.contributors.push(...plainsCol);
            }
            return true;
        }

        case S.banana: {
            // 기본 식량 +1; 열대우림에 인접 시 식량 +1.
            state.food += 1;
            const rainforestAdj = adj.filter(
                (pos) => boardGrid[pos.x][pos.y]?.definition.id === S.rainforest,
            );
            if (rainforestAdj.length > 0) {
                state.food += 1;
                rainforestAdj.forEach((pos) => state.contributors.push(pos));
            }
            return true;
        }

        case S.cassava: {
            // 인접한 열대우림 1개에 성장치 +2를 준 뒤 스스로 파괴된다.
            const rainforestAdj = adj.filter(
                (pos) => boardGrid[pos.x][pos.y]?.definition.id === S.rainforest,
            );
            if (rainforestAdj.length > 0) {
                const target = rainforestAdj[Math.floor(Math.random() * rainforestAdj.length)];
                const rainforest = boardGrid[target.x][target.y];
                if (rainforest) {
                    addRainforestGrowth(rainforest, CASSAVA_GROWTH_AMOUNT, CASSAVA_GROWTH_KIND);
                    state.contributors.push(target);
                    symbolInstance.is_marked_for_destruction = true;
                }
            }
            return true;
        }

        case S.fish: {
            // 인접한 해안(가장자리에 놓인 바다) 1개당 식량 +2.
            const coastAdj = adj.filter((pos) => isCoastAt(boardGrid, pos.x, pos.y));
            if (coastAdj.length > 0) {
                state.food += coastAdj.length * 2;
                state.contributors.push(...coastAdj);
            }
            return true;
        }

        case S.monument:
            state.knowledge += 5;
            return true;

        case S.stone_tablet:
            state.knowledge += relicEffects.relicCount * 2;
            return true;

        case S.wild_seeds:
            state.food += 1;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 5) {
                symbolInstance.effect_counter = 5;
                symbolInstance.is_marked_for_destruction = true;
            }
            return true;

        case S.merchant:
            symbolInstance.merchant_store_pending = true;
            symbolInstance.stored_gold = 0;
            return true;

        case S.crab: {
            const seaCoords = getBoardCoordsBySymbolId(boardGrid, SEA_TERRAIN_ID);
            const effectiveSeaCount = getEffectiveSeaCount(boardGrid, upgrades);
            if (effectiveSeaCount >= 1) {
                let food = 1;
                let gold = 1;
                if (upgrades.includes(OCEANIC_ROUTES_UPGRADE_ID)) {
                    if (effectiveSeaCount >= 2) {
                        food = 8;
                        gold = 5;
                    } else {
                        food = 5;
                        gold = 3;
                    }
                } else if (upgrades.includes(FISHERY_GUILD_UPGRADE_ID)) {
                    if (effectiveSeaCount >= 2) {
                        food = 5;
                        gold = 5;
                    } else {
                        food = 3;
                        gold = 3;
                    }
                } else {
                    if (effectiveSeaCount >= 2) {
                        food = 2;
                        gold = 2;
                    }
                    if (upgrades.includes(SEAFARING_UPGRADE_ID)) food += 1;
                }
                state.food += food;
                state.gold += gold;
                state.contributors.push(...seaCoords);
            }
            return true;
        }

        case S.library:
            {
                if (upgrades.includes(SCIENTIFIC_THEORY_UPGRADE_ID)) {
                    const occupiedBoard = boardGrid.flatMap((column, bx) =>
                        column.flatMap((symbol, by) => (symbol != null ? [{ x: bx, y: by }] : [])),
                    );
                    state.knowledge += occupiedBoard.length * 2;
                    state.contributors.push(...occupiedBoard);
                } else {
                    const occupiedAdj = adj.filter((pos) => boardGrid[pos.x][pos.y] != null);
                    const multiplier = upgrades.includes(EDUCATION_UPGRADE_ID) ? 2 : 1;
                    state.knowledge += occupiedAdj.length * multiplier;
                    occupiedAdj.forEach((pos) => state.contributors.push(pos));
                }
            }
            return true;

        case S.pearl: {
            const seaCoords = getBoardCoordsBySymbolId(boardGrid, SEA_TERRAIN_ID);
            const effectiveSeaCount = getEffectiveSeaCount(boardGrid, upgrades);
            if (effectiveSeaCount >= 1) {
                let rewards = [1, 1, 1];
                if (upgrades.includes(OCEANIC_ROUTES_UPGRADE_ID)) {
                    rewards = [3, 3, 4];
                } else if (upgrades.includes(MARITIME_TRADE_UPGRADE_ID)) {
                    rewards = [2, 2, 3];
                } else if (upgrades.includes(CELESTIAL_NAVIGATION_UPGRADE_ID)) {
                    rewards = [1, 2, 2];
                }
                const gold = rewards
                    .slice(0, Math.min(effectiveSeaCount, rewards.length))
                    .reduce((total, reward) => total + reward, 0);
                state.gold += gold;
                state.contributors.push(...seaCoords);
            }
            return true;
        }

        case S.compass: {
            const seaCoords = getBoardCoordsBySymbolId(boardGrid, SEA_TERRAIN_ID);
            const effectiveSeaCount = getEffectiveSeaCount(boardGrid, upgrades);
            if (effectiveSeaCount >= 1) {
                let knowledge = 5;
                if (effectiveSeaCount >= 3) knowledge = 15;
                else if (effectiveSeaCount >= 2) knowledge = 10;
                state.knowledge += knowledge;
                state.contributors.push(...seaCoords);
            }
            return true;
        }

        case S.deer: {
            // 숲에 인접 시 식량 +2 (인접한 숲 개수와 무관한 정액).
            const forestAdj = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.forest);
            if (forestAdj.length > 0) {
                state.food += 2;
                forestAdj.forEach((pos) => state.contributors.push(pos));
            }
            return true;
        }

        case S.loot: {
            const adjacentLoot = adj.find(
                (pos) =>
                    boardGrid[pos.x][pos.y]?.definition.id === S.loot &&
                    !boardGrid[pos.x][pos.y]?.is_marked_for_destruction,
            );
            if (adjacentLoot) {
                state.contributors.push(adjacentLoot);
                state.lootMerge = {
                    absorbed: adjacentLoot,
                    receiver: { x, y },
                    nextDefinitionId: S.greater_loot,
                };
            }
            return true;
        }

        case S.greater_loot: {
            const adjacentGreaterLoot = adj.find(
                (pos) =>
                    boardGrid[pos.x][pos.y]?.definition.id === S.greater_loot &&
                    !boardGrid[pos.x][pos.y]?.is_marked_for_destruction,
            );
            if (adjacentGreaterLoot) {
                state.contributors.push(adjacentGreaterLoot);
                state.lootMerge = {
                    absorbed: adjacentGreaterLoot,
                    receiver: { x, y },
                    nextDefinitionId: S.radiant_loot,
                };
            }
            return true;
        }

        case S.date:
            state.food += 1;
            return true;

        case S.dye:
            state.gold += 1;
            return true;

        case S.papyrus:
            state.knowledge += 1;
            return true;

        case S.expedition: {
            const rainforestAdj = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.rainforest);
            if (rainforestAdj.length === 0) return true;
            if (upgrades.includes(TROPICAL_DEVELOPMENT_UPGRADE_ID)) {
                state.gold += 15;
                state.knowledge += 15;
            } else {
                if (Math.random() < 0.5) state.gold += 10;
                else state.knowledge += 10;
            }
            rainforestAdj.forEach((pos) => state.contributors.push(pos));
            return true;
        }

        case S.salt: {
            let adjacentTerrain = 0;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t?.definition.type === SymbolType.TERRAIN) {
                    adjacentTerrain++;
                    state.contributors.push(pos);
                }
            });
            state.food += adjacentTerrain;
            return true;
        }

        case S.honey: {
            const terrainCounts = new Map<number, number>();
            for (let bx = 0; bx < boardGrid.length; bx++) {
                for (let by = 0; by < (boardGrid[bx]?.length ?? 0); by++) {
                    const s = boardGrid[bx]?.[by];
                    if (s?.definition.type !== SymbolType.TERRAIN) continue;
                    terrainCounts.set(s.definition.id, (terrainCounts.get(s.definition.id) ?? 0) + 1);
                }
            }
            if ([...terrainCounts.values()].some((count) => count >= 5)) {
                state.food += 5;
            }
            return true;
        }

        case S.spices: {
            const terrainTypes = new Set<number>();
            for (let bx = 0; bx < boardGrid.length; bx++) {
                for (let by = 0; by < (boardGrid[bx]?.length ?? 0); by++) {
                    const s = boardGrid[bx]?.[by];
                    if (s?.definition.type === SymbolType.TERRAIN) terrainTypes.add(s.definition.id);
                }
            }
            state.food += terrainTypes.size;
            return true;
        }

        case S.sheep: {
            state.food += 1;
            const plainsCol = getSameColumnCoordsBySymbolId(boardGrid, x, y, S.plains);
            if (plainsCol.length > 0) {
                state.gold += 1;
                state.contributors.push(...plainsCol);
            }
            return true;
        }

        case S.fur: {
            const forestCount = countOnBoard(boardGrid, S.forest);
            state.gold += upgrades.includes(TANNING_UPGRADE_ID)
                ? forestCount
                : Math.floor(forestCount / 2) * 2;
            return true;
        }

        case S.relic_caravan:
            symbolInstance.is_marked_for_destruction = true;
            state.triggerRelicRefresh = true;
            return true;

        case S.militia:
            state.military += 3;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 5) {
                symbolInstance.effect_counter = 5;
                symbolInstance.is_marked_for_destruction = true;
            }
            return true;

        case S.warrior:
            state.military += 2;
            return true;

        case S.archer: {
            const terrainAdj = adj.filter((pos) => {
                const id = boardGrid[pos.x][pos.y]?.definition.id;
                return id === S.forest || id === S.mountain;
            });
            state.military += terrainAdj.length > 0 ? 3 : 1;
            terrainAdj.forEach((pos) => state.contributors.push(pos));
            return true;
        }

        case S.horseman: {
            const enemyCoords = boardGrid.flatMap((column, bx) =>
                column.flatMap((symbol, by) =>
                    symbol?.definition.type === SymbolType.ENEMY ? [{ x: bx, y: by }] : [],
                ),
            );
            state.military += enemyCoords.length > 0 ? 5 : 1;
            state.contributors.push(...enemyCoords);
            return true;
        }

        case S.mercenary:
            state.military += 4;
            state.gold -= 2;
            return true;

        case S.horse: {
            const hasMilitaryScience = upgrades.includes(MILITARY_SCIENCE_UPGRADE_ID);
            state.food += hasMilitaryScience ? 3 : 2;
            state.gold += hasMilitaryScience ? 4 : 2;
            return true;
        }

        default:
            return false;
    }
};
