import { S } from '../../../data/symbolDefinitions';
import { countEmptySlots, isCorner } from '../core';
import type { SymbolEffectHandler } from '../core';

export const handleAncientEffects: SymbolEffectHandler = ({ symbolInstance, boardGrid, x, y, adj, state }) => {
    switch (symbolInstance.definition.id) {
        case S.oral_tradition:
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 10) {
                symbolInstance.is_marked_for_destruction = true;
                let adjCount = 0;
                adj.forEach(pos => {
                    if (boardGrid[pos.x][pos.y]) {
                        adjCount++;
                        state.contributors.push(pos);
                    }
                });
                state.knowledge += adjCount * 10;
            }
            return true;

        case S.totem:
            if (isCorner(x, y)) state.knowledge += 20;
            return true;

        case S.omen:
            if (Math.random() < 0.5) state.food += 3;
            return true;

        case S.campfire:
            symbolInstance.is_marked_for_destruction = true;
            return true;

        case S.pottery:
            symbolInstance.effect_counter += 3;
            return true;

        case S.tribal_village:
            symbolInstance.is_marked_for_destruction = true;
            return true;

        case S.stargazer:
            state.knowledge += Math.floor(countEmptySlots(boardGrid) / 2);
            return true;

        default:
            return false;
    }
};
