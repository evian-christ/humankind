import { describe, expect, it, vi } from 'vitest';

describe('renderer shared state', () => {
    it('selects the configured font family for each language', async () => {
        vi.stubGlobal('window', {
            screen: { width: 1920, height: 1080 },
            innerWidth: 1920,
            innerHeight: 1080,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        });
        vi.stubGlobal('document', {
            fullscreenElement: null,
            getElementById: vi.fn(() => null),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            documentElement: { style: { setProperty: vi.fn() } },
        });

        const {
            DEFAULT_GAME_FONT_FAMILY,
            ZH_GAME_FONT_FAMILY,
            getGameFontFamily,
        } = await import('./rendererShared');

        expect(getGameFontFamily('en')).toBe(DEFAULT_GAME_FONT_FAMILY);
        expect(getGameFontFamily('zh')).toBe(ZH_GAME_FONT_FAMILY);
        expect(ZH_GAME_FONT_FAMILY).toBe('ZLabsPixel CN');
    });
});
