import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { SymbolType } from '../game/data/symbolDefinitions';
import {
    BOARD_DISPLAY_SCALE,
    boardCellLocalRect,
    computeBoardPixelLayout,
} from '../game/layout/boardPixelLayout';
import { useBoardViewStore } from '../game/state/boardViewStore';
import { useGameStore } from '../game/state/gameStore';
import { isBoardSlotActive } from '../game/state/gameStoreHelpers';
import { useSettingsStore } from '../game/state/settingsStore';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { t } from '../i18n';
import { mapCrtSourceToOutput } from './canvas/crtProjection';
import './boardDestroySelectionOverlay.css';

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
        crtEnabled ? mapCrtSourceToOutput(x, y, viewWidth, viewHeight) : { x, y }
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
    return {
        left: projectedLeft,
        top: projectedTop,
        width: projectedWidth,
        height: projectedHeight,
        center: project(left + width / 2, top + height / 2),
        clipPath: `polygon(${corners.map((point) => (
            `${((point.x - projectedLeft) / projectedWidth) * 100}% ${((point.y - projectedTop) / projectedHeight) * 100}%`
        )).join(', ')})`,
    };
};

const BoardDestroySelectionOverlay = ({ anchorRef }: Props) => {
    const phase = useGameStore((state) => state.phase);
    const board = useGameStore((state) => state.board);
    const pendingEdictSource = useGameStore((state) => state.pendingEdictSource);
    const confirmEdictDestroyAt = useGameStore((state) => state.confirmEdictDestroyAt);
    const cancelEdictPick = useGameStore((state) => state.cancelEdictPick);
    const language = useSettingsStore((state) => state.language);
    const crtEffect = useSettingsStore((state) => state.crtEffect);
    const boardZoom = useBoardViewStore((state) => state.zoom);
    const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
    const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);
    const [motion, setMotion] = useState<OverlayMotion>('entering');
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useRegisterBoardTooltipBlock('board-destroy-selection', phase === 'board_destroy_selection');

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
        const element = anchorRef.current;
        if (element) setViewSize({ w: element.clientWidth, h: element.clientHeight });
    }, [anchorRef]);

    useLayoutEffect(() => {
        measure();
        const element = anchorRef.current;
        const observer = new ResizeObserver(measure);
        if (element) observer.observe(element);
        window.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [anchorRef, measure]);

    useEffect(() => {
        if (phase !== 'board_destroy_selection') queueMicrotask(() => setHovered(null));
    }, [phase]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            event.preventDefault();
            beginClose(cancelEdictPick);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [beginClose, cancelEdictPick]);

    const occupiedCells = useMemo(() => {
        if (!pendingEdictSource) return [];
        const cells: { x: number; y: number }[] = [];
        const boardWidth = board.length;
        const boardHeight = Math.max(0, ...board.map((column) => column.length));
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const x = pendingEdictSource.x + dx;
                const y = pendingEdictSource.y + dy;
                if (x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) continue;
                if (isBoardSlotActive(board, x, y) && board[x][y]) cells.push({ x, y });
            }
        }
        return cells;
    }, [board, pendingEdictSource]);

    if (phase !== 'board_destroy_selection' || viewSize.w <= 0 || viewSize.h <= 0) return null;

    const boardWidth = board.length;
    const boardHeight = Math.max(0, ...board.map((column) => column.length));
    const layout = computeBoardPixelLayout(viewSize.w, viewSize.h, boardWidth, boardHeight, boardZoom);
    const titleHeight = Math.max(28 * BOARD_DISPLAY_SCALE, 30 * layout.scale);
    const innerLeft = layout.startX + layout.gridOffsetX;
    const innerWidth = boardWidth * layout.cellWidth + Math.max(0, boardWidth - 1) * layout.colGap;
    const titleTop = Math.max(4, layout.startY - titleHeight - 6 * BOARD_DISPLAY_SCALE);
    const projectedTitle = projectRect(
        innerLeft,
        titleTop,
        innerWidth,
        titleHeight,
        viewSize.w,
        viewSize.h,
        crtEffect,
    );

    return (
        <div
            className={`board-destroy-selection-overlay board-destroy-selection-overlay--${motion}`}
            style={{ position: 'absolute', inset: 0, zIndex: 12, pointerEvents: 'none' }}
        >
            <div
                className="board-destroy-selection-overlay__header"
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
                <span style={{ fontSize: Math.max(26 * BOARD_DISPLAY_SCALE, 32 * layout.scale), fontWeight: 800 }}>
                    {t('edictBoard.title', language)}
                </span>
                <button
                    type="button"
                    style={{
                        flexShrink: 0,
                        fontFamily: 'inherit',
                        fontSize: Math.max(26 * BOARD_DISPLAY_SCALE, 32 * layout.scale),
                        fontWeight: 800,
                        padding: 0,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#fca5a5',
                    }}
                    onClick={(event) => {
                        event.stopPropagation();
                        beginClose(cancelEdictPick);
                    }}
                >
                    {t('edictBoard.cancel', language)}
                </button>
            </div>

            {occupiedCells.map(({ x, y }) => {
                const cell = board[x][y];
                if (!cell) return null;
                const rect = boardCellLocalRect(layout, x, y);
                const projectedCell = projectRect(
                    rect.left,
                    rect.top,
                    rect.width,
                    rect.height,
                    viewSize.w,
                    viewSize.h,
                    crtEffect,
                );
                const isHovered = hovered?.x === x && hovered?.y === y;
                const canDestroy = cell.definition.type !== SymbolType.DISASTER;
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
                        onMouseLeave={() => setHovered((current) => (
                            current?.x === x && current?.y === y ? null : current
                        ))}
                    >
                        {isHovered && canDestroy && (
                            <button
                                type="button"
                                aria-label={t('edictBoard.remove', language)}
                                style={{
                                    position: 'absolute',
                                    left: projectedCell.center.x - projectedCell.left,
                                    top: projectedCell.center.y - projectedCell.top,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 3,
                                    fontFamily: 'var(--game-font-family), sans-serif',
                                    fontSize: Math.max(15 * BOARD_DISPLAY_SCALE, 18 * layout.scale),
                                    fontWeight: 800,
                                    padding: `${Math.max(8 * BOARD_DISPLAY_SCALE, 10 * layout.scale)}px ${Math.max(18 * BOARD_DISPLAY_SCALE, 22 * layout.scale)}px`,
                                    background: '#b91c1c',
                                    border: '3px solid #fca5a5',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    beginClose(() => confirmEdictDestroyAt(x, y));
                                }}
                            >
                                {t('edictBoard.remove', language)}
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default BoardDestroySelectionOverlay;
