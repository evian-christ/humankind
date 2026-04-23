import { describe, expect, it } from 'vitest';
import {
    AGRICULTURE_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
} from '../data/knowledgeUpgrades';
import { isUpgradeLegalForKnowledgePick } from './gameCalculations';

describe('isUpgradeLegalForKnowledgePick', () => {
    it('does not require Ancient Era for upgrades that only depend on their visible prerequisite line', () => {
        expect(isUpgradeLegalForKnowledgePick(
            IRRIGATION_UPGRADE_ID,
            [AGRICULTURE_UPGRADE_ID],
            5,
        )).toBe(true);
    });

    it('keeps Medieval Age as the only upgrade that depends on Ancient Era', () => {
        expect(isUpgradeLegalForKnowledgePick(FEUDALISM_UPGRADE_ID, [], 10)).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            FEUDALISM_UPGRADE_ID,
            [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
            10,
        )).toBe(true);
    });

    it('allows Three-field System once Irrigation and level requirements are met', () => {
        expect(isUpgradeLegalForKnowledgePick(
            THREE_FIELD_SYSTEM_UPGRADE_ID,
            [IRRIGATION_UPGRADE_ID],
            11,
        )).toBe(true);
    });
});
