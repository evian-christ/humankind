import type { SymbolDefinition } from '../data/symbolDefinitions';

export interface PlayerSymbolInstance {
    definition: SymbolDefinition;
    instanceId: string;
    effect_counter: number;
    is_marked_for_destruction: boolean;
    remaining_attacks?: number;
    enemy_hp?: number;
    /** 적 심볼에 배정된 효과 ID (enemyEffectDefinitions 참조) */
    enemy_effect_id?: number;
    /** Campfire 폭발 시 이번 스핀 한정 식량 2배 플래그 */
    campfire_double_food?: boolean;
}
