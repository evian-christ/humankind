import { describe, expect, it } from 'vitest';
import {
    DEFAULT_KEY_BINDINGS,
    getActionForKeyCode,
    rebindKey,
    sanitizeKeyBindings,
} from './keyBindings';

describe('keyBindings', () => {
    it('uses defaults for missing or invalid saved bindings', () => {
        expect(sanitizeKeyBindings(null)).toEqual(DEFAULT_KEY_BINDINGS);
        expect(sanitizeKeyBindings({ spin: 'ShiftLeft', pause: 'KeyP' })).toMatchObject({
            spin: 'Space',
            pause: 'KeyP',
        });
        expect(new Set(Object.values(sanitizeKeyBindings({
            spin: 'KeyR',
            relicShop: 'KeyR',
        }))).size).toBe(11);
    });

    it('migrates the previous default layout to the new default layout', () => {
        expect(sanitizeKeyBindings({
            spin: 'Space',
            pause: 'Escape',
            relicShop: 'KeyR',
            knowledge: 'KeyK',
            history: 'F12',
            ownedSymbols: 'KeyI',
        })).toEqual(DEFAULT_KEY_BINDINGS);
    });

    it('preserves customized legacy keys while migrating unchanged defaults', () => {
        expect(sanitizeKeyBindings({
            spin: 'KeyP',
            pause: 'Escape',
            relicShop: 'KeyR',
            knowledge: 'KeyK',
            history: 'F12',
            ownedSymbols: 'KeyI',
        })).toMatchObject({
            spin: 'KeyP',
            pause: 'Escape',
            relicShop: 'KeyQ',
            knowledge: 'KeyW',
            history: 'KeyA',
            ownedSymbols: 'KeyS',
            reroll: 'KeyR',
        });
    });

    it('swaps actions when a key is already assigned', () => {
        const next = rebindKey(DEFAULT_KEY_BINDINGS, 'spin', 'KeyQ');

        expect(next.spin).toBe('KeyQ');
        expect(next.relicShop).toBe('Space');
        expect(getActionForKeyCode(next, 'KeyQ')).toBe('spin');
    });
});
