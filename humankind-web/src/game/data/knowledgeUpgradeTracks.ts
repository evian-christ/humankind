import {
    AGRICULTURAL_SURPLUS_UPGRADE_ID,
    AGRICULTURE_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    CURRENCY_UPGRADE_ID,
    EDUCATION_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    GUILD_UPGRADE_ID,
    HUNTING_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    MODERN_AGRICULTURE_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    SCIENTIFIC_THEORY_UPGRADE_ID,
    THEOCRACY_UPGRADE_ID,
    THEOLOGY_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
    TROPICAL_AGRICULTURE_UPGRADE_ID,
    WRITING_SYSTEM_UPGRADE_ID,
} from './knowledgeUpgrades';

export const KNOWLEDGE_UPGRADE_TRACK_IDS = [
    'era',
    'hunting',
    'pastoralism',
    'agriculture',
    'fisheries',
    'trade',
    'tropicalAgriculture',
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
        id: 'hunting',
        name: 'Hunting',
        stages: [{ upgradeId: HUNTING_UPGRADE_ID, requiredLevel: 2 }],
    },
    {
        id: 'pastoralism',
        name: 'Pastoralism',
        stages: [{ upgradeId: PASTORALISM_UPGRADE_ID, requiredLevel: 2 }],
    },
    {
        id: 'agriculture',
        name: 'Agriculture',
        stages: [
            { upgradeId: AGRICULTURE_UPGRADE_ID, requiredLevel: 2 },
            { upgradeId: IRRIGATION_UPGRADE_ID, requiredLevel: 5 },
            { upgradeId: THREE_FIELD_SYSTEM_UPGRADE_ID, requiredLevel: 11 },
            { upgradeId: AGRICULTURAL_SURPLUS_UPGRADE_ID, requiredLevel: 18 },
            { upgradeId: MODERN_AGRICULTURE_UPGRADE_ID, requiredLevel: 23 },
        ],
    },
    {
        id: 'fisheries',
        name: 'Fisheries',
        stages: [{ upgradeId: FISHERIES_UPGRADE_ID, requiredLevel: 2 }],
    },
    {
        id: 'trade',
        name: 'Trade',
        stages: [
            { upgradeId: FOREIGN_TRADE_UPGRADE_ID, requiredLevel: 2 },
            { upgradeId: CURRENCY_UPGRADE_ID, requiredLevel: 3 },
            { upgradeId: GUILD_UPGRADE_ID, requiredLevel: 14 },
        ],
    },
    {
        id: 'tropicalAgriculture',
        name: 'Tropical Agriculture',
        stages: [{ upgradeId: TROPICAL_AGRICULTURE_UPGRADE_ID, requiredLevel: 2 }],
    },
    {
        id: 'scholarship',
        name: 'Scholarship',
        stages: [
            { upgradeId: WRITING_SYSTEM_UPGRADE_ID, requiredLevel: 5 },
            { upgradeId: EDUCATION_UPGRADE_ID, requiredLevel: 15 },
            { upgradeId: SCIENTIFIC_THEORY_UPGRADE_ID, requiredLevel: 25 },
        ],
    },
    {
        id: 'faith',
        name: 'Faith',
        stages: [
            { upgradeId: THEOLOGY_UPGRADE_ID, requiredLevel: 7 },
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
    savedLevels?: Partial<KnowledgeUpgradeLevels> | null,
): KnowledgeUpgradeLevels {
    const levels = deriveKnowledgeUpgradeLevels(unlockedUpgradeIds);
    for (const track of KNOWLEDGE_UPGRADE_TRACKS) {
        const savedLevel = Math.floor(Number(savedLevels?.[track.id] ?? 0));
        levels[track.id] = Math.max(
            0,
            Math.min(track.stages.length, Math.max(levels[track.id], savedLevel)),
        );
    }
    return levels;
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
