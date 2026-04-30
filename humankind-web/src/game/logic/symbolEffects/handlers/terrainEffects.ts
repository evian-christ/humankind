import { S, SymbolType } from '../../../data/symbolDefinitions';
import {
    countOnBoard,
    DESERT_DESTRUCTIBLE_TYPES,
} from '../core';
import type { SymbolEffectHandler } from '../core';
import {
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    DESERT_STORAGE_UPGRADE_ID,
    FORESTRY_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    MARITIME_TRADE_UPGRADE_ID,
    MINING_UPGRADE_ID,
    OASIS_RECOVERY_UPGRADE_ID,
    OCEANIC_ROUTES_UPGRADE_ID,
    PLANTATION_UPGRADE_ID,
    TRACKING_UPGRADE_ID,
    TROPICAL_DEVELOPMENT_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
} from '../../../data/knowledgeUpgrades';

export const handleTerrainEffects: SymbolEffectHandler = ({ symbolInstance, boardGrid, adj, upgrades, relicEffects, state }) => {
    switch (symbolInstance.definition.id) {
        case S.sea: {
            const occupiedAdj = adj.filter(pos => boardGrid[pos.x][pos.y] != null);
            const divisor = upgrades.includes(OCEANIC_ROUTES_UPGRADE_ID)
                ? 1
                : upgrades.includes(CELESTIAL_NAVIGATION_UPGRADE_ID) || upgrades.includes(MARITIME_TRADE_UPGRADE_ID)
                    ? 2
                    : 3;
            const multiplier = upgrades.includes(OCEANIC_ROUTES_UPGRADE_ID) || upgrades.includes(MARITIME_TRADE_UPGRADE_ID)
                ? 2
                : 1;
            const seaGold = Math.floor(occupiedAdj.length / divisor) * multiplier;
            state.gold += seaGold;
            if (seaGold > 0) occupiedAdj.forEach(pos => state.contributors.push(pos));
            return true;
        }

        case S.grassland:
            state.food += upgrades.includes(THREE_FIELD_SYSTEM_UPGRADE_ID)
                ? 5
                : upgrades.includes(IRRIGATION_UPGRADE_ID) ? 2 : 1;
            return true;

        case S.oasis: {
            const emptyAdjCount = adj.filter(pos => !boardGrid[pos.x][pos.y]).length;
            state.food += upgrades.includes(OASIS_RECOVERY_UPGRADE_ID)
                ? emptyAdjCount * 3
                : upgrades.includes(DESERT_STORAGE_UPGRADE_ID)
                ? emptyAdjCount
                : Math.floor(emptyAdjCount / 2);
            return true;
        }

        case S.rainforest:
            if (upgrades.includes(TROPICAL_DEVELOPMENT_UPGRADE_ID)) {
                state.food += 5;
                state.gold += 5;
                state.knowledge += 5;
            } else if (upgrades.includes(PLANTATION_UPGRADE_ID)) {
                state.food += 3;
                state.gold += 3;
            } else {
                state.food += upgrades.includes(MINING_UPGRADE_ID) ? 3 : 1;
            }
            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t?.definition.id === S.banana && relicEffects.bananaFossilBonus) {
                    state.food += 2;
                    state.contributors.push(pos);
                }
            });
            return true;

        case S.plains:
            state.food += 1;
            if (relicEffects.horsemansihpPastureBonus) state.food += 1;
            state.food += symbolInstance.effect_counter || 0;
            return true;

        case S.mountain:
            state.food += 1;
            if (relicEffects.quarryEmptyGold) {
                adj.forEach(pos => {
                    if (!boardGrid[pos.x][pos.y]) state.gold += 1;
                });
            }
            return true;

        case S.desert: {
            const allValidTargets = [];
            for (let bx = 0; bx < boardGrid.length; bx++) {
                for (let by = 0; by < (boardGrid[bx]?.length ?? 0); by++) {
                    const target = boardGrid[bx][by];
                    if (
                        target &&
                        !target.is_marked_for_destruction &&
                        DESERT_DESTRUCTIBLE_TYPES.has(target.definition.type)
                    ) {
                        allValidTargets.push({ x: bx, y: by });
                    }
                }
            }
            const adjacentValidTargets = adj.filter(pos => {
                const target = boardGrid[pos.x][pos.y];
                return (
                    target &&
                    !target.is_marked_for_destruction &&
                    DESERT_DESTRUCTIBLE_TYPES.has(target.definition.type)
                );
            });

            if (upgrades.includes(OASIS_RECOVERY_UPGRADE_ID)) {
                state.food += 10;
                state.gold += 10;
                allValidTargets.forEach((pos) => {
                    const target = boardGrid[pos.x][pos.y];
                    if (target) {
                        target.is_marked_for_destruction = true;
                        state.contributors.push(pos);
                    }
                });
                return true;
            }

            if (upgrades.includes(DESERT_STORAGE_UPGRADE_ID)) {
                state.gold += 5;
                adjacentValidTargets.forEach((pos) => {
                    const target = boardGrid[pos.x][pos.y];
                    if (target) {
                        target.is_marked_for_destruction = true;
                        state.contributors.push(pos);
                    }
                });
                return true;
            }

            if (upgrades.includes(FOREIGN_TRADE_UPGRADE_ID)) state.gold += 2;
            if (adjacentValidTargets.length > 0) {
                const randomTarget = adjacentValidTargets[Math.floor(Math.random() * adjacentValidTargets.length)];
                const targetInstance = boardGrid[randomTarget.x][randomTarget.y];
                if (targetInstance) {
                    targetInstance.is_marked_for_destruction = true;
                    state.contributors.push(randomTarget);
                }
            }
            return true;
        }

        case S.forest:
            {
                const forestCount = countOnBoard(boardGrid, S.forest);
                const forestry = upgrades.includes(FORESTRY_UPGRADE_ID);
                const tracking = upgrades.includes(TRACKING_UPGRADE_ID);
                let food = 0;
                let gold = 0;
                let knowledge = 0;

                if (forestCount >= 3) food += forestry ? 5 : tracking ? 3 : 2;
                if (forestCount >= 5) gold += forestry ? 5 : tracking ? 3 : 2;
                if (forestry && forestCount >= 7) knowledge += 3;

                const terrainTypes = new Set<number>();
                for (let bx = 0; bx < boardGrid.length; bx++) {
                    for (let by = 0; by < (boardGrid[bx]?.length ?? 0); by++) {
                        const cell = boardGrid[bx][by];
                        if (cell?.definition.type === SymbolType.TERRAIN) terrainTypes.add(cell.definition.id);
                    }
                }

                if (terrainTypes.size === 1 && terrainTypes.has(S.forest)) {
                    if (forestry) {
                        food *= 2;
                        gold *= 2;
                        knowledge *= 2;
                    } else {
                        food += tracking ? 3 : 2;
                    }
                }

                state.food += food;
                state.gold += gold;
                state.knowledge += knowledge;
            }
            return true;

        default:
            return false;
    }
};
