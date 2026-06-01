import { S, SymbolType } from '../../../data/symbolDefinitions';
import { countEmptySlots, isCorner } from '../core';
import type { SymbolEffectHandler } from '../core';

export const handleAncientEffects: SymbolEffectHandler = ({ symbolInstance, boardGrid, x, y, adj, state, relicEffects }) => {
    switch (symbolInstance.definition.id) {
        case S.oral_tradition:
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 10) {
                symbolInstance.is_marked_for_destruction = true;
            }
            return true;

        case S.totem:
            if (relicEffects.allSymbolsAreCorner || isCorner(x, y)) state.knowledge += 12;
            return true;

        case S.omen:
            if (Math.random() < 0.5) state.food += 3;
            return true;

        case S.campfire:
            symbolInstance.is_marked_for_destruction = true;
            return true;

        case S.pottery:
            symbolInstance.effect_counter += 4;
            return true;

        case S.tribal_village:
            // 부족 마을은 플레이어가 클릭하여 발동(소모)하므로 턴 계산 시 자동 파괴하지 않습니다.
            return true;

        case S.stargazer:
            state.knowledge += Math.floor(countEmptySlots(boardGrid) / 4) * 4;
            return true;

        case S.bronze_tribute_chest:
            state.gold += 1;
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 3) {
                symbolInstance.effect_counter = 3;
                symbolInstance.is_marked_for_destruction = true;
            }
            return true;

        case S.heqet: {
            state.food += 1;
            const adjacentGrasslands = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.grassland);
            if (adjacentGrasslands.length > 0) {
                state.food += 2;
                state.contributors.push(...adjacentGrasslands);
            }
            const adjacentWheats = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.id === S.wheat);
            if (adjacentWheats.length > 0) {
                state.knowledge += 2;
                state.contributors.push(...adjacentWheats);
            }
            return true;
        }

        case S.foxtail_millet: {
            const adjacentTerrains = adj.filter((pos) => boardGrid[pos.x][pos.y]?.definition.type === SymbolType.TERRAIN);
            const food = Math.floor(adjacentTerrains.length / 2) * 5;
            if (food > 0) {
                state.food += food;
                state.contributors.push(...adjacentTerrains);
            }
            return true;
        }

        default:
            return false;
    }
};
