import { SYMBOLS, EDICT_SYMBOL_ID, S, SymbolType } from '../../data/symbolDefinitions';
import {
    BALLISTICS_UPGRADE_ID,
    GUNPOWDER_UPGRADE_ID,
    INTERCHANGEABLE_PARTS_UPGRADE_ID,
    IRON_WORKING_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    MECHANICS_UPGRADE_ID,
    SACRIFICIAL_RITE_UPGRADE_ID,
    TERRITORIAL_REORG_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';
import { resolveUpgradedUnitDefinition } from '../../data/unitUpgrades';
import { RELICS } from '../../data/relicDefinitions';
import { RELIC_ID } from '../../logic/relics/relicIds';
import {
    generateChoices as generateChoicesSelection,
    generateTerrainOnlyChoices as generateTerrainOnlyChoicesSelection,
} from '../../logic/selection/selectionLogic';
import { useRelicStore } from '../relicStore';
import {
    aggregateCollectionDestroyEffects,
    appendSymbolDefIdsToPlayer,
    scarabAndHinduismBonusForOwnedRemoves,
} from '../gameStoreHelpers';
import {
    getRerollCost,
    isUpgradeLegalForKnowledgePick,
} from '../gameCalculations';
import type { GamePhase, GameState } from '../gameStore';
import type { PlayerSymbolInstance } from '../../types';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
export type GameStoreGet = () => GameState;

interface ChoiceResolution {
    choices: ReturnType<typeof generateChoicesSelection>['choices'];
    forceTerrainInNextSymbolChoices: boolean;
}

interface SelectionFlowDeps {
    get: GameStoreGet;
    set: GameStoreSet;
    createInstance: (typeof import('../gameStoreHelpers'))['createInstance'];
    phaseAfterTurnFlowComplete: (level: number, demoVictoryLevel: number) => GamePhase;
    demoVictoryLevel: number;
}

const UNIT_TRANSFORM_UPGRADE_IDS = new Set<number>([
    IRON_WORKING_UPGRADE_ID,
    MECHANICS_UPGRADE_ID,
    GUNPOWDER_UPGRADE_ID,
    BALLISTICS_UPGRADE_ID,
    INTERCHANGEABLE_PARTS_UPGRADE_ID,
]);

const resolveStandardChoices = (state: GameState): ChoiceResolution => {
    const res = generateChoicesSelection({
        era: state.era,
        religionUnlocked: state.religionUnlocked,
        upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
        ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
        forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
    });

    return {
        choices: res.choices,
        forceTerrainInNextSymbolChoices:
            state.forceTerrainInNextSymbolChoices && res.consumedForceTerrain
                ? false
                : state.forceTerrainInNextSymbolChoices,
    };
};

const resolveTerrainChoices = (state: GameState) =>
    generateTerrainOnlyChoicesSelection({
        era: state.era,
        religionUnlocked: state.religionUnlocked,
        upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
        ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
    });

export const createSelectionFlowActions = ({
    get,
    set,
    createInstance,
    phaseAfterTurnFlowComplete,
    demoVictoryLevel,
}: SelectionFlowDeps) => ({
    selectSymbol: (symbolId: number) => {
        const state = get();
        if (state.phase !== 'selection') return;

        const def = SYMBOLS[symbolId];
        if (!def) return;

        const newSymbols = [...state.playerSymbols, createInstance(def, state.unlockedKnowledgeUpgrades || [])];
        const q = [...(state.bonusSelectionQueue || [])];
        if (q.length > 0) {
            q.shift();
            const nextType = q[0];
            const nextChoices =
                q.length === 0
                    ? []
                    : nextType === 'terrain'
                      ? resolveTerrainChoices(state)
                      : resolveStandardChoices(state).choices;
            const nextForceTerrain =
                q.length === 0 || nextType === 'terrain'
                    ? state.forceTerrainInNextSymbolChoices
                    : resolveStandardChoices(state).forceTerrainInNextSymbolChoices;

            set({
                playerSymbols: newSymbols,
                bonusSelectionQueue: q,
                symbolChoices: nextChoices,
                symbolSelectionRelicSourceId: null,
                forceTerrainInNextSymbolChoices: nextForceTerrain,
                phase: q.length > 0 ? 'selection' : phaseAfterTurnFlowComplete(state.level, demoVictoryLevel),
            });
            return;
        }

        set({
            playerSymbols: newSymbols,
            phase: phaseAfterTurnFlowComplete(state.level, demoVictoryLevel),
            symbolChoices: [],
            symbolSelectionRelicSourceId: null,
        });
    },

    skipSelection: () => {
        const state = get();
        if (state.phase !== 'selection') return;

        const antRelic = useRelicStore.getState().relics.find((r) => r.definition.id === RELIC_ID.ANTONINIANUS);
        const skipGold = antRelic ? 2 : 0;

        const relicFloatsNext =
            skipGold > 0 && antRelic
                ? [
                      ...(state.relicFloats ?? []),
                      { relicInstanceId: antRelic.instanceId, text: '+2', color: '#fbbf24' },
                  ]
                : (state.relicFloats ?? []);

        set({
            phase: phaseAfterTurnFlowComplete(state.level, demoVictoryLevel),
            symbolChoices: [],
            symbolSelectionRelicSourceId: null,
            bonusSelectionQueue: (state.bonusSelectionQueue?.length ?? 0) > 0 ? [] : state.bonusSelectionQueue,
            gold: state.gold + skipGold,
            relicFloats: relicFloatsNext,
        });
    },

    rerollSymbols: () => {
        const state = get();
        if (state.phase !== 'selection') return;
        if (
            state.symbolSelectionRelicSourceId === RELIC_ID.ANCIENT_RELIC_DEBRIS ||
            state.symbolSelectionRelicSourceId === RELIC_ID.ANCIENT_TRIBE_JOIN
        ) {
            return;
        }

        const hasLydia = useRelicStore.getState().relics.some((r) => r.definition.id === RELIC_ID.LYDIA_COIN);
        const baseRerollCost = getRerollCost(state.level);
        const rerollCost = hasLydia ? Math.floor(baseRerollCost * 0.5) : baseRerollCost;
        const maxRerolls = hasLydia ? 3 : Infinity;

        if (state.rerollsThisTurn >= maxRerolls) return;

        const freeLeft = state.freeSelectionRerolls ?? 0;
        const choiceResolution = resolveStandardChoices(state);

        if (freeLeft > 0) {
            set({
                freeSelectionRerolls: freeLeft - 1,
                symbolChoices: choiceResolution.choices,
                forceTerrainInNextSymbolChoices: choiceResolution.forceTerrainInNextSymbolChoices,
            });
            return;
        }

        if (state.gold < rerollCost) return;

        set({
            gold: state.gold - rerollCost,
            symbolChoices: choiceResolution.choices,
            forceTerrainInNextSymbolChoices: choiceResolution.forceTerrainInNextSymbolChoices,
            rerollsThisTurn: state.rerollsThisTurn + 1,
        });
    },

    selectUpgrade: (upgradeId: number) => {
        const state = get();
        const pts = state.levelUpResearchPoints ?? 0;
        if (pts <= 0) return;

        const pickLevel = state.level;
        const uid = Number(upgradeId);
        const unlockedNorm = (state.unlockedKnowledgeUpgrades || []).map((x) => Number(x));
        if (!KNOWLEDGE_UPGRADES[uid]) return;
        if (!isUpgradeLegalForKnowledgePick(uid, unlockedNorm, pickLevel)) return;

        const nextResearchPts = Math.max(0, pts - 1);

        if (uid === TERRITORIAL_REORG_UPGRADE_ID) {
            set({
                unlockedKnowledgeUpgrades: [...unlockedNorm, uid],
                phase: 'destroy_selection',
                pendingDestroySource: TERRITORIAL_REORG_UPGRADE_ID,
                destroySelectionMaxSymbols: 3,
                levelUpResearchPoints: nextResearchPts,
                returnPhaseAfterDevKnowledgeUpgrade: null,
            });
            return;
        }

        const newUnlocked = [...unlockedNorm, uid];

        if (uid === SACRIFICIAL_RITE_UPGRADE_ID) {
            const oblDef = RELICS[RELIC_ID.OBLIVION_FURNACE];
            if (oblDef) {
                const rs = useRelicStore.getState();
                for (let i = 0; i < 3; i++) rs.addRelic(oblDef);
            }
        }

        let religionUnlocked = state.religionUnlocked;
        if (uid === 4) religionUnlocked = true;

        let bonusXpDelta = 0;
        if (uid === 1) bonusXpDelta = 2;

        const newBoard = [...state.board.map((row) => [...row])];
        let newPlayerSymbols = [...state.playerSymbols];

        if (uid === 16) {
            newPlayerSymbols = newPlayerSymbols.map((s) =>
                s.definition.id === S.library ? { ...s, definition: SYMBOLS[S.university]! } : s,
            );
        }

        if (UNIT_TRANSFORM_UPGRADE_IDS.has(uid)) {
            const migrateUnitDefinition = (s: PlayerSymbolInstance): PlayerSymbolInstance => {
                if (s.definition.type !== SymbolType.UNIT) return s;
                const nextDef = resolveUpgradedUnitDefinition(s.definition, newUnlocked);
                if (nextDef.id === s.definition.id) return s;
                const prevMax = s.definition.base_hp ?? 0;
                const nextMax = nextDef.base_hp ?? 0;
                const currentHp = s.enemy_hp ?? prevMax;
                const damageTaken = Math.max(0, prevMax - currentHp);
                return {
                    ...s,
                    definition: nextDef,
                    remaining_attacks: nextDef.base_attack ? 3 : 0,
                    enemy_hp: Math.max(1, nextMax - damageTaken),
                };
            };
            newPlayerSymbols = newPlayerSymbols.map(migrateUnitDefinition);
        }

        for (let y = 0; y < state.board.length; y++) {
            for (let x = 0; x < state.board[y].length; x++) {
                const cell = state.board[y][x];
                if (cell) {
                    const match = newPlayerSymbols.find((s) => s.instanceId === cell.instanceId);
                    newBoard[y][x] = match ?? null;
                }
            }
        }

        const edictAfterUpgrade = state.edictRemovalPending;
        const baseUnlock = {
            unlockedKnowledgeUpgrades: newUnlocked,
            bonusXpPerTurn: state.bonusXpPerTurn + bonusXpDelta,
            religionUnlocked,
            board: newBoard,
            playerSymbols: newPlayerSymbols,
            knowledge: state.knowledge,
            gold: state.gold,
            levelUpResearchPoints: nextResearchPts,
        };

        if (edictAfterUpgrade) {
            set({
                ...baseUnlock,
                edictRemovalPending: false,
                phase: 'destroy_selection' as GamePhase,
                pendingDestroySource: EDICT_SYMBOL_ID,
                destroySelectionMaxSymbols: 1,
                returnPhaseAfterDevKnowledgeUpgrade: null,
            });
            return;
        }

        if (state.returnPhaseAfterDevKnowledgeUpgrade != null) {
            set({
                ...baseUnlock,
                phase: state.returnPhaseAfterDevKnowledgeUpgrade,
                returnPhaseAfterDevKnowledgeUpgrade: null,
                symbolSelectionRelicSourceId: null,
            });
            return;
        }

        const choiceResolution =
            state.symbolChoices.length > 0
                ? {
                      choices: state.symbolChoices,
                      forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
                  }
                : resolveStandardChoices(state);

        set({
            ...baseUnlock,
            phase: 'selection' as GamePhase,
            returnPhaseAfterDevKnowledgeUpgrade: null,
            symbolSelectionRelicSourceId: null,
            symbolChoices: choiceResolution.choices,
            forceTerrainInNextSymbolChoices: choiceResolution.forceTerrainInNextSymbolChoices,
        });
    },

    confirmDestroySymbols: (instanceIds: string[]) => {
        const state = get();
        if (state.phase !== 'destroy_selection') return;
        const src = state.pendingDestroySource;

        const removed = state.playerSymbols.filter((s) => instanceIds.includes(s.instanceId));
        const skipEd69 = src === EDICT_SYMBOL_ID;
        const symAgg = aggregateCollectionDestroyEffects(removed, skipEd69, state.unlockedKnowledgeUpgrades || []);
        const shBonus = scarabAndHinduismBonusForOwnedRemoves(state.board, removed.length);
        const dFood = symAgg.food + shBonus.food;
        const dGold = symAgg.gold + shBonus.gold;
        const dKnowledge = symAgg.knowledge + shBonus.knowledge;

        const rewardPatch = (s: GameState) => ({
            food: s.food + dFood,
            gold: s.gold + dGold,
            knowledge: s.knowledge + dKnowledge,
            bonusXpPerTurn: s.bonusXpPerTurn + symAgg.bonusXpPerTurnDelta,
            forceTerrainInNextSymbolChoices: s.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices,
            edictRemovalPending: s.edictRemovalPending || symAgg.edictRemovalPending,
            freeSelectionRerolls: (s.freeSelectionRerolls ?? 0) + symAgg.freeSelectionRerolls,
            isRelicShopOpen: s.isRelicShopOpen || symAgg.openRelicShop,
        });

        const baseFiltered = state.playerSymbols.filter((s) => !instanceIds.includes(s.instanceId));
        const newSymbols = appendSymbolDefIdsToPlayer(
            baseFiltered,
            symAgg.addSymbolDefIds,
            state.unlockedKnowledgeUpgrades || [],
        );
        const goldAdd = instanceIds.length * 10;

        const afterSetRelicRefresh = () => {
            if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));
        };

        if (src === EDICT_SYMBOL_ID) {
            const terr = state.territorialAfterEdictPending;
            const choiceResolution = terr ? null : resolveStandardChoices(state);
            set({
                ...rewardPatch(state),
                playerSymbols: newSymbols,
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                territorialAfterEdictPending: false,
                symbolSelectionRelicSourceId: null,
                symbolChoices: terr ? resolveTerrainChoices(state) : choiceResolution!.choices,
                forceTerrainInNextSymbolChoices: terr
                    ? state.forceTerrainInNextSymbolChoices
                    : choiceResolution!.forceTerrainInNextSymbolChoices,
                ...(terr ? { bonusSelectionQueue: ['terrain', 'any', 'any', 'any'] } : {}),
            });
            afterSetRelicRefresh();
            return;
        }

        if (src === TERRITORIAL_REORG_UPGRADE_ID) {
            const edictChain = get().edictRemovalPending;
            if (edictChain) {
                set({
                    ...rewardPatch(state),
                    playerSymbols: newSymbols,
                    gold: state.gold + dGold + goldAdd,
                    edictRemovalPending: false,
                    phase: 'destroy_selection',
                    pendingDestroySource: EDICT_SYMBOL_ID,
                    destroySelectionMaxSymbols: 1,
                    territorialAfterEdictPending: true,
                    bonusSelectionQueue: ['terrain', 'any', 'any', 'any'],
                });
                afterSetRelicRefresh();
                return;
            }
            set({
                ...rewardPatch(state),
                playerSymbols: newSymbols,
                gold: state.gold + dGold + goldAdd,
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                symbolSelectionRelicSourceId: null,
                symbolChoices: resolveTerrainChoices(state),
                bonusSelectionQueue: ['terrain', 'any', 'any', 'any'],
            });
            afterSetRelicRefresh();
        }
    },

    finishDestroySelection: () => {
        const state = get();
        if (state.phase !== 'destroy_selection') return;
        const src = state.pendingDestroySource;
        if (src === EDICT_SYMBOL_ID) {
            const terr = state.territorialAfterEdictPending;
            const choiceResolution = terr ? null : resolveStandardChoices(state);
            set({
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                territorialAfterEdictPending: false,
                symbolSelectionRelicSourceId: null,
                symbolChoices: terr ? resolveTerrainChoices(state) : choiceResolution!.choices,
                forceTerrainInNextSymbolChoices: terr
                    ? state.forceTerrainInNextSymbolChoices
                    : choiceResolution!.forceTerrainInNextSymbolChoices,
                ...(terr ? { bonusSelectionQueue: ['terrain', 'any', 'any', 'any'] } : {}),
            });
            return;
        }
        if (state.edictRemovalPending) {
            set({
                phase: 'destroy_selection',
                pendingDestroySource: EDICT_SYMBOL_ID,
                destroySelectionMaxSymbols: 1,
                edictRemovalPending: false,
            });
            return;
        }
        set({
            phase: phaseAfterTurnFlowComplete(state.level, demoVictoryLevel),
            pendingDestroySource: null,
            destroySelectionMaxSymbols: 3,
        });
    },

    confirmOblivionFurnaceDestroyAt: (x: number, y: number) => {
        const state = get();
        if (state.phase !== 'oblivion_furnace_board') return;
        const relicInstId = state.pendingOblivionFurnaceRelicId;
        if (!relicInstId) return;
        if (x < 0 || x >= state.board.length || y < 0 || y >= state.board[0]!.length) return;
        const sym = state.board[x][y];
        if (!sym) return;

        const instanceIds = [sym.instanceId];
        const removed = [sym];
        const symAgg = aggregateCollectionDestroyEffects(removed, false, state.unlockedKnowledgeUpgrades || []);
        const shBonus = scarabAndHinduismBonusForOwnedRemoves(state.board, removed.length);
        const dFood = symAgg.food + shBonus.food;
        const dGold = symAgg.gold + shBonus.gold;
        const dKnowledge = symAgg.knowledge + shBonus.knowledge;

        const rewardPatch = (s: GameState) => ({
            food: s.food + dFood,
            gold: s.gold + dGold,
            knowledge: s.knowledge + dKnowledge,
            bonusXpPerTurn: s.bonusXpPerTurn + symAgg.bonusXpPerTurnDelta,
            forceTerrainInNextSymbolChoices: s.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices,
            edictRemovalPending: s.edictRemovalPending || symAgg.edictRemovalPending,
            freeSelectionRerolls: (s.freeSelectionRerolls ?? 0) + symAgg.freeSelectionRerolls,
            isRelicShopOpen: s.isRelicShopOpen || symAgg.openRelicShop,
        });

        const newBoard = state.board.map((col) => [...col]);
        newBoard[x][y] = null;

        const baseFiltered = state.playerSymbols.filter((s) => !instanceIds.includes(s.instanceId));
        const newSymbols = appendSymbolDefIdsToPlayer(
            baseFiltered,
            symAgg.addSymbolDefIds,
            state.unlockedKnowledgeUpgrades || [],
        );

        useRelicStore.getState().removeRelic(relicInstId);
        set({
            ...rewardPatch(state),
            board: newBoard,
            playerSymbols: newSymbols,
            phase: phaseAfterTurnFlowComplete(state.level, demoVictoryLevel),
            pendingOblivionFurnaceRelicId: null,
            destroySelectionMaxSymbols: 3,
        });
        if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));
    },

    cancelOblivionFurnacePick: () => {
        const state = get();
        if (state.phase !== 'oblivion_furnace_board') return;
        set({
            phase: phaseAfterTurnFlowComplete(state.level, demoVictoryLevel),
            pendingOblivionFurnaceRelicId: null,
            destroySelectionMaxSymbols: 3,
        });
    },
});
