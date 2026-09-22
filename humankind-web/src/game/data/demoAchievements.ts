import type { Language } from '../state/settingsStore';
export type DemoAchievementDifficulty = 'very-easy' | 'easy' | 'normal' | 'hard';

export type LocalizedText = Partial<Record<Language, string>> & { en: string };

export interface DemoAchievementDefinition {
  id: string;
  name: LocalizedText;
  condition: LocalizedText;
  requiredVictories?: number;
  requiredFoodPaymentTurn?: number;
}

export interface DemoAchievementSection {
  id: DemoAchievementDifficulty;
  label: string;
  achievements: DemoAchievementDefinition[];
}

interface DemoAchievementSaveData {
  foodPaymentTurns?: Partial<Record<number, true>>;
  victories?: number;
}

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

export const clearDemoAchievementProgress = (): void => {
  storage()?.removeItem(DEMO_ACHIEVEMENT_STORAGE_KEY);
};

export const DEMO_ACHIEVEMENT_SECTIONS: DemoAchievementSection[] = [
  {
    id: 'normal',
    label: 'normal',
    achievements: [
      {
        id: 'champion',
        name: {
          en: 'Champion!',
          ru: 'Чемпион!',
          ko: '챔피언!',
          zh: '冠军！',
        },
        condition: {
          en: 'Win a game.',
          ru: 'Победите в игре.',
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
          ru: 'Демографический взрыв',
          ko: '인구 대폭발',
          zh: '人口大爆发',
        },
        condition: {
          en: 'Pay the required food on turn 150.',
          ru: 'Заплатите требуемую еду на 150-м ходу.',
          ko: '150턴 요구 식량을 지불하세요',
          zh: '支付第 150 回合的所需食物。',
        },
        requiredFoodPaymentTurn: 150,
      },
    ],
  },
];

export function recordDemoGameCompletion(outcome: 'game_over' | 'victory'): void {
  const data = readDemoAchievementSaveData();
  writeDemoAchievementSaveData({
    ...data,
    victories: outcome === 'victory' ? Math.max(1, data.victories ?? 0) : data.victories,
  });
}

export function recordDemoFoodPaymentTurn(turn: number): void {
  const normalizedTurn = Math.max(0, Math.floor(turn));
  if (normalizedTurn <= 0) return;

  const data = readDemoAchievementSaveData();
  const foodPaymentTurns = { ...(data.foodPaymentTurns ?? {}) };
  foodPaymentTurns[normalizedTurn] = true;
  writeDemoAchievementSaveData({ ...data, foodPaymentTurns });
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

  if (achievement.requiredFoodPaymentTurn) {
    const paid = readDemoAchievementSaveData().foodPaymentTurns?.[achievement.requiredFoodPaymentTurn] === true;
    return { progress: paid ? 1 : 0, target: 1 };
  }

  return { progress: 0, target: 1 };
}
