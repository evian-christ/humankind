import type { SymbolDefinition } from '../data/symbolDefinitions';

export interface PlayerSymbolInstance {
    definition: SymbolDefinition;
    instanceId: string;
    effect_counter: number;
    is_marked_for_destruction: boolean;
    remaining_attacks?: number;
    enemy_hp?: number;
    /** Campfire 폭발 시 이번 턴 한정 식량 2배 플래그 */
    campfire_double_food?: boolean;
    /** 상인 심볼의 누적 골드 저장소 */
    stored_gold?: number;
}
