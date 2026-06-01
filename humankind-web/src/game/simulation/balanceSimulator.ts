import { SYMBOLS, SymbolType, type SymbolDefinition, S } from '../data/symbolDefinitions';
import { isGameEventDefinition } from '../data/eventDefinitions';
import {
    AGI_PROJECT_UPGRADE_ID,
    AGRICULTURAL_SURPLUS_UPGRADE_ID,
    AGRICULTURE_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    ARCHITECTURE_UPGRADE_ID,
    CARAVANSERAI_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    CHIEFDOM_UPGRADE_ID,
    COMPASS_UPGRADE_ID,
    DESERT_STORAGE_UPGRADE_ID,
    DRY_STORAGE_UPGRADE_ID,
    FEUDAL_CORN_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    FISHERY_GUILD_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    FORESTRY_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    HUNTING_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    JUNGLE_EXPEDITION_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    LAW_CODE_UPGRADE_ID,
    MARITIME_TRADE_UPGRADE_ID,
    MINING_UPGRADE_ID,
    MODERN_AGRICULTURE_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    NOMADIC_TRADITION_UPGRADE_ID,
    OASIS_RECOVERY_UPGRADE_ID,
    OCEANIC_ROUTES_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    PASTURE_MANAGEMENT_UPGRADE_ID,
    PLANTATION_UPGRADE_ID,
    PRESERVATION_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    SHIPBUILDING_UPGRADE_ID,
    TERRITORIAL_REORG_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
    TRACKING_UPGRADE_ID,
    TANNING_UPGRADE_ID,
    THEOLOGY_UPGRADE_ID,
    TROPICAL_AGRICULTURE_UPGRADE_ID,
    TROPICAL_DEVELOPMENT_UPGRADE_ID,
} from '../data/knowledgeUpgrades';
import { resolveUpgradedUnitDefinition } from '../data/unitUpgrades';
import type { PlayerSymbolInstance } from '../types';
import { DEFAULT_RELIC_EFFECTS, processSingleSymbolEffects } from '../logic/symbolEffects';
import { applyKnowledgeAndLevelUps } from '../logic/progression/eraTransition';
import { generateChoices, generateEventOnlyChoices } from '../logic/selection/selectionLogic';
import {
    applyGeneratedSymbols,
    applySlotEffectResult,
    collectRemovedSymbolInstanceIds,
    completeSlotEffects,
    commitLootMerge,
    createSlotEffectPipeline,
    removeMarkedSymbolsFromBoard,
    resolveSlotEffect,
    type BoardGrid,
    type ProcessSlotArgs,
} from '../logic/turn/turnPipeline';
import {
    collectCombatDestroyedSymbols,
    collectCombatEvents,
    collectCombatKilledEnemies,
    resolveCombatStep,
} from '../logic/turn/combatResolution';
import { runPostEffectsHooks } from '../logic/turn/postEffectsHooks';
import { resolveTurnEndPhase } from '../logic/turn/phaseResolution';
import { createStartingBoard, BOARD_HEIGHT, BOARD_WIDTH } from '../state/gameStoreHelpers';
import {
    consumeKnowledgeResearchCreditForUpgrade,
    createKnowledgeResearchCreditsForLevelGain,
    getEraFromLevel,
    getHudTurnStartPassiveTotals,
    getKnowledgeRequiredForLevel,
    isUpgradeLegalForKnowledgePick,
    type KnowledgeResearchCredit,
} from '../state/gameCalculations';
import { prepareTurn } from '../logic/turn/turnPreparation';
import type { GameRng } from '../logic/turn/rng';

export type BalanceAxisStrategy =
    | 'grassland_axis'
    | 'plains_axis'
    | 'sea_axis'
    | 'forest_axis'
    | 'rainforest_axis'
    | 'desert_axis'
    | 'mountain_axis';
export type BalancePickStrategy =
    | BalanceAxisStrategy
    | 'random'
    | 'food_first'
    | 'knowledge_first'
    | 'gold_first'
    | 'lowest_id';
export type BalanceUpgradeStrategy = 'axis_plan' | 'none' | 'first_legal' | 'random';

export interface BalanceSimulationConfig {
    runs?: number;
    maxTurns?: number;
    seed?: number;
    pickStrategy?: BalancePickStrategy;
    upgradeStrategy?: BalanceUpgradeStrategy;
    startingSymbolIds?: number[];
}

export interface BalanceRunResult {
    runIndex: number;
    seed: number;
    survivedTurns: number;
    outcome: 'game_over' | 'victory' | 'max_turns';
    finalFood: number;
    finalGold: number;
    finalKnowledge: number;
    finalLevel: number;
    finalEra: number;
    ownedSymbolCount: number;
    pickedSymbolIds: number[];
    unlockedUpgradeIds: number[];
}

export interface BalanceSimulationSummary {
    config: Required<BalanceSimulationConfig>;
    runs: BalanceRunResult[];
    averageSurvivedTurns: number;
    maxSurvivedTurns: number;
    minSurvivedTurns: number;
    averageFinalLevel: number;
    survivalRateByTurn: Record<number, number>;
    outcomeCounts: Record<BalanceRunResult['outcome'], number>;
    topPickedSymbols: Array<{ id: number; key: string; count: number }>;
}

interface SimulationState {
    food: number;
    gold: number;
    knowledge: number;
    level: number;
    era: number;
    turn: number;
    board: BoardGrid;
    playerSymbols: PlayerSymbolInstance[];
    unlockedKnowledgeUpgrades: number[];
    knowledgeResearchCredits: KnowledgeResearchCredit[];
    religionUnlocked: boolean;
    qinCurrencyStandardTurnsRemaining: number;
    barbarianSymbolThreat: number;
    barbarianCampThreat: number;
    naturalDisasterThreat: number;
    forceTerrainInNextSymbolChoices: boolean;
    forceEventsInNextSymbolChoices: boolean;
    freeSelectionRerolls: number;
    edictRemovalPending: boolean;
}

interface AxisProfile {
    primaryTerrainIds: number[];
    coreSymbolIds: number[];
    bridgeSymbolIds: number[];
    upgradeIds: number[];
}

const COMMON_OPERATION_SYMBOL_IDS: number[] = [
    S.merchant,
    S.monument,
    S.library,
    S.relic_caravan,
    S.oral_tradition,
    S.pottery,
    S.tribal_village,
    S.stargazer,
    S.wild_seeds,
];

const COMMON_PROGRESS_UPGRADE_IDS: number[] = [
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    LAW_CODE_UPGRADE_ID,
    CHIEFDOM_UPGRADE_ID,
    ARCHITECTURE_UPGRADE_ID,
];

const AXIS_PROFILES: Record<BalanceAxisStrategy, AxisProfile> = {
    grassland_axis: {
        primaryTerrainIds: [S.grassland],
        coreSymbolIds: [S.wheat, S.rice, S.corn],
        bridgeSymbolIds: [S.honey, S.spices, S.salt, S.wild_berries],
        upgradeIds: [
            AGRICULTURE_UPGRADE_ID,
            IRRIGATION_UPGRADE_ID,
            THREE_FIELD_SYSTEM_UPGRADE_ID,
            AGRICULTURAL_SURPLUS_UPGRADE_ID,
            MODERN_AGRICULTURE_UPGRADE_ID,
            FEUDAL_CORN_UPGRADE_ID,
        ],
    },
    plains_axis: {
        primaryTerrainIds: [S.plains],
        coreSymbolIds: [S.cattle, S.sheep, S.horse],
        bridgeSymbolIds: [S.salt, S.spices, S.warrior, S.archer],
        upgradeIds: [
            PASTORALISM_UPGRADE_ID,
            NOMADIC_TRADITION_UPGRADE_ID,
            PASTURE_MANAGEMENT_UPGRADE_ID,
            HORSEMANSHIP_UPGRADE_ID,
        ],
    },
    sea_axis: {
        primaryTerrainIds: [S.sea],
        coreSymbolIds: [S.fish, S.crab, S.pearl, S.compass],
        bridgeSymbolIds: [S.merchant, S.spices, S.salt, S.relic_caravan],
        upgradeIds: [
            FISHERIES_UPGRADE_ID,
            SEAFARING_UPGRADE_ID,
            CELESTIAL_NAVIGATION_UPGRADE_ID,
            COMPASS_UPGRADE_ID,
            SHIPBUILDING_UPGRADE_ID,
            FISHERY_GUILD_UPGRADE_ID,
            MARITIME_TRADE_UPGRADE_ID,
            OCEANIC_ROUTES_UPGRADE_ID,
        ],
    },
    forest_axis: {
        primaryTerrainIds: [S.forest],
        coreSymbolIds: [S.deer, S.fur],
        bridgeSymbolIds: [S.wild_berries, S.honey, S.salt, S.spices],
        upgradeIds: [
            HUNTING_UPGRADE_ID,
            TRACKING_UPGRADE_ID,
            TANNING_UPGRADE_ID,
            FORESTRY_UPGRADE_ID,
            PRESERVATION_UPGRADE_ID,
        ],
    },
    rainforest_axis: {
        primaryTerrainIds: [S.rainforest],
        coreSymbolIds: [S.banana, S.expedition],
        bridgeSymbolIds: [S.wild_berries, S.spices, S.salt, S.stone],
        upgradeIds: [
            TROPICAL_AGRICULTURE_UPGRADE_ID,
            PLANTATION_UPGRADE_ID,
            JUNGLE_EXPEDITION_UPGRADE_ID,
            TROPICAL_DEVELOPMENT_UPGRADE_ID,
        ],
    },
    desert_axis: {
        primaryTerrainIds: [S.desert, S.oasis],
        coreSymbolIds: [S.date, S.dye, S.papyrus, S.caravanserai],
        bridgeSymbolIds: [S.salt, S.spices, S.relic_caravan, S.edict],
        upgradeIds: [
            FOREIGN_TRADE_UPGRADE_ID,
            DRY_STORAGE_UPGRADE_ID,
            DESERT_STORAGE_UPGRADE_ID,
            CARAVANSERAI_UPGRADE_ID,
            OASIS_RECOVERY_UPGRADE_ID,
        ],
    },
    mountain_axis: {
        primaryTerrainIds: [S.mountain],
        coreSymbolIds: [S.stone],
        bridgeSymbolIds: [S.wild_berries, S.salt, S.spices, S.monument],
        upgradeIds: [MINING_UPGRADE_ID, CHIEFDOM_UPGRADE_ID, ARCHITECTURE_UPGRADE_ID],
    },
};

class SeededRng implements GameRng {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0 || 1;
    }

    next = (): number => {
        this.state = (1664525 * this.state + 1013904223) >>> 0;
        return this.state / 0x100000000;
    };

    int = (min: number, max: number): number => {
        const lo = Math.ceil(min);
        const hi = Math.floor(max);
        return lo + Math.floor(this.next() * (hi - lo + 1));
    };

    pick = <T>(items: readonly T[]): T => {
        if (items.length === 0) throw new Error('Cannot pick from an empty collection.');
        return items[this.int(0, items.length - 1)]!;
    };

    shuffle = <T>(items: readonly T[]): T[] => {
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = this.int(0, i);
            [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
        }
        return shuffled;
    };
}

const withSeededMathRandom = <T>(rng: SeededRng, fn: () => T): T => {
    const original = Math.random;
    Math.random = rng.next;
    try {
        return fn();
    } finally {
        Math.random = original;
    }
};

let simulationInstanceCounter = 0;

const createSimulationInstance = (
    definition: SymbolDefinition,
    unlockedUpgrades: readonly number[] = [],
): PlayerSymbolInstance => {
    const resolvedDef = resolveUpgradedUnitDefinition(definition, unlockedUpgrades);
    return {
        definition: resolvedDef,
        instanceId: `sim_symbol_${simulationInstanceCounter++}`,
        effect_counter: 0,
        is_marked_for_destruction: false,
        remaining_attacks: resolvedDef.base_attack ? 3 : 0,
        enemy_hp: resolvedDef.base_hp,
    };
};

const getAdjacentCoords = (x: number, y: number): { x: number; y: number }[] => {
    const out: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) out.push({ x: nx, y: ny });
        }
    }
    return out;
};

const makeInitialState = (config: Required<BalanceSimulationConfig>): SimulationState => {
    simulationInstanceCounter = 0;

    if (config.startingSymbolIds.length === 0) {
        const start = createStartingBoard();
        return {
            food: 0,
            gold: 0,
            knowledge: 0,
            level: 0,
            era: 0,
            turn: 0,
            board: start.board,
            playerSymbols: start.playerSymbols,
            unlockedKnowledgeUpgrades: [],
            knowledgeResearchCredits: [],
            religionUnlocked: false,
            qinCurrencyStandardTurnsRemaining: 0,
            barbarianSymbolThreat: 0,
            barbarianCampThreat: 0,
            naturalDisasterThreat: 0,
            forceTerrainInNextSymbolChoices: false,
            forceEventsInNextSymbolChoices: false,
            freeSelectionRerolls: 0,
            edictRemovalPending: false,
        };
    }

    return {
        food: 0,
        gold: 0,
        knowledge: 0,
        level: 0,
        era: 0,
        turn: 0,
        board: Array(BOARD_WIDTH).fill(null).map(() => Array(BOARD_HEIGHT).fill(null)),
        playerSymbols: config.startingSymbolIds
            .map((id) => SYMBOLS[id])
            .filter((def): def is SymbolDefinition => !!def)
            .map((def) => createSimulationInstance(def, [])),
        unlockedKnowledgeUpgrades: [],
        knowledgeResearchCredits: [],
        religionUnlocked: false,
        qinCurrencyStandardTurnsRemaining: 0,
        barbarianSymbolThreat: 0,
        barbarianCampThreat: 0,
        naturalDisasterThreat: 0,
        forceTerrainInNextSymbolChoices: false,
        forceEventsInNextSymbolChoices: false,
        freeSelectionRerolls: 0,
        edictRemovalPending: false,
    };
};

const isAxisStrategy = (strategy: BalancePickStrategy): strategy is BalanceAxisStrategy =>
    strategy in AXIS_PROFILES;

const ownedCount = (state: SimulationState, symbolIds: readonly number[]): number =>
    state.playerSymbols.filter((symbol) => symbolIds.includes(symbol.definition.id)).length;

const scoreAxisSymbol = (
    state: SimulationState,
    symbol: SymbolDefinition,
    profile: AxisProfile,
    rng: SeededRng,
): number => {
    const id = symbol.id;
    const primaryTerrainOwned = ownedCount(state, profile.primaryTerrainIds);
    const coreOwned = ownedCount(state, profile.coreSymbolIds);
    const commonOwned = ownedCount(state, COMMON_OPERATION_SYMBOL_IDS);
    let score = 0;

    if (profile.primaryTerrainIds.includes(id)) {
        score += primaryTerrainOwned < 3 ? 150 : 95;
    }
    if (profile.coreSymbolIds.includes(id)) {
        score += primaryTerrainOwned > 0 ? 120 : 55;
        if (coreOwned < primaryTerrainOwned + 2) score += 18;
    }
    if (profile.bridgeSymbolIds.includes(id)) {
        score += primaryTerrainOwned > 0 ? 58 : 24;
    }
    if (COMMON_OPERATION_SYMBOL_IDS.includes(id)) {
        score += commonOwned < 5 ? 32 : 14;
    }
    if (symbol.type === SymbolType.TERRAIN && !profile.primaryTerrainIds.includes(id)) {
        score += 10;
    }

    const food = estimateResourceWeight(symbol, 'Food');
    const gold = estimateResourceWeight(symbol, 'Gold');
    const knowledge = estimateResourceWeight(symbol, 'Knowledge');
    score += food * 0.45 + gold * 0.35 + knowledge * 0.4;

    return score + rng.next() * 0.01;
};

const scoreSymbol = (
    state: SimulationState,
    symbol: SymbolDefinition,
    strategy: BalancePickStrategy,
    rng: SeededRng,
): number => {
    if (isAxisStrategy(strategy)) return scoreAxisSymbol(state, symbol, AXIS_PROFILES[strategy], rng);
    if (strategy === 'random') return rng.next();
    if (strategy === 'lowest_id') return -symbol.id;

    const food = estimateResourceWeight(symbol, 'Food');
    const gold = estimateResourceWeight(symbol, 'Gold');
    const knowledge = estimateResourceWeight(symbol, 'Knowledge');
    const terrainBias = symbol.type === SymbolType.TERRAIN ? 0.75 : 0;

    if (strategy === 'food_first') return food * 4 + knowledge + gold + terrainBias + rng.next() * 0.01;
    if (strategy === 'knowledge_first') return knowledge * 4 + food + gold + rng.next() * 0.01;
    return gold * 4 + food + knowledge + rng.next() * 0.01;
};

const estimateResourceWeight = (symbol: SymbolDefinition, resourceName: 'Food' | 'Gold' | 'Knowledge'): number => {
    const matches = [...symbol.description.matchAll(new RegExp(`([+-]?\\d+)\\s+${resourceName}`, 'gi'))];
    if (matches.length === 0) return 0;
    return matches.reduce((sum, match) => sum + Math.max(0, Number(match[1] ?? 0)), 0);
};

const chooseSymbol = (
    state: SimulationState,
    choices: readonly SymbolDefinition[],
    strategy: BalancePickStrategy,
    rng: SeededRng,
): SymbolDefinition | null => {
    if (choices.length === 0) return null;
    return [...choices].sort((a, b) => scoreSymbol(state, b, strategy, rng) - scoreSymbol(state, a, strategy, rng))[0] ?? null;
};

const scoreUpgrade = (
    upgradeId: number,
    pickStrategy: BalancePickStrategy,
): number => {
    if (!isAxisStrategy(pickStrategy)) return 0;
    const profile = AXIS_PROFILES[pickStrategy];
    const upgrade = KNOWLEDGE_UPGRADES[upgradeId];
    if (!upgrade) return 0;

    let score = profile.upgradeIds.includes(upgradeId) ? 120 : 0;
    if (COMMON_PROGRESS_UPGRADE_IDS.includes(upgradeId)) score += 40;

    const relatedSymbolIds = new Set([
        ...profile.primaryTerrainIds,
        ...profile.coreSymbolIds,
        ...profile.bridgeSymbolIds,
    ]);
    for (const desc of upgrade.descSymbols ?? []) {
        const id = S[desc.symbolKey as keyof typeof S];
        if (typeof id === 'number' && relatedSymbolIds.has(id)) score += 35;
    }

    return score;
};

const chooseUpgrade = (
    state: SimulationState,
    strategy: BalanceUpgradeStrategy,
    pickStrategy: BalancePickStrategy,
    rng: SeededRng,
    researchCredits: readonly KnowledgeResearchCredit[] = [],
): number | null => {
    if (strategy === 'none') return null;
    const legal = Object.keys(KNOWLEDGE_UPGRADES)
        .map(Number)
        .filter((id) => id !== TERRITORIAL_REORG_UPGRADE_ID)
        .filter((id) => isUpgradeLegalForKnowledgePick(
            id,
            state.unlockedKnowledgeUpgrades,
            state.level,
            researchCredits,
        ))
        .sort((a, b) => a - b);
    if (legal.length === 0) return null;
    if (strategy === 'random') return rng.pick(legal);
    if (strategy === 'axis_plan') {
        return [...legal]
            .sort((a, b) => scoreUpgrade(b, pickStrategy) - scoreUpgrade(a, pickStrategy) || a - b)[0]!;
    }
    return legal[0]!;
};

const applyUpgrade = (state: SimulationState, upgradeId: number) => {
    const nextUnlocked = [...state.unlockedKnowledgeUpgrades, upgradeId];
    state.unlockedKnowledgeUpgrades = nextUnlocked;
    if (upgradeId === THEOLOGY_UPGRADE_ID) state.religionUnlocked = true;
    if (upgradeId === AGI_PROJECT_UPGRADE_ID && SYMBOLS[S.agi_core]) {
        state.playerSymbols.push(createSimulationInstance(SYMBOLS[S.agi_core]!, nextUnlocked));
    }

    state.playerSymbols = state.playerSymbols.map((symbol) => {
        if (symbol.definition.type !== SymbolType.UNIT) return symbol;
        const nextDef = resolveUpgradedUnitDefinition(symbol.definition, nextUnlocked);
        if (
            nextDef.id === symbol.definition.id &&
            nextDef.base_attack === symbol.definition.base_attack &&
            nextDef.base_hp === symbol.definition.base_hp
        ) {
            return symbol;
        }
        const prevMax = symbol.definition.base_hp ?? 0;
        const nextMax = nextDef.base_hp ?? 0;
        const currentHp = symbol.enemy_hp ?? prevMax;
        const damageTaken = Math.max(0, prevMax - currentHp);
        return {
            ...symbol,
            definition: nextDef,
            remaining_attacks: nextDef.base_attack ? 3 : 0,
            enemy_hp: Math.max(1, nextMax - damageTaken),
        };
    });
};

const resolveCombat = (state: SimulationState) => {
    const getEffectiveMaxHP = (sym: PlayerSymbolInstance) => sym.definition.base_hp ?? 0;
    const events = collectCombatEvents(state.board, BOARD_WIDTH, BOARD_HEIGHT);
    for (const { ax, ay } of events) {
        resolveCombatStep({
            board: state.board,
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            event: { ax, ay },
            getAdjacentCoords,
            getEffectiveMaxHP,
        });
    }

    const destroyedIds = new Set(collectCombatDestroyedSymbols(state.board, BOARD_WIDTH, BOARD_HEIGHT));
    const killedEnemyCount = collectCombatKilledEnemies(state.board, BOARD_WIDTH, BOARD_HEIGHT).length;
    if (destroyedIds.size === 0) return;
    state.board = state.board.map((col) => col.map((s) => (s?.is_marked_for_destruction ? null : s)));
    state.playerSymbols = state.playerSymbols.filter((s) => !destroyedIds.has(s.instanceId));
    const lootDef = SYMBOLS[S.loot];
    if (lootDef) {
        for (let i = 0; i < killedEnemyCount; i++) {
            state.playerSymbols.push(createSimulationInstance(lootDef, state.unlockedKnowledgeUpgrades));
        }
    }
};

const simulateTurn = (
    state: SimulationState,
    config: Required<BalanceSimulationConfig>,
    rng: SeededRng,
    pickedSymbolIds: number[],
): BalanceRunResult['outcome'] | null => {
    const prepared = prepareTurn({
        board: state.board,
        playerSymbols: state.playerSymbols,
        turn: state.turn,
        level: state.level,
        era: state.era,
        boardWidth: BOARD_WIDTH,
        boardHeight: BOARD_HEIGHT,
        unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades,
        threatState: {
            barbarianSymbolThreat: state.barbarianSymbolThreat,
            barbarianCampThreat: state.barbarianCampThreat,
            naturalDisasterThreat: state.naturalDisasterThreat,
        },
        rng,
        createSymbolInstance: createSimulationInstance,
        getThreatLabel: (key) => key,
    });

    state.board = prepared.board;
    state.playerSymbols = prepared.playerSymbols;
    state.turn = prepared.turn;
    state.barbarianSymbolThreat = prepared.threatState.barbarianSymbolThreat;
    state.barbarianCampThreat = prepared.threatState.barbarianCampThreat;
    state.naturalDisasterThreat = prepared.threatState.naturalDisasterThreat;

    resolveCombat(state);

    const baseTotals = getHudTurnStartPassiveTotals(state);
    state.qinCurrencyStandardTurnsRemaining = Math.max(0, state.qinCurrencyStandardTurnsRemaining - 1);
    const pipeline = createSlotEffectPipeline({
        board: state.board,
        boardWidth: BOARD_WIDTH,
        boardHeight: BOARD_HEIGHT,
        baseTotals,
    });

    const deps = {
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
    const effectCtx = { upgrades: state.unlockedKnowledgeUpgrades.map(Number) };

    for (const slot of pipeline.slotOrder) {
        const symbol = state.board[slot.x][slot.y];
        if (!symbol || symbol.is_marked_for_destruction) continue;
        const result = resolveSlotEffect({
            pipeline,
            deps,
            symbol,
            board: state.board,
            x: slot.x,
            y: slot.y,
            effectCtx,
            relicEffects: DEFAULT_RELIC_EFFECTS,
        });
        applySlotEffectResult(pipeline, slot, result);
        if (result.lootMerge) commitLootMerge(state.board, result.lootMerge);
        if (result.forceTerrainInNextChoices) state.forceTerrainInNextSymbolChoices = true;
        if (result.forceEventsInNextChoices) state.forceEventsInNextSymbolChoices = true;
        if (result.edictRemovalPending) state.edictRemovalPending = true;
        if (result.freeSelectionRerolls) state.freeSelectionRerolls += result.freeSelectionRerolls;
    }

    completeSlotEffects({
        pipeline,
        board: state.board,
        boardWidth: BOARD_WIDTH,
        boardHeight: BOARD_HEIGHT,
        getAdjacentCoords,
        unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades,
    });

    const post = runPostEffectsHooks({
        board: state.board,
        boardWidth: BOARD_WIDTH,
        boardHeight: BOARD_HEIGHT,
        effects: pipeline.accumulatedEffects,
        leaderId: null,
        currentEra: state.era,
        currentGold: state.gold + pipeline.totals.gold,
        unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades,
        getAdjacentCoords,
        relics: [],
        ownedSymbols: state.playerSymbols,
        relicStoreApi: {
            incrementRelicCounter: () => {},
            incrementRelicBonus: () => {},
            decrementRelicCounterOrRemove: () => {},
        },
    });

    const previousLevel = state.level;
    const prog = applyKnowledgeAndLevelUps(
        {
            level: state.level,
            knowledge: state.knowledge,
            deltaKnowledge: pipeline.totals.knowledge + post.bonusKnowledge,
            getEraFromLevel,
        },
        getKnowledgeRequiredForLevel,
    );

    const cleanBoard = removeMarkedSymbolsFromBoard(state.board);
    const generated = applyGeneratedSymbols({
        board: cleanBoard,
        playerSymbols: state.playerSymbols,
        symbolsToSpawnOnBoard: pipeline.symbolsToSpawnOnBoard,
        symbolsToAdd: [...pipeline.symbolsToAdd, ...post.addSymbolIds],
        symbolDefinitions: SYMBOLS,
        unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades,
        boardWidth: BOARD_WIDTH,
        boardHeight: BOARD_HEIGHT,
        createSymbolInstance: createSimulationInstance,
    });
    const removedIds = collectRemovedSymbolInstanceIds(state.board, cleanBoard);

    state.food += pipeline.totals.food + post.bonusFood;
    state.gold += pipeline.totals.gold + post.bonusGold;
    state.knowledge = prog.newKnowledge;
    state.level = prog.newLevel;
    state.era = prog.newEra;
    state.knowledgeResearchCredits = [
        ...state.knowledgeResearchCredits,
        ...createKnowledgeResearchCreditsForLevelGain(previousLevel, prog.newLevel),
    ];
    state.board = generated.board;
    state.playerSymbols = generated.playerSymbols.filter((s) => !removedIds.has(s.instanceId));

    while (state.knowledgeResearchCredits.length > 0) {
        const upgradeId = chooseUpgrade(state, config.upgradeStrategy, config.pickStrategy, rng, state.knowledgeResearchCredits);
        if (upgradeId == null) break;
        applyUpgrade(state, upgradeId);
        state.knowledgeResearchCredits = consumeKnowledgeResearchCreditForUpgrade(
            upgradeId,
            state.knowledgeResearchCredits,
        );
    }

    if (post.agiVictory) return 'victory';

    const phase = resolveTurnEndPhase({
        turn: state.turn,
        food: state.food,
        edictRemovalPending: state.edictRemovalPending,
    });
    if (phase.nextPhase === 'game_over') return 'game_over';
    state.food += phase.foodDelta;
    state.edictRemovalPending = false;

    const choiceResult = withSeededMathRandom(rng, () =>
        state.forceEventsInNextSymbolChoices
            ? {
                choices: generateEventOnlyChoices({
                    era: state.era,
                    ownedSymbolDefIds: state.playerSymbols.map((s) => s.definition.id),
                    leaderId: null,
                    leaderProgressLevel: 1,
                }),
                consumedForceTerrain: false,
            }
            : generateChoices({
                era: state.era,
                religionUnlocked: state.religionUnlocked,
                upgrades: state.unlockedKnowledgeUpgrades,
                ownedRelicDefIds: [],
                ownedSymbolDefIds: state.playerSymbols.map((s) => s.definition.id),
                forceTerrainInNextSymbolChoices: state.forceTerrainInNextSymbolChoices,
            }),
    );
    state.forceTerrainInNextSymbolChoices =
        state.forceTerrainInNextSymbolChoices && choiceResult.consumedForceTerrain
            ? false
            : state.forceTerrainInNextSymbolChoices;
    state.forceEventsInNextSymbolChoices = false;

    const symbolChoices = choiceResult.choices.filter((choice): choice is SymbolDefinition => !isGameEventDefinition(choice));
    const selected = chooseSymbol(state, symbolChoices, config.pickStrategy, rng);
    if (selected) {
        state.playerSymbols.push(createSimulationInstance(selected, state.unlockedKnowledgeUpgrades));
        pickedSymbolIds.push(selected.id);
    }

    return null;
};

const normalizeConfig = (config: BalanceSimulationConfig): Required<BalanceSimulationConfig> => ({
    runs: config.runs ?? 100,
    maxTurns: config.maxTurns ?? 60,
    seed: config.seed ?? 1,
    pickStrategy: config.pickStrategy ?? 'grassland_axis',
    upgradeStrategy: config.upgradeStrategy ?? 'axis_plan',
    startingSymbolIds: config.startingSymbolIds ?? [],
});

export function runBalanceSimulation(config: BalanceSimulationConfig = {}): BalanceSimulationSummary {
    const normalized = normalizeConfig(config);
    const runs: BalanceRunResult[] = [];

    for (let runIndex = 0; runIndex < normalized.runs; runIndex++) {
        const runSeed = (normalized.seed + runIndex * 1013904223) >>> 0;
        const rng = new SeededRng(runSeed);
        const state = makeInitialState(normalized);
        const pickedSymbolIds: number[] = [];
        let outcome: BalanceRunResult['outcome'] = 'max_turns';

        withSeededMathRandom(rng, () => {
            for (let turn = 0; turn < normalized.maxTurns; turn++) {
                const resolved = simulateTurn(state, normalized, rng, pickedSymbolIds);
                if (resolved) {
                    outcome = resolved;
                    break;
                }
            }
        });

        runs.push({
            runIndex,
            seed: runSeed,
            survivedTurns: state.turn,
            outcome,
            finalFood: state.food,
            finalGold: state.gold,
            finalKnowledge: state.knowledge,
            finalLevel: state.level,
            finalEra: state.era,
            ownedSymbolCount: state.playerSymbols.length,
            pickedSymbolIds,
            unlockedUpgradeIds: state.unlockedKnowledgeUpgrades,
        });
    }

    return summarizeRuns(normalized, runs);
}

function summarizeRuns(
    config: Required<BalanceSimulationConfig>,
    runs: BalanceRunResult[],
): BalanceSimulationSummary {
    const count = Math.max(1, runs.length);
    const pickedCounts = new Map<number, number>();
    const outcomeCounts: BalanceSimulationSummary['outcomeCounts'] = {
        game_over: 0,
        victory: 0,
        max_turns: 0,
    };

    for (const run of runs) {
        outcomeCounts[run.outcome] += 1;
        for (const id of run.pickedSymbolIds) pickedCounts.set(id, (pickedCounts.get(id) ?? 0) + 1);
    }

    const survivalTurns = [10, 20, 30, 40, 50, config.maxTurns];
    const survivalRateByTurn: Record<number, number> = {};
    for (const turn of survivalTurns) {
        survivalRateByTurn[turn] = runs.filter((r) => r.survivedTurns >= turn).length / count;
    }

    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / count;

    return {
        config,
        runs,
        averageSurvivedTurns: average(runs.map((r) => r.survivedTurns)),
        maxSurvivedTurns: Math.max(...runs.map((r) => r.survivedTurns)),
        minSurvivedTurns: Math.min(...runs.map((r) => r.survivedTurns)),
        averageFinalLevel: average(runs.map((r) => r.finalLevel)),
        survivalRateByTurn,
        outcomeCounts,
        topPickedSymbols: [...pickedCounts.entries()]
            .map(([id, count]) => ({ id, key: SYMBOLS[id]?.key ?? `#${id}`, count }))
            .sort((a, b) => b.count - a.count || a.id - b.id)
            .slice(0, 20),
    };
}
