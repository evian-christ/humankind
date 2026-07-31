import { describe, expect, it } from 'vitest';
import type { RelicDefinition, RelicRarity } from './relicDefinitions';
import { CULTURE_RELIC_RARITY_WEIGHTS, generateCultureWeightedRelicChoices, getCultureLevel, getCultureProgress } from './cultureProgression';
import { SymbolType } from './symbolDefinitions';

const relic = (id: number, rarity: RelicRarity): RelicDefinition => ({
    id, rarity, name: String(id), description: '', cost: 10, type: SymbolType.RESOURCE, sprite: '-',
});

describe('culture progression', () => {
    it('advances from level 0 to 7 using cumulative culture', () => {
        expect(getCultureLevel(0)).toBe(0);
        expect(getCultureLevel(49)).toBe(1);
        expect(getCultureLevel(50)).toBe(2);
        expect(getCultureLevel(380)).toBe(7);
        expect(getCultureProgress(35)).toMatchObject({ level: 1, current: 15, required: 30, ratio: 0.5 });
        expect(getCultureProgress(999).isMax).toBe(true);
    });

    it('raises legendary weight from zero to 20 percent', () => {
        expect(CULTURE_RELIC_RARITY_WEIGHTS[0]!.legendary).toBe(0);
        expect(CULTURE_RELIC_RARITY_WEIGHTS[7]!.legendary).toBe(20);
    });

    it('draws unique relics from culture-weighted rarity pools', () => {
        const pool = [relic(1, 'common'), relic(2, 'common'), relic(3, 'legendary')];
        const rolls = [0.99, 0, 0, 0, 0, 0];
        const choices = generateCultureWeightedRelicChoices(pool, 7, 3, () => rolls.shift() ?? 0);
        expect(choices.map((choice) => choice.id)).toEqual([3, 1, 2]);
    });
});
