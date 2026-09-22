import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInstance, createEmptyBoard } from '../gameStoreHelpers';
import { SYMBOLS, S } from '../../data/symbolDefinitions';
import { handleDisasterEffects } from '../../logic/symbolEffects/handlers/disasterEffects';
import { createEffectState } from '../../logic/symbolEffects/core';
import { createSelectionFlowActions } from './selectionFlow';
import type { GameState } from '../gameStore';
import type { PlayerSymbolInstance } from '../../types';

const runDisasterEffect = (
    symbolInstance: PlayerSymbolInstance,
    initialFood = 0,
) => {
    const state = createEffectState();
    state.food = initialFood;
    const handled = handleDisasterEffects({
        symbolInstance,
        boardGrid: createEmptyBoard(),
        x: 0,
        y: 0,
        ctx: { upgrades: [] },
        state,
        adj: [],
        upgrades: [],
    });
    return { handled, state };
};

describe('Disaster Plague (ID 78) Tests', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Plague creation and random counter assignment', () => {
        it('should assign effect_counter = 2 at the low end of the creation roll', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const plagueInstance = createInstance(SYMBOLS[S.plague]!, []);
            expect(plagueInstance.definition.id).toBe(S.plague);
            expect(plagueInstance.effect_counter).toBe(2);
        });

        it('should assign effect_counter = 4 at the high end of the creation roll', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            const plagueInstance = createInstance(SYMBOLS[S.plague]!, []);
            expect(plagueInstance.definition.id).toBe(S.plague);
            expect(plagueInstance.effect_counter).toBe(4);
        });
    });

    describe('Heatwave creation and random counter assignment', () => {
        it('should assign effect_counter = 4 at the low end of the creation roll', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const heatwaveInstance = createInstance(SYMBOLS[S.heatwave]!, []);
            expect(heatwaveInstance.definition.id).toBe(S.heatwave);
            expect(heatwaveInstance.effect_counter).toBe(4);
        });

        it('should assign effect_counter = 7 at the high end of the creation roll', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            const heatwaveInstance = createInstance(SYMBOLS[S.heatwave]!, []);
            expect(heatwaveInstance.definition.id).toBe(S.heatwave);
            expect(heatwaveInstance.effect_counter).toBe(7);
        });
    });

    describe('Plague turn resolution and destruction logic', () => {
        it('should decrement effect_counter by 1 each turn and NOT destroy when counter > 0', () => {
            const plagueInstance = createInstance(SYMBOLS[S.plague]!, []);
            plagueInstance.effect_counter = 3;
            plagueInstance.is_marked_for_destruction = false;

            const { handled } = runDisasterEffect(plagueInstance);

            expect(handled).toBe(true);
            expect(plagueInstance.effect_counter).toBe(2);
            expect(plagueInstance.is_marked_for_destruction).toBe(false);
        });

        it('should mark plague for destruction when counter reaches 0', () => {
            const plagueInstance = createInstance(SYMBOLS[S.plague]!, []);
            plagueInstance.effect_counter = 1;
            plagueInstance.is_marked_for_destruction = false;

            const { handled } = runDisasterEffect(plagueInstance);

            expect(handled).toBe(true);
            expect(plagueInstance.effect_counter).toBe(0);
            expect(plagueInstance.is_marked_for_destruction).toBe(true);
        });

    });

    describe('Plague selection blocking guard', () => {
        const makeState = (): GameState => {
            const board = createEmptyBoard();
            return {
                food: 0,
                gold: 10,
                knowledge: 0,
                level: 1,
                era: 1,
                turn: 1,
                board,
                playerSymbols: [],
                phase: 'selection',
                symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.corn]!],
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

        it('should allow selecting a symbol and rerolling if plague is NOT on the board', () => {
            const harness = createHarness({
                gold: 10,
                phase: 'selection',
                symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.corn]!],
            });

            harness.actions.rerollSymbols();
            expect(harness.get().rerollsThisTurn).toBe(1);

            harness.actions.selectSymbol(S.wheat);
            expect(harness.get().playerSymbols.some((s) => s.definition.id === S.wheat)).toBe(true);
        });

        it('should BLOCK selectSymbol when plague IS on the board', () => {
            const board = createEmptyBoard();
            board[0][0] = createInstance(SYMBOLS[S.plague]!, []);

            const harness = createHarness({
                board,
                phase: 'selection',
                isTurnSymbolSelection: true,
                symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.corn]!],
                playerSymbols: [],
            });

            harness.actions.selectSymbol(S.wheat);
            expect(harness.get().playerSymbols.length).toBe(0);
        });

        it('should BLOCK rerollSymbols when plague IS on the board', () => {
            const board = createEmptyBoard();
            board[0][0] = createInstance(SYMBOLS[S.plague]!, []);

            const harness = createHarness({
                board,
                gold: 10,
                phase: 'selection',
                isTurnSymbolSelection: true,
                symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.corn]!],
                rerollsThisTurn: 0,
            });

            harness.actions.rerollSymbols();
            expect(harness.get().rerollsThisTurn).toBe(0);
            expect(harness.get().gold).toBe(10);
        });

        it('should allow a tribal village selection when plague IS on the board', () => {
            const board = createEmptyBoard();
            board[0][0] = createInstance(SYMBOLS[S.plague]!, []);

            const harness = createHarness({
                board,
                phase: 'selection',
                isTurnSymbolSelection: false,
                symbolSelectionSymbolSourceId: S.tribal_village,
                bonusSelectionQueue: ['any', 'any'],
                symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.corn]!],
            });

            harness.actions.selectSymbol(S.wheat);

            expect(harness.get().playerSymbols.some((s) => s.definition.id === S.wheat)).toBe(true);
            expect(harness.get().phase).toBe('selection');
        });

        it('should reduce rerolled symbol choices to two when heatwave is on the board', () => {
            const board = createEmptyBoard();
            board[0][0] = createInstance(SYMBOLS[S.heatwave]!, []);

            const harness = createHarness({
                board,
                gold: 10,
                phase: 'selection',
                symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.corn]!, SYMBOLS[S.honey]!],
            });

            harness.actions.rerollSymbols();

            expect(harness.get().symbolChoices).toHaveLength(2);
        });
    });
});
