import type { SymbolDefinition } from '../data/symbolDefinitions';

/** 열대우림 성장치를 채운 심볼이 어떤 자원 생산을 올리는지 */
export type GrowthKind = 'food' | 'gold' | 'knowledge';

/** 열대우림이 성장으로 누적한 자원별 영구 생산량 보너스 */
export interface RainforestGrowthBonus {
    food: number;
    gold: number;
    knowledge: number;
}

export interface PlayerSymbolInstance {
    definition: SymbolDefinition;
    instanceId: string;
    effect_counter: number;
    is_marked_for_destruction: boolean;
    /**
     * 열대우림: 성장치 10 소모마다 누적되는 영구 생산량 보너스.
     * 성장치를 10에 도달시킨 심볼의 성장 종류에 따라 어느 자원이 오를지 결정된다.
     */
    rainforest_growth_bonus?: RainforestGrowthBonus;
    /** 상인 심볼의 누적 골드 저장소 */
    stored_gold?: number;
    /** Merchants(22)가 이번 턴 저장 계산을 effectPhase 종료 후 수행해야 하는지 */
    merchant_store_pending?: boolean;
    /** 파괴 X 연출 숨김 (전리품 흡수 등) */
    suppress_destroy_overlay?: boolean;
    /** 야만인 침입으로 생성된 적인지 여부 */
    spawnedByBarbarianInvasion?: boolean;
    /** 야만인 침입 디버프 남은 턴수 */
    barbarianInvasionTurnsRemaining?: number;
}
