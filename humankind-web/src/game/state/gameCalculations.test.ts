import { describe, expect, it } from 'vitest';
import {
    AGRICULTURE_UPGRADE_ID,
    AGRICULTURAL_SURPLUS_UPGRADE_ID,
    AGI_PROJECT_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    ARCHITECTURE_UPGRADE_ID,
    CARAVANSERAI_UPGRADE_ID,
    COLONIALISM_UPGRADE_ID,
    ELECTRICITY_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    COMPASS_UPGRADE_ID,
    DESERT_STORAGE_UPGRADE_ID,
    EXPLORATION_UPGRADE_ID,
    FEUDAL_CORN_UPGRADE_ID,
    DRY_STORAGE_UPGRADE_ID,
    FISHERY_GUILD_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    FORESTRY_UPGRADE_ID,
    HUNTING_UPGRADE_ID,
    JUNGLE_EXPEDITION_UPGRADE_ID,
    MARITIME_TRADE_UPGRADE_ID,
    MODERN_AGRICULTURE_UPGRADE_ID,
    MILITARY_SCIENCE_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    NOMADIC_TRADITION_UPGRADE_ID,
    OCEANIC_ROUTES_UPGRADE_ID,
    OASIS_RECOVERY_UPGRADE_ID,
    MINING_UPGRADE_ID,
    NATIONALISM_UPGRADE_ID,
    PASTURE_MANAGEMENT_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    PLANTATION_UPGRADE_ID,
    PRESERVATION_UPGRADE_ID,
    SCIENTIFIC_THEORY_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    SHIPBUILDING_UPGRADE_ID,
    TANNING_UPGRADE_ID,
    THEOCRACY_UPGRADE_ID,
    TRACKING_UPGRADE_ID,
    TROPICAL_DEVELOPMENT_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    GUILD_UPGRADE_ID,
    STATE_LABOR_UPGRADE_ID,
    STEAM_POWER_UPGRADE_ID,
    URBANIZATION_UPGRADE_ID,
} from '../data/knowledgeUpgrades';
import {
    getGoldInflationMultiplier,
    getHudTurnStartPassiveTotals,
    getInflatedGoldCost,
    getRerollCost,
    isUpgradeLegalForKnowledgePick,
} from './gameCalculations';

describe('gold inflation costs', () => {
    it('scales gold costs by knowledge level milestones', () => {
        expect(getGoldInflationMultiplier(0)).toBeCloseTo(1);
        expect(getGoldInflationMultiplier(10)).toBeCloseTo(1.67);
        expect(getGoldInflationMultiplier(20)).toBeCloseTo(2.68);
        expect(getGoldInflationMultiplier(30)).toBeCloseTo(4.03);
    });

    it('applies inflation to relic-scale gold costs before discounts', () => {
        expect(getInflatedGoldCost(20, 0)).toBe(20);
        expect(getInflatedGoldCost(20, 10)).toBe(33);
        expect(getInflatedGoldCost(20, 20)).toBe(54);
        expect(getInflatedGoldCost(20, 30)).toBe(81);
        expect(getInflatedGoldCost(20, 20, 0.5)).toBe(27);
    });

    it('replaces the old reroll step curve with the shared gold inflation curve', () => {
        expect(getRerollCost(0)).toBe(2);
        expect(getRerollCost(10)).toBe(3);
        expect(getRerollCost(20)).toBe(5);
        expect(getRerollCost(30)).toBe(8);
        expect(getRerollCost(30, 0.5)).toBe(4);
    });
});

describe('isUpgradeLegalForKnowledgePick', () => {
    it('does not require Ancient Era for upgrades that only depend on their visible prerequisite line', () => {
        expect(isUpgradeLegalForKnowledgePick(
            IRRIGATION_UPGRADE_ID,
            [AGRICULTURE_UPGRADE_ID],
            5,
        )).toBe(true);
    });

    it('requires Writing System before Education', () => {
        expect(isUpgradeLegalForKnowledgePick(
            16,
            [],
            14,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            16,
            [1],
            14,
        )).toBe(true);
    });

    it('requires Education before Scientific Theory', () => {
        expect(isUpgradeLegalForKnowledgePick(
            SCIENTIFIC_THEORY_UPGRADE_ID,
            [],
            25,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            SCIENTIFIC_THEORY_UPGRADE_ID,
            [16],
            25,
        )).toBe(true);
    });

    it('requires Theology before Theocracy at level 16', () => {
        expect(isUpgradeLegalForKnowledgePick(
            THEOCRACY_UPGRADE_ID,
            [],
            16,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            THEOCRACY_UPGRADE_ID,
            [4],
            15,
        )).toBe(true);
    });

    it('requires Currency before Guild at level 14', () => {
        expect(isUpgradeLegalForKnowledgePick(
            GUILD_UPGRADE_ID,
            [],
            14,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            GUILD_UPGRADE_ID,
            [6],
            14,
        )).toBe(true);
    });

    it('requires Horsemanship before Military Science at level 14', () => {
        expect(isUpgradeLegalForKnowledgePick(
            MILITARY_SCIENCE_UPGRADE_ID,
            [],
            14,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            MILITARY_SCIENCE_UPGRADE_ID,
            [7],
            14,
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

    it('chains Agricultural Surplus after Three-field System', () => {
        expect(isUpgradeLegalForKnowledgePick(
            AGRICULTURAL_SURPLUS_UPGRADE_ID,
            [IRRIGATION_UPGRADE_ID],
            17,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            AGRICULTURAL_SURPLUS_UPGRADE_ID,
            [THREE_FIELD_SYSTEM_UPGRADE_ID],
            17,
        )).toBe(true);
    });

    it('chains Modern Agriculture after Agricultural Surplus in the modern era', () => {
        expect(isUpgradeLegalForKnowledgePick(
            MODERN_AGRICULTURE_UPGRADE_ID,
            [THREE_FIELD_SYSTEM_UPGRADE_ID],
            23,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            MODERN_AGRICULTURE_UPGRADE_ID,
            [AGRICULTURAL_SURPLUS_UPGRADE_ID],
            23,
        )).toBe(true);
    });

    it('requires Medieval Age and level 20 for Modern Age', () => {
        expect(isUpgradeLegalForKnowledgePick(
            MODERN_AGE_UPGRADE_ID,
            [],
            20,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            MODERN_AGE_UPGRADE_ID,
            [FEUDALISM_UPGRADE_ID],
            19,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            MODERN_AGE_UPGRADE_ID,
            [FEUDALISM_UPGRADE_ID],
            20,
        )).toBe(true);
    });

    it('requires Modern Age and level 30 for AGI Project', () => {
        expect(isUpgradeLegalForKnowledgePick(
            AGI_PROJECT_UPGRADE_ID,
            [],
            30,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            AGI_PROJECT_UPGRADE_ID,
            [MODERN_AGE_UPGRADE_ID],
            29,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            AGI_PROJECT_UPGRADE_ID,
            [MODERN_AGE_UPGRADE_ID],
            30,
        )).toBe(true);
    });

    it('chains Nomadic Tradition after Pastoralism', () => {
        expect(isUpgradeLegalForKnowledgePick(
            NOMADIC_TRADITION_UPGRADE_ID,
            [],
            9,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            NOMADIC_TRADITION_UPGRADE_ID,
            [PASTORALISM_UPGRADE_ID],
            9,
        )).toBe(true);
    });

    it('chains Pasture Management after Nomadic Tradition', () => {
        expect(isUpgradeLegalForKnowledgePick(
            PASTURE_MANAGEMENT_UPGRADE_ID,
            [PASTORALISM_UPGRADE_ID],
            18,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            PASTURE_MANAGEMENT_UPGRADE_ID,
            [NOMADIC_TRADITION_UPGRADE_ID],
            18,
        )).toBe(true);
    });

    it('still requires Fisheries before Compass even above its unlock level', () => {
        expect(isUpgradeLegalForKnowledgePick(
            COMPASS_UPGRADE_ID,
            [],
            11,
        )).toBe(false);
    });

    it('uses Fisheries as the prerequisite for Celestial Navigation', () => {
        expect(isUpgradeLegalForKnowledgePick(
            CELESTIAL_NAVIGATION_UPGRADE_ID,
            [],
            11,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            CELESTIAL_NAVIGATION_UPGRADE_ID,
            [FISHERIES_UPGRADE_ID],
            11,
        )).toBe(true);
    });

    it('requires Fisheries for Compass', () => {
        expect(isUpgradeLegalForKnowledgePick(
            COMPASS_UPGRADE_ID,
            [],
            9,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            COMPASS_UPGRADE_ID,
            [FISHERIES_UPGRADE_ID],
            9,
        )).toBe(true);
    });

    it('requires Seafaring for Fishery Guild', () => {
        expect(isUpgradeLegalForKnowledgePick(
            FISHERY_GUILD_UPGRADE_ID,
            [FISHERIES_UPGRADE_ID],
            11,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            FISHERY_GUILD_UPGRADE_ID,
            [SEAFARING_UPGRADE_ID],
            11,
        )).toBe(true);
    });

    it('requires Celestial Navigation for Maritime Trade', () => {
        expect(isUpgradeLegalForKnowledgePick(
            MARITIME_TRADE_UPGRADE_ID,
            [FISHERIES_UPGRADE_ID],
            13,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            MARITIME_TRADE_UPGRADE_ID,
            [CELESTIAL_NAVIGATION_UPGRADE_ID],
            13,
        )).toBe(true);
    });

    it('requires Mining for Plantation', () => {
        expect(isUpgradeLegalForKnowledgePick(
            PLANTATION_UPGRADE_ID,
            [],
            11,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            PLANTATION_UPGRADE_ID,
            [MINING_UPGRADE_ID],
            11,
        )).toBe(true);
    });

    it('requires Hunting for Tracking', () => {
        expect(isUpgradeLegalForKnowledgePick(
            TRACKING_UPGRADE_ID,
            [],
            6,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            TRACKING_UPGRADE_ID,
            [HUNTING_UPGRADE_ID],
            6,
        )).toBe(true);
    });

    it('requires Tracking for Tanning', () => {
        expect(isUpgradeLegalForKnowledgePick(
            TANNING_UPGRADE_ID,
            [HUNTING_UPGRADE_ID],
            12,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            TANNING_UPGRADE_ID,
            [HUNTING_UPGRADE_ID, TRACKING_UPGRADE_ID],
            12,
        )).toBe(true);
    });

    it('requires Tanning for Forestry', () => {
        expect(isUpgradeLegalForKnowledgePick(
            FORESTRY_UPGRADE_ID,
            [HUNTING_UPGRADE_ID, TRACKING_UPGRADE_ID],
            18,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            FORESTRY_UPGRADE_ID,
            [HUNTING_UPGRADE_ID, TRACKING_UPGRADE_ID, TANNING_UPGRADE_ID],
            18,
        )).toBe(true);
    });

    it('requires Forestry for Preservation', () => {
        expect(isUpgradeLegalForKnowledgePick(
            PRESERVATION_UPGRADE_ID,
            [HUNTING_UPGRADE_ID, TRACKING_UPGRADE_ID, TANNING_UPGRADE_ID],
            24,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            PRESERVATION_UPGRADE_ID,
            [HUNTING_UPGRADE_ID, TRACKING_UPGRADE_ID, TANNING_UPGRADE_ID, FORESTRY_UPGRADE_ID],
            24,
        )).toBe(true);
    });

    it('requires Plantation for Jungle Expedition', () => {
        expect(isUpgradeLegalForKnowledgePick(
            JUNGLE_EXPEDITION_UPGRADE_ID,
            [MINING_UPGRADE_ID],
            16,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            JUNGLE_EXPEDITION_UPGRADE_ID,
            [PLANTATION_UPGRADE_ID],
            16,
        )).toBe(true);
    });

    it('requires Jungle Expedition for Tropical Development', () => {
        expect(isUpgradeLegalForKnowledgePick(
            TROPICAL_DEVELOPMENT_UPGRADE_ID,
            [PLANTATION_UPGRADE_ID],
            25,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            TROPICAL_DEVELOPMENT_UPGRADE_ID,
            [JUNGLE_EXPEDITION_UPGRADE_ID],
            25,
        )).toBe(true);
    });

    it('requires both Maritime Trade and Fishery Guild for Oceanic Routes', () => {
        expect(isUpgradeLegalForKnowledgePick(
            OCEANIC_ROUTES_UPGRADE_ID,
            [MARITIME_TRADE_UPGRADE_ID],
            21,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            OCEANIC_ROUTES_UPGRADE_ID,
            [FISHERY_GUILD_UPGRADE_ID],
            21,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            OCEANIC_ROUTES_UPGRADE_ID,
            [MARITIME_TRADE_UPGRADE_ID, FISHERY_GUILD_UPGRADE_ID],
            21,
        )).toBe(true);
    });

    it('requires Fisheries for Shipbuilding', () => {
        expect(isUpgradeLegalForKnowledgePick(
            SHIPBUILDING_UPGRADE_ID,
            [],
            15,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            SHIPBUILDING_UPGRADE_ID,
            [FISHERIES_UPGRADE_ID],
            15,
        )).toBe(true);
    });

    it('requires Foreign Trade for Dry Storage', () => {
        expect(isUpgradeLegalForKnowledgePick(
            DRY_STORAGE_UPGRADE_ID,
            [],
            6,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            DRY_STORAGE_UPGRADE_ID,
            [FOREIGN_TRADE_UPGRADE_ID],
            6,
        )).toBe(true);
    });

    it('requires Trade Goods Exchange for Dry Storage at level 12', () => {
        expect(isUpgradeLegalForKnowledgePick(
            DESERT_STORAGE_UPGRADE_ID,
            [],
            12,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            DESERT_STORAGE_UPGRADE_ID,
            [DRY_STORAGE_UPGRADE_ID],
            12,
        )).toBe(true);
    });

    it('requires Dry Storage for Caravanserai at level 17', () => {
        expect(isUpgradeLegalForKnowledgePick(
            CARAVANSERAI_UPGRADE_ID,
            [DRY_STORAGE_UPGRADE_ID],
            17,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            CARAVANSERAI_UPGRADE_ID,
            [DESERT_STORAGE_UPGRADE_ID],
            17,
        )).toBe(true);
    });

    it('requires Caravanserai for Oasis Recovery Network at level 22', () => {
        expect(isUpgradeLegalForKnowledgePick(
            OASIS_RECOVERY_UPGRADE_ID,
            [DESERT_STORAGE_UPGRADE_ID],
            22,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            OASIS_RECOVERY_UPGRADE_ID,
            [CARAVANSERAI_UPGRADE_ID],
            22,
        )).toBe(true);
    });
});

describe('getHudTurnStartPassiveTotals', () => {
    it('does not add passive production for Writing System, Currency, Education, or Scientific Theory', () => {
        expect(getHudTurnStartPassiveTotals({
            stageId: 1,
            unlockedKnowledgeUpgrades: [1, 6, 16, SCIENTIFIC_THEORY_UPGRADE_ID],
        })).toEqual({ food: 2, gold: 2, knowledge: 4 });
    });

    it('applies updated Mathematics and Printing Press passive production', () => {
        expect(getHudTurnStartPassiveTotals({
            stageId: 1,
            unlockedKnowledgeUpgrades: [10, 24],
        })).toEqual({ food: 3, gold: 4, knowledge: 7 });
    });

    it('applies State Labor passive production', () => {
        expect(getHudTurnStartPassiveTotals({
            stageId: 1,
            unlockedKnowledgeUpgrades: [STATE_LABOR_UPGRADE_ID],
        })).toEqual({ food: 3, gold: 3, knowledge: 4 });
    });

    it('applies Feudalism passive food production', () => {
        expect(getHudTurnStartPassiveTotals({
            stageId: 1,
            unlockedKnowledgeUpgrades: [FEUDAL_CORN_UPGRADE_ID],
        })).toEqual({ food: 4, gold: 2, knowledge: 4 });
    });

    it('applies Architecture passive knowledge production', () => {
        expect(getHudTurnStartPassiveTotals({
            stageId: 1,
            unlockedKnowledgeUpgrades: [ARCHITECTURE_UPGRADE_ID],
        })).toEqual({ food: 2, gold: 2, knowledge: 5 });
    });

    it('applies Nationalism passive knowledge production', () => {
        expect(getHudTurnStartPassiveTotals({
            stageId: 1,
            unlockedKnowledgeUpgrades: [NATIONALISM_UPGRADE_ID],
        })).toEqual({ food: 2, gold: 2, knowledge: 7 });
    });

    it('applies Exploration passive gold production', () => {
        expect(getHudTurnStartPassiveTotals({
            stageId: 1,
            unlockedKnowledgeUpgrades: [EXPLORATION_UPGRADE_ID],
        })).toEqual({ food: 2, gold: 4, knowledge: 4 });
    });

    it('applies Colonialism passive gold production', () => {
        expect(getHudTurnStartPassiveTotals({
            stageId: 1,
            unlockedKnowledgeUpgrades: [COLONIALISM_UPGRADE_ID],
        })).toEqual({ food: 2, gold: 5, knowledge: 4 });
    });

    it('applies Urbanization passive food and gold production', () => {
        expect(getHudTurnStartPassiveTotals({
            stageId: 1,
            unlockedKnowledgeUpgrades: [URBANIZATION_UPGRADE_ID],
        })).toEqual({ food: 12, gold: 4, knowledge: 4 });
    });

    it('applies Steam Power passive gold and knowledge production', () => {
        expect(getHudTurnStartPassiveTotals({
            stageId: 1,
            unlockedKnowledgeUpgrades: [STEAM_POWER_UPGRADE_ID],
        })).toEqual({ food: 2, gold: 10, knowledge: 8 });
    });

    it('applies Electricity passive food, gold, and knowledge production', () => {
        expect(getHudTurnStartPassiveTotals({
            stageId: 1,
            unlockedKnowledgeUpgrades: [ELECTRICITY_UPGRADE_ID],
        })).toEqual({ food: 7, gold: 12, knowledge: 9 });
    });
});
