import { describe, expect, it } from 'vitest';
import { mapCrtOutputToSource, mapCrtSourceToOutput } from './crtProjection';

const WIDTH = 1920;
const HEIGHT = 1080;

describe('CRT projection', () => {
    it('keeps the center fixed', () => {
        expect(mapCrtOutputToSource(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT)).toEqual({
            x: WIDTH / 2,
            y: HEIGHT / 2,
        });
    });

    it('visibly curves positions away from the center', () => {
        const projected = mapCrtSourceToOutput(400, 250, WIDTH, HEIGHT);

        expect(projected.x).toBeLessThan(400);
        expect(projected.y).toBeLessThan(250);
    });

    it('round-trips projected coordinates for pointer hit testing', () => {
        for (const [x, y] of [
            [400, 250],
            [960, 540],
            [1520, 820],
            [200, 900],
        ]) {
            const projected = mapCrtSourceToOutput(x, y, WIDTH, HEIGHT);
            const restored = mapCrtOutputToSource(
                projected.x,
                projected.y,
                WIDTH,
                HEIGHT,
            );

            expect(restored.x).toBeCloseTo(x, 5);
            expect(restored.y).toBeCloseTo(y, 5);
        }
    });
});
