import { S } from '../../../data/symbolDefinitions';
import type { SymbolEffectHandler } from '../core';

export const handleDisasterEffects: SymbolEffectHandler = ({ symbolInstance }) => {
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
            return true;

        case S.heatwave:
            if (!symbolInstance.effect_counter || symbolInstance.effect_counter <= 0) {
                symbolInstance.effect_counter = Math.floor(Math.random() * 4) + 4;
            }
            symbolInstance.effect_counter -= 1;
            if (symbolInstance.effect_counter <= 0) {
                symbolInstance.is_marked_for_destruction = true;
            }
            return true;

        case S.plague:
            if (symbolInstance.effect_counter === undefined || symbolInstance.effect_counter === null || symbolInstance.effect_counter <= 0) {
                symbolInstance.effect_counter = Math.floor(Math.random() * 3) + 2;
            }
            symbolInstance.effect_counter -= 1;
            if (symbolInstance.effect_counter <= 0) {
                symbolInstance.is_marked_for_destruction = true;
            }
            return true;

        case S.earthquake:
            symbolInstance.is_marked_for_destruction = true;
            return true;

        default:
            return false;
    }
};
