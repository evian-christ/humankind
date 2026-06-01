import { describe, expect, it } from 'vitest';
import { countNonConsumableRelics, isConsumableRelicId } from './relicClassification';
import { RELIC_ID } from './relicIds';

describe('relicClassification', () => {
    it('excludes consumable relics from relic-count scaling effects', () => {
        expect(isConsumableRelicId(RELIC_ID.ANCIENT_RELIC_DEBRIS)).toBe(true);
        expect(isConsumableRelicId(RELIC_ID.OBLIVION_FURNACE)).toBe(true);
        expect(isConsumableRelicId(RELIC_ID.TROY_GOLD_LOOT)).toBe(true);
        expect(isConsumableRelicId(RELIC_ID.CLOVIS_SPEAR)).toBe(false);

        expect(countNonConsumableRelics([
            { definition: { id: RELIC_ID.CLOVIS_SPEAR } },
            { definition: { id: RELIC_ID.ANCIENT_RELIC_DEBRIS } },
            { definition: { id: RELIC_ID.TEN_COMMANDMENTS } },
            { definition: { id: RELIC_ID.PROPHECY_DIE } },
        ])).toBe(2);
    });
});
