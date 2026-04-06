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

/** 10·20·30…턴 식량 납부: 첫 납부 금액 (선택 난이도 공통 100) */
export function getStageFoodPaymentBase(_stageId: number): number {
  return 100;
}

/** 10·20·30…턴 식량 납부: 두 번째 납부부터 매번 더해지는 증가분 (역경만 60, 나머지 선택 난이도 50) */
export function getStageFoodPaymentIncrement(stageId: number): number {
  if (stageId === 4) return 60;
  return 50;
}

/** 런 시작 시 고대 유물 잔해·고대 부족 합류 유물 개수 */
export function getStageStartingRelicCounts(stageId: number): { debris: number; tribe: number } {
  switch (stageId) {
    case 1:
      return { debris: 4, tribe: 1 };
    case 2:
      return { debris: 3, tribe: 1 };
    case 3:
    case 4:
      return { debris: 3, tribe: 0 };
    default:
      return { debris: 6, tribe: 0 };
  }
}

/** HUD 기본 생산(턴 시작 패시브)에 더하는 난이도 보너스 — 보드 심볼 효과 제외 */
export function getStagePassiveBonus(stageId: number): { food: number; gold: number; knowledge: number } {
  switch (stageId) {
    case 1:
      return { knowledge: 2, food: 2, gold: 2 };
    case 2:
      return { knowledge: 2, food: 1, gold: 1 };
    case 3:
      return { knowledge: 2, food: 0, gold: 0 };
    case 4:
      return { knowledge: 0, food: 0, gold: 0 };
    default:
      return { knowledge: 0, food: 0, gold: 0 };
  }
}
