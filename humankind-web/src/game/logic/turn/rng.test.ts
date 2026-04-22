import { describe, expect, it } from 'vitest';
import { createMathRng } from './rng';

describe('createMathRng', () => {
    it('int returns values within the inclusive range', () => {
        const rng = createMathRng();

        for (let i = 0; i < 200; i++) {
            const value = rng.int(2, 5);
            expect(value).toBeGreaterThanOrEqual(2);
            expect(value).toBeLessThanOrEqual(5);
            expect(Number.isInteger(value)).toBe(true);
        }
    });

    it('pick throws for an empty collection', () => {
        const rng = createMathRng();

        expect(() => rng.pick([])).toThrow('Cannot pick from an empty collection.');
    });
});
