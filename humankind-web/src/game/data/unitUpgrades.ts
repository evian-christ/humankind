import { SYMBOLS, type SymbolDefinition } from './symbolDefinitions';
import {
    ARCHERY_UPGRADE_ID,
    BALLISTICS_UPGRADE_ID,
    GUNPOWDER_UPGRADE_ID,
    INTERCHANGEABLE_PARTS_UPGRADE_ID,
    IRON_WORKING_UPGRADE_ID,
    MECHANICS_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    MILITARY_SCIENCE_UPGRADE_ID,
    MINING_UPGRADE_ID,
    MASON_GUILD_UPGRADE_ID,
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

const withSharedMeleeStats = (definition: SymbolDefinition, upgrades: ReadonlySet<number>): SymbolDefinition => ({
    ...definition,
    base_attack: (SYMBOLS[S.warrior]?.base_attack ?? 0)
        + (upgrades.has(IRON_WORKING_UPGRADE_ID) ? 2 : 0)
        + (upgrades.has(GUNPOWDER_UPGRADE_ID) ? 2 : 0)
        + (upgrades.has(INTERCHANGEABLE_PARTS_UPGRADE_ID) ? 2 : 0)
        + (upgrades.has(MINING_UPGRADE_ID) ? 1 : 0)
        + (upgrades.has(MASON_GUILD_UPGRADE_ID) ? 1 : 0)
        + (upgrades.has(HORSEMANSHIP_UPGRADE_ID) ? 1 : 0)
        + (upgrades.has(MILITARY_SCIENCE_UPGRADE_ID) ? 1 : 0),
    base_hp: (SYMBOLS[S.warrior]?.base_hp ?? 0)
        + (upgrades.has(IRON_WORKING_UPGRADE_ID) ? 4 : 0)
        + (upgrades.has(GUNPOWDER_UPGRADE_ID) ? 4 : 0)
        + (upgrades.has(INTERCHANGEABLE_PARTS_UPGRADE_ID) ? 4 : 0)
        + (upgrades.has(MINING_UPGRADE_ID) ? 2 : 0)
        + (upgrades.has(MASON_GUILD_UPGRADE_ID) ? 2 : 0)
        + (upgrades.has(HORSEMANSHIP_UPGRADE_ID) ? 1 : 0)
        + (upgrades.has(MILITARY_SCIENCE_UPGRADE_ID) ? 1 : 0),
});

const withSharedRangedStats = (definition: SymbolDefinition, upgrades: ReadonlySet<number>): SymbolDefinition => ({
    ...definition,
    base_attack: (SYMBOLS[S.archer]?.base_attack ?? 0)
        + (upgrades.has(ARCHERY_UPGRADE_ID) ? 1 : 0)
        + (upgrades.has(MECHANICS_UPGRADE_ID) ? 1 : 0)
        + (upgrades.has(BALLISTICS_UPGRADE_ID) ? 1 : 0),
    base_hp: (SYMBOLS[S.archer]?.base_hp ?? 0)
        + (upgrades.has(ARCHERY_UPGRADE_ID) ? 2 : 0)
        + (upgrades.has(MECHANICS_UPGRADE_ID) ? 2 : 0)
        + (upgrades.has(BALLISTICS_UPGRADE_ID) ? 2 : 0),
});

export function resolveUpgradedUnitDefinition(
    definition: SymbolDefinition,
    unlockedUpgrades: readonly number[] = [],
): SymbolDefinition {
    const have = new Set((unlockedUpgrades ?? []).map(Number));
    let resolved = definition;

    switch (definition.id) {
        case S.warrior:
            resolved = have.has(INTERCHANGEABLE_PARTS_UPGRADE_ID)
                ? SYMBOLS[S.infantry]!
                : have.has(GUNPOWDER_UPGRADE_ID)
                  ? SYMBOLS[S.cavalry]!
                  : definition;
            break;
        case S.cavalry:
            resolved = have.has(INTERCHANGEABLE_PARTS_UPGRADE_ID) ? SYMBOLS[S.infantry]! : definition;
            break;
        case S.archer:
            resolved = have.has(BALLISTICS_UPGRADE_ID)
                ? SYMBOLS[S.cannon]!
                : have.has(MECHANICS_UPGRADE_ID)
                  ? SYMBOLS[S.crossbowman]!
                  : definition;
            break;
        case S.crossbowman:
            resolved = have.has(BALLISTICS_UPGRADE_ID) ? SYMBOLS[S.cannon]! : definition;
            break;
        default:
            break;
    }

    if (isMeleeUnit(resolved)) return withSharedMeleeStats(resolved, have);
    return isRangedUnit(resolved) ? withSharedRangedStats(resolved, have) : resolved;
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

export function getDisplayUnitStats(
    definition: SymbolDefinition,
    unlockedUpgrades: readonly number[] = [],
): { attack: number; hp: number } {
    const have = new Set((unlockedUpgrades ?? []).map(Number));
    if (isMeleeUnit(definition)) {
        const attack = (SYMBOLS[S.warrior]?.base_attack ?? 0)
            + (have.has(IRON_WORKING_UPGRADE_ID) ? 2 : 0)
            + (have.has(GUNPOWDER_UPGRADE_ID) ? 2 : 0)
            + (have.has(INTERCHANGEABLE_PARTS_UPGRADE_ID) ? 2 : 0)
            + (have.has(MINING_UPGRADE_ID) ? 1 : 0)
            + (have.has(MASON_GUILD_UPGRADE_ID) ? 1 : 0)
            + (have.has(HORSEMANSHIP_UPGRADE_ID) ? 1 : 0)
            + (have.has(MILITARY_SCIENCE_UPGRADE_ID) ? 1 : 0);
        const hp = (SYMBOLS[S.warrior]?.base_hp ?? 0)
            + (have.has(IRON_WORKING_UPGRADE_ID) ? 4 : 0)
            + (have.has(GUNPOWDER_UPGRADE_ID) ? 4 : 0)
            + (have.has(INTERCHANGEABLE_PARTS_UPGRADE_ID) ? 4 : 0)
            + (have.has(MINING_UPGRADE_ID) ? 2 : 0)
            + (have.has(MASON_GUILD_UPGRADE_ID) ? 2 : 0)
            + (have.has(HORSEMANSHIP_UPGRADE_ID) ? 1 : 0)
            + (have.has(MILITARY_SCIENCE_UPGRADE_ID) ? 1 : 0);
        return { attack, hp };
    }
    if (isRangedUnit(definition)) {
        const attack = (SYMBOLS[S.archer]?.base_attack ?? 0)
            + (have.has(ARCHERY_UPGRADE_ID) ? 1 : 0)
            + (have.has(MECHANICS_UPGRADE_ID) ? 1 : 0)
            + (have.has(BALLISTICS_UPGRADE_ID) ? 1 : 0);
        const hp = (SYMBOLS[S.archer]?.base_hp ?? 0)
            + (have.has(ARCHERY_UPGRADE_ID) ? 2 : 0)
            + (have.has(MECHANICS_UPGRADE_ID) ? 2 : 0)
            + (have.has(BALLISTICS_UPGRADE_ID) ? 2 : 0);
        return { attack, hp };
    }
    return {
        attack: definition.base_attack ?? 0,
        hp: definition.base_hp ?? 0
    };
}
