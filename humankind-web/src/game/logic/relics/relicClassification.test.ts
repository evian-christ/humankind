import { describe, expect, it } from 'vitest';
import {
    countNonConsumableRelics,
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
});
