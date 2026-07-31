import { describe, expect, it } from 'vitest';
import {
    AGI_PROJECT_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    CURRENCY_UPGRADE_ID,
    ELECTRICITY_UPGRADE_ID,
    EDUCATION_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    LAND_ALLOTMENT_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    SCIENTIFIC_THEORY_UPGRADE_ID,
    THEOCRACY_UPGRADE_ID,
    GUILD_UPGRADE_ID,
    MATHEMATICS_UPGRADE_ID,
    MERCENARIES_UPGRADE_ID,
    PRINTING_PRESS_UPGRADE_ID,
    STATE_LABOR_UPGRADE_ID,
    STEAM_POWER_UPGRADE_ID,
    THEOLOGY_UPGRADE_ID,
    TRIBAL_FEDERATION_UPGRADE_ID,
    URBANIZATION_UPGRADE_ID,
    WRITING_SYSTEM_UPGRADE_ID,
} from '../data/knowledgeUpgrades';
import {
    calculateFoodCost,
    getGoldInflationMultiplier,
    getHudTurnStartPassiveTotals,
    getInflatedGoldCost,
    getInflationAdjustedGoldReward,
    getEraFromLevel,
    formatTimelineYear,
    createKnowledgeResearchCreditsForLevelGain,
    consumeKnowledgeResearchCreditForUpgrade,
    getKnowledgeResearchCutoffLevel,
    getKnowledgeResearchLockedThroughLevel,
    getTimelineYearForTurn,
    getRerollCost,
    getTrojanGoldLootReward,
    isUpgradeLegalForKnowledgePick,
    normalizeKnowledgeResearchCredits,
} from './gameCalculations';

describe('food payment costs', () => {
    it('uses the same accelerating curve in every game', () => {
        expect(calculateFoodCost(10)).toBe(20);
        expect(calculateFoodCost(20)).toBe(50);
        expect(calculateFoodCost(30)).toBe(100);
        expect(calculateFoodCost(40)).toBe(170);
        expect(calculateFoodCost(50)).toBe(260);
        expect(calculateFoodCost(100)).toBe(1010);
    });
});

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

    it('applies the same inflation curve to one-time gold rewards', () => {
        expect(getInflationAdjustedGoldReward(25, 0)).toBe(25);
        expect(getInflationAdjustedGoldReward(25, 10)).toBe(42);
        expect(getInflationAdjustedGoldReward(25, 20)).toBe(67);
        expect(getInflationAdjustedGoldReward(25, 30)).toBe(101);
    });

    it('keeps Trojan Gold Loot display and activation on the same reward value', () => {
        expect(getTrojanGoldLootReward(0)).toBe(25);
        expect(getTrojanGoldLootReward(10)).toBe(42);
        expect(getTrojanGoldLootReward(20)).toBe(67);
        expect(getTrojanGoldLootReward(30)).toBe(101);
    });

    it('replaces the old reroll step curve with the shared gold inflation curve', () => {
        expect(getRerollCost(0)).toBe(1);
        expect(getRerollCost(10)).toBe(2);
        expect(getRerollCost(20)).toBe(3);
        expect(getRerollCost(30)).toBe(4);
        expect(getRerollCost(30, 0.5)).toBe(2);
    });

    it('increases reroll cost for each reroll already used this turn', () => {
        expect(getRerollCost(0, 1, 0)).toBe(1);
        expect(getRerollCost(0, 1, 1)).toBe(2);
        expect(getRerollCost(0, 1, 2)).toBe(3);
        expect(getRerollCost(20, 1, 0)).toBe(3);
        expect(getRerollCost(20, 1, 1)).toBe(5);
        expect(getRerollCost(20, 1, 2)).toBe(8);
    });
});

describe('getEraFromLevel', () => {
    it('maps level boundaries to primitive, ancient, medieval, modern, and future eras', () => {
        expect(getEraFromLevel(0)).toBe(0);
        expect(getEraFromLevel(9)).toBe(1);
        expect(getEraFromLevel(10)).toBe(2);
        expect(getEraFromLevel(19)).toBe(2);
        expect(getEraFromLevel(20)).toBe(3);
        expect(getEraFromLevel(29)).toBe(3);
        expect(getEraFromLevel(30)).toBe(4);
    });
});

describe('timeline year display', () => {
    it('maps turn anchors from the full 0-100 fiction timeline', () => {
        expect(getTimelineYearForTurn(0)).toBe(-10000);
        expect(getTimelineYearForTurn(10)).toBe(-1350);
        expect(getTimelineYearForTurn(15)).toBe(-330);
        expect(getTimelineYearForTurn(24)).toBe(315);
        expect(getTimelineYearForTurn(30)).toBe(500);
        expect(getTimelineYearForTurn(100)).toBe(2100);
    });

    it('clamps before the first turn and advances by 10 years per turn after turn 100', () => {
        expect(getTimelineYearForTurn(-1)).toBe(-10000);
        expect(getTimelineYearForTurn(101)).toBe(2110);
        expect(getTimelineYearForTurn(105)).toBe(2150);
    });

    it('formats BC and AD labels for the HUD language', () => {
        expect(formatTimelineYear(-10000, 'en')).toBe('10,000 BC');
        expect(formatTimelineYear(-10000, 'ko')).toBe('BC10,000년');
        expect(formatTimelineYear(2100, 'ko')).toBe('2,100년');
        expect(formatTimelineYear(-10000, 'zh')).toBe('公元前10,000年');
        expect(formatTimelineYear(2100, 'zh')).toBe('公元2,100年');
    });
});

describe('getKnowledgeResearchCutoffLevel', () => {
    it('tracks the level that has already spent its research picks', () => {
        expect(getKnowledgeResearchCutoffLevel(10, 2)).toBe(8);
        expect(getKnowledgeResearchCutoffLevel(30, 3)).toBe(27);
        expect(getKnowledgeResearchCutoffLevel(10, 0)).toBe(10);
        expect(getKnowledgeResearchCutoffLevel(1, 3)).toBe(0);
    });
});

describe('getKnowledgeResearchLockedThroughLevel', () => {
    it('only locks previous-era upgrades after enough transition picks are spent', () => {
        expect(getKnowledgeResearchLockedThroughLevel(4, 1)).toBe(0);
        expect(getKnowledgeResearchLockedThroughLevel(10, 2)).toBe(0);
        expect(getKnowledgeResearchLockedThroughLevel(10, 1)).toBe(9);
        expect(getKnowledgeResearchLockedThroughLevel(14, 1)).toBe(9);
        expect(getKnowledgeResearchLockedThroughLevel(20, 2)).toBe(9);
        expect(getKnowledgeResearchLockedThroughLevel(20, 1)).toBe(19);
        expect(getKnowledgeResearchLockedThroughLevel(30, 5)).toBe(19);
        expect(getKnowledgeResearchLockedThroughLevel(30, 1)).toBe(29);
    });
});

describe('knowledge research credits', () => {
    it('restores missing pre-transition credits when point count and credits drift apart', () => {
        const credits = normalizeKnowledgeResearchCredits(
            10,
            2,
            [{ grantLevel: 10, minLevel: 10, maxLevel: 10 }],
        );

        expect(credits).toEqual([
            { grantLevel: 9, minLevel: 1, maxLevel: 9 },
            { grantLevel: 10, minLevel: 10, maxLevel: 10 },
        ]);
        expect(isUpgradeLegalForKnowledgePick(
            THEOLOGY_UPGRADE_ID,
            [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
            10,
            credits,
        )).toBe(true);
    });

    it('tracks pre-transition and transition picks separately', () => {
        const credits = createKnowledgeResearchCreditsForLevelGain(8, 10);

        expect(isUpgradeLegalForKnowledgePick(
            FEUDALISM_UPGRADE_ID,
            [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
            10,
            credits,
        )).toBe(true);

        const remaining = consumeKnowledgeResearchCreditForUpgrade(FEUDALISM_UPGRADE_ID, credits);

        expect(isUpgradeLegalForKnowledgePick(
            THEOLOGY_UPGRADE_ID,
            [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID, FEUDALISM_UPGRADE_ID],
            10,
            remaining,
        )).toBe(true);
        expect(isUpgradeLegalForKnowledgePick(
            FEUDALISM_UPGRADE_ID,
            [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
            10,
            remaining,
        )).toBe(false);
    });
});

describe('isUpgradeLegalForKnowledgePick', () => {
    it('locks upgrades at or below the current locked-through level', () => {
        expect(isUpgradeLegalForKnowledgePick(
            CURRENCY_UPGRADE_ID,
            [],
            10,
            9,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            THEOLOGY_UPGRADE_ID,
            [],
            10,
            9,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            FEUDALISM_UPGRADE_ID,
            [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
            10,
            9,
        )).toBe(true);
    });

    it('does not require Ancient Era for upgrades that only depend on their visible prerequisite line', () => {
        expect(isUpgradeLegalForKnowledgePick(
            AGI_PROJECT_UPGRADE_ID,
            [MODERN_AGE_UPGRADE_ID],
            30,
        )).toBe(true);
    });

    it('requires Writing System before Education', () => {
        expect(isUpgradeLegalForKnowledgePick(
            EDUCATION_UPGRADE_ID,
            [],
            14,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            EDUCATION_UPGRADE_ID,
            [FEUDALISM_UPGRADE_ID, WRITING_SYSTEM_UPGRADE_ID],
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
            [MODERN_AGE_UPGRADE_ID, EDUCATION_UPGRADE_ID],
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
            [FEUDALISM_UPGRADE_ID, THEOLOGY_UPGRADE_ID],
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
            [FEUDALISM_UPGRADE_ID, CURRENCY_UPGRADE_ID],
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

    /**
     * 레거시 군사 카드(궁술·철제기술·기계장치·등자·탄도학·교체식 부품)를 트리에서
     * 걷어내면서 "선행조건 없이 뽑힌다"를 확인하던 검증도 제거했다.
     * 재도입 시 `removedGeneralUpgrades.ts`의 military 그룹을 참고한다.
     */

    it('locks earlier research tiers at explicit locked-through levels', () => {
        expect(isUpgradeLegalForKnowledgePick(
            THEOLOGY_UPGRADE_ID,
            [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
            9,
        )).toBe(true);
        expect(isUpgradeLegalForKnowledgePick(
            THEOLOGY_UPGRADE_ID,
            [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
            10,
            9,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            SCIENTIFIC_THEORY_UPGRADE_ID,
            [MODERN_AGE_UPGRADE_ID, EDUCATION_UPGRADE_ID],
            29,
        )).toBe(true);
        expect(isUpgradeLegalForKnowledgePick(
            SCIENTIFIC_THEORY_UPGRADE_ID,
            [MODERN_AGE_UPGRADE_ID, EDUCATION_UPGRADE_ID],
            30,
            29,
        )).toBe(false);
    });

    it('uses locked-through level separately from the reached player level', () => {
        expect(isUpgradeLegalForKnowledgePick(
            THEOLOGY_UPGRADE_ID,
            [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
            10,
            0,
        )).toBe(true);
        expect(isUpgradeLegalForKnowledgePick(
            FEUDALISM_UPGRADE_ID,
            [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
            10,
            9,
        )).toBe(true);
        expect(isUpgradeLegalForKnowledgePick(
            SCIENTIFIC_THEORY_UPGRADE_ID,
            [MODERN_AGE_UPGRADE_ID, EDUCATION_UPGRADE_ID],
            30,
            19,
        )).toBe(true);
        expect(isUpgradeLegalForKnowledgePick(
            SCIENTIFIC_THEORY_UPGRADE_ID,
            [MODERN_AGE_UPGRADE_ID, EDUCATION_UPGRADE_ID],
            30,
            29,
        )).toBe(false);
        expect(isUpgradeLegalForKnowledgePick(
            AGI_PROJECT_UPGRADE_ID,
            [MODERN_AGE_UPGRADE_ID],
            30,
            29,
        )).toBe(true);
    });

    /**
     * 지형축(숲/평원/초원/바다/사막/열대우림) 선행조건 체인 검증은 축을 트리에서
     * 걷어내면서 함께 제거했다. 축을 다시 넣을 때 해당 체인 테스트도 함께 복원한다.
     * 남아 있는 체인(문자→교육→과학이론, 화폐→길드, 신학→신정, 시대 전환)은 위에서 검증한다.
     */
});

describe('getHudTurnStartPassiveTotals', () => {
    it('does not add passive production for Writing System, Currency, Education, or Scientific Theory', () => {
        expect(getHudTurnStartPassiveTotals({
            unlockedKnowledgeUpgrades: [WRITING_SYSTEM_UPGRADE_ID, CURRENCY_UPGRADE_ID, EDUCATION_UPGRADE_ID, SCIENTIFIC_THEORY_UPGRADE_ID],
        })).toEqual({ food: 0, gold: 1, knowledge: 2 });
    });

    it('applies updated Mathematics and Printing Press passive production', () => {
        expect(getHudTurnStartPassiveTotals({
            unlockedKnowledgeUpgrades: [MATHEMATICS_UPGRADE_ID, PRINTING_PRESS_UPGRADE_ID],
        })).toEqual({ food: 1, gold: 3, knowledge: 5 });
    });

    it('applies State Labor passive production', () => {
        expect(getHudTurnStartPassiveTotals({
            unlockedKnowledgeUpgrades: [STATE_LABOR_UPGRADE_ID],
        })).toEqual({ food: 1, gold: 2, knowledge: 2 });
    });

    it('applies Tribal Federation passive food production', () => {
        expect(getHudTurnStartPassiveTotals({
            unlockedKnowledgeUpgrades: [TRIBAL_FEDERATION_UPGRADE_ID],
        })).toEqual({ food: 1, gold: 1, knowledge: 2 });
    });

    it('applies Land Allotment passive food production', () => {
        expect(getHudTurnStartPassiveTotals({
            unlockedKnowledgeUpgrades: [LAND_ALLOTMENT_UPGRADE_ID],
        })).toEqual({ food: 1, gold: 1, knowledge: 2 });
    });

    it('applies Mercenaries passive gold production', () => {
        expect(getHudTurnStartPassiveTotals({
            unlockedKnowledgeUpgrades: [MERCENARIES_UPGRADE_ID],
        })).toEqual({ food: 0, gold: 3, knowledge: 2 });
    });

    it('doubles passive gold production during Qin Shi Huang Currency Standardization', () => {
        expect(getHudTurnStartPassiveTotals({
            unlockedKnowledgeUpgrades: [PRINTING_PRESS_UPGRADE_ID, MERCENARIES_UPGRADE_ID],
            qinCurrencyStandardTurnsRemaining: 5,
        })).toEqual({ food: 0, gold: 10, knowledge: 4 });
    });

    it('applies Urbanization passive food and gold production', () => {
        expect(getHudTurnStartPassiveTotals({
            unlockedKnowledgeUpgrades: [URBANIZATION_UPGRADE_ID],
        })).toEqual({ food: 4, gold: 5, knowledge: 2 });
    });

    it('applies Steam Power passive gold and knowledge production', () => {
        expect(getHudTurnStartPassiveTotals({
            unlockedKnowledgeUpgrades: [STEAM_POWER_UPGRADE_ID],
        })).toEqual({ food: 0, gold: 5, knowledge: 4 });
    });

    it('applies Electricity passive food, gold, and knowledge production', () => {
        expect(getHudTurnStartPassiveTotals({
            unlockedKnowledgeUpgrades: [ELECTRICITY_UPGRADE_ID],
        })).toEqual({ food: 3, gold: 4, knowledge: 5 });
    });
});
