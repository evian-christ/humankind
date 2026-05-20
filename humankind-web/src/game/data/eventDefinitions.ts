export type GameEventCategory = 'basic' | 'conditional' | 'leader';
export type GameEventEra = 1 | 2 | 3;
export type GameEventReward = Partial<Record<'food' | 'gold' | 'knowledge', number>>;

/** 시대별 스케일 수치: [고대, 중세, 현대] */
export type EraScaledTuple = readonly [number, number, number];

export const CAPITAL_RELOCATION_DESTROY_COUNT = 2;
export const CAPITAL_RELOCATION_MIN_SYMBOLS = 10;
export const CAPITAL_RELOCATION_FOOD_REWARD = 25;
export const CAPITAL_RELOCATION_KNOWLEDGE_REWARD = 15;
export const BORDER_RAID_REWARD: EraScaledTuple = [10, 20, 40];

/** 지형 조건부 이벤트 시대 스케일 수치 — selectionFlow / i18n 공통 출처 */
export const GRASSLAND_FESTIVAL_FOOD: EraScaledTuple = [10, 20, 40];
export const PLAINS_PASTURE_PER_CATTLE: EraScaledTuple = [2, 4, 8];
export const PLAINS_PASTURE_PER_SHEEP: EraScaledTuple = [2, 4, 8];
export const MARITIME_TRADE_PER_SEA: EraScaledTuple = [2, 4, 8];
export const FOREST_HARVEST_FOOD: EraScaledTuple = [7, 14, 28];
export const DESERT_CARAVAN_FOOD: EraScaledTuple = [20, 40, 80];
export const MOUNTAIN_LOOKOUT_PER_MOUNTAIN: EraScaledTuple = [7, 14, 28];
export const OASIS_BLESSING_PER_EMPTY: EraScaledTuple = [4, 8, 16];
/** every_terrain_bounty — 식량·골드·지식 각각에 동일하게 적용 */
export const EVERY_TERRAIN_BOUNTY_EACH: EraScaledTuple = [50, 100, 200];
export const MILITARY_DRAFT_FOOD: EraScaledTuple = [30, 60, 120];

/** era(1/2/3) → 시대 스케일 인덱스(0/1/2). 범위 밖이면 클램프. */
export const eraScaleIndex = (era: number): 0 | 1 | 2 => {
    if (era <= 1) return 0;
    if (era >= 3) return 2;
    return 1;
};

export interface GameEventDefinition {
    id: number;
    key: string;
    category: GameEventCategory;
    description: string;
    availability: string;
    era?: GameEventEra;
    reward?: GameEventReward;
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
        key: 'ancient_food_cache',
        category: 'basic',
        description: 'Gain 6 Food immediately.',
        availability: 'Ancient era only.',
        era: 1,
        reward: { food: 6 },
    },
    2: {
        id: 2,
        key: 'ancient_gold_cache',
        category: 'basic',
        description: 'Gain 5 Gold immediately.',
        availability: 'Ancient era only.',
        era: 1,
        reward: { gold: 5 },
    },
    3: {
        id: 3,
        key: 'ancient_knowledge_cache',
        category: 'basic',
        description: 'Gain 8 Knowledge immediately.',
        availability: 'Ancient era only.',
        era: 1,
        reward: { knowledge: 8 },
    },
    4: {
        id: 4,
        key: 'medieval_food_cache',
        category: 'basic',
        description: 'Gain 15 Food immediately.',
        availability: 'Medieval era only.',
        era: 2,
        reward: { food: 15 },
    },
    5: {
        id: 5,
        key: 'medieval_gold_cache',
        category: 'basic',
        description: 'Gain 12 Gold immediately.',
        availability: 'Medieval era only.',
        era: 2,
        reward: { gold: 12 },
    },
    6: {
        id: 6,
        key: 'medieval_knowledge_cache',
        category: 'basic',
        description: 'Gain 18 Knowledge immediately.',
        availability: 'Medieval era only.',
        era: 2,
        reward: { knowledge: 18 },
    },
    7: {
        id: 7,
        key: 'modern_food_cache',
        category: 'basic',
        description: 'Gain 35 Food immediately.',
        availability: 'Modern era only.',
        era: 3,
        reward: { food: 35 },
    },
    8: {
        id: 8,
        key: 'modern_gold_cache',
        category: 'basic',
        description: 'Gain 28 Gold immediately.',
        availability: 'Modern era only.',
        era: 3,
        reward: { gold: 28 },
    },
    9: {
        id: 9,
        key: 'modern_knowledge_cache',
        category: 'basic',
        description: 'Gain 40 Knowledge immediately.',
        availability: 'Modern era only.',
        era: 3,
        reward: { knowledge: 40 },
    },
    10: {
        id: 10,
        key: 'artifact_market_refresh',
        category: 'basic',
        description: 'Refresh the relic shop.',
        availability: '-',
    },
    11: {
        id: 11,
        key: 'border_raid',
        category: 'basic',
        description: 'Gain Food and Gold immediately. Summon 3 barbarian units.',
        availability: '-',
    },
    12: {
        id: 12,
        key: 'grassland_festival',
        category: 'conditional',
        description: 'Gain Food immediately. Scales with the current era.',
        availability: 'Requires owning at least 3 Grassland symbols.',
    },
    13: {
        id: 13,
        key: 'capital_relocation',
        category: 'conditional',
        description: `Destroy ${CAPITAL_RELOCATION_DESTROY_COUNT} random owned symbols. Gain ${CAPITAL_RELOCATION_FOOD_REWARD} Food and ${CAPITAL_RELOCATION_KNOWLEDGE_REWARD} Knowledge.`,
        availability: `Requires owning at least ${CAPITAL_RELOCATION_MIN_SYMBOLS} symbols.`,
    },
    14: {
        id: 14,
        key: 'plains_pasture',
        category: 'conditional',
        description: 'Gain Food per Cattle and Gold per Sheep on the board. Scales with the current era.',
        availability: 'Requires owning at least 2 Plains symbols.',
    },
    15: {
        id: 15,
        key: 'maritime_trade',
        category: 'conditional',
        description: 'Gain Food and Gold per Sea on the board. Scales with the current era.',
        availability: 'Requires owning at least 3 Sea symbols.',
    },
    16: {
        id: 16,
        key: 'forest_harvest',
        category: 'conditional',
        description: 'Gain Food immediately and add a Forest to your symbols. Scales with the current era.',
        availability: 'Requires owning at least 3 Forest symbols.',
    },
    17: {
        id: 17,
        key: 'jungle_expedition',
        category: 'conditional',
        description: 'Trigger the effect of every Banana on the board once.',
        availability: 'Requires owning at least 2 Rainforest symbols.',
    },
    18: {
        id: 18,
        key: 'desert_caravan',
        category: 'conditional',
        description: 'Gain Food immediately. Scales with the current era.',
        availability: 'Requires owning at least 1 Desert symbol.',
    },
    19: {
        id: 19,
        key: 'mountain_lookout',
        category: 'conditional',
        description: 'Gain Food, Gold, and Knowledge per owned Mountain. Scales with the current era.',
        availability: 'Requires owning at least 1 Mountain symbol.',
    },
    20: {
        id: 20,
        key: 'oasis_blessing',
        category: 'conditional',
        description: 'Gain Food per empty slot on the board. Scales with the current era.',
        availability: 'Requires owning at least 1 Oasis symbol.',
    },
    22: {
        id: 22,
        key: 'military_draft',
        category: 'conditional',
        description: 'Gain Food immediately. Summon a barbarian unit.',
        availability: 'Requires owning at least 3 unit symbols.',
    },
    21: {
        id: 21,
        key: 'every_terrain_bounty',
        category: 'conditional',
        description: 'Gain Food, Gold, and Knowledge immediately. Scales with the current era.',
        availability: 'Requires owning at least 1 of every terrain symbol.',
    },
    23: {
        id: 23,
        key: 'kadesh_battle_escape',
        category: 'leader',
        description: 'Add a barbarian unit with 1 HP.',
        availability: '-',
    },
    24: {
        id: 24,
        key: 'currency_standardization',
        category: 'leader',
        description: 'For the next 5 turns, double Gold base production.',
        availability: '-',
    },
};
