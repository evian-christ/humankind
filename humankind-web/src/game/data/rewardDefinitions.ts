import { type EraScaledTuple, eraScaleIndex } from './eventDefinitions';
import { RELICS } from './relicDefinitions';
import { RELIC_ID } from '../logic/relics/relicIds';

/** 보상의 타입. 각 전리품 등급은 같은 타입의 보상만 제공한다. */
export type RewardRarity = '일반' | '대형' | '초대형';

export const REWARD_RARITY_ORDER: RewardRarity[] = ['일반', '대형', '초대형'];

/** 전리품 등급 */
export type LootTier = 'small' | 'medium' | 'large';

/**
 * 전리품 등급별 보상 타입 가중치 (합산 100).
 * 선택지 3개를 뽑을 때 각 타입을 이 비율로 선택한다.
 */
export const LOOT_RARITY_WEIGHTS: Record<LootTier, Record<RewardRarity, number>> = {
    small:  { '일반': 100, '대형': 0,   '초대형': 0   },
    medium: { '일반': 0,   '대형': 100, '초대형': 0   },
    large:  { '일반': 0,   '대형': 0,   '초대형': 100 },
};

export const REWARD_RARITY_COLOR: Record<RewardRarity, string> = {
    '일반': '#9ca3af',
    '대형': '#60a5fa',
    '초대형': '#fbbf24',
};

export interface RewardDefinition {
    id: number;
    key: string;
    name: string;
    rarity: RewardRarity;
    /** 시대 순서: [고대, 중세, 현대] */
    food?: EraScaledTuple;
    gold?: EraScaledTuple;
    knowledge?: EraScaledTuple;
    /** true이면 랜덤 유물 1개 획득 */
    grantsRelic?: boolean;
    /** 지정한 유물을 순서대로 획득 */
    grantedRelicIds?: number[];
}

export const REWARDS: Record<number, RewardDefinition> = {
    // ── 식량 보상 ──
    1:  { id: 1,  key: 'food_common',    name: '마른 빵',       rarity: '일반', food: [8,   16,  32]  },
    3:  { id: 3,  key: 'food_rare',      name: '풍요로운 수확', rarity: '대형', food: [35,  70,  140] },
    5:  { id: 5,  key: 'food_legendary', name: '신의 은총',     rarity: '초대형', food: [100, 200, 400] },

    // ── 골드 보상 ──
    6:  { id: 6,  key: 'gold_common',    name: '동전 한 줌',  rarity: '일반', gold: [5,   10,  20]  },
    8:  { id: 8,  key: 'gold_rare',      name: '황금',        rarity: '대형', gold: [22,  44,  88]  },
    10: { id: 10, key: 'gold_legendary', name: '황금 보고',   rarity: '초대형', gold: [65,  130, 260] },

    // ── 지식 보상 ──
    11: { id: 11, key: 'knowledge_common',    name: '지식의 조각', rarity: '일반', knowledge: [4,  8,   16]  },
    13: { id: 13, key: 'knowledge_rare',      name: '고서',        rarity: '대형', knowledge: [18, 36,  72]  },
    15: { id: 15, key: 'knowledge_legendary', name: '신성한 지혜', rarity: '초대형', knowledge: [50, 100, 200] },

    // ── 유물 보상 (초대형) ──
    16: { id: 16, key: 'relic_legendary', name: '신비한 유물', rarity: '초대형', grantsRelic: true },

    // ── 지정 유물 보상 ──
    17: {
        id: 17,
        key: 'ancient_relic_debris_common',
        name: '발굴 잔해',
        rarity: '일반',
        grantedRelicIds: [RELIC_ID.ANCIENT_RELIC_DEBRIS],
    },
    18: {
        id: 18,
        key: 'national_reform_rare',
        name: '정비 명령서',
        rarity: '대형',
        grantedRelicIds: [RELIC_ID.OBLIVION_FURNACE],
    },
    19: {
        id: 19,
        key: 'ancient_relic_debris_rare',
        name: '유물 잔해 더미',
        rarity: '대형',
        grantedRelicIds: [RELIC_ID.ANCIENT_RELIC_DEBRIS, RELIC_ID.ANCIENT_RELIC_DEBRIS],
    },
    20: {
        id: 20,
        key: 'national_reform_legendary',
        name: '대정비 칙령',
        rarity: '초대형',
        grantedRelicIds: [RELIC_ID.OBLIVION_FURNACE, RELIC_ID.OBLIVION_FURNACE],
    },
    21: {
        id: 21,
        key: 'ancient_relic_debris_legendary',
        name: '고대 유물 저장고',
        rarity: '초대형',
        grantedRelicIds: [
            RELIC_ID.ANCIENT_RELIC_DEBRIS,
            RELIC_ID.ANCIENT_RELIC_DEBRIS,
            RELIC_ID.ANCIENT_RELIC_DEBRIS,
        ],
    },
    22: {
        id: 22,
        key: 'pioneer_expedition_legendary',
        name: '개척 원정대',
        rarity: '초대형',
        grantedRelicIds: [
            RELIC_ID.ANCIENT_TRIBE_JOIN,
            RELIC_ID.ANCIENT_RELIC_DEBRIS,
            RELIC_ID.ANCIENT_RELIC_DEBRIS,
        ],
    },
};

/** 특정 시대의 실제 보상 수치를 반환 */
export function getRewardAmounts(
    reward: RewardDefinition,
    era: number,
): { food: number; gold: number; knowledge: number } {
    const idx = eraScaleIndex(era);
    return {
        food: reward.food ? reward.food[idx] : 0,
        gold: reward.gold ? reward.gold[idx] : 0,
        knowledge: reward.knowledge ? reward.knowledge[idx] : 0,
    };
}

/** 게임 내 플레이어에게 보여줄 설명 (현재 시대 기준) */
export function getRewardDescription(reward: RewardDefinition, era: number): string {
    if (reward.grantsRelic) return '랜덤 유물 1개 획득.';
    if (reward.grantedRelicIds) return getGrantedRelicDescription(reward.grantedRelicIds);
    const { food, gold, knowledge } = getRewardAmounts(reward, era);
    const parts: string[] = [];
    if (food) parts.push(`식량 ${food}`);
    if (gold) parts.push(`골드 ${gold}`);
    if (knowledge) parts.push(`지식 ${knowledge}`);
    return parts.join(', ') + ' 획득.';
}

/** 가중치 테이블에서 보상 타입 1개를 랜덤 선택 */
export function pickRewardRarity(tier: LootTier): RewardRarity {
    const weights = LOOT_RARITY_WEIGHTS[tier];
    const total = REWARD_RARITY_ORDER.reduce((s, r) => s + weights[r], 0);
    let roll = Math.random() * total;
    for (const rarity of REWARD_RARITY_ORDER) {
        roll -= weights[rarity];
        if (roll < 0) return rarity;
    }
    return REWARD_RARITY_ORDER[REWARD_RARITY_ORDER.length - 1]!;
}

/**
 * 전리품 등급에 맞는 보상 선택지 3개 생성.
 * 각 선택지는 보상 타입을 독립적으로 뽑고, 중복 보상이 없도록 한다.
 */
export function generateLootRewardChoices(tier: LootTier): RewardDefinition[] {
    const rewardsByRarity: Partial<Record<RewardRarity, RewardDefinition[]>> = {};
    for (const r of Object.values(REWARDS)) {
        if (!rewardsByRarity[r.rarity]) rewardsByRarity[r.rarity] = [];
        rewardsByRarity[r.rarity]!.push(r);
    }

    const usedIds = new Set<number>();
    const choices: RewardDefinition[] = [];

    for (let i = 0; i < 3; i++) {
        const rarity = pickRewardRarity(tier);
        const pool = (rewardsByRarity[rarity] ?? []).filter((r) => !usedIds.has(r.id));

        let chosen: RewardDefinition | undefined;
        if (pool.length > 0) {
            chosen = pool[Math.floor(Math.random() * pool.length)];
        } else {
            // 해당 보상 타입에 남은 보상이 없으면 미사용 보상 중 아무거나
            const fallback = Object.values(REWARDS).filter((r) => !usedIds.has(r.id));
            if (fallback.length > 0) chosen = fallback[Math.floor(Math.random() * fallback.length)];
        }

        if (chosen) {
            choices.push(chosen);
            usedIds.add(chosen.id);
        }
    }

    return choices;
}

/** 데이터 브라우저용 설명 — 세 시대 수치를 모두 x/y/z 형식으로 표시 */
export function getRewardDescriptionAllEras(reward: RewardDefinition): string {
    if (reward.grantsRelic) return '랜덤 유물 1개 획득.';
    if (reward.grantedRelicIds) return getGrantedRelicDescription(reward.grantedRelicIds);
    const [a, m, mo] = [1, 2, 3].map((e) => getRewardAmounts(reward, e));
    const parts: string[] = [];
    if (reward.food)      parts.push(`식량 ${a.food}/${m.food}/${mo.food}`);
    if (reward.gold)      parts.push(`골드 ${a.gold}/${m.gold}/${mo.gold}`);
    if (reward.knowledge) parts.push(`지식 ${a.knowledge}/${m.knowledge}/${mo.knowledge}`);
    return parts.join(', ') + ' 획득.';
}

function getGrantedRelicDescription(relicIds: number[]): string {
    const counts = new Map<number, number>();
    relicIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));

    const parts = [...counts.entries()].map(([id, count]) => {
        const relicName = RELICS[id]?.name ?? '유물';
        return `${relicName} ${count}개`;
    });
    return parts.join(' 및 ') + ' 획득.';
}
