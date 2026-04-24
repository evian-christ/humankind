import { describe, expect, it } from 'vitest';
import { COMPASS_UPGRADE_ID, JUNGLE_EXPEDITION_UPGRADE_ID } from '../../data/knowledgeUpgrades';
import { S } from '../../data/symbolDefinitions';
import { buildFlatPool } from './selectionLogic';

describe('selectionLogic', () => {
    it('does not include Compass in the pool before the upgrade is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
        });

        expect(pool.some((sym) => sym.id === S.compass)).toBe(false);
    });

    it('includes Compass in the pool once the upgrade is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [COMPASS_UPGRADE_ID],
            ownedRelicDefIds: [],
        });

        expect(pool.some((sym) => sym.id === S.compass)).toBe(true);
    });

    it('includes Expedition in the pool once Jungle Expedition is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [JUNGLE_EXPEDITION_UPGRADE_ID],
            ownedRelicDefIds: [],
        });

        expect(pool.some((sym) => sym.id === S.expedition)).toBe(true);
    });
});
