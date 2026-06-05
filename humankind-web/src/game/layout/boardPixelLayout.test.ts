import { describe, expect, it } from 'vitest';
import {
    BOARD_DISPLAY_SCALE,
    boardCellLocalRect,
    computeBoardPixelLayout,
} from './boardPixelLayout';

describe('board pixel layout', () => {
    it('renders the centered board at 80 percent of its base size', () => {
        const layout = computeBoardPixelLayout(1920, 1080);

        expect(BOARD_DISPLAY_SCALE).toBe(0.8);
        expect(layout.viewScale).toBe(1);
        expect(layout.scale).toBe(0.8);
        expect(layout.boardW).toBeCloseTo(912 * 0.8);
        expect(layout.boardH).toBeCloseTo(664 * 0.8);
        expect(layout.startX).toBeCloseTo((1920 - layout.boardW) / 2);
        expect(layout.startY).toBeCloseTo((1080 - layout.boardH) / 2);
    });

    it('keeps cell rectangles inside the scaled board coordinate system', () => {
        const layout = computeBoardPixelLayout(1920, 1080);
        const first = boardCellLocalRect(layout, 0, 0);
        const last = boardCellLocalRect(layout, 4, 3);

        expect(first.width).toBeCloseTo(170.4 * 0.8);
        expect(first.height).toBeCloseTo(163.2 * 0.8);
        expect(last.left + last.width).toBeLessThanOrEqual(layout.startX + layout.boardW);
        expect(last.top + last.height).toBeLessThanOrEqual(layout.startY + layout.boardH);
    });
});
