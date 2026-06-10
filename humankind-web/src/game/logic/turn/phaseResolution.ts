import { calculateFoodCost } from '../../state/gameCalculations';

export type TurnEndPhase = 'selection' | 'game_over';

export interface TurnEndPhaseInput {
    turn: number;
    food: number;
}

export interface TurnEndPhaseResolution {
    nextPhase: TurnEndPhase;
    isFoodPaymentTurn: boolean;
    foodCost: number;
    foodDelta: number;
    foodAfterPayment: number;
    shouldRefreshRelicShop: boolean;
    symbolSelectionRelicSourceId?: null;
}

export function resolveTurnEndPhase(input: TurnEndPhaseInput): TurnEndPhaseResolution {
    const isFoodPaymentTurn = input.turn > 0 && input.turn % 10 === 0;
    const foodCost = isFoodPaymentTurn ? calculateFoodCost(input.turn) : 0;

    if (isFoodPaymentTurn && input.food < foodCost) {
        return {
            nextPhase: 'game_over',
            isFoodPaymentTurn,
            foodCost,
            foodDelta: 0,
            foodAfterPayment: input.food,
            shouldRefreshRelicShop: false,
        };
    }

    const foodDelta = isFoodPaymentTurn ? -foodCost : 0;
    const foodAfterPayment = input.food + foodDelta;

    return {
        nextPhase: 'selection',
        isFoodPaymentTurn,
        foodCost,
        foodDelta,
        foodAfterPayment,
        shouldRefreshRelicShop: isFoodPaymentTurn,
        symbolSelectionRelicSourceId: null,
    };
}
