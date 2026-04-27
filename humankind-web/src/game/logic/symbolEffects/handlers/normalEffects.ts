import { S, SymbolType } from '../../../data/symbolDefinitions';
import {
    AGRICULTURE_UPGRADE_ID,
    AGRICULTURAL_SURPLUS_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    FISHERY_GUILD_UPGRADE_ID,
    CHIEFDOM_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    MINING_UPGRADE_ID,
    MODERN_AGRICULTURE_UPGRADE_ID,
    MARITIME_TRADE_UPGRADE_ID,
    NOMADIC_TRADITION_UPGRADE_ID,
    OCEANIC_ROUTES_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    PLANTATION_UPGRADE_ID,
    PRESERVATION_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    SHIPBUILDING_UPGRADE_ID,
    TANNING_UPGRADE_ID,
    TRACKING_UPGRADE_ID,
    TROPICAL_DEVELOPMENT_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
} from '../../../data/knowledgeUpgrades';
import {
    BOARD_HEIGHT,
    BOARD_WIDTH,
    countOnBoard,
    countPlacedSymbols,
    findMountainSameColumn,
    isCorner,
    SEA_TERRAIN_ID,
} from '../core';
import type { SymbolEffectHandler } from '../core';
import type { BoardGrid } from '../types';

const getBoardCoordsBySymbolId = (boardGrid: BoardGrid, targetId: number): { x: number; y: number }[] => {
    const coords: { x: number; y: number }[] = [];
    for (let bx = 0; bx < BOARD_WIDTH; bx++) {
        for (let by = 0; by < BOARD_HEIGHT; by++) {
            if (boardGrid[bx][by]?.definition.id === targetId) coords.push({ x: bx, y: by });
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
            const grassAdj = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.grassland);
            const grassCount = grassAdj.length;
            if (grassCount > 0) grassAdj.forEach((pos) => state.contributors.push(pos));
            symbolInstance.effect_counter = (symbolInstance.effect_counter || 0) + 1;
            if (upgrades.includes(MODERN_AGRICULTURE_UPGRADE_ID)) {
                symbolInstance.effect_counter += countOnBoard(boardGrid, S.grassland);
            } else if (upgrades.includes(AGRICULTURAL_SURPLUS_UPGRADE_ID)) {
                symbolInstance.effect_counter += grassCount * 2;
            } else if (upgrades.includes(IRRIGATION_UPGRADE_ID)) {
                symbolInstance.effect_counter += grassCount;
            } else if (grassCount > 0) {
                symbolInstance.effect_counter += 1;
            }
            if (symbolInstance.effect_counter >= 10) {
                const baseFood = upgrades.includes(AGRICULTURE_UPGRADE_ID) ? 15 : 10;
                state.food += upgrades.includes(THREE_FIELD_SYSTEM_UPGRADE_ID)
                    ? baseFood + countOnBoard(boardGrid, S.grassland)
                    : baseFood;
                symbolInstance.effect_counter -= 10;
            }
            return true;
        }

        case S.rice: {
            const grassAdj = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.grassland);
            const grassCount = grassAdj.length;
            if (grassCount > 0) grassAdj.forEach((pos) => state.contributors.push(pos));
            symbolInstance.effect_counter = (symbolInstance.effect_counter || 0) + 1;
            if (upgrades.includes(MODERN_AGRICULTURE_UPGRADE_ID)) {
                symbolInstance.effect_counter += countOnBoard(boardGrid, S.grassland);
            } else if (upgrades.includes(AGRICULTURAL_SURPLUS_UPGRADE_ID)) {
                symbolInstance.effect_counter += grassCount * 2;
            } else if (upgrades.includes(IRRIGATION_UPGRADE_ID)) {
                symbolInstance.effect_counter += grassCount;
            } else if (grassCount > 0) {
                symbolInstance.effect_counter += 1;
            }
            if (symbolInstance.effect_counter >= 20) {
                const baseFood = upgrades.includes(AGRICULTURE_UPGRADE_ID) ? 30 : 25;
                state.food += upgrades.includes(THREE_FIELD_SYSTEM_UPGRADE_ID)
                    ? baseFood + countOnBoard(boardGrid, S.grassland)
                    : baseFood;
                symbolInstance.effect_counter -= 20;
            }
            return true;
        }

        case S.cattle:
            state.food += 1;
            if (upgrades.includes(PASTORALISM_UPGRADE_ID) && Math.random() < 0.1) {
                state.addSymbolIds.push(S.cattle);
                state.contributors.push({ x, y });
            }
            return true;

        case S.banana: {
            const perm = symbolInstance.banana_permanent_food_bonus ?? 0;
            state.food += 1 + perm;
            let nearRainforest = false;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t?.definition.id === S.rainforest) {
                    nearRainforest = true;
                    state.contributors.push(pos);
                }
            });
            if (nearRainforest) {
                let p = (symbolInstance.effect_counter || 0) + 1;
                const threshold = upgrades.includes(PLANTATION_UPGRADE_ID) ? 7 : 10;
                if (p >= threshold) {
                    p = 0;
                    symbolInstance.banana_permanent_food_bonus = perm + 1;
                }
                symbolInstance.effect_counter = p;
            }
            return true;
        }

        case S.fish: {
            const seaCoords = getBoardCoordsBySymbolId(boardGrid, SEA_TERRAIN_ID);
            const effectiveSeaCount = getEffectiveSeaCount(boardGrid, upgrades);
            if (effectiveSeaCount >= 1) {
                let food = 1;
                if (upgrades.includes(OCEANIC_ROUTES_UPGRADE_ID)) {
                    if (effectiveSeaCount >= 3) food = 15;
                    else if (effectiveSeaCount >= 2) food = 8;
                    else food = 5;
                } else if (upgrades.includes(FISHERY_GUILD_UPGRADE_ID)) {
                    if (effectiveSeaCount >= 3) food = 10;
                    else if (effectiveSeaCount >= 2) food = 5;
                    else food = 3;
                } else {
                    if (effectiveSeaCount >= 3) food = 4;
                    else if (effectiveSeaCount >= 2) food = 2;
                    if (upgrades.includes(SEAFARING_UPGRADE_ID)) food += 1;
                }
                state.food += food;
                state.contributors.push(...seaCoords);
            }
            return true;
        }

        case S.stone:
            state.gold += 1;
            {
                const mountainCol = findMountainSameColumn(boardGrid, x);
                if (mountainCol) {
                    state.gold += upgrades.includes(MINING_UPGRADE_ID) ? 5 : 2;
                    state.contributors.push(mountainCol);
                }
            }
            return true;

        case S.copper:
            state.gold += countOnBoard(boardGrid, S.copper) === 3 ? 3 : 1;
            return true;

        case S.monument:
            state.knowledge += 5;
            return true;

        case S.stone_tablet:
            state.knowledge += relicEffects.relicCount * 5;
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
            if (!isCorner(x, y)) {
                symbolInstance.merchant_store_pending = true;
            } else {
                state.gold += symbolInstance.stored_gold ?? 0;
                symbolInstance.stored_gold = 0;
                symbolInstance.merchant_store_pending = false;
            }
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
                        gold = 8;
                    } else {
                        food = 5;
                        gold = 5;
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
            state.knowledge += 7;
            return true;

        case S.pearl: {
            const seaCoords = getBoardCoordsBySymbolId(boardGrid, SEA_TERRAIN_ID);
            const effectiveSeaCount = getEffectiveSeaCount(boardGrid, upgrades);
            if (effectiveSeaCount >= 1) {
                let gold = 2;
                if (upgrades.includes(OCEANIC_ROUTES_UPGRADE_ID)) {
                    if (effectiveSeaCount >= 3) gold = 30;
                    else if (effectiveSeaCount >= 2) gold = 20;
                    else gold = 10;
                } else if (upgrades.includes(MARITIME_TRADE_UPGRADE_ID)) {
                    if (effectiveSeaCount >= 3) gold = 10;
                    else if (effectiveSeaCount >= 2) gold = 7;
                    else gold = 5;
                } else {
                    if (effectiveSeaCount >= 3) gold = 5;
                    else if (effectiveSeaCount >= 2) gold = 3;
                    if (upgrades.includes(CELESTIAL_NAVIGATION_UPGRADE_ID)) gold += 2;
                }
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
            const forestAdj = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.forest);
            if (forestAdj.length > 0) {
                const multiplier = upgrades.includes(PRESERVATION_UPGRADE_ID)
                    ? 3
                    : upgrades.includes(TANNING_UPGRADE_ID)
                        ? 2
                        : 1;
                state.food += forestAdj.length * multiplier;
                forestAdj.forEach((pos) => state.contributors.push(pos));
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
                state.food += Math.floor(Math.random() * 10) + 1;
                state.gold += Math.floor(Math.random() * 10) + 1;
                state.knowledge += Math.floor(Math.random() * 10) + 1;
            } else {
                const amount = Math.floor(Math.random() * 10) + 1;
                const resourceIdx = Math.floor(Math.random() * 3);
                if (resourceIdx === 0) state.food += amount;
                else if (resourceIdx === 1) state.gold += amount;
                else state.knowledge += amount;
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
            for (let bx = 0; bx < BOARD_WIDTH; bx++) {
                for (let by = 0; by < BOARD_HEIGHT; by++) {
                    const s = boardGrid[bx][by];
                    if (s?.definition.type !== SymbolType.TERRAIN) continue;
                    terrainCounts.set(s.definition.id, (terrainCounts.get(s.definition.id) ?? 0) + 1);
                }
            }
            if ([...terrainCounts.values()].some((count) => count >= 5)) {
                state.food += 5;
            }
            return true;
        }

        case S.corn:
            state.food += 2;
            return true;

        case S.wild_berries: {
            const hasForestOrRain = adj.some((pos) => {
                const id = boardGrid[pos.x][pos.y]?.definition.id;
                return id === S.forest || id === S.rainforest;
            });
            if (upgrades.includes(CHIEFDOM_UPGRADE_ID)) {
                state.food += hasForestOrRain ? 4 : 1;
            } else {
                state.food += hasForestOrRain ? 2 : 1;
            }
            const mountainAdj = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.mountain);
            if (mountainAdj.length > 0) {
                state.knowledge += upgrades.includes(CHIEFDOM_UPGRADE_ID) ? 5 : 2;
                mountainAdj.forEach((p) => state.contributors.push(p));
            }
            return true;
        }

        case S.spices: {
            const terrainTypes = new Set<number>();
            for (let bx = 0; bx < BOARD_WIDTH; bx++) {
                for (let by = 0; by < BOARD_HEIGHT; by++) {
                    const s = boardGrid[bx][by];
                    if (s?.definition.type === SymbolType.TERRAIN) terrainTypes.add(s.definition.id);
                }
            }
            state.food += terrainTypes.size;
            return true;
        }

        case S.university:
            state.knowledge += countPlacedSymbols(boardGrid);
            return true;

        case S.sheep:
            state.food += 1;
            if (upgrades.includes(PASTORALISM_UPGRADE_ID) && Math.random() < 0.1) {
                state.addSymbolIds.push(S.sheep);
                state.contributors.push({ x, y });
            }
            if (Math.random() < 0.1) state.addSymbolIds.push(S.wool);
            return true;

        case S.wool:
            symbolInstance.effect_counter += 1;
            if (symbolInstance.effect_counter >= 3) {
                symbolInstance.is_marked_for_destruction = true;
                state.gold += upgrades.includes(NOMADIC_TRADITION_UPGRADE_ID) ? 10 : 5;
            }
            return true;

        case S.mushroom: {
            const forestAdj = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.forest);
            if (upgrades.includes(PRESERVATION_UPGRADE_ID)) {
                state.food += 9;
                state.knowledge += 9;
            } else if (upgrades.includes(TRACKING_UPGRADE_ID)) {
                state.food += 4;
                state.knowledge += 4;
            } else {
                state.food += 2;
                state.knowledge += 2;
            }
            if (forestAdj.length === 0) {
                symbolInstance.is_marked_for_destruction = true;
            } else {
                forestAdj.forEach((pos) => state.contributors.push(pos));
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

        case S.horse: {
            state.food += 1;
            state.gold += 1;
            const plainsAdj = adj.find(pos => boardGrid[pos.x][pos.y]?.definition.id === S.plains);
            if (plainsAdj) {
                state.food += 2;
                state.contributors.push(plainsAdj);
            }
            return true;
        }

        case S.loot:
            symbolInstance.is_marked_for_destruction = true;
            state.food += Math.floor(Math.random() * 10) + 1;
            state.gold += Math.floor(Math.random() * 10) + 1;
            state.knowledge += Math.floor(Math.random() * 30) + 1;
            if (Math.random() < 0.01) state.addSymbolIds.push(S.glowing_amber);
            return true;

        case S.glowing_amber:
            symbolInstance.is_marked_for_destruction = true;
            state.triggerRelicSelection = true;
            return true;

        default:
            return false;
    }
};
