import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { useGameStore, BOARD_WIDTH, BOARD_HEIGHT } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';
import { computeBoardPixelLayout, boardCellLocalRect } from '../game/layout/boardPixelLayout';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';

type Props = { anchorRef: RefObject<HTMLElement | null> };

/** 망각의 화로: 보드 위 호버 시 셀 중앙 제거 버튼 */
const OblivionFurnaceBoardOverlay = ({ anchorRef }: Props) => {
    const phase = useGameStore((s) => s.phase);
    const board = useGameStore((s) => s.board);
    const pendingEdictSource = useGameStore((s) => s.pendingEdictSource);
    const confirmOblivionFurnaceDestroyAt = useGameStore((s) => s.confirmOblivionFurnaceDestroyAt);
    const confirmEdictDestroyAt = useGameStore((s) => s.confirmEdictDestroyAt);
    const cancelOblivionFurnacePick = useGameStore((s) => s.cancelOblivionFurnacePick);
    const cancelEdictPick = useGameStore((s) => s.cancelEdictPick);
    const language = useSettingsStore((s) => s.language);

    const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
    const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);

    useRegisterBoardTooltipBlock('oblivion-furnace-board', phase === 'oblivion_furnace_board');

    const measure = useCallback(() => {
        const el = anchorRef.current;
        if (!el) return;
        setViewSize({ w: el.clientWidth, h: el.clientHeight });
    }, [anchorRef]);

    useLayoutEffect(() => {
        measure();
        const el = anchorRef.current;
        const ro = new ResizeObserver(() => measure());
        if (el) ro.observe(el);
        window.addEventListener('resize', measure);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [anchorRef, measure]);

    useEffect(() => {
        if (phase !== 'oblivion_furnace_board') {
            queueMicrotask(() => setHovered(null));
        }
    }, [phase]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            const targetEl = e.target as HTMLElement;
            if (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA' || targetEl.isContentEditable) return;
            e.preventDefault();
            if (pendingEdictSource) cancelEdictPick();
            else cancelOblivionFurnacePick();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [cancelEdictPick, cancelOblivionFurnacePick, pendingEdictSource]);

    const occupiedCells = useMemo(() => {
        const out: { x: number; y: number }[] = [];
        if (pendingEdictSource) {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const x = pendingEdictSource.x + dx;
                    const y = pendingEdictSource.y + dy;
                    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) continue;
                    if (board[x][y]) out.push({ x, y });
                }
            }
            return out;
        }
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                if (board[x][y]) out.push({ x, y });
            }
        }
        return out;
    }, [board, pendingEdictSource]);

    if (phase !== 'oblivion_furnace_board' || viewSize.w <= 0 || viewSize.h <= 0) return null;

    const layout = computeBoardPixelLayout(viewSize.w, viewSize.h);
    const titleH = Math.max(28, 30 * layout.scale);
    /** 슬롯 그리드 안쪽(흰 칸 영역) — 바깥 보드 패널 테두리/패딩 제외 */
    const innerLeft = layout.startX + layout.gridOffsetX;
    const innerWidth =
        BOARD_WIDTH * layout.cellWidth + (BOARD_WIDTH - 1) * layout.colGap;
    /** 세로는 보드 패널 밖(상단) — 가로만 슬롯 그리드와 맞춤 */
    const gapAboveBoard = 6;
    const titleTop = Math.max(4, layout.startY - titleH - gapAboveBoard);

    const bl = layout.startX;
    const bt = layout.startY;
    const bw = layout.boardW;
    const bh = layout.boardH;
    const sc = layout.scale;
    /** 보드 뒤에서 떠 있는 느낌 — 바깥으로 강한 그림자 + 아주 약한 안쪽 깊이 */
    const boardBackShadow = [
        `0 ${Math.round(28 * sc)}px ${Math.round(100 * sc)}px rgba(0,0,0,0.72)`,
        `0 ${Math.round(14 * sc)}px ${Math.round(48 * sc)}px rgba(0,0,0,0.58)`,
        `0 0 ${Math.round(120 * sc)}px ${Math.round(32 * sc)}px rgba(0,0,0,0.42)`,
        `inset 0 ${Math.round(-36 * sc)}px ${Math.round(72 * sc)}px rgba(0,0,0,0.22)`,
    ].join(', ');
    const isEdictMode = pendingEdictSource != null;
    const titleKey = isEdictMode ? 'edictBoard.title' : 'oblivionBoard.title';
    const actionKey = isEdictMode ? 'edictBoard.remove' : 'oblivionBoard.remove';
    const cancelKey = isEdictMode ? 'edictBoard.cancel' : 'oblivionBoard.cancel';

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 12,
                pointerEvents: 'none',
            }}
        >
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    left: bl,
                    top: bt,
                    width: bw,
                    height: bh,
                    zIndex: 1,
                    pointerEvents: 'none',
                    background: 'transparent',
                    boxShadow: boardBackShadow,
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    left: innerLeft,
                    top: titleTop,
                    width: innerWidth,
                    height: titleH,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    pointerEvents: 'auto',
                    zIndex: 4,
                    fontFamily: 'Mulmaru, sans-serif',
                    color: '#f5f5f5',
                    textShadow: '0 1px 3px rgba(0,0,0,0.85)',
                }}
            >
                <span
                    style={{
                        fontSize: Math.max(18, 22 * layout.scale),
                        fontWeight: 800,
                        letterSpacing: 0.5,
                    }}
                >
                    {t(titleKey, language)}
                </span>
                <button
                    type="button"
                    style={{
                        flexShrink: 0,
                        fontFamily: 'inherit',
                        fontSize: Math.max(18, 22 * layout.scale),
                        fontWeight: 800,
                        letterSpacing: 0.5,
                        margin: 0,
                        padding: 0,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#fca5a5',
                        textShadow: '0 1px 3px rgba(0,0,0,0.75)',
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isEdictMode) cancelEdictPick();
                        else cancelOblivionFurnacePick();
                    }}
                >
                    {t(cancelKey, language)}
                </button>
            </div>

            {occupiedCells.map(({ x, y }) => {
                const cell = board[x][y];
                if (!cell) return null;
                const r = boardCellLocalRect(layout, x, y);
                const isHover = hovered?.x === x && hovered?.y === y;
                const btnFs = Math.max(15, 18 * layout.scale);

                return (
                    <div
                        key={`cell-${x}-${y}`}
                        style={{
                            position: 'absolute',
                            left: r.left,
                            top: r.top,
                            width: r.width,
                            height: r.height,
                            zIndex: 3,
                            pointerEvents: 'auto',
                        }}
                        onMouseEnter={() => setHovered({ x, y })}
                        onMouseLeave={() =>
                            setHovered((h) => (h?.x === x && h?.y === y ? null : h))
                        }
                    >
                        {isHover && (
                            <button
                                type="button"
                                aria-label={t(actionKey, language)}
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 3,
                                    fontFamily: 'Mulmaru, sans-serif',
                                    fontSize: btnFs,
                                    fontWeight: 800,
                                    padding: `${Math.max(8, 10 * layout.scale)}px ${Math.max(18, 22 * layout.scale)}px`,
                                    background: '#b91c1c',
                                    border: '3px solid #fca5a5',
                                    color: '#fff',
                                    borderRadius: 0,
                                    boxShadow: 'none',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isEdictMode) confirmEdictDestroyAt(x, y);
                                    else confirmOblivionFurnaceDestroyAt(x, y);
                                    setHovered(null);
                                }}
                            >
                                {t(actionKey, language)}
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default OblivionFurnaceBoardOverlay;
