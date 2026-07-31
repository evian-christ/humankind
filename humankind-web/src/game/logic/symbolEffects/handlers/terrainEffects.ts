import { S } from '../../../data/symbolDefinitions';
import {
    isDesertDestructibleSymbol,
} from '../core';
import type { SymbolEffectHandler } from '../core';
import { CONSUMABLE_RELIC_IDS } from '../../relics/relicClassification';
import {
    DESERT_STORAGE_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    OASIS_RECOVERY_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
} from '../../../data/knowledgeUpgrades';

export const handleTerrainEffects: SymbolEffectHandler = ({ symbolInstance, boardGrid, adj, upgrades, relicEffects, state }) => {
    switch (symbolInstance.definition.id) {
        // 바다는 자체 산출이 없는 참조용 지형입니다.
        // 가장자리에 놓이면 해안, 안쪽에 놓이면 해양으로 취급되며
        // 판정은 core.ts의 isCoastAt / isOceanAt이 담당합니다.
        case S.sea:
            return true;

        case S.grassland:
            state.food += upgrades.includes(THREE_FIELD_SYSTEM_UPGRADE_ID)
                ? 5
                : upgrades.includes(IRRIGATION_UPGRADE_ID) ? 3 : 2;
            return true;

        case S.oasis: {
            const emptyAdjCount = adj.filter(pos => !boardGrid[pos.x][pos.y]).length;
            const pairs = Math.floor(emptyAdjCount / 2);
            const foodMultiplier = upgrades.includes(OASIS_RECOVERY_UPGRADE_ID)
                ? 6
                : upgrades.includes(DESERT_STORAGE_UPGRADE_ID)
                ? 4
                : 2;
            state.food += pairs * foodMultiplier;
            return true;
        }

        case S.rainforest: {
            // 기본 식량 +1에 성장으로 누적된 영구 보너스를 더한다.
            const growth = symbolInstance.rainforest_growth_bonus;
            state.food += 1 + (growth?.food ?? 0);
            state.gold += growth?.gold ?? 0;
            state.knowledge += growth?.knowledge ?? 0;

            adj.forEach(pos => {
                const t = boardGrid[pos.x][pos.y];
                if (t?.definition.id === S.banana && relicEffects.bananaFossilBonus) {
                    state.food += 2;
                    state.contributors.push(pos);
                }
            });
            return true;
        }

        case S.plains:
            state.food += 1;
            if (upgrades.includes(PASTORALISM_UPGRADE_ID)) state.food += 1;
            state.food += symbolInstance.effect_counter || 0;
            return true;

        case S.mountain:
            if (upgrades.includes(MODERN_AGE_UPGRADE_ID)) {
                state.food += 10;
                state.knowledge += 10;
            } else if (upgrades.includes(FEUDALISM_UPGRADE_ID)) {
                state.food += 5;
                state.knowledge += 5;
            } else {
                state.food += 2;
                state.knowledge += 2;
            }
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
                        isDesertDestructibleSymbol(target)
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
                    isDesertDestructibleSymbol(target)
                );
            });

            const destroyTargets = (targets: { x: number; y: number }[]): number => {
                let destroyedCount = 0;
                targets.forEach((pos) => {
                    const target = boardGrid[pos.x][pos.y];
                    if (!target || target.is_marked_for_destruction) return;
                    target.is_marked_for_destruction = true;
                    state.contributors.push(pos);
                    destroyedCount++;
                });
                return destroyedCount;
            };

            if (upgrades.includes(OASIS_RECOVERY_UPGRADE_ID)) {
                state.gold += 5;
                state.food += destroyTargets(allValidTargets) * 30;
                return true;
            }

            if (upgrades.includes(DESERT_STORAGE_UPGRADE_ID)) {
                state.gold += 2;
                state.food += destroyTargets(adjacentValidTargets) * 20;
                return true;
            }

            const destructionFood = upgrades.includes(FOREIGN_TRADE_UPGRADE_ID) ? 10 : 5;
            if (upgrades.includes(FOREIGN_TRADE_UPGRADE_ID)) state.gold += 1;
            if (adjacentValidTargets.length > 0) {
                const randomTarget = adjacentValidTargets[Math.floor(Math.random() * adjacentValidTargets.length)];
                state.food += destroyTargets([randomTarget]) * destructionFood;
            }
            return true;
        }

        case S.forest:
            {
                // 다른 숲에 인접 시 식량 +1 (인접한 숲 개수와 무관한 정액).
                const forestAdj = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.forest);
                if (forestAdj.length > 0) {
                    state.food += 1;
                    forestAdj.forEach((pos) => state.contributors.push(pos));
                }

                // 10턴마다 무작위 인장 1개를 생산한다.
                symbolInstance.effect_counter = (symbolInstance.effect_counter || 0) + 1;
                if (symbolInstance.effect_counter >= 10) {
                    symbolInstance.effect_counter -= 10;
                    const sealIndex = Math.floor(Math.random() * CONSUMABLE_RELIC_IDS.length);
                    state.grantRelicIds.push(CONSUMABLE_RELIC_IDS[sealIndex]);
                }
            }
            return true;

        default:
            return false;
    }
};
