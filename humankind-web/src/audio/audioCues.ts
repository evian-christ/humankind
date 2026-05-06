import {
    AUDIO_CUE_IDS,
    audioManager,
    type AudioCueDefinition,
    type AudioCueId,
    type AudioManager,
} from './audioManager';

export type AudioCueLayer = 'ui' | 'gameplay' | 'combat' | 'milestone';

export interface AudioCueMetadata {
    id: AudioCueId;
    layer: AudioCueLayer;
    description: string;
}

const AUDIO_ASSET_BASE_URL = `${import.meta.env.BASE_URL}audio/`;

const audioUrl = (fileName: string) => `${AUDIO_ASSET_BASE_URL}${fileName}`;

export const DEFAULT_AUDIO_CUES: Record<AudioCueId, AudioCueDefinition> = {
    spin_start: {
        src: audioUrl('spin_start.wav'),
        volume: 0.7,
        preload: true,
    },
    spin_loop: {
        src: audioUrl('spin_loop.wav'),
        volume: 0.35,
        preload: true,
    },
    reel_stop: {
        src: audioUrl('reel_stop.wav'),
        volume: 0.45,
        preload: true,
    },
    symbol_activate: {
        src: audioUrl('symbol_activate.wav'),
        volume: 0.55,
    },
    resource_food: {
        src: audioUrl('resource_food.wav'),
        volume: 0.55,
    },
    resource_gold: {
        src: audioUrl('resource_gold.wav'),
        volume: 0.55,
    },
    resource_knowledge: {
        src: audioUrl('resource_knowledge.wav'),
        volume: 0.55,
    },
    combat_hit: {
        src: audioUrl('combat_hit.wav'),
        volume: 0.75,
    },
    symbol_destroy: {
        src: audioUrl('symbol_destroy.wav'),
        volume: 0.65,
    },
    era_transition: {
        src: audioUrl('era_transition.wav'),
        volume: 0.85,
    },
    selection_open: {
        src: audioUrl('selection_open.wav'),
        volume: 0.5,
    },
    game_over: {
        src: audioUrl('game_over.wav'),
        volume: 0.85,
    },
    victory: {
        src: audioUrl('victory.wav'),
        volume: 0.9,
    },
};

export const AUDIO_CUE_METADATA: Record<AudioCueId, AudioCueMetadata> = {
    spin_start: {
        id: 'spin_start',
        layer: 'gameplay',
        description: 'Board spin begins after the player starts a turn.',
    },
    spin_loop: {
        id: 'spin_loop',
        layer: 'gameplay',
        description: 'Looping reel motion bed while the board spin animation is active.',
    },
    reel_stop: {
        id: 'reel_stop',
        layer: 'gameplay',
        description: 'A slot reel column settles into its final board position.',
    },
    symbol_activate: {
        id: 'symbol_activate',
        layer: 'gameplay',
        description: 'A symbol becomes the active effect slot during turn processing.',
    },
    resource_food: {
        id: 'resource_food',
        layer: 'gameplay',
        description: 'A resolved symbol or passive effect grants Food.',
    },
    resource_gold: {
        id: 'resource_gold',
        layer: 'gameplay',
        description: 'A resolved symbol or passive effect grants Gold.',
    },
    resource_knowledge: {
        id: 'resource_knowledge',
        layer: 'gameplay',
        description: 'A resolved symbol or passive effect grants Knowledge.',
    },
    combat_hit: {
        id: 'combat_hit',
        layer: 'combat',
        description: 'A combat unit attacks or damages an adjacent target.',
    },
    symbol_destroy: {
        id: 'symbol_destroy',
        layer: 'gameplay',
        description: 'A board symbol is removed by combat, a relic, or an effect.',
    },
    era_transition: {
        id: 'era_transition',
        layer: 'milestone',
        description: 'Knowledge progression advances the run into a new era.',
    },
    selection_open: {
        id: 'selection_open',
        layer: 'ui',
        description: 'A symbol, relic, or upgrade choice overlay opens.',
    },
    game_over: {
        id: 'game_over',
        layer: 'milestone',
        description: 'The run fails after turn-end phase resolution.',
    },
    victory: {
        id: 'victory',
        layer: 'milestone',
        description: 'The run reaches a victory condition.',
    },
};

export function registerDefaultAudioCues(manager: AudioManager = audioManager) {
    manager.registerCues(DEFAULT_AUDIO_CUES);
}

export function getAudioCueMetadata(id: AudioCueId) {
    return AUDIO_CUE_METADATA[id];
}

export function getAudioCueIds() {
    return [...AUDIO_CUE_IDS];
}
