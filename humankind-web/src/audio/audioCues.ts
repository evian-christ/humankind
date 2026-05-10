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
const AUDIO_ASSET_VERSION = '20260510-1';

const audioUrl = (fileName: string) => `${AUDIO_ASSET_BASE_URL}${fileName}?v=${AUDIO_ASSET_VERSION}`;

export const DEFAULT_AUDIO_CUES: Record<AudioCueId, AudioCueDefinition> = {
    spin_loop: {
        src: audioUrl('board_screen/spin_loop.wav'),
        volume: 0.35,
        preload: true,
    },
    reel_stop: {
        src: audioUrl('reel_stop.wav'),
        volume: 0.45,
        preload: true,
    },
    button_hover: {
        src: audioUrl('board_screen/button_hover.wav'),
        volume: 0.35,
        preload: true,
    },
    button_click: {
        src: audioUrl('board_screen/button_click.wav'),
        volume: 0.45,
        preload: true,
    },
    denied: {
        src: audioUrl('board_screen/denied.wav'),
        volume: 0.55,
        preload: true,
    },
    relic_buy: {
        src: audioUrl('board_screen/relic_buy.wav'),
        volume: 0.65,
        preload: true,
    },
    symbol_interact: {
        src: audioUrl('board_screen/symbol_interact.wav'),
        volume: 0.55,
        preload: true,
    },
    attack_melee: {
        src: audioUrl('board_screen/attack_melee.wav'),
        volume: 0.65,
        preload: true,
    },
    attack_ranged: {
        src: audioUrl('board_screen/attack_ranged.wav'),
        volume: 0.65,
        preload: true,
    },
    symbol_choice_chose: {
        src: audioUrl('board_screen/symbol_choice_chose.wav'),
        volume: 0.6,
        preload: true,
    },
    symbol_choice_reroll: {
        src: audioUrl('board_screen/symbol_choice_reroll.wav'),
        volume: 0.6,
        preload: true,
    },
    symbol_activate: {
        src: audioUrl('symbol_activate.wav'),
        volume: 0.55,
    },
    resource_food: {
        src: audioUrl('board_screen/food_add.wav'),
        volume: 0.55,
        preload: true,
    },
    resource_gold: {
        src: audioUrl('board_screen/gold_add.wav'),
        volume: 0.55,
        preload: true,
    },
    resource_knowledge: {
        src: audioUrl('board_screen/knowledge_add.wav'),
        volume: 0.55,
        preload: true,
    },
    knowledge_upgraded_1: {
        src: audioUrl('board_screen/knowledge_upgraded_1.wav'),
        volume: 0.7,
        preload: true,
    },
    knowledge_upgraded_2: {
        src: audioUrl('board_screen/knowledge_upgraded_2.wav'),
        volume: 0.7,
        preload: true,
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
        src: audioUrl('board_screen/symbol_choice_open.wav'),
        volume: 0.5,
        preload: true,
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
    button_hover: {
        id: 'button_hover',
        layer: 'ui',
        description: 'A button or button-like control is hovered.',
    },
    button_click: {
        id: 'button_click',
        layer: 'ui',
        description: 'A button or button-like control is clicked.',
    },
    denied: {
        id: 'denied',
        layer: 'ui',
        description: 'A command is rejected because its requirements are not met.',
    },
    relic_buy: {
        id: 'relic_buy',
        layer: 'ui',
        description: 'A relic is purchased from the relic shop.',
    },
    symbol_interact: {
        id: 'symbol_interact',
        layer: 'gameplay',
        description: 'A contributing symbol bounces during an interaction effect.',
    },
    attack_melee: {
        id: 'attack_melee',
        layer: 'combat',
        description: 'A melee unit starts a combat attack animation.',
    },
    attack_ranged: {
        id: 'attack_ranged',
        layer: 'combat',
        description: 'A ranged unit starts a combat attack animation.',
    },
    symbol_choice_chose: {
        id: 'symbol_choice_chose',
        layer: 'ui',
        description: 'A symbol choice card is selected.',
    },
    symbol_choice_reroll: {
        id: 'symbol_choice_reroll',
        layer: 'ui',
        description: 'The symbol choice options are rerolled.',
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
    knowledge_upgraded_1: {
        id: 'knowledge_upgraded_1',
        layer: 'ui',
        description: 'The first part of a successful knowledge upgrade confirmation.',
    },
    knowledge_upgraded_2: {
        id: 'knowledge_upgraded_2',
        layer: 'ui',
        description: 'The second part of a successful knowledge upgrade confirmation.',
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
