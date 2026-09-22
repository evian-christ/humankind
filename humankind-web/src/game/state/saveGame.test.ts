import { describe, expect, it, vi } from 'vitest';
import {
    AGRICULTURE_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
} from '../data/knowledgeUpgrades';
import { SYMBOLS, S } from '../data/symbolDefinitions';
import { DEFAULT_SYMBOL_SET_DECK_IDS } from '../data/symbolSets';
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
        knowledgeUpgradeFloats: [],
        religionUnlocked: false,
        unlockedKnowledgeUpgrades: [],
        levelUpResearchPoints: 0,
        rerollsThisTurn: 0,
        returnPhaseAfterDevKnowledgeUpgrade: null,
        naturalDisasterThreat: 0,
        pendingEdictSource: null,
        bonusSelectionQueue: [],
        forceTerrainInNextSymbolChoices: false,
        forceEventsInNextSymbolChoices: false,
        freeSelectionRerolls: 0,
        pendingFoodPayment: false,
    } as unknown as GameState;
};

describe('saveGameState', () => {
    it('restores all eight equipped symbol sets', () => {
        const localStorage = createLocalStorageMock();
        vi.stubGlobal('localStorage', localStorage);

        saveGameState({ ...createSerializableState(), symbolSetIds: [...DEFAULT_SYMBOL_SET_DECK_IDS] });
        expect(loadSavedGamePatch()?.symbolSetIds).toEqual(DEFAULT_SYMBOL_SET_DECK_IDS);

        vi.unstubAllGlobals();
    });

    it('restores the selected symbol set and leaves older saves without one', () => {
        const localStorage = createLocalStorageMock();
        vi.stubGlobal('localStorage', localStorage);

        saveGameState({ ...createSerializableState(), symbolSetId: 'faith' });
        expect(loadSavedGamePatch()?.symbolSetId).toBe('faith');

        const raw = localStorage.getItem('humankind.save.v1');
        const saved = JSON.parse(raw!);
        delete saved.state.symbolSetId;
        saved.version = 4;
        localStorage.setItem('humankind.save.v1', JSON.stringify(saved));
        expect(loadSavedGamePatch()?.symbolSetId).toBeNull();

        vi.unstubAllGlobals();
    });

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

    it('derives field levels when loading a pre-field save', () => {
        const localStorage = createLocalStorageMock();
        vi.stubGlobal('localStorage', localStorage);

        const state = createSerializableState();
        state.unlockedKnowledgeUpgrades = [AGRICULTURE_UPGRADE_ID, IRRIGATION_UPGRADE_ID];
        saveGameState(state);

        const raw = localStorage.getItem('humankind.save.v1');
        const saved = JSON.parse(raw!);
        saved.version = 2;
        delete saved.state.knowledgeUpgradeLevels;
        localStorage.setItem('humankind.save.v1', JSON.stringify(saved));

        const patch = loadSavedGamePatch();
        expect(patch?.knowledgeUpgradeLevels?.trade).toBe(0);
        expect(patch?.unlockedKnowledgeUpgrades).toEqual(
            expect.arrayContaining([AGRICULTURE_UPGRADE_ID, IRRIGATION_UPGRADE_ID]),
        );

        vi.unstubAllGlobals();
    });

    it('resumes an older save without reopening a removed shop', () => {
        const localStorage = createLocalStorageMock();
        vi.stubGlobal('localStorage', localStorage);

        saveGameState(createSerializableState());
        const saved = JSON.parse(localStorage.getItem('humankind.save.v1')!);
        saved.version = 3;
        saved.state.phase = 'relic_shop';
        saved.state.isRelicShopOpen = true;
        saved.state.relicChoices = [1, 2, 3];
        localStorage.setItem('humankind.save.v1', JSON.stringify(saved));

        const patch = loadSavedGamePatch();
        expect(patch?.phase).toBe('idle');
        expect(patch).not.toHaveProperty('relicChoices');

        vi.unstubAllGlobals();
    });
});
