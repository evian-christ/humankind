import { BARBARIAN_CAMP_SPAWN_INTERVAL, S, SymbolType } from '../../../data/symbolDefinitions';
import type { SymbolEffectHandler } from '../core';

export const handleEnemyEffects: SymbolEffectHandler = ({ symbolInstance, state }) => {
    switch (symbolInstance.definition.id) {
        case S.warrior:
            if (symbolInstance.definition.type === SymbolType.ENEMY) {
                if (Math.random() < 0.5) state.food -= 3;
                else state.gold -= 1;
            }
            return true;

        case S.archer:
            if (symbolInstance.definition.type === SymbolType.ENEMY) {
                if (Math.random() < 0.5) state.food -= 2;
                else state.gold -= 2;
            }
            return true;

        case S.barbarian_camp:
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= BARBARIAN_CAMP_SPAWN_INTERVAL) {
                const enemies = [S.enemy_warrior];
                const enemyId = enemies[Math.floor(Math.random() * enemies.length)];
                state.addSymbolIds.push(enemyId);
                symbolInstance.effect_counter -= BARBARIAN_CAMP_SPAWN_INTERVAL;
            }
            return true;

        case S.enemy_warrior:
            state.food -= 5;
            return true;

        default:
            return false;
    }
};
