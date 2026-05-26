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
    mechanics: {
        barbarianInvasionChance?: number;
        barbarianInvasionGrowthAfterTurns?: number;
        barbarianInvasionGrowthPerTurn?: number;
    };
}

export interface ActiveStatusState {
    id: number;
    remainingTurns: number;
}

export const STATUS_ID = {
    CLAN_FORMATION: 1,
} as const;

export const BARBARIAN_INVASION_GRACE_TURNS = 5;
export const BARBARIAN_INVASION_THREAT_STEP = 0.2;

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
        mechanics: {
            barbarianInvasionChance: 0,
            barbarianInvasionGrowthAfterTurns: BARBARIAN_INVASION_GRACE_TURNS,
            barbarianInvasionGrowthPerTurn: BARBARIAN_INVASION_THREAT_STEP,
        },
    },
};

export const getActiveStatusIdsForTurn = (turn: number): number[] =>
    turn < BARBARIAN_INVASION_GRACE_TURNS ? [STATUS_ID.CLAN_FORMATION] : [];

export const createActiveStatusesForTurn = (turn: number): ActiveStatusState[] =>
    getActiveStatusIdsForTurn(turn)
        .map((id) => {
            const status = STATUSES[id];
            if (!status) return null;
            return {
                id,
                remainingTurns: Math.max(1, (status.durationTurns ?? 1) - turn),
            };
        })
        .filter((status): status is ActiveStatusState => status != null);

export const decrementActiveStatuses = (statuses: readonly ActiveStatusState[]): ActiveStatusState[] =>
    statuses
        .map((status) => ({ ...status, remainingTurns: status.remainingTurns - 1 }))
        .filter((status) => status.remainingTurns > 0);

export const getActiveStatusIdsFromStates = (statuses: readonly ActiveStatusState[]): number[] =>
    statuses.map((status) => status.id);
