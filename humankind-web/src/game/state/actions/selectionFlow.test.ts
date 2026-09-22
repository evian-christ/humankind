import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSelectionFlowActions } from './selectionFlow';
import type { GameState } from '../gameStore';
import { SYMBOLS, S } from '../../data/symbolDefinitions';
import { createEmptyBoard, createInstance } from '../gameStoreHelpers';
import {
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    CURRENCY_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    GUILD_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    THEOLOGY_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';

const makeState = (): GameState => {
    const oral = createInstance(SYMBOLS[S.oral_tradition]!, []);
    const board = createEmptyBoard();
    board[2][1] = oral;

    return {
        food: 0,
        gold: 10,
        knowledge: 0,
        level: 1,
        era: 1,
        turn: 1,
        board,
        playerSymbols: [oral],
        phase: 'selection',
        symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.corn]!, SYMBOLS[S.honey]!],
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
        rerollsThisTurn: 0,
        returnPhaseAfterDevKnowledgeUpgrade: null,
        naturalDisasterThreat: 0,
        pendingDevNaturalDisasterId: null,
        activeStatusIds: [],
        pendingNewThreatFloats: [],
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

    it('triggers Banana food and board floats for Jungle Expedition event', () => {
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

        // 열대우림에 인접하므로 식량 +2.
        expect(harness.get().food).toBe(5);
        expect(harness.get().lastEffects).toContainEqual({
            x: 1,
            y: 1,
            food: 2,
            gold: 0,
            knowledge: 0,
        });
    });

    it('gives Banana only its base Food when no Rainforest is adjacent', () => {
        const banana = createInstance(SYMBOLS[S.banana]!, []);
        const board = createEmptyBoard();
        board[1][1] = banana;

        const harness = createHarness({
            food: 3,
            board,
            playerSymbols: [banana],
        });

        harness.actions.selectEvent(17);

        expect(harness.get().food).toBe(4);
        expect(harness.get().lastEffects).toContainEqual({
            x: 1,
            y: 1,
            food: 1,
            gold: 0,
            knowledge: 0,
        });
    });

    it('blinks random owned symbols before removing them for Capital Relocation event', async () => {
        vi.useFakeTimers();
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const symbols = [
            createInstance(SYMBOLS[S.oral_tradition]!, []),
            createInstance(SYMBOLS[S.wild_seeds]!, []),
            createInstance(SYMBOLS[S.wheat]!, []),
            createInstance(SYMBOLS[S.corn]!, []),
            createInstance(SYMBOLS[S.honey]!, []),
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
        expect(harness.get().board[0]?.[0]?.is_marked_for_destruction).toBe(true);
        expect(harness.get().board[1]?.[0]?.is_marked_for_destruction).toBe(true);
        expect(harness.get().destroyRemovalBlinkStartedAtMs).not.toBeNull();
        expect(harness.get().board[2]?.[0]?.instanceId).toBe(symbols[2]!.instanceId);

        await vi.advanceTimersByTimeAsync(360);

        expect(harness.get().board[0]?.[0]).toBeNull();
        expect(harness.get().board[1]?.[0]).toBeNull();
        expect(harness.get().destroyRemovalBlinkStartedAtMs).toBeNull();
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
        expect(harness.get().knowledgeUpgradeLevels?.era).toBe(1);
        expect(harness.get().levelUpResearchPoints).toBe(0);
        expect(harness.get().pendingBoardExpansions).toBe(3);
    });

    it('keeps pre-transition upgrades researchable while transition research points remain', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 2,
            level: 10,
            unlockedKnowledgeUpgrades: [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(PASTORALISM_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(PASTORALISM_UPGRADE_ID);
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
        expect(harness.get().pendingBoardExpansions).toBe(3);

        harness.actions.selectUpgrade(PASTORALISM_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(PASTORALISM_UPGRADE_ID);
        expect(harness.get().levelUpResearchPoints).toBe(0);
    });

    it('grants three board expansions when entering the Modern Age', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 20,
            unlockedKnowledgeUpgrades: [FEUDALISM_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(MODERN_AGE_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(MODERN_AGE_UPGRADE_ID);
        expect(harness.get().levelUpResearchPoints).toBe(0);
        expect(harness.get().pendingBoardExpansions).toBe(3);
    });

    it('lets a saved point research any eligible field at the current level', () => {
        const lockedHarness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 10,
        });

        lockedHarness.actions.selectUpgrade(CURRENCY_UPGRADE_ID);

        expect(lockedHarness.get().unlockedKnowledgeUpgrades).not.toContain(CURRENCY_UPGRADE_ID);
        expect(lockedHarness.get().levelUpResearchPoints).toBe(1);

        lockedHarness.actions.selectUpgrade(PASTORALISM_UPGRADE_ID);

        expect(lockedHarness.get().unlockedKnowledgeUpgrades).toContain(PASTORALISM_UPGRADE_ID);
        expect(lockedHarness.get().levelUpResearchPoints).toBe(0);

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

    it('researches Trade without the removed symbol-unlock stages', () => {
        const harness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 14,
            unlockedKnowledgeUpgrades: [FEUDALISM_UPGRADE_ID],
        });

        harness.actions.selectUpgrade(FOREIGN_TRADE_UPGRADE_ID);
        harness.actions.selectUpgrade(CURRENCY_UPGRADE_ID);
        expect(harness.get().unlockedKnowledgeUpgrades).not.toContain(FOREIGN_TRADE_UPGRADE_ID);
        expect(harness.get().unlockedKnowledgeUpgrades).not.toContain(CURRENCY_UPGRADE_ID);
        harness.actions.selectUpgrade(GUILD_UPGRADE_ID);

        expect(harness.get().unlockedKnowledgeUpgrades).toContain(GUILD_UPGRADE_ID);
        expect(harness.get().knowledgeUpgradeLevels?.trade).toBe(1);
        expect(harness.get().levelUpResearchPoints).toBe(0);
    });

    /**
     * AGI 프로젝트는 단순화된 업그레이드 카드 구조에서 제외했다.
     * 승리 심볼 로직은 유지하지만, 연구 카드로 다시 넣을 때 테스트도 함께 복원한다.
     */

    /**
     * 선거제도(무료 리롤) 카드를 트리에서 걷어내면서 해당 검증도 제거했다.
     * `freeSelectionRerolls` 소비 로직은 살아 있으므로, 카드를 다시 넣을 때 테스트도 함께 복원한다.
     */

    it('blocks rerolls for tribal village symbol selections', () => {
        const originalChoices = [SYMBOLS[S.wheat]!, SYMBOLS[S.corn]!, SYMBOLS[S.honey]!];
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

    it('does not offer removed unlock-only research', () => {
        const otherHarness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 3,
        });

        otherHarness.actions.selectUpgrade(FOREIGN_TRADE_UPGRADE_ID);

        expect(otherHarness.get().unlockedKnowledgeUpgrades).not.toContain(FOREIGN_TRADE_UPGRADE_ID);
        expect(otherHarness.get().religionUnlocked).toBe(false);

        const theologyHarness = createHarness({
            phase: 'idle',
            levelUpResearchPoints: 1,
            level: 7,
        });

        theologyHarness.actions.selectUpgrade(THEOLOGY_UPGRADE_ID);

        expect(theologyHarness.get().unlockedKnowledgeUpgrades).not.toContain(THEOLOGY_UPGRADE_ID);
        expect(theologyHarness.get().religionUnlocked).toBe(false);
    });

    /**
     * AGI 프로젝트는 단순화된 업그레이드 카드 구조에서 제외했다.
     * 승리 심볼 로직은 유지하지만, 연구 카드로 다시 넣을 때 테스트도 함께 복원한다.
     */

});
