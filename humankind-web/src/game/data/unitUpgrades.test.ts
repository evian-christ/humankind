import { describe, expect, it } from 'vitest';
import { SYMBOLS, S } from './symbolDefinitions';
import {
    resolveUpgradedUnitDefinition,
    getDisplayUnitStats,
} from './unitUpgrades';
import {
    ARCHERY_UPGRADE_ID,
    BALLISTICS_UPGRADE_ID,
    GUNPOWDER_UPGRADE_ID,
    INTERCHANGEABLE_PARTS_UPGRADE_ID,
    IRON_WORKING_UPGRADE_ID,
    MECHANICS_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    MILITARY_SCIENCE_UPGRADE_ID,
} from './knowledgeUpgrades';

describe('unitUpgrades calculations', () => {
    describe('resolveUpgradedUnitDefinition', () => {
        it('returns base definitions when no upgrades are unlocked', () => {
            const warrior = resolveUpgradedUnitDefinition(SYMBOLS[S.warrior]!, []);
            expect(warrior.id).toBe(S.warrior);
            expect(warrior.base_attack).toBe(3);
            expect(warrior.base_hp).toBe(8);

            const archer = resolveUpgradedUnitDefinition(SYMBOLS[S.archer]!, []);
            expect(archer.id).toBe(S.archer);
            expect(archer.base_attack).toBe(2);
            expect(archer.base_hp).toBe(4);
        });

        it('applies shared melee stats when Iron Working is unlocked', () => {
            const warrior = resolveUpgradedUnitDefinition(SYMBOLS[S.warrior]!, [IRON_WORKING_UPGRADE_ID]);
            expect(warrior.id).toBe(S.warrior);
            expect(warrior.base_attack).toBe(5); // 3 + 2
            expect(warrior.base_hp).toBe(12);   // 8 + 4
        });

        it('applies shared melee stats when Horsemanship and Military Science are unlocked', () => {
            const warriorWithHorse = resolveUpgradedUnitDefinition(SYMBOLS[S.warrior]!, [HORSEMANSHIP_UPGRADE_ID]);
            expect(warriorWithHorse.base_attack).toBe(4); // 3 + 1
            expect(warriorWithHorse.base_hp).toBe(9);   // 8 + 1

            const warriorWithMilSci = resolveUpgradedUnitDefinition(SYMBOLS[S.warrior]!, [MILITARY_SCIENCE_UPGRADE_ID]);
            expect(warriorWithMilSci.base_attack).toBe(4); // 3 + 1
            expect(warriorWithMilSci.base_hp).toBe(9);   // 8 + 1

            const warriorWithBoth = resolveUpgradedUnitDefinition(SYMBOLS[S.warrior]!, [
                HORSEMANSHIP_UPGRADE_ID,
                MILITARY_SCIENCE_UPGRADE_ID,
            ]);
            expect(warriorWithBoth.base_attack).toBe(5); // 3 + 1 + 1
            expect(warriorWithBoth.base_hp).toBe(10);   // 8 + 1 + 1
        });

        it('applies shared ranged stats when Archery is unlocked', () => {
            const archer = resolveUpgradedUnitDefinition(SYMBOLS[S.archer]!, [ARCHERY_UPGRADE_ID]);
            expect(archer.id).toBe(S.archer);
            expect(archer.base_attack).toBe(3); // 2 + 1
            expect(archer.base_hp).toBe(6);   // 4 + 2
        });

        it('replaces Warrior with Knight and applies stats when Stirrups is unlocked', () => {
            const warrior = resolveUpgradedUnitDefinition(SYMBOLS[S.warrior]!, [GUNPOWDER_UPGRADE_ID]);
            expect(warrior.id).toBe(S.cavalry); // Knight (cavalry)
            expect(warrior.base_attack).toBe(5); // 3 + 2 (Stirrups)
            expect(warrior.base_hp).toBe(12);   // 8 + 4 (Stirrups)

            // When Iron Working is also unlocked
            const warriorWithBoth = resolveUpgradedUnitDefinition(SYMBOLS[S.warrior]!, [
                IRON_WORKING_UPGRADE_ID,
                GUNPOWDER_UPGRADE_ID,
            ]);
            expect(warriorWithBoth.id).toBe(S.cavalry);
            expect(warriorWithBoth.base_attack).toBe(7); // 3 + 2 + 2
            expect(warriorWithBoth.base_hp).toBe(16);   // 8 + 4 + 4
        });

        it('replaces Archer with Crossbowman and applies stats when Mechanics is unlocked', () => {
            const archer = resolveUpgradedUnitDefinition(SYMBOLS[S.archer]!, [MECHANICS_UPGRADE_ID]);
            expect(archer.id).toBe(S.crossbowman);
            expect(archer.base_attack).toBe(3); // 2 + 1 (Mechanics)
            expect(archer.base_hp).toBe(6);   // 4 + 2 (Mechanics)

            // When Archery is also unlocked
            const archerWithBoth = resolveUpgradedUnitDefinition(SYMBOLS[S.archer]!, [
                ARCHERY_UPGRADE_ID,
                MECHANICS_UPGRADE_ID,
            ]);
            expect(archerWithBoth.id).toBe(S.crossbowman);
            expect(archerWithBoth.base_attack).toBe(4); // 2 + 1 + 1
            expect(archerWithBoth.base_hp).toBe(8);   // 4 + 2 + 2
        });

        it('replaces Archer/Crossbowman with Cannon when Ballistics is unlocked', () => {
            const archer = resolveUpgradedUnitDefinition(SYMBOLS[S.archer]!, [
                ARCHERY_UPGRADE_ID,
                MECHANICS_UPGRADE_ID,
                BALLISTICS_UPGRADE_ID,
            ]);
            expect(archer.id).toBe(S.cannon);
            expect(archer.base_attack).toBe(5); // 2 + 1 + 1 + 1
            expect(archer.base_hp).toBe(10);   // 4 + 2 + 2 + 2

            const crossbowman = resolveUpgradedUnitDefinition(SYMBOLS[S.crossbowman]!, [
                ARCHERY_UPGRADE_ID,
                MECHANICS_UPGRADE_ID,
                BALLISTICS_UPGRADE_ID,
            ]);
            expect(crossbowman.id).toBe(S.cannon);
            expect(crossbowman.base_attack).toBe(5);
            expect(crossbowman.base_hp).toBe(10);
        });

        it('replaces Warrior/Knight with Infantry when Interchangeable Parts is unlocked', () => {
            const warrior = resolveUpgradedUnitDefinition(SYMBOLS[S.warrior]!, [
                IRON_WORKING_UPGRADE_ID,
                GUNPOWDER_UPGRADE_ID,
                INTERCHANGEABLE_PARTS_UPGRADE_ID,
            ]);
            expect(warrior.id).toBe(S.infantry);
            expect(warrior.base_attack).toBe(9); // 3 + 2 + 2 + 2
            expect(warrior.base_hp).toBe(20);   // 8 + 4 + 4 + 4

            const cavalry = resolveUpgradedUnitDefinition(SYMBOLS[S.cavalry]!, [
                IRON_WORKING_UPGRADE_ID,
                GUNPOWDER_UPGRADE_ID,
                INTERCHANGEABLE_PARTS_UPGRADE_ID,
            ]);
            expect(cavalry.id).toBe(S.infantry);
            expect(cavalry.base_attack).toBe(9);
            expect(cavalry.base_hp).toBe(20);
        });
    });

    describe('getDisplayUnitStats', () => {
        it('calculates the exact display stats dynamically', () => {
            const archerStats = getDisplayUnitStats(SYMBOLS[S.archer]!, [
                ARCHERY_UPGRADE_ID,
                MECHANICS_UPGRADE_ID,
            ]);
            expect(archerStats).toEqual({ attack: 4, hp: 8 });

            const cannonStats = getDisplayUnitStats(SYMBOLS[S.cannon]!, [
                ARCHERY_UPGRADE_ID,
                MECHANICS_UPGRADE_ID,
                BALLISTICS_UPGRADE_ID,
            ]);
            // Ranged units should have the same display stats regardless of what symbol is passed
            expect(cannonStats).toEqual({ attack: 5, hp: 10 });

            const knightStats = getDisplayUnitStats(SYMBOLS[S.cavalry]!, [
                IRON_WORKING_UPGRADE_ID,
                GUNPOWDER_UPGRADE_ID,
            ]);
            expect(knightStats).toEqual({ attack: 7, hp: 16 });
        });
    });
});
