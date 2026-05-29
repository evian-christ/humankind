import { describe, expect, it } from 'vitest';
import {
    buildAncientSymbolsUnlockDescSymbols,
    buildFeudalismDescSymbols,
    buildModernAgeDescSymbols,
} from './knowledgeUpgrades';
import { isBasePool, SYMBOLS_BY_KEY, SymbolType, type SymbolKey } from './symbolDefinitions';

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
});
