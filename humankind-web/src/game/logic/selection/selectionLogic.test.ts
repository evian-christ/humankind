import { afterEach, describe, expect, it, vi } from 'vitest';
import { isGameEventDefinition } from '../../data/eventDefinitions';
import {
    CARAVANSERAI_UPGRADE_ID,
    COMPASS_UPGRADE_ID,
    DRY_STORAGE_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    JUNGLE_EXPEDITION_UPGRADE_ID,
    MASS_MEDIA_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    PUBLIC_ADMINISTRATION_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';
import { S, SYMBOLS, SymbolType } from '../../data/symbolDefinitions';
import { buildFlatPool, generateChoices, generateEventOnlyChoices } from './selectionLogic';

describe('selectionLogic', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not include Compass in the pool before the upgrade is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
        });

        expect(pool.some((sym) => sym.id === S.compass)).toBe(false);
    });

    it('does not include Medieval symbols at level 10 before Medieval Age is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
        });

        expect(pool.some((sym) => sym.type === SymbolType.MEDIEVAL)).toBe(false);
    });

    it('includes every Medieval symbol once Medieval Age is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID],
            ownedRelicDefIds: [],
        });
        const medievalIds = Object.values(SYMBOLS)
            .filter((sym) => sym.type === SymbolType.MEDIEVAL)
            .map((sym) => sym.id)
            .sort((a, b) => a - b);
        const pooledMedievalIds = pool
            .filter((sym) => sym.type === SymbolType.MEDIEVAL)
            .map((sym) => sym.id)
            .sort((a, b) => a - b);

        expect(pooledMedievalIds).toEqual(medievalIds);
    });

    it('includes Compass in the pool once the upgrade is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID, COMPASS_UPGRADE_ID],
            ownedRelicDefIds: [],
        });

        expect(pool.some((sym) => sym.id === S.compass)).toBe(true);
    });

    it('includes Expedition in the pool once Jungle Expedition is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID, JUNGLE_EXPEDITION_UPGRADE_ID],
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
            upgrades: [FEUDALISM_UPGRADE_ID, CARAVANSERAI_UPGRADE_ID],
            ownedRelicDefIds: [],
        });

        expect(pool.some((sym) => sym.id === S.caravanserai)).toBe(true);
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

    it('only offers immediate resource events for the current era', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = generateChoices({
            era: 2,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            ownedSymbolDefIds: [],
            forceTerrainInNextSymbolChoices: false,
        });

        const events = result.choices.filter(isGameEventDefinition);
        expect(events).toHaveLength(3);
        expect(events.every((event) => event.era == null || event.era === 2)).toBe(true);
        expect(events[0]?.key).toBe('medieval_food_cache');
    });

    it('generates event-only choices from the currently eligible event pool', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);

        const choices = generateEventOnlyChoices({
            era: 2,
            ownedSymbolDefIds: [],
            leaderId: null,
            leaderProgressLevel: 1,
        });

        expect(choices).toHaveLength(3);
        expect(choices.every(isGameEventDefinition)).toBe(true);
        expect(choices.every((event) => event.era == null || event.era === 2)).toBe(true);
        expect(choices.every((event) => event.category !== 'conditional')).toBe(true);
        expect(choices[0]?.key).toBe('medieval_food_cache');
    });

    it('increases each card event chance with Public Administration and Mass Media', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.12);

        const baseResult = generateChoices({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            ownedSymbolDefIds: [],
            forceTerrainInNextSymbolChoices: false,
        });
        expect(baseResult.choices.some(isGameEventDefinition)).toBe(false);

        const publicAdminResult = generateChoices({
            era: 1,
            religionUnlocked: false,
            upgrades: [PUBLIC_ADMINISTRATION_UPGRADE_ID],
            ownedRelicDefIds: [],
            ownedSymbolDefIds: [],
            forceTerrainInNextSymbolChoices: false,
        });
        expect(publicAdminResult.choices.every(isGameEventDefinition)).toBe(true);
    });

    it('offers the Kadesh leader event only after Ramesses reaches leader level 3', () => {
        const rollKadesh = () => {
            const randomValues = [0, 0, 0, 0.05, 0.99, 0.05, 0.99, 0.05, 0.99];
            let call = 0;
            vi.spyOn(Math, 'random').mockImplementation(() => randomValues[call++] ?? 0);
        };

        rollKadesh();
        const lockedResult = generateChoices({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            ownedSymbolDefIds: [],
            leaderId: 'ramesses',
            leaderProgressLevel: 2,
            forceTerrainInNextSymbolChoices: false,
        });
        expect(lockedResult.choices.filter(isGameEventDefinition).some((event) => event.key === 'kadesh_battle_escape')).toBe(false);

        vi.restoreAllMocks();
        rollKadesh();
        const unlockedResult = generateChoices({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            ownedSymbolDefIds: [],
            leaderId: 'ramesses',
            leaderProgressLevel: 3,
            forceTerrainInNextSymbolChoices: false,
        });
        expect(unlockedResult.choices.filter(isGameEventDefinition).some((event) => event.key === 'kadesh_battle_escape')).toBe(true);
    });

    it('offers the Currency Standardization leader event only after Qin Shi Huang reaches leader level 3', () => {
        const rollCurrencyStandardization = () => {
            const randomValues = [0, 0, 0, 0.05, 0.99, 0.05, 0.99, 0.05, 0.99];
            let call = 0;
            vi.spyOn(Math, 'random').mockImplementation(() => randomValues[call++] ?? 0);
        };

        rollCurrencyStandardization();
        const lockedResult = generateChoices({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            ownedSymbolDefIds: [],
            leaderId: 'shihuang',
            leaderProgressLevel: 2,
            forceTerrainInNextSymbolChoices: false,
        });
        expect(lockedResult.choices.filter(isGameEventDefinition).some((event) => event.key === 'currency_standardization')).toBe(false);

        vi.restoreAllMocks();
        rollCurrencyStandardization();
        const unlockedResult = generateChoices({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            ownedSymbolDefIds: [],
            leaderId: 'shihuang',
            leaderProgressLevel: 3,
            forceTerrainInNextSymbolChoices: false,
        });
        expect(unlockedResult.choices.filter(isGameEventDefinition).some((event) => event.key === 'currency_standardization')).toBe(true);
    });

    it('includes Heqet only after Ramesses reaches leader level 7', () => {
        const lockedPool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            leaderId: 'ramesses',
            leaderProgressLevel: 6,
        });
        expect(lockedPool.some((sym) => sym.id === S.heqet)).toBe(false);

        const wrongLeaderPool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            leaderId: 'shihuang',
            leaderProgressLevel: 7,
        });
        expect(wrongLeaderPool.some((sym) => sym.id === S.heqet)).toBe(false);

        const unlockedPool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            leaderId: 'ramesses',
            leaderProgressLevel: 7,
        });
        expect(unlockedPool.some((sym) => sym.id === S.heqet)).toBe(true);
    });

    it('includes Foxtail Millet only after Qin Shi Huang reaches leader level 7', () => {
        const lockedPool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            leaderId: 'shihuang',
            leaderProgressLevel: 6,
        });
        expect(lockedPool.some((sym) => sym.id === S.foxtail_millet)).toBe(false);

        const wrongLeaderPool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            leaderId: 'ramesses',
            leaderProgressLevel: 7,
        });
        expect(wrongLeaderPool.some((sym) => sym.id === S.foxtail_millet)).toBe(false);

        const unlockedPool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            leaderId: 'shihuang',
            leaderProgressLevel: 7,
        });
        expect(unlockedPool.some((sym) => sym.id === S.foxtail_millet)).toBe(true);
    });

    it('stacks Mass Media multiplicatively with Public Administration', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.25);

        const massMediaOnlyResult = generateChoices({
            era: 1,
            religionUnlocked: false,
            upgrades: [MASS_MEDIA_UPGRADE_ID],
            ownedRelicDefIds: [],
            ownedSymbolDefIds: [],
            forceTerrainInNextSymbolChoices: false,
        });
        expect(massMediaOnlyResult.choices.some(isGameEventDefinition)).toBe(false);

        const stackedResult = generateChoices({
            era: 1,
            religionUnlocked: false,
            upgrades: [PUBLIC_ADMINISTRATION_UPGRADE_ID, MASS_MEDIA_UPGRADE_ID],
            ownedRelicDefIds: [],
            ownedSymbolDefIds: [],
            forceTerrainInNextSymbolChoices: false,
        });
        expect(stackedResult.choices.every(isGameEventDefinition)).toBe(true);
    });

    it('offers Capital Relocation only after owning enough symbols', () => {
        const randomValues = [
            0, 0, 0, 0, 0, 0,
            0.05, 0.99,
            0.05, 0.99,
            0.05, 0.99,
        ];
        let call = 0;
        vi.spyOn(Math, 'random').mockImplementation(() => randomValues[call++] ?? 0);

        const result = generateChoices({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
            ownedSymbolDefIds: [
                S.oral_tradition,
                S.wild_seeds,
                S.wild_seeds,
                S.wild_seeds,
                S.wild_seeds,
                S.wild_seeds,
                S.wild_seeds,
                S.wild_seeds,
                S.wild_seeds,
                S.wild_seeds,
            ],
            forceTerrainInNextSymbolChoices: false,
        });

        expect(result.choices.filter(isGameEventDefinition).some((event) => event.key === 'capital_relocation')).toBe(true);
    });
});
