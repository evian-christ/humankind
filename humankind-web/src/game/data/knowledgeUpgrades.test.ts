import { describe, expect, it } from 'vitest';
import {
    AGRICULTURAL_SURPLUS_UPGRADE_ID,
    AGRICULTURE_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    getKnowledgeUpgradeDirectPrerequisites,
    IRRIGATION_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    MODERN_AGRICULTURE_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
} from './knowledgeUpgrades';
import { getKnowledgeUpgradeUnlockLevel } from './knowledgeUpgradeTiers';

describe('knowledgeUpgrades', () => {
    it('shows only active board and terrain effects on era cards', () => {
        expect(KNOWLEDGE_UPGRADES[ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID]?.descSymbols).toBeUndefined();
        expect(KNOWLEDGE_UPGRADES[FEUDALISM_UPGRADE_ID]?.descSymbols).toEqual([
            { symbolKey: 'mountain', relation: 'effect_modify' },
        ]);
    });

    it('only shows Mountain as modified on the Modern Age upgrade', () => {
        expect(KNOWLEDGE_UPGRADES[MODERN_AGE_UPGRADE_ID]?.descSymbols).toEqual([
            { symbolKey: 'mountain', relation: 'effect_modify' },
        ]);
    });

    it('keeps legacy grassland definitions without offering their no-effect stages', () => {
        expect(getKnowledgeUpgradeUnlockLevel(IRRIGATION_UPGRADE_ID)).toBeNull();
        expect(getKnowledgeUpgradeUnlockLevel(THREE_FIELD_SYSTEM_UPGRADE_ID)).toBeNull();
        expect(getKnowledgeUpgradeUnlockLevel(AGRICULTURAL_SURPLUS_UPGRADE_ID)).toBeNull();
        expect(getKnowledgeUpgradeUnlockLevel(MODERN_AGRICULTURE_UPGRADE_ID)).toBeNull();

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

});
