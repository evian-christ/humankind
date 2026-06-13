import { describe, expect, it } from 'vitest';
import { getBoardSymbolSpriteSize } from './rendererShared';

describe('board symbol sprite size', () => {
    it('scales continuously and proportionally with the board cells', () => {
        const base = getBoardSymbolSpriteSize(136.32, 130.56);
        const zoomed = getBoardSymbolSpriteSize(204.48, 195.84);

        expect(base).toBeCloseTo(96);
        expect(zoomed / base).toBeCloseTo(1.5);
    });
});
