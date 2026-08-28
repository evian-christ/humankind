import { describe, expect, it } from 'vitest';
import {
    KNOWLEDGE_UPGRADE_TRACK_IDS,
    KNOWLEDGE_UPGRADE_TRACKS,
    deriveKnowledgeUpgradeLevels,
    getNextKnowledgeUpgradeTrackStage,
    getUnlockedUpgradeIdsForKnowledgeLevels,
} from '../game/data/knowledgeUpgradeTracks';
import {
    AGRICULTURE_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    CURRENCY_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
} from '../game/data/knowledgeUpgrades';

describe('knowledge upgrades', () => {
    it('exposes exactly the nine fixed upgrades in product order', () => {
        expect(KNOWLEDGE_UPGRADE_TRACK_IDS).toEqual([
            'era',
            'hunting',
            'pastoralism',
            'agriculture',
            'fisheries',
            'trade',
            'tropicalAgriculture',
            'scholarship',
            'faith',
        ]);
        expect(KNOWLEDGE_UPGRADE_TRACKS).toHaveLength(9);
    });

    it('renders Era as exactly three upgrade stages', () => {
        expect(KNOWLEDGE_UPGRADE_TRACKS.find((track) => track.id === 'era')?.stages.map((stage) => stage.upgradeId))
            .toEqual([
                ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
                FEUDALISM_UPGRADE_ID,
                MODERN_AGE_UPGRADE_ID,
            ]);
    });

    it('assigns every active effect stage to one upgrade only', () => {
        const stageIds = KNOWLEDGE_UPGRADE_TRACKS.flatMap((track) =>
            track.stages.map((stage) => stage.upgradeId),
        );
        expect(new Set(stageIds).size).toBe(stageIds.length);
    });

    it('keeps level requirements increasing inside every upgrade', () => {
        for (const track of KNOWLEDGE_UPGRADE_TRACKS) {
            for (let index = 1; index < track.stages.length; index += 1) {
                expect(
                    track.stages[index]!.requiredLevel,
                    `${track.id} stage ${index + 1}`,
                ).toBeGreaterThan(track.stages[index - 1]!.requiredLevel);
            }
        }
    });

    it('derives upgrade levels from legacy unlocked upgrade IDs', () => {
        const levels = deriveKnowledgeUpgradeLevels([
            ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
            AGRICULTURE_UPGRADE_ID,
            IRRIGATION_UPGRADE_ID,
            CURRENCY_UPGRADE_ID,
        ]);

        expect(levels.era).toBe(1);
        expect(levels.agriculture).toBe(2);
        expect(levels.trade).toBe(2);
        expect(levels.faith).toBe(0);
    });

    it('returns only the next effect stage of an upgrade', () => {
        const levels = deriveKnowledgeUpgradeLevels([FOREIGN_TRADE_UPGRADE_ID]);
        expect(getNextKnowledgeUpgradeTrackStage('trade', levels)?.upgradeId).toBe(CURRENCY_UPGRADE_ID);
    });

    it('rebuilds all previous effect IDs from an upgrade level', () => {
        const levels = deriveKnowledgeUpgradeLevels([IRRIGATION_UPGRADE_ID]);
        expect(getUnlockedUpgradeIdsForKnowledgeLevels(levels)).toEqual(
            expect.arrayContaining([AGRICULTURE_UPGRADE_ID, IRRIGATION_UPGRADE_ID]),
        );
    });
});
