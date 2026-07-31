import {
    AGI_PROJECT_UPGRADE_ID,
    AGRICULTURE_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    CURRENCY_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    HUNTING_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    TROPICAL_AGRICULTURE_UPGRADE_ID,
    EDUCATION_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    GUILD_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    PUBLIC_ADMINISTRATION_UPGRADE_ID,
    SCIENTIFIC_THEORY_UPGRADE_ID,
    THEOCRACY_UPGRADE_ID,
    THEOLOGY_UPGRADE_ID,
    WRITING_SYSTEM_UPGRADE_ID,
    MASS_MEDIA_UPGRADE_ID,
} from './knowledgeUpgrades';

export const KNOWLEDGE_UPGRADE_TIER_ROWS: { level: number; ids: readonly number[] }[] = [
    { level: 0, ids: [] },
    { level: 1, ids: [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID] },
    { level: 2, ids: [HUNTING_UPGRADE_ID, AGRICULTURE_UPGRADE_ID, PASTORALISM_UPGRADE_ID, FISHERIES_UPGRADE_ID, TROPICAL_AGRICULTURE_UPGRADE_ID] },
    { level: 3, ids: [CURRENCY_UPGRADE_ID] },
    { level: 4, ids: [] },
    { level: 5, ids: [WRITING_SYSTEM_UPGRADE_ID] },
    { level: 6, ids: [] },
    { level: 7, ids: [THEOLOGY_UPGRADE_ID] },
    { level: 8, ids: [] },
    { level: 9, ids: [] },
    { level: 10, ids: [FEUDALISM_UPGRADE_ID] },
    { level: 11, ids: [] },
    { level: 12, ids: [] },
    { level: 13, ids: [] },
    { level: 14, ids: [GUILD_UPGRADE_ID] },
    { level: 15, ids: [PUBLIC_ADMINISTRATION_UPGRADE_ID, EDUCATION_UPGRADE_ID] },
    { level: 16, ids: [THEOCRACY_UPGRADE_ID] },
    { level: 17, ids: [] },
    { level: 18, ids: [] },
    { level: 19, ids: [] },
    { level: 20, ids: [MODERN_AGE_UPGRADE_ID] },
    { level: 21, ids: [] },
    { level: 22, ids: [] },
    { level: 23, ids: [] },
    { level: 24, ids: [] },
    { level: 25, ids: [SCIENTIFIC_THEORY_UPGRADE_ID, MASS_MEDIA_UPGRADE_ID] },
    { level: 26, ids: [] },
    { level: 27, ids: [] },
    { level: 28, ids: [] },
    { level: 29, ids: [] },
    { level: 30, ids: [AGI_PROJECT_UPGRADE_ID] },
];

/**
 * Stable thematic lanes for the knowledge tree.
 *
 * Long prerequisite chains deliberately keep the same column so players can
 * learn where a deck's upgrades live. Independent upgrades are staggered
 * between those lanes, while the overlay layout pass resolves same-tier
 * collisions and keeps neighboring cards apart.
 */
export const KNOWLEDGE_UPGRADE_TREE_PREFERRED_COLUMN_BY_ID: Readonly<Record<number, number>> = {
    // 지형축 레인(숲 0 / 평원 2 / 초원 4 / 바다 6 / 사막 8 / 열대우림 12).
    // 사막 레인과 공통층(군사·유물지급·기반생산·선택) 레인은 아직 비어 있다.
    // 재도입 시 `removedTerrainAxisUpgrades.ts`, `removedGeneralUpgrades.ts`를 참고해 레인을 다시 잡는다.
    [HUNTING_UPGRADE_ID]: 0,
    [PASTORALISM_UPGRADE_ID]: 2,
    [AGRICULTURE_UPGRADE_ID]: 4,
    [FISHERIES_UPGRADE_ID]: 6,
    [TROPICAL_AGRICULTURE_UPGRADE_ID]: 12,

    [WRITING_SYSTEM_UPGRADE_ID]: 8,
    [EDUCATION_UPGRADE_ID]: 8,
    [SCIENTIFIC_THEORY_UPGRADE_ID]: 8,

    [PUBLIC_ADMINISTRATION_UPGRADE_ID]: 10,
    [MASS_MEDIA_UPGRADE_ID]: 10,

    [THEOLOGY_UPGRADE_ID]: 10,
    [THEOCRACY_UPGRADE_ID]: 10,

    [CURRENCY_UPGRADE_ID]: 8,
    [GUILD_UPGRADE_ID]: 8,
};

const KNOWLEDGE_UPGRADE_UNLOCK_LEVEL_BY_ID = new Map<number, number>(
    KNOWLEDGE_UPGRADE_TIER_ROWS.flatMap((tier) => tier.ids.map((id) => [id, tier.level])),
);

export function getKnowledgeUpgradeUnlockLevel(upgradeId: number): number | null {
    return KNOWLEDGE_UPGRADE_UNLOCK_LEVEL_BY_ID.get(Number(upgradeId)) ?? null;
}

export function getKnowledgeResearchLockedBeforeLevel(lockedThroughLevel: number): number {
    return Math.max(0, Math.floor(lockedThroughLevel));
}

export function isKnowledgeUpgradeLockedByResearchCutoff(upgradeId: number, lockedThroughLevel: number): boolean {
    const unlockLevel = getKnowledgeUpgradeUnlockLevel(upgradeId);
    const lockedBeforeLevel = getKnowledgeResearchLockedBeforeLevel(lockedThroughLevel);
    return unlockLevel != null && lockedBeforeLevel > 0 && unlockLevel <= lockedBeforeLevel;
}
