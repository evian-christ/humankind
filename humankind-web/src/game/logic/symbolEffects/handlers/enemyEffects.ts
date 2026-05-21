import { S, SymbolType } from '../../../data/symbolDefinitions';
import type { SymbolEffectHandler } from '../core';

export const handleEnemyEffects: SymbolEffectHandler = ({ symbolInstance, state }) => {
    switch (symbolInstance.definition.id) {
        case S.enemy_warrior:
        case S.enemy_archer:
            if (symbolInstance.definition.type === SymbolType.ENEMY) {
                state.food -= 3;
            }
            return true;

        case S.enemy_cavalry:
        case S.enemy_crossbowman:
            if (symbolInstance.definition.type === SymbolType.ENEMY) {
                state.food -= 5;
            }
            return true;

        case S.enemy_infantry:
        case S.enemy_cannon:
            if (symbolInstance.definition.type === SymbolType.ENEMY) {
                state.food -= 8;
            }
            return true;

        default:
            return false;
    }
};
