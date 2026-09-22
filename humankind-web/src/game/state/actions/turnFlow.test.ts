import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '../gameStore';
import { createEmptyBoard, createInstance } from '../gameStoreHelpers';
import { SYMBOLS, S } from '../../data/symbolDefinitions';
import { STATUS_ID } from '../../data/statusDefinitions';
import { isGameEventDefinition } from '../../data/eventDefinitions';
import { prepareTurn } from '../../logic/turn/turnPreparation';
import { calculateFoodCost } from '../gameCalculations';

vi.mock('../settingsStore', () => ({
    useSettingsStore: {
        getState: () => ({
            language: 'en',
            effectSpeed: '8x',
        }),
    },
    EFFECT_SPEED_DELAY: { '1x': 1, '2x': 1, '4x': 1, '8x': 0 },
}));

vi.mock('../../logic/turn/turnPreparation', () => ({
    prepareTurn: vi.fn(),
}));

import { createTurnFlowActions } from './turnFlow';

const mockedPrepareTurn = vi.mocked(prepareTurn);
type TurnFlowDeps = Parameters<typeof createTurnFlowActions>[0];

const makeState = (): GameState => {
    const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);
    const board = createEmptyBoard();
    board[2][1] = oral;

    return {
        food: 0,
        gold: 0,
        knowledge: 0,
        level: 0,
        era: 0,
        turn: 0,
        board,
        playerSymbols: [oral],
        phase: 'idle',
        symbolChoices: [],
        lastEffects: [],
        counterDisplayOverrides: [],
        runningTotals: { food: 0, gold: 0, knowledge: 0 },
        activeSlot: null,
        activeContributors: [],
        pendingContributors: [],
        effectPhase: null,
        effectPhase3ReachedThisRun: false,
        lootMergeFx: null,
        eventLog: [],
        prevBoard: createEmptyBoard(),
        knowledgeUpgradeFloats: [],
        religionUnlocked: false,
        unlockedKnowledgeUpgrades: [],
        levelUpResearchPoints: 0,
        pendingBoardExpansions: 0,
        rerollsThisTurn: 2,
        returnPhaseAfterDevKnowledgeUpgrade: null,
        naturalDisasterThreat: 0,
        pendingDevNaturalDisasterId: null,
        activeStatusIds: [],
        activeStatuses: [],
        pendingNewThreatFloats: [],
        pendingEdictSource: null,
        bonusSelectionQueue: [],
        forceTerrainInNextSymbolChoices: false,
        forceEventsInNextSymbolChoices: false,
        freeSelectionRerolls: 0,
        pendingFoodPayment: false,
        spinBoard: () => {},
        payFoodCost: () => {},
        claimBoardExpansion: () => {},
        startProcessing: () => {},
        continueProcessingAfterNewThreatFloats: () => {},
        selectSymbol: () => {},
        selectEvent: () => {},
        skipSelection: () => {},
        rerollSymbols: () => {},
        selectUpgrade: () => {},
        expandBoardSlotAt: () => {},
        initializeGame: () => {},
        startGameWithDraft: () => {},
        startTutorialGame: () => {},
        setupTutorialCornStep: () => {},
        spinTutorialCornStep: () => {},
        setupTutorialSelectionStep: () => {},
        spinTutorialMonumentStep: () => {},
        setupTutorialAdjacencyStep: () => {},
        spinTutorialAdjacencyStep: () => {},
        devAddSymbol: () => {},
        devRemoveSymbol: () => {},
        devSetStat: () => {},
        devAddBoardExpansion: () => {},
        devForceScreen: () => {},
        devTriggerNaturalDisaster: () => {},
        activateEdictAt: () => {},
        confirmEdictDestroyAt: () => {},
        cancelEdictPick: () => {},
        consumeTribalVillageAt: () => {},

        openLootAt: () => {},
        lootRewardChoices: [],
        pendingLootSlot: null,
        selectLootReward: () => {},
        appendEventLog: () => {},
        clearEventLog: () => {},
    };
};

const createHarness = (
    overrides: Partial<GameState> = {},
    deps: {
        processSingleSymbolEffects?: TurnFlowDeps['processSingleSymbolEffects'];
        getAdjacentCoords?: (x: number, y: number) => { x: number; y: number }[];
    } = {},
) => {
    let state: GameState = { ...makeState(), ...overrides };
    const set = (partial: Partial<GameState> | ((current: GameState) => Partial<GameState>)) => {
        const next = typeof partial === 'function' ? partial(state) : partial;
        state = { ...state, ...next };
    };
    const get = () => state;

    return {
        get,
        set,
        actions: createTurnFlowActions({
            get,
            set,
            boardWidth: 3,
            boardHeight: 2,
            processSingleSymbolEffects:
                deps.processSingleSymbolEffects ??
                (() => ({
                    food: 0,
                    gold: 0,
                    knowledge: 0,
                })),
            createInstance,
            getAdjacentCoords: deps.getAdjacentCoords ?? (() => []),
        }),
    };
};

describe('turnFlow actions', () => {
    beforeEach(() => {
        mockedPrepareTurn.mockReset();
    });

    it('spinBoard applies prepared turn state and resets processing markers', () => {
        const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);
        const nextBoard = createEmptyBoard();
        nextBoard[0][0] = oral;
        mockedPrepareTurn.mockReturnValue({
            board: nextBoard,
            prevBoard: createEmptyBoard(),
            playerSymbols: [oral],
            turn: 1,
            threatState: { naturalDisasterThreat: 3 },
            pendingNewThreatFloats: [{ x: 0, y: 0, label: 'test' }],
            activeStatusIds: [1],
        });

        const harness = createHarness();
        harness.actions.spinBoard();

        expect(harness.get().phase).toBe('spinning');
        expect(harness.get().turn).toBe(1);
        expect(harness.get().board[0][0]?.instanceId).toBe(oral.instanceId);
        expect(harness.get().rerollsThisTurn).toBe(0);
        expect(harness.get().pendingNewThreatFloats).toEqual([{ x: 0, y: 0, label: 'test' }]);
    });

    it('allows spinning while research points are unspent', () => {
        mockedPrepareTurn.mockReturnValue({
            board: createEmptyBoard(),
            prevBoard: createEmptyBoard(),
            playerSymbols: [],
            turn: 1,
            threatState: { naturalDisasterThreat: 0 },
            pendingNewThreatFloats: [],
            activeStatusIds: [],
        });
        const harness = createHarness({ levelUpResearchPoints: 2 });

        harness.actions.spinBoard();

        expect(harness.get().phase).toBe('spinning');
        expect(harness.get().levelUpResearchPoints).toBe(2);
    });

    it('marks food payment pending as soon as a payment-turn spin starts', () => {
        mockedPrepareTurn.mockReturnValue({
            board: createEmptyBoard(),
            prevBoard: createEmptyBoard(),
            playerSymbols: [],
            turn: 10,
            threatState: { naturalDisasterThreat: 0 },
            pendingNewThreatFloats: [],
            activeStatusIds: [],
        });
        const harness = createHarness({ turn: 9 });

        harness.actions.spinBoard();

        expect(harness.get().phase).toBe('spinning');
        expect(harness.get().pendingFoodPayment).toBe(true);
    });

    it('payFoodCost subtracts the payment and waits for the expansion claim', () => {
        const harness = createHarness({
            phase: 'food_payment',
            turn: 10,
            food: 50,
            pendingFoodPayment: true,
        });

        harness.actions.payFoodCost();

        expect(harness.get().food).toBe(50 - calculateFoodCost(10));
        expect(harness.get().phase).toBe('board_expansion_ready');
        expect(harness.get().pendingFoodPayment).toBe(false);
        expect(harness.get().pendingBoardExpansions).toBe(0);

        harness.actions.claimBoardExpansion();

        expect(harness.get().phase).toBe('board_expansion_placement');
        expect(harness.get().pendingBoardExpansions).toBe(1);
    });

    it('keeps the payment fixed when the board has been expanded', () => {
        const expandedBoard = Array.from({ length: 5 }, () => Array(3).fill(null));
        const harness = createHarness({
            board: expandedBoard,
            phase: 'food_payment',
            turn: 10,
            food: calculateFoodCost(10),
            pendingFoodPayment: true,
        });

        harness.actions.payFoodCost();

        expect(harness.get().food).toBe(0);
        expect(harness.get().phase).toBe('board_expansion_ready');
    });

    it('payFoodCost moves to game_over without subtracting when food is insufficient', () => {
        const harness = createHarness({
            phase: 'food_payment',
            turn: 10,
            food: 0,
            pendingFoodPayment: true,
        });

        harness.actions.payFoodCost();

        expect(harness.get().food).toBe(0);
        expect(harness.get().phase).toBe('game_over');
        expect(harness.get().pendingBoardExpansions).toBe(0);
    });

    it('waits for symbol selection before requesting food payment', () => {
        vi.useFakeTimers();
        try {
            const food = calculateFoodCost(10) + 3;
            const harness = createHarness({
                phase: 'spinning',
                turn: 10,
                food,
                activeStatusIds: [],
                activeStatuses: [],
            });

            harness.actions.startProcessing();
            vi.runAllTimers();

            expect(harness.get().phase).toBe('selection');
            expect(harness.get().pendingFoodPayment).toBe(true);
            expect(harness.get().food).toBe(food);
            expect(harness.get().activeStatuses).toEqual([
                { id: STATUS_ID.DISASTER_OMEN, remainingTurns: 0 },
            ]);
        } finally {
            vi.clearAllTimers();
            vi.useRealTimers();
        }
    });

    it('startProcessing pauses at showing_new_threats when pending floats exist', () => {
        const harness = createHarness({
            phase: 'spinning',
            pendingNewThreatFloats: [{ x: 1, y: 1, label: 'threat' }],
        });

        harness.actions.startProcessing();

        expect(harness.get().phase).toBe('showing_new_threats');
        expect(harness.get().runningTotals).toEqual({ food: 0, gold: 0, knowledge: 0 });
    });

    it('continueProcessingAfterNewThreatFloats clears floats and re-enters startProcessing', () => {
        const startProcessing = vi.fn();
        const harness = createHarness({
            pendingNewThreatFloats: [{ x: 1, y: 0, label: 'danger' }],
            startProcessing,
        });

        harness.actions.continueProcessingAfterNewThreatFloats();

        expect(harness.get().pendingNewThreatFloats).toEqual([]);
        expect(startProcessing).toHaveBeenCalledTimes(1);
    });

    it('grants separate level 9 and level 10 research credits when jumping from level 8 to 10', () => {
        vi.useFakeTimers();
        try {
            const harness = createHarness(
                {
                    phase: 'spinning',
                    level: 8,
                    era: 1,
                    knowledge: 0,
                    levelUpResearchPoints: 0,
                    knowledgeResearchCredits: [],
                    turn: 1,
                },
                {
                    processSingleSymbolEffects: () => ({ food: 0, gold: 0, knowledge: 183 }),
                },
            );

            harness.actions.startProcessing();
            vi.runAllTimers();

            expect(harness.get().level).toBe(10);
            expect(harness.get().levelUpResearchPoints).toBe(2);
            expect(harness.get().knowledgeResearchCredits).toEqual([
                { grantLevel: 9, minLevel: 1, maxLevel: 9 },
                { grantLevel: 10, minLevel: 10, maxLevel: 10 },
            ]);
        } finally {
            vi.clearAllTimers();
            vi.useRealTimers();
        }
    });

    it('syncs active statuses for the next selection phase', () => {
        vi.useFakeTimers();
        try {
            const harness = createHarness({
                phase: 'spinning',
                turn: 1,
                activeStatusIds: [],
                activeStatuses: [],
            });

            harness.actions.startProcessing();
            vi.runAllTimers();

            expect(harness.get().phase).toBe('selection');
            expect(harness.get().activeStatuses).toEqual([
                { id: STATUS_ID.DISASTER_OMEN, remainingTurns: 0 },
            ]);
            expect(harness.get().activeStatusIds).toEqual([STATUS_ID.DISASTER_OMEN]);
        } finally {
            vi.clearAllTimers();
            vi.useRealTimers();
        }
    });

    it('offers an event choice after Royal Colony destroys itself during turn processing', () => {
        vi.useFakeTimers();
        try {
            const colony = createInstance(SYMBOLS[S.royal_colony]!, []);
            const board = createEmptyBoard();
            board[0][0] = colony;
            const harness = createHarness(
                {
                    phase: 'spinning',
                    board,
                    playerSymbols: [colony],
                    era: 2,
                    level: 10,
                    turn: 1,
                },
                {
                    processSingleSymbolEffects: (symbol) => {
                        if (symbol.definition.id === S.royal_colony) {
                            symbol.is_marked_for_destruction = true;
                            return { food: 0, gold: 0, knowledge: 0, forceEventsInNextChoices: true };
                        }
                        return { food: 0, gold: 0, knowledge: 0 };
                    },
                },
            );

            harness.actions.startProcessing();
            vi.runAllTimers();

            expect(harness.get().phase).toBe('selection');
            expect(harness.get().isTurnSymbolSelection).toBe(true);
            expect(harness.get().playerSymbols.some((s) => s.instanceId === colony.instanceId)).toBe(false);
            expect(harness.get().symbolChoices.some(isGameEventDefinition)).toBe(true);
        } finally {
            vi.clearAllTimers();
            vi.useRealTimers();
        }
    });
});
