import type { SymbolDefinition } from './symbolDefinitions';
import { S } from './symbolIdRegistry';

export const RANGED_UNIT_IDS = new Set<number>([
    S.archer,
    S.enemy_archer,
    S.enemy_crossbowman,
    S.enemy_cannon,
]);
export const MELEE_UNIT_IDS = new Set<number>([S.militia, S.warrior, S.horseman, S.mercenary]);

export function resolveUpgradedUnitDefinition(
    definition: SymbolDefinition,
    unlockedUpgrades: readonly number[] = [],
): SymbolDefinition {
    void unlockedUpgrades;
    return definition;
}

export function isBoardWideRangedUnit(definition: SymbolDefinition): boolean {
    return RANGED_UNIT_IDS.has(definition.id);
}
