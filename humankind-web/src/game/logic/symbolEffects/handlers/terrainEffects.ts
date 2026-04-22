import { S, SymbolType } from '../../../data/symbolDefinitions';
import {
    countOnBoard,
    DESERT_DESTRUCTIBLE_TYPES,
} from '../core';
import type { SymbolEffectHandler } from '../core';
import {
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    MINING_UPGRADE_ID,
} from '../../../data/knowledgeUpgrades';

export const handleTerrainEffects: SymbolEffectHandler = ({ symbolInstance, boardGrid, adj, upgrades, relicEffects, state }) => {
    switch (symbolInstance.definition.id) {
        case S.sea: {
            const occupiedAdj = adj.filter(pos => boardGrid[pos.x][pos.y] != null);
            const divisor = upgrades.includes(CELESTIAL_NAVIGATION_UPGRADE_ID) ? 2 : 3;
            const seaGold = Math.floor(occupiedAdj.length / divisor);
            state.gold += seaGold;
            if (seaGold > 0) occupiedAdj.forEach(pos => state.contributors.push(pos));
            return true;
        }

        case S.grassland:
            state.food += upgrades.includes(IRRIGATION_UPGRADE_ID) ? 2 : 1;
            return true;

        case S.oasis: {
            const emptyAdjCount = adj.filter(pos => !boardGrid[pos.x][pos.y]).length;
            state.food += Math.floor(emptyAdjCount / 2);
            return true;
        }

        case S.rainforest:
            state.food += upgrades.includes(MINING_UPGRADE_ID) ? 3 : 1;
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
            return true;

        case S.mountain:
            state.food += 1;
            if (upgrades.includes(FEUDALISM_UPGRADE_ID)) state.food += 1;
            if (relicEffects.quarryEmptyGold) {
                adj.forEach(pos => {
                    if (!boardGrid[pos.x][pos.y]) state.gold += 1;
                });
            }
            if (upgrades.includes(FEUDALISM_UPGRADE_ID)) {
                adj.forEach(pos => {
                    const t = boardGrid[pos.x][pos.y];
                    if (t && t.definition.type === SymbolType.ENEMY) {
                        const maxHp = t.definition.base_hp ?? 10;
                        t.enemy_hp = (t.enemy_hp ?? maxHp) - 3;
                        if (t.enemy_hp <= 0) t.is_marked_for_destruction = true;
                        state.contributors.push(pos);
                    }
                });
            }
            return true;

        case S.desert: {
            if (upgrades.includes(FOREIGN_TRADE_UPGRADE_ID)) state.gold += 2;
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
                    state.contributors.push(randomTarget);
                }
            }
            return true;
        }

        case S.forest:
            if (countOnBoard(boardGrid, S.forest) >= 4) state.food += 2;
            return true;

        default:
            return false;
    }
};
