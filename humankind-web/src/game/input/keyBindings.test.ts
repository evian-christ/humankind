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
            reroll: 'KeyR',
        }))).size).toBe(10);
    });

    it('migrates the previous default layout to the new default layout', () => {
        expect(sanitizeKeyBindings({
            spin: 'Space',
            pause: 'Escape',
            knowledge: 'KeyK',
            history: 'F12',
            ownedSymbols: 'KeyI',
        })).toEqual(DEFAULT_KEY_BINDINGS);
    });

    it('preserves customized legacy keys while migrating unchanged defaults', () => {
        expect(sanitizeKeyBindings({
            spin: 'KeyP',
            pause: 'Escape',
            knowledge: 'KeyK',
            history: 'F12',
            ownedSymbols: 'KeyI',
        })).toMatchObject({
            spin: 'KeyP',
            pause: 'Escape',
            knowledge: 'KeyW',
            history: 'KeyA',
            ownedSymbols: 'KeyS',
            reroll: 'KeyR',
        });
    });

    it('swaps actions when a key is already assigned', () => {
        const next = rebindKey(DEFAULT_KEY_BINDINGS, 'spin', 'KeyW');

        expect(next.spin).toBe('KeyW');
        expect(next.knowledge).toBe('Space');
        expect(getActionForKeyCode(next, 'KeyW')).toBe('spin');
    });
});
