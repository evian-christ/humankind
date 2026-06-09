import { describe, expect, it } from 'vitest';
import {
    countNonConsumableRelics,
    groupRelicsForDisplay,
    isConsumableRelicId,
    isRelicAvailableForShop,
} from './relicClassification';
import { RELIC_ID } from './relicIds';

describe('relicClassification', () => {
    it('excludes consumable relics from relic-count scaling effects', () => {
        expect(isConsumableRelicId(RELIC_ID.ANCIENT_RELIC_DEBRIS)).toBe(true);
        expect(isConsumableRelicId(RELIC_ID.OBLIVION_FURNACE)).toBe(true);
        expect(isConsumableRelicId(RELIC_ID.TROY_GOLD_LOOT)).toBe(false);
        expect(isConsumableRelicId(RELIC_ID.EGYPTIAN_GRANARY_MODEL)).toBe(false);
        expect(isConsumableRelicId(RELIC_ID.CLOVIS_SPEAR)).toBe(false);

        expect(countNonConsumableRelics([
            { definition: { id: RELIC_ID.CLOVIS_SPEAR } },
            { definition: { id: RELIC_ID.ANCIENT_RELIC_DEBRIS } },
            { definition: { id: RELIC_ID.TEN_COMMANDMENTS } },
            { definition: { id: RELIC_ID.PROPHECY_DIE } },
        ])).toBe(2);
    });

    it('allows owned consumable relics to appear in the shop again', () => {
        const ownedRelicIds = new Set([
            RELIC_ID.ANCIENT_RELIC_DEBRIS,
            RELIC_ID.CLOVIS_SPEAR,
        ]);

        expect(isRelicAvailableForShop(RELIC_ID.ANCIENT_RELIC_DEBRIS, ownedRelicIds)).toBe(true);
        expect(isRelicAvailableForShop(RELIC_ID.CLOVIS_SPEAR, ownedRelicIds)).toBe(false);
        expect(isRelicAvailableForShop(RELIC_ID.TEN_COMMANDMENTS, ownedRelicIds)).toBe(true);
    });

    it('groups matching consumables for display without grouping non-consumables', () => {
        const relics = [
            { instanceId: 'permanent-a', definition: { id: RELIC_ID.CLOVIS_SPEAR } },
            { instanceId: 'consumable-a', definition: { id: RELIC_ID.ANCIENT_RELIC_DEBRIS } },
            { instanceId: 'permanent-b', definition: { id: RELIC_ID.CLOVIS_SPEAR } },
            { instanceId: 'consumable-b', definition: { id: RELIC_ID.ANCIENT_RELIC_DEBRIS } },
            { instanceId: 'consumable-c', definition: { id: RELIC_ID.PROPHECY_DIE } },
        ];

        const stacks = groupRelicsForDisplay(relics);

        expect(stacks.map(({ relic, count }) => [relic.instanceId, count])).toEqual([
            ['permanent-a', 1],
            ['consumable-a', 2],
            ['permanent-b', 1],
            ['consumable-c', 1],
        ]);
        expect(stacks[1].relics.map((relic) => relic.instanceId)).toEqual([
            'consumable-a',
            'consumable-b',
        ]);
    });
});
