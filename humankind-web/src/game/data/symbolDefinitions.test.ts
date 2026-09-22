import { describe, expect, it } from 'vitest';
import { S, SYMBOLS } from './symbolDefinitions';

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

    it('uses corn at ID 10 and rice at ID 11', () => {
        expect(SYMBOLS[S.corn]?.id).toBe(10);
        expect(SYMBOLS[S.corn]?.key).toBe('corn');
        expect(SYMBOLS[S.corn]?.sprite).toBe('010.png');
        expect(SYMBOLS[S.rice]?.id).toBe(11);
        expect(SYMBOLS[S.rice]?.key).toBe('rice');
        expect(SYMBOLS[S.rice]?.sprite).toBe('011.png');
        expect(SYMBOLS[S.rice]?.description).toContain('every 40 turns: 60 Food');
    });

    it.each(disasterSpritePairs)('uses the expected sprite for disaster symbol %i', (disasterId, sprite) => {
        expect(SYMBOLS[disasterId]?.sprite).toBe(sprite);
    });
});
