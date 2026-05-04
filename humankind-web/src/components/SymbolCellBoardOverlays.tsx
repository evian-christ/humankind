import type { PlayerSymbolInstance } from '../game/types';
import {
    BARBARIAN_CAMP_SPAWN_INTERVAL,
    SymbolType,
    S,
} from '../game/data/symbolDefinitions';
import { BOARD_CELL_HEIGHT_PX, BOARD_CELL_WIDTH_PX } from '../game/state/gameStore';

type Props = {
    sym: PlayerSymbolInstance;
    cellWidth: number;
    cellHeight: number;
};

/**
 * 메인 보드(PixiGameApp)와 동일 규칙의 카운터·공격·체력·야만 주둔지 턴 표시.
 * 부모는 `position: 'relative'` 셀 안에 스프라이트와 함께 둡니다.
 */
export function SymbolCellBoardOverlays({ sym, cellWidth, cellHeight }: Props) {
    const def = sym.definition;
    const sx = cellWidth / BOARD_CELL_WIDTH_PX;
    const sy = cellHeight / BOARD_CELL_HEIGHT_PX;
    const ux = (px: number) => px * sx;
    const uy = (px: number) => px * sy;
    const fs = Math.max(18, Math.round(27 * sx));
    const fsIcon = Math.max(22, Math.round(34 * sx));

    const bananaStatText =
        def.id === S.banana
            ? (() => {
                  const perm = sym.banana_permanent_food_bonus ?? 0;
                  const pr = sym.effect_counter || 0;
                  const parts: string[] = [];
                  if (perm > 0) parts.push(`+${perm}`);
                  if (pr > 0) parts.push(`${pr}/10`);
                  return parts.length ? parts.join(' ') : null;
              })()
            : null;
    const showCounter =
        def.id !== S.banana &&
        sym.effect_counter > 0 &&
        def.type !== SymbolType.ENEMY &&
        def.base_hp === undefined;
    const showAtk = def.base_attack !== undefined && def.base_attack > 0;
    const showHp = def.base_hp !== undefined && def.base_hp > 0;
    const hpValue = sym.enemy_hp ?? def.base_hp;
    const showCampCounter = def.id === S.barbarian_camp;
    const font = { fontFamily: 'Mulmaru, sans-serif' as const, lineHeight: 1 as const };
    const statShadow =
        '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

    return (
        <>
            {bananaStatText != null && (
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
                    {bananaStatText}
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

            {showAtk && (
                <div
                    style={{
                        position: 'absolute',
                        left: ux(4),
                        bottom: uy(6),
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: ux(5),
                        ...font,
                    }}
                >
                    <span
                        style={{
                            fontSize: fsIcon,
                            color: '#ff8c42',
                            opacity: 0.55,
                            textShadow: statShadow,
                        }}
                    >
                        ⚔
                    </span>
                    <span
                        style={{
                            fontSize: fs,
                            color: '#ffffff',
                            fontWeight: 800,
                            textShadow: statShadow,
                        }}
                    >
                        {def.base_attack}
                    </span>
                </div>
            )}

            {showHp && (
                <div
                    style={{
                        position: 'absolute',
                        right: ux(4),
                        bottom: uy(6),
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: ux(5),
                        ...font,
                    }}
                >
                    <span
                        style={{
                            fontSize: fsIcon,
                            color: '#4ade80',
                            opacity: 0.55,
                            textShadow: statShadow,
                        }}
                    >
                        ♥
                    </span>
                    <span
                        style={{
                            fontSize: fs,
                            color: '#ffffff',
                            fontWeight: 800,
                            textShadow: statShadow,
                        }}
                    >
                        {hpValue}
                    </span>
                </div>
            )}

            {showCampCounter && (
                <div
                    style={{
                        position: 'absolute',
                        left: ux(28),
                        bottom: uy(6),
                        fontSize: fs,
                        ...font,
                        color: '#8b7355',
                        fontWeight: 800,
                        textShadow: statShadow,
                    }}
                >
                    {BARBARIAN_CAMP_SPAWN_INTERVAL - sym.effect_counter}
                </div>
            )}
        </>
    );
}
