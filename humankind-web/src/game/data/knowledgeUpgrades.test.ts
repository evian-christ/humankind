import { describe, expect, it } from 'vitest';
import {
    buildAncientSymbolsUnlockDescSymbols,
    buildFeudalismDescSymbols,
    AGRICULTURAL_SURPLUS_UPGRADE_ID,
    AGRICULTURE_UPGRADE_ID,
    getKnowledgeUpgradeDirectPrerequisites,
    IRRIGATION_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    MODERN_AGRICULTURE_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
} from './knowledgeUpgrades';
import { isBasePool, SYMBOLS_BY_KEY, SymbolType } from './symbolDefinitions';
import { RELIC_ID } from '../logic/relics/relicIds';
import { getKnowledgeUpgradeUnlockLevel } from './knowledgeUpgradeTiers';

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

    it('places the grassland upgrade placeholders in a sequential chain', () => {
        expect(getKnowledgeUpgradeUnlockLevel(IRRIGATION_UPGRADE_ID)).toBe(5);
        expect(getKnowledgeUpgradeUnlockLevel(THREE_FIELD_SYSTEM_UPGRADE_ID)).toBe(11);
        expect(getKnowledgeUpgradeUnlockLevel(AGRICULTURAL_SURPLUS_UPGRADE_ID)).toBe(18);
        expect(getKnowledgeUpgradeUnlockLevel(MODERN_AGRICULTURE_UPGRADE_ID)).toBe(23);

        expect(getKnowledgeUpgradeDirectPrerequisites(IRRIGATION_UPGRADE_ID)).toEqual([AGRICULTURE_UPGRADE_ID]);
        expect(getKnowledgeUpgradeDirectPrerequisites(THREE_FIELD_SYSTEM_UPGRADE_ID)).toEqual([IRRIGATION_UPGRADE_ID]);
        expect(getKnowledgeUpgradeDirectPrerequisites(AGRICULTURAL_SURPLUS_UPGRADE_ID)).toEqual([THREE_FIELD_SYSTEM_UPGRADE_ID]);
        expect(getKnowledgeUpgradeDirectPrerequisites(MODERN_AGRICULTURE_UPGRADE_ID)).toEqual([AGRICULTURAL_SURPLUS_UPGRADE_ID]);

        for (const id of [
            IRRIGATION_UPGRADE_ID,
            THREE_FIELD_SYSTEM_UPGRADE_ID,
            AGRICULTURAL_SURPLUS_UPGRADE_ID,
            MODERN_AGRICULTURE_UPGRADE_ID,
        ]) {
            expect(KNOWLEDGE_UPGRADES[id]?.description).toBe('No current effect.');
            expect(KNOWLEDGE_UPGRADES[id]?.descSymbols).toBeUndefined();
        }
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

});
