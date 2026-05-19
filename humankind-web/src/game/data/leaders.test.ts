import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addLeaderXp,
  awardLeaderGameXp,
  calculateLeaderGameXp,
  getLeaderUnlockForLevel,
  getLeaderProgressState,
} from './leaders';

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

describe('leader progression', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not award xp for runs shorter than 5 turns', () => {
    expect(calculateLeaderGameXp({ survivedTurns: 4, finalLevel: 0, outcome: 'game_over' }).totalXp).toBe(0);
  });

  it('calculates loss xp from participation, turns, completed food cycles, era milestones, and final level', () => {
    const result = calculateLeaderGameXp({ survivedTurns: 35, finalLevel: 12, outcome: 'game_over' });

    expect(result).toMatchObject({
      participationXp: 10,
      survivalXp: 70,
      foodCycleXp: 24,
      eraMilestoneXp: 40,
      finalLevelXp: 36,
      outcomeXp: 0,
      totalXp: 180,
    });
  });

  it('caps non-victory and victory xp separately', () => {
    expect(calculateLeaderGameXp({ survivedTurns: 120, finalLevel: 30, outcome: 'game_over' }).totalXp).toBe(250);
    expect(calculateLeaderGameXp({ survivedTurns: 120, finalLevel: 30, outcome: 'victory' }).totalXp).toBe(400);
  });

  it('levels up through the configured requirement curve', () => {
    const result = addLeaderXp({ level: 1, xp: 90, xpRequired: 100 }, 170);

    expect(result).toEqual({
      level: 3,
      xp: 40,
      xpRequired: 140,
    });
  });

  it('persists awarded xp for a leader', () => {
    const award = awardLeaderGameXp('ramesses', { survivedTurns: 20, finalLevel: 4, outcome: 'game_over' });

    expect(award.xpAwarded).toBe(70);
    expect(getLeaderProgressState('ramesses')).toEqual({
      level: 1,
      xp: 70,
      xpRequired: 100,
    });
  });

  it('assigns Qin Shi Huang existing effects to progression levels', () => {
    expect(getLeaderUnlockForLevel('shihuang', 1)).toMatchObject({
      kind: 'shihuang_prosperity',
      nameKey: 'leader.shihuang.main.name',
      descKey: 'leader.shihuang.main.desc',
      unlockedByDefault: true,
    });
    expect(getLeaderUnlockForLevel('shihuang', 5)).toMatchObject({
      kind: 'shihuang_unification_foundation',
      nameKey: 'leader.shihuang.sub.name',
      descKey: 'leader.shihuang.sub.desc',
    });
    expect(getLeaderUnlockForLevel('shihuang', 3)).toMatchObject({
      kind: 'currency_standardization',
      nameKey: 'leaderUnlock.shihuang.currencyStandardization.name',
      descKey: 'event.currency_standardization.desc',
    });
    expect(getLeaderUnlockForLevel('shihuang', 7)).toMatchObject({
      kind: 'foxtail_millet',
      nameKey: 'leaderUnlock.shihuang.foxtailMillet.name',
      descKey: 'symbol.foxtail_millet.desc',
    });
  });
});
