import type { PlayerSymbolInstance } from '../game/types';
import { S } from '../game/data/symbolDefinitions';
import { BOARD_CELL_HEIGHT_PX, BOARD_CELL_WIDTH_PX } from '../game/state/gameStore';

type Props = {
    sym: PlayerSymbolInstance;
    cellWidth: number;
    cellHeight: number;
};

/**
 * 메인 보드(PixiGameApp)와 동일 규칙의 카운터 표시.
 * 부모는 `position: 'relative'` 셀 안에 스프라이트와 함께 둡니다.
 */
export function SymbolCellBoardOverlays({ sym, cellWidth, cellHeight }: Props) {
    const def = sym.definition;
    const sx = cellWidth / BOARD_CELL_WIDTH_PX;
    const sy = cellHeight / BOARD_CELL_HEIGHT_PX;
    const ux = (px: number) => px * sx;
    const uy = (px: number) => px * sy;
    const fs = Math.max(18, Math.round(27 * sx));
    // 열대우림은 좌하단에 누적된 영구 생산량 보너스, 우하단에 성장치를 표시한다.
    const growthBonusTotal =
        def.id === S.rainforest
            ? (sym.rainforest_growth_bonus?.food ?? 0)
                + (sym.rainforest_growth_bonus?.gold ?? 0)
                + (sym.rainforest_growth_bonus?.knowledge ?? 0)
            : 0;
    const usesGrowthDisplay = def.id === S.rainforest;
    const bananaPermanentFoodText = growthBonusTotal > 0 ? `+${growthBonusTotal}` : null;
    const bananaProgressText =
        usesGrowthDisplay && (sym.effect_counter ?? 0) > 0
            ? String(sym.effect_counter)
            : null;
    const showCounter =
        !usesGrowthDisplay &&
        sym.effect_counter > 0;
    const font = { fontFamily: 'var(--game-font-family), sans-serif' as const, lineHeight: 1 as const };
    const statShadow =
        '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

    return (
        <>
            {bananaPermanentFoodText != null && (
                <div
                    style={{
                        position: 'absolute',
                        left: ux(2),
                        bottom: uy(4),
                        fontSize: fs,
                        ...font,
                        color: '#8b7355',
                        fontWeight: 700,
                        textShadow: statShadow,
                    }}
                >
                    {bananaPermanentFoodText}
                </div>
            )}

            {bananaProgressText != null && (
                <div
                    style={{
                        position: 'absolute',
                        right: ux(2),
                        bottom: uy(4),
                        fontSize: fs,
                        ...font,
                        color: '#8b7355',
                        fontWeight: 700,
                        textShadow: statShadow,
                    }}
                >
                    {bananaProgressText}
                </div>
            )}

            {showCounter && (
                <div
                    style={{
                        position: 'absolute',
                        right: ux(2),
                        bottom: uy(4),
                        fontSize: fs,
                        ...font,
                        color: '#8b7355',
                        fontWeight: 700,
                        textShadow: statShadow,
                    }}
                >
                    {sym.effect_counter}
                </div>
            )}

        </>
    );
}
