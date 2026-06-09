import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_ACHIEVEMENT_SECTIONS,
  clearDemoAchievementProgress,
  getDemoAchievementProgress,
  recordDemoFoodPaymentTurn,
} from './demoAchievements';

const createLocalStorageMock = () => {
  const data = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
    clear: vi.fn(() => {
      data.clear();
    }),
  };
};

describe('demo achievements', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears stored achievement progress', () => {
    const populationExplosion = DEMO_ACHIEVEMENT_SECTIONS
      .flatMap((section) => section.achievements)
      .find((achievement) => achievement.id === 'population-explosion');

    expect(populationExplosion).toBeDefined();
    recordDemoFoodPaymentTurn(150);
    expect(getDemoAchievementProgress(populationExplosion!).progress).toBe(1);

    clearDemoAchievementProgress();

    expect(getDemoAchievementProgress(populationExplosion!).progress).toBe(0);
  });
});
