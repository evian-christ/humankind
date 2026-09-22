import { t } from '../../../i18n';
import {
    recordDemoFoodPaymentTurn,
    recordDemoGameCompletion,
} from '../../data/demoAchievements';
import { SYMBOLS, S, SymbolType, type SymbolDefinition } from '../../data/symbolDefinitions';
import { createActiveStatusesForTurn, getActiveStatusIdsFromStates } from '../../data/statusDefinitions';
import { useSettingsStore, type EffectSpeed } from '../settingsStore';
import {
    applyKnowledgeAndLevelUps,
} from '../../logic/progression/eraTransition';
import {
    generateChoices as generateChoicesSelection,
} from '../../logic/selection/selectionLogic';
import { runPostEffectsHooks } from '../../logic/turn/postEffectsHooks';
import { resolveTurnEndPhase } from '../../logic/turn/phaseResolution';
import { prepareTurn } from '../../logic/turn/turnPreparation';
import { createMathRng } from '../../logic/turn/rng';
import {
    applyGeneratedSymbols,
    applySlotEffectResult,
    applyUnplacedHorseEffects,
    collectRemovedSymbolInstanceIds,
    completeSlotEffects,
    computeUnplacedHorseEffects,
    computeTurnStartBaseTotals,
    createSlotEffectPipeline,
    removeMarkedSymbolsFromBoard,
    resolveSlotEffect,
    commitLootMerge,
    type ProcessSlotArgs,
} from '../../logic/turn/turnPipeline';
import {
    getBoardExpansionCandidates,
    getRemainingBoardExpansionCapacity,
    getStandardSymbolChoiceCount,
    hasDesertOnlyTerrainSymbols,
} from '../gameStoreHelpers';
import type { PlayerSymbolInstance } from '../../types';
import { buildSlotEffectPresentationPlan } from './turnPresentationTimeline';
import { createTurnRunScheduler } from './turnRunScheduler';
import { clearSavedGame, saveGameState } from '../saveGame';
import {
    calculateFoodCost,
    getEraFromLevel,
    getHudTurnStartPassiveTotals,
    getKnowledgeRequiredForLevel,
} from '../gameCalculations';
import type { GamePhase, GameState } from '../gameStore';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
export type GameStoreGet = () => GameState;

const getSelectionPhaseFreeRerollFloor = (_upgrades: readonly number[]): number => 0;

const DESTROY_REMOVAL_BLINK_DURATION_MS: Record<EffectSpeed, number> = {
    '1x': 360,
    '2x': 240,
    '4x': 120,
    '8x': 60,
};

const EARTHQUAKE_SHAKE_DURATION_MS: Record<EffectSpeed, number> = {
    '1x': 360,
    '2x': 240,
    '4x': 120,
    '8x': 60,
};

const getNowMs = () =>
    typeof globalThis.performance !== 'undefined' && typeof globalThis.performance.now === 'function'
        ? globalThis.performance.now()
        : Date.now();

const collectMarkedSymbolSnapshots = (board: GameState['board']) => {
    const snapshots: Array<{ id: number; instanceId: string; x: number; y: number }> = [];
    for (let x = 0; x < board.length; x++) {
        const col = board[x];
        if (!col) continue;
        for (let y = 0; y < col.length; y++) {
            const symbol = col[y];
            if (!symbol?.is_marked_for_destruction) continue;
            snapshots.push({
                id: symbol.definition.id,
                instanceId: symbol.instanceId,
                x,
                y,
            });
        }
    }
    return snapshots;
};

const getDestructionSourceSymbolId = (snapshots: ReturnType<typeof collectMarkedSymbolSnapshots>) =>
    snapshots.find((snapshot) => SYMBOLS[snapshot.id]?.type === SymbolType.DISASTER)?.id;

interface TurnFlowDeps {
    get: GameStoreGet;
    set: GameStoreSet;
    boardWidth: number;
    boardHeight: number;
    processSingleSymbolEffects: (
        symbol: PlayerSymbolInstance,
        board: (PlayerSymbolInstance | null)[][],
        x: number,
        y: number,
        effectCtx: { upgrades: number[]; allSymbolsAdjacent?: boolean },
        disabledTerrainCoords?: ReadonlySet<string>,
    ) => ReturnType<typeof import('../../logic/symbolEffects').processSingleSymbolEffects>;
    createInstance: (def: SymbolDefinition, unlockedUpgrades?: readonly number[]) => PlayerSymbolInstance;
    getAdjacentCoords: (x: number, y: number) => { x: number; y: number }[];
}

export const createTurnFlowActions = (deps: TurnFlowDeps) => {
    const {
        get,
        set,
        processSingleSymbolEffects,
        createInstance,
        getAdjacentCoords,
    } = deps;
    const turnRuns = createTurnRunScheduler();
    const recordTerminalGameCompletion = (outcome: 'game_over' | 'victory') => {
        if (!get().isTutorialMode) recordDemoGameCompletion(outcome);
    };

    const completeTurnEnd = () => {
        const state = get();
        const phaseResolution = resolveTurnEndPhase({
            turn: state.turn,
            food: state.food,
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'turn_end',
            delta: { food: phaseResolution.foodDelta, gold: 0, knowledge: 0 },
            meta: {
                action: 'resolve_turn_end',
                nextPhase: phaseResolution.nextPhase,
                isFoodPaymentTurn: phaseResolution.isFoodPaymentTurn,
            },
        });

        if (phaseResolution.nextPhase === 'game_over') {
            recordTerminalGameCompletion('game_over');
            set({ phase: 'game_over' as GamePhase });
            clearSavedGame();
            return;
        }

        if (phaseResolution.foodDelta !== 0) {
            set((current) => ({ food: current.food + phaseResolution.foodDelta }));
        }

        if (phaseResolution.isFoodPaymentTurn) recordDemoFoodPaymentTurn(state.turn);

        const nextActiveStatuses = createActiveStatusesForTurn(state.turn);
        const statusPatch = {
            activeStatuses: nextActiveStatuses,
            activeStatusIds: getActiveStatusIdsFromStates(nextActiveStatuses),
        };

        set({
            ...statusPatch,
            phase: 'selection' as GamePhase,
            symbolSelectionSymbolSourceId: null,
            isTurnSymbolSelection: true,
            freeSelectionRerolls: Math.max(
                state.freeSelectionRerolls ?? 0,
                getSelectionPhaseFreeRerollFloor(state.unlockedKnowledgeUpgrades ?? []),
            ),
        });
        saveGameState(get());
    };

    return {
    payFoodCost: () => {
        const state = get();
        if (state.phase !== 'food_payment' || !state.pendingFoodPayment) return;

        const foodCost = calculateFoodCost(state.turn);
        if (state.food < foodCost) {
            get().appendEventLog({
                turn: state.turn,
                kind: 'turn_end',
                delta: { food: 0, gold: 0, knowledge: 0 },
                meta: { action: 'food_payment_failed', foodCost },
            });
            recordTerminalGameCompletion('game_over');
            set({ phase: 'game_over' as GamePhase, pendingFoodPayment: false });
            clearSavedGame();
            return;
        }

        set({
            food: state.food - foodCost,
            phase: 'board_expansion_ready' as GamePhase,
            pendingFoodPayment: false,
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'turn_end',
            delta: { food: -foodCost, gold: 0, knowledge: 0 },
            meta: { action: 'food_payment', foodCost },
        });
        recordDemoFoodPaymentTurn(state.turn);
        saveGameState(get());
    },
    claimBoardExpansion: () => {
        const state = get();
        if (state.phase !== 'board_expansion_ready') return;

        if (getBoardExpansionCandidates(state.board).length === 0) {
            set({ phase: 'selection' as GamePhase, isTurnSymbolSelection: true });
            saveGameState(get());
            return;
        }

        // 사막 효과: 지형이 사막/오아시스뿐이면 식량 지불 확장을 1회 더 받는다.
        const desertBonusExpansions = hasDesertOnlyTerrainSymbols(state.playerSymbols) ? 1 : 0;
        const grantedExpansions = Math.min(
            1 + desertBonusExpansions,
            getRemainingBoardExpansionCapacity(state.board),
        );

        set({
            phase: 'board_expansion_placement' as GamePhase,
            pendingBoardExpansions: state.pendingBoardExpansions + grantedExpansions,
        });
        saveGameState(get());
    },
    spinBoard: () => {
        const state = get();
        const currentBoardWidth = state.board.length;
        const currentBoardHeight = Math.max(0, ...state.board.map((col) => col.length));
        if (state.pendingBoardExpansions > 0) return;
        if (state.phase !== 'idle') return;
        turnRuns.cancelCurrent();

        get().appendEventLog({ turn: state.turn + 1, kind: 'turn_start' });

        const prepared = prepareTurn({
            board: state.board,
            playerSymbols: state.playerSymbols,
            turn: state.turn,
            level: state.level,
            era: state.era,
            boardWidth: currentBoardWidth,
            boardHeight: currentBoardHeight,
            unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades || [],
            threatState: {
                naturalDisasterThreat: state.naturalDisasterThreat,
            },
            rng: createMathRng(),
            createSymbolInstance: createInstance,
            getThreatLabel: (key) => t(key, useSettingsStore.getState().language),
            forcedNaturalDisasterId: state.pendingDevNaturalDisasterId,
        });

        set({
            playerSymbols: prepared.playerSymbols,
            naturalDisasterThreat: prepared.threatState.naturalDisasterThreat,
            pendingDevNaturalDisasterId: null,
            pendingNewThreatFloats: prepared.pendingNewThreatFloats,
            prevBoard: prepared.prevBoard,
            board: prepared.board,
            turn: prepared.turn,
            pendingFoodPayment: prepared.turn > 0 && prepared.turn % 10 === 0,
            phase: 'spinning',
            lastEffects: [],
            counterDisplayOverrides: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
            effectPhase: null,
            effectPhase3ReachedThisRun: false,
            destroyRemovalBlinkStartedAtMs: null,
            earthquakeFx: null,
            lootMergeFx: null,
            rerollsThisTurn: 0,
        });

        if (prepared.pendingNewThreatFloats.length > 0) {
            const threatSymbols = prepared.pendingNewThreatFloats.flatMap((threat) => {
                const symbol = prepared.board[threat.x]?.[threat.y];
                return symbol
                    ? [{
                          id: symbol.definition.id,
                          instanceId: symbol.instanceId,
                          x: threat.x,
                          y: threat.y,
                          key: threat.key,
                          label: threat.label,
                      }]
                    : [];
            });
            const firstThreat = threatSymbols[0];
            get().appendEventLog({
                turn: prepared.turn,
                kind: 'threat',
                symbolId: firstThreat?.id,
                meta: {
                    action: 'threat_added',
                    threatKeys: [...new Set(threatSymbols.map((threat) => threat.key))],
                    threatLabels: [...new Set(threatSymbols.map((threat) => threat.label))],
                    threatSymbols,
                },
            });
        }
        saveGameState(get());
    },

    startProcessing: () => {
        const state = get();
        const currentBoardWidth = state.board.length;
        const currentBoardHeight = Math.max(0, ...state.board.map((col) => col.length));
        if (state.isTutorialMode && state.tutorialSpinStep === 'monument_spin') {
            set({ tutorialSpinStep: 'monument_processing' });
        }
        if (state.isTutorialMode && state.tutorialSpinStep === 'adjacency_spin') {
            set({ tutorialSpinStep: 'adjacency_processing' });
        }
        if (state.pendingNewThreatFloats?.length) {
            set({ phase: 'showing_new_threats' });
            return;
        }
        const turnRun = turnRuns.startRun();
        const baseTotals = computeTurnStartBaseTotals({
            state,
            getHudTurnStartPassiveTotals,
        });
        const startFood = baseTotals.food;
        const startGold = baseTotals.gold;
        const startKnowledge = baseTotals.knowledge;
        set({
            phase: 'processing',
            effectPhase3ReachedThisRun: false,
            destroyRemovalBlinkStartedAtMs: null,
            earthquakeFx: null,
            lootMergeFx: null,
            runningTotals: { food: startFood, gold: startGold, knowledge: startKnowledge },
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'processing_start',
            meta: { base: { food: startFood, gold: startGold, knowledge: startKnowledge } },
        });

        const slotPipeline = createSlotEffectPipeline({
            board: get().board,
            boardWidth: currentBoardWidth,
            boardHeight: currentBoardHeight,
            baseTotals,
        });
        const effectCtx = {
            upgrades: (state.unlockedKnowledgeUpgrades || []).map((id) => Number(id)),
            allSymbolsAdjacent: slotPipeline.allSymbolsAdjacent,
        };
        const slotEffectDeps = {
            processSingleSymbolEffects: (args: ProcessSlotArgs) =>
                processSingleSymbolEffects(
                    args.symbol,
                    args.board,
                    args.x,
                    args.y,
                    args.effectCtx,
                    args.disabledTerrainCoords,
                ),
        };

        const finishProcessing = (
            tFood: number,
            tKnowledge: number,
            tGold: number,
            toAdd: number[],
            toSpawn: number[],
            effects: GameState['lastEffects'],
        ) => {
            const stateAtFinish = get();
            get().appendEventLog({
                turn: stateAtFinish.turn,
                kind: 'processing_end',
                meta: { totals: { food: tFood, gold: tGold, knowledge: tKnowledge } },
            });
            const currentBoard = get().board;
            const post = runPostEffectsHooks({
                board: currentBoard,
                boardWidth: currentBoardWidth,
                boardHeight: currentBoardHeight,
                effects,
            });

            const bonusFood = post.bonusFood;
            const bonusGold = post.bonusGold;
            const bonusKnowledge = post.bonusKnowledge;
            const bonusAddSymbolIds = post.addSymbolIds;
            const agiVictory = post.agiVictory;
            const knowledgeOwnEffectFloats = post.knowledgeOwnEffectFloats;

            set({
                lastEffects: [...effects],
                runningTotals: {
                    food: tFood + bonusFood,
                    gold: tGold + bonusGold,
                    knowledge: tKnowledge + bonusKnowledge,
                },
            });

            const runFinishProcessingTail = () => {
                if (!turnRun.isActive()) return;

                const destroyedBeforeFinish = collectMarkedSymbolSnapshots(get().board);
                const blinkDurationMs = DESTROY_REMOVAL_BLINK_DURATION_MS[useSettingsStore.getState().effectSpeed];
                if (
                    destroyedBeforeFinish.length > 0 &&
                    !get().destroyRemovalBlinkStartedAtMs &&
                    blinkDurationMs > 0
                ) {
                    set({
                        activeSlot: null,
                        activeContributors: [],
                        pendingContributors: [],
                        effectPhase: null,
                        counterDisplayOverrides: [],
                        earthquakeFx: null,
                        lootMergeFx: null,
                        destroyRemovalBlinkStartedAtMs: getNowMs(),
                    });
                    turnRun.schedule(blinkDurationMs, runFinishProcessingTail);
                    return;
                }

                const destroyedDuringProcessing = collectMarkedSymbolSnapshots(get().board);

                set((prev) => {
                    const finishUpgrades = prev.unlockedKnowledgeUpgrades || [];
                    const finalRunningTotals = {
                        food: tFood + bonusFood,
                        gold: tGold + bonusGold,
                        knowledge: tKnowledge + bonusKnowledge,
                    };
                    const prog = applyKnowledgeAndLevelUps(
                        {
                            level: prev.level,
                            knowledge: prev.knowledge,
                            deltaKnowledge: finalRunningTotals.knowledge,
                            getEraFromLevel,
                        },
                        getKnowledgeRequiredForLevel,
                    );
                    const cleanBoard = removeMarkedSymbolsFromBoard(prev.board);
                    const generated = applyGeneratedSymbols({
                        board: cleanBoard,
                        playerSymbols: prev.playerSymbols,
                        symbolsToSpawnOnBoard: toSpawn,
                        symbolsToAdd: [...toAdd, ...bonusAddSymbolIds],
                        symbolDefinitions: SYMBOLS,
                        unlockedKnowledgeUpgrades: finishUpgrades,
                        boardWidth: currentBoardWidth,
                        boardHeight: currentBoardHeight,
                        createSymbolInstance: createInstance,
                    });

                    const effectDestroyedIds = collectRemovedSymbolInstanceIds(prev.board, cleanBoard);
                    const effectDestroyedSymbols = generated.playerSymbols.filter(
                        (s) => effectDestroyedIds.has(s.instanceId) || s.is_marked_for_destruction,
                    );
                    const forceTerrainForNextChoices =
                        prev.forceTerrainInNextSymbolChoices ||
                        effectDestroyedSymbols.some((s) => s.definition.id === S.pioneer);
                    const forceEventsForNextChoices =
                        prev.forceEventsInNextSymbolChoices ||
                        effectDestroyedSymbols.some((s) => s.definition.id === S.royal_colony);
                    const filteredSymbols = generated.playerSymbols.filter((s) => !effectDestroyedIds.has(s.instanceId));
                    const selCtx = {
                        era: prog.newEra,
                        religionUnlocked: prev.religionUnlocked,
                        upgrades: (prev.unlockedKnowledgeUpgrades || []).map(Number),
                        symbolSetId: prev.symbolSetId,
                        symbolSetIds: prev.symbolSetIds,
                        ownedSymbolDefIds: prev.playerSymbols.map((s) => s.definition.id),
                        choiceCount: getStandardSymbolChoiceCount(generated.board),
                        forceTerrainInNextSymbolChoices: forceTerrainForNextChoices,
                        forceEventsInNextSymbolChoices: forceEventsForNextChoices,
                    };
                    const nextChoiceRes = generateChoicesSelection(selCtx);
                    const nextPhase: GamePhase = agiVictory ? 'victory' : 'processing';

                    return {
                        food: prev.food + finalRunningTotals.food,
                        gold: prev.gold + finalRunningTotals.gold,
                        knowledge: prog.newKnowledge,
                        level: prog.newLevel,
                        runningTotals: finalRunningTotals,
                        counterDisplayOverrides: [],
                        activeSlot: null,
                        activeContributors: [],
                        pendingContributors: [],
                        effectPhase: null,
                        effectPhase3ReachedThisRun: false,
                        destroyRemovalBlinkStartedAtMs: null,
                        earthquakeFx: null,
                        lootMergeFx: null,
                        era: prog.newEra,
                        board: generated.board,
                        playerSymbols: filteredSymbols,
                        lastEffects: [],
                        phase: nextPhase,
                        symbolChoices: nextChoiceRes.choices,
                        forceTerrainInNextSymbolChoices:
                            forceTerrainForNextChoices && nextChoiceRes.consumedForceTerrain
                                ? false
                                : forceTerrainForNextChoices,
                        forceEventsInNextSymbolChoices:
                            forceEventsForNextChoices && nextChoiceRes.consumedForceEvents
                                ? false
                                : forceEventsForNextChoices,
                        levelUpResearchPoints: 0,
                        knowledgeResearchCredits: [],
                        knowledgeUpgradeFloats:
                            knowledgeOwnEffectFloats.length > 0
                                ? [...(prev.knowledgeUpgradeFloats ?? []), ...knowledgeOwnEffectFloats]
                                : prev.knowledgeUpgradeFloats,
                    };
                });

                if (destroyedDuringProcessing.length > 0) {
                    get().appendEventLog({
                        turn: get().turn,
                        kind: 'board_action',
                        symbolId: getDestructionSourceSymbolId(destroyedDuringProcessing),
                        meta: {
                            action: 'destroyed_symbols',
                            destroyedSymbols: destroyedDuringProcessing,
                        },
                    });
                }

                if (get().phase === 'victory') {
                    recordTerminalGameCompletion('victory');
                    clearSavedGame();
                    return;
                }

                turnRun.schedule(600, () => {
                    const finalState = get();
                    if (finalState.phase === 'processing') {
                        if (finalState.isTutorialMode && finalState.tutorialSpinStep === 'corn_spin') {
                            set({
                                phase: 'idle' as GamePhase,
                                activeSlot: null,
                                activeContributors: [],
                                pendingContributors: [],
                                effectPhase: null,
                                runningTotals: { food: 0, gold: 0, knowledge: 0 },
                                tutorialSpinStep: 'corn_done',
                            });
                            return;
                        }

                        if (finalState.isTutorialMode && finalState.tutorialSpinStep === 'monument_processing') {
                            set({
                                level: Math.max(finalState.level, 2),
                                era: getEraFromLevel(Math.max(finalState.level, 2)),
                                phase: 'idle' as GamePhase,
                                activeSlot: null,
                                activeContributors: [],
                                pendingContributors: [],
                                effectPhase: null,
                                runningTotals: { food: 0, gold: 0, knowledge: 0 },
                                symbolChoices: [],
                                tutorialSpinStep: 'monument_done',
                            });
                            return;
                        }

                        if (finalState.isTutorialMode && finalState.tutorialSpinStep === 'adjacency_processing') {
                            set({
                                phase: 'idle' as GamePhase,
                                activeSlot: null,
                                activeContributors: [],
                                pendingContributors: [],
                                effectPhase: null,
                                runningTotals: { food: 0, gold: 0, knowledge: 0 },
                                symbolChoices: [],
                                tutorialSpinStep: 'adjacency_done',
                            });
                            return;
                        }

                        if (finalState.turn > 0 && finalState.turn % 10 === 0) {
                            const nextActiveStatuses = createActiveStatusesForTurn(finalState.turn);
                            const basePatch = {
                                pendingFoodPayment: true,
                                activeSlot: null,
                                activeContributors: [],
                                pendingContributors: [],
                                effectPhase: null,
                                runningTotals: { food: 0, gold: 0, knowledge: 0 },
                                activeStatuses: nextActiveStatuses,
                                activeStatusIds: getActiveStatusIdsFromStates(nextActiveStatuses),
                            };

                            set({
                                ...basePatch,
                                phase: 'selection' as GamePhase,
                                symbolSelectionSymbolSourceId: null,
                                isTurnSymbolSelection: true,
                                freeSelectionRerolls: Math.max(
                                    finalState.freeSelectionRerolls ?? 0,
                                    getSelectionPhaseFreeRerollFloor(finalState.unlockedKnowledgeUpgrades ?? []),
                                ),
                            });
                            saveGameState(get());
                            return;
                        }

                        completeTurnEnd();
                    }
                });
            };

            runFinishProcessingTail();
        };

        const processSlot = (slotIdx: number) => {
            if (!turnRun.isActive()) return;
            if (slotIdx >= slotPipeline.slotOrder.length) {
                completeSlotEffects({
                    pipeline: slotPipeline,
                    board: get().board,
                    boardWidth: currentBoardWidth,
                    boardHeight: currentBoardHeight,
                    getAdjacentCoords,
                    unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades || [],
                });
                const unplacedHorseEffects = computeUnplacedHorseEffects(
                    get().board,
                    get().playerSymbols,
                    state.unlockedKnowledgeUpgrades || [],
                );
                applyUnplacedHorseEffects(slotPipeline, unplacedHorseEffects);
                if (unplacedHorseEffects.count > 0) {
                    get().appendEventLog({
                        turn: get().turn,
                        kind: 'symbol_effect',
                        symbolId: S.horse,
                        delta: {
                            food: unplacedHorseEffects.food,
                            gold: unplacedHorseEffects.gold,
                            knowledge: unplacedHorseEffects.knowledge,
                        },
                        meta: {
                            action: 'unplaced_horse_effect',
                            count: unplacedHorseEffects.count,
                        },
                    });
                }

                set({ activeSlot: null, activeContributors: [], pendingContributors: [], counterDisplayOverrides: [], earthquakeFx: null, lootMergeFx: null });
                set({
                    lastEffects: [...slotPipeline.accumulatedEffects],
                    runningTotals: { ...slotPipeline.totals },
                });
                turnRun.schedule(500, () => {
                    finishProcessing(
                        slotPipeline.totals.food,
                        slotPipeline.totals.knowledge,
                        slotPipeline.totals.gold,
                        slotPipeline.symbolsToAdd,
                        slotPipeline.symbolsToSpawnOnBoard,
                        slotPipeline.accumulatedEffects,
                    );
                });
                return;
            }

            const { x, y } = slotPipeline.slotOrder[slotIdx];
            const currentState = get();
            const currentBoard = currentState.board;
            const symbol = currentBoard[x][y];
            if (!symbol || symbol.is_marked_for_destruction) {
                processSlot(slotIdx + 1);
                return;
            }

            const result = resolveSlotEffect({
                pipeline: slotPipeline,
                deps: slotEffectDeps,
                symbol,
                board: currentBoard,
                x,
                y,
                effectCtx,
            });

            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const timelinePlan = buildSlotEffectPresentationPlan({
                effectSpeed,
                contributorCount: result.contributors?.length ?? 0,
            });

            const perfNow =
                typeof globalThis.performance !== 'undefined' && typeof globalThis.performance.now === 'function'
                    ? globalThis.performance.now()
                    : Date.now();
            const earthquakeShakeDurationMs = result.earthquakeFx
                ? EARTHQUAKE_SHAKE_DURATION_MS[effectSpeed]
                : 0;
            const lootMergeFx = result.lootMerge
                ? {
                      absorbed: result.lootMerge.absorbed,
                      receiver: result.lootMerge.receiver,
                      durationMs: Math.max(1, timelinePlan.phase1DelayMs + timelinePlan.phase2DelayMs),
                      startedAtPerfMs: perfNow,
                  }
                : null;

            set({
                activeSlot: { x, y },
                activeContributors: [],
                pendingContributors: result.contributors ?? [],
                effectPhase: 1,
                earthquakeFx: result.earthquakeFx && earthquakeShakeDurationMs > 0
                    ? {
                          ...result.earthquakeFx,
                          startedAtMs: perfNow,
                          durationMs: earthquakeShakeDurationMs,
                      }
                    : null,
                lootMergeFx,
                counterDisplayOverrides: result.counterDelta
                    ? [{ x, y, text: result.counterDisplayTextBefore ?? null }]
                    : [],
            });

            const showPhase2 = () => {
                if (!turnRun.isActive()) return;
                set({ activeContributors: result.contributors ?? [], effectPhase: 2 });
            };
            const applyEffectsAndContinue = () => {
                if (!turnRun.isActive()) return;
                if (result.lootMerge) {
                    commitLootMerge(get().board, result.lootMerge);
                }
                applySlotEffectResult(slotPipeline, { x, y }, result);

                if (result.forceTerrainInNextChoices) {
                    set({ forceTerrainInNextSymbolChoices: true });
                }
                if (result.forceEventsInNextChoices) {
                    set({ forceEventsInNextSymbolChoices: true });
                }
                if (result.freeSelectionRerolls) {
                    set((s) => ({
                        freeSelectionRerolls: (s.freeSelectionRerolls ?? 0) + result.freeSelectionRerolls!,
                    }));
                }

                set({
                    effectPhase: 3,
                    effectPhase3ReachedThisRun: true,
                    earthquakeFx: null,
                    lootMergeFx: null,
                    counterDisplayOverrides: [],
                    lastEffects: [...slotPipeline.accumulatedEffects],
                    runningTotals: { ...slotPipeline.totals },
                });

                if (
                    result.food !== 0 ||
                    result.gold !== 0 ||
                    result.knowledge !== 0 ||
                    (result.addSymbolIds && result.addSymbolIds.length > 0) ||
                    (result.spawnOnBoard && result.spawnOnBoard.length > 0)
                ) {
                    const contributors = (result.contributors ?? []).map(({ x: cx, y: cy }) => ({
                        x: cx,
                        y: cy,
                        symbolId: currentBoard[cx]?.[cy]?.definition?.id,
                    }));
                    get().appendEventLog({
                        turn: get().turn,
                        kind: 'symbol_effect',
                        slot: { x, y },
                        symbolId: symbol.definition.id,
                        delta: { food: result.food ?? 0, gold: result.gold ?? 0, knowledge: result.knowledge ?? 0 },
                        contributors,
                        meta: {
                            addSymbolIds: result.addSymbolIds ?? [],
                            spawnOnBoard: result.spawnOnBoard ?? [],
                        },
                    });
                }

                if (timelinePlan.continueDelayMs === 0) {
                    processSlot(slotIdx + 1);
                } else {
                    turnRun.schedule(timelinePlan.continueDelayMs, () => processSlot(slotIdx + 1));
                }
            };

            if (!timelinePlan.hasContributors) {
                const phase1DelayMs = Math.max(timelinePlan.phase1DelayMs, earthquakeShakeDurationMs);
                if (phase1DelayMs === 0) {
                    applyEffectsAndContinue();
                } else {
                    turnRun.schedule(phase1DelayMs, applyEffectsAndContinue);
                }
            } else if (timelinePlan.phase1DelayMs === 0 && timelinePlan.phase2DelayMs === 0) {
                showPhase2();
                applyEffectsAndContinue();
            } else if (timelinePlan.phase1DelayMs === 0) {
                showPhase2();
                turnRun.schedule(timelinePlan.phase2DelayMs, applyEffectsAndContinue);
            } else {
                turnRun.schedule(timelinePlan.phase1DelayMs, () => {
                    showPhase2();
                    if (timelinePlan.phase2DelayMs === 0) {
                        applyEffectsAndContinue();
                    } else {
                        turnRun.schedule(timelinePlan.phase2DelayMs, applyEffectsAndContinue);
                    }
                });
            }
        };

        processSlot(0);
    },

    continueProcessingAfterNewThreatFloats: () => {
        set({ pendingNewThreatFloats: [] });
        get().startProcessing();
    },
    };
};
