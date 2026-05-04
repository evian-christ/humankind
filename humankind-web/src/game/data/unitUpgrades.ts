import { SYMBOLS, type SymbolDefinition } from './symbolDefinitions';
import {
    BALLISTICS_UPGRADE_ID,
    GUNPOWDER_UPGRADE_ID,
    INTERCHANGEABLE_PARTS_UPGRADE_ID,
    IRON_WORKING_UPGRADE_ID,
    MECHANICS_UPGRADE_ID,
} from './knowledgeUpgrades';
import { S } from './symbolIdRegistry';

export const RANGED_UNIT_IDS = new Set<number>([S.archer, S.tracker_archer, S.crossbowman, S.cannon]);
export const MELEE_UNIT_IDS = new Set<number>([S.warrior, S.knight, S.cavalry, S.cavalry_corps, S.musketman, S.infantry]);

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
                  ? SYMBOLS[S.musketman]!
                  : have.has(IRON_WORKING_UPGRADE_ID)
                    ? SYMBOLS[S.knight]!
                    : definition;
        case S.knight:
            return have.has(INTERCHANGEABLE_PARTS_UPGRADE_ID)
                ? SYMBOLS[S.infantry]!
                : have.has(GUNPOWDER_UPGRADE_ID)
                  ? SYMBOLS[S.musketman]!
                  : definition;
        case S.musketman:
            return have.has(INTERCHANGEABLE_PARTS_UPGRADE_ID) ? SYMBOLS[S.infantry]! : definition;
        case S.archer:
        case S.tracker_archer:
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

export function isMeleeUnit(definition: SymbolDefinition): boolean {
    return MELEE_UNIT_IDS.has(definition.id);
}

export function isRangedUnit(definition: SymbolDefinition): boolean {
    return RANGED_UNIT_IDS.has(definition.id);
}
