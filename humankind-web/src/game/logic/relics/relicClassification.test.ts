import { describe, expect, it } from 'vitest';
import {
    SEAL_RELIC_IDS,
    countRelics,
    groupRelicsForDisplay,
    isSealRelicId,
    isRelicAvailableForShop,
} from './relicClassification';
import { RELIC_ID } from './relicIds';

describe('relicClassification', () => {
    it('keeps the five seal relic slots in a stable display order', () => {
        expect(SEAL_RELIC_IDS).toEqual([1, 2, 3, 4, 5]);
        expect(SEAL_RELIC_IDS).toEqual([
            RELIC_ID.ANCIENT_RELIC_DEBRIS,
            RELIC_ID.OBLIVION_FURNACE,
            RELIC_ID.ANCIENT_TRIBE_JOIN,
            RELIC_ID.MILITARY_LEVY,
            RELIC_ID.PROPHECY_DIE,
        ]);
    });

    it('excludes seal relics from relic-count scaling effects', () => {
        expect(isSealRelicId(RELIC_ID.ANCIENT_RELIC_DEBRIS)).toBe(true);
        expect(isSealRelicId(RELIC_ID.OBLIVION_FURNACE)).toBe(true);
        expect(isSealRelicId(RELIC_ID.TROY_GOLD_LOOT)).toBe(false);
        expect(isSealRelicId(RELIC_ID.EGYPTIAN_GRANARY_MODEL)).toBe(false);
        expect(isSealRelicId(RELIC_ID.CLOVIS_SPEAR)).toBe(false);

        expect(countRelics([
            { definition: { id: RELIC_ID.CLOVIS_SPEAR } },
            { definition: { id: RELIC_ID.ANCIENT_RELIC_DEBRIS } },
            { definition: { id: RELIC_ID.TEN_COMMANDMENTS } },
            { definition: { id: RELIC_ID.PROPHECY_DIE } },
        ])).toBe(2);
    });

    it('allows owned seal relics to appear in the shop again', () => {
        const ownedRelicIds = new Set([
            RELIC_ID.ANCIENT_RELIC_DEBRIS,
            RELIC_ID.CLOVIS_SPEAR,
        ]);

        expect(isRelicAvailableForShop(RELIC_ID.ANCIENT_RELIC_DEBRIS, ownedRelicIds)).toBe(true);
        expect(isRelicAvailableForShop(RELIC_ID.CLOVIS_SPEAR, ownedRelicIds)).toBe(false);
        expect(isRelicAvailableForShop(RELIC_ID.TEN_COMMANDMENTS, ownedRelicIds)).toBe(true);
    });

    it('groups matching seals for display without grouping relics', () => {
        const relics = [
            { instanceId: 'permanent-a', definition: { id: RELIC_ID.CLOVIS_SPEAR } },
            { instanceId: 'seal-a', definition: { id: RELIC_ID.ANCIENT_RELIC_DEBRIS } },
            { instanceId: 'permanent-b', definition: { id: RELIC_ID.CLOVIS_SPEAR } },
            { instanceId: 'seal-b', definition: { id: RELIC_ID.ANCIENT_RELIC_DEBRIS } },
            { instanceId: 'seal-c', definition: { id: RELIC_ID.PROPHECY_DIE } },
        ];

        const stacks = groupRelicsForDisplay(relics);

        expect(stacks.map(({ relic, count }) => [relic.instanceId, count])).toEqual([
            ['permanent-a', 1],
            ['seal-a', 2],
            ['permanent-b', 1],
            ['seal-c', 1],
        ]);
        expect(stacks[1].relics.map((relic) => relic.instanceId)).toEqual([
            'seal-a',
            'seal-b',
        ]);
    });
});
