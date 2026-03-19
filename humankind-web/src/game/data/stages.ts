/**
 * 난이도(=런 프리셋) 정의 — 난이도별 드래프트 횟수 등
 */

export interface StageDefinition {
  id: number;
  nameKey: string;
  /** 본격 게임 시작 전 심볼 선택(드래프트) 횟수 */
  draftPickCount: number;
}

export const STAGES: Record<number, StageDefinition> = {
  1: {
    id: 1,
    nameKey: 'stage.1.name', // 개척
    draftPickCount: 6,
  },
  2: {
    id: 2,
    nameKey: 'stage.2.name', // 평화
    draftPickCount: 6,
  },
  3: {
    id: 3,
    nameKey: 'stage.3.name', // 격동
    draftPickCount: 6,
  },
  4: {
    id: 4,
    nameKey: 'stage.4.name', // 역경
    draftPickCount: 6,
  },
  5: {
    id: 5,
    nameKey: 'stage.5.name', // 재앙
    draftPickCount: 6,
  },
  6: {
    id: 6,
    nameKey: 'stage.6.name', // 종말
    draftPickCount: 6,
  },
};

export const STAGE_LIST = Object.values(STAGES);
