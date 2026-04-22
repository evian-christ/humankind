import {
    AGRICULTURE_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    KNOWLEDGE_TIER_LEVEL_2_UPGRADE_IDS,
    KNOWLEDGE_UPGRADES,
    PASTORALISM_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
} from '../data/knowledgeUpgrades';
import { getStageFoodPaymentBase, getStagePassiveBonus } from '../data/stages';
import { S, SymbolType, type SymbolDefinition } from '../data/symbolDefinitions';

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

export const getBronzeWorkingHpBonus = (def: SymbolDefinition): number => {
    if (def.type !== SymbolType.UNIT) return 0;
    if (def.id === S.warrior || def.id === S.knight || def.id === S.caravel) return 10;
    if (def.id === S.archer) return 3;
    return 0;
};

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
    if (uid === FEUDALISM_UPGRADE_ID) return level >= 10;
    if (upgrade.type === SymbolType.MEDIEVAL) return medievalUnlocked;

    if (
        upgrade.type === SymbolType.ANCIENT &&
        uid !== ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID &&
        !KNOWLEDGE_TIER_LEVEL_2_UPGRADE_IDS.includes(uid) &&
        !have.has(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID)
    ) {
        return false;
    }

    if (uid === IRRIGATION_UPGRADE_ID && !have.has(AGRICULTURE_UPGRADE_ID)) return false;
    if (uid === HORSEMANSHIP_UPGRADE_ID && !have.has(PASTORALISM_UPGRADE_ID)) return false;
    if (uid === SEAFARING_UPGRADE_ID && !have.has(FISHERIES_UPGRADE_ID)) return false;
    if (uid === CELESTIAL_NAVIGATION_UPGRADE_ID && !have.has(SEAFARING_UPGRADE_ID)) return false;
    return upgradeEra <= currentEra;
}
