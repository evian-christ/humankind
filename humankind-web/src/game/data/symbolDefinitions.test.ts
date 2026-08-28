import { describe, expect, it } from 'vitest';
import { S, SYMBOLS } from './symbolDefinitions';

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
    it('uses the requested IDs for the first new unit symbols', () => {
        expect(SYMBOLS[63]?.key).toBe('militia');
        expect(SYMBOLS[64]?.key).toBe('warrior');
        expect(SYMBOLS[65]?.key).toBe('archer');
        expect(SYMBOLS[66]?.key).toBe('horseman');
        expect(SYMBOLS[67]?.key).toBe('mercenary');
        expect(SYMBOLS[68]).toBeUndefined();
    });

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

    it('uses corn at ID 10 and rice at ID 11', () => {
        expect(SYMBOLS[S.corn]?.id).toBe(10);
        expect(SYMBOLS[S.corn]?.key).toBe('corn');
        expect(SYMBOLS[S.corn]?.sprite).toBe('010.png');
        expect(SYMBOLS[S.rice]?.id).toBe(11);
        expect(SYMBOLS[S.rice]?.key).toBe('rice');
        expect(SYMBOLS[S.rice]?.sprite).toBe('011.png');
        expect(SYMBOLS[S.rice]?.description).toContain('every 40 turns: 60 Food');
    });

    it.each(enemySpritePairs)('uses the expected sprite for enemy symbol %i', (enemyId, sprite) => {
        expect(SYMBOLS[enemyId]?.sprite).toBe(sprite);
    });

    it.each(disasterSpritePairs)('uses the expected sprite for disaster symbol %i', (disasterId, sprite) => {
        expect(SYMBOLS[disasterId]?.sprite).toBe(sprite);
    });
});
