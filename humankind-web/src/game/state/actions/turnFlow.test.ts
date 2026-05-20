import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '../gameStore';
import { createEmptyBoard, createInstance } from '../gameStoreHelpers';
import { SYMBOLS, S } from '../../data/symbolDefinitions';
import { prepareTurn } from '../../logic/turn/turnPreparation';
import { useRelicStore } from '../relicStore';

vi.mock('../settingsStore', () => ({
    useSettingsStore: {
        getState: () => ({
            language: 'en',
            effectSpeed: 'instant',
        }),
    },
    EFFECT_SPEED_DELAY: { '1x': 1, '2x': 1, '4x': 1, instant: 0 },
    COMBAT_BOUNCE_DURATION: { '1x': 1, '2x': 1, '4x': 1, instant: 0 },
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
        leaderId: null,
        leaderProgressLevel: 1,
        lastLeaderProgressAward: null,
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
        symbolSelectionRelicSourceId: null,
        relicChoices: [null, null, null],
        relicHalfPriceRelicId: null,
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
        combatAnimation: null,
        combatShaking: false,
        preCombatShakeTarget: null,
        preCombatShakeRelicDefId: null,
        combatFloats: [],
        relicFloats: [],
        knowledgeUpgradeFloats: [],
        religionUnlocked: false,
        unlockedKnowledgeUpgrades: [],
        bonusXpPerTurn: 0,
        qinCurrencyStandardTurnsRemaining: 0,
        levelUpResearchPoints: 0,
        isRelicShopOpen: false,
        hasNewRelicShopStock: false,
        rerollsThisTurn: 2,
        returnPhaseAfterDevKnowledgeUpgrade: null,
        barbarianSymbolThreat: 0,
        barbarianCampThreat: 0,
        naturalDisasterThreat: 0,
        pendingNewThreatFloats: [],
        pendingDestroySource: null,
        pendingOblivionFurnaceRelicId: null,
        pendingEdictSource: null,
        bonusSelectionQueue: [],
        edictRemovalPending: false,
        forceTerrainInNextSymbolChoices: false,
        freeSelectionRerolls: 0,
        destroySelectionMaxSymbols: 3,
        territorialAfterEdictPending: false,
        spinBoard: () => {},
        startProcessing: () => {},
        continueProcessingAfterNewThreatFloats: () => {},
        selectSymbol: () => {},
        selectEvent: () => {},
        skipSelection: () => {},
        rerollSymbols: () => {},
        toggleRelicShop: () => {},
        clearRelicShopStockBadge: () => {},
        refreshRelicShop: () => {},
        buyRelic: () => {},
        selectUpgrade: () => {},
        initializeGame: () => {},
        startGameWithDraft: () => {},
        startTutorialGame: () => {},
        setupTutorialCornStep: () => {},
        spinTutorialCornStep: () => {},
        setupTutorialSelectionStep: () => {},
        spinTutorialMonumentStep: () => {},
        devAddSymbol: () => {},
        devRemoveSymbol: () => {},
        devSetStat: () => {},
        devForceScreen: () => {},
        confirmDestroySymbols: () => {},
        finishDestroySelection: () => {},
        confirmOblivionFurnaceDestroyAt: () => {},
        cancelOblivionFurnacePick: () => {},
        activateEdictAt: () => {},
        confirmEdictDestroyAt: () => {},
        cancelEdictPick: () => {},
        activateClickableRelic: () => {},
        butcherPastureAnimalAt: () => {},
        trainHorseUnitAt: () => {},
        trainDeerUnitAt: () => {},
        openLootAt: () => {},
        lootRewardChoices: [],
        pendingLootSlot: null,
        selectLootReward: () => {},
        appendEventLog: () => {},
        clearEventLog: () => {},
    };
};

const getAdjacentCoords = (x: number, y: number) => {
    const adj: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < 5 && ny >= 0 && ny < 4) adj.push({ x: nx, y: ny });
        }
    }
    return adj;
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
            boardWidth: 5,
            boardHeight: 4,
            processSingleSymbolEffects:
                deps.processSingleSymbolEffects ??
                (() => ({
                    food: 0,
                    gold: 0,
                    knowledge: 0,
                })),
            createInstance,
            getAdjacentCoords: deps.getAdjacentCoords ?? (() => []),
            buildActiveRelicEffects: () => ({
                relicCount: 0,
                quarryEmptyGold: false,
                bananaFossilBonus: false,
                horsemansihpPastureBonus: false,
                terraFossilDisasterFood: false,
                allSymbolsAreCorner: false,
            }),
        }),
    };
};

describe('turnFlow actions', () => {
    beforeEach(() => {
        mockedPrepareTurn.mockReset();
        useRelicStore.getState().resetRelics();
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
            threatState: {
                barbarianSymbolThreat: 1,
                barbarianCampThreat: 2,
                naturalDisasterThreat: 3,
            },
            pendingNewThreatFloats: [{ x: 0, y: 0, label: 'test' }],
        });

        const harness = createHarness();
        harness.actions.spinBoard();

        expect(harness.get().phase).toBe('spinning');
        expect(harness.get().turn).toBe(1);
        expect(harness.get().board[0][0]?.instanceId).toBe(oral.instanceId);
        expect(harness.get().rerollsThisTurn).toBe(0);
        expect(harness.get().pendingNewThreatFloats).toEqual([{ x: 0, y: 0, label: 'test' }]);
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

    it('adds loot to owned symbols when combat defeats an enemy', () => {
        vi.useFakeTimers();
        try {
            const board = createEmptyBoard();
            const warrior = createInstance(SYMBOLS[S.warrior]!, []);
            const enemy = createInstance(SYMBOLS[S.enemy_archer]!, []);
            enemy.enemy_hp = 1;
            board[0][0] = warrior;
            board[1][0] = enemy;

            const harness = createHarness(
                {
                    phase: 'spinning',
                    board,
                    playerSymbols: [warrior, enemy],
                    turn: 1,
                },
                { getAdjacentCoords },
            );

            harness.actions.startProcessing();

            expect(harness.get().board[1][0]).toBeNull();
            expect(harness.get().playerSymbols.some((s) => s.instanceId === enemy.instanceId)).toBe(false);
            expect(harness.get().playerSymbols.filter((s) => s.definition.id === S.loot)).toHaveLength(1);
        } finally {
            vi.clearAllTimers();
            vi.useRealTimers();
        }
    });
});
