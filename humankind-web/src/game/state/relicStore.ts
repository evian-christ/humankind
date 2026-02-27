import { create } from 'zustand';
import type { RelicDefinition } from '../data/relicDefinitions';

export interface RelicInstance {
    instanceId: string;
    definition: RelicDefinition;
}

interface RelicState {
    relics: RelicInstance[];
    addRelic: (def: RelicDefinition) => void;
    removeRelic: (instanceId: string) => void;
}

let nextId = 1;

export const useRelicStore = create<RelicState>((set) => ({
    relics: [],

    addRelic: (def) =>
        set((state) => ({
            relics: [...state.relics, { instanceId: `relic_${nextId++}`, definition: def }],
        })),

    removeRelic: (instanceId) =>
        set((state) => ({
            relics: state.relics.filter((r) => r.instanceId !== instanceId),
        })),
}));
