import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
    KNOWLEDGE_UPGRADES,
    getKnowledgeUpgradeDirectDependents,
    getKnowledgeUpgradeDirectPrerequisites,
} from '../game/data/knowledgeUpgrades';

let buildBranchTierRows: typeof import('./KnowledgeUpgradesOverlay').buildBranchTierRows;
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
    it('keeps upgrades on the same level separated by at least one empty column', () => {
        for (const tier of buildBranchTierRows()) {
            const occupiedCols = tier.ids.flatMap((upgradeId, col) => upgradeId == null ? [] : [col]);
            for (let idx = 1; idx < occupiedCols.length; idx += 1) {
                expect(occupiedCols[idx]! - occupiedCols[idx - 1]!, `level ${tier.level}`).toBeGreaterThanOrEqual(2);
            }
        }
    });

    it('keeps unbranched prerequisite chains in the same or a neighboring column', () => {
        const columns = getColumnByUpgradeId();

        for (const upgrade of Object.values(KNOWLEDGE_UPGRADES)) {
            const prereqs = getKnowledgeUpgradeDirectPrerequisites(upgrade.id);
            if (prereqs.length !== 1) continue;

            const prereqId = prereqs[0]!;
            if (getKnowledgeUpgradeDirectDependents(prereqId).length !== 1) continue;

            const upgradeCol = columns.get(upgrade.id);
            const prereqCol = columns.get(prereqId);
            expect(upgradeCol, upgrade.name).toBeDefined();
            expect(prereqCol, upgrade.name).toBeDefined();
            expect(Math.abs(upgradeCol! - prereqCol!), upgrade.name).toBeLessThanOrEqual(1);
        }
    });

    it('places upgrades from the same branching prerequisite in different columns', () => {
        const columns = getColumnByUpgradeId();

        for (const upgrade of Object.values(KNOWLEDGE_UPGRADES)) {
            const dependents = getKnowledgeUpgradeDirectDependents(upgrade.id);
            if (dependents.length <= 1) continue;

            const dependentCols = dependents.map((dependentId) => columns.get(dependentId));
            expect(new Set(dependentCols).size, upgrade.name).toBe(dependentCols.length);
        }
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
