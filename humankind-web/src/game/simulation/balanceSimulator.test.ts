import { describe, expect, it } from 'vitest';
import { runBalanceSimulation } from './balanceSimulator';
import { S } from '../data/symbolDefinitions';

describe('balanceSimulator', () => {
    it('runs deterministic headless simulations for the same seed', () => {
        const config = {
            runs: 5,
            maxTurns: 20,
            seed: 1234,
            pickStrategy: 'random' as const,
            upgradeStrategy: 'first_legal' as const,
        };

        const first = runBalanceSimulation(config);
        const second = runBalanceSimulation(config);

        expect(second.runs).toEqual(first.runs);
        expect(first.runs).toHaveLength(5);
        expect(first.averageSurvivedTurns).toBeGreaterThan(0);
    });

    it('summarizes survival rates and picked symbols', () => {
        const summary = runBalanceSimulation({
            runs: 3,
            maxTurns: 12,
            seed: 42,
            pickStrategy: 'sea_axis',
            upgradeStrategy: 'none',
        });

        expect(summary.survivalRateByTurn[10]).toBeGreaterThanOrEqual(0);
        expect(summary.survivalRateByTurn[10]).toBeLessThanOrEqual(1);
        expect(summary.outcomeCounts.game_over + summary.outcomeCounts.max_turns + summary.outcomeCounts.victory).toBe(3);
        expect(summary.topPickedSymbols.length).toBeGreaterThan(0);
    });

    it('uses terrain axis strategy instead of raw resource greed', () => {
        const summary = runBalanceSimulation({
            runs: 8,
            maxTurns: 20,
            seed: 99,
            pickStrategy: 'forest_axis',
            upgradeStrategy: 'axis_plan',
        });
        const picked = new Set(summary.runs.flatMap((run) => run.pickedSymbolIds));

        expect(
            picked.has(S.forest) ||
            picked.has(S.deer) ||
            picked.has(S.mushroom) ||
            picked.has(S.fur),
        ).toBe(true);
    });
});
