import { RELIC_ID } from './relicIds';

/** 소모성 유물 5종 — 플레이어에게는 "인장"(Seal)으로 통칭해 노출한다 */
export const SEAL_RELIC_IDS = [
    RELIC_ID.ANCIENT_RELIC_DEBRIS,
    RELIC_ID.OBLIVION_FURNACE,
    RELIC_ID.ANCIENT_TRIBE_JOIN,
    RELIC_ID.MILITARY_LEVY,
    RELIC_ID.PROPHECY_DIE,
] as const;

const SEAL_RELIC_ID_SET = new Set<number>(SEAL_RELIC_IDS);

export const isSealRelicId = (relicId: number): boolean =>
    SEAL_RELIC_ID_SET.has(relicId);

export const isRelicAvailableForShop = (
    relicId: number,
    ownedRelicIds: ReadonlySet<number>,
): boolean =>
    isSealRelicId(relicId) || !ownedRelicIds.has(relicId);

/** 인장을 제외한, 슬롯 제한(MAX_RELICS)이 걸리는 유물 개수 */
export const countRelics = <T extends { definition: { id: number } }>(relics: readonly T[]): number =>
    relics.filter((relic) => !isSealRelicId(relic.definition.id)).length;

export interface RelicDisplayStack<T> {
    relic: T;
    relics: T[];
    count: number;
}

export const groupRelicsForDisplay = <T extends { definition: { id: number } }>(
    relics: readonly T[],
): RelicDisplayStack<T>[] => {
    const stacks: RelicDisplayStack<T>[] = [];
    const sealStackIndexById = new Map<number, number>();

    for (const relic of relics) {
        const relicId = relic.definition.id;
        const existingIndex = isSealRelicId(relicId)
            ? sealStackIndexById.get(relicId)
            : undefined;

        if (existingIndex !== undefined) {
            const stack = stacks[existingIndex];
            stack.relics.push(relic);
            stack.count += 1;
            continue;
        }

        if (isSealRelicId(relicId)) {
            sealStackIndexById.set(relicId, stacks.length);
        }
        stacks.push({ relic, relics: [relic], count: 1 });
    }

    return stacks;
};
