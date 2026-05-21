import { describe, expect, it } from 'vitest';
import { S, SYMBOLS } from './symbolDefinitions';

const enemyCombatStats = [
    [S.enemy_warrior, 3, 8],
    [S.enemy_cavalry, 7, 16],
    [S.enemy_infantry, 9, 20],
    [S.enemy_archer, 2, 4],
    [S.enemy_crossbowman, 4, 8],
    [S.enemy_cannon, 5, 10],
] as const;

const enemySpritePairs = [
    [S.enemy_warrior, '069.png'],
    [S.enemy_cavalry, '070.png'],
    [S.enemy_infantry, '071.png'],
    [S.enemy_archer, '072.png'],
    [S.enemy_crossbowman, '073.png'],
    [S.enemy_cannon, '074.png'],
] as const;

const disasterSpritePairs = [
    [S.plague, '078.png'],
    [S.heatwave, '079.png'],
] as const;

describe('symbolDefinitions', () => {
    it('includes the newly added plague symbol at ID 78', () => {
        expect(SYMBOLS[78]).toBeDefined();
        expect(SYMBOLS[78]?.key).toBe('plague');
    });

    it('includes the heatwave disaster at ID 79', () => {
        expect(SYMBOLS[79]).toBeDefined();
        expect(SYMBOLS[79]?.key).toBe('heatwave');
    });

    it('does not include the removed Internet symbol', () => {
        expect(SYMBOLS[89]).toBeUndefined();
    });

    it('uses the expected IDs for added Medieval symbols', () => {
        expect(SYMBOLS[50]?.key).toBe('monastery_garden');
        expect(SYMBOLS[51]?.key).toBe('tax_storehouse');
        expect(SYMBOLS[54]?.key).toBe('royal_colony');
    });

    it.each(enemyCombatStats)('uses the expected combat stats for enemy symbol %i', (enemyId, attack, hp) => {
        const enemy = SYMBOLS[enemyId]!;

        expect({
            base_attack: enemy.base_attack,
            base_hp: enemy.base_hp,
        }).toEqual({
            base_attack: attack,
            base_hp: hp,
        });
    });

    it.each(enemySpritePairs)('uses the expected sprite for enemy symbol %i', (enemyId, sprite) => {
        expect(SYMBOLS[enemyId]?.sprite).toBe(sprite);
    });

    it.each(disasterSpritePairs)('uses the expected sprite for disaster symbol %i', (disasterId, sprite) => {
        expect(SYMBOLS[disasterId]?.sprite).toBe(sprite);
    });
});
