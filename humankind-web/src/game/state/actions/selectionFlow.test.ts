import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSelectionFlowActions } from './selectionFlow';
import type { GameState } from '../gameStore';
import { useRelicStore } from '../relicStore';
import { SYMBOLS, S } from '../../data/symbolDefinitions';
import { getEnemyPoolForEra } from '../../data/enemyPools';
import { RELIC_ID } from '../../logic/relics/relicIds';
import { RELICS } from '../../data/relicDefinitions';
import { createEmptyBoard, createInstance } from '../gameStoreHelpers';
import {
    AGI_PROJECT_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    ARCHERY_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    IRON_WORKING_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    THEOLOGY_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';

const makeState = (): GameState => {
    const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);
    const board = createEmptyBoard();
    board[2][1] = oral;

    return {
        leaderId: null,
        leaderProgressLevel: 1,
        lastLeaderProgressAward: null,
        food: 0,
        gold: 10,
        knowledge: 0,
        level: 1,
        era: 1,
        turn: 1,
        board,
        playerSymbols: [oral],
        phase: 'selection',
        symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.rice]!, SYMBOLS[S.stone]!],
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
        lootRewardChoices: [],
        pendingLootSlot: null,
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
        selectLootReward: () => {},
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
        }),
    };
};

describe('selectionFlow actions', () => {
    beforeEach(() => {
        useRelicStore.getState().resetRelics();
    });

    afterEach(() => {
        vi.restoreAllMocks();
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

    it('grants resources and summons 3 random current-era enemies when selecting Barbarian Suppression event', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const harness = createHarness({
            era: 3,
            food: 5,
            gold: 7,
        });

        harness.actions.selectEvent(11);

        expect(harness.get().phase).toBe('idle');
        expect(harness.get().food).toBe(45);
        expect(harness.get().gold).toBe(47);
        expect(harness.get().playerSymbols.filter((sym) => sym.definition.id === S.enemy_infantry)).toHaveLength(3);
        expect(harness.get().playerSymbols.some((sym) => sym.definition.id === S.enemy_warrior)).toBe(false);
        expect(getEnemyPoolForEra(1)).toContain(S.enemy_warrior);
    });

    it('summons a 1 HP barbarian for Escape from Kadesh event', () => {
        const harness = createHarness();

        harness.actions.selectEvent(23);

        const enemy = harness.get().playerSymbols.find((sym) => sym.definition.id === S.enemy_warrior);
        expect(harness.get().phase).toBe('idle');
        expect(enemy).toBeDefined();
        expect(enemy?.enemy_hp).toBe(1);
    });

    it('activates Qin Shi Huang Currency Standardization for 5 turns', () => {
        const harness = createHarness();

        harness.actions.selectEvent(24);

        expect(harness.get().phase).toBe('idle');
        expect(harness.get().qinCurrencyStandardTurnsRemaining).toBe(5);
    });

    it('refreshes the relic shop when selecting Relic Caravan event', async () => {
        let refreshed = false;
        const harness = createHarness({
            refreshRelicShop: (force?: boolean) => {
                refreshed = force === true;
            },
        });

        harness.actions.selectEvent(10);
        await Promise.resolve();

        expect(harness.get().phase).toBe('idle');
        expect(refreshed).toBe(true);
    });

    it('applies era-scaled immediate resource event rewards from event data', () => {
        const harness = createHarness({
            era: 3,
            food: 5,
            gold: 7,
            knowledge: 11,
        });

        harness.actions.selectEvent(9);

        expect(harness.get().food).toBe(5);
        expect(harness.get().gold).toBe(7);
        expect(harness.get().knowledge).toBe(51);
    });

    it('destroys random owned symbols and grants resources for Capital Relocation event', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const symbols = [
            createInstance(SYMBOLS[S.oral_tradition]!, []),
            createInstance(SYMBOLS[S.wild_seeds]!, []),
            createInstance(SYMBOLS[S.wheat]!, []),
            createInstance(SYMBOLS[S.rice]!, []),
            createInstance(SYMBOLS[S.stone]!, []),
        ];
        const board = createEmptyBoard();
        board[0][0] = symbols[0]!;
        board[1][0] = symbols[1]!;
        board[2][0] = symbols[2]!;

        const harness = createHarness({
            food: 3,
            knowledge: 4,
            playerSymbols: symbols,
            board,
        });

        harness.actions.selectEvent(13);

        expect(harness.get().phase).toBe('idle');
        expect(harness.get().food).toBe(28);
        expect(harness.get().knowledge).toBe(19);
        expect(harness.get().playerSymbols).toHaveLength(3);
        expect(harness.get().playerSymbols.map((symbol) => symbol.instanceId)).toEqual([
            symbols[2]!.instanceId,
            symbols[3]!.instanceId,
            symbols[4]!.instanceId,
        ]);
        expect(harness.get().board[0]?.[0]).toBeNull();
        expect(harness.get().board[1]?.[0]).toBeNull();
        expect(harness.get().board[2]?.[0]?.instanceId).toBe(symbols[2]!.instanceId);
    });

    it('charges the inflated reroll cost by knowledge level', () => {
        const harness = createHarness({
            level: 20,
            gold: 7,
            symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.wheat]!, SYMBOLS[S.wheat]!],
        });

        harness.actions.rerollSymbols();

        expect(harness.get().gold).toBe(2);
        expect(harness.get().rerollsThisTurn).toBe(1);
        expect(harness.get().symbolChoices).toHaveLength(3);
    });

    it('applies a legal knowledge upgrade and spends one research point', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 5,
        });

        harness.actions.selectUpgrade(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID);

        expect(harness.get().phase).toBe('selection');
        expect(harness.get().unlockedKnowledgeUpgrades).toContain(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID);
        expect(harness.get().bonusXpPerTurn).toBe(2);
        expect(harness.get().levelUpResearchPoints).toBe(0);
    });

    it('unlocks religion only when Theology is researched', () => {
        const fisheriesHarness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 5,
        });

        fisheriesHarness.actions.selectUpgrade(FISHERIES_UPGRADE_ID);

        expect(fisheriesHarness.get().unlockedKnowledgeUpgrades).toContain(FISHERIES_UPGRADE_ID);
        expect(fisheriesHarness.get().religionUnlocked).toBe(false);

        const theologyHarness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 5,
        });

        theologyHarness.actions.selectUpgrade(THEOLOGY_UPGRADE_ID);

        expect(theologyHarness.get().unlockedKnowledgeUpgrades).toContain(THEOLOGY_UPGRADE_ID);
        expect(theologyHarness.get().religionUnlocked).toBe(true);
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
            unlockedKnowledgeUpgrades: [ARCHERY_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(IRON_WORKING_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(IRON_WORKING_UPGRADE_ID);
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
