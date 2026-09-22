import { EFFECT_SPEED_DELAY, type EffectSpeed } from '../settingsStore';

const PHASE1_DELAY: Record<EffectSpeed, number> = {
    '1x': 150,
    '2x': 90,
    '4x': 45,
    '8x': 23,
};

const PHASE2_DELAY: Record<EffectSpeed, number> = {
    '1x': 280,
    '2x': 180,
    '4x': 90,
    '8x': 45,
};

export interface SlotEffectPresentationPlan {
    hasContributors: boolean;
    phase1DelayMs: number;
    phase2DelayMs: number;
    continueDelayMs: number;
}
export function buildSlotEffectPresentationPlan(args: {
    effectSpeed: EffectSpeed;
    contributorCount: number;
}): SlotEffectPresentationPlan {
    const { effectSpeed, contributorCount } = args;
    return {
        hasContributors: contributorCount > 0,
        phase1DelayMs: PHASE1_DELAY[effectSpeed],
        phase2DelayMs: PHASE2_DELAY[effectSpeed],
        continueDelayMs: EFFECT_SPEED_DELAY[effectSpeed],
    };
}
