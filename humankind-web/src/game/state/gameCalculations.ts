import {
    AGI_PROJECT_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    ARCHITECTURE_UPGRADE_ID,
    CHIEFDOM_UPGRADE_ID,
    ELECTRICITY_UPGRADE_ID,
    EXPLORATION_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FEUDAL_CORN_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    LAW_CODE_UPGRADE_ID,
    MATHEMATICS_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    NATIONALISM_UPGRADE_ID,
    PRINTING_PRESS_UPGRADE_ID,
    MERCANTILISM_UPGRADE_ID,
    STEAM_POWER_UPGRADE_ID,
    STATE_LABOR_UPGRADE_ID,
    URBANIZATION_UPGRADE_ID,
    BUTTRESS_UPGRADE_ID,
    getKnowledgeUpgradeDirectPrerequisites,
} from '../data/knowledgeUpgrades';
import { isKnowledgeUpgradeLockedByResearchCutoff } from '../data/knowledgeUpgradeTiers';
import { SymbolType } from '../data/symbolDefinitions';

const KNOWLEDGE_LEVELUP_BASE = 50;
const KNOWLEDGE_LEVELUP_STEP = 5;
const BASE_REROLL_GOLD_COST = 2;
const GOLD_INFLATION_LEVEL_CAP = 30;
const GOLD_INFLATION_LINEAR_PER_LEVEL = 0.05;
const GOLD_INFLATION_QUADRATIC_PER_LEVEL = 0.0017;

export interface HudTurnStartPassiveState {
    unlockedKnowledgeUpgrades: number[];
    qinCurrencyStandardTurnsRemaining?: number;
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

export const getKnowledgeResearchCutoffLevel = (level: number, unspentResearchPoints: number): number => {
    const normalizedLevel = Math.max(0, Math.floor(level));
    const normalizedUnspent = Math.max(0, Math.floor(unspentResearchPoints));
    return Math.max(0, normalizedLevel - normalizedUnspent);
};

export const getKnowledgeRequiredForLevel = (currentLevel: number): number => {
    const level = Math.max(0, Math.min(29, Math.floor(currentLevel)));
    return KNOWLEDGE_LEVELUP_BASE + level * KNOWLEDGE_LEVELUP_STEP;
};

export const getEraFromLevel = (level: number): number => {
    if (level <= 0) return 0;
    if (level >= 30) return 4;
    if (level < 10) return 1;
    if (level < 20) return 2;
    return 3;
};

export const calculateFoodCost = (turn: number): number => {
    const base = 50;
    const nth = Math.floor(turn / 10);
    if (nth < 1) return base;

    let extra = 0;
    for (let k = 1; k <= nth - 1; k++) {
        extra += 25 + 25 * k;
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
        (upgrades.includes(LAW_CODE_UPGRADE_ID) ? 2 : 0) +
        (upgrades.includes(MATHEMATICS_UPGRADE_ID) ? 1 : 0) +
        (upgrades.includes(PRINTING_PRESS_UPGRADE_ID) ? 2 : 0) +
        (upgrades.includes(NATIONALISM_UPGRADE_ID) ? 3 : 0) +
        (upgrades.includes(STEAM_POWER_UPGRADE_ID) ? 2 : 0) +
        (upgrades.includes(ELECTRICITY_UPGRADE_ID) ? 3 : 0);
    const baseGold =
        (upgrades.includes(PRINTING_PRESS_UPGRADE_ID) ? 2 : 0) +
        (upgrades.includes(STATE_LABOR_UPGRADE_ID) ? 1 : 0) +
        (upgrades.includes(URBANIZATION_UPGRADE_ID) ? 4 : 0) +
        (upgrades.includes(EXPLORATION_UPGRADE_ID) ? 2 : 0) +
        (upgrades.includes(MERCANTILISM_UPGRADE_ID) ? 2 : 0) +
        (upgrades.includes(STEAM_POWER_UPGRADE_ID) ? 4 : 0) +
        (upgrades.includes(ELECTRICITY_UPGRADE_ID) ? 3 : 0);
    const gold = (state.qinCurrencyStandardTurnsRemaining ?? 0) > 0 ? baseGold * 2 : baseGold;
    const food =
        (upgrades.includes(CHIEFDOM_UPGRADE_ID) ? 2 : 0) +
        (upgrades.includes(MATHEMATICS_UPGRADE_ID) ? 1 : 0) +
        (upgrades.includes(STATE_LABOR_UPGRADE_ID) ? 1 : 0) +
        (upgrades.includes(URBANIZATION_UPGRADE_ID) ? 4 : 0) +
        (upgrades.includes(ELECTRICITY_UPGRADE_ID) ? 3 : 0) +
        (upgrades.includes(FEUDAL_CORN_UPGRADE_ID) ? 2 : 0) +
        (upgrades.includes(BUTTRESS_UPGRADE_ID) ? 2 : 0);
    return {
        food,
        gold,
        knowledge,
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
    researchCutoffLevel = level,
): boolean {
    const uid = Number(upgradeId);
    const have = new Set((unlocked ?? []).map((x) => Number(x)));
    const upgrade = KNOWLEDGE_UPGRADES[uid];
    if (!upgrade) return false;
    if (have.has(uid)) return false;
    if (isKnowledgeUpgradeLockedByResearchCutoff(uid, researchCutoffLevel)) return false;

    const upgradeEra = upgradeEraBySymbolType(upgrade.type);
    if (upgradeEra == null) return false;

    const currentEra = getEraFromLevel(level);
    const medievalUnlocked = have.has(FEUDALISM_UPGRADE_ID);
    const modernUnlocked = have.has(MODERN_AGE_UPGRADE_ID);
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
    if (upgrade.type === SymbolType.MODERN) return modernUnlocked;
    return upgradeEra <= currentEra;
}
