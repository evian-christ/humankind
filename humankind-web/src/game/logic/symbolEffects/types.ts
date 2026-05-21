import type { PlayerSymbolInstance } from '../../types';
import type { BoardCounterFloatAnchor } from '../turn/turnTypes';

/** 보드 업데이트는 턴 타임라인에서 페이즈 3 시작 시 적용 (연출 후) */
export interface LootMergeResolution {
    /** 흡수당하는 칸 */
    absorbed: { x: number; y: number };
    /** 흡수하는 칸(효과 처리 중인 슬롯) */
    receiver: { x: number; y: number };
    /** 병합 후 receiver의 심볼 정의 ID */
    nextDefinitionId: number;
}

export interface EffectResult {
    food: number;
    knowledge: number;
    gold: number;
    /** Board counter display delta for floating text, when this effect changes a visible counter. */
    counterDelta?: number;
    counterAnchor?: BoardCounterFloatAnchor;
    counterDisplayTextBefore?: string | null;
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
    /** 다음 심볼 선택지 3칸을 모두 이벤트로 생성 */
    forceEventsInNextChoices?: boolean;
    /** 턴 종료 후 칙령: 보유 심볼 1개 제거 UI */
    edictRemovalPending?: boolean;
    /** 다음 심볼 선택 단계에서 소비할 무료 리롤 횟수 */
    freeSelectionRerolls?: number;
    /** 인접 전리품 합류 — 보드 변경은 타임라인에서 지연 적용 */
    lootMerge?: LootMergeResolution;
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
    /** 유물 33 구데아의 정초 못 — 모든 심볼을 구석에 있는 것으로 취급 */
    allSymbolsAreCorner: boolean;
}

export const DEFAULT_RELIC_EFFECTS: ActiveRelicEffects = {
    relicCount: 0,
    quarryEmptyGold: false,
    bananaFossilBonus: false,
    horsemansihpPastureBonus: false,
    terraFossilDisasterFood: false,
    allSymbolsAreCorner: false,
};

export interface SymbolEffectContext {
    upgrades: number[];
    allSymbolsAdjacent?: boolean;
}

export type BoardGrid = (PlayerSymbolInstance | null)[][];
