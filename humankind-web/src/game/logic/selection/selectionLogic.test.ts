import { afterEach, describe, expect, it, vi } from 'vitest';
import { isGameEventDefinition } from '../../data/eventDefinitions';
import {
    AGI_PROJECT_UPGRADE_ID,
    CARAVANSERAI_UPGRADE_ID,
    COMPASS_UPGRADE_ID,
    DRY_STORAGE_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    JUNGLE_EXPEDITION_UPGRADE_ID,
    MASS_MEDIA_UPGRADE_ID,
    MECHANICS_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    PUBLIC_ADMINISTRATION_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';
import { S, SYMBOLS, SymbolType } from '../../data/symbolDefinitions';
import { buildFlatPool, generateChoices, generateEventOnlyChoices, generateTerrainOnlyChoices } from './selectionLogic';

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

    it('opens Ancient symbols through the Ancient Age upgrade instead of the base pool', () => {
        const lockedPool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
            ownedRelicDefIds: [],
        });
        expect(lockedPool.some((sym) => sym.type === SymbolType.ANCIENT)).toBe(false);

        const unlockedPool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
            ownedRelicDefIds: [],
        });
        expect(unlockedPool.some((sym) => sym.id === S.bronze_tribute_chest)).toBe(true);
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

    it('applies unit upgrades only to the generated symbol pool', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID, MECHANICS_UPGRADE_ID],
            ownedRelicDefIds: [],
        });

        expect(pool.some((sym) => sym.id === S.archer)).toBe(false);
        const crossbowman = pool.find((sym) => sym.id === S.crossbowman);
        expect(crossbowman?.base_attack).toBe(3);
        expect(crossbowman?.base_hp).toBe(6);
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

    it('adds AGI Core to the pool only after AGI Project is unlocked', () => {
        const lockedPool = buildFlatPool({
            era: 3,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID, MODERN_AGE_UPGRADE_ID],
            ownedRelicDefIds: [],
        });
        expect(lockedPool.some((sym) => sym.id === S.agi_core)).toBe(false);

        const unlockedPool = buildFlatPool({
            era: 3,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID, MODERN_AGE_UPGRADE_ID, AGI_PROJECT_UPGRADE_ID],
            ownedRelicDefIds: [],
        });
        expect(unlockedPool.some((sym) => sym.id === S.agi_core)).toBe(true);
    });

    it('still offers random terrain-only choices after modern age', () => {
        const randomValues = [0, 0.26, 0.51];
        let call = 0;
        vi.spyOn(Math, 'random').mockImplementation(() => randomValues[call++] ?? 0);

        const choices = generateTerrainOnlyChoices({
            era: 3,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID, MODERN_AGE_UPGRADE_ID],
            ownedRelicDefIds: [],
        });

        expect(choices).toHaveLength(3);
        expect(choices.every((sym) => sym.type === SymbolType.TERRAIN)).toBe(true);
        expect(new Set(choices.map((sym) => sym.id)).size).toBeGreaterThan(1);
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
        vi.spyOn(Math, 'random').mockReturnValue(0.075);

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
            const randomValues = [0, 0, 0, 0.04, 0.99, 0.04, 0.99, 0.04, 0.99];
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
            const randomValues = [0, 0, 0, 0.04, 0.99, 0.04, 0.99, 0.04, 0.99];
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
        vi.spyOn(Math, 'random').mockReturnValue(0.15);

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
            0.04, 0.99,
            0.04, 0.99,
            0.04, 0.99,
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

    it('forces at least one event choice when Royal Colony has been destroyed', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = generateChoices({
            era: 2,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID],
            ownedRelicDefIds: [],
            ownedSymbolDefIds: [],
            forceTerrainInNextSymbolChoices: false,
            forceEventsInNextSymbolChoices: true,
        });

        expect(result.choices.some(isGameEventDefinition)).toBe(true);
        expect(result.consumedForceEvents).toBe(true);
    });
});
