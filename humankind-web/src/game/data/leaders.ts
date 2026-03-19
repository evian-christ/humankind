/**
 * 리더 정의 — 스테이지 시작 시 선택 가능한 리더와 시작 보너스
 */

import type { RelicDefinition } from './relicDefinitions';
import { RELICS } from './relicDefinitions';

export type LeaderId = 'ramesses' | 'pericles';

export interface LeaderDefinition {
  id: LeaderId;
  nameKey: string; // i18n key
  descriptionKey: string;
  /** 메인 효과 i18n key */
  mainEffectNameKey: string;
  mainEffectDescKey: string;
  /** 서브 효과 i18n key */
  subEffectNameKey: string;
  subEffectDescKey: string;

  // 시작 보너스는 현재 기준으로 모든 리더가 동일한 값이므로,
  // 게임 시작 로직 호환을 위해 필드를 유지(값만 중립화)한다.
  startingRelicIds: number[];
  startingGold?: number;
  startingFood?: number;
}

export const LEADERS: Record<LeaderId, LeaderDefinition> = {
  ramesses: {
    id: 'ramesses',
    nameKey: 'leader.ramesses.name',
    descriptionKey: 'leader.ramesses.desc',
    mainEffectNameKey: 'leader.ramesses.main.name',
    mainEffectDescKey: 'leader.ramesses.main.desc',
    subEffectNameKey: 'leader.ramesses.sub.name',
    subEffectDescKey: 'leader.ramesses.sub.desc',
    startingRelicIds: [],
    startingGold: 0,
    startingFood: 0,
  },
  pericles: {
    id: 'pericles',
    nameKey: 'leader.pericles.name',
    descriptionKey: 'leader.pericles.desc',
    mainEffectNameKey: 'leader.pericles.main.name',
    mainEffectDescKey: 'leader.pericles.main.desc',
    subEffectNameKey: 'leader.pericles.sub.name',
    subEffectDescKey: 'leader.pericles.sub.desc',
    startingRelicIds: [],
    startingGold: 0,
    startingFood: 0,
  },
};

export const LEADER_LIST = Object.values(LEADERS);

export function getLeaderStartingRelics(leaderId: LeaderId): RelicDefinition[] {
  const leader = LEADERS[leaderId];
  if (!leader) return [];
  return leader.startingRelicIds
    .map((id) => RELICS[id])
    .filter((r): r is RelicDefinition => r != null);
}
