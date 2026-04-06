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
