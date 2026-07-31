import { describe, expect, it } from 'vitest';
import {
    buildAncientSymbolsUnlockDescSymbols,
    buildFeudalismDescSymbols,
    KNOWLEDGE_UPGRADES,
    MODERN_AGE_UPGRADE_ID,
} from './knowledgeUpgrades';
import { isBasePool, SYMBOLS_BY_KEY, SymbolType } from './symbolDefinitions';
import { RELIC_ID } from '../logic/relics/relicIds';
import { KNOWLEDGE_UPGRADE_TREE_PREFERRED_COLUMN_BY_ID } from './knowledgeUpgradeTiers';

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

    it('only shows Mountain as modified on the Modern Age upgrade', () => {
        expect(KNOWLEDGE_UPGRADES[MODERN_AGE_UPGRADE_ID]?.descSymbols).toEqual([
            { symbolKey: 'mountain', relation: 'effect_modify' },
        ]);
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

    /**
     * 유물 지급 업그레이드를 전부 트리에서 걷어내면서 `descRelics` 검증 대상이 사라졌다.
     * 카드를 다시 넣을 때 `removedGeneralUpgrades.ts`의 relicGrant 그룹을 참고해 복원한다.
     */
    it('keeps relic grant metadata well-formed on any upgrade that declares it', () => {
        for (const upgrade of Object.values(KNOWLEDGE_UPGRADES)) {
            for (const grant of upgrade.descRelics ?? []) {
                expect(grant.count, upgrade.name).toBeGreaterThan(0);
                expect(Object.values(RELIC_ID), upgrade.name).toContain(grant.relicId);
            }
        }
    });

    /**
     * 지형축 업그레이드를 트리에서 걷어내면서 레인 간격 검증 대상이 사라졌다.
     * 축을 다시 넣을 때 레인 배치 검증을 함께 복원한다.
     */
    it('assigns every tree upgrade a lane inside the grid', () => {
        for (const upgrade of Object.values(KNOWLEDGE_UPGRADES)) {
            const col = KNOWLEDGE_UPGRADE_TREE_PREFERRED_COLUMN_BY_ID[upgrade.id];
            if (col == null) continue;
            expect(col, upgrade.name).toBeGreaterThanOrEqual(0);
            expect(col, upgrade.name).toBeLessThan(13);
        }
    });
});
