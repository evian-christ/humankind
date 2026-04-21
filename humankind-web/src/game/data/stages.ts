/**
 * 스테이지 선택 정의
 */

export interface StageDefinition {
  id: number;
  nameKey: string;
}

export const TOTAL_STAGE_COUNT = 20;
export const UNLOCKED_STAGE_COUNT = 3;

export const STAGES: Record<number, StageDefinition> = Object.fromEntries(
  Array.from({ length: TOTAL_STAGE_COUNT }, (_, index) => {
    const id = index + 1;
    return [
      id,
      {
        id,
        nameKey: `stage.${id}.name`,
      },
    ];
  }),
) as Record<number, StageDefinition>;

export const STAGE_LIST = Object.values(STAGES);

export function isStageUnlocked(stageId: number): boolean {
  return stageId >= 1 && stageId <= UNLOCKED_STAGE_COUNT;
}

/** 10·20·30…턴 식량 납부: 첫 납부 금액 (모든 스테이지 공통 50) */
export function getStageFoodPaymentBase(_stageId: number): number {
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
      return { debris: 3, tribe: 0 };
    default:
      return { debris: 3, tribe: 0 };
  }
}

/** HUD 기본 생산(턴 시작 패시브)에 더하는 스테이지 보너스 — 보드 심볼 효과 제외 */
export function getStagePassiveBonus(stageId: number): { food: number; gold: number; knowledge: number } {
  switch (stageId) {
    case 1:
      return { knowledge: 2, food: 2, gold: 2 };
    case 2:
      return { knowledge: 2, food: 1, gold: 1 };
    case 3:
      return { knowledge: 2, food: 0, gold: 0 };
    default:
      return { knowledge: 0, food: 0, gold: 0 };
  }
}
