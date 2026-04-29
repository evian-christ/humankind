import { t } from '../../../i18n';
import { RELICS } from '../../data/relicDefinitions';
import { SYMBOLS, type SymbolDefinition } from '../../data/symbolDefinitions';
import { useSettingsStore, EFFECT_SPEED_DELAY, COMBAT_BOUNCE_DURATION } from '../settingsStore';
import { useRelicStore } from '../relicStore';
import { type ActiveRelicEffects } from '../../logic/symbolEffects';
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
    type ProcessSlotArgs,
} from '../../logic/turn/turnPipeline';
import type { PlayerSymbolInstance } from '../../types';
import { RELIC_ID } from '../../logic/relics/relicIds';
import {
    getEraFromLevel,
    getHudTurnStartPassiveTotals,
    getKnowledgeRequiredForLevel,
} from '../gameCalculations';
import type { GamePhase, GameState } from '../gameStore';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
export type GameStoreGet = () => GameState;

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
        effectCtx: { upgrades: number[] },
        relicEffects: ActiveRelicEffects,
        disabledTerrainCoords?: ReadonlySet<string>,
    ) => ReturnType<typeof import('../../logic/symbolEffects').processSingleSymbolEffects>;
    createInstance: (def: SymbolDefinition, unlockedUpgrades?: readonly number[]) => PlayerSymbolInstance;
    getAdjacentCoords: (x: number, y: number) => { x: number; y: number }[];
    buildActiveRelicEffects: () => ActiveRelicEffects;
}

const PHASE1_DELAY: Record<import('../settingsStore').EffectSpeed, number> = {
    '1x': 220,
    '2x': 150,
    '4x': 90,
    instant: 0,
};

const PHASE2_DELAY: Record<import('../settingsStore').EffectSpeed, number> = {
    '1x': 360,
    '2x': 280,
    '4x': 180,
    instant: 0,
};

export const createTurnFlowActions = ({
    get,
    set,
    boardWidth,
    boardHeight,
    processSingleSymbolEffects,
    createInstance,
    getAdjacentCoords,
    buildActiveRelicEffects,
}: TurnFlowDeps) => ({
    spinBoard: () => {
        const state = get();
        if ((state.levelUpResearchPoints ?? 0) > 0) return;
        if (state.phase !== 'idle') return;

        get().appendEventLog({ turn: state.turn + 1, kind: 'turn_start' });

        const prepared = prepareTurn({
            board: state.board,
            playerSymbols: state.playerSymbols,
            turn: state.turn,
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
        });

        set({
            playerSymbols: prepared.playerSymbols,
            barbarianSymbolThreat: prepared.threatState.barbarianSymbolThreat,
            barbarianCampThreat: prepared.threatState.barbarianCampThreat,
            naturalDisasterThreat: prepared.threatState.naturalDisasterThreat,
            pendingNewThreatFloats: prepared.pendingNewThreatFloats,
            prevBoard: prepared.prevBoard,
            board: prepared.board,
            turn: prepared.turn,
            phase: 'spinning',
            lastEffects: [],
            runningTotals: { food: 0, gold: 0, knowledge: 0 },
            activeSlot: null,
            activeContributors: [],
            pendingContributors: [],
            effectPhase: null,
            effectPhase3ReachedThisRun: false,
            rerollsThisTurn: 0,
        });
    },

    startProcessing: () => {
        const state = get();
        if (state.pendingNewThreatFloats?.length) {
            set({ phase: 'showing_new_threats' });
            return;
        }
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
            runningTotals: { food: startFood, gold: startGold, knowledge: startKnowledge },
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
        const effectCtx = { upgrades: (state.unlockedKnowledgeUpgrades || []).map((id) => Number(id)) };
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
            effects: Array<{ x: number; y: number; food: number; gold: number; knowledge: number }>,
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
            const post = runPostEffectsHooks({
                board: currentBoard,
                boardWidth,
                boardHeight,
                effects,
                leaderId: stateAtFinish.leaderId,
                bonusXpPerTurn: stateAtFinish.bonusXpPerTurn ?? 0,
                unlockedKnowledgeUpgrades: stateAtFinish.unlockedKnowledgeUpgrades || [],
                getAdjacentCoords,
                relics,
                relicStoreApi: useRelicStore.getState(),
            });

            const bonusFood = post.bonusFood;
            let bonusGold = post.bonusGold;
            const bonusKnowledge = post.bonusKnowledge;
            const relicOwnEffectFloats = post.relicOwnEffectFloats;
            const knowledgeOwnEffectFloats = post.knowledgeOwnEffectFloats;
            const urWheelInstanceId: string | null = post.urWheelPlan?.instanceId ?? null;
            const urWheelMinTarget: { x: number; y: number } | null = post.urWheelPlan?.target ?? null;
            const urWheelShakeMs = 360;
            const urWheelBounceDur = COMBAT_BOUNCE_DURATION[useSettingsStore.getState().effectSpeed];

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
                    const prog = applyKnowledgeAndLevelUps(
                        {
                            level: prev.level,
                            knowledge: prev.knowledge,
                            deltaKnowledge: tKnowledge + bonusKnowledge,
                            getEraFromLevel,
                        },
                        getKnowledgeRequiredForLevel,
                    );
                    const cleanBoard = removeMarkedSymbolsFromBoard(prev.board);
                    const generated = applyGeneratedSymbols({
                        board: cleanBoard,
                        playerSymbols: prev.playerSymbols,
                        symbolsToSpawnOnBoard: toSpawn,
                        symbolsToAdd: toAdd,
                        symbolDefinitions: SYMBOLS,
                        unlockedKnowledgeUpgrades: finishUpgrades,
                        boardWidth,
                        boardHeight,
                        createSymbolInstance: createInstance,
                    });

                    const effectDestroyedIds = collectRemovedSymbolInstanceIds(prev.board, cleanBoard);
                    const filteredSymbols = generated.playerSymbols.filter((s) => !effectDestroyedIds.has(s.instanceId));
                    const selCtx = {
                        era: prog.newEra,
                        religionUnlocked: prev.religionUnlocked,
                        upgrades: (prev.unlockedKnowledgeUpgrades || []).map(Number),
                        ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
                        forceTerrainInNextSymbolChoices: prev.forceTerrainInNextSymbolChoices,
                    };
                    const nextChoiceRes = prev.edictRemovalPending
                        ? { choices: [] as SymbolDefinition[], consumedForceTerrain: false }
                        : generateChoicesSelection(selCtx);

                    return {
                        food: prev.food + tFood + bonusFood,
                        gold: prev.gold + tGold + bonusGold,
                        knowledge: prog.newKnowledge,
                        level: prog.newLevel,
                        runningTotals: { food: 0, gold: 0, knowledge: 0 },
                        activeSlot: null,
                        activeContributors: [],
                        pendingContributors: [],
                        effectPhase: null,
                        effectPhase3ReachedThisRun: false,
                        era: prog.newEra,
                        board: generated.board,
                        playerSymbols: filteredSymbols,
                        lastEffects: [...effects],
                        phase: 'processing' as GamePhase,
                        symbolChoices: nextChoiceRes.choices,
                        forceTerrainInNextSymbolChoices:
                            prev.forceTerrainInNextSymbolChoices && nextChoiceRes.consumedForceTerrain
                                ? false
                                : prev.forceTerrainInNextSymbolChoices,
                        levelUpResearchPoints: (prev.levelUpResearchPoints ?? 0) + prog.gainedResearchPicks,
                        relicFloats: [...(prev.relicFloats ?? []), ...relicOwnEffectFloats],
                        knowledgeUpgradeFloats:
                            knowledgeOwnEffectFloats.length > 0
                                ? [...(prev.knowledgeUpgradeFloats ?? []), ...knowledgeOwnEffectFloats]
                                : prev.knowledgeUpgradeFloats,
                    };
                });

                const eraAfter = get().era;
                if (get().leaderId === 'shihuang' && eraAfter > eraBeforeKnowledgeFinish) {
                    const debrisDef = RELICS[RELIC_ID.ANCIENT_RELIC_DEBRIS];
                    const tribeDef = RELICS[RELIC_ID.ANCIENT_TRIBE_JOIN];
                    const rs = useRelicStore.getState();
                    for (let e = eraBeforeKnowledgeFinish + 1; e <= eraAfter; e++) {
                        if (debrisDef) rs.addRelic(debrisDef);
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

                setTimeout(() => {
                    const finalState = get();
                    if (finalState.phase === 'processing') {
                        const phaseResolution = resolveTurnEndPhase({
                            turn: finalState.turn,
                            stageId: finalState.stageId,
                            food: finalState.food,
                            edictRemovalPending: finalState.edictRemovalPending,
                        });

                        if (phaseResolution.nextPhase === 'game_over') {
                            set({ phase: 'game_over' as GamePhase });
                            return;
                        }

                        if (phaseResolution.foodDelta !== 0) {
                            set((s) => ({ food: s.food + phaseResolution.foodDelta }));
                        }

                        if (phaseResolution.shouldRefreshRelicShop) {
                            get().refreshRelicShop(true);
                        }

                        if (phaseResolution.nextPhase === 'destroy_selection' && phaseResolution.destroySelection) {
                            set({
                                ...phaseResolution.destroySelection,
                                phase: 'destroy_selection' as GamePhase,
                            });
                            return;
                        }

                        set({
                            phase: 'selection' as GamePhase,
                            symbolSelectionRelicSourceId: phaseResolution.symbolSelectionRelicSourceId ?? null,
                        });
                    }
                }, 600);
            };

            if (urWheelInstanceId) {
                if (urWheelMinTarget && urWheelBounceDur > 0) {
                    set({ preCombatShakeRelicDefId: RELIC_ID.UR_WHEEL });
                    setTimeout(() => {
                        set({ preCombatShakeRelicDefId: null });
                        applyUrWheelDestroyAndDecrement();
                        runFinishProcessingTail();
                    }, urWheelShakeMs);
                    return;
                }
                applyUrWheelDestroyAndDecrement();
            }
            runFinishProcessingTail();
        };

        const processSlot = (slotIdx: number) => {
            if (slotIdx >= slotPipeline.slotOrder.length) {
                completeSlotEffects({
                    pipeline: slotPipeline,
                    board: get().board,
                    boardWidth,
                    boardHeight,
                    getAdjacentCoords,
                });

                set({ activeSlot: null, activeContributors: [], pendingContributors: [] });
                set({
                    lastEffects: [...slotPipeline.accumulatedEffects],
                    runningTotals: { ...slotPipeline.totals },
                });
                setTimeout(() => {
                    finishProcessing(
                        slotPipeline.totals.food,
                        slotPipeline.totals.knowledge,
                        slotPipeline.totals.gold,
                        slotPipeline.symbolsToAdd,
                        slotPipeline.symbolsToSpawnOnBoard,
                        slotPipeline.accumulatedEffects,
                    );
                }, 500);
                return;
            }

            const { x, y } = slotPipeline.slotOrder[slotIdx];
            const currentState = get();
            const currentBoard = currentState.board;
            const symbol = currentBoard[x][y];
            if (!symbol) {
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
            const phase1 = PHASE1_DELAY[effectSpeed];
            const phase2 = PHASE2_DELAY[effectSpeed];
            const delay = EFFECT_SPEED_DELAY[effectSpeed];

            set({
                activeSlot: { x, y },
                activeContributors: [],
                pendingContributors: result.contributors ?? [],
                effectPhase: 1,
            });

            const hasContributors = (result.contributors ?? []).length > 0;
            const showPhase2 = () => {
                set({ activeContributors: result.contributors ?? [], effectPhase: 2 });
            };
            const applyEffectsAndContinue = () => {
                set({ effectPhase: 3, effectPhase3ReachedThisRun: true });
                applySlotEffectResult(slotPipeline, { x, y }, result);

                if (result.bonusXpPerTurnDelta) {
                    set((s) => ({ bonusXpPerTurn: s.bonusXpPerTurn + result.bonusXpPerTurnDelta! }));
                }
                if (result.forceTerrainInNextChoices) {
                    set({ forceTerrainInNextSymbolChoices: true });
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

                if (delay === 0) {
                    processSlot(slotIdx + 1);
                } else {
                    setTimeout(() => processSlot(slotIdx + 1), delay);
                }
            };

            if (!hasContributors) {
                if (phase1 === 0) {
                    applyEffectsAndContinue();
                } else {
                    setTimeout(applyEffectsAndContinue, phase1);
                }
            } else if (phase1 === 0 && phase2 === 0) {
                showPhase2();
                applyEffectsAndContinue();
            } else if (phase1 === 0) {
                showPhase2();
                setTimeout(applyEffectsAndContinue, phase2);
            } else {
                setTimeout(() => {
                    showPhase2();
                    if (phase2 === 0) {
                        applyEffectsAndContinue();
                    } else {
                        setTimeout(applyEffectsAndContinue, phase2);
                    }
                }, phase1);
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
            const combatDestroyedIds = new Set(collectCombatDestroyedSymbols(get().board, boardWidth, boardHeight));
            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const bounceDur = COMBAT_BOUNCE_DURATION[effectSpeed];

            const doRemoveAndStart = () => {
                if (combatDestroyedIds.size > 0) {
                    set((prev) => {
                        return {
                            board: prev.board.map((col) => col.map((s) => (s?.is_marked_for_destruction ? null : s))),
                            playerSymbols: prev.playerSymbols.filter((s) => !combatDestroyedIds.has(s.instanceId)),
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
                    combatAnimation: null,
                    combatShaking: false,
                });

                const initialDelay = EFFECT_SPEED_DELAY[effectSpeed];
                if (initialDelay === 0) {
                    processSlot(0);
                } else {
                    setTimeout(() => processSlot(0), Math.max(initialDelay, 300));
                }
            };

            if (combatDestroyedIds.size > 0 && bounceDur > 0) {
                set({ combatAnimation: null, combatShaking: true });
                setTimeout(doRemoveAndStart, Math.max(bounceDur * 2, 200));
            } else {
                doRemoveAndStart();
            }
        };

        const processCombatEvent = (eventIdx: number) => {
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
            });

            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const bounceDur = COMBAT_BOUNCE_DURATION[effectSpeed];
            if (bounceDur === 0) {
                processCombatEvent(eventIdx + 1);
                return;
            }

            const stepDelay = bounceDur + 40;
            if (result.animation) {
                set({ combatAnimation: result.animation });
                setTimeout(() => processCombatEvent(eventIdx + 1), stepDelay);
            } else {
                processCombatEvent(eventIdx + 1);
            }
        };

        if (hasClovis) {
            const pos = pickClovisPreDamageTarget(combatBoard, boardWidth, boardHeight);
            const effectSpeed = useSettingsStore.getState().effectSpeed;
            const bounceDur = COMBAT_BOUNCE_DURATION[effectSpeed];

            if (!pos || bounceDur === 0) {
                if (pos) applyClovisDamage(pos);
                set({ preCombatShakeTarget: null, preCombatShakeRelicDefId: null });
                processCombatEvent(0);
            } else {
                const SHAKE_MS = 360;
                const AFTER_DAMAGE_PAUSE_MS = 180;
                set({ preCombatShakeTarget: null, preCombatShakeRelicDefId: RELIC_ID.CLOVIS_SPEAR });
                setTimeout(() => {
                    set({ preCombatShakeRelicDefId: null });
                    if (pos) applyClovisDamage(pos);
                    setTimeout(() => processCombatEvent(0), AFTER_DAMAGE_PAUSE_MS);
                }, SHAKE_MS);
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
});
