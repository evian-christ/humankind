import {
    COMBAT_BOUNCE_DURATION,
    EFFECT_SPEED_DELAY,
    type EffectSpeed,
} from '../settingsStore';

const PHASE1_DELAY: Record<EffectSpeed, number> = {
    '1x': 220,
    '2x': 150,
    '4x': 90,
    instant: 0,
};

const PHASE2_DELAY: Record<EffectSpeed, number> = {
    '1x': 360,
    '2x': 280,
    '4x': 180,
    instant: 0,
};

export interface SlotEffectPresentationPlan {
    hasContributors: boolean;
    phase1DelayMs: number;
    phase2DelayMs: number;
    continueDelayMs: number;
}

export interface CombatPresentationPlan {
    bounceDurationMs: number;
    stepDelayMs: number;
    removalDelayMs: number;
    initialEffectDelayMs: number;
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

export function buildCombatPresentationPlan(effectSpeed: EffectSpeed): CombatPresentationPlan {
    const bounceDurationMs = COMBAT_BOUNCE_DURATION[effectSpeed];
    const baseInitialEffectDelayMs = EFFECT_SPEED_DELAY[effectSpeed];
    return {
        bounceDurationMs,
        stepDelayMs: bounceDurationMs + 40,
        removalDelayMs: Math.max(bounceDurationMs * 2, 200),
        initialEffectDelayMs:
            baseInitialEffectDelayMs === 0 ? 0 : Math.max(baseInitialEffectDelayMs, 300),
    };
}
