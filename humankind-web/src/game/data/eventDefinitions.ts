export type GameEventCategory = 'basic' | 'conditional' | 'leader';

export interface GameEventDefinition {
    id: number;
    key: string;
    category: GameEventCategory;
    description: string;
    availability: string;
    sprite?: string;
}

export const isGameEventDefinition = (choice: unknown): choice is GameEventDefinition =>
    typeof choice === 'object' && choice != null && 'category' in choice && 'availability' in choice;

export const GAME_EVENT_CATEGORY_ORDER: GameEventCategory[] = [
    'basic',
    'conditional',
    'leader',
];

export const GAME_EVENTS: Record<number, GameEventDefinition> = {
    1: {
        id: 1,
        key: 'grain_tribute',
        category: 'basic',
        description: 'Gain 12 Food immediately.',
        availability: '-',
    },
    2: {
        id: 2,
        key: 'merchant_patronage',
        category: 'basic',
        description: 'Gain 10 Gold immediately.',
        availability: '-',
    },
    3: {
        id: 3,
        key: 'artifact_market_refresh',
        category: 'basic',
        description: 'Refresh the relic shop.',
        availability: '-',
    },
    4: {
        id: 4,
        key: 'border_raid',
        category: 'basic',
        description: 'Summon a barbarian unit.',
        availability: '-',
    },
    5: {
        id: 5,
        key: 'grassland_festival',
        category: 'conditional',
        description: 'If you own at least 3 Grasslands, gain 8 Food and 4 Knowledge.',
        availability: 'Requires owning at least 3 Grassland symbols.',
    },
};
