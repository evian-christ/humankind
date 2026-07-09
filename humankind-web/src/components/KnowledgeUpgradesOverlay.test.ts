import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
    AGI_PROJECT_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    MODERN_AGE_UPGRADE_ID,
    getKnowledgeUpgradeDirectDependents,
    getKnowledgeUpgradeDirectPrerequisites,
} from '../game/data/knowledgeUpgrades';

let buildBranchTierRows: typeof import('./KnowledgeUpgradesOverlay').buildBranchTierRows;
let buildStandaloneTierRows: typeof import('./KnowledgeUpgradesOverlay').buildStandaloneTierRows;
let getKnowledgeEraResearchAvailability:
    typeof import('./KnowledgeUpgradesOverlay').getKnowledgeEraResearchAvailability;

beforeAll(async () => {
    vi.stubGlobal('window', {
        screen: { width: 1920, height: 1080 },
        innerWidth: 1920,
        innerHeight: 1080,
        addEventListener: vi.fn(),
    });
    vi.stubGlobal('document', {
        fullscreenElement: null,
        addEventListener: vi.fn(),
        getElementById: vi.fn(() => null),
        documentElement: {
            setAttribute: vi.fn(),
        },
    });
    ({
        buildBranchTierRows,
        buildStandaloneTierRows,
        getKnowledgeEraResearchAvailability,
    } = await import('./KnowledgeUpgradesOverlay'));
});

function getColumnByUpgradeId(): Map<number, number> {
    return new Map(
        buildBranchTierRows().flatMap((tier) =>
            tier.ids.flatMap((upgradeId, col) => upgradeId == null ? [] : [[upgradeId, col] as const]),
        ),
    );
}

describe('knowledge upgrade tree layout', () => {
    it('moves upgrades with no prerequisites or dependents out of the connected tree', () => {
        const treeIds = new Set(buildBranchTierRows().flatMap((tier) => tier.ids.filter((id): id is number => id != null)));
        const standaloneIds = new Set(buildStandaloneTierRows().flatMap((tier) => tier.ids));

        for (const upgrade of Object.values(KNOWLEDGE_UPGRADES)) {
            const hasPrereq = getKnowledgeUpgradeDirectPrerequisites(upgrade.id).length > 0;
            const hasDependent = getKnowledgeUpgradeDirectDependents(upgrade.id).length > 0;
            const isEraSpine = [
                ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
                FEUDALISM_UPGRADE_ID,
                MODERN_AGE_UPGRADE_ID,
                AGI_PROJECT_UPGRADE_ID,
            ].includes(upgrade.id);

            if (!hasPrereq && !hasDependent && !isEraSpine) {
                expect(treeIds.has(upgrade.id), upgrade.name).toBe(false);
                expect(standaloneIds.has(upgrade.id), upgrade.name).toBe(true);
            } else {
                expect(treeIds.has(upgrade.id), upgrade.name).toBe(true);
                expect(standaloneIds.has(upgrade.id), upgrade.name).toBe(false);
            }
        }
    });

    it('keeps era spine upgrades in the center sub-lane', () => {
        const columns = getColumnByUpgradeId();

        expect(columns.get(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID)).toBe(6);
        expect(columns.get(FEUDALISM_UPGRADE_ID)).toBe(6);
        expect(columns.get(MODERN_AGE_UPGRADE_ID)).toBe(6);
        expect(columns.get(AGI_PROJECT_UPGRADE_ID)).toBe(6);
    });
});

describe('knowledge era research availability', () => {
    it('counts researched upgrades in the requested era', () => {
        expect(getKnowledgeEraResearchAvailability([1, 2, 26, 51], 1, 9)).toEqual({
            available: 2,
            total: 9,
        });
        expect(getKnowledgeEraResearchAvailability([1, 2, 26, 51], 10, 19)).toEqual({
            available: 1,
            total: 10,
        });
        expect(getKnowledgeEraResearchAvailability([1, 2, 26, 51], 20, 29)).toEqual({
            available: 1,
            total: 10,
        });
    });

    it('does not include the level 30 AGI project in modern research progress', () => {
        expect(getKnowledgeEraResearchAvailability([63], 20, 29)).toEqual({
            available: 0,
            total: 10,
        });
    });
});
