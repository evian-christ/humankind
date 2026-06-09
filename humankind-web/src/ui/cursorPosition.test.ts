import { describe, expect, it } from 'vitest';
import { viewportPointToRootPoint } from './cursorPosition';

function makeRoot(clientWidth: number, clientHeight: number, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>) {
    return {
        clientWidth,
        clientHeight,
        getBoundingClientRect: () => rect,
    };
}

describe('viewportPointToRootPoint', () => {
    it('uses separate x and y scale factors for stretched fullscreen roots', () => {
        const root = makeRoot(1920, 1080, {
            left: 0,
            top: 0,
            width: 2560,
            height: 1440,
        });

        expect(viewportPointToRootPoint(root, 1280, 720)).toEqual({ x: 960, y: 540 });
    });

    it('subtracts root offset before converting to root-local coordinates', () => {
        const root = makeRoot(1920, 1080, {
            left: 320,
            top: 180,
            width: 960,
            height: 540,
        });

        expect(viewportPointToRootPoint(root, 800, 450)).toEqual({ x: 960, y: 540 });
    });
});
