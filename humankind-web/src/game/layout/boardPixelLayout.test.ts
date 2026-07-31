import { describe, expect, it } from 'vitest';
import {
    BOARD_DISPLAY_SCALE,
    boardCellLocalRect,
    computeBoardPixelLayout,
} from './boardPixelLayout';

describe('board pixel layout', () => {
    const statusReservedHeight = 84;
    const extraUpwardOffset = 18;

    it('renders the centered board at BOARD_DISPLAY_SCALE of its base size', () => {
        const layout = computeBoardPixelLayout(1920, 1080);

        expect(layout.viewScale).toBe(1);
        expect(layout.scale).toBeCloseTo(BOARD_DISPLAY_SCALE);
        expect(layout.boardW).toBeCloseTo(912 * BOARD_DISPLAY_SCALE);
        expect(layout.boardH).toBeCloseTo(664 * BOARD_DISPLAY_SCALE);
        expect(layout.startX).toBeCloseTo((1920 - layout.boardW) / 2);
        expect(layout.startY).toBeCloseTo(
            (1080 - (layout.boardH + statusReservedHeight)) / 2 - extraUpwardOffset,
        );
    });

    it('centers the board together with the status strip below it', () => {
        const layout = computeBoardPixelLayout(1920, 1080);

        expect(layout.startY + (layout.boardH + statusReservedHeight) / 2).toBeCloseTo(
            1080 / 2 - extraUpwardOffset,
        );
    });

    it('keeps cell rectangles inside the scaled board coordinate system', () => {
        const layout = computeBoardPixelLayout(1920, 1080);
        const first = boardCellLocalRect(layout, 0, 0);
        const last = boardCellLocalRect(layout, 2, 1);

        expect(first.width).toBeCloseTo(170.4 * BOARD_DISPLAY_SCALE);
        expect(first.height).toBeCloseTo(163.2 * BOARD_DISPLAY_SCALE);
        expect(last.left + last.width).toBeLessThanOrEqual(layout.startX + layout.boardW);
        expect(last.top + last.height).toBeLessThanOrEqual(layout.startY + layout.boardH);
    });

    it('applies the user zoom multiplier around the centered board', () => {
        const layout = computeBoardPixelLayout(1920, 1080, 3, 2, 1.5);

        expect(layout.scale).toBeCloseTo(BOARD_DISPLAY_SCALE * 1.5);
        expect(layout.boardW).toBeCloseTo(912 * BOARD_DISPLAY_SCALE * 1.5);
        expect(layout.startX).toBeCloseTo((1920 - layout.boardW) / 2);
    });
});
