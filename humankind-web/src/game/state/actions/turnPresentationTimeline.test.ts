import { describe, expect, it, vi } from 'vitest';

vi.mock('../settingsStore', () => ({
    EFFECT_SPEED_DELAY: { '1x': 500, '2x': 250, '4x': 125, instant: 0 },
    COMBAT_BOUNCE_DURATION: { '1x': 300, '2x': 200, '4x': 100, instant: 0 },
}));

import {
    buildCombatPresentationPlan,
    buildSlotEffectPresentationPlan,
} from './turnPresentationTimeline';

describe('turnPresentationTimeline', () => {
    it('builds slot presentation timing separately from effect totals', () => {
        expect(buildSlotEffectPresentationPlan({ effectSpeed: 'instant', contributorCount: 2 })).toEqual({
            hasContributors: true,
            phase1DelayMs: 0,
            phase2DelayMs: 0,
            continueDelayMs: 0,
        });

        expect(buildSlotEffectPresentationPlan({ effectSpeed: '1x', contributorCount: 0 }).hasContributors).toBe(false);
    });

    it('keeps instant combat timelines synchronous', () => {
        expect(buildCombatPresentationPlan('instant')).toMatchObject({
            bounceDurationMs: 0,
            initialEffectDelayMs: 0,
        });
    });
});
