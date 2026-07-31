import { create } from 'zustand';

/**
 * 보드 고정 배율.
 * 1920x1080 기준에서 32px 심볼 스프라이트가 정확히 2배(64px) 정수 스케일로
 * 그려지는 값이라 nearest 필터에서 픽셀이 깨지지 않는다.
 */
export const BOARD_FIXED_ZOOM = 2 / 3;

type BoardViewState = {
    zoom: number;
};

export const useBoardViewStore = create<BoardViewState>(() => ({
    zoom: BOARD_FIXED_ZOOM,
}));
