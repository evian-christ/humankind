import { S } from '../../../data/symbolDefinitions';
import type { SymbolEffectHandler } from '../core';

export const handleDisasterEffects: SymbolEffectHandler = ({ symbolInstance, relicEffects, state }) => {
    switch (symbolInstance.definition.id) {
        case S.flood:
        case S.drought:
            if (!symbolInstance.effect_counter || symbolInstance.effect_counter <= 0) {
                symbolInstance.effect_counter = 3;
            }
            symbolInstance.effect_counter -= 1;
            if (symbolInstance.effect_counter <= 0) {
                symbolInstance.is_marked_for_destruction = true;
            }
            if (relicEffects.terraFossilDisasterFood) state.food += 2;
            return true;

        case S.earthquake:
            if (relicEffects.terraFossilDisasterFood) state.food += 2;
            symbolInstance.is_marked_for_destruction = true;
            return true;

        default:
            return false;
    }
};
