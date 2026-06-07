import { describe, expect, it, vi } from 'vitest';
import { IRON_WORKING_UPGRADE_ID } from '../data/knowledgeUpgrades';
import { SYMBOLS, S } from '../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../types';
import type { GameState } from './gameStore';
import { hasSavedGame, loadSavedGamePatch, saveGameState } from './saveGame';

const createLocalStorageMock = () => {
    const data = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => data.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            data.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
            data.delete(key);
        }),
        clear: vi.fn(() => {
            data.clear();
        }),
    };
};

const createEmptyBoard = (): (PlayerSymbolInstance | null)[][] =>
    Array.from({ length: 5 }, () => Array.from({ length: 4 }, () => null));

const createSymbol = (id: number, instanceId: string): PlayerSymbolInstance => ({
    definition: SYMBOLS[id]!,
    instanceId,
    effect_counter: 0,
    is_marked_for_destruction: false,
});

const createSerializableState = (): GameState => {
    const symbol = createSymbol(S.wheat, 'symbol_wheat');
    const board = createEmptyBoard();
    board[0][0] = symbol;

    return {
        leaderId: 'shihuang',
        leaderProgressLevel: 1,
        lastLeaderProgressAward: null,
        food: 12,
        gold: 3,
        knowledge: 7,
        level: 1,
        era: 1,
        turn: 4,
        phase: 'selection',
        board,
        playerSymbols: [symbol],
        symbolChoices: [],
        symbolSelectionRelicSourceId: null,
        relicChoices: [],
        relicHalfPriceRelicId: null,
        lastEffects: [{ x: 0, y: 0, food: 1, gold: 2, knowledge: 3, counter: 1 }],
        counterDisplayOverrides: [],
        runningTotals: { food: 0, gold: 0, knowledge: 0 },
        activeSlot: null,
        activeContributors: [],
        pendingContributors: [],
        effectPhase: null,
        effectPhase3ReachedThisRun: false,
        eventLog: [],
        prevBoard: board,
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
        pendingNewThreatFloats: [],
        pendingDestroySource: null,
        pendingOblivionFurnaceRelicId: null,
        pendingEdictSource: null,
        bonusSelectionQueue: [],
        edictRemovalPending: false,
        forceTerrainInNextSymbolChoices: false,
        forceEventsInNextSymbolChoices: false,
        freeSelectionRerolls: 0,
        destroySelectionMaxSymbols: 3,
        territorialAfterEdictPending: false,
        pendingFoodPayment: false,
    } as unknown as GameState;
};

describe('saveGameState', () => {
    it('does not persist one-shot board effect floats into continue saves', () => {
        const localStorage = createLocalStorageMock();
        vi.stubGlobal('localStorage', localStorage);

        saveGameState(createSerializableState());

        const raw = localStorage.getItem('humankind.save.v1');
        expect(raw).toBeTruthy();
        const saved = JSON.parse(raw!);
        expect(saved.state.lastEffects).toEqual([]);

        const patch = loadSavedGamePatch();
        expect(patch?.lastEffects).toEqual([]);

        vi.unstubAllGlobals();
    });

    it.each(['game_over', 'victory'] as const)('clears terminal %s saves instead of continuing them', (phase) => {
        const localStorage = createLocalStorageMock();
        vi.stubGlobal('localStorage', localStorage);

        saveGameState(createSerializableState());
        expect(hasSavedGame()).toBe(true);

        saveGameState({
            ...createSerializableState(),
            phase,
        });

        expect(localStorage.getItem('humankind.save.v1')).toBeNull();
        expect(hasSavedGame()).toBe(false);
        expect(loadSavedGamePatch()).toBeNull();

        vi.unstubAllGlobals();
    });

    it('restores Iron Working warrior stats from unlocked upgrades', () => {
        const localStorage = createLocalStorageMock();
        vi.stubGlobal('localStorage', localStorage);

        const warrior = {
            ...createSymbol(S.warrior, 'symbol_warrior'),
            enemy_hp: 10,
        };
        const state = createSerializableState();
        state.playerSymbols = [warrior];
        state.board = createEmptyBoard();
        state.board[0][0] = warrior;
        state.prevBoard = state.board;
        state.unlockedKnowledgeUpgrades = [IRON_WORKING_UPGRADE_ID];

        saveGameState(state);

        const patch = loadSavedGamePatch();
        expect(patch?.playerSymbols?.[0]?.definition.id).toBe(S.warrior);
        expect(patch?.playerSymbols?.[0]?.definition.base_attack).toBe(5);
        expect(patch?.playerSymbols?.[0]?.definition.base_hp).toBe(12);
        expect(patch?.playerSymbols?.[0]?.enemy_hp).toBe(10);

        vi.unstubAllGlobals();
    });
});
