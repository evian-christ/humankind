import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInstance, createEmptyBoard } from '../gameStoreHelpers';
import { SYMBOLS, S } from '../../data/symbolDefinitions';
import { handleDisasterEffects } from '../../logic/symbolEffects/handlers/disasterEffects';
import { createSelectionFlowActions } from './selectionFlow';
import type { GameState } from '../gameStore';

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

            const stateMock = { food: 0 } as any;
            const handled = handleDisasterEffects({
                symbolInstance: plagueInstance,
                relicEffects: {},
                state: stateMock,
            } as any);

            expect(handled).toBe(true);
            expect(plagueInstance.effect_counter).toBe(2);
            expect(plagueInstance.is_marked_for_destruction).toBe(false);
        });

        it('should mark plague for destruction when counter reaches 0', () => {
            const plagueInstance = createInstance(SYMBOLS[S.plague]!, []);
            plagueInstance.effect_counter = 1;
            plagueInstance.is_marked_for_destruction = false;

            const stateMock = { food: 0 } as any;
            const handled = handleDisasterEffects({
                symbolInstance: plagueInstance,
                relicEffects: {},
                state: stateMock,
            } as any);

            expect(handled).toBe(true);
            expect(plagueInstance.effect_counter).toBe(0);
            expect(plagueInstance.is_marked_for_destruction).toBe(true);
        });

        it('should scale food by +2 if terraFossilDisasterFood relic effect is active', () => {
            const plagueInstance = createInstance(SYMBOLS[S.plague]!, []);
            plagueInstance.effect_counter = 2;

            const stateMock = { food: 10 } as any;
            const handled = handleDisasterEffects({
                symbolInstance: plagueInstance,
                relicEffects: { terraFossilDisasterFood: true },
                state: stateMock,
            } as any);

            expect(handled).toBe(true);
            expect(stateMock.food).toBe(12);
        });
    });

    describe('Plague selection blocking guard', () => {
        const makeState = (): GameState => {
            const board = createEmptyBoard();
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
                playerSymbols: [],
                phase: 'selection',
                symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.rice]!],
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
                confirmDestroySymbols: () => {},
                finishDestroySelection: () => {},
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

        it('should allow selecting a symbol and rerolling if plague is NOT on the board', () => {
            const harness = createHarness({
                gold: 10,
                phase: 'selection',
                symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.rice]!],
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
                symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.rice]!],
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
                symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.rice]!],
                rerollsThisTurn: 0,
            });

            harness.actions.rerollSymbols();
            expect(harness.get().rerollsThisTurn).toBe(0);
            expect(harness.get().gold).toBe(10);
        });

        it('should allow a relic selection when plague IS on the board', () => {
            const board = createEmptyBoard();
            board[0][0] = createInstance(SYMBOLS[S.plague]!, []);

            const harness = createHarness({
                board,
                phase: 'selection',
                isTurnSymbolSelection: false,
                symbolSelectionRelicSourceId: 19,
                symbolChoices: [SYMBOLS[S.plains]!, SYMBOLS[S.mountain]!],
            });

            harness.actions.selectSymbol(S.plains);

            expect(harness.get().playerSymbols.some((s) => s.definition.id === S.plains)).toBe(true);
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
                symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.rice]!],
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
                symbolChoices: [SYMBOLS[S.wheat]!, SYMBOLS[S.rice]!, SYMBOLS[S.stone]!],
            });

            harness.actions.rerollSymbols();

            expect(harness.get().symbolChoices).toHaveLength(2);
        });
    });
});
