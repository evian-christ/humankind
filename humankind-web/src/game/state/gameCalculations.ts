import {
    AGI_PROJECT_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    ARCHITECTURE_UPGRADE_ID,
    COLONIALISM_UPGRADE_ID,
    ELECTRICITY_UPGRADE_ID,
    EXPLORATION_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FEUDAL_CORN_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    MODERN_AGE_UPGRADE_ID,
    NATIONALISM_UPGRADE_ID,
    STEAM_POWER_UPGRADE_ID,
    STATE_LABOR_UPGRADE_ID,
    URBANIZATION_UPGRADE_ID,
    getKnowledgeUpgradeDirectPrerequisites,
} from '../data/knowledgeUpgrades';
import { getStageFoodPaymentBase, getStagePassiveBonus } from '../data/stages';
import { SymbolType } from '../data/symbolDefinitions';

const KNOWLEDGE_LEVELUP_BASE = 50;
const KNOWLEDGE_LEVELUP_STEP = 5;
const BASE_REROLL_GOLD_COST = 2;
const GOLD_INFLATION_LEVEL_CAP = 30;
const GOLD_INFLATION_LINEAR_PER_LEVEL = 0.05;
const GOLD_INFLATION_QUADRATIC_PER_LEVEL = 0.0017;

export interface HudTurnStartPassiveState {
    stageId: number;
    unlockedKnowledgeUpgrades: number[];
}

export const getGoldInflationMultiplier = (level: number): number => {
    const normalizedLevel = Math.max(0, Math.min(GOLD_INFLATION_LEVEL_CAP, Math.floor(level)));
    return 1 +
        normalizedLevel * GOLD_INFLATION_LINEAR_PER_LEVEL +
        normalizedLevel * normalizedLevel * GOLD_INFLATION_QUADRATIC_PER_LEVEL;
};

export const getInflatedGoldCost = (
    baseCost: number,
    level: number,
    discountMultiplier = 1,
): number => {
    const normalizedBaseCost = Math.max(0, Math.floor(baseCost));
    if (normalizedBaseCost === 0) return 0;

    const inflatedCost = Math.max(1, Math.round(normalizedBaseCost * getGoldInflationMultiplier(level)));
    const discountedCost = Math.floor(inflatedCost * discountMultiplier);
    return Math.max(1, discountedCost);
};

export const getRerollCost = (level: number, discountMultiplier = 1): number =>
    getInflatedGoldCost(BASE_REROLL_GOLD_COST, level, discountMultiplier);

export const getKnowledgeRequiredForLevel = (currentLevel: number): number => {
    const level = Math.max(0, Math.min(29, Math.floor(currentLevel)));
    return KNOWLEDGE_LEVELUP_BASE + level * KNOWLEDGE_LEVELUP_STEP;
};

export const getEraFromLevel = (level: number): number => {
    if (level <= 10) return 1;
    if (level <= 20) return 2;
    return 3;
};

export const calculateFoodCost = (turn: number, stageId: number = 1): number => {
    const base = getStageFoodPaymentBase(stageId);
    const nth = Math.floor(turn / 10);
    if (nth < 1) return base;

    let extra = 0;
    for (let k = 1; k <= nth - 1; k++) {
        extra += (40 + 10 * k) * k;
    }
    return base + extra;
};

export function getHudTurnStartPassiveTotals(state: HudTurnStartPassiveState): {
    food: number;
    gold: number;
    knowledge: number;
} {
    const upgrades = state.unlockedKnowledgeUpgrades || [];
    const knowledge =
        2 +
        (upgrades.includes(ARCHITECTURE_UPGRADE_ID) ? 1 : 0) +
        (upgrades.includes(32) ? 2 : 0) +
        (upgrades.includes(10) ? 1 : 0) +
        (upgrades.includes(24) ? 2 : 0) +
        (upgrades.includes(NATIONALISM_UPGRADE_ID) ? 3 : 0) +
        (upgrades.includes(STEAM_POWER_UPGRADE_ID) ? 4 : 0) +
        (upgrades.includes(ELECTRICITY_UPGRADE_ID) ? 5 : 0);
    const gold =
        (upgrades.includes(24) ? 2 : 0) +
        (upgrades.includes(STATE_LABOR_UPGRADE_ID) ? 1 : 0) +
        (upgrades.includes(URBANIZATION_UPGRADE_ID) ? 2 : 0) +
        (upgrades.includes(EXPLORATION_UPGRADE_ID) ? 2 : 0) +
        (upgrades.includes(COLONIALISM_UPGRADE_ID) ? 3 : 0) +
        (upgrades.includes(STEAM_POWER_UPGRADE_ID) ? 8 : 0) +
        (upgrades.includes(ELECTRICITY_UPGRADE_ID) ? 10 : 0);
    const food =
        (upgrades.includes(34) ? 2 : 0) +
        (upgrades.includes(10) ? 1 : 0) +
        (upgrades.includes(STATE_LABOR_UPGRADE_ID) ? 1 : 0) +
        (upgrades.includes(URBANIZATION_UPGRADE_ID) ? 10 : 0) +
        (upgrades.includes(ELECTRICITY_UPGRADE_ID) ? 5 : 0) +
        (upgrades.includes(FEUDAL_CORN_UPGRADE_ID) ? 2 : 0);
    const stageBonus = getStagePassiveBonus(state.stageId ?? 1);

    return {
        food: food + stageBonus.food,
        gold: gold + stageBonus.gold,
        knowledge: knowledge + stageBonus.knowledge,
    };
}

const upgradeEraBySymbolType = (type: number): number | null => {
    switch (type) {
        case SymbolType.ANCIENT: return 1;
        case SymbolType.MEDIEVAL: return 2;
        case SymbolType.MODERN: return 3;
        default: return null;
    }
};

export function isUpgradeLegalForKnowledgePick(
    upgradeId: number,
    unlocked: number[],
    level: number,
): boolean {
    const uid = Number(upgradeId);
    const have = new Set((unlocked ?? []).map((x) => Number(x)));
    const upgrade = KNOWLEDGE_UPGRADES[uid];
    if (!upgrade) return false;
    if (have.has(uid)) return false;

    const upgradeEra = upgradeEraBySymbolType(upgrade.type);
    if (upgradeEra == null) return false;

    const currentEra = getEraFromLevel(level);
    const medievalUnlocked = have.has(FEUDALISM_UPGRADE_ID) || currentEra >= 2;
    if (uid === FEUDALISM_UPGRADE_ID) {
        return level >= 10 && have.has(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID);
    }
    if (uid === MODERN_AGE_UPGRADE_ID) {
        return level >= 20 && have.has(FEUDALISM_UPGRADE_ID);
    }
    if (uid === AGI_PROJECT_UPGRADE_ID) {
        return level >= 30 && have.has(MODERN_AGE_UPGRADE_ID);
    }
    if (getKnowledgeUpgradeDirectPrerequisites(uid).some((prereqId) => !have.has(prereqId))) return false;
    if (upgrade.type === SymbolType.MEDIEVAL) return medievalUnlocked;
    return upgradeEra <= currentEra;
}
