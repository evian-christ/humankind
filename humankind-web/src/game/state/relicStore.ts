import { create } from 'zustand';
import type { RelicDefinition } from '../data/relicDefinitions';

export interface RelicInstance {
    instanceId: string;
    definition: RelicDefinition;
    /** 유물별 카운터 (우르·나일: 남은 턴, 획득 시 3에서 매 턴 -1) */
    effect_counter: number;
    /** 유물별 영구 스택 수 (예: 바빌로니아 세계 지도 식량 보너스 누적) */
    bonus_stacks: number;
}

interface RelicState {
    relics: RelicInstance[];
    addRelic: (def: RelicDefinition) => void;
    removeRelic: (instanceId: string) => void;
    incrementRelicCounter: (instanceId: string) => void;
    /** 남은 턴 등: 1 감소, 0 이하면 유물 제거 (우르·나일) */
    decrementRelicCounterOrRemove: (instanceId: string) => void;
    incrementRelicBonus: (instanceId: string, amount?: number) => void;
    /** 메인 메뉴 등: 유물 초기화 */
    resetRelics: () => void;
}

let nextId = 1;

export const useRelicStore = create<RelicState>((set) => ({
    relics: [],

    addRelic: (def) =>
        set((state) => ({
            relics: [...state.relics, {
                instanceId: `relic_${nextId++}`,
                definition: def,
                effect_counter: def.id === 3 || def.id === 9 ? 3 : 0,
                bonus_stacks: 0,
            }],
        })),

    removeRelic: (instanceId) =>
        set((state) => ({
            relics: state.relics.filter((r) => r.instanceId !== instanceId),
        })),

    incrementRelicCounter: (instanceId) =>
        set((state) => ({
            relics: state.relics.map(r =>
                r.instanceId === instanceId
                    ? { ...r, effect_counter: r.effect_counter + 1 }
                    : r
            ),
        })),

    decrementRelicCounterOrRemove: (instanceId) =>
        set((state) => ({
            relics: state.relics
                .map((r) => {
                    if (r.instanceId !== instanceId) return r;
                    const next = r.effect_counter - 1;
                    return next <= 0 ? null : { ...r, effect_counter: next };
                })
                .filter((r): r is RelicInstance => r != null),
        })),

    incrementRelicBonus: (instanceId, amount = 1) =>
        set((state) => ({
            relics: state.relics.map(r =>
                r.instanceId === instanceId
                    ? { ...r, bonus_stacks: r.bonus_stacks + amount }
                    : r
            ),
        })),

    resetRelics: () => {
        nextId = 1;
        set({ relics: [] });
    },
}));
