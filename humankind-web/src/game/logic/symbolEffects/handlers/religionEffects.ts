import { S } from '../../../data/symbolDefinitions';
import type { SymbolEffectHandler } from '../core';

export const handleReligionEffects: SymbolEffectHandler = ({ symbolInstance }) => {
    switch (symbolInstance.definition.id) {
        case S.christianity:
        case S.islam:
        case S.buddhism:
        case S.hinduism:
            return true;

        default:
            return false;
    }
};
