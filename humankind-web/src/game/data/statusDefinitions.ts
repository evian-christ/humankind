export type StatusCategory = 'threat';

export interface StatusDefinition {
    id: number;
    key: string;
    category: StatusCategory;
    name: string;
    nameKo: string;
    description: string;
    descriptionKo: string;
    sprite: string;
    durationTurns?: number;
    badge: 'remainingTurns' | 'barbarianInvasionChance' | 'naturalDisasterChance';
    mechanics: {
        barbarianInvasionChance?: number;
        barbarianInvasionGrowthAfterTurns?: number;
        barbarianInvasionGrowthPerTurn?: number;
        naturalDisasterChance?: number;
    };
}

export interface ActiveStatusState {
    id: number;
    remainingTurns: number;
}

export const STATUS_ID = {
    CLAN_FORMATION: 1,
    BARBARIAN_STIRRING: 2,
    DISASTER_OMEN: 3,
} as const;

export const BARBARIAN_INVASION_GRACE_TURNS = 5;
export const BARBARIAN_INVASION_THREAT_STEP = 0.2;
export const NATURAL_DISASTER_CHANCE = 3;

export const getNextBarbarianInvasionChance = (currentThreat: number): number =>
    Math.min(100, Number((currentThreat + BARBARIAN_INVASION_THREAT_STEP).toFixed(1)));

export const STATUSES: Record<number, StatusDefinition> = {
    [STATUS_ID.CLAN_FORMATION]: {
        id: STATUS_ID.CLAN_FORMATION,
        key: 'clan_formation',
        category: 'threat',
        name: 'Clan Formation',
        nameKo: '\uC528\uC871 \uD615\uC131\uAE30',
        description:
            'Barbarian invasion chance is fixed at 0%.',
        descriptionKo:
            '\uC57C\uB9CC\uC778 \uCE68\uB7B5 \uD655\uB960\uC774 0%\uB85C \uACE0\uC815\uB429\uB2C8\uB2E4.',
        sprite: '001.png',
        durationTurns: BARBARIAN_INVASION_GRACE_TURNS,
        badge: 'remainingTurns',
        mechanics: {
            barbarianInvasionChance: 0,
            barbarianInvasionGrowthAfterTurns: BARBARIAN_INVASION_GRACE_TURNS,
            barbarianInvasionGrowthPerTurn: BARBARIAN_INVASION_THREAT_STEP,
        },
    },
    [STATUS_ID.BARBARIAN_STIRRING]: {
        id: STATUS_ID.BARBARIAN_STIRRING,
        key: 'barbarian_stirring',
        category: 'threat',
        name: 'Barbarian Stirring',
        nameKo: '야만인 준동기',
        description: 'A barbarian invasion can occur. The badge shows the current chance.',
        descriptionKo: '야만인 침략이 발생할 수 있습니다. 배지에 현재 확률이 표시됩니다.',
        sprite: '002.png',
        badge: 'barbarianInvasionChance',
        mechanics: {
            barbarianInvasionGrowthPerTurn: BARBARIAN_INVASION_THREAT_STEP,
        },
    },
    [STATUS_ID.DISASTER_OMEN]: {
        id: STATUS_ID.DISASTER_OMEN,
        key: 'disaster_omen',
        category: 'threat',
        name: 'Disaster Omen',
        nameKo: '재해 전조기',
        description: 'A natural disaster can occur. The badge shows the current chance.',
        descriptionKo: '자연재해가 발생할 수 있습니다. 배지에 현재 확률이 표시됩니다.',
        sprite: '003.png',
        badge: 'naturalDisasterChance',
        mechanics: {
            naturalDisasterChance: NATURAL_DISASTER_CHANCE,
        },
    },
};

export const getActiveStatusIdsForTurn = (turn: number): number[] => {
    const statuses: number[] = [
        turn < BARBARIAN_INVASION_GRACE_TURNS
            ? STATUS_ID.CLAN_FORMATION
            : STATUS_ID.BARBARIAN_STIRRING,
    ];
    if (turn > 0) statuses.push(STATUS_ID.DISASTER_OMEN);
    return statuses;
};

export const createActiveStatusesForTurn = (turn: number): ActiveStatusState[] =>
    getActiveStatusIdsForTurn(turn)
        .map((id) => {
            const status = STATUSES[id];
            if (!status) return null;
            return {
                id,
                remainingTurns: status.badge === 'remainingTurns'
                    ? Math.max(1, (status.durationTurns ?? 1) - turn)
                    : 0,
            };
        })
        .filter((status): status is ActiveStatusState => status != null);

export const getActiveStatusIdsFromStates = (statuses: readonly ActiveStatusState[]): number[] =>
    statuses.map((status) => status.id);
