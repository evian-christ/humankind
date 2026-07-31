import { describe, expect, it } from 'vitest';
import { getBoardSymbolSpriteSize, getSealSpriteSize } from './rendererShared';

describe('board symbol sprite size', () => {
    it('renders at the 32px-native scale (128 = 32*4) at base resolution', () => {
        const base = getBoardSymbolSpriteSize(181.76, 174.08);
        expect(base).toBe(128);
    });

    it('snaps to the nearest multiple of 32 so sprites never scale non-uniformly', () => {
        // 셀 크기가 스케일/줌에 따라 소수점 값이 되어도, 실제 그려지는 스프라이트 크기는
        // 항상 32의 정수배여야 픽셀아트가 깨지지 않는다.
        expect(getBoardSymbolSpriteSize(150, 150)).toBe(96);
        expect(getBoardSymbolSpriteSize(200, 200)).toBe(160);
        expect(getBoardSymbolSpriteSize(10, 10)).toBe(32);
    });

    it('renders seal sprites larger and only at 32px multiples', () => {
        expect(getSealSpriteSize(0.75)).toBe(64);
        expect(getSealSpriteSize(1)).toBe(96);
        expect(getSealSpriteSize(1.25)).toBe(128);
        expect(getSealSpriteSize(1) % 32).toBe(0);
    });
});
