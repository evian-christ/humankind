import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSelectionFlowActions } from './selectionFlow';
import type { GameState } from '../gameStore';
import { useRelicStore } from '../relicStore';
import { SYMBOLS, S } from '../../data/symbolDefinitions';
import { getEnemyPoolForLevel } from '../../data/enemyPools';
import { RELIC_ID } from '../../logic/relics/relicIds';
import { RELICS } from '../../data/relicDefinitions';
import { createEmptyBoard, createInstance } from '../gameStoreHelpers';
import {
    AGI_PROJECT_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    CHIEFDOM_UPGRADE_ID,
    COLONIALISM_UPGRADE_ID,
    ELECTRICITY_UPGRADE_ID,
    ELECTION_SYSTEM_UPGRADE_ID,
    FEUDAL_CORN_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    GREAT_MIGRATION_UPGRADE_ID,
    GUNPOWDER_UPGRADE_ID,
    HUNTING_UPGRADE_ID,
    INQUISITION_UPGRADE_ID,
    IRON_WORKING_UPGRADE_ID,
    MECHANICS_UPGRADE_ID,
    MERCENARIES_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    NATIONALISM_UPGRADE_ID,
    NOMADIC_TRADITION_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    PLANTATION_UPGRADE_ID,
    RESTRUCTURING_UPGRADE_ID,
    SACRIFICIAL_RITE_UPGRADE_ID,
    STATE_LABOR_UPGRADE_ID,
    THEOLOGY_UPGRADE_ID,
    TOTAL_MOBILIZATION_UPGRADE_ID,
    TRIBAL_FEDERATION_UPGRADE_ID,
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
        qinCurrencyStandardTurnsRemaining: 0,
        levelUpResearchPoints: 0,
        isRelicShopOpen: false,
        hasNewRelicShopStock: false,
        rerollsThisTurn: 0,
        returnPhaseAfterDevKnowledgeUpgrade: null,
        barbarianSymbolThreat: 0,
        barbarianCampThreat: 0,
        naturalDisasterThreat: 0,
        pendingDevNaturalDisasterId: null,
        activeStatusIds: [],
        pendingNewThreatFloats: [],
        pendingOblivionFurnaceRelicId: null,
        pendingEdictSource: null,
        bonusSelectionQueue: [],
        forceTerrainInNextSymbolChoices: false,
        forceEventsInNextSymbolChoices: false,
        freeSelectionRerolls: 0,
        pendingFoodPayment: false,
        lootRewardChoices: [],
        pendingLootSlot: null,
        spinBoard: () => {},
        payFoodCost: () => {},
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
        devTriggerNaturalDisaster: () => {},
        confirmOblivionFurnaceDestroyAt: () => {},
        cancelOblivionFurnacePick: () => {},
        activateEdictAt: () => {},
        confirmEdictDestroyAt: () => {},
        cancelEdictPick: () => {},
        activateClickableRelic: () => {},
        butcherPastureAnimalAt: () => {},
        consumeTribalVillageAt: () => {},

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
        vi.useRealTimers();
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

    it('skips only the active tribal village selection while its second selection remains', () => {
        const harness = createHarness({
            bonusSelectionQueue: ['any', 'any'],
            symbolSelectionSymbolSourceId: S.tribal_village,
        });

        harness.actions.skipSelection();

        expect(harness.get().phase).toBe('selection');
        expect(harness.get().bonusSelectionQueue).toEqual(['any']);
        expect(harness.get().symbolChoices).toHaveLength(3);
        expect(harness.get().symbolSelectionSymbolSourceId).toBe(S.tribal_village);

        harness.actions.skipSelection();

        expect(harness.get().phase).toBe('idle');
        expect(harness.get().bonusSelectionQueue).toEqual([]);
        expect(harness.get().symbolSelectionSymbolSourceId).toBeNull();
    });

    it('moves to food payment after the final selection on a payment turn', () => {
        const harness = createHarness({
            pendingFoodPayment: true,
            symbolChoices: [SYMBOLS[S.plains]!, SYMBOLS[S.mountain]!, SYMBOLS[S.grassland]!],
        });

        harness.actions.selectSymbol(S.plains);

        expect(harness.get().phase).toBe('food_payment');
        expect(harness.get().pendingFoodPayment).toBe(true);
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
        expect(harness.get().rerollsThisTurn).toBe(1);
        expect(harness.get().symbolChoices).toHaveLength(3);
    });

    it('grants resources and summons 2 random current-level enemies when selecting Barbarian Suppression event', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const harness = createHarness({
            era: 3,
            level: 25,
            food: 5,
            gold: 7,
        });

        harness.actions.selectEvent(11);

        expect(harness.get().phase).toBe('idle');
        expect(harness.get().food).toBe(45);
        expect(harness.get().gold).toBe(47);
        expect(harness.get().playerSymbols.filter((sym) => sym.definition.id === S.enemy_infantry)).toHaveLength(2);
        expect(harness.get().playerSymbols.some((sym) => sym.definition.id === S.enemy_warrior)).toBe(false);
        expect(getEnemyPoolForLevel(1)).toContain(S.enemy_warrior);
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

    it('triggers Banana food, rainforest progress, and board floats for Jungle Expedition event', () => {
        const banana = createInstance(SYMBOLS[S.banana]!, []);
        const rainforest = createInstance(SYMBOLS[S.rainforest]!, []);
        const board = createEmptyBoard();
        board[1][1] = banana;
        board[2][1] = rainforest;

        const harness = createHarness({
            food: 3,
            board,
            playerSymbols: [banana, rainforest],
        });

        harness.actions.selectEvent(17);

        expect(harness.get().food).toBe(4);
        expect(harness.get().board[1]?.[1]?.effect_counter).toBe(1);
        expect(harness.get().lastEffects).toContainEqual({
            x: 1,
            y: 1,
            food: 1,
            gold: 0,
            knowledge: 0,
            counter: 1,
            counterAnchor: 'bottom-right',
        });
    });

    it('wraps Banana progress through Plantation threshold during Jungle Expedition event', () => {
        const banana = createInstance(SYMBOLS[S.banana]!, []);
        banana.effect_counter = 6;
        const rainforest = createInstance(SYMBOLS[S.rainforest]!, []);
        const board = createEmptyBoard();
        board[1][1] = banana;
        board[2][1] = rainforest;

        const harness = createHarness({
            food: 3,
            board,
            playerSymbols: [banana, rainforest],
            unlockedKnowledgeUpgrades: [PLANTATION_UPGRADE_ID],
        });

        harness.actions.selectEvent(17);

        expect(harness.get().food).toBe(4);
        expect(harness.get().board[1]?.[1]?.effect_counter).toBe(0);
        expect(harness.get().board[1]?.[1]?.banana_permanent_food_bonus).toBe(1);
        expect(harness.get().lastEffects.at(-1)).toMatchObject({
            x: 1,
            y: 1,
            food: 1,
            counter: 1,
        });
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
        expect(harness.get().knowledge).toBe(29);
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

    it('preserves Royal Colony event forcing when Capital Relocation destroys it', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const colony = createInstance(SYMBOLS[S.royal_colony]!, []);
        const other = createInstance(SYMBOLS[S.wild_seeds]!, []);
        const kept = createInstance(SYMBOLS[S.wheat]!, []);
        const symbols = [colony, other, kept];
        const board = createEmptyBoard();
        board[0][0] = colony;
        board[1][0] = other;
        board[2][0] = kept;
        const harness = createHarness({
            playerSymbols: symbols,
            board,
        });

        harness.actions.selectEvent(13);

        expect(harness.get().forceEventsInNextSymbolChoices).toBe(true);
    });

    it('charges the inflated reroll cost by knowledge level', () => {
        const harness = createHarness({
            level: 20,
            gold: 7,
            symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.wheat]!, SYMBOLS[S.wheat]!],
        });

        harness.actions.rerollSymbols();

        expect(harness.get().gold).toBe(4);
        expect(harness.get().rerollsThisTurn).toBe(1);
        expect(harness.get().symbolChoices).toHaveLength(3);
    });

    it('increases reroll cost within the same turn', () => {
        const harness = createHarness({
            level: 0,
            gold: 10,
            symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.wheat]!, SYMBOLS[S.wheat]!],
        });

        harness.actions.rerollSymbols();
        harness.actions.rerollSymbols();

        expect(harness.get().gold).toBe(7);
        expect(harness.get().rerollsThisTurn).toBe(2);
        expect(harness.get().symbolChoices).toHaveLength(3);
    });

    it('applies a legal knowledge upgrade and spends one research point', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 1,
        });

        harness.actions.selectUpgrade(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID);

        expect(harness.get().phase).toBe('selection');
        expect(harness.get().unlockedKnowledgeUpgrades).toContain(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID);
        expect(harness.get().levelUpResearchPoints).toBe(0);
    });

    it('keeps pre-transition upgrades researchable while transition research points remain', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 2,
            level: 10,
            unlockedKnowledgeUpgrades: [PASTORALISM_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(NOMADIC_TRADITION_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(NOMADIC_TRADITION_UPGRADE_ID);
        expect(harness.get().levelUpResearchPoints).toBe(1);
    });

    it('keeps an earlier research credit usable after researching an era transition first', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 2,
            level: 10,
            unlockedKnowledgeUpgrades: [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(FEUDALISM_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(FEUDALISM_UPGRADE_ID);
        expect(harness.get().levelUpResearchPoints).toBe(1);

        harness.actions.selectUpgrade(HUNTING_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(HUNTING_UPGRADE_ID);
        expect(harness.get().levelUpResearchPoints).toBe(0);
    });

    it('locks upgrades at or below the remaining research point cutoff', () => {
        const lockedHarness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 10,
        });

        lockedHarness.actions.selectUpgrade(HUNTING_UPGRADE_ID);

        expect(lockedHarness.get().unlockedKnowledgeUpgrades).not.toContain(HUNTING_UPGRADE_ID);
        expect(lockedHarness.get().levelUpResearchPoints).toBe(1);

        lockedHarness.actions.selectUpgrade(STATE_LABOR_UPGRADE_ID);

        expect(lockedHarness.get().unlockedKnowledgeUpgrades).not.toContain(STATE_LABOR_UPGRADE_ID);
        expect(lockedHarness.get().levelUpResearchPoints).toBe(1);

        const availableHarness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 10,
            unlockedKnowledgeUpgrades: [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
        });

        availableHarness.actions.selectUpgrade(FEUDALISM_UPGRADE_ID);

        expect(availableHarness.get().unlockedKnowledgeUpgrades).toContain(FEUDALISM_UPGRADE_ID);
        expect(availableHarness.get().levelUpResearchPoints).toBe(0);
    });

    it('does not lock earlier Ancient upgrades before an era transition', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 4,
        });

        harness.actions.selectUpgrade(HUNTING_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(HUNTING_UPGRADE_ID);
        expect(harness.get().levelUpResearchPoints).toBe(0);
    });

    it('keeps modern upgrades researchable after jumping to level 30 with unspent points', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 5,
            level: 30,
            unlockedKnowledgeUpgrades: [MODERN_AGE_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(ELECTRICITY_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(ELECTRICITY_UPGRADE_ID);
        expect(harness.get().levelUpResearchPoints).toBe(4);
    });

    it('grants the first selection reroll when Election System is researched', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 22,
            era: 3,
            gold: 0,
            unlockedKnowledgeUpgrades: [MODERN_AGE_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(ELECTION_SYSTEM_UPGRADE_ID);

        expect(harness.get().phase).toBe('selection');
        expect(harness.get().unlockedKnowledgeUpgrades).toContain(ELECTION_SYSTEM_UPGRADE_ID);
        expect(harness.get().freeSelectionRerolls).toBe(1);

        harness.actions.rerollSymbols();

        expect(harness.get().gold).toBe(0);
        expect(harness.get().freeSelectionRerolls).toBe(0);
        expect(harness.get().rerollsThisTurn).toBe(1);
        expect(harness.get().symbolChoices).toHaveLength(3);
    });

    it('blocks rerolls for tribal village symbol selections', () => {
        const originalChoices = [SYMBOLS[S.wheat]!, SYMBOLS[S.rice]!, SYMBOLS[S.stone]!];
        const harness = createHarness({
            symbolSelectionSymbolSourceId: S.tribal_village,
            gold: 7,
            symbolChoices: originalChoices,
        });

        harness.actions.rerollSymbols();

        expect(harness.get().gold).toBe(7);
        expect(harness.get().rerollsThisTurn).toBe(0);
        expect(harness.get().symbolChoices).toBe(originalChoices);
    });

    it('grants 3 Ancient Tribe Joins when Colonialism is researched', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 21,
            era: 3,
            unlockedKnowledgeUpgrades: [MODERN_AGE_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(COLONIALISM_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(COLONIALISM_UPGRADE_ID);
        expect(
            useRelicStore.getState().relics.filter((relic) => relic.definition.id === RELIC_ID.ANCIENT_TRIBE_JOIN),
        ).toHaveLength(3);
    });

    it('grants 2 Pioneers and 1 State Reorganization when Great Migration is researched', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 11,
            era: 2,
            unlockedKnowledgeUpgrades: [FEUDALISM_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(GREAT_MIGRATION_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(GREAT_MIGRATION_UPGRADE_ID);
        expect(
            useRelicStore.getState().relics.filter((relic) => relic.definition.id === RELIC_ID.ANCIENT_TRIBE_JOIN),
        ).toHaveLength(2);
        expect(
            useRelicStore.getState().relics.filter((relic) => relic.definition.id === RELIC_ID.OBLIVION_FURNACE),
        ).toHaveLength(1);
    });

    it.each([
        ['Tribal Federation', TRIBAL_FEDERATION_UPGRADE_ID, 4, [], 2],
        ['Mercenaries', MERCENARIES_UPGRADE_ID, 14, [FEUDALISM_UPGRADE_ID], 2],
        ['Total Mobilization', TOTAL_MOBILIZATION_UPGRADE_ID, 22, [MODERN_AGE_UPGRADE_ID], 4],
    ])('grants Military Levies when %s is researched', (_name, upgradeId, level, unlockedKnowledgeUpgrades, count) => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level,
            unlockedKnowledgeUpgrades,
        });

        harness.actions.selectUpgrade(upgradeId);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(upgradeId);
        expect(
            useRelicStore.getState().relics.filter((relic) => relic.definition.id === RELIC_ID.MILITARY_LEVY),
        ).toHaveLength(count);
    });

    it.each([
        ['Sacrificial Rite', SACRIFICIAL_RITE_UPGRADE_ID, 4, [], 3],
        ['Inquisition', INQUISITION_UPGRADE_ID, 14, [FEUDALISM_UPGRADE_ID], 3],
        ['Restructuring', RESTRUCTURING_UPGRADE_ID, 23, [MODERN_AGE_UPGRADE_ID], 3],
        ['Chiefdom', CHIEFDOM_UPGRADE_ID, 4, [], 1],
        ['State Labor', STATE_LABOR_UPGRADE_ID, 9, [], 1],
        ['Feudalism', FEUDAL_CORN_UPGRADE_ID, 14, [FEUDALISM_UPGRADE_ID], 1],
        ['Nationalism', NATIONALISM_UPGRADE_ID, 19, [FEUDALISM_UPGRADE_ID], 1],
    ])('grants Furnaces of Oblivion when %s is researched', (_name, upgradeId, level, unlockedKnowledgeUpgrades, count) => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level,
            unlockedKnowledgeUpgrades,
        });

        harness.actions.selectUpgrade(upgradeId);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(upgradeId);
        expect(
            useRelicStore.getState().relics.filter((relic) => relic.definition.id === RELIC_ID.OBLIVION_FURNACE),
        ).toHaveLength(count);
    });

    it('unlocks religion only when Theology is researched', () => {
        const fisheriesHarness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 2,
        });

        fisheriesHarness.actions.selectUpgrade(FISHERIES_UPGRADE_ID);

        expect(fisheriesHarness.get().unlockedKnowledgeUpgrades).toContain(FISHERIES_UPGRADE_ID);
        expect(fisheriesHarness.get().religionUnlocked).toBe(false);

        const theologyHarness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 7,
        });

        theologyHarness.actions.selectUpgrade(THEOLOGY_UPGRADE_ID);

        expect(theologyHarness.get().unlockedKnowledgeUpgrades).toContain(THEOLOGY_UPGRADE_ID);
        expect(theologyHarness.get().religionUnlocked).toBe(true);
    });

    it('does not improve already-owned warrior combat stats when Iron Working is researched', () => {
        const warrior = createInstance(SYMBOLS[S.warrior]!, []);
        const board = createEmptyBoard();
        board[0][0] = warrior;
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 3,
            playerSymbols: [warrior],
            board,
            unlockedKnowledgeUpgrades: [],
        });

        harness.actions.selectUpgrade(IRON_WORKING_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(IRON_WORKING_UPGRADE_ID);
        expect(harness.get().playerSymbols[0]?.definition.id).toBe(S.warrior);
        expect(harness.get().playerSymbols[0]?.definition.base_attack).toBe(3);
        expect(harness.get().playerSymbols[0]?.definition.base_hp).toBe(8);
        expect(harness.get().playerSymbols[0]?.enemy_hp).toBe(8);
        expect(harness.get().board[0]?.[0]?.definition.id).toBe(S.warrior);
        expect(harness.get().board[0]?.[0]?.definition.base_attack).toBe(3);
    });

    it('uses shared ranged combat stats for all ranged unit symbols', () => {
        const archer = createInstance(SYMBOLS[S.archer]!, []);
        const crossbowman = createInstance(SYMBOLS[S.crossbowman]!, []);
        const cannon = createInstance(SYMBOLS[S.cannon]!, []);

        expect([archer, crossbowman, cannon].map((symbol) => ({
            attack: symbol.definition.base_attack,
            hp: symbol.definition.base_hp,
        }))).toEqual([
            { attack: 2, hp: 4 },
            { attack: 2, hp: 4 },
            { attack: 2, hp: 4 },
        ]);
    });

    it('does not replace already-owned units when Stirrups is researched', () => {
        const warrior = createInstance(SYMBOLS[S.warrior]!, [IRON_WORKING_UPGRADE_ID]);
        const cavalry = createInstance(SYMBOLS[S.cavalry]!, [IRON_WORKING_UPGRADE_ID]);
        const board = createEmptyBoard();
        board[0][0] = warrior;
        board[1][0] = cavalry;
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 13,
            playerSymbols: [warrior, cavalry],
            board,
            unlockedKnowledgeUpgrades: [IRON_WORKING_UPGRADE_ID, FEUDALISM_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(GUNPOWDER_UPGRADE_ID);

        expect(harness.get().playerSymbols[0]?.definition.id).toBe(S.warrior);
        expect(harness.get().playerSymbols[1]?.definition.id).toBe(S.cavalry);
        expect(harness.get().playerSymbols.map((symbol) => ({
            attack: symbol.definition.base_attack,
            hp: symbol.definition.base_hp,
        }))).toEqual([
            { attack: 5, hp: 12 },
            { attack: 5, hp: 12 },
        ]);
        expect(harness.get().board[0]?.[0]?.definition.id).toBe(S.warrior);
        expect(harness.get().board[1]?.[0]?.definition.id).toBe(S.cavalry);
    });

    it('does not replace or restat an already-owned Archer when Mechanics is researched', () => {
        const archer = createInstance(SYMBOLS[S.archer]!, []);
        const board = createEmptyBoard();
        board[0][0] = archer;
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 13,
            playerSymbols: [archer],
            board,
            unlockedKnowledgeUpgrades: [FEUDALISM_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(MECHANICS_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(MECHANICS_UPGRADE_ID);
        expect(harness.get().playerSymbols[0]?.definition.id).toBe(S.archer);
        expect(harness.get().playerSymbols[0]?.definition.base_attack).toBe(2);
        expect(harness.get().playerSymbols[0]?.definition.base_hp).toBe(4);
        expect(harness.get().playerSymbols[0]?.enemy_hp).toBe(4);
        expect(harness.get().board[0]?.[0]?.definition.id).toBe(S.archer);
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

    it('returns to food payment when an oblivion furnace pick is cancelled during pending payment', () => {
        const relicDef = RELICS[RELIC_ID.OBLIVION_FURNACE]!;
        useRelicStore.getState().addRelic(relicDef);
        const relicInstanceId = useRelicStore.getState().relics[0]!.instanceId;
        const harness = createHarness({
            phase: 'oblivion_furnace_board',
            pendingFoodPayment: true,
            pendingOblivionFurnaceRelicId: relicInstanceId,
        });

        harness.actions.cancelOblivionFurnacePick();

        expect(harness.get().phase).toBe('food_payment');
        expect(harness.get().pendingOblivionFurnaceRelicId).toBeNull();
    });

    it('unlocks AGI Project without immediately granting AGI Core', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 30,
            era: 3,
            unlockedKnowledgeUpgrades: [MODERN_AGE_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(AGI_PROJECT_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(AGI_PROJECT_UPGRADE_ID);
        expect(harness.get().playerSymbols.some((sym) => sym.definition.id === S.agi_core)).toBe(false);
        expect(harness.get().levelUpResearchPoints).toBe(0);
    });

    it('blocks rerolls when MILITARY_LEVY selection is active', () => {
        const harness = createHarness({
            phase: 'selection',
            symbolSelectionRelicSourceId: RELIC_ID.MILITARY_LEVY,
            freeSelectionRerolls: 1,
            rerollsThisTurn: 0,
        });

        harness.actions.rerollSymbols();

        expect(harness.get().freeSelectionRerolls).toBe(1);
        expect(harness.get().rerollsThisTurn).toBe(0);
    });
});
