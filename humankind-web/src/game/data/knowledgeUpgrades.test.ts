import { describe, expect, it } from 'vitest';
import { buildAncientSymbolsUnlockDescSymbols, buildModernAgeDescSymbols } from './knowledgeUpgrades';
import { SYMBOLS_BY_KEY, SymbolType, type SymbolKey } from './symbolDefinitions';

describe('knowledgeUpgrades', () => {
    const ancientUnlockKeys = (leaderId: 'ramesses' | 'shihuang' | null, leaderProgressLevel: number) =>
        buildAncientSymbolsUnlockDescSymbols(leaderId, leaderProgressLevel).map((entry) => entry.symbolKey);

    it('shows leader Ancient symbols only for the active unlocked leader', () => {
        expect(ancientUnlockKeys(null, 7)).not.toContain('heqet');
        expect(ancientUnlockKeys(null, 7)).not.toContain('foxtail_millet');
        expect(ancientUnlockKeys('ramesses', 6)).not.toContain('heqet');
        expect(ancientUnlockKeys('ramesses', 7)).toContain('heqet');
        expect(ancientUnlockKeys('ramesses', 7)).not.toContain('foxtail_millet');
        expect(ancientUnlockKeys('shihuang', 7)).not.toContain('heqet');
        expect(ancientUnlockKeys('shihuang', 7)).toContain('foxtail_millet');
    });

    it('does not show terrain symbols as removed by the Modern Age upgrade', () => {
        const removedSymbols = buildModernAgeDescSymbols().filter((entry) => entry.relation === 'pool_remove');

        expect(removedSymbols.length).toBeGreaterThan(0);
        expect(
            removedSymbols.some((entry) => SYMBOLS_BY_KEY[entry.symbolKey as SymbolKey]?.type === SymbolType.TERRAIN),
        ).toBe(false);
    });
});
