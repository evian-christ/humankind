import { describe, expect, it } from 'vitest';
import {
    buildAncientSymbolsUnlockDescSymbols,
    buildFeudalismDescSymbols,
    buildModernAgeDescSymbols,
    CHIEFDOM_UPGRADE_ID,
    COLONIALISM_UPGRADE_ID,
    FEUDAL_CORN_UPGRADE_ID,
    GREAT_MIGRATION_UPGRADE_ID,
    INQUISITION_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    MERCENARIES_UPGRADE_ID,
    NATIONALISM_UPGRADE_ID,
    RESTRUCTURING_UPGRADE_ID,
    SACRIFICIAL_RITE_UPGRADE_ID,
    STATE_LABOR_UPGRADE_ID,
    TOTAL_MOBILIZATION_UPGRADE_ID,
    TRIBAL_FEDERATION_UPGRADE_ID,
} from './knowledgeUpgrades';
import { isBasePool, SYMBOLS_BY_KEY, SymbolType, type SymbolKey } from './symbolDefinitions';
import { RELIC_ID } from '../logic/relics/relicIds';

describe('knowledgeUpgrades', () => {
    const ancientUnlockKeys = (leaderId: 'ramesses' | 'shihuang' | null, leaderProgressLevel: number) =>
        buildAncientSymbolsUnlockDescSymbols(leaderId, leaderProgressLevel).map((entry) => entry.symbolKey);

    it('does not show leader-only Ancient symbols on the Ancient Age unlock', () => {
        expect(ancientUnlockKeys(null, 7)).not.toContain('heqet');
        expect(ancientUnlockKeys(null, 7)).not.toContain('foxtail_millet');
        expect(ancientUnlockKeys('ramesses', 6)).not.toContain('heqet');
        expect(ancientUnlockKeys('ramesses', 7)).not.toContain('heqet');
        expect(ancientUnlockKeys('ramesses', 7)).not.toContain('foxtail_millet');
        expect(ancientUnlockKeys('shihuang', 7)).not.toContain('heqet');
        expect(ancientUnlockKeys('shihuang', 7)).not.toContain('foxtail_millet');
    });

    it('shows normal Ancient symbols on the Ancient Age unlock while keeping them out of the base pool', () => {
        expect(ancientUnlockKeys(null, 1)).toContain('bronze_tribute_chest');
        expect(isBasePool(SYMBOLS_BY_KEY.bronze_tribute_chest)).toBe(false);
        expect(
            Object.values(SYMBOLS_BY_KEY)
                .filter((symbol) => symbol.type === SymbolType.ANCIENT)
                .every((symbol) => !isBasePool(symbol)),
        ).toBe(true);
    });

    it('does not show terrain symbols as removed by the Modern Age upgrade', () => {
        const removedSymbols = buildModernAgeDescSymbols().filter((entry) => entry.relation === 'pool_remove');

        expect(removedSymbols.length).toBeGreaterThan(0);
        expect(
            removedSymbols.some((entry) => SYMBOLS_BY_KEY[entry.symbolKey as SymbolKey]?.type === SymbolType.TERRAIN),
        ).toBe(false);
    });

    it('shows every Medieval symbol as added by the Medieval Age upgrade', () => {
        const medievalKeys = Object.values(SYMBOLS_BY_KEY)
            .filter((symbol) => symbol.type === SymbolType.MEDIEVAL)
            .map((symbol) => symbol.key)
            .sort();
        const shownKeys = buildFeudalismDescSymbols()
            .filter((entry) => entry.relation === 'pool_add')
            .map((entry) => entry.symbolKey)
            .sort();

        expect(shownKeys).toEqual(medievalKeys);
    });

    it('shows Mountain as modified by the Medieval Age upgrade', () => {
        expect(buildFeudalismDescSymbols()).toContainEqual({
            symbolKey: 'mountain',
            relation: 'effect_modify',
        });
    });

    it('shows relic grants on knowledge upgrades that grant relics', () => {
        expect(KNOWLEDGE_UPGRADES[CHIEFDOM_UPGRADE_ID]?.descRelics).toEqual([
            { relicId: RELIC_ID.OBLIVION_FURNACE, count: 1 },
        ]);
        expect(KNOWLEDGE_UPGRADES[STATE_LABOR_UPGRADE_ID]?.descRelics).toEqual([
            { relicId: RELIC_ID.OBLIVION_FURNACE, count: 1 },
        ]);
        expect(KNOWLEDGE_UPGRADES[FEUDAL_CORN_UPGRADE_ID]?.descRelics).toEqual([
            { relicId: RELIC_ID.OBLIVION_FURNACE, count: 1 },
        ]);
        expect(KNOWLEDGE_UPGRADES[NATIONALISM_UPGRADE_ID]?.descRelics).toEqual([
            { relicId: RELIC_ID.OBLIVION_FURNACE, count: 1 },
        ]);
        expect(KNOWLEDGE_UPGRADES[SACRIFICIAL_RITE_UPGRADE_ID]?.descRelics).toEqual([
            { relicId: RELIC_ID.OBLIVION_FURNACE, count: 3 },
        ]);
        expect(KNOWLEDGE_UPGRADES[INQUISITION_UPGRADE_ID]?.descRelics).toEqual([
            { relicId: RELIC_ID.OBLIVION_FURNACE, count: 3 },
        ]);
        expect(KNOWLEDGE_UPGRADES[RESTRUCTURING_UPGRADE_ID]?.descRelics).toEqual([
            { relicId: RELIC_ID.OBLIVION_FURNACE, count: 3 },
        ]);
        expect(KNOWLEDGE_UPGRADES[COLONIALISM_UPGRADE_ID]?.descRelics).toEqual([
            { relicId: RELIC_ID.ANCIENT_TRIBE_JOIN, count: 3 },
        ]);
        expect(KNOWLEDGE_UPGRADES[GREAT_MIGRATION_UPGRADE_ID]?.descRelics).toEqual([
            { relicId: RELIC_ID.ANCIENT_TRIBE_JOIN, count: 2 },
            { relicId: RELIC_ID.OBLIVION_FURNACE, count: 1 },
        ]);
        expect(KNOWLEDGE_UPGRADES[TRIBAL_FEDERATION_UPGRADE_ID]?.descRelics).toEqual([
            { relicId: RELIC_ID.MILITARY_LEVY, count: 2 },
        ]);
        expect(KNOWLEDGE_UPGRADES[MERCENARIES_UPGRADE_ID]?.descRelics).toEqual([
            { relicId: RELIC_ID.MILITARY_LEVY, count: 2 },
        ]);
        expect(KNOWLEDGE_UPGRADES[TOTAL_MOBILIZATION_UPGRADE_ID]?.descRelics).toEqual([
            { relicId: RELIC_ID.MILITARY_LEVY, count: 4 },
        ]);
    });
});
