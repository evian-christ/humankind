/**
 * 리더 정의 — 스테이지 시작 시 선택 가능한 리더와 시작 보너스
 */

import type { RelicDefinition } from './relicDefinitions';
import { RELICS } from './relicDefinitions';

export type LeaderId =
  | 'ramesses'
  | 'shihuang'
  | 'locked_3'
  | 'locked_4'
  | 'locked_5'
  | 'locked_6'
  | 'locked_7'
  | 'locked_8'
  | 'locked_9'
  | 'locked_10';

export interface LeaderDefinition {
  id: LeaderId;
  /** false면 선택·게임 시작 불가(자리 표시자) */
  enabled: boolean;
  nameKey: string;
  /** 있으면 지도자 선택 미리보기에서 이름 옆 부제목으로 표시 */
  nameSubtitleKey?: string;
  descriptionKey: string;
  mainEffectNameKey: string;
  mainEffectDescKey: string;
  subEffectNameKey: string;
  subEffectDescKey: string;
  startingRelicIds: number[];
  startingGold?: number;
  startingFood?: number;
}

export type LeaderUnlockKind =
  | 'golden_trade'
  | 'kadesh_battle_escape'
  | 'relic_vault'
  | 'heqet'
  | 'shihuang_prosperity'
  | 'currency_standardization'
  | 'shihuang_unification_foundation'
  | 'foxtail_millet';

export interface LeaderUnlock {
  level: number;
  kind: LeaderUnlockKind;
  nameKey: string;
  descKey: string;
  unlockedByDefault?: boolean;
}

export interface LeaderProgressState {
  level: number;
  xp: number;
  xpRequired: number;
}

export type LeaderGameOutcome = 'game_over' | 'victory';

export interface LeaderGameXpInput {
  survivedTurns: number;
  finalLevel: number;
  outcome: LeaderGameOutcome;
}

export interface LeaderGameXpBreakdown {
  participationXp: number;
  survivalXp: number;
  foodCycleXp: number;
  eraMilestoneXp: number;
  finalLevelXp: number;
  outcomeXp: number;
  totalXp: number;
}

export interface LeaderProgressAwardResult {
  leaderId: LeaderId;
  previous: LeaderProgressState;
  next: LeaderProgressState;
  xpAwarded: number;
  breakdown: LeaderGameXpBreakdown;
  levelsGained: number;
}

export const MAX_LEADER_LEVEL = 10;
export const DEFAULT_LEADER_PROGRESS: LeaderProgressState = {
  level: 1,
  xp: 0,
  xpRequired: 100,
};

const LEADER_PROGRESS_STORAGE_KEY = 'humankind.leaderProgress.v1';
const LEADER_XP_REQUIREMENTS: Record<number, number> = {
  1: 100,
  2: 120,
  3: 140,
  4: 165,
  5: 195,
  6: 230,
  7: 270,
  8: 320,
  9: 375,
  10: 375,
};

export const LEADERS: Record<LeaderId, LeaderDefinition> = {
  ramesses: {
    id: 'ramesses',
    enabled: true,
    nameKey: 'leader.ramesses.name',
    nameSubtitleKey: 'leader.ramesses.nameSubtitle',
    descriptionKey: 'leader.ramesses.desc',
    mainEffectNameKey: 'leader.ramesses.main.name',
    mainEffectDescKey: 'leader.ramesses.main.desc',
    subEffectNameKey: 'leader.ramesses.sub.name',
    subEffectDescKey: 'leader.ramesses.sub.desc',
    startingRelicIds: [],
    startingGold: 0,
    startingFood: 0,
  },
  shihuang: {
    id: 'shihuang',
    enabled: true,
    nameKey: 'leader.shihuang.name',
    nameSubtitleKey: 'leader.shihuang.nameSubtitle',
    descriptionKey: 'leader.shihuang.desc',
    mainEffectNameKey: 'leader.shihuang.main.name',
    mainEffectDescKey: 'leader.shihuang.main.desc',
    subEffectNameKey: 'leader.shihuang.sub.name',
    subEffectDescKey: 'leader.shihuang.sub.desc',
    startingRelicIds: [],
    startingGold: 0,
    startingFood: 0,
  },
  locked_3: {
    id: 'locked_3',
    enabled: false,
    nameKey: 'leader.locked.name',
    descriptionKey: 'leader.locked.desc',
    mainEffectNameKey: 'leader.locked.main.name',
    mainEffectDescKey: 'leader.locked.main.desc',
    subEffectNameKey: 'leader.locked.sub.name',
    subEffectDescKey: 'leader.locked.sub.desc',
    startingRelicIds: [],
    startingGold: 0,
    startingFood: 0,
  },
  locked_4: {
    id: 'locked_4',
    enabled: false,
    nameKey: 'leader.locked.name',
    descriptionKey: 'leader.locked.desc',
    mainEffectNameKey: 'leader.locked.main.name',
    mainEffectDescKey: 'leader.locked.main.desc',
    subEffectNameKey: 'leader.locked.sub.name',
    subEffectDescKey: 'leader.locked.sub.desc',
    startingRelicIds: [],
    startingGold: 0,
    startingFood: 0,
  },
  locked_5: {
    id: 'locked_5',
    enabled: false,
    nameKey: 'leader.locked.name',
    descriptionKey: 'leader.locked.desc',
    mainEffectNameKey: 'leader.locked.main.name',
    mainEffectDescKey: 'leader.locked.main.desc',
    subEffectNameKey: 'leader.locked.sub.name',
    subEffectDescKey: 'leader.locked.sub.desc',
    startingRelicIds: [],
    startingGold: 0,
    startingFood: 0,
  },
  locked_6: {
    id: 'locked_6',
    enabled: false,
    nameKey: 'leader.locked.name',
    descriptionKey: 'leader.locked.desc',
    mainEffectNameKey: 'leader.locked.main.name',
    mainEffectDescKey: 'leader.locked.main.desc',
    subEffectNameKey: 'leader.locked.sub.name',
    subEffectDescKey: 'leader.locked.sub.desc',
    startingRelicIds: [],
    startingGold: 0,
    startingFood: 0,
  },
  locked_7: {
    id: 'locked_7',
    enabled: false,
    nameKey: 'leader.locked.name',
    descriptionKey: 'leader.locked.desc',
    mainEffectNameKey: 'leader.locked.main.name',
    mainEffectDescKey: 'leader.locked.main.desc',
    subEffectNameKey: 'leader.locked.sub.name',
    subEffectDescKey: 'leader.locked.sub.desc',
    startingRelicIds: [],
    startingGold: 0,
    startingFood: 0,
  },
  locked_8: {
    id: 'locked_8',
    enabled: false,
    nameKey: 'leader.locked.name',
    descriptionKey: 'leader.locked.desc',
    mainEffectNameKey: 'leader.locked.main.name',
    mainEffectDescKey: 'leader.locked.main.desc',
    subEffectNameKey: 'leader.locked.sub.name',
    subEffectDescKey: 'leader.locked.sub.desc',
    startingRelicIds: [],
    startingGold: 0,
    startingFood: 0,
  },
  locked_9: {
    id: 'locked_9',
    enabled: false,
    nameKey: 'leader.locked.name',
    descriptionKey: 'leader.locked.desc',
    mainEffectNameKey: 'leader.locked.main.name',
    mainEffectDescKey: 'leader.locked.main.desc',
    subEffectNameKey: 'leader.locked.sub.name',
    subEffectDescKey: 'leader.locked.sub.desc',
    startingRelicIds: [],
    startingGold: 0,
    startingFood: 0,
  },
  locked_10: {
    id: 'locked_10',
    enabled: false,
    nameKey: 'leader.locked.name',
    descriptionKey: 'leader.locked.desc',
    mainEffectNameKey: 'leader.locked.main.name',
    mainEffectDescKey: 'leader.locked.main.desc',
    subEffectNameKey: 'leader.locked.sub.name',
    subEffectDescKey: 'leader.locked.sub.desc',
    startingRelicIds: [],
    startingGold: 0,
    startingFood: 0,
  },
};

/** UI 표시 순서(10칸) */
export const LEADER_LIST: LeaderDefinition[] = [
  LEADERS.ramesses,
  LEADERS.shihuang,
  LEADERS.locked_3,
  LEADERS.locked_4,
  LEADERS.locked_5,
  LEADERS.locked_6,
  LEADERS.locked_7,
  LEADERS.locked_8,
  LEADERS.locked_9,
  LEADERS.locked_10,
];

export const LEADER_UNLOCKS: Partial<Record<LeaderId, LeaderUnlock[]>> = {
  ramesses: [
    {
      level: 1,
      kind: 'golden_trade',
      nameKey: 'leader.ramesses.main.name',
      descKey: 'leader.ramesses.main.desc',
      unlockedByDefault: true,
    },
    {
      level: 3,
      kind: 'kadesh_battle_escape',
      nameKey: 'leaderUnlock.ramesses.kadeshBattleEscape.name',
      descKey: 'event.kadesh_battle_escape.desc',
    },
    {
      level: 5,
      kind: 'relic_vault',
      nameKey: 'leader.ramesses.sub.name',
      descKey: 'leader.ramesses.sub.desc',
    },
    {
      level: 7,
      kind: 'heqet',
      nameKey: 'leaderUnlock.ramesses.heqet.name',
      descKey: 'symbol.heqet.desc',
    },
  ],
  shihuang: [
    {
      level: 1,
      kind: 'shihuang_prosperity',
      nameKey: 'leader.shihuang.main.name',
      descKey: 'leader.shihuang.main.desc',
      unlockedByDefault: true,
    },
    {
      level: 3,
      kind: 'currency_standardization',
      nameKey: 'leaderUnlock.shihuang.currencyStandardization.name',
      descKey: 'event.currency_standardization.desc',
    },
    {
      level: 5,
      kind: 'shihuang_unification_foundation',
      nameKey: 'leader.shihuang.sub.name',
      descKey: 'leader.shihuang.sub.desc',
    },
    {
      level: 7,
      kind: 'foxtail_millet',
      nameKey: 'leaderUnlock.shihuang.foxtailMillet.name',
      descKey: 'symbol.foxtail_millet.desc',
    },
  ],
};

const storage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const clampLeaderLevel = (level: unknown): number => {
  const parsed = typeof level === 'number' ? level : Number(level);
  if (!Number.isFinite(parsed)) return DEFAULT_LEADER_PROGRESS.level;
  return Math.max(1, Math.min(MAX_LEADER_LEVEL, Math.floor(parsed)));
};

export function getLeaderXpRequiredForLevel(level: number): number {
  return LEADER_XP_REQUIREMENTS[clampLeaderLevel(level)] ?? DEFAULT_LEADER_PROGRESS.xpRequired;
}

function readLeaderProgressMap(): Partial<Record<LeaderId, Partial<LeaderProgressState>>> {
  const raw = storage()?.getItem(LEADER_PROGRESS_STORAGE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Partial<Record<LeaderId, Partial<LeaderProgressState>>>;
  } catch {
    return {};
  }
}

function normalizeLeaderProgress(saved?: Partial<LeaderProgressState>): LeaderProgressState {
  if (!saved) return DEFAULT_LEADER_PROGRESS;
  const level = clampLeaderLevel(saved.level);
  const xpRequired = getLeaderXpRequiredForLevel(level);
  const rawXp = Math.max(0, Number(saved.xp ?? DEFAULT_LEADER_PROGRESS.xp) || 0);
  return {
    level,
    xp: level >= MAX_LEADER_LEVEL ? Math.min(rawXp, xpRequired) : Math.min(rawXp, xpRequired - 1),
    xpRequired,
  };
}

export function getLeaderProgressState(leaderId: LeaderId): LeaderProgressState {
  const parsed = readLeaderProgressMap();
  return normalizeLeaderProgress(parsed[leaderId]);
}

export function clearLeaderProgress(): void {
  storage()?.removeItem(LEADER_PROGRESS_STORAGE_KEY);
}

export function calculateLeaderGameXp(input: LeaderGameXpInput): LeaderGameXpBreakdown {
  const survivedTurns = Math.max(0, Math.floor(input.survivedTurns));
  if (survivedTurns < 5) {
    return {
      participationXp: 0,
      survivalXp: 0,
      foodCycleXp: 0,
      eraMilestoneXp: 0,
      finalLevelXp: 0,
      outcomeXp: 0,
      totalXp: 0,
    };
  }

  const finalLevel = Math.max(0, Math.floor(input.finalLevel));
  const successfulFoodCycles =
    input.outcome === 'game_over'
      ? Math.floor(Math.max(0, survivedTurns - 1) / 10)
      : Math.floor(survivedTurns / 10);
  const rawTotal =
    10
    + survivedTurns * 2
    + successfulFoodCycles * 8
    + (finalLevel >= 10 ? 40 : 0)
    + (finalLevel >= 20 ? 80 : 0)
    + Math.min(75, finalLevel * 3)
    + (input.outcome === 'victory' ? 120 : 0);
  const totalXp = Math.min(input.outcome === 'victory' ? 400 : 250, rawTotal);

  return {
    participationXp: 10,
    survivalXp: survivedTurns * 2,
    foodCycleXp: successfulFoodCycles * 8,
    eraMilestoneXp: (finalLevel >= 10 ? 40 : 0) + (finalLevel >= 20 ? 80 : 0),
    finalLevelXp: Math.min(75, finalLevel * 3),
    outcomeXp: input.outcome === 'victory' ? 120 : 0,
    totalXp,
  };
}

export function addLeaderXp(progress: LeaderProgressState, xp: number): LeaderProgressState {
  let level = clampLeaderLevel(progress.level);
  let nextXp = Math.max(0, Math.floor(progress.xp + Math.max(0, xp)));

  while (level < MAX_LEADER_LEVEL) {
    const required = getLeaderXpRequiredForLevel(level);
    if (nextXp < required) break;
    nextXp -= required;
    level += 1;
  }

  const xpRequired = getLeaderXpRequiredForLevel(level);
  return {
    level,
    xp: level >= MAX_LEADER_LEVEL ? Math.min(nextXp, xpRequired) : nextXp,
    xpRequired,
  };
}

export function awardLeaderGameXp(leaderId: LeaderId, input: LeaderGameXpInput): LeaderProgressAwardResult {
  const progressMap = readLeaderProgressMap();
  const previous = normalizeLeaderProgress(progressMap[leaderId]);
  const breakdown = calculateLeaderGameXp(input);
  const next = addLeaderXp(previous, breakdown.totalXp);
  progressMap[leaderId] = next;
  storage()?.setItem(LEADER_PROGRESS_STORAGE_KEY, JSON.stringify(progressMap));

  return {
    leaderId,
    previous,
    next,
    xpAwarded: breakdown.totalXp,
    breakdown,
    levelsGained: Math.max(0, next.level - previous.level),
  };
}

export function getLeaderUnlockForLevel(leaderId: LeaderId, level: number): LeaderUnlock | null {
  return LEADER_UNLOCKS[leaderId]?.find((unlock) => unlock.level === level) ?? null;
}

export function isLeaderUnlockActive(leaderId: LeaderId | null, leaderLevel: number, kind: LeaderUnlockKind): boolean {
  if (!leaderId) return false;
  const unlock = LEADER_UNLOCKS[leaderId]?.find((entry) => entry.kind === kind);
  if (!unlock) return false;
  return unlock.unlockedByDefault === true || leaderLevel >= unlock.level;
}

export function getLeaderStartingRelics(leaderId: LeaderId): RelicDefinition[] {
  const leader = LEADERS[leaderId];
  if (!leader) return [];
  return leader.startingRelicIds
    .map((id) => RELICS[id])
    .filter((r): r is RelicDefinition => r != null);
}

export function isLeaderPlayable(leaderId: LeaderId): boolean {
  return LEADERS[leaderId]?.enabled === true;
}

/** `public/assets/leaders/*.png` 초상화가 있는 지도자. 나머지는 선택 화면에서 UI 플레이스홀더로 표시 */
const LEADER_IDS_WITH_PORTRAIT_SPRITE: ReadonlySet<LeaderId> = new Set(['ramesses', 'shihuang']);

export function leaderHasPortraitSprite(id: LeaderId): boolean {
  return LEADER_IDS_WITH_PORTRAIT_SPRITE.has(id);
}
