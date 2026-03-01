import { create } from 'zustand';
import type { RelicDefinition } from '../data/relicDefinitions';

export interface RelicInstance {
    instanceId: string;
    definition: RelicDefinition;
    /** 유물별 카운터 (예: 우르 전차 바퀴 5턴, 나일 강 흑니 5스핀, 틴타젤 수정 100스핀) */
    effect_counter: number;
    /** 유물별 영구 스택 수 (예: 바빌로니아 세계 지도 식량 보너스 누적) */
    bonus_stacks: number;
}

interface RelicState {
    relics: RelicInstance[];
    addRelic: (def: RelicDefinition) => void;
    removeRelic: (instanceId: string) => void;
    incrementRelicCounter: (instanceId: string) => void;
    incrementRelicBonus: (instanceId: string, amount?: number) => void;
}

let nextId = 1;

export const useRelicStore = create<RelicState>((set) => ({
    relics: [],

    addRelic: (def) =>
        set((state) => ({
            relics: [...state.relics, {
                instanceId: `relic_${nextId++}`,
                definition: def,
                effect_counter: 0,
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

    incrementRelicBonus: (instanceId, amount = 1) =>
        set((state) => ({
            relics: state.relics.map(r =>
                r.instanceId === instanceId
                    ? { ...r, bonus_stacks: r.bonus_stacks + amount }
                    : r
            ),
        })),
}));
