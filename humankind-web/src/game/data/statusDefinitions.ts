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
    badge: 'remainingTurns' | 'naturalDisasterChance';
    mechanics: {
        naturalDisasterChance?: number;
    };
}

export interface ActiveStatusState {
    id: number;
    remainingTurns: number;
}

export const STATUS_ID = {
    DISASTER_OMEN: 3,
} as const;

export const NATURAL_DISASTER_CHANCE = 3;

export const STATUSES: Record<number, StatusDefinition> = {
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
    const statuses: number[] = [];
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
                remainingTurns: 0,
            };
        })
        .filter((status): status is ActiveStatusState => status != null);

export const getActiveStatusIdsFromStates = (statuses: readonly ActiveStatusState[]): number[] =>
    statuses.map((status) => status.id);
