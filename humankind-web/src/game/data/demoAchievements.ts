import type { Language } from '../state/settingsStore';
import { hasLeaderProgressRecord, type LeaderGameOutcome, type LeaderId } from './leaders';
import { countNonConsumableRelics } from '../logic/relics/relicClassification';

export type DemoAchievementDifficulty = 'very-easy' | 'easy' | 'normal' | 'hard';

export type LocalizedText = Partial<Record<Language, string>> & { en: string };

export interface DemoAchievementDefinition {
  id: string;
  name: LocalizedText;
  condition: LocalizedText;
  requiredCompletedLeaderIds?: LeaderId[];
  requiredVictories?: number;
  requiredLeaderId?: LeaderId;
  requiredNonConsumableRelics?: number;
  requiredBaseGoldProduction?: number;
  requiredFoodPaymentTurn?: number;
}

export interface DemoAchievementSection {
  id: DemoAchievementDifficulty;
  label: string;
  achievements: DemoAchievementDefinition[];
}

interface DemoAchievementSaveData {
  completedLeaderGameIds?: Partial<Record<LeaderId, true>>;
  baseGoldProductionByLeader?: Partial<Record<LeaderId, number>>;
  nonConsumableRelicCountsByLeader?: Partial<Record<LeaderId, number>>;
  foodPaymentTurns?: Partial<Record<number, true>>;
  victories?: number;
}

type DemoAchievementRelicLike = { definition: { id: number } };

const DEMO_ACHIEVEMENT_STORAGE_KEY = 'humankind.demoAchievements.v1';

const storage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const readDemoAchievementSaveData = (): DemoAchievementSaveData => {
  const raw = storage()?.getItem(DEMO_ACHIEVEMENT_STORAGE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as DemoAchievementSaveData;
  } catch {
    return {};
  }
};

const writeDemoAchievementSaveData = (data: DemoAchievementSaveData): void => {
  storage()?.setItem(DEMO_ACHIEVEMENT_STORAGE_KEY, JSON.stringify(data));
};

export const DEMO_ACHIEVEMENT_SECTIONS: DemoAchievementSection[] = [
  {
    id: 'very-easy',
    label: 'very easy',
    achievements: [
      {
        id: 'river-valley-civilizations',
        name: {
          en: 'River valley civilizations',
          ko: '강 유역 문명',
          zh: '河谷文明',
        },
        condition: {
          en: 'Complete a game with Ramesses II and Qin Shi Huang.',
          ko: '람세스 2세와 진시황으로 게임을 완료하세요',
          zh: '使用拉美西斯二世和秦始皇完成游戏。',
        },
        requiredCompletedLeaderIds: ['ramesses', 'shihuang'],
      },
    ],
  },
  {
    id: 'easy',
    label: 'easy',
    achievements: [
      {
        id: 'relic-mountain',
        name: {
          en: 'Relic Mountain',
          ko: '유물 산더미',
          zh: '遗物成山',
        },
        condition: {
          en: 'Play as Ramesses II and own 5 non-consumable relics.',
          ko: '람세스 2세로 플레이하여 비소모형 유물 5개를 보유하세요',
          zh: '使用拉美西斯二世进行游戏，并拥有 5 个非消耗型遗物。',
        },
        requiredLeaderId: 'ramesses',
        requiredNonConsumableRelics: 5,
      },
      {
        id: 'wealth-and-glory',
        name: {
          en: 'Wealth and Glory',
          ko: '부귀영화',
          zh: '富贵荣华',
        },
        condition: {
          en: 'Play as Qin Shi Huang and reach +10 base Gold production.',
          ko: '진시황으로 기본 골드 생산량 +10을 달성하세요',
          zh: '使用秦始皇达到基础金币产量 +10。',
        },
        requiredLeaderId: 'shihuang',
        requiredBaseGoldProduction: 10,
      },
    ],
  },
  {
    id: 'normal',
    label: 'normal',
    achievements: [
      {
        id: 'champion',
        name: {
          en: 'Champion!',
          ko: '챔피언!',
          zh: '冠军！',
        },
        condition: {
          en: 'Win a game.',
          ko: '게임 승리하기',
          zh: '赢得一局游戏。',
        },
        requiredVictories: 1,
      },
    ],
  },
  {
    id: 'hard',
    label: 'hard',
    achievements: [
      {
        id: 'population-explosion',
        name: {
          en: 'Population Explosion',
          ko: '인구 대폭발',
          zh: '人口大爆发',
        },
        condition: {
          en: 'Pay the required food on turn 150.',
          ko: '150턴 요구 식량을 지불하세요',
          zh: '支付第 150 回合的所需食物。',
        },
        requiredFoodPaymentTurn: 150,
      },
    ],
  },
];

export function recordDemoLeaderGameCompletion(leaderId: LeaderId, outcome: LeaderGameOutcome): void {
  const data = readDemoAchievementSaveData();
  const completedLeaderGameIds = { ...(data.completedLeaderGameIds ?? {}) };
  completedLeaderGameIds[leaderId] = true;
  writeDemoAchievementSaveData({
    ...data,
    completedLeaderGameIds,
    victories: outcome === 'victory' ? Math.max(1, data.victories ?? 0) : data.victories,
  });
}

export function recordDemoNonConsumableRelicProgress(
  leaderId: LeaderId | null,
  relics: readonly DemoAchievementRelicLike[],
): void {
  if (!leaderId) return;

  const data = readDemoAchievementSaveData();
  const nonConsumableRelicCountsByLeader = { ...(data.nonConsumableRelicCountsByLeader ?? {}) };
  const count = countNonConsumableRelics(relics);
  nonConsumableRelicCountsByLeader[leaderId] = Math.max(nonConsumableRelicCountsByLeader[leaderId] ?? 0, count);
  writeDemoAchievementSaveData({ ...data, nonConsumableRelicCountsByLeader });
}

export function recordDemoBaseGoldProductionProgress(leaderId: LeaderId | null, baseGoldProduction: number): void {
  if (!leaderId) return;

  const data = readDemoAchievementSaveData();
  const baseGoldProductionByLeader = { ...(data.baseGoldProductionByLeader ?? {}) };
  baseGoldProductionByLeader[leaderId] = Math.max(
    baseGoldProductionByLeader[leaderId] ?? 0,
    Math.max(0, Math.floor(baseGoldProduction)),
  );
  writeDemoAchievementSaveData({ ...data, baseGoldProductionByLeader });
}

export function recordDemoFoodPaymentTurn(turn: number): void {
  const normalizedTurn = Math.max(0, Math.floor(turn));
  if (normalizedTurn <= 0) return;

  const data = readDemoAchievementSaveData();
  const foodPaymentTurns = { ...(data.foodPaymentTurns ?? {}) };
  foodPaymentTurns[normalizedTurn] = true;
  writeDemoAchievementSaveData({ ...data, foodPaymentTurns });
}

export function hasDemoLeaderGameCompletion(leaderId: LeaderId): boolean {
  const data = readDemoAchievementSaveData();
  return data.completedLeaderGameIds?.[leaderId] === true || hasLeaderProgressRecord(leaderId);
}

export function getDemoAchievementProgress(achievement: DemoAchievementDefinition): {
  progress: number;
  target: number;
} {
  if (achievement.requiredVictories) {
    const target = achievement.requiredVictories;
    const progress = Math.min(target, readDemoAchievementSaveData().victories ?? 0);
    return { progress, target };
  }

  if (achievement.requiredLeaderId && achievement.requiredNonConsumableRelics) {
    const count = readDemoAchievementSaveData()
      .nonConsumableRelicCountsByLeader?.[achievement.requiredLeaderId] ?? 0;
    const progress = count >= achievement.requiredNonConsumableRelics ? 1 : 0;
    return { progress, target: 1 };
  }

  if (achievement.requiredLeaderId && achievement.requiredBaseGoldProduction) {
    const count = readDemoAchievementSaveData()
      .baseGoldProductionByLeader?.[achievement.requiredLeaderId] ?? 0;
    const progress = count >= achievement.requiredBaseGoldProduction ? 1 : 0;
    return { progress, target: 1 };
  }

  if (achievement.requiredFoodPaymentTurn) {
    const paid = readDemoAchievementSaveData().foodPaymentTurns?.[achievement.requiredFoodPaymentTurn] === true;
    return { progress: paid ? 1 : 0, target: 1 };
  }

  const requiredCompletedLeaderIds = achievement.requiredCompletedLeaderIds ?? [];
  const target = requiredCompletedLeaderIds.length;
  const progress = requiredCompletedLeaderIds.filter(hasDemoLeaderGameCompletion).length;
  return { progress, target };
}
