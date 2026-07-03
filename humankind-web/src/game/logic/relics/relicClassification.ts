import { RELIC_ID } from './relicIds';

export const CONSUMABLE_RELIC_IDS = [
    RELIC_ID.ANCIENT_RELIC_DEBRIS,
    RELIC_ID.OBLIVION_FURNACE,
    RELIC_ID.ANCIENT_TRIBE_JOIN,
    RELIC_ID.MILITARY_LEVY,
    RELIC_ID.PROPHECY_DIE,
] as const;

const CONSUMABLE_RELIC_ID_SET = new Set<number>(CONSUMABLE_RELIC_IDS);

export const isConsumableRelicId = (relicId: number): boolean =>
    CONSUMABLE_RELIC_ID_SET.has(relicId);

export const isRelicAvailableForShop = (
    relicId: number,
    ownedRelicIds: ReadonlySet<number>,
): boolean =>
    isConsumableRelicId(relicId) || !ownedRelicIds.has(relicId);

export const countNonConsumableRelics = <T extends { definition: { id: number } }>(relics: readonly T[]): number =>
    relics.filter((relic) => !isConsumableRelicId(relic.definition.id)).length;

export interface RelicDisplayStack<T> {
    relic: T;
    relics: T[];
    count: number;
}

export const groupRelicsForDisplay = <T extends { definition: { id: number } }>(
    relics: readonly T[],
): RelicDisplayStack<T>[] => {
    const stacks: RelicDisplayStack<T>[] = [];
    const consumableStackIndexById = new Map<number, number>();

    for (const relic of relics) {
        const relicId = relic.definition.id;
        const existingIndex = isConsumableRelicId(relicId)
            ? consumableStackIndexById.get(relicId)
            : undefined;

        if (existingIndex !== undefined) {
            const stack = stacks[existingIndex];
            stack.relics.push(relic);
            stack.count += 1;
            continue;
        }

        if (isConsumableRelicId(relicId)) {
            consumableStackIndexById.set(relicId, stacks.length);
        }
        stacks.push({ relic, relics: [relic], count: 1 });
    }

    return stacks;
};
