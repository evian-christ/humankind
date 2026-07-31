import type { CellLayout } from '../../components/canvas/types';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../state/gameStoreHelpers';

/** 보드 배경과 셀의 1920x1080 기준 픽셀 규격. */
const BOARD_LAYOUT_WIDTH_PX = 912;
const BOARD_LAYOUT_HEIGHT_PX = 664;
const BOARD_CELL_WIDTH_PX = 170.4;
const BOARD_CELL_HEIGHT_PX = 163.2;
const BOARD_COL_GAP_PX = 12;
const BOARD_STATUS_GAP_PX = 20;
const BOARD_STATUS_ICON_SIZE_PX = 64;
const BOARD_EXTRA_UPWARD_OFFSET_PX = 18;

const BASE_W = 1920;
const BASE_H = 1080;

/**
 * 심볼 스프라이트 원본이 32x32 도트이므로, 기준 해상도(1920x1080)에서
 * 스프라이트가 32의 정수배(128 = 32*4)로 그려지도록 스케일을 정함.
 * 기존 0.8 스케일에서는 96(32*3)이었으나, 요청에 따라 보드/슬롯을 한 단계 키움.
 */
export const BOARD_DISPLAY_SCALE = 0.8 * (128 / 96);

export type BoardViewLayout = CellLayout & {
    scale: number;
    viewScale: number;
    boardH: number;
    viewW: number;
    viewH: number;
};

/** Pixi `renderBoard`와 동일한 보드·셀 배치 (뷰 픽셀 기준). */
export function computeBoardPixelLayout(
    viewW: number,
    viewH: number,
    boardWidth = BOARD_WIDTH,
    boardHeight = BOARD_HEIGHT,
    zoom = 1,
): BoardViewLayout {
    const w = viewW;
    const h = viewH;
    const viewScale = Math.min(w / BASE_W, h / BASE_H);
    const scale = viewScale * BOARD_DISPLAY_SCALE * zoom;
    const boardW = BOARD_LAYOUT_WIDTH_PX * scale;
    const boardH = BOARD_LAYOUT_HEIGHT_PX * scale;
    const cellWidth = BOARD_CELL_WIDTH_PX * scale;
    const cellHeight = BOARD_CELL_HEIGHT_PX * scale;
    const colGap = BOARD_COL_GAP_PX * scale;

    const totalSlotsWidth = cellWidth * boardWidth + colGap * Math.max(0, boardWidth - 1);
    const totalSlotsHeight = cellHeight * boardHeight;
    const gridOffsetX = (boardW - totalSlotsWidth) / 2;
    const gridOffsetY = (boardH - totalSlotsHeight) / 2;
    const statusReservedHeight = (BOARD_STATUS_GAP_PX + BOARD_STATUS_ICON_SIZE_PX) * viewScale;

    const startX = (w - boardW) / 2;
    const startY = (h - (boardH + statusReservedHeight)) / 2 - BOARD_EXTRA_UPWARD_OFFSET_PX * viewScale;

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
        viewScale,
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
