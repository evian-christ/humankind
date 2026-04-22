import { EDICT_SYMBOL_ID } from '../../data/symbolDefinitions';
import { calculateFoodCost } from '../../state/gameCalculations';

export type TurnEndPhase = 'selection' | 'destroy_selection' | 'game_over';

export interface TurnEndPhaseInput {
    turn: number;
    stageId: number;
    food: number;
    edictRemovalPending: boolean;
}

export interface DestroySelectionResolution {
    edictRemovalPending: false;
    pendingDestroySource: typeof EDICT_SYMBOL_ID;
    destroySelectionMaxSymbols: 1;
}

export interface TurnEndPhaseResolution {
    nextPhase: TurnEndPhase;
    isFoodPaymentTurn: boolean;
    foodCost: number;
    foodDelta: number;
    foodAfterPayment: number;
    shouldRefreshRelicShop: boolean;
    symbolSelectionRelicSourceId?: null;
    destroySelection?: DestroySelectionResolution;
}

export function resolveTurnEndPhase(input: TurnEndPhaseInput): TurnEndPhaseResolution {
    const isFoodPaymentTurn = input.turn > 0 && input.turn % 10 === 0;
    const foodCost = isFoodPaymentTurn ? calculateFoodCost(input.turn, input.stageId) : 0;

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

    if (input.edictRemovalPending) {
        return {
            nextPhase: 'destroy_selection',
            isFoodPaymentTurn,
            foodCost,
            foodDelta,
            foodAfterPayment,
            shouldRefreshRelicShop: isFoodPaymentTurn,
            destroySelection: {
                edictRemovalPending: false,
                pendingDestroySource: EDICT_SYMBOL_ID,
                destroySelectionMaxSymbols: 1,
            },
        };
    }

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
