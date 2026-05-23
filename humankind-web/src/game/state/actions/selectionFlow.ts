import { SYMBOLS, EDICT_SYMBOL_ID, S, SymbolType } from '../../data/symbolDefinitions';
import {
    AGI_PROJECT_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    BALLISTICS_UPGRADE_ID,
    COLONIALISM_UPGRADE_ID,
    ELECTION_SYSTEM_UPGRADE_ID,
    GUNPOWDER_UPGRADE_ID,
    INQUISITION_UPGRADE_ID,
    INTERCHANGEABLE_PARTS_UPGRADE_ID,
    IRON_WORKING_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    MECHANICS_UPGRADE_ID,
    RESTRUCTURING_UPGRADE_ID,
    TRIBAL_FEDERATION_UPGRADE_ID,
    MERCENARIES_UPGRADE_ID,
    TOTAL_MOBILIZATION_UPGRADE_ID,
    SACRIFICIAL_RITE_UPGRADE_ID,
    TERRITORIAL_REORG_UPGRADE_ID,
    THEOLOGY_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';
import { resolveUpgradedUnitDefinition } from '../../data/unitUpgrades';
import { RELICS } from '../../data/relicDefinitions';
import { getEnemyPoolForEra } from '../../data/enemyPools';
import {
    CAPITAL_RELOCATION_DESTROY_COUNT,
    CAPITAL_RELOCATION_FOOD_REWARD,
    CAPITAL_RELOCATION_KNOWLEDGE_REWARD,
    BORDER_RAID_REWARD,
    DESERT_CARAVAN_FOOD,
    EVERY_TERRAIN_BOUNTY_EACH,
    MILITARY_DRAFT_FOOD,
    FOREST_HARVEST_FOOD,
    GAME_EVENTS,
    GRASSLAND_FESTIVAL_FOOD,
    MARITIME_TRADE_PER_SEA,
    MOUNTAIN_LOOKOUT_PER_MOUNTAIN,
    OASIS_BLESSING_PER_EMPTY,
    PLAINS_PASTURE_PER_CATTLE,
    PLAINS_PASTURE_PER_SHEEP,
    eraScaleIndex,
} from '../../data/eventDefinitions';
import { RELIC_ID } from '../../logic/relics/relicIds';
import {
    generateChoices as generateChoicesSelection,
    generateTerrainOnlyChoices as generateTerrainOnlyChoicesSelection,
} from '../../logic/selection/selectionLogic';
import { useRelicStore } from '../relicStore';
import {
    aggregateCollectionDestroyEffects,
    appendSymbolDefIdsToPlayer,
    getStandardSymbolChoiceCount,
    scarabBonusForOwnedRemoves,
} from '../gameStoreHelpers';
import {
    getKnowledgeResearchCutoffLevel,
    getRerollCost,
    isUpgradeLegalForKnowledgePick,
} from '../gameCalculations';
import { saveGameState } from '../saveGame';
import type { GamePhase, GameState } from '../gameStore';
import type { PlayerSymbolInstance } from '../../types';

export type GameStoreSet = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
export type GameStoreGet = () => GameState;

interface ChoiceResolution {
    choices: ReturnType<typeof generateChoicesSelection>['choices'];
    forceTerrainInNextSymbolChoices: boolean;
    forceEventsInNextSymbolChoices: boolean;
}

interface SelectionFlowDeps {
    get: GameStoreGet;
    set: GameStoreSet;
    createInstance: (typeof import('../gameStoreHelpers'))['createInstance'];
    phaseAfterTurnFlowComplete: () => GamePhase;
}

const UNIT_TRANSFORM_UPGRADE_IDS = new Set<number>([
    IRON_WORKING_UPGRADE_ID,
    MECHANICS_UPGRADE_ID,
    GUNPOWDER_UPGRADE_ID,
    BALLISTICS_UPGRADE_ID,
    INTERCHANGEABLE_PARTS_UPGRADE_ID,
]);
const OBLIVION_FURNACE_GRANT_UPGRADE_IDS = new Set<number>([
    SACRIFICIAL_RITE_UPGRADE_ID,
    INQUISITION_UPGRADE_ID,
    RESTRUCTURING_UPGRADE_ID,
]);
const MILITARY_LEVY_GRANT_UPGRADE_IDS = new Set<number>([
    TRIBAL_FEDERATION_UPGRADE_ID,
    MERCENARIES_UPGRADE_ID,
    TOTAL_MOBILIZATION_UPGRADE_ID,
]);

const getSelectionPhaseFreeRerollFloor = (upgrades: readonly number[]): number =>
    upgrades.map(Number).includes(ELECTION_SYSTEM_UPGRADE_ID) ? 1 : 0;

const withSelectionPhaseFreeReroll = (
    state: GameState,
    patch: Partial<GameState>,
): Partial<GameState> => {
    if (patch.phase !== 'selection') return patch;
    const floor = getSelectionPhaseFreeRerollFloor(
        patch.unlockedKnowledgeUpgrades ?? state.unlockedKnowledgeUpgrades ?? [],
    );
    if (floor <= 0) return patch;
    return {
        ...patch,
        freeSelectionRerolls: Math.max(patch.freeSelectionRerolls ?? state.freeSelectionRerolls ?? 0, floor),
    };
};

const resolveStandardChoices = (state: GameState): ChoiceResolution => {
    const res = generateChoicesSelection({
        era: state.era,
        religionUnlocked: state.religionUnlocked,
        upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
        ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
        ownedSymbolDefIds: state.playerSymbols.map((s) => s.definition.id),
        leaderId: state.leaderId,
        leaderProgressLevel: state.leaderProgressLevel,
        choiceCount: getStandardSymbolChoiceCount(state.board),
        forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
        forceEventsInNextSymbolChoices: state.forceEventsInNextSymbolChoices,
    });

    return {
        choices: res.choices,
        forceTerrainInNextSymbolChoices:
            state.forceTerrainInNextSymbolChoices && res.consumedForceTerrain
                ? false
                : state.forceTerrainInNextSymbolChoices,
        forceEventsInNextSymbolChoices:
            state.forceEventsInNextSymbolChoices && res.consumedForceEvents
                ? false
                : state.forceEventsInNextSymbolChoices,
    };
};

const resolveTerrainChoices = (state: GameState) =>
    generateTerrainOnlyChoicesSelection({
        era: state.era,
        religionUnlocked: state.religionUnlocked,
        upgrades: (state.unlockedKnowledgeUpgrades || []).map(Number),
        ownedRelicDefIds: useRelicStore.getState().relics.map((r) => r.definition.id),
    });

const countBoardSymbols = (board: GameState['board'], symbolId: number): number => {
    let count = 0;
    for (const col of board) {
        for (const cell of col) {
            if (cell?.definition.id === symbolId) count++;
        }
    }
    return count;
};

const countBoardEmptySlots = (board: GameState['board']): number => {
    let count = 0;
    for (const col of board) {
        for (const cell of col) {
            if (cell == null) count++;
        }
    }
    return count;
};

const countOwnedSymbols = (playerSymbols: PlayerSymbolInstance[], symbolId: number): number =>
    playerSymbols.reduce((acc, s) => (s.definition.id === symbolId ? acc + 1 : acc), 0);

/** 보드 위 모든 바나나의 현재 식량 생산(1 + permanent bonus)을 즉시 한 번 더 적용 */
const triggerBananaEffectsOnce = (board: GameState['board']): number => {
    let foodGain = 0;
    for (const col of board) {
        for (const cell of col) {
            if (cell?.definition.id === S.banana) {
                const perm = cell.banana_permanent_food_bonus ?? 0;
                foodGain += 1 + perm;
            }
        }
    }
    return foodGain;
};

const pickRandomSymbols = (symbols: PlayerSymbolInstance[], count: number): PlayerSymbolInstance[] => {
    const pool = [...symbols];
    const picked: PlayerSymbolInstance[] = [];
    const limit = Math.min(count, pool.length);
    for (let i = 0; i < limit; i++) {
        const index = Math.floor(Math.random() * pool.length);
        const [symbol] = pool.splice(index, 1);
        if (symbol) picked.push(symbol);
    }
    return picked;
};

const removeSymbolsFromBoard = (
    board: GameState['board'],
    removedIds: ReadonlySet<string>,
): GameState['board'] =>
    board.map((col) => col.map((cell) => (cell && removedIds.has(cell.instanceId) ? null : cell)));

const isBoardDestroyBlockedType = (type: SymbolType) =>
    type === SymbolType.ENEMY || type === SymbolType.DISASTER;

const resolveAfterSelection = (state: GameState, phaseAfterTurnFlowComplete: () => GamePhase) => {
    const q = [...(state.bonusSelectionQueue || [])];
    if (q.length > 0) {
        q.shift();
        const nextType = q[0];
        const standard = nextType === 'terrain' || q.length === 0 ? null : resolveStandardChoices(state);
        const nextChoices =
            q.length === 0
                ? []
                : nextType === 'terrain'
                  ? resolveTerrainChoices(state)
                  : standard!.choices;
        const nextForceTerrain =
            q.length === 0 || nextType === 'terrain'
                ? state.forceTerrainInNextSymbolChoices
                : standard!.forceTerrainInNextSymbolChoices;

        return withSelectionPhaseFreeReroll(state, {
            bonusSelectionQueue: q,
            symbolChoices: nextChoices,
            symbolSelectionRelicSourceId: null,
            forceTerrainInNextSymbolChoices: nextForceTerrain,
            phase: q.length > 0 ? 'selection' as GamePhase : phaseAfterTurnFlowComplete(),
            symbolSelectionSymbolSourceId: q.length > 0 ? state.symbolSelectionSymbolSourceId ?? null : null,
        });
    }

    return {
        phase: phaseAfterTurnFlowComplete(),
        symbolChoices: [],
        symbolSelectionRelicSourceId: null,
        symbolSelectionSymbolSourceId: null,
    };
};

export const createSelectionFlowActions = ({
    get,
    set,
    createInstance,
    phaseAfterTurnFlowComplete,
}: SelectionFlowDeps) => ({
    selectSymbol: (symbolId: number) => {
        const state = get();
        if (state.phase !== 'selection') return;

        const hasPlague = state.board.some((col) => col.some((cell) => cell?.definition.id === 78));
        if (hasPlague) return;

        const def = SYMBOLS[symbolId];
        if (!def) return;

        const choiceIds = state.symbolChoices.map((choice) => choice.id);

        set({
            playerSymbols: [...state.playerSymbols, createInstance(def, state.unlockedKnowledgeUpgrades || [])],
            ...resolveAfterSelection(state, phaseAfterTurnFlowComplete),
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'selection',
            symbolId,
            meta: {
                action: 'select_symbol',
                choiceIds,
                sourceRelicId: state.symbolSelectionRelicSourceId,
                sourceSymbolId: state.symbolSelectionSymbolSourceId ?? null,
            },
        });
        saveGameState(get());
    },

    selectEvent: (eventId: number) => {
        const state = get();
        if (state.phase !== 'selection') return;

        const event = GAME_EVENTS[eventId];
        if (!event) return;

        const patch: Partial<GameState> = {};
        const eraIdx = eraScaleIndex(state.era);
        let foodDelta = 0;
        let goldDelta = 0;
        let knowledgeDelta = 0;

        if (event.reward) {
            foodDelta += event.reward.food ?? 0;
            goldDelta += event.reward.gold ?? 0;
            knowledgeDelta += event.reward.knowledge ?? 0;
        } else if (event.key === 'artifact_market_refresh') {
            queueMicrotask(() => {
                get().refreshRelicShop(true);
                saveGameState(get());
            });
        } else if (event.key === 'border_raid') {
            foodDelta += BORDER_RAID_REWARD[eraIdx];
            goldDelta += BORDER_RAID_REWARD[eraIdx];
            const enemyPool = getEnemyPoolForEra(state.era);
            const enemySymbols = Array.from({ length: 3 }, () => {
                const enemyId = enemyPool[Math.floor(Math.random() * enemyPool.length)]!;
                const def = SYMBOLS[enemyId];
                return def ? createInstance(def, state.unlockedKnowledgeUpgrades || []) : null;
            }).filter((sym): sym is PlayerSymbolInstance => sym != null);
            patch.playerSymbols = [...state.playerSymbols, ...enemySymbols];
        } else if (event.key === 'grassland_festival') {
            foodDelta += GRASSLAND_FESTIVAL_FOOD[eraIdx];
        } else if (event.key === 'plains_pasture') {
            const cattleCount = countBoardSymbols(state.board, S.cattle);
            const sheepCount = countBoardSymbols(state.board, S.sheep);
            foodDelta += cattleCount * PLAINS_PASTURE_PER_CATTLE[eraIdx];
            goldDelta += sheepCount * PLAINS_PASTURE_PER_SHEEP[eraIdx];
        } else if (event.key === 'maritime_trade') {
            const seaCount = countBoardSymbols(state.board, S.sea);
            const perSea = MARITIME_TRADE_PER_SEA[eraIdx];
            foodDelta += seaCount * perSea;
            goldDelta += seaCount * perSea;
        } else if (event.key === 'forest_harvest') {
            foodDelta += FOREST_HARVEST_FOOD[eraIdx];
            const forestDef = SYMBOLS[S.forest];
            if (forestDef) {
                patch.playerSymbols = [
                    ...state.playerSymbols,
                    createInstance(forestDef, state.unlockedKnowledgeUpgrades || []),
                ];
            }
        } else if (event.key === 'jungle_expedition') {
            foodDelta += triggerBananaEffectsOnce(state.board);
        } else if (event.key === 'desert_caravan') {
            foodDelta += DESERT_CARAVAN_FOOD[eraIdx];
        } else if (event.key === 'mountain_lookout') {
            const mountainCount = countOwnedSymbols(state.playerSymbols, S.mountain);
            const per = MOUNTAIN_LOOKOUT_PER_MOUNTAIN[eraIdx];
            foodDelta += mountainCount * per;
            goldDelta += mountainCount * per;
            knowledgeDelta += mountainCount * per;
        } else if (event.key === 'oasis_blessing') {
            const emptySlots = countBoardEmptySlots(state.board);
            foodDelta += emptySlots * OASIS_BLESSING_PER_EMPTY[eraIdx];
        } else if (event.key === 'military_draft') {
            foodDelta += MILITARY_DRAFT_FOOD[eraIdx];
            const def = SYMBOLS[S.enemy_warrior];
            if (def) {
                patch.playerSymbols = [
                    ...(patch.playerSymbols ?? state.playerSymbols),
                    createInstance(def, state.unlockedKnowledgeUpgrades || []),
                ];
            }
        } else if (event.key === 'kadesh_battle_escape') {
            const def = SYMBOLS[S.enemy_warrior];
            if (def) {
                const enemy = createInstance(def, state.unlockedKnowledgeUpgrades || []);
                enemy.enemy_hp = 1;
                patch.playerSymbols = [
                    ...(patch.playerSymbols ?? state.playerSymbols),
                    enemy,
                ];
            }
        } else if (event.key === 'currency_standardization') {
            patch.qinCurrencyStandardTurnsRemaining = 5;
        } else if (event.key === 'every_terrain_bounty') {
            const bounty = EVERY_TERRAIN_BOUNTY_EACH[eraIdx];
            foodDelta += bounty;
            goldDelta += bounty;
            knowledgeDelta += bounty;
        } else if (event.key === 'capital_relocation') {
            const removed = pickRandomSymbols(state.playerSymbols, CAPITAL_RELOCATION_DESTROY_COUNT);
            const removedIds = new Set(removed.map((symbol) => symbol.instanceId));
            const symAgg = aggregateCollectionDestroyEffects(removed, false, state.unlockedKnowledgeUpgrades || []);
            const shBonus = scarabBonusForOwnedRemoves(state.board, removed.length);
            const baseFiltered = state.playerSymbols.filter((symbol) => !removedIds.has(symbol.instanceId));
            patch.playerSymbols = appendSymbolDefIdsToPlayer(
                baseFiltered,
                symAgg.addSymbolDefIds,
                state.unlockedKnowledgeUpgrades || [],
            );
            patch.board = removeSymbolsFromBoard(state.board, removedIds);
            foodDelta += CAPITAL_RELOCATION_FOOD_REWARD + symAgg.food + shBonus.food;
            goldDelta += symAgg.gold + shBonus.gold;
            knowledgeDelta += CAPITAL_RELOCATION_KNOWLEDGE_REWARD + symAgg.knowledge + shBonus.knowledge;
            patch.bonusXpPerTurn = state.bonusXpPerTurn + symAgg.bonusXpPerTurnDelta;
            patch.forceTerrainInNextSymbolChoices = state.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices;
            patch.forceEventsInNextSymbolChoices = state.forceEventsInNextSymbolChoices || symAgg.forceEventsInNextChoices;
            patch.freeSelectionRerolls = (state.freeSelectionRerolls ?? 0) + symAgg.freeSelectionRerolls;
            patch.isRelicShopOpen = state.isRelicShopOpen || symAgg.openRelicShop;
            if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));
        }

        if (foodDelta !== 0) patch.food = state.food + foodDelta;
        if (goldDelta !== 0) patch.gold = state.gold + goldDelta;
        if (knowledgeDelta !== 0) patch.knowledge = state.knowledge + knowledgeDelta;

        set({
            ...patch,
            ...resolveAfterSelection({
                ...state,
                ...patch,
            }, phaseAfterTurnFlowComplete),
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'selection',
            delta: { food: foodDelta, gold: goldDelta, knowledge: knowledgeDelta },
            meta: {
                action: 'select_event',
                eventId,
                eventKey: event.key,
                sourceRelicId: state.symbolSelectionRelicSourceId,
                sourceSymbolId: state.symbolSelectionSymbolSourceId ?? null,
            },
        });
        saveGameState(get());
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
            ...resolveAfterSelection(state, phaseAfterTurnFlowComplete),
            gold: state.gold + skipGold,
            relicFloats: relicFloatsNext,
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'selection',
            delta: { food: 0, gold: skipGold, knowledge: 0 },
            meta: {
                action: 'skip_selection',
                sourceRelicId: state.symbolSelectionRelicSourceId,
                sourceSymbolId: state.symbolSelectionSymbolSourceId ?? null,
            },
        });
    },

    rerollSymbols: () => {
        const state = get();
        if (state.phase !== 'selection') return;

        const hasPlague = state.board.some((col) => col.some((cell) => cell?.definition.id === 78));
        if (hasPlague) return;
        if (
            state.symbolSelectionRelicSourceId === RELIC_ID.ANCIENT_RELIC_DEBRIS ||
            state.symbolSelectionRelicSourceId === RELIC_ID.ANCIENT_TRIBE_JOIN ||
            state.symbolSelectionRelicSourceId === RELIC_ID.MILITARY_LEVY ||
            state.symbolSelectionRelicSourceId === RELIC_ID.PROPHECY_DIE ||
            state.symbolSelectionSymbolSourceId === S.tribal_village
        ) {
            return;
        }

        const hasLydia = useRelicStore.getState().relics.some((r) => r.definition.id === RELIC_ID.LYDIA_COIN);
        const rerollCost = getRerollCost(state.level, hasLydia ? 0.5 : 1);
        const maxRerolls = hasLydia ? 3 : Infinity;

        if (state.rerollsThisTurn >= maxRerolls) return;

        const freeLeft = state.freeSelectionRerolls ?? 0;
        const choiceResolution = resolveStandardChoices(state);

        if (freeLeft > 0) {
            set({
                freeSelectionRerolls: freeLeft - 1,
                symbolChoices: choiceResolution.choices,
                forceTerrainInNextSymbolChoices: choiceResolution.forceTerrainInNextSymbolChoices,
                forceEventsInNextSymbolChoices: choiceResolution.forceEventsInNextSymbolChoices,
            });
            get().appendEventLog({
                turn: state.turn,
                kind: 'selection',
                meta: {
                    action: 'reroll',
                    free: true,
                    choices: choiceResolution.choices.map((choice) => choice.id),
                },
            });
            return;
        }

        if (state.gold < rerollCost) return;

        set({
            gold: state.gold - rerollCost,
            symbolChoices: choiceResolution.choices,
            forceTerrainInNextSymbolChoices: choiceResolution.forceTerrainInNextSymbolChoices,
            forceEventsInNextSymbolChoices: choiceResolution.forceEventsInNextSymbolChoices,
            rerollsThisTurn: state.rerollsThisTurn + 1,
        });
        get().appendEventLog({
            turn: state.turn,
            kind: 'selection',
            delta: { food: 0, gold: -rerollCost, knowledge: 0 },
            meta: {
                action: 'reroll',
                free: false,
                cost: rerollCost,
                choices: choiceResolution.choices.map((choice) => choice.id),
            },
        });
    },

    selectUpgrade: (upgradeId: number) => {
        const state = get();
        const pts = state.levelUpResearchPoints ?? 0;
        if (pts <= 0) return;

        const pickLevel = state.level;
        const researchCutoffLevel = getKnowledgeResearchCutoffLevel(pickLevel, pts);
        const uid = Number(upgradeId);
        const unlockedNorm = (state.unlockedKnowledgeUpgrades || []).map((x) => Number(x));
        if (!KNOWLEDGE_UPGRADES[uid]) return;
        if (!isUpgradeLegalForKnowledgePick(uid, unlockedNorm, pickLevel, researchCutoffLevel)) return;

        const nextResearchPts = Math.max(0, pts - 1);
        const appendResearchLog = (extra: Record<string, unknown> = {}) => {
            get().appendEventLog({
                turn: state.turn,
                kind: 'research',
                meta: {
                    action: 'select_upgrade',
                    upgradeId: uid,
                    remainingResearchPoints: nextResearchPts,
                    ...extra,
                },
            });
        };

        if (uid === TERRITORIAL_REORG_UPGRADE_ID) {
            set({
                unlockedKnowledgeUpgrades: [...unlockedNorm, uid],
                phase: 'destroy_selection',
                pendingDestroySource: TERRITORIAL_REORG_UPGRADE_ID,
                destroySelectionMaxSymbols: 3,
                levelUpResearchPoints: nextResearchPts,
                returnPhaseAfterDevKnowledgeUpgrade: null,
            });
            appendResearchLog({ opensDestroySelection: true });
            return;
        }

        const newUnlocked = [...unlockedNorm, uid];
        const mouseionRelic = useRelicStore
            .getState()
            .relics.find((r) => r.definition.id === RELIC_ID.ALEXANDRIA_MOUSEION_INSCRIPTION);
        const mouseionGold = mouseionRelic ? 3 : 0;
        const mouseionRelicFloat = mouseionRelic
            ? [{ relicInstanceId: mouseionRelic.instanceId, text: '+3', color: '#fbbf24' }]
            : [];

        if (OBLIVION_FURNACE_GRANT_UPGRADE_IDS.has(uid)) {
            const oblDef = RELICS[RELIC_ID.OBLIVION_FURNACE];
            if (oblDef) {
                const rs = useRelicStore.getState();
                for (let i = 0; i < 2; i++) rs.addRelic(oblDef);
            }
        }

        if (MILITARY_LEVY_GRANT_UPGRADE_IDS.has(uid)) {
            const militaryLevyDef = RELICS[RELIC_ID.MILITARY_LEVY];
            if (militaryLevyDef) {
                const rs = useRelicStore.getState();
                for (let i = 0; i < 2; i++) rs.addRelic(militaryLevyDef);
            }
        }

        if (uid === COLONIALISM_UPGRADE_ID) {
            const tribeJoinDef = RELICS[RELIC_ID.ANCIENT_TRIBE_JOIN];
            if (tribeJoinDef) {
                const rs = useRelicStore.getState();
                for (let i = 0; i < 3; i++) rs.addRelic(tribeJoinDef);
            }
        }

        let religionUnlocked = state.religionUnlocked;
        if (uid === THEOLOGY_UPGRADE_ID) religionUnlocked = true;

        let bonusXpDelta = 0;
        if (uid === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID) bonusXpDelta = 2;

        const newBoard = [...state.board.map((row) => [...row])];
        let newPlayerSymbols = [...state.playerSymbols];

        if (uid === AGI_PROJECT_UPGRADE_ID) {
            const agiCoreDef = SYMBOLS[S.agi_core];
            if (agiCoreDef) {
                newPlayerSymbols = [...newPlayerSymbols, createInstance(agiCoreDef, newUnlocked)];
            }
        }

        if (UNIT_TRANSFORM_UPGRADE_IDS.has(uid)) {
            const migrateUnitDefinition = (s: PlayerSymbolInstance): PlayerSymbolInstance => {
                if (s.definition.type !== SymbolType.UNIT) return s;
                const nextDef = resolveUpgradedUnitDefinition(s.definition, newUnlocked);
                if (
                    nextDef.id === s.definition.id &&
                    nextDef.base_attack === s.definition.base_attack &&
                    nextDef.base_hp === s.definition.base_hp
                ) {
                    return s;
                }
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
            gold: state.gold + mouseionGold,
            relicFloats: mouseionRelicFloat.length > 0
                ? [...(state.relicFloats ?? []), ...mouseionRelicFloat]
                : state.relicFloats,
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
            appendResearchLog({ opensDestroySelection: true, source: 'edict' });
            return;
        }

        if (state.returnPhaseAfterDevKnowledgeUpgrade != null) {
            set(withSelectionPhaseFreeReroll(state, {
                ...baseUnlock,
                phase: state.returnPhaseAfterDevKnowledgeUpgrade,
                returnPhaseAfterDevKnowledgeUpgrade: null,
                symbolSelectionRelicSourceId: null,
            }));
            appendResearchLog({ returnPhase: state.returnPhaseAfterDevKnowledgeUpgrade });
            return;
        }

        const choiceResolution =
            state.symbolChoices.length > 0
                ? {
                      choices: state.symbolChoices,
                      forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
                      forceEventsInNextSymbolChoices: state.forceEventsInNextSymbolChoices,
                  }
                : resolveStandardChoices(state);

        set(withSelectionPhaseFreeReroll(state, {
            ...baseUnlock,
            phase: 'selection' as GamePhase,
            returnPhaseAfterDevKnowledgeUpgrade: null,
            symbolSelectionRelicSourceId: null,
            symbolChoices: choiceResolution.choices,
            forceTerrainInNextSymbolChoices: choiceResolution.forceTerrainInNextSymbolChoices,
            forceEventsInNextSymbolChoices: choiceResolution.forceEventsInNextSymbolChoices,
        }));
        appendResearchLog();
    },

    confirmDestroySymbols: (instanceIds: string[]) => {
        const state = get();
        if (state.phase !== 'destroy_selection') return;
        const src = state.pendingDestroySource;

        const removed = state.playerSymbols.filter((s) => instanceIds.includes(s.instanceId));
        const skipEd69 = src === EDICT_SYMBOL_ID;
        const symAgg = aggregateCollectionDestroyEffects(removed, skipEd69, state.unlockedKnowledgeUpgrades || []);
        const shBonus = scarabBonusForOwnedRemoves(state.board, removed.length);
        const dFood = symAgg.food + shBonus.food;
        const dGold = symAgg.gold + shBonus.gold;
        const dKnowledge = symAgg.knowledge + shBonus.knowledge;

        const rewardPatch = (s: GameState) => ({
            food: s.food + dFood,
            gold: s.gold + dGold,
            knowledge: s.knowledge + dKnowledge,
            bonusXpPerTurn: s.bonusXpPerTurn + symAgg.bonusXpPerTurnDelta,
            forceTerrainInNextSymbolChoices: s.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices,
            forceEventsInNextSymbolChoices: s.forceEventsInNextSymbolChoices || symAgg.forceEventsInNextChoices,
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
        const appendDestroyLog = (extra: Record<string, unknown> = {}) => {
            get().appendEventLog({
                turn: state.turn,
                kind: 'board_action',
                delta: { food: dFood, gold: dGold + (extra.goldAdd === true ? goldAdd : 0), knowledge: dKnowledge },
                meta: {
                    action: 'destroy_symbols',
                    source: src,
                    selectedInstanceIds: instanceIds,
                    selectedSymbolIds: removed.map((symbol) => symbol.definition.id),
                    addSymbolIds: symAgg.addSymbolDefIds,
                    ...extra,
                },
            });
        };

        const afterSetRelicRefresh = () => {
            if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));
        };

        if (src === EDICT_SYMBOL_ID) {
            const terr = state.territorialAfterEdictPending;
            const choiceResolution = terr ? null : resolveStandardChoices({
                ...state,
                forceTerrainInNextSymbolChoices:
                    state.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices,
                forceEventsInNextSymbolChoices:
                    state.forceEventsInNextSymbolChoices || symAgg.forceEventsInNextChoices,
            });
            set(withSelectionPhaseFreeReroll(state, {
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
                forceEventsInNextSymbolChoices: terr
                    ? state.forceEventsInNextSymbolChoices || symAgg.forceEventsInNextChoices
                    : choiceResolution!.forceEventsInNextSymbolChoices,
                ...(terr ? { bonusSelectionQueue: ['terrain', 'any', 'any', 'any'] } : {}),
            }));
            afterSetRelicRefresh();
            appendDestroyLog({ territorialAfterEdictPending: terr });
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
                appendDestroyLog({ goldAdd: true, chainedToEdict: true });
                return;
            }
            set(withSelectionPhaseFreeReroll(state, {
                ...rewardPatch(state),
                playerSymbols: newSymbols,
                gold: state.gold + dGold + goldAdd,
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                symbolSelectionRelicSourceId: null,
                symbolChoices: resolveTerrainChoices(state),
                bonusSelectionQueue: ['terrain', 'any', 'any', 'any'],
            }));
            afterSetRelicRefresh();
            appendDestroyLog({ goldAdd: true });
        }
    },

    finishDestroySelection: () => {
        const state = get();
        if (state.phase !== 'destroy_selection') return;
        const src = state.pendingDestroySource;
        if (src === EDICT_SYMBOL_ID) {
            const terr = state.territorialAfterEdictPending;
            const choiceResolution = terr ? null : resolveStandardChoices(state);
            set(withSelectionPhaseFreeReroll(state, {
                phase: 'selection',
                pendingDestroySource: null,
                destroySelectionMaxSymbols: 3,
                territorialAfterEdictPending: false,
                symbolSelectionRelicSourceId: null,
                symbolChoices: terr ? resolveTerrainChoices(state) : choiceResolution!.choices,
                forceTerrainInNextSymbolChoices: terr
                    ? state.forceTerrainInNextSymbolChoices
                    : choiceResolution!.forceTerrainInNextSymbolChoices,
                forceEventsInNextSymbolChoices: terr
                    ? state.forceEventsInNextSymbolChoices
                    : choiceResolution!.forceEventsInNextSymbolChoices,
                ...(terr ? { bonusSelectionQueue: ['terrain', 'any', 'any', 'any'] } : {}),
            }));
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
            phase: phaseAfterTurnFlowComplete(),
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
        if (isBoardDestroyBlockedType(sym.definition.type)) return;

        const instanceIds = [sym.instanceId];
        const removed = [sym];
        const symAgg = aggregateCollectionDestroyEffects(removed, false, state.unlockedKnowledgeUpgrades || []);
        const shBonus = scarabBonusForOwnedRemoves(state.board, removed.length);
        const dFood = symAgg.food + shBonus.food;
        const dGold = symAgg.gold + shBonus.gold;
        const dKnowledge = symAgg.knowledge + shBonus.knowledge;

        const rewardPatch = (s: GameState) => ({
            food: s.food + dFood,
            gold: s.gold + dGold,
            knowledge: s.knowledge + dKnowledge,
            bonusXpPerTurn: s.bonusXpPerTurn + symAgg.bonusXpPerTurnDelta,
            forceTerrainInNextSymbolChoices: s.forceTerrainInNextSymbolChoices || symAgg.forceTerrainInNextChoices,
            forceEventsInNextSymbolChoices: s.forceEventsInNextSymbolChoices || symAgg.forceEventsInNextChoices,
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
            phase: phaseAfterTurnFlowComplete(),
            pendingOblivionFurnaceRelicId: null,
            destroySelectionMaxSymbols: 3,
        });
        if (symAgg.refreshRelicShop) queueMicrotask(() => get().refreshRelicShop(true));
        get().appendEventLog({
            turn: state.turn,
            kind: 'board_action',
            slot: { x, y },
            symbolId: sym.definition.id,
            delta: { food: dFood, gold: dGold, knowledge: dKnowledge },
            meta: {
                action: 'oblivion_furnace_destroy',
                relicInstanceId: relicInstId,
                selectedInstanceIds: instanceIds,
                addSymbolIds: symAgg.addSymbolDefIds,
            },
        });
    },

    cancelOblivionFurnacePick: () => {
        const state = get();
        if (state.phase !== 'oblivion_furnace_board') return;
        set({
            phase: phaseAfterTurnFlowComplete(),
            pendingOblivionFurnaceRelicId: null,
            destroySelectionMaxSymbols: 3,
        });
    },
});
