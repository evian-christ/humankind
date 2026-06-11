import { describe, expect, it, vi } from 'vitest';

vi.mock('../settingsStore', () => ({
    EFFECT_SPEED_DELAY: { '1x': 150, '2x': 75, '4x': 38, '8x': 19 },
    COMBAT_BOUNCE_DURATION: { '1x': 150, '2x': 75, '4x': 38, '8x': 19 },
}));

import {
    buildCombatPresentationPlan,
    buildSlotEffectPresentationPlan,
} from './turnPresentationTimeline';

describe('turnPresentationTimeline', () => {
    it('builds slot presentation timing separately from effect totals', () => {
        expect(buildSlotEffectPresentationPlan({ effectSpeed: '8x', contributorCount: 2 })).toEqual({
            hasContributors: true,
            phase1DelayMs: 23,
            phase2DelayMs: 45,
            continueDelayMs: 19,
        });

        expect(buildSlotEffectPresentationPlan({ effectSpeed: '1x', contributorCount: 0 }).hasContributors).toBe(false);
    });

    it('gives the new 8x preset a faster combat floor than 4x', () => {
        expect(buildCombatPresentationPlan('4x')).toMatchObject({
            bounceDurationMs: 38,
            removalDelayMs: 200,
            initialEffectDelayMs: 300,
        });
        expect(buildCombatPresentationPlan('8x')).toMatchObject({
            bounceDurationMs: 19,
            removalDelayMs: 100,
            initialEffectDelayMs: 150,
        });
    });

    it('keeps combat attack cadence aligned with the effect iteration delay', () => {
        expect(buildCombatPresentationPlan('1x')).toMatchObject({
            bounceDurationMs: 150,
            stepDelayMs: 300,
        });
    });
});
