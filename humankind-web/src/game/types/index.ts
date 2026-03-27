import type { SymbolDefinition } from '../data/symbolDefinitions';

export interface PlayerSymbolInstance {
    definition: SymbolDefinition;
    instanceId: string;
    effect_counter: number;
    is_marked_for_destruction: boolean;
    remaining_attacks?: number;
    enemy_hp?: number;
    /** 상인 심볼의 누적 골드 저장소 */
    stored_gold?: number;
    /** Merchants(22)가 이번 턴 저장 계산을 effectPhase 종료 후 수행해야 하는지 */
    merchant_store_pending?: boolean;
}
