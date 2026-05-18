import { S, SymbolType } from '../../../data/symbolDefinitions';
import type { SymbolEffectHandler } from '../core';

export const handleEnemyEffects: SymbolEffectHandler = ({ symbolInstance, state }) => {
    switch (symbolInstance.definition.id) {
        case S.enemy_warrior:
        case S.enemy_cavalry:
        case S.enemy_knight:
        case S.enemy_archer:
        case S.enemy_tracker_archer:
            if (symbolInstance.definition.type === SymbolType.ENEMY) {
                state.food -= 3;
            }
            return true;

        case S.enemy_cavalry_corps:
        case S.enemy_musketman:
        case S.enemy_crossbowman:
            if (symbolInstance.definition.type === SymbolType.ENEMY) {
                state.food -= 6;
            }
            return true;

        case S.enemy_infantry:
        case S.enemy_cannon:
            if (symbolInstance.definition.type === SymbolType.ENEMY) {
                state.food -= 12;
            }
            return true;

        default:
            return false;
    }
};
