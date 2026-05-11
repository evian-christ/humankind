import { describe, expect, it, vi } from 'vitest';
import { SYMBOLS, S } from '../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../types';
import type { GameState } from './gameStore';
import { loadSavedGamePatch, saveGameState } from './saveGame';

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
});
