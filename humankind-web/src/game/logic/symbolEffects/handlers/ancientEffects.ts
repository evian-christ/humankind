import { S } from '../../../data/symbolDefinitions';
import { countEmptySlots, isCorner } from '../core';
import type { SymbolEffectHandler } from '../core';

export const handleAncientEffects: SymbolEffectHandler = ({ symbolInstance, boardGrid, x, y, state }) => {
    switch (symbolInstance.definition.id) {
        case S.oral_tradition:
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 10) {
                symbolInstance.is_marked_for_destruction = true;
            }
            return true;

        case S.totem:
            if (isCorner(x, y, boardGrid.length, boardGrid[x]?.length ?? boardGrid[0]?.length ?? 0)) state.knowledge += 12;
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

        default:
            return false;
    }
};
