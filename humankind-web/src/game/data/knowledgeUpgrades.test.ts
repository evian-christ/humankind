import { describe, expect, it } from 'vitest';
import { buildModernAgeDescSymbols } from './knowledgeUpgrades';
import { SYMBOLS_BY_KEY, SymbolType, type SymbolKey } from './symbolDefinitions';

describe('knowledgeUpgrades', () => {
    it('does not show terrain symbols as removed by the Modern Age upgrade', () => {
        const removedSymbols = buildModernAgeDescSymbols().filter((entry) => entry.relation === 'pool_remove');

        expect(removedSymbols.length).toBeGreaterThan(0);
        expect(
            removedSymbols.some((entry) => SYMBOLS_BY_KEY[entry.symbolKey as SymbolKey]?.type === SymbolType.TERRAIN),
        ).toBe(false);
    });
});
