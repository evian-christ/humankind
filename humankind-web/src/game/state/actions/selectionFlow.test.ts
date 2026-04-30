import { beforeEach, describe, expect, it } from 'vitest';
import { createSelectionFlowActions } from './selectionFlow';
import type { GameState } from '../gameStore';
import { useRelicStore } from '../relicStore';
import { SYMBOLS, S } from '../../data/symbolDefinitions';
import { RELIC_ID } from '../../logic/relics/relicIds';
import { RELICS } from '../../data/relicDefinitions';
import { createEmptyBoard, createInstance } from '../gameStoreHelpers';
import { AGI_PROJECT_UPGRADE_ID, MODERN_AGE_UPGRADE_ID } from '../../data/knowledgeUpgrades';

const makeState = (): GameState => {
    const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);
    const board = createEmptyBoard();
    board[2][1] = oral;

    return {
        leaderId: null,
        food: 0,
        gold: 10,
        knowledge: 0,
        level: 1,
        era: 1,
        turn: 1,
        stageId: 1,
        board,
        playerSymbols: [oral],
        phase: 'selection',
        symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.rice]!, SYMBOLS[S.stone]!],
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
        rerollsThisTurn: 0,
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
        activateEdictAt: () => {},
        confirmEdictDestroyAt: () => {},
        cancelEdictPick: () => {},
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
        actions: createSelectionFlowActions({
            get,
            set,
            createInstance,
            phaseAfterTurnFlowComplete: () => 'idle',
            demoVictoryLevel: 15,
        }),
    };
};

describe('selectionFlow actions', () => {
    beforeEach(() => {
        useRelicStore.getState().resetRelics();
    });

    it('consumes bonus selection queue and stays in selection until queue ends', () => {
        const harness = createHarness({
            bonusSelectionQueue: ['terrain', 'any'],
            symbolChoices: [SYMBOLS[S.plains]!, SYMBOLS[S.mountain]!, SYMBOLS[S.grassland]!],
        });

        harness.actions.selectSymbol(S.plains);

        expect(harness.get().phase).toBe('selection');
        expect(harness.get().bonusSelectionQueue).toEqual(['any']);
        expect(harness.get().playerSymbols.some((sym) => sym.definition.id === S.plains)).toBe(true);
        expect(harness.get().symbolSelectionRelicSourceId).toBeNull();
    });

    it('uses a free reroll without spending gold', () => {
        const harness = createHarness({
            freeSelectionRerolls: 1,
            gold: 7,
            symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.wheat]!, SYMBOLS[S.wheat]!],
        });

        harness.actions.rerollSymbols();

        expect(harness.get().gold).toBe(7);
        expect(harness.get().freeSelectionRerolls).toBe(0);
        expect(harness.get().symbolChoices).toHaveLength(3);
    });

    it('applies a legal knowledge upgrade and spends one research point', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 5,
        });

        harness.actions.selectUpgrade(1);

        expect(harness.get().phase).toBe('selection');
        expect(harness.get().unlockedKnowledgeUpgrades).toContain(1);
        expect(harness.get().bonusXpPerTurn).toBe(2);
        expect(harness.get().levelUpResearchPoints).toBe(0);
    });

    it('upgrades warriors into knights when iron working is researched', () => {
        const warrior = createInstance(SYMBOLS[S.warrior]!, []);
        const board = createEmptyBoard();
        board[0][0] = warrior;
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 8,
            playerSymbols: [warrior],
            board,
            unlockedKnowledgeUpgrades: [5],
        });

        harness.actions.selectUpgrade(2);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(2);
        expect(harness.get().playerSymbols[0]?.definition.id).toBe(S.knight);
        expect(harness.get().board[0]?.[0]?.definition.id).toBe(S.knight);
    });

    it('opens oblivion furnace board mode only when a relic-backed cell destroy resolves', () => {
        const relicDef = RELICS[RELIC_ID.OBLIVION_FURNACE]!;
        useRelicStore.getState().addRelic(relicDef);
        const relicInstanceId = useRelicStore.getState().relics[0]!.instanceId;
        const harness = createHarness({ phase: 'oblivion_furnace_board', pendingOblivionFurnaceRelicId: relicInstanceId });

        harness.actions.cancelOblivionFurnacePick();

        expect(harness.get().phase).toBe('idle');
        expect(harness.get().pendingOblivionFurnaceRelicId).toBeNull();
    });

    it('grants AGI Core when AGI Project is researched', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 30,
            era: 3,
            unlockedKnowledgeUpgrades: [MODERN_AGE_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(AGI_PROJECT_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(AGI_PROJECT_UPGRADE_ID);
        expect(harness.get().playerSymbols.some((sym) => sym.definition.id === S.agi_core)).toBe(true);
        expect(harness.get().levelUpResearchPoints).toBe(0);
    });
});
