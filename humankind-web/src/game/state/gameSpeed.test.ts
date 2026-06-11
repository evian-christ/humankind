import { describe, expect, it } from 'vitest';
import { GAME_SPEED_PRESETS, getGameSpeed, migrateLegacyGameSpeed } from './gameSpeed';

describe('getGameSpeed', () => {
    it('exposes four finite speed presets', () => {
        expect(GAME_SPEED_PRESETS).toEqual(['1x', '2x', '4x', '8x']);
    });

    it.each(GAME_SPEED_PRESETS)('returns %s when both speeds match', (speed) => {
        expect(getGameSpeed(speed, speed)).toBe(speed);
    });

    it('returns custom when spin and effect speeds differ', () => {
        expect(getGameSpeed('2x', '4x')).toBe('custom');
    });

    it('migrates legacy labels to the rebalanced speed presets', () => {
        expect(migrateLegacyGameSpeed('1x')).toBe('1x');
        expect(migrateLegacyGameSpeed('2x')).toBe('1x');
        expect(migrateLegacyGameSpeed('4x')).toBe('2x');
        expect(migrateLegacyGameSpeed('8x')).toBe('4x');
        expect(migrateLegacyGameSpeed('instant')).toBe('8x');
    });
});
