import { describe, expect, it } from 'vitest';
import { CARAVANSERAI_UPGRADE_ID } from '../data/knowledgeUpgrades';
import { aggregateCollectionDestroyEffects, createInstance } from './gameStoreHelpers';
import { Sym } from '../data/symbolDefinitions';

describe('aggregateCollectionDestroyEffects', () => {
    it('grants destroy rewards for Dye and Papyrus', () => {
        const result = aggregateCollectionDestroyEffects(
            [createInstance(Sym.dye), createInstance(Sym.papyrus)],
            false,
            [],
        );

        expect(result.gold).toBe(10);
        expect(result.knowledge).toBe(10);
    });

    it('upgrades destroy rewards for Dye and Papyrus with Caravanserai', () => {
        const result = aggregateCollectionDestroyEffects(
            [createInstance(Sym.dye), createInstance(Sym.papyrus)],
            false,
            [CARAVANSERAI_UPGRADE_ID],
        );

        expect(result.gold).toBe(20);
        expect(result.knowledge).toBe(20);
    });
});
