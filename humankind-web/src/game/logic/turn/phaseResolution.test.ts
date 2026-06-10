import { describe, expect, it } from 'vitest';
import { calculateFoodCost } from '../../state/gameCalculations';
import { resolveTurnEndPhase } from './phaseResolution';

describe('resolveTurnEndPhase', () => {
    it('returns game_over when food is insufficient on a payment turn', () => {
        const foodCost = calculateFoodCost(10);

        const result = resolveTurnEndPhase({
            turn: 10,
            food: foodCost - 1,
        });

        expect(result.nextPhase).toBe('game_over');
        expect(result.foodCost).toBe(foodCost);
        expect(result.foodDelta).toBe(0);
        expect(result.foodAfterPayment).toBe(foodCost - 1);
        expect(result.shouldRefreshRelicShop).toBe(false);
    });

    it('subtracts food and moves to selection when food is sufficient on a payment turn', () => {
        const foodCost = calculateFoodCost(10);

        const result = resolveTurnEndPhase({
            turn: 10,
            food: foodCost + 7,
        });

        expect(result.nextPhase).toBe('selection');
        expect(result.foodCost).toBe(foodCost);
        expect(result.foodDelta).toBe(-foodCost);
        expect(result.foodAfterPayment).toBe(7);
        expect(result.shouldRefreshRelicShop).toBe(true);
        expect(result.symbolSelectionRelicSourceId).toBeNull();
    });
});
