import { SYMBOLS, type SymbolDefinition } from './symbolDefinitions';
import {
    BALLISTICS_UPGRADE_ID,
    GUNPOWDER_UPGRADE_ID,
    INTERCHANGEABLE_PARTS_UPGRADE_ID,
    MECHANICS_UPGRADE_ID,
} from './knowledgeUpgrades';
import { S } from './symbolIdRegistry';

export const RANGED_UNIT_IDS = new Set<number>([
    S.archer,
    S.crossbowman,
    S.cannon,
    S.enemy_archer,
    S.enemy_crossbowman,
    S.enemy_cannon,
]);
export const MELEE_UNIT_IDS = new Set<number>([S.warrior, S.cavalry, S.infantry]);

export function resolveUpgradedUnitDefinition(
    definition: SymbolDefinition,
    unlockedUpgrades: readonly number[] = [],
): SymbolDefinition {
    const have = new Set((unlockedUpgrades ?? []).map(Number));

    switch (definition.id) {
        case S.warrior:
            return have.has(INTERCHANGEABLE_PARTS_UPGRADE_ID)
                ? SYMBOLS[S.infantry]!
                : have.has(GUNPOWDER_UPGRADE_ID)
                  ? SYMBOLS[S.cavalry]!
                  : definition;
        case S.cavalry:
            return have.has(INTERCHANGEABLE_PARTS_UPGRADE_ID) ? SYMBOLS[S.infantry]! : definition;
        case S.archer:
            return have.has(BALLISTICS_UPGRADE_ID)
                ? SYMBOLS[S.cannon]!
                : have.has(MECHANICS_UPGRADE_ID)
                  ? SYMBOLS[S.crossbowman]!
                  : definition;
        case S.crossbowman:
            return have.has(BALLISTICS_UPGRADE_ID) ? SYMBOLS[S.cannon]! : definition;
        default:
            return definition;
    }
}

export function isBoardWideRangedUnit(definition: SymbolDefinition): boolean {
    return RANGED_UNIT_IDS.has(definition.id);
}

