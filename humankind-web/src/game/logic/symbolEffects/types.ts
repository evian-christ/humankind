import type { PlayerSymbolInstance } from '../../types';

export interface EffectResult {
    food: number;
    knowledge: number;
    gold: number;
    /** 이번 턴에서 컬렉션에 추가할 심볼 ID 목록 */
    addSymbolIds?: number[];
    /** 이번 턴에서 보드에 추가할 심볼 ID 목록 (빈 슬롯에 배치) */
    spawnOnBoard?: number[];
    /** 강제로 유물 선택 상점을 열어야 하는지 여부 */
    triggerRelicSelection?: boolean;
    /** 유물 상점을 강제로 새로고침해야 하는지 여부 */
    triggerRelicRefresh?: boolean;
    /** 이 심볼의 효과에 기여한 인접 심볼 좌표 */
    contributors?: { x: number; y: number }[];
    /** 영구 턴당 지식 보너스 증가 (gameStore bonusXpPerTurn) */
    bonusXpPerTurnDelta?: number;
    /** 다음 심볼 선택지에 지형 1칸 이상 포함 */
    forceTerrainInNextChoices?: boolean;
    /** 턴 종료 후 칙령: 보유 심볼 1개 제거 UI */
    edictRemovalPending?: boolean;
    /** 다음 심볼 선택 단계에서 소비할 무료 리롤 횟수 */
    freeSelectionRerolls?: number;
}

/** 현재 보유 유물의 활성 효과 플래그 (`relicDefinitions` 1–19 + 지식 업그레이드 일부, gameStore에서 조합) */
export interface ActiveRelicEffects {
    /** 유물 보유 수 (석판 효과용) */
    relicCount: number;
    /** 유물 5 이집트 구리 톱 — 산 인접 빈 슬롯마다 골드 */
    quarryEmptyGold: boolean;
    /** 유물 7 쿠크 바나나 화석 — 열대우림 인접 바나나 보너스 */
    bananaFossilBonus: boolean;
    /** 기마술 업그레이드 — 평원 식량 */
    horsemansihpPastureBonus: boolean;
    /** 유물 16 테라의 화석 포도 — 자연재해 심볼 식량 +2 */
    terraFossilDisasterFood: boolean;
}

export const DEFAULT_RELIC_EFFECTS: ActiveRelicEffects = {
    relicCount: 0,
    quarryEmptyGold: false,
    bananaFossilBonus: false,
    horsemansihpPastureBonus: false,
    terraFossilDisasterFood: false,
};

export interface SymbolEffectContext {
    upgrades: number[];
}

export type BoardGrid = (PlayerSymbolInstance | null)[][];

