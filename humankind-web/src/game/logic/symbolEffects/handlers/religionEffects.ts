import { THEOCRACY_UPGRADE_ID } from '../../../data/knowledgeUpgrades';
import { RELIGION_DOCTRINE_IDS, S } from '../../../data/symbolDefinitions';
import type { SymbolEffectHandler } from '../core';
import { countEmptySlots } from '../core';

export const handleReligionEffects: SymbolEffectHandler = ({ symbolInstance, boardGrid, state, upgrades }) => {
    switch (symbolInstance.definition.id) {
        case S.buddhism: {
            const religionCount = boardGrid.reduce(
                (count, col) =>
                    count +
                    col.filter((sym) => sym && !sym.is_marked_for_destruction && RELIGION_DOCTRINE_IDS.has(sym.definition.id)).length,
                0,
            );
            if (religionCount >= 2) return true;

            state.food += countEmptySlots(boardGrid) * (upgrades.includes(THEOCRACY_UPGRADE_ID) ? 4 : 2);
            return true;
        }
        case S.christianity:
        case S.islam:
        case S.hinduism:
            return true;

        default:
            return false;
    }
};
