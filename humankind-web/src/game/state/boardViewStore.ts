import { create } from 'zustand';

export const MIN_BOARD_ZOOM = 0.65;
export const MAX_BOARD_ZOOM = 1.6;

const clampBoardZoom = (zoom: number) =>
    Math.min(MAX_BOARD_ZOOM, Math.max(MIN_BOARD_ZOOM, zoom));

type BoardViewState = {
    zoom: number;
    setZoom: (zoom: number) => void;
};

export const useBoardViewStore = create<BoardViewState>((set) => ({
    zoom: 1,
    setZoom: (zoom) => set({ zoom: clampBoardZoom(zoom) }),
}));
