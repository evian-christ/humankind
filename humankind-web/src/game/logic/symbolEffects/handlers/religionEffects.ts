import { RELIGION_DOCTRINE_IDS, S } from '../../../data/symbolDefinitions';
import { countEmptySlots } from '../core';
import type { SymbolEffectHandler, SymbolEffectHandlerContext } from '../core';

export const handleReligionEffects: SymbolEffectHandler = ({ symbolInstance, boardGrid, state }) => {
    switch (symbolInstance.definition.id) {
        case S.christianity:
        case S.islam:
        case S.hinduism:
            return true;

        case S.buddhism:
            state.food += countEmptySlots(boardGrid) * 2;
            return true;

        default:
            return false;
    }
};

export const applyReligionDoctrinePenalty = ({ symbolInstance, boardGrid, adj, state }: SymbolEffectHandlerContext): void => {
    if (!RELIGION_DOCTRINE_IDS.has(symbolInstance.definition.id)) return;
    const hasAdjacentDoctrine = adj.some(pos => {
        const t = boardGrid[pos.x][pos.y];
        return t && RELIGION_DOCTRINE_IDS.has(t.definition.id);
    });
    if (hasAdjacentDoctrine) state.food -= 50;
};
