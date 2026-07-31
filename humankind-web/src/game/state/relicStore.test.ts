import { beforeEach, describe, expect, it } from 'vitest';
import { RELICS } from '../data/relicDefinitions';
import { MAX_RELICS, useRelicStore } from './relicStore';
import { RELIC_ID } from '../logic/relics/relicIds';

const testRelic = RELICS[RELIC_ID.CLOVIS_SPEAR]!;

describe('relic store capacity', () => {
    beforeEach(() => {
        useRelicStore.getState().resetRelics();
    });

    it('caps owned relic instances at 20', () => {
        for (let index = 0; index < MAX_RELICS; index += 1) {
            expect(useRelicStore.getState().addRelic(testRelic)).toBe(true);
        }

        expect(useRelicStore.getState().addRelic(testRelic)).toBe(false);
        expect(useRelicStore.getState().relics).toHaveLength(MAX_RELICS);
    });

    it('allows consumable relics beyond the 20 non-consumable slots', () => {
        for (let index = 0; index < MAX_RELICS; index += 1) {
            expect(useRelicStore.getState().addRelic(testRelic)).toBe(true);
        }

        expect(useRelicStore.getState().addRelic(RELICS[RELIC_ID.ANCIENT_RELIC_DEBRIS]!)).toBe(true);
        expect(useRelicStore.getState().relics).toHaveLength(MAX_RELICS + 1);
    });

    it('caps only non-consumables when hydrating older saves', () => {
        const relics = Array.from({ length: MAX_RELICS + 3 }, (_, index) => ({
            instanceId: `relic_${index + 1}`,
            definition: testRelic,
            effect_counter: 0,
            bonus_stacks: 0,
        }));
        relics.splice(2, 0, {
            instanceId: 'relic_consumable',
            definition: RELICS[RELIC_ID.PROPHECY_DIE]!,
            effect_counter: 0,
            bonus_stacks: 0,
        });

        useRelicStore.getState().hydrateRelics(relics);

        expect(useRelicStore.getState().relics).toHaveLength(MAX_RELICS + 1);
        expect(useRelicStore.getState().relics.some(
            (relic) => relic.definition.id === RELIC_ID.PROPHECY_DIE,
        )).toBe(true);
    });
});
