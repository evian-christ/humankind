import type { CellLayout } from '../../components/canvas/types';

/** `gameStore.ts`의 BOARD_* 와 동일 — 변경 시 양쪽 맞출 것 */
const BOARD_WIDTH = 5;
const BOARD_HEIGHT = 4;
const BOARD_LAYOUT_WIDTH_PX = 912;
const BOARD_LAYOUT_HEIGHT_PX = 664;
const BOARD_CELL_WIDTH_PX = 170.4;
const BOARD_CELL_HEIGHT_PX = 163.2;
const BOARD_COL_GAP_PX = 12;

const BASE_W = 1920;
const BASE_H = 1080;

export type BoardViewLayout = CellLayout & {
    scale: number;
    boardH: number;
    viewW: number;
    viewH: number;
};

/** Pixi `renderBoard`와 동일한 보드·셀 배치 (뷰 픽셀 기준). */
export function computeBoardPixelLayout(viewW: number, viewH: number): BoardViewLayout {
    const w = viewW;
    const h = viewH;
    const scale = Math.min(w / BASE_W, h / BASE_H);
    const boardW = BOARD_LAYOUT_WIDTH_PX * scale;
    const boardH = BOARD_LAYOUT_HEIGHT_PX * scale;
    const cellWidth = BOARD_CELL_WIDTH_PX * scale;
    const cellHeight = BOARD_CELL_HEIGHT_PX * scale;
    const colGap = BOARD_COL_GAP_PX * scale;

    const totalSlotsWidth = cellWidth * BOARD_WIDTH + colGap * (BOARD_WIDTH - 1);
    const totalSlotsHeight = cellHeight * BOARD_HEIGHT;
    const gridOffsetX = (boardW - totalSlotsWidth) / 2;
    const gridOffsetY = (boardH - totalSlotsHeight) / 2;

    const startX = (w - boardW) / 2;
    const startY = (h - boardH) / 2;

    return {
        startX,
        startY,
        boardW,
        cellWidth,
        cellHeight,
        gridOffsetX,
        gridOffsetY,
        colGap,
        scale,
        boardH,
        viewW: w,
        viewH: h,
    };
}

export function boardCellLocalRect(layout: BoardViewLayout, x: number, y: number) {
    const cellX = layout.startX + layout.gridOffsetX + x * (layout.cellWidth + layout.colGap);
    const cellY = layout.startY + layout.gridOffsetY + y * layout.cellHeight;
    return { left: cellX, top: cellY, width: layout.cellWidth, height: layout.cellHeight };
}
