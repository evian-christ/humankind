export const GAME_SPEED_PRESETS = ['1x', '2x', '4x', '8x'] as const;

export type GameSpeedPreset = typeof GAME_SPEED_PRESETS[number];
export type GameSpeed = GameSpeedPreset | 'custom';

export function getGameSpeed(
    spinSpeed: GameSpeedPreset,
    effectSpeed: GameSpeedPreset,
): GameSpeed {
    return spinSpeed === effectSpeed ? spinSpeed : 'custom';
}

export function migrateLegacyGameSpeed(value: unknown): GameSpeedPreset | null {
    switch (value) {
        case '1x':
        case '2x':
            return '1x';
        case '4x':
            return '2x';
        case '8x':
            return '4x';
        case 'instant':
            return '8x';
        default:
            return null;
    }
}
