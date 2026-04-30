import { describe, expect, it } from 'vitest';
import { CARAVANSERAI_UPGRADE_ID, COMPASS_UPGRADE_ID, DRY_STORAGE_UPGRADE_ID, FEUDALISM_UPGRADE_ID, JUNGLE_EXPEDITION_UPGRADE_ID, MODERN_AGE_UPGRADE_ID } from '../../data/knowledgeUpgrades';
import { S, SymbolType } from '../../data/symbolDefinitions';
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

    it('includes Dye and Papyrus in the pool once Dry Storage is unlocked', () => {
        const pool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [DRY_STORAGE_UPGRADE_ID],
            ownedRelicDefIds: [],
        });

        expect(pool.some((sym) => sym.id === S.dye)).toBe(true);
        expect(pool.some((sym) => sym.id === S.papyrus)).toBe(true);
    });

    it('includes Caravanserai in the pool once the upgrade is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [CARAVANSERAI_UPGRADE_ID],
            ownedRelicDefIds: [],
        });

        expect(pool.some((sym) => sym.id === S.caravanserai)).toBe(true);
    });

    it('does not include deleted medieval symbols in the pool after feudalism', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID],
            ownedRelicDefIds: [],
        });

        expect(pool.some((sym) => sym.id === S.telescope)).toBe(false);
        expect(pool.some((sym) => sym.id === S.scales)).toBe(false);
        expect(pool.some((sym) => sym.id === S.embassy)).toBe(false);
    });

    it('removes medieval and terrain symbols from the pool after modern age', () => {
        const pool = buildFlatPool({
            era: 3,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID, MODERN_AGE_UPGRADE_ID],
            ownedRelicDefIds: [],
        });

        expect(pool.some((sym) => sym.type === SymbolType.MEDIEVAL)).toBe(false);
        expect(pool.some((sym) => sym.type === SymbolType.TERRAIN)).toBe(false);
    });
});
