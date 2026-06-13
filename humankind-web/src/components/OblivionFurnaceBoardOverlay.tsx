import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { isBoardSlotActive } from '../game/state/gameStoreHelpers';
import { SymbolType } from '../game/data/symbolDefinitions';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';
import {
    BOARD_DISPLAY_SCALE,
    computeBoardPixelLayout,
    boardCellLocalRect,
} from '../game/layout/boardPixelLayout';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { mapCrtSourceToOutput } from './canvas/crtProjection';
import './oblivionBoardOverlay.css';
import { useBoardViewStore } from '../game/state/boardViewStore';

type Props = { anchorRef: RefObject<HTMLElement | null> };
type Point = { x: number; y: number };
type OverlayMotion = 'entering' | 'open' | 'exiting';
type ProjectedRect = {
    left: number;
    top: number;
    width: number;
    height: number;
    center: Point;
    clipPath: string;
};

const isBoardDestroyBlockedType = (type: SymbolType) =>
    type === SymbolType.ENEMY || type === SymbolType.DISASTER;

const projectRect = (
    left: number,
    top: number,
    width: number,
    height: number,
    viewWidth: number,
    viewHeight: number,
    crtEnabled: boolean,
): ProjectedRect => {
    const project = (x: number, y: number) => (
        crtEnabled
            ? mapCrtSourceToOutput(x, y, viewWidth, viewHeight)
            : { x, y }
    );
    const corners = [
        project(left, top),
        project(left + width, top),
        project(left + width, top + height),
        project(left, top + height),
    ];
    const projectedLeft = Math.min(...corners.map((point) => point.x));
    const projectedTop = Math.min(...corners.map((point) => point.y));
    const projectedRight = Math.max(...corners.map((point) => point.x));
    const projectedBottom = Math.max(...corners.map((point) => point.y));
    const projectedWidth = Math.max(1, projectedRight - projectedLeft);
    const projectedHeight = Math.max(1, projectedBottom - projectedTop);
    const clipPath = `polygon(${corners.map((point) => (
        `${((point.x - projectedLeft) / projectedWidth) * 100}% ${((point.y - projectedTop) / projectedHeight) * 100}%`
    )).join(', ')})`;
    return {
        left: projectedLeft,
        top: projectedTop,
        width: projectedWidth,
        height: projectedHeight,
        center: project(left + width / 2, top + height / 2),
        clipPath,
    };
};

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
    const crtEffect = useSettingsStore((s) => s.crtEffect);
    const boardZoom = useBoardViewStore((s) => s.zoom);
    const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
    const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);
    const [motion, setMotion] = useState<OverlayMotion>('entering');
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useRegisterBoardTooltipBlock('oblivion-furnace-board', phase === 'oblivion_furnace_board');

    useEffect(() => {
        const frame = requestAnimationFrame(() => setMotion('open'));
        return () => cancelAnimationFrame(frame);
    }, []);

    useEffect(() => () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    }, []);

    const beginClose = useCallback((complete: () => void) => {
        if (motion === 'exiting') return;
        setMotion('exiting');
        closeTimerRef.current = setTimeout(complete, 240);
    }, [motion]);

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
            beginClose(() => {
                if (pendingEdictSource) cancelEdictPick();
                else cancelOblivionFurnacePick();
            });
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [beginClose, cancelEdictPick, cancelOblivionFurnacePick, pendingEdictSource]);

    const occupiedCells = useMemo(() => {
        const out: { x: number; y: number }[] = [];
        const boardWidth = board.length;
        const boardHeight = Math.max(0, ...board.map((col) => col.length));
        if (pendingEdictSource) {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const x = pendingEdictSource.x + dx;
                    const y = pendingEdictSource.y + dy;
                    if (x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) continue;
                    if (!isBoardSlotActive(board, x, y)) continue;
                    if (board[x][y]) out.push({ x, y });
                }
            }
            return out;
        }
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                if (!isBoardSlotActive(board, x, y)) continue;
                if (board[x][y]) out.push({ x, y });
            }
        }
        return out;
    }, [board, pendingEdictSource]);

    if (phase !== 'oblivion_furnace_board' || viewSize.w <= 0 || viewSize.h <= 0) return null;

    const boardWidth = board.length;
    const boardHeight = Math.max(0, ...board.map((col) => col.length));
    const layout = computeBoardPixelLayout(
        viewSize.w,
        viewSize.h,
        boardWidth,
        boardHeight,
        boardZoom,
    );
    const titleH = Math.max(28 * BOARD_DISPLAY_SCALE, 30 * layout.scale);
    /** 슬롯 그리드 안쪽(흰 칸 영역) — 바깥 보드 패널 테두리/패딩 제외 */
    const innerLeft = layout.startX + layout.gridOffsetX;
    const innerWidth =
        boardWidth * layout.cellWidth + Math.max(0, boardWidth - 1) * layout.colGap;
    /** 세로는 보드 패널 밖(상단) — 가로만 슬롯 그리드와 맞춤 */
    const gapAboveBoard = 6 * BOARD_DISPLAY_SCALE;
    const titleTop = Math.max(4, layout.startY - titleH - gapAboveBoard);

    /** 보드 뒤에서 떠 있는 느낌 — 바깥으로 강한 그림자 + 아주 약한 안쪽 깊이 */
    const projectedTitle = projectRect(
        innerLeft,
        titleTop,
        innerWidth,
        titleH,
        viewSize.w,
        viewSize.h,
        crtEffect,
    );
    const isEdictMode = pendingEdictSource != null;
    const titleKey = isEdictMode ? 'edictBoard.title' : 'oblivionBoard.title';
    const actionKey = isEdictMode ? 'edictBoard.remove' : 'oblivionBoard.remove';
    const cancelKey = isEdictMode ? 'edictBoard.cancel' : 'oblivionBoard.cancel';

    return (
        <div
            className={`oblivion-board-overlay oblivion-board-overlay--${motion}`}
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 12,
                pointerEvents: 'none',
            }}
        >
            <div
                className="oblivion-board-overlay__header"
                style={{
                    position: 'absolute',
                    left: projectedTitle.left,
                    top: projectedTitle.top,
                    width: projectedTitle.width,
                    height: projectedTitle.height,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    pointerEvents: motion === 'exiting' ? 'none' : 'auto',
                    zIndex: 4,
                    fontFamily: 'var(--game-font-family), sans-serif',
                    color: '#f5f5f5',
                    textShadow: '0 1px 3px rgba(0,0,0,0.85)',
                }}
            >
                <span
                    style={{
                        fontSize: Math.max(26 * BOARD_DISPLAY_SCALE, 32 * layout.scale),
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
                        fontSize: Math.max(26 * BOARD_DISPLAY_SCALE, 32 * layout.scale),
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
                        beginClose(() => {
                            if (isEdictMode) cancelEdictPick();
                            else cancelOblivionFurnacePick();
                        });
                    }}
                >
                    {t(cancelKey, language)}
                </button>
            </div>

            {occupiedCells.map(({ x, y }) => {
                const cell = board[x][y];
                if (!cell) return null;
                const r = boardCellLocalRect(layout, x, y);
                const projectedCell = projectRect(
                    r.left,
                    r.top,
                    r.width,
                    r.height,
                    viewSize.w,
                    viewSize.h,
                    crtEffect,
                );
                const isHover = hovered?.x === x && hovered?.y === y;
                const isDestroyBlocked = isBoardDestroyBlockedType(cell.definition.type);
                const btnFs = Math.max(15 * BOARD_DISPLAY_SCALE, 18 * layout.scale);

                return (
                    <div
                        key={`cell-${x}-${y}`}
                        style={{
                            position: 'absolute',
                            left: projectedCell.left,
                            top: projectedCell.top,
                            width: projectedCell.width,
                            height: projectedCell.height,
                            zIndex: 3,
                            pointerEvents: motion === 'exiting' ? 'none' : 'auto',
                            clipPath: projectedCell.clipPath,
                        }}
                        onMouseEnter={() => setHovered({ x, y })}
                        onMouseLeave={() =>
                            setHovered((h) => (h?.x === x && h?.y === y ? null : h))
                        }
                    >
                        {isHover && !isDestroyBlocked && (
                            <button
                                type="button"
                                className="oblivion-board-overlay__action"
                                aria-label={t(actionKey, language)}
                                style={{
                                    position: 'absolute',
                                    left: projectedCell.center.x - projectedCell.left,
                                    top: projectedCell.center.y - projectedCell.top,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 3,
                                    fontFamily: 'var(--game-font-family), sans-serif',
                                    fontSize: btnFs,
                                    fontWeight: 800,
                                    padding: `${Math.max(8 * BOARD_DISPLAY_SCALE, 10 * layout.scale)}px ${Math.max(18 * BOARD_DISPLAY_SCALE, 22 * layout.scale)}px`,
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
                                    beginClose(() => {
                                        if (isEdictMode) confirmEdictDestroyAt(x, y);
                                        else confirmOblivionFurnaceDestroyAt(x, y);
                                    });
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
