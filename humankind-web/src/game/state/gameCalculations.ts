import {
    AGRICULTURE_UPGRADE_ID,
    AGRICULTURAL_SURPLUS_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    BALLISTICS_UPGRADE_ID,
    CARAVANSERAI_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    COMPASS_UPGRADE_ID,
    DESERT_STORAGE_UPGRADE_ID,
    DRY_STORAGE_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FORESTRY_UPGRADE_ID,
    FISHERY_GUILD_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    GUNPOWDER_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    HUNTING_UPGRADE_ID,
    INTERCHANGEABLE_PARTS_UPGRADE_ID,
    IRON_WORKING_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    JUNGLE_EXPEDITION_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    MECHANICS_UPGRADE_ID,
    MINING_UPGRADE_ID,
    MODERN_AGRICULTURE_UPGRADE_ID,
    MARITIME_TRADE_UPGRADE_ID,
    NOMADIC_TRADITION_UPGRADE_ID,
    OASIS_RECOVERY_UPGRADE_ID,
    OCEANIC_ROUTES_UPGRADE_ID,
    PASTURE_MANAGEMENT_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    PLANTATION_UPGRADE_ID,
    PRESERVATION_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    SHIPBUILDING_UPGRADE_ID,
    TANNING_UPGRADE_ID,
    TRACKING_UPGRADE_ID,
    TROPICAL_DEVELOPMENT_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
} from '../data/knowledgeUpgrades';
import { getStageFoodPaymentBase, getStagePassiveBonus } from '../data/stages';
import { SymbolType } from '../data/symbolDefinitions';

const KNOWLEDGE_LEVELUP_BASE = 50;
const KNOWLEDGE_LEVELUP_STEP = 5;

export interface HudTurnStartPassiveState {
    stageId: number;
    unlockedKnowledgeUpgrades: number[];
}

export const getRerollCost = (level: number): number => Math.min(2 + Math.floor(level / 3), 5);

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
        (upgrades.includes(1) ? 2 : 0) +
        (upgrades.includes(32) ? 2 : 0) +
        (upgrades.includes(10) ? 2 : 0) +
        (upgrades.includes(16) ? 2 : 0) +
        (upgrades.includes(24) ? 5 : 0);
    const gold =
        (upgrades.includes(6) ? 2 : 0) + (upgrades.includes(10) ? 2 : 0) + (upgrades.includes(24) ? 5 : 0);
    const food =
        (upgrades.includes(34) ? 2 : 0) +
        (upgrades.includes(10) ? 5 : 0) +
        (upgrades.includes(24) ? 10 : 0);
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
    if (uid === THREE_FIELD_SYSTEM_UPGRADE_ID && !have.has(IRRIGATION_UPGRADE_ID)) return false;
    if (uid === AGRICULTURAL_SURPLUS_UPGRADE_ID && !have.has(THREE_FIELD_SYSTEM_UPGRADE_ID)) return false;
    if (uid === MODERN_AGRICULTURE_UPGRADE_ID && !have.has(AGRICULTURAL_SURPLUS_UPGRADE_ID)) return false;
    if (uid === NOMADIC_TRADITION_UPGRADE_ID && !have.has(PASTORALISM_UPGRADE_ID)) return false;
    if (uid === PASTURE_MANAGEMENT_UPGRADE_ID && !have.has(NOMADIC_TRADITION_UPGRADE_ID)) return false;
    if (uid === IRON_WORKING_UPGRADE_ID && !have.has(5)) return false;
    if (uid === IRRIGATION_UPGRADE_ID && !have.has(AGRICULTURE_UPGRADE_ID)) return false;
    if (uid === HORSEMANSHIP_UPGRADE_ID && !have.has(PASTORALISM_UPGRADE_ID)) return false;
    if (uid === SEAFARING_UPGRADE_ID && !have.has(FISHERIES_UPGRADE_ID)) return false;
    if (uid === CELESTIAL_NAVIGATION_UPGRADE_ID && !have.has(FISHERIES_UPGRADE_ID)) return false;
    if (uid === COMPASS_UPGRADE_ID && !have.has(FISHERIES_UPGRADE_ID)) return false;
    if (uid === SHIPBUILDING_UPGRADE_ID && !have.has(FISHERIES_UPGRADE_ID)) return false;
    if (uid === DRY_STORAGE_UPGRADE_ID && !have.has(FOREIGN_TRADE_UPGRADE_ID)) return false;
    if (uid === DESERT_STORAGE_UPGRADE_ID && !have.has(DRY_STORAGE_UPGRADE_ID)) return false;
    if (uid === CARAVANSERAI_UPGRADE_ID && !have.has(DESERT_STORAGE_UPGRADE_ID)) return false;
    if (uid === OASIS_RECOVERY_UPGRADE_ID && !have.has(CARAVANSERAI_UPGRADE_ID)) return false;
    if (uid === FISHERY_GUILD_UPGRADE_ID && !have.has(SEAFARING_UPGRADE_ID)) return false;
    if (uid === MARITIME_TRADE_UPGRADE_ID && !have.has(CELESTIAL_NAVIGATION_UPGRADE_ID)) return false;
    if (uid === TRACKING_UPGRADE_ID && !have.has(HUNTING_UPGRADE_ID)) return false;
    if (uid === TANNING_UPGRADE_ID && !have.has(TRACKING_UPGRADE_ID)) return false;
    if (uid === FORESTRY_UPGRADE_ID && !have.has(TANNING_UPGRADE_ID)) return false;
    if (uid === PRESERVATION_UPGRADE_ID && !have.has(FORESTRY_UPGRADE_ID)) return false;
    if (uid === PLANTATION_UPGRADE_ID && !have.has(MINING_UPGRADE_ID)) return false;
    if (uid === JUNGLE_EXPEDITION_UPGRADE_ID && !have.has(PLANTATION_UPGRADE_ID)) return false;
    if (uid === TROPICAL_DEVELOPMENT_UPGRADE_ID && !have.has(JUNGLE_EXPEDITION_UPGRADE_ID)) return false;
    if (uid === OCEANIC_ROUTES_UPGRADE_ID && !have.has(MARITIME_TRADE_UPGRADE_ID)) return false;
    if (uid === OCEANIC_ROUTES_UPGRADE_ID && !have.has(FISHERY_GUILD_UPGRADE_ID)) return false;
    if (uid === MECHANICS_UPGRADE_ID && !have.has(IRON_WORKING_UPGRADE_ID)) return false;
    if (uid === GUNPOWDER_UPGRADE_ID && !have.has(MECHANICS_UPGRADE_ID)) return false;
    if (uid === BALLISTICS_UPGRADE_ID && !have.has(GUNPOWDER_UPGRADE_ID)) return false;
    if (uid === INTERCHANGEABLE_PARTS_UPGRADE_ID && !have.has(BALLISTICS_UPGRADE_ID)) return false;
    if (upgrade.type === SymbolType.MEDIEVAL) return medievalUnlocked;
    return upgradeEra <= currentEra;
}
