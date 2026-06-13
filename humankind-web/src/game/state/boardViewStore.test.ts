import { beforeEach, describe, expect, it } from 'vitest';
import {
    MAX_BOARD_ZOOM,
    MIN_BOARD_ZOOM,
    useBoardViewStore,
} from './boardViewStore';

describe('board view store', () => {
    beforeEach(() => {
        useBoardViewStore.setState({ zoom: 1 });
    });

    it('clamps zoom to the supported range', () => {
        useBoardViewStore.getState().setZoom(10);
        expect(useBoardViewStore.getState().zoom).toBe(MAX_BOARD_ZOOM);

        useBoardViewStore.getState().setZoom(0.1);
        expect(useBoardViewStore.getState().zoom).toBe(MIN_BOARD_ZOOM);
    });
});
