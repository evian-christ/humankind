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

/** 10·20·30…턴 식량 납부: 첫 납부 금액(이후 +50씩) */
export function getStageFoodPaymentBase(stageId: number): number {
  if (stageId === 1 || stageId === 2) return 50;
  if (stageId === 3 || stageId === 4) return 100;
  return 100;
}

/** 런 시작 시 고대 유물 잔해·고대 부족 합류 유물 개수 */
export function getStageStartingRelicCounts(stageId: number): { debris: number; tribe: number } {
  switch (stageId) {
    case 1:
      return { debris: 4, tribe: 2 };
    case 2:
    case 3:
      return { debris: 3, tribe: 2 };
    case 4:
      return { debris: 2, tribe: 1 };
    default:
      return { debris: 6, tribe: 0 };
  }
}

/** HUD 기본 생산(턴 시작 패시브)에 더하는 난이도 보너스 — 보드 심볼 효과 제외 */
export function getStagePassiveBonus(stageId: number): { food: number; gold: number; knowledge: number } {
  switch (stageId) {
    case 1:
      return { knowledge: 2, food: 5, gold: 2 };
    case 2:
    case 3:
      return { knowledge: 2, food: 2, gold: 2 };
    case 4:
      return { knowledge: 2, food: 0, gold: 0 };
    default:
      return { knowledge: 0, food: 0, gold: 0 };
  }
}
