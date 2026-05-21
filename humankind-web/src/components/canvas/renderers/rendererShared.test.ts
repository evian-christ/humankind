import { describe, expect, it, vi } from 'vitest';
import { RELIC_ID } from '../../../game/logic/relics/relicIds';

describe('relic renderer shared state', () => {
    it('treats selection relics as clickable', async () => {
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

        const { CLICKABLE_RELIC_IDS } = await import('./rendererShared');

        expect(CLICKABLE_RELIC_IDS.has(RELIC_ID.MILITARY_LEVY)).toBe(true);
        expect(CLICKABLE_RELIC_IDS.has(RELIC_ID.PROPHECY_DIE)).toBe(true);
    });
});
