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
import {
    getKnowledgeUpgradeUnlockLevel,
    isKnowledgeUpgradeLockedByResearchCutoff,
} from '../data/knowledgeUpgradeTiers';
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

const KNOWLEDGE_RESEARCH_LOCK_BOUNDARIES = [10, 20, 30] as const;

export const getKnowledgeResearchLockedThroughLevel = (level: number, unspentResearchPoints: number): number => {
    const normalizedLevel = Math.max(0, Math.floor(level));
    const spentLevel = getKnowledgeResearchCutoffLevel(level, unspentResearchPoints);
    let lockedThroughLevel = 0;

    for (const boundaryLevel of KNOWLEDGE_RESEARCH_LOCK_BOUNDARIES) {
        const previousEraLastLevel = boundaryLevel - 1;
        if (normalizedLevel >= boundaryLevel && spentLevel >= previousEraLastLevel) {
            lockedThroughLevel = previousEraLastLevel;
        }
    }

    return lockedThroughLevel;
};

export interface KnowledgeResearchCredit {
    grantLevel: number;
    minLevel: number;
    maxLevel: number;
}

const getKnowledgeResearchEraStartLevel = (level: number): number => {
    if (level >= 30) return 30;
    if (level >= 20) return 20;
    if (level >= 10) return 10;
    return 1;
};

export const createKnowledgeResearchCreditForLevel = (level: number): KnowledgeResearchCredit => {
    const grantLevel = Math.max(1, Math.min(30, Math.floor(level)));
    return {
        grantLevel,
        minLevel: getKnowledgeResearchEraStartLevel(grantLevel),
        maxLevel: grantLevel,
    };
};

export const createKnowledgeResearchCreditsForLevelGain = (
    previousLevel: number,
    nextLevel: number,
): KnowledgeResearchCredit[] => {
    const from = Math.max(1, Math.floor(previousLevel) + 1);
    const to = Math.max(0, Math.min(30, Math.floor(nextLevel)));
    const credits: KnowledgeResearchCredit[] = [];
    for (let level = from; level <= to; level += 1) {
        credits.push(createKnowledgeResearchCreditForLevel(level));
    }
    return credits;
};

export const normalizeKnowledgeResearchCredits = (
    level: number,
    unspentResearchPoints: number,
    credits?: readonly KnowledgeResearchCredit[] | null,
): KnowledgeResearchCredit[] => {
    const normalizedLevel = Math.max(0, Math.min(30, Math.floor(level)));
    const normalizedUnspent = Math.max(0, Math.floor(unspentResearchPoints));
    const normalizedCredits = (credits ?? [])
        .map((credit) => ({
            grantLevel: Math.max(1, Math.min(30, Math.floor(credit.grantLevel))),
            minLevel: Math.max(1, Math.min(30, Math.floor(credit.minLevel))),
            maxLevel: Math.max(1, Math.min(30, Math.floor(credit.maxLevel))),
        }))
        .filter((credit) => credit.minLevel <= credit.maxLevel)
        .sort((a, b) => a.grantLevel - b.grantLevel || a.minLevel - b.minLevel || a.maxLevel - b.maxLevel);

    const firstGrantLevel = Math.max(1, normalizedLevel - normalizedUnspent + 1);
    const fallbackCredits: KnowledgeResearchCredit[] = [];
    for (let levelToGrant = firstGrantLevel; levelToGrant <= normalizedLevel; levelToGrant += 1) {
        fallbackCredits.push(createKnowledgeResearchCreditForLevel(levelToGrant));
    }
    while (fallbackCredits.length < normalizedUnspent) {
        fallbackCredits.unshift(createKnowledgeResearchCreditForLevel(firstGrantLevel));
    }
    const fallback = fallbackCredits.slice(-normalizedUnspent);

    if (normalizedCredits.length === normalizedUnspent) return normalizedCredits;
    if (normalizedCredits.length <= 0) return fallback;
    if (normalizedCredits.length > normalizedUnspent) return normalizedCredits.slice(-normalizedUnspent);

    const existingGrantLevels = new Set(normalizedCredits.map((credit) => credit.grantLevel));
    const missingCredits = fallback.filter((credit) => !existingGrantLevels.has(credit.grantLevel));
    return [...normalizedCredits, ...missingCredits]
        .sort((a, b) => a.grantLevel - b.grantLevel || a.minLevel - b.minLevel || a.maxLevel - b.maxLevel)
        .slice(-normalizedUnspent);
};

export const isKnowledgeUpgradeCoveredByResearchCredits = (
    upgradeId: number,
    credits: readonly KnowledgeResearchCredit[],
): boolean => {
    const unlockLevel = getKnowledgeUpgradeUnlockLevel(upgradeId);
    if (unlockLevel == null) return false;
    return credits.some((credit) => unlockLevel >= credit.minLevel && unlockLevel <= credit.maxLevel);
};

export const consumeKnowledgeResearchCreditForUpgrade = (
    upgradeId: number,
    credits: readonly KnowledgeResearchCredit[],
): KnowledgeResearchCredit[] => {
    const unlockLevel = getKnowledgeUpgradeUnlockLevel(upgradeId);
    if (unlockLevel == null) return [...credits];

    let consumeIndex = -1;
    let bestSpan = Infinity;
    let bestMaxLevel = Infinity;
    credits.forEach((credit, index) => {
        if (unlockLevel < credit.minLevel || unlockLevel > credit.maxLevel) return;
        const span = credit.maxLevel - credit.minLevel;
        if (span < bestSpan || (span === bestSpan && credit.maxLevel < bestMaxLevel)) {
            consumeIndex = index;
            bestSpan = span;
            bestMaxLevel = credit.maxLevel;
        }
    });

    return credits.filter((_, index) => index !== consumeIndex);
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
