import { beforeEach, describe, expect, it } from 'vitest';
import { RELICS } from '../data/relicDefinitions';
import { MAX_RELICS, useRelicStore } from './relicStore';

const testRelic = RELICS[1]!;

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

    it('caps hydrated relics from older saves at 20', () => {
        const relics = Array.from({ length: MAX_RELICS + 3 }, (_, index) => ({
            instanceId: `relic_${index + 1}`,
            definition: testRelic,
            effect_counter: 0,
            bonus_stacks: 0,
        }));

        useRelicStore.getState().hydrateRelics(relics);

        expect(useRelicStore.getState().relics).toHaveLength(MAX_RELICS);
    });
});
