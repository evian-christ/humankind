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

const makeState = (): GameState => {
    const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);
    const board = createEmptyBoard();
    board[2][1] = oral;

    return {
        leaderId: null,
        food: 0,
        gold: 0,
        knowledge: 0,
        level: 0,
        era: 1,
        turn: 0,
        stageId: 1,
        board,
        playerSymbols: [oral],
        phase: 'idle',
        symbolChoices: [],
        symbolSelectionRelicSourceId: null,
        relicChoices: [null, null, null],
        relicHalfPriceRelicId: null,
        lastEffects: [],
        runningTotals: { food: 0, gold: 0, knowledge: 0 },
        activeSlot: null,
        activeContributors: [],
        pendingContributors: [],
        effectPhase: null,
        effectPhase3ReachedThisRun: false,
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
        skipSelection: () => {},
        rerollSymbols: () => {},
        toggleRelicShop: () => {},
        clearRelicShopStockBadge: () => {},
        refreshRelicShop: () => {},
        buyRelic: () => {},
        selectUpgrade: () => {},
        initializeGame: () => {},
        startGameWithDraft: () => {},
        devAddSymbol: () => {},
        devRemoveSymbol: () => {},
        devSetStat: () => {},
        devForceScreen: () => {},
        confirmDestroySymbols: () => {},
        finishDestroySelection: () => {},
        confirmOblivionFurnaceDestroyAt: () => {},
        cancelOblivionFurnacePick: () => {},
        activateClickableRelic: () => {},
        butcherPastureAnimalAt: () => {},
        trainHorseUnitAt: () => {},
        trainDeerUnitAt: () => {},
        openLootAt: () => {},
        appendEventLog: () => {},
        clearEventLog: () => {},
    };
};

const createHarness = (overrides: Partial<GameState> = {}) => {
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
            processSingleSymbolEffects: vi.fn(),
            createInstance,
            getAdjacentCoords: () => [],
            buildActiveRelicEffects: () => ({
                relicCount: 0,
                quarryEmptyGold: false,
                bananaFossilBonus: false,
                horsemansihpPastureBonus: false,
                terraFossilDisasterFood: false,
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
});
