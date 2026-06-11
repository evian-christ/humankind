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
        volume: 0.42,
        preload: true,
    },
    button_hover: {
        src: audioUrl('board_screen/button_hover.wav'),
        volume: 0.42,
        preload: true,
    },
    button_click: {
        src: audioUrl('board_screen/button_click.wav'),
        volume: 0.54,
        preload: true,
    },
    denied: {
        src: audioUrl('board_screen/denied.wav'),
        volume: 0.66,
        preload: true,
    },
    relic_buy: {
        src: audioUrl('board_screen/relic_buy.wav'),
        volume: 0.78,
        preload: true,
    },
    open_reward: {
        src: audioUrl('board_screen/open_reward.mp3'),
        volume: 0.78,
        preload: true,
    },
    cow_butcher: {
        src: audioUrl('board_screen/cow_butcher.wav'),
        volume: 0.72,
        preload: true,
    },
    symbol_interact: {
        src: audioUrl('board_screen/symbol_interact.wav'),
        volume: 0.66,
        preload: true,
    },
    attack_melee: {
        src: audioUrl('board_screen/attack_melee.wav'),
        volume: 0.78,
        preload: true,
    },
    attack_ranged: {
        src: audioUrl('board_screen/attack_ranged.wav'),
        volume: 0.78,
        preload: true,
    },
    enemy_invade: {
        src: audioUrl('board_screen/enemy_invade.wav'),
        volume: 0.9,
        preload: true,
    },
    symbol_choice_chose: {
        src: audioUrl('board_screen/symbol_choice_chose.wav'),
        volume: 0.72,
        preload: true,
    },
    symbol_choice_reroll: {
        src: audioUrl('board_screen/symbol_choice_reroll.wav'),
        volume: 0.72,
        preload: true,
    },
    resource_food: {
        src: audioUrl('board_screen/food_add.wav'),
        volume: 0.66,
        preload: true,
    },
    resource_gold: {
        src: audioUrl('board_screen/gold_add.wav'),
        volume: 0.66,
        preload: true,
    },
    resource_knowledge: {
        src: audioUrl('board_screen/knowledge_add.wav'),
        volume: 0.66,
        preload: true,
    },
    knowledge_upgraded_1: {
        src: audioUrl('board_screen/knowledge_upgraded_1.wav'),
        volume: 0.84,
        preload: true,
    },
    knowledge_upgraded_2: {
        src: audioUrl('board_screen/knowledge_upgraded_2.wav'),
        volume: 0.84,
        preload: true,
    },
    level_up: {
        src: audioUrl('board_screen/level_up.mp3'),
        volume: 0.45,
        preload: true,
    },
    xp_fill: {
        src: audioUrl('board_screen/xp_fill.mp3'),
        volume: 0.1,
        loop: true,
        preload: true,
    },
    selection_open: {
        src: audioUrl('board_screen/symbol_choice_open.wav'),
        volume: 0.6,
        preload: true,
    },
    main_theme: {
        src: audioUrl('board_screen/bgm/main_theme.mp3'),
        volume: 0.6,
        loop: true,
        preload: true,
    },
    board_ambient: {
        src: audioUrl('board_screen/bgm/nature_ambient.mp3'),
        volume: 2,
        loop: true,
        preload: true,
    },
    gameover_music: {
        src: audioUrl('board_screen/bgm/gameover_music.mp3'),
        volume: 0.1,
        loop: true,
        preload: true,
    },
    victory_music: {
        src: audioUrl('board_screen/bgm/victory_music.mp3'),
        volume: 0.1,
        loop: true,
        preload: true,
    },
    ancient_01: {
        src: audioUrl('board_screen/bgm/ancient_01.mp3'),
        volume: 0.15,
        preload: true,
    },
    ancient_02: {
        src: audioUrl('board_screen/bgm/ancient_02.mp3'),
        volume: 0.15,
        preload: true,
    },
    ancient_03: {
        src: audioUrl('board_screen/bgm/ancient_03.mp3'),
        volume: 0.15,
        preload: true,
    },
    ancient_04: {
        src: audioUrl('board_screen/bgm/ancient_04.mp3'),
        volume: 0.15,
        preload: true,
    },
    ancient_05: {
        src: audioUrl('board_screen/bgm/ancient_05.mp3'),
        volume: 0.15,
        preload: true,
    },
    ancient_06: {
        src: audioUrl('board_screen/bgm/ancient_06.mp3'),
        volume: 0.15,
        preload: true,
    },
    ancient_07: {
        src: audioUrl('board_screen/bgm/ancient_07.mp3'),
        volume: 0.15,
        preload: true,
    },
    medieval_01: {
        src: audioUrl('board_screen/bgm/medieval_01.mp3'),
        volume: 0.15,
        preload: true,
    },
    medieval_02: {
        src: audioUrl('board_screen/bgm/medieval_02.mp3'),
        volume: 0.15,
        preload: true,
    },
    medieval_03: {
        src: audioUrl('board_screen/bgm/medieval_03.mp3'),
        volume: 0.15,
        preload: true,
    },
    medieval_04: {
        src: audioUrl('board_screen/bgm/medieval_04.mp3'),
        volume: 0.15,
        preload: true,
    },
    medieval_05: {
        src: audioUrl('board_screen/bgm/medieval_05.mp3'),
        volume: 0.15,
        preload: true,
    },
    medieval_06: {
        src: audioUrl('board_screen/bgm/medieval_06.mp3'),
        volume: 0.15,
        preload: true,
    },
    modern_01: {
        src: audioUrl('board_screen/bgm/modern_01.mp3'),
        volume: 0.15,
        preload: true,
    },
    modern_02: {
        src: audioUrl('board_screen/bgm/modern_02.mp3'),
        volume: 0.15,
        preload: true,
    },
    modern_03: {
        src: audioUrl('board_screen/bgm/modern_03.mp3'),
        volume: 0.15,
        preload: true,
    },
    modern_04: {
        src: audioUrl('board_screen/bgm/modern_04.mp3'),
        volume: 0.15,
        preload: true,
    },
    modern_05: {
        src: audioUrl('board_screen/bgm/modern_05.mp3'),
        volume: 0.15,
        preload: true,
    },
};

export const AUDIO_CUE_METADATA: Record<AudioCueId, AudioCueMetadata> = {
    spin_loop: {
        id: 'spin_loop',
        layer: 'gameplay',
        description: 'Looping reel motion bed while the board spin animation is active.',
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
    open_reward: {
        id: 'open_reward',
        layer: 'ui',
        description: 'A loot reward choice overlay opens.',
    },
    cow_butcher: {
        id: 'cow_butcher',
        layer: 'gameplay',
        description: 'A cattle symbol is butchered from the board action button.',
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
    enemy_invade: {
        id: 'enemy_invade',
        layer: 'gameplay',
        description: 'A barbarian invasion threat appears on the board.',
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
    level_up: {
        id: 'level_up',
        layer: 'milestone',
        description: 'A leader progress XP bar reaches the next level.',
    },
    xp_fill: {
        id: 'xp_fill',
        layer: 'milestone',
        description: 'Looping leader progress XP fill sound with pitch tied to bar fill percent.',
    },
    selection_open: {
        id: 'selection_open',
        layer: 'ui',
        description: 'A symbol, relic, or upgrade choice overlay opens.',
    },
    main_theme: {
        id: 'main_theme',
        layer: 'ui',
        description: 'Looping main theme for pre-game menu screens.',
    },
    board_ambient: {
        id: 'board_ambient',
        layer: 'gameplay',
        description: 'Looping nature ambience for in-game board screens.',
    },
    gameover_music: {
        id: 'gameover_music',
        layer: 'milestone',
        description: 'Looping music bed for the game over screen.',
    },
    victory_music: {
        id: 'victory_music',
        layer: 'milestone',
        description: 'Looping music bed for the victory screen.',
    },
    ancient_01: {
        id: 'ancient_01',
        layer: 'gameplay',
        description: 'Ancient era in-game music playlist track 1.',
    },
    ancient_02: {
        id: 'ancient_02',
        layer: 'gameplay',
        description: 'Ancient era in-game music playlist track 2.',
    },
    ancient_03: {
        id: 'ancient_03',
        layer: 'gameplay',
        description: 'Ancient era in-game music playlist track 3.',
    },
    ancient_04: {
        id: 'ancient_04',
        layer: 'gameplay',
        description: 'Ancient era in-game music playlist track 4.',
    },
    ancient_05: {
        id: 'ancient_05',
        layer: 'gameplay',
        description: 'Ancient era in-game music playlist track 5.',
    },
    ancient_06: {
        id: 'ancient_06',
        layer: 'gameplay',
        description: 'Ancient era in-game music playlist track 6.',
    },
    ancient_07: {
        id: 'ancient_07',
        layer: 'gameplay',
        description: 'Ancient era in-game music playlist track 7.',
    },
    medieval_01: {
        id: 'medieval_01',
        layer: 'gameplay',
        description: 'Medieval era in-game music playlist track 1.',
    },
    medieval_02: {
        id: 'medieval_02',
        layer: 'gameplay',
        description: 'Medieval era in-game music playlist track 2.',
    },
    medieval_03: {
        id: 'medieval_03',
        layer: 'gameplay',
        description: 'Medieval era in-game music playlist track 3.',
    },
    medieval_04: {
        id: 'medieval_04',
        layer: 'gameplay',
        description: 'Medieval era in-game music playlist track 4.',
    },
    medieval_05: {
        id: 'medieval_05',
        layer: 'gameplay',
        description: 'Medieval era in-game music playlist track 5.',
    },
    medieval_06: {
        id: 'medieval_06',
        layer: 'gameplay',
        description: 'Medieval era in-game music playlist track 6.',
    },
    modern_01: {
        id: 'modern_01',
        layer: 'gameplay',
        description: 'Modern era in-game music playlist track 1.',
    },
    modern_02: {
        id: 'modern_02',
        layer: 'gameplay',
        description: 'Modern era in-game music playlist track 2.',
    },
    modern_03: {
        id: 'modern_03',
        layer: 'gameplay',
        description: 'Modern era in-game music playlist track 3.',
    },
    modern_04: {
        id: 'modern_04',
        layer: 'gameplay',
        description: 'Modern era in-game music playlist track 4.',
    },
    modern_05: {
        id: 'modern_05',
        layer: 'gameplay',
        description: 'Modern era in-game music playlist track 5.',
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
