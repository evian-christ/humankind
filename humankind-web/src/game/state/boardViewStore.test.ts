import { describe, expect, it } from 'vitest';
import { BOARD_FIXED_ZOOM, useBoardViewStore } from './boardViewStore';

describe('board view store', () => {
    it('uses the fixed board zoom', () => {
        expect(useBoardViewStore.getState().zoom).toBe(BOARD_FIXED_ZOOM);
    });

    it('keeps the symbol sprite at an integer pixel scale at 1080p', () => {
        // 1080p 기준 스프라이트 표시 크기 = 96 * zoom. 32px 원본의 정수 배(64px)여야 한다.
        expect((96 * BOARD_FIXED_ZOOM) / 32).toBeCloseTo(2);
    });
});
