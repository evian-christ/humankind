import { KNOWLEDGE_UPGRADE_TRACKS } from './knowledgeUpgradeTracks';

const MAX_KNOWLEDGE_LEVEL = 30;

/**
 * Compatibility view for systems that still consume upgrade IDs by unlock level.
 * The canonical progression structure lives in knowledgeUpgradeTracks.
 */
export const KNOWLEDGE_UPGRADE_TIER_ROWS: { level: number; ids: readonly number[] }[] =
    Array.from({ length: MAX_KNOWLEDGE_LEVEL + 1 }, (_, level) => ({
        level,
        ids: KNOWLEDGE_UPGRADE_TRACKS.flatMap((track) =>
            track.stages
                .filter((stage) => stage.requiredLevel === level)
                .map((stage) => stage.upgradeId),
        ),
    }));

const KNOWLEDGE_UPGRADE_UNLOCK_LEVEL_BY_ID = new Map<number, number>(
    KNOWLEDGE_UPGRADE_TRACKS.flatMap((track) =>
        track.stages.map((stage) => [stage.upgradeId, stage.requiredLevel] as const),
    ),
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
