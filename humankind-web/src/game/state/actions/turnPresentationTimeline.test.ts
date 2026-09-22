import { describe, expect, it, vi } from 'vitest';

vi.mock('../settingsStore', () => ({
    EFFECT_SPEED_DELAY: { '1x': 150, '2x': 75, '4x': 38, '8x': 19 },
}));

import { buildSlotEffectPresentationPlan } from './turnPresentationTimeline';

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
});
