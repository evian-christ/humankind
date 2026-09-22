import { afterEach, describe, expect, it, vi } from 'vitest';
import { isGameEventDefinition } from '../../data/eventDefinitions';
import {
    AGI_PROJECT_UPGRADE_ID,
    CARAVANSERAI_UPGRADE_ID,
    COMPASS_UPGRADE_ID,
    DRY_STORAGE_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    JUNGLE_EXPEDITION_UPGRADE_ID,
    MASS_MEDIA_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    PUBLIC_ADMINISTRATION_UPGRADE_ID,
    TROPICAL_AGRICULTURE_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';
import { S, SYMBOLS, SymbolType } from '../../data/symbolDefinitions';
import { DEFAULT_SYMBOL_SET_DECK_IDS, OWNED_SYMBOL_SET_IDS, SYMBOL_SET_DECK_SIZE, SYMBOL_SETS } from '../../data/symbolSets';
import { buildFlatPool, generateChoices, generateEventOnlyChoices, generateTerrainOnlyChoices } from './selectionLogic';

describe('selectionLogic', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('starts with eight owned sets equipped and four unowned empty sets', () => {
        expect(SYMBOL_SETS).toHaveLength(12);
        expect(OWNED_SYMBOL_SET_IDS).toHaveLength(SYMBOL_SET_DECK_SIZE);
        expect(DEFAULT_SYMBOL_SET_DECK_IDS).toEqual(OWNED_SYMBOL_SET_IDS);
        expect(SYMBOL_SETS.slice(SYMBOL_SET_DECK_SIZE).every((set) => set.symbolKeys.length === 0)).toBe(true);
    });

    it('offers every selected set symbol immediately without research or era unlocks', () => {
        for (const set of SYMBOL_SETS) {
            const pool = buildFlatPool({
                era: 0,
                religionUnlocked: false,
                upgrades: [],
                symbolSetId: set.id,
            });
            const pooledKeys = new Set(pool.map((sym) => sym.key));
            for (const key of set.symbolKeys) expect(pooledKeys.has(key), `${set.id}: ${key}`).toBe(true);
            expect(pooledKeys.has('grassland')).toBe(true);
            expect(pooledKeys.has('agi_core')).toBe(true);
            for (const otherSet of SYMBOL_SETS) {
                if (otherSet.id === set.id) continue;
                for (const key of otherSet.symbolKeys) expect(pooledKeys.has(key), `${set.id} excluded ${key}`).toBe(false);
            }
        }
    });

    it('keeps the selected set pool unchanged after era upgrades', () => {
        const context = { era: 1, religionUnlocked: false, symbolSetId: 'agriculture', upgrades: [] as number[] };
        const initial = buildFlatPool(context).map((sym) => sym.id).sort((a, b) => a - b);
        const later = buildFlatPool({
            ...context,
            era: 3,
            upgrades: [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID, FEUDALISM_UPGRADE_ID, MODERN_AGE_UPGRADE_ID],
        }).map((sym) => sym.id).sort((a, b) => a - b);
        expect(later).toEqual(initial);
    });

    it('uses the union of equipped sets, without symbols from other sets', () => {
        const pool = buildFlatPool({
            era: 0,
            religionUnlocked: false,
            upgrades: [],
            symbolSetIds: ['agriculture', 'faith'],
        });
        const keys = new Set(pool.map((sym) => sym.key));
        expect(keys.has('wheat')).toBe(true);
        expect(keys.has('corn')).toBe(true);
        expect(keys.has('christianity')).toBe(true);
        expect(keys.has('monastery_garden')).toBe(true);
        expect(keys.has('fish')).toBe(false);
        expect(keys.has('merchant')).toBe(false);
    });

    it('does not include Compass in the pool before the upgrade is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [],
        });

        expect(pool.some((sym) => sym.id === S.compass)).toBe(false);
    });

    it('does not include Medieval symbols at level 10 before Medieval Age is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [],
        });

        expect(pool.some((sym) => sym.type === SymbolType.MEDIEVAL)).toBe(false);
    });

    it('opens Ancient symbols through the Ancient Age upgrade instead of the base pool', () => {
        const lockedPool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [],
        });
        expect(lockedPool.some((sym) => sym.type === SymbolType.ANCIENT)).toBe(false);

        const unlockedPool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
        });
        expect(unlockedPool.some((sym) => sym.id === S.bronze_tribute_chest)).toBe(true);
    });

    it('includes every Medieval symbol once Medieval Age is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID],
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
        });

        expect(pool.some((sym) => sym.id === S.compass)).toBe(true);
    });

    it('does not include Cassava in the pool before Tropical Agriculture is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [],
        });

        expect(pool.some((sym) => sym.id === S.cassava)).toBe(false);
    });

    it('includes Cassava in the pool once Tropical Agriculture is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [TROPICAL_AGRICULTURE_UPGRADE_ID],
        });

        expect(pool.some((sym) => sym.id === S.cassava)).toBe(true);
    });

    it('includes Date in the pool once Foreign Trade is unlocked', () => {
        const pool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [FOREIGN_TRADE_UPGRADE_ID],
        });

        expect(pool.some((sym) => sym.id === S.date)).toBe(true);
    });

    it('includes Banana in the base pool without any upgrade', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [],
        });

        expect(pool.some((sym) => sym.id === S.banana)).toBe(true);
    });

    it('includes Expedition in the pool once Jungle Expedition is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID, JUNGLE_EXPEDITION_UPGRADE_ID],
        });

        expect(pool.some((sym) => sym.id === S.expedition)).toBe(true);
    });

    it('includes Dye and Papyrus in the pool once Dry Storage is unlocked', () => {
        const pool = buildFlatPool({
            era: 1,
            religionUnlocked: false,
            upgrades: [DRY_STORAGE_UPGRADE_ID],
        });

        expect(pool.some((sym) => sym.id === S.dye)).toBe(true);
        expect(pool.some((sym) => sym.id === S.papyrus)).toBe(true);
    });

    it('includes Caravanserai in the pool once the upgrade is unlocked', () => {
        const pool = buildFlatPool({
            era: 2,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID, CARAVANSERAI_UPGRADE_ID],
        });

        expect(pool.some((sym) => sym.id === S.caravanserai)).toBe(true);
    });

    it('keeps medieval symbols while removing terrain symbols after modern age', () => {
        const pool = buildFlatPool({
            era: 3,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID, MODERN_AGE_UPGRADE_ID],
        });

        expect(pool.some((sym) => sym.type === SymbolType.MEDIEVAL)).toBe(true);
        expect(pool.some((sym) => sym.type === SymbolType.TERRAIN)).toBe(false);
    });

    it('adds AGI Core to the pool only after AGI Project is unlocked', () => {
        const lockedPool = buildFlatPool({
            era: 3,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID, MODERN_AGE_UPGRADE_ID],
        });
        expect(lockedPool.some((sym) => sym.id === S.agi_core)).toBe(false);

        const unlockedPool = buildFlatPool({
            era: 3,
            religionUnlocked: false,
            upgrades: [FEUDALISM_UPGRADE_ID, MODERN_AGE_UPGRADE_ID, AGI_PROJECT_UPGRADE_ID],
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
            ownedSymbolDefIds: [],
            forceTerrainInNextSymbolChoices: false,
        });
        expect(baseResult.choices.some(isGameEventDefinition)).toBe(false);

        const publicAdminResult = generateChoices({
            era: 1,
            religionUnlocked: false,
            upgrades: [PUBLIC_ADMINISTRATION_UPGRADE_ID],
            ownedSymbolDefIds: [],
            forceTerrainInNextSymbolChoices: false,
        });
        expect(publicAdminResult.choices.every(isGameEventDefinition)).toBe(true);
    });


    it('stacks Mass Media multiplicatively with Public Administration', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.15);

        const massMediaOnlyResult = generateChoices({
            era: 1,
            religionUnlocked: false,
            upgrades: [MASS_MEDIA_UPGRADE_ID],
            ownedSymbolDefIds: [],
            forceTerrainInNextSymbolChoices: false,
        });
        expect(massMediaOnlyResult.choices.some(isGameEventDefinition)).toBe(false);

        const stackedResult = generateChoices({
            era: 1,
            religionUnlocked: false,
            upgrades: [PUBLIC_ADMINISTRATION_UPGRADE_ID, MASS_MEDIA_UPGRADE_ID],
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
            ownedSymbolDefIds: [],
            forceTerrainInNextSymbolChoices: false,
            forceEventsInNextSymbolChoices: true,
        });

        expect(result.choices.some(isGameEventDefinition)).toBe(true);
        expect(result.consumedForceEvents).toBe(true);
    });
});
