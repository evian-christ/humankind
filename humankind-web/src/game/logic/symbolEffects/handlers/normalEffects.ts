import { S, SymbolType } from '../../../data/symbolDefinitions';
import {
    AGRICULTURE_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    CHIEFDOM_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    MINING_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    STIRRUP_UPGRADE_ID,
} from '../../../data/knowledgeUpgrades';
import {
    BOARD_HEIGHT,
    BOARD_WIDTH,
    countOnBoard,
    countPlacedSymbols,
    findMountainSameColumn,
    HARBOR_ID,
    hasSeaOrHarborAdjacent,
    isCorner,
    SEA_TERRAIN_ID,
} from '../core';
import type { SymbolEffectHandler } from '../core';

export const handleNormalEffects: SymbolEffectHandler = ({ symbolInstance, boardGrid, x, y, adj, upgrades, relicEffects, state }) => {
    switch (symbolInstance.definition.id) {
        case S.wheat: {
            const grassAdj = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.grassland);
            const grassCount = grassAdj.length;
            if (grassCount > 0) grassAdj.forEach((pos) => state.contributors.push(pos));
            symbolInstance.effect_counter = (symbolInstance.effect_counter || 0) + 1;
            const irrigated = upgrades.includes(IRRIGATION_UPGRADE_ID);
            if (irrigated) symbolInstance.effect_counter += grassCount;
            else if (grassCount > 0) symbolInstance.effect_counter += 1;
            if (symbolInstance.effect_counter >= 10) {
                state.food += upgrades.includes(AGRICULTURE_UPGRADE_ID) ? 15 : 10;
                symbolInstance.effect_counter -= 10;
            }
            return true;
        }

        case S.rice: {
            const grassAdj = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.grassland);
            const grassCount = grassAdj.length;
            if (grassCount > 0) grassAdj.forEach((pos) => state.contributors.push(pos));
            symbolInstance.effect_counter = (symbolInstance.effect_counter || 0) + 1;
            const irrigated = upgrades.includes(IRRIGATION_UPGRADE_ID);
            if (irrigated) symbolInstance.effect_counter += grassCount;
            else if (grassCount > 0) symbolInstance.effect_counter += 1;
            if (symbolInstance.effect_counter >= 20) {
                state.food += upgrades.includes(AGRICULTURE_UPGRADE_ID) ? 30 : 25;
                symbolInstance.effect_counter -= 20;
            }
            return true;
        }

        case S.cattle:
            state.food += upgrades.includes(STIRRUP_UPGRADE_ID) ? 3 : 1;
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
                if (p >= 10) {
                    p = 0;
                    symbolInstance.banana_permanent_food_bonus = perm + 1;
                }
                symbolInstance.effect_counter = p;
            }
            return true;
        }

        case S.fish:
            if (hasSeaOrHarborAdjacent(boardGrid, x, y)) {
                const seaAdj = adj.find(pos => {
                    const nid = boardGrid[pos.x][pos.y]?.definition.id;
                    return nid === SEA_TERRAIN_ID || nid === HARBOR_ID;
                });
                state.food += upgrades.includes(SEAFARING_UPGRADE_ID) ? 3 : 2;
                if (seaAdj) state.contributors.push(seaAdj);
            }
            return true;

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
            let adjacentSea = false;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t && (t.definition.id === SEA_TERRAIN_ID || t.definition.id === HARBOR_ID)) {
                    adjacentSea = true;
                    state.contributors.push(pos);
                }
            });
            if (adjacentSea) {
                state.food += upgrades.includes(SEAFARING_UPGRADE_ID) ? 2 : 1;
                state.gold += 2;
            }
            return true;
        }

        case S.library:
            state.knowledge += 7;
            return true;

        case S.pearl: {
            let adjacentSeaOrHarbor = false;
            let adjacentSeaTerrain = false;
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (!t) return;
                const nid = t.definition.id;
                if (nid === SEA_TERRAIN_ID || nid === HARBOR_ID) {
                    adjacentSeaOrHarbor = true;
                    state.contributors.push(pos);
                }
                if (nid === SEA_TERRAIN_ID) adjacentSeaTerrain = true;
            });
            if (adjacentSeaOrHarbor) {
                state.gold += upgrades.includes(CELESTIAL_NAVIGATION_UPGRADE_ID) && adjacentSeaTerrain ? 5 : 3;
            }
            return true;
        }

        case S.deer:
            if (countOnBoard(boardGrid, S.forest) >= 2) state.food += 2;
            return true;

        case S.date:
            state.food += 1;
            return true;

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

        case S.honey:
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 6) {
                symbolInstance.is_marked_for_destruction = true;
                state.food += 10;
            }
            return true;

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
            if (upgrades.includes(21) && adj.some(pos => boardGrid[pos.x][pos.y]?.definition.id === S.rainforest)) {
                state.food += 2;
                state.gold += 3;
            }
            return true;
        }

        case S.university:
            state.knowledge += countPlacedSymbols(boardGrid);
            return true;

        case S.harbor: {
            state.food += 2;
            let adjSym = 0;
            adj.forEach(pos => {
                if (boardGrid[pos.x][pos.y]) {
                    adjSym++;
                    state.contributors.push(pos);
                }
            });
            state.gold += adjSym;
            return true;
        }

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
                state.gold += 5;
            }
            return true;

        case S.wild_boar:
            if (countOnBoard(boardGrid, S.forest) >= 4) state.food += 4;
            return true;

        case S.fur: {
            const n = Math.floor(countOnBoard(boardGrid, S.forest) / 2);
            if (n > 0) {
                state.gold += n;
                state.knowledge += n;
            }
            return true;
        }

        case S.sawmill:
            for (let yc = 0; yc < BOARD_HEIGHT; yc++) {
                const s = boardGrid[x][yc];
                if (!s) continue;
                if (s.definition.id === S.forest) state.food += 5;
                if (s.definition.id === S.mountain) {
                    state.knowledge += 5;
                    state.gold += 5;
                }
            }
            return true;

        case S.gold_vein:
            state.gold += 5;
            return true;

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
