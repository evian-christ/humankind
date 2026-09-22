import {
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    EDUCATION_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    GUILD_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    SCIENTIFIC_THEORY_UPGRADE_ID,
    THEOCRACY_UPGRADE_ID,
} from './knowledgeUpgrades';

export const KNOWLEDGE_UPGRADE_TRACK_IDS = [
    'era',
    'pastoralism',
    'trade',
    'scholarship',
    'faith',
] as const;

export type KnowledgeUpgradeTrackId = (typeof KNOWLEDGE_UPGRADE_TRACK_IDS)[number];
export type KnowledgeUpgradeLevels = Record<KnowledgeUpgradeTrackId, number>;

export interface KnowledgeUpgradeTrackStage {
    upgradeId: number;
    requiredLevel: number;
}

export interface KnowledgeUpgradeTrack {
    id: KnowledgeUpgradeTrackId;
    name: string;
    stages: readonly KnowledgeUpgradeTrackStage[];
}

export const KNOWLEDGE_UPGRADE_TRACKS: readonly KnowledgeUpgradeTrack[] = [
    {
        id: 'era',
        name: 'Era',
        stages: [
            { upgradeId: ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID, requiredLevel: 1 },
            { upgradeId: FEUDALISM_UPGRADE_ID, requiredLevel: 10 },
            { upgradeId: MODERN_AGE_UPGRADE_ID, requiredLevel: 20 },
        ],
    },
    {
        id: 'pastoralism',
        name: 'Pastoralism',
        stages: [{ upgradeId: PASTORALISM_UPGRADE_ID, requiredLevel: 2 }],
    },
    {
        id: 'trade',
        name: 'Trade',
        stages: [{ upgradeId: GUILD_UPGRADE_ID, requiredLevel: 14 }],
    },
    {
        id: 'scholarship',
        name: 'Scholarship',
        stages: [
            { upgradeId: EDUCATION_UPGRADE_ID, requiredLevel: 15 },
            { upgradeId: SCIENTIFIC_THEORY_UPGRADE_ID, requiredLevel: 25 },
        ],
    },
    {
        id: 'faith',
        name: 'Faith',
        stages: [
            { upgradeId: THEOCRACY_UPGRADE_ID, requiredLevel: 16 },
        ],
    },
];

export const KNOWLEDGE_UPGRADE_TRACK_BY_ID = Object.fromEntries(
    KNOWLEDGE_UPGRADE_TRACKS.map((track) => [track.id, track]),
) as Record<KnowledgeUpgradeTrackId, KnowledgeUpgradeTrack>;

const TRACK_STAGE_BY_UPGRADE_ID = new Map(
    KNOWLEDGE_UPGRADE_TRACKS.flatMap((track) =>
        track.stages.map((stage, stageIndex) => [
            stage.upgradeId,
            { trackId: track.id, stageIndex, stage },
        ] as const),
    ),
);

export function createEmptyKnowledgeUpgradeLevels(): KnowledgeUpgradeLevels {
    return Object.fromEntries(
        KNOWLEDGE_UPGRADE_TRACK_IDS.map((trackId) => [trackId, 0]),
    ) as KnowledgeUpgradeLevels;
}

export function getKnowledgeUpgradeTrackStage(upgradeId: number) {
    return TRACK_STAGE_BY_UPGRADE_ID.get(Number(upgradeId)) ?? null;
}

export function deriveKnowledgeUpgradeLevels(
    unlockedUpgradeIds: readonly number[] | undefined,
): KnowledgeUpgradeLevels {
    const levels = createEmptyKnowledgeUpgradeLevels();
    for (const upgradeId of unlockedUpgradeIds ?? []) {
        const entry = getKnowledgeUpgradeTrackStage(upgradeId);
        if (!entry) continue;
        levels[entry.trackId] = Math.max(levels[entry.trackId], entry.stageIndex + 1);
    }
    return levels;
}

export function normalizeKnowledgeUpgradeLevels(
    unlockedUpgradeIds: readonly number[] | undefined,
    _savedLevels?: Partial<KnowledgeUpgradeLevels> | null,
): KnowledgeUpgradeLevels {
    // 세트 도입 전 저장된 트랙 단계는 해금 연구를 포함한다. 현재 단계는 실제 활성 연구 ID로 재구성한다.
    return deriveKnowledgeUpgradeLevels(unlockedUpgradeIds);
}

export function getUnlockedUpgradeIdsForKnowledgeLevels(
    levels: KnowledgeUpgradeLevels,
    legacyUnlockedUpgradeIds: readonly number[] = [],
): number[] {
    const trackUpgradeIds = new Set(TRACK_STAGE_BY_UPGRADE_ID.keys());
    const unlocked = legacyUnlockedUpgradeIds
        .map(Number)
        .filter((upgradeId) => !trackUpgradeIds.has(upgradeId));

    for (const track of KNOWLEDGE_UPGRADE_TRACKS) {
        const level = Math.max(0, Math.min(track.stages.length, Math.floor(levels[track.id] ?? 0)));
        unlocked.push(...track.stages.slice(0, level).map((stage) => stage.upgradeId));
    }

    return [...new Set(unlocked)];
}

export function getNextKnowledgeUpgradeTrackStage(
    trackId: KnowledgeUpgradeTrackId,
    levels: KnowledgeUpgradeLevels,
): KnowledgeUpgradeTrackStage | null {
    const track = KNOWLEDGE_UPGRADE_TRACK_BY_ID[trackId];
    return track.stages[Math.max(0, Math.floor(levels[trackId] ?? 0))] ?? null;
}
