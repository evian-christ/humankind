import { t } from '../../../i18n';
import { RELICS } from '../../data/relicDefinitions';
import { awardLeaderGameXp, isLeaderUnlockActive, type LeaderGameOutcome } from '../../data/leaders';
import { SYMBOLS, S, type SymbolDefinition } from '../../data/symbolDefinitions';
import { decrementActiveStatuses, getActiveStatusIdsFromStates } from '../../data/statusDefinitions';
import { useSettingsStore } from '../settingsStore';
import { useRelicStore } from '../relicStore';
import { type ActiveRelicEffects } from '../../logic/symbolEffects';
import { getEffectiveAdjacentCoords } from '../../logic/symbolEffects/core';
import {
    applyKnowledgeAndLevelUps,
} from '../../logic/progression/eraTransition';
import {
    generateChoices as generateChoicesSelection,
} from '../../logic/selection/selectionLogic';
import {
    applyClovisPreDamage,
    collectCombatDestroyedSymbols,
    collectCombatEvents,
    collectCombatKilledEnemies,
    pickClovisPreDamageTarget,
    resolveCombatStep,
} from '../../logic/turn/combatResolution';
import { runPostEffectsHooks } from '../../logic/turn/postEffectsHooks';
import { resolveTurnEndPhase } from '../../logic/turn/phaseResolution';
import { prepareTurn } from '../../logic/turn/turnPreparation';
import { createMathRng } from '../../logic/turn/rng';
import {
    applyGeneratedSymbols,
    applySlotEffectResult,
    collectRemovedSymbolInstanceIds,
    completeSlotEffects,
    computeTurnStartBaseTotals,
    createSlotEffectPipeline,
    removeMarkedSymbolsFromBoard,
    resolveSlotEffect,
    commitLootMerge,
    type ProcessSlotArgs,
} from '../../logic/turn/turnPipeline';
import { getStandardSymbolChoiceCount } from '../gameStoreHelpers';
import type { PlayerSymbolInstance } from '../../types';
import { RELIC_ID } from '../../logic/relics/relicIds';
import { ELECTION_SYSTEM_UPGRADE_ID } from '../../data/knowledgeUpgrades';
import {
    buildCombatPresentationPlan,
    buildSlotEffectPresentationPlan,
} from './turnPresentationTimeline';
import { createTurnRunScheduler } from './turnRunScheduler';
import { clearSavedGame, saveGameState } from '../saveGame';
import {
    createKnowledgeResearchCreditsForLevelGain,
    getEraFromLevel,
    getHudTurnStartPassiveTotals,
    getKnowledgeRequiredForLevel,
    normalizeKnowledgeResearchCredits,
} from '../gameCalculations';
import type { GamePhase, GameState } from '../gameStore';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
export type GameStoreGet = () => GameState;

const getSelectionPhaseFreeRerollFloor = (upgrades: readonly number[]): number =>
    upgrades.map(Number).includes(ELECTION_SYSTEM_UPGRADE_ID) ? 1 : 0;

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
        relicEffects: ActiveRelicEffects,
        disabledTerrainCoords?: ReadonlySet<string>,
    ) => ReturnType<typeof import('../../logic/symbolEffects').processSingleSymbolEffects>;
    createInstance: (def: SymbolDefinition, unlockedUpgrades?: readonly number[]) => PlayerSymbolInstance;
    getAdjacentCoords: (x: number, y: number) => { x: number; y: number }[];
    buildActiveRelicEffects: () => ActiveRelicEffects;
}

export const createTurnFlowActions = ({
    get,
    set,
    boardWidth,
    boardHeight,
    processSingleSymbolEffects,
    createInstance,
    getAdjacentCoords,
    buildActiveRelicEffects,
}: TurnFlowDeps) => {
    const turnRuns = createTurnRunScheduler();
    const awardTerminalLeaderProgress = (outcome: LeaderGameOutcome) => {
        const state = get();
        if (!state.leaderId || state.isTutorialMode || state.lastLeaderProgressAward) return;
        const award = awardLeaderGameXp(state.leaderId, {
            survivedTurns: state.turn,
            finalLevel: state.level,
            outcome,
        });
        set({
            leaderProgressLevel: award.next.level,
            lastLeaderProgressAward: award,
        });
    };

    return {
    spinBoard: () => {
        const state = get();
        if ((state.levelUpResearchPoints ?? 0) > 0) return;
        if (state.phase !== 'idle') return;
        turnRuns.cancelCurrent();

        get().appendEventLog({ turn: state.turn + 1, kind: 'turn_start' });

        const prepared = prepareTurn({
            board: state.board,
            playerSymbols: state.playerSymbols,
            turn: state.turn,
            level: state.level,
            era: state.era,
            boardWidth,
            boardHeight,
            unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades || [],
            threatState: {
                barbarianSymbolThreat: state.barbarianSymbolThreat,
                barbarianCampThreat: state.barbarianCampThreat,
                naturalDisasterThreat: state.naturalDisasterThreat,
            },
            rng: createMathRng(),
            createSymbolInstance: createInstance,
            getThreatLabel: (key) => t(key, useSettingsStore.getState().language),
            forcedNaturalDisasterId: state.pendingDevNaturalDisasterId,
        });

        set({
            playerSymbols: prepared.playerSymbols,
            barbarianSymbolThreat: prepared.threatState.barbarianSymbolThreat,
            barbarianCampThreat: prepared.threatState.barbarianCampThreat,
            naturalDisasterThreat: prepared.threatState.naturalDisasterThreat,
            pendingDevNaturalDisasterId: null,
            pendingNewThreatFloats: prepared.pendingNewThreatFloats,
            prevBoard: prepared.prevBoard,
            board: prepared.board,
            turn: prepared.turn,
            phase: 'spinning',
            lastEffects: [],
            counterDisplayOverrides: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
            effectPhase: null,
            effectPhase3ReachedThisRun: false,
            lootMergeFx: null,
            rerollsThisTurn: 0,
        });
        saveGameState(get());
    },

    startProcessing: () => {
        const state = get();
        if (state.isTutorialMode && state.tutorialSpinStep === 'monument_spin') {
            set({ tutorialSpinStep: 'monument_processing' });
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
            lootMergeFx: null,
            runningTotals: { food: startFood, gold: startGold, knowledge: startKnowledge },
            qinCurrencyStandardTurnsRemaining: Math.max(0, (state.qinCurrencyStandardTurnsRemaining ?? 0) - 1),
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'processing_start',
            meta: { base: { food: startFood, gold: startGold, knowledge: startKnowledge } },
        });

        const slotPipeline = createSlotEffectPipeline({
            board: get().board,
            boardWidth,
            boardHeight,
            baseTotals,
        });
        const relicEffects = buildActiveRelicEffects();
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
                    args.relicEffects,
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
            const relics = useRelicStore.getState().relics;
            const getRelicInst = (id: number) => relics.find((r) => r.definition.id === id);
            const getPhaseAdjacentCoords = (x: number, y: number) =>
                slotPipeline.allSymbolsAdjacent
                    ? getEffectiveAdjacentCoords(currentBoard, x, y, true)
                    : getAdjacentCoords(x, y);
            const post = runPostEffectsHooks({
                board: currentBoard,
                boardWidth,
                boardHeight,
                effects,
                leaderId: stateAtFinish.leaderId,
                leaderProgressLevel: stateAtFinish.leaderProgressLevel,
                currentEra: stateAtFinish.era,
                currentGold: stateAtFinish.gold + tGold,
                bonusXpPerTurn: stateAtFinish.bonusXpPerTurn ?? 0,
                unlockedKnowledgeUpgrades: stateAtFinish.unlockedKnowledgeUpgrades || [],
                getAdjacentCoords: getPhaseAdjacentCoords,
                relics,
                ownedSymbols: stateAtFinish.playerSymbols,
                relicStoreApi: useRelicStore.getState(),
            });

            const bonusFood = post.bonusFood;
            let bonusGold = post.bonusGold;
            const bonusKnowledge = post.bonusKnowledge;
            const bonusAddSymbolIds = post.addSymbolIds;
            const agiVictory = post.agiVictory;
            const relicOwnEffectFloats = post.relicOwnEffectFloats;
            const knowledgeOwnEffectFloats = post.knowledgeOwnEffectFloats;
            const urWheelInstanceId: string | null = post.urWheelPlan?.instanceId ?? null;
            const urWheelMinTarget: { x: number; y: number } | null = post.urWheelPlan?.target ?? null;
            const urWheelShakeMs = 360;
            const urWheelBounceDur = buildCombatPresentationPlan(useSettingsStore.getState().effectSpeed).bounceDurationMs;

            const applyUrWheelDestroyAndDecrement = () => {
                if (!urWheelInstanceId) return;
                const r = useRelicStore.getState().relics.find((x) => x.instanceId === urWheelInstanceId);
                if (!r || r.effect_counter <= 0) return;
                const boardRef = get().board;
                if (urWheelMinTarget) {
                    const sym = boardRef[urWheelMinTarget.x][urWheelMinTarget.y];
                    if (sym) {
                        sym.is_marked_for_destruction = true;
                        bonusGold += 10;
                        relicOwnEffectFloats.push({
                            relicInstanceId: urWheelInstanceId,
                            text: '+10',
                            color: '#fbbf24',
                        });
                    }
                }
                useRelicStore.getState().decrementRelicCounterOrRemove(r.instanceId);
            };

            const runFinishProcessingTail = () => {
                const nileForDecrement = getRelicInst(RELIC_ID.NILE_SILT);
                if (nileForDecrement && nileForDecrement.effect_counter > 0) {
                    useRelicStore.getState().decrementRelicCounterOrRemove(nileForDecrement.instanceId);
                }

                const eraBeforeKnowledgeFinish = get().era;

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
                        boardWidth,
                        boardHeight,
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
                        ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                        ownedSymbolDefIds: prev.playerSymbols.map((s) => s.definition.id),
                        leaderId: prev.leaderId,
                        leaderProgressLevel: prev.leaderProgressLevel,
                        choiceCount: getStandardSymbolChoiceCount(generated.board),
                        forceTerrainInNextSymbolChoices: forceTerrainForNextChoices,
                        forceEventsInNextSymbolChoices: forceEventsForNextChoices,
                    };
                    const nextChoiceRes = prev.edictRemovalPending
                        ? { choices: [] as SymbolDefinition[], consumedForceTerrain: false, consumedForceEvents: false }
                        : generateChoicesSelection(selCtx);
                    const nextPhase: GamePhase = agiVictory ? 'victory' : 'processing';

                    const nextResearchCredits = [
                        ...normalizeKnowledgeResearchCredits(
                            prev.level,
                            prev.levelUpResearchPoints ?? 0,
                            prev.knowledgeResearchCredits,
                        ),
                        ...createKnowledgeResearchCreditsForLevelGain(prev.level, prog.newLevel),
                    ];

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
                        lootMergeFx: null,
                        era: prog.newEra,
                        board: generated.board,
                        playerSymbols: filteredSymbols,
                        lastEffects: [...effects],
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
                        levelUpResearchPoints: nextResearchCredits.length,
                        knowledgeResearchCredits: nextResearchCredits,
                        relicFloats: [...(prev.relicFloats ?? []), ...relicOwnEffectFloats],
                        knowledgeUpgradeFloats:
                            knowledgeOwnEffectFloats.length > 0
                                ? [...(prev.knowledgeUpgradeFloats ?? []), ...knowledgeOwnEffectFloats]
                                : prev.knowledgeUpgradeFloats,
                    };
                });

                const eraAfter = get().era;
                if (
                    isLeaderUnlockActive(get().leaderId, get().leaderProgressLevel, 'shihuang_unification_foundation')
                    && eraAfter > eraBeforeKnowledgeFinish
                ) {
                    const debrisDef = RELICS[RELIC_ID.ANCIENT_RELIC_DEBRIS];
                    const tribeDef = RELICS[RELIC_ID.ANCIENT_TRIBE_JOIN];
                    const rs = useRelicStore.getState();
                    for (let e = eraBeforeKnowledgeFinish + 1; e <= eraAfter; e++) {
                        if (debrisDef) {
                            rs.addRelic(debrisDef);
                            rs.addRelic(debrisDef);
                        }
                        if (tribeDef) rs.addRelic(tribeDef);
                    }
                    get().appendEventLog({
                        turn: get().turn,
                        kind: 'relic',
                        meta: {
                            action: 'shihuang_era_relics',
                            erasEntered: eraAfter - eraBeforeKnowledgeFinish,
                        },
                    });
                }

                if (get().phase === 'victory') {
                    awardTerminalLeaderProgress('victory');
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
                                symbolSelectionRelicSourceId: null,
                                tutorialSpinStep: 'monument_done',
                            });
                            return;
                        }

                        const phaseResolution = resolveTurnEndPhase({
                            turn: finalState.turn,
                            food: finalState.food,
                            edictRemovalPending: finalState.edictRemovalPending,
                        });
                        get().appendEventLog({
                            turn: finalState.turn,
                            kind: 'turn_end',
                            delta: { food: phaseResolution.foodDelta, gold: 0, knowledge: 0 },
                            meta: {
                                action: 'resolve_turn_end',
                                nextPhase: phaseResolution.nextPhase,
                                isFoodPaymentTurn: phaseResolution.isFoodPaymentTurn,
                            },
                        });

                        if (phaseResolution.nextPhase === 'game_over') {
                            awardTerminalLeaderProgress('game_over');
                            set({ phase: 'game_over' as GamePhase });
                            clearSavedGame();
                            return;
                        }

                        if (phaseResolution.foodDelta !== 0) {
                            set((s) => ({ food: s.food + phaseResolution.foodDelta }));
                        }

                        if (phaseResolution.isFoodPaymentTurn) {
                            const venusRelics = useRelicStore
                                .getState()
                                .relics.filter((r) => r.definition.id === RELIC_ID.WILLENDORF_VENUS);
                            for (const relic of venusRelics) {
                                useRelicStore.getState().incrementRelicBonus(relic.instanceId, 1);
                            }
                        }

                        if (phaseResolution.shouldRefreshRelicShop) {
                            get().refreshRelicShop(true);
                        }

                        const nextActiveStatuses = decrementActiveStatuses(finalState.activeStatuses ?? []);
                        const statusPatch = {
                            activeStatuses: nextActiveStatuses,
                            activeStatusIds: getActiveStatusIdsFromStates(nextActiveStatuses),
                        };

                        if (phaseResolution.nextPhase === 'destroy_selection' && phaseResolution.destroySelection) {
                            set({
                                ...phaseResolution.destroySelection,
                                ...statusPatch,
                                phase: 'destroy_selection' as GamePhase,
                            });
                            saveGameState(get());
                            return;
                        }

                        set({
                            ...statusPatch,
                            phase: 'selection' as GamePhase,
                            symbolSelectionRelicSourceId: phaseResolution.symbolSelectionRelicSourceId ?? null,
                            freeSelectionRerolls: Math.max(
                                finalState.freeSelectionRerolls ?? 0,
                                getSelectionPhaseFreeRerollFloor(finalState.unlockedKnowledgeUpgrades ?? []),
                            ),
                        });
                        saveGameState(get());
                    }
                });
            };

            if (urWheelInstanceId) {
                if (urWheelMinTarget && urWheelBounceDur > 0) {
                    set({ preCombatShakeRelicDefId: RELIC_ID.UR_WHEEL });
                    turnRun.schedule(urWheelShakeMs, () => {
                        set({ preCombatShakeRelicDefId: null });
                        applyUrWheelDestroyAndDecrement();
                        runFinishProcessingTail();
                    });
                    return;
                }
                applyUrWheelDestroyAndDecrement();
            }
            runFinishProcessingTail();
        };

        const processSlot = (slotIdx: number) => {
            if (!turnRun.isActive()) return;
            if (slotIdx >= slotPipeline.slotOrder.length) {
                completeSlotEffects({
                    pipeline: slotPipeline,
                    board: get().board,
                    boardWidth,
                    boardHeight,
                    getAdjacentCoords,
                    unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades || [],
                    relicEffects: buildActiveRelicEffects(),
                });

                set({ activeSlot: null, activeContributors: [], pendingContributors: [], counterDisplayOverrides: [], lootMergeFx: null });
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
                relicEffects,
            });

            if (result.triggerRelicRefresh) {
                get().refreshRelicShop(true);
            }
            if (result.triggerRelicSelection) {
                set({ isRelicShopOpen: true });
            }

            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const timelinePlan = buildSlotEffectPresentationPlan({
                effectSpeed,
                contributorCount: result.contributors?.length ?? 0,
            });

            const perfNow =
                typeof globalThis.performance !== 'undefined' && typeof globalThis.performance.now === 'function'
                    ? globalThis.performance.now()
                    : Date.now();
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

                if (result.bonusXpPerTurnDelta) {
                    set((s) => ({ bonusXpPerTurn: s.bonusXpPerTurn + result.bonusXpPerTurnDelta! }));
                }
                if (result.forceTerrainInNextChoices) {
                    set({ forceTerrainInNextSymbolChoices: true });
                }
                if (result.forceEventsInNextChoices) {
                    set({ forceEventsInNextSymbolChoices: true });
                }
                if (result.edictRemovalPending) {
                    set({ edictRemovalPending: true });
                }
                if (result.freeSelectionRerolls) {
                    set((s) => ({
                        freeSelectionRerolls: (s.freeSelectionRerolls ?? 0) + result.freeSelectionRerolls!,
                     }));
                }

                set({
                    effectPhase: 3,
                    effectPhase3ReachedThisRun: true,
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
                    (result.spawnOnBoard && result.spawnOnBoard.length > 0) ||
                    result.triggerRelicRefresh ||
                    result.triggerRelicSelection
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
                            triggerRelicRefresh: !!result.triggerRelicRefresh,
                            triggerRelicSelection: !!result.triggerRelicSelection,
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
                if (timelinePlan.phase1DelayMs === 0) {
                    applyEffectsAndContinue();
                } else {
                    turnRun.schedule(timelinePlan.phase1DelayMs, applyEffectsAndContinue);
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

        const combatBoard = get().board;
        const hasClovis = useRelicStore.getState().relics.some((r) => r.definition.id === RELIC_ID.CLOVIS_SPEAR);
        const getEffectiveMaxHP = (sym: PlayerSymbolInstance) => {
            return sym.definition.base_hp ?? 0;
        };

        const applyClovisDamage = (pos: { x: number; y: number }) => {
            const result = applyClovisPreDamage({ board: combatBoard, target: pos, getEffectiveMaxHP });
            set((s) => {
                const next = [...(s.combatFloats ?? []), result.float];
                return { combatFloats: next.length > 80 ? next.slice(next.length - 80) : next };
            });
        };

        const combatEvents = collectCombatEvents(combatBoard, boardWidth, boardHeight);

        const startEffectPhase = () => {
            if (!turnRun.isActive()) return;
            const combatDestroyedIds = new Set(collectCombatDestroyedSymbols(get().board, boardWidth, boardHeight));
            const combatKilledEnemies = collectCombatKilledEnemies(get().board, boardWidth, boardHeight);
            const combatLootCount = combatKilledEnemies.length;
            if (combatKilledEnemies.length > 0) {
                const relics = useRelicStore.getState().relics;
                const killRewardRelics = [
                    { relic: relics.find((r) => r.definition.id === RELIC_ID.GLADIUS), goldPerKill: 3 },
                    { relic: relics.find((r) => r.definition.id === RELIC_ID.NINEVEH_LION_RELIEF), goldPerKill: 8 },
                ].filter((entry): entry is { relic: NonNullable<typeof entry.relic>; goldPerKill: number } => !!entry.relic);
                const killGold = killRewardRelics.reduce((sum, entry) => sum + entry.goldPerKill * combatKilledEnemies.length, 0);
                if (killGold > 0) {
                    set((s) => ({
                        gold: s.gold + killGold,
                        relicFloats: [
                            ...(s.relicFloats ?? []),
                            ...killRewardRelics.map((entry) => ({
                                relicInstanceId: entry.relic.instanceId,
                                text: `+${entry.goldPerKill * combatKilledEnemies.length}`,
                                color: '#fbbf24',
                            })),
                        ],
                    }));
                }
            }
            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const combatPlan = buildCombatPresentationPlan(effectSpeed);

            const doRemoveAndStart = () => {
                if (!turnRun.isActive()) return;
                if (combatDestroyedIds.size > 0) {
                    set((prev) => {
                        const lootDef = SYMBOLS[S.loot];
                        const lootSymbols = lootDef
                            ? Array.from({ length: combatLootCount }, () =>
                                  createInstance(lootDef, prev.unlockedKnowledgeUpgrades || []),
                              )
                            : [];
                        return {
                            board: prev.board.map((col) => col.map((s) => (s?.is_marked_for_destruction ? null : s))),
                            playerSymbols: [
                                ...prev.playerSymbols.filter((s) => !combatDestroyedIds.has(s.instanceId)),
                                ...lootSymbols,
                            ],
                            combatShaking: false,
                        };
                    });
                }
                set({
                    activeSlot: null,
                    activeContributors: [],
                    pendingContributors: [],
                    effectPhase: null,
                    effectPhase3ReachedThisRun: false,
                    lootMergeFx: null,
                    combatAnimation: null,
                    combatShaking: false,
                });

                if (combatPlan.initialEffectDelayMs === 0) {
                    processSlot(0);
                } else {
                    turnRun.schedule(combatPlan.initialEffectDelayMs, () => processSlot(0));
                }
            };

            if (combatDestroyedIds.size > 0 && combatPlan.bounceDurationMs > 0) {
                set({ combatAnimation: null, combatShaking: true });
                turnRun.schedule(combatPlan.removalDelayMs, doRemoveAndStart);
            } else {
                doRemoveAndStart();
            }
        };

        const processCombatEvent = (eventIdx: number) => {
            if (!turnRun.isActive()) return;
            if (eventIdx >= combatEvents.length) {
                startEffectPhase();
                return;
            }

            const { ax, ay } = combatEvents[eventIdx];
            const board = get().board;
            const result = resolveCombatStep({
                board,
                width: boardWidth,
                height: boardHeight,
                event: { ax, ay },
                getAdjacentCoords,
                getEffectiveMaxHP,
                unlockedKnowledgeUpgrades: get().unlockedKnowledgeUpgrades,
            });
            if (result.animation) {
                const attacker = board[ax]?.[ay];
                const target = board[result.animation.tx]?.[result.animation.ty];
                get().appendEventLog({
                    turn: get().turn,
                    kind: 'combat',
                    slot: { x: ax, y: ay },
                    symbolId: attacker?.definition.id,
                    delta: { food: 0, gold: 0, knowledge: 0 },
                    meta: {
                        action: 'attack',
                        targetSlot: { x: result.animation.tx, y: result.animation.ty },
                        targetSymbolId: target?.definition.id,
                        damage: result.animation.atkDmg,
                        targetDestroyed: !!target?.is_marked_for_destruction,
                    },
                });
            }

            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const combatPlan = buildCombatPresentationPlan(effectSpeed);
            if (combatPlan.bounceDurationMs === 0) {
                processCombatEvent(eventIdx + 1);
                return;
            }

            if (result.animation) {
                set({ combatAnimation: result.animation });
                turnRun.schedule(combatPlan.stepDelayMs, () => processCombatEvent(eventIdx + 1));
            } else {
                processCombatEvent(eventIdx + 1);
            }
        };

        if (hasClovis) {
            const pos = pickClovisPreDamageTarget(combatBoard, boardWidth, boardHeight);
            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const combatPlan = buildCombatPresentationPlan(effectSpeed);

            if (!pos || combatPlan.bounceDurationMs === 0) {
                if (pos) applyClovisDamage(pos);
                set({ preCombatShakeTarget: null, preCombatShakeRelicDefId: null });
                processCombatEvent(0);
            } else {
                const SHAKE_MS = 360;
                const AFTER_DAMAGE_PAUSE_MS = 180;
                set({ preCombatShakeTarget: null, preCombatShakeRelicDefId: RELIC_ID.CLOVIS_SPEAR });
                turnRun.schedule(SHAKE_MS, () => {
                    set({ preCombatShakeRelicDefId: null });
                    if (pos) applyClovisDamage(pos);
                    turnRun.schedule(AFTER_DAMAGE_PAUSE_MS, () => processCombatEvent(0));
                });
            }
        } else {
            set({ preCombatShakeTarget: null, preCombatShakeRelicDefId: null });
            processCombatEvent(0);
        }
    },

    continueProcessingAfterNewThreatFloats: () => {
        set({ pendingNewThreatFloats: [] });
        get().startProcessing();
    },
    };
};
