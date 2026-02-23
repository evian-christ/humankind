/**
 * 적 유닛 효과 정의
 *
 * 적 심볼이 보드에 등장할 때, 해당 적의 강도(intensity)에 맞는
 * 효과 풀에서 랜덤으로 하나가 선택됩니다.
 */

export type EnemyEffectType = 'food_loss' | 'gold_loss' | 'mixed_loss' | 'destruction' | 'debuff';

export interface EnemyEffectDefinition {
    id: number;
    /** 강도 1~10 (시대/난이도에 따라 높은 강도의 효과가 등장) */
    intensity: number;
    /** 효과 유형 분류 */
    effect_type: EnemyEffectType;
    /** 매 스핀 식량 패널티 (양수 = 감소) */
    food_penalty: number;
    /** 매 스핀 골드 패널티 (양수 = 감소) */
    gold_penalty: number;
    /** 효과 설명 (en, i18n 키로 번역) */
    description: string;
}

export const ENEMY_EFFECTS: Record<number, EnemyEffectDefinition> = {
    // ── 강도 1 (Ancient 초반) ──
    1: { id: 1, intensity: 1, effect_type: 'food_loss', food_penalty: 2, gold_penalty: 0, description: 'Every spin: -2 Food.' },
    2: { id: 2, intensity: 1, effect_type: 'gold_loss', food_penalty: 0, gold_penalty: 1, description: 'Every spin: -1 Gold.' },
    3: { id: 3, intensity: 1, effect_type: 'mixed_loss', food_penalty: 1, gold_penalty: 1, description: 'Every spin: -1 Food, -1 Gold.' },

    // ── 강도 2 ──
    4: { id: 4, intensity: 2, effect_type: 'food_loss', food_penalty: 3, gold_penalty: 0, description: 'Every spin: -3 Food.' },
    5: { id: 5, intensity: 2, effect_type: 'gold_loss', food_penalty: 0, gold_penalty: 2, description: 'Every spin: -2 Gold.' },
    6: { id: 6, intensity: 2, effect_type: 'mixed_loss', food_penalty: 2, gold_penalty: 1, description: 'Every spin: -2 Food, -1 Gold.' },

    // ── 강도 3 (Classical) ──
    7: { id: 7, intensity: 3, effect_type: 'food_loss', food_penalty: 4, gold_penalty: 0, description: 'Every spin: -4 Food.' },
    8: { id: 8, intensity: 3, effect_type: 'gold_loss', food_penalty: 0, gold_penalty: 3, description: 'Every spin: -3 Gold.' },
    9: { id: 9, intensity: 3, effect_type: 'mixed_loss', food_penalty: 2, gold_penalty: 2, description: 'Every spin: -2 Food, -2 Gold.' },
    10: { id: 10, intensity: 3, effect_type: 'debuff', food_penalty: 1, gold_penalty: 0, description: 'Every spin: -1 Food. Adjacent symbols produce -1 Food.' },

    // ── 강도 4 ──
    11: { id: 11, intensity: 4, effect_type: 'food_loss', food_penalty: 5, gold_penalty: 0, description: 'Every spin: -5 Food.' },
    12: { id: 12, intensity: 4, effect_type: 'gold_loss', food_penalty: 0, gold_penalty: 4, description: 'Every spin: -4 Gold.' },
    13: { id: 13, intensity: 4, effect_type: 'mixed_loss', food_penalty: 3, gold_penalty: 2, description: 'Every spin: -3 Food, -2 Gold.' },
    14: { id: 14, intensity: 4, effect_type: 'destruction', food_penalty: 0, gold_penalty: 0, description: 'Every 5 spins: destroys 1 adjacent symbol.' },

    // ── 강도 5 (Medieval) ──
    15: { id: 15, intensity: 5, effect_type: 'food_loss', food_penalty: 6, gold_penalty: 0, description: 'Every spin: -6 Food.' },
    16: { id: 16, intensity: 5, effect_type: 'mixed_loss', food_penalty: 3, gold_penalty: 3, description: 'Every spin: -3 Food, -3 Gold.' },
    17: { id: 17, intensity: 5, effect_type: 'debuff', food_penalty: 2, gold_penalty: 0, description: 'Every spin: -2 Food. Adjacent symbols produce -1 Food, -1 Gold.' },
    18: { id: 18, intensity: 5, effect_type: 'destruction', food_penalty: 0, gold_penalty: 0, description: 'Every 4 spins: destroys 1 adjacent symbol.' },
};

export const ENEMY_EFFECT_LIST = Object.values(ENEMY_EFFECTS);

/** 특정 강도의 효과 목록을 반환 */
export const getEffectsByIntensity = (intensity: number): EnemyEffectDefinition[] =>
    ENEMY_EFFECT_LIST.filter(e => e.intensity === intensity);
