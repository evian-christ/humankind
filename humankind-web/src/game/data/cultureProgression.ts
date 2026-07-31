import type { RelicDefinition, RelicRarity } from './relicDefinitions';

export const MAX_CULTURE_LEVEL = 7;

/** Total culture required to enter each level (index = level). */
export const CULTURE_LEVEL_THRESHOLDS = [0, 20, 50, 90, 140, 205, 285, 380] as const;

export const CULTURE_RELIC_RARITY_WEIGHTS: ReadonlyArray<Readonly<Record<RelicRarity, number>>> = [
    { common: 90, uncommon: 8, rare: 2, epic: 0, legendary: 0 },
    { common: 75, uncommon: 18, rare: 6, epic: 1, legendary: 0 },
    { common: 60, uncommon: 25, rare: 12, epic: 3, legendary: 0 },
    { common: 45, uncommon: 28, rare: 19, epic: 7, legendary: 1 },
    { common: 32, uncommon: 27, rare: 25, epic: 13, legendary: 3 },
    { common: 22, uncommon: 24, rare: 27, epic: 20, legendary: 7 },
    { common: 14, uncommon: 20, rare: 27, epic: 27, legendary: 12 },
    { common: 8, uncommon: 15, rare: 25, epic: 32, legendary: 20 },
];

const RARITIES: readonly RelicRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const clampCultureLevel = (level: number): number =>
    Math.max(0, Math.min(MAX_CULTURE_LEVEL, Math.floor(level)));

export const getCultureLevel = (culture: number): number => {
    const total = Math.max(0, culture);
    for (let level = MAX_CULTURE_LEVEL; level >= 0; level--) {
        if (total >= CULTURE_LEVEL_THRESHOLDS[level]!) return level;
    }
    return 0;
};

export const getCultureProgress = (culture: number) => {
    const total = Math.max(0, Math.floor(culture));
    const level = getCultureLevel(total);
    if (level >= MAX_CULTURE_LEVEL) {
        return { level, current: total - CULTURE_LEVEL_THRESHOLDS[level]!, required: 0, ratio: 1, isMax: true };
    }
    const floor = CULTURE_LEVEL_THRESHOLDS[level]!;
    const ceiling = CULTURE_LEVEL_THRESHOLDS[level + 1]!;
    return {
        level,
        current: total - floor,
        required: ceiling - floor,
        ratio: (total - floor) / (ceiling - floor),
        isMax: false,
    };
};

export const getRelicRarityWeightsForCulture = (cultureLevel: number) =>
    CULTURE_RELIC_RARITY_WEIGHTS[clampCultureLevel(cultureLevel)]!;

const pickWeightedRarity = (
    available: ReadonlyMap<RelicRarity, readonly RelicDefinition[]>,
    weights: Readonly<Record<RelicRarity, number>>,
    rng: () => number,
): RelicRarity | null => {
    const total = RARITIES.reduce(
        (sum, rarity) => sum + ((available.get(rarity)?.length ?? 0) > 0 ? weights[rarity] : 0),
        0,
    );
    if (total <= 0) return RARITIES.find((rarity) => (available.get(rarity)?.length ?? 0) > 0) ?? null;
    let roll = rng() * total;
    for (const rarity of RARITIES) {
        if ((available.get(rarity)?.length ?? 0) === 0) continue;
        roll -= weights[rarity];
        if (roll < 0) return rarity;
    }
    for (let index = RARITIES.length - 1; index >= 0; index--) {
        const rarity = RARITIES[index]!;
        if ((available.get(rarity)?.length ?? 0) > 0) return rarity;
    }
    return null;
};

export const generateCultureWeightedRelicChoices = (
    relics: readonly RelicDefinition[],
    cultureLevel: number,
    count = 3,
    rng: () => number = Math.random,
): RelicDefinition[] => {
    const pools = new Map<RelicRarity, RelicDefinition[]>(RARITIES.map((rarity) => [rarity, []]));
    relics.forEach((relic) => pools.get(relic.rarity)!.push(relic));
    const weights = getRelicRarityWeightsForCulture(cultureLevel);
    const choices: RelicDefinition[] = [];
    while (choices.length < count) {
        const rarity = pickWeightedRarity(pools, weights, rng);
        if (!rarity) break;
        const pool = pools.get(rarity)!;
        const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
        choices.push(pool.splice(index, 1)[0]!);
    }
    return choices;
};
