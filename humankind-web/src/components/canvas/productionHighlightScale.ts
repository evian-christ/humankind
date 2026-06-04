import type { ResourceDelta } from '../../game/logic/turn/turnTypes';
import type { SettingsState } from '../../game/state/settingsStore';

export const PRODUCTION_HIGHLIGHT_SCALE_IN_MS: Record<SettingsState['effectSpeed'], number> = {
    '1x': 210,
    '2x': 150,
    '4x': 95,
    instant: 0,
};

export const PRODUCTION_HIGHLIGHT_SCALE_OUT_MS: Record<SettingsState['effectSpeed'], number> = {
    '1x': 300,
    '2x': 210,
    '4x': 140,
    instant: 0,
};

const PRODUCTION_HIGHLIGHT_SCALE_STEPS = [
    { amount: 1, scale: 1 },
    { amount: 2, scale: 1.1 },
    { amount: 3, scale: 1.2 },
    { amount: 5, scale: 1.3 },
    { amount: 10, scale: 1.4 },
    { amount: 20, scale: 1.5 },
    { amount: 40, scale: 2 },
] as const;

export function getProductionAmount(delta: Partial<ResourceDelta>) {
    return (
        Math.max(0, delta.food ?? 0) +
        Math.max(0, delta.gold ?? 0) +
        Math.max(0, delta.knowledge ?? 0)
    );
}

export function getProductionHighlightScale(productionAmount: number) {
    if (productionAmount <= 1) return 1;

    const cappedAmount = Math.min(
        productionAmount,
        PRODUCTION_HIGHLIGHT_SCALE_STEPS[PRODUCTION_HIGHLIGHT_SCALE_STEPS.length - 1].amount,
    );
    for (let i = 1; i < PRODUCTION_HIGHLIGHT_SCALE_STEPS.length; i++) {
        const prev = PRODUCTION_HIGHLIGHT_SCALE_STEPS[i - 1];
        const next = PRODUCTION_HIGHLIGHT_SCALE_STEPS[i];
        if (cappedAmount <= next.amount) {
            const t = (cappedAmount - prev.amount) / (next.amount - prev.amount);
            return prev.scale + (next.scale - prev.scale) * t;
        }
    }

    return PRODUCTION_HIGHLIGHT_SCALE_STEPS[PRODUCTION_HIGHLIGHT_SCALE_STEPS.length - 1].scale;
}

export function getProductionHighlightScaleForDelta(delta: Partial<ResourceDelta>) {
    return getProductionHighlightScale(getProductionAmount(delta));
}
