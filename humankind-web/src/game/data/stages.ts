/**
 * 난이도(=런 프리셋) 정의
 */

export interface StageDefinition {
  id: number;
  nameKey: string;
}

export const STAGES: Record<number, StageDefinition> = {
  1: {
    id: 1,
    nameKey: 'stage.1.name', // 개척
  },
  2: {
    id: 2,
    nameKey: 'stage.2.name', // 평화
  },
  3: {
    id: 3,
    nameKey: 'stage.3.name', // 격동
  },
  4: {
    id: 4,
    nameKey: 'stage.4.name', // 역경
  },
  5: {
    id: 5,
    nameKey: 'stage.5.name', // 재앙
  },
  6: {
    id: 6,
    nameKey: 'stage.6.name', // 종말
  },
};

export const STAGE_LIST = Object.values(STAGES);
