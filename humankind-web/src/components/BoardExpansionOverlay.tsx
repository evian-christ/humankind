import { useCallback, useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { getBoardExpansionCandidates } from '../game/state/gameStoreHelpers';
import { BOARD_DISPLAY_SCALE, boardCellLocalRect, computeBoardPixelLayout } from '../game/layout/boardPixelLayout';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';
import { mapCrtSourceToOutput } from './canvas/crtProjection';
import { useBoardViewStore } from '../game/state/boardViewStore';

type Props = { anchorRef: RefObject<HTMLElement | null> };

const BoardExpansionOverlay = ({ anchorRef }: Props) => {
    const board = useGameStore((state) => state.board);
    const remaining = useGameStore((state) => state.pendingBoardExpansions);
    const expandBoardSlotAt = useGameStore((state) => state.expandBoardSlotAt);
    const language = useSettingsStore((state) => state.language);
    const crtEffect = useSettingsStore((state) => state.crtEffect);
    const boardZoom = useBoardViewStore((state) => state.zoom);
    const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

    const measure = useCallback(() => {
        const element = anchorRef.current;
        if (!element) return;
        setViewSize({ width: element.clientWidth, height: element.clientHeight });
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

    const candidates = useMemo(() => getBoardExpansionCandidates(board), [board]);
    if (remaining <= 0 || viewSize.width <= 0 || viewSize.height <= 0) return null;

    const boardWidth = board.length;
    const boardHeight = Math.max(0, ...board.map((column) => column.length));
    const layout = computeBoardPixelLayout(
        viewSize.width,
        viewSize.height,
        boardWidth,
        boardHeight,
        boardZoom,
    );
    const buttonSize = Math.max(46, 64 * layout.scale);
    const project = (x: number, y: number) =>
        crtEffect ? mapCrtSourceToOutput(x, y, viewSize.width, viewSize.height) : { x, y };

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 18,
                pointerEvents: 'auto',
                background: 'rgba(5, 8, 12, 0.42)',
                fontFamily: 'var(--game-font-family), sans-serif',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: Math.max(18, layout.startY - 52 * BOARD_DISPLAY_SCALE),
                    transform: 'translateX(-50%)',
                    color: '#fff7d6',
                    fontSize: Math.max(22, 30 * layout.scale),
                    fontWeight: 900,
                    textAlign: 'center',
                    textShadow: '0 2px 8px #000',
                    whiteSpace: 'nowrap',
                }}
            >
                {t('boardExpansion.title', language).replace('{count}', String(remaining))}
            </div>

            {candidates.map(({ x, y }) => {
                const rect = boardCellLocalRect(layout, x, y);
                const center = project(rect.left + rect.width / 2, rect.top + rect.height / 2);
                return (
                    <button
                        key={`${x},${y}`}
                        type="button"
                        aria-label={t('boardExpansion.addSlot', language)}
                        onClick={() => expandBoardSlotAt(x, y)}
                        style={{
                            position: 'absolute',
                            left: center.x - buttonSize / 2,
                            top: center.y - buttonSize / 2,
                            width: buttonSize,
                            height: buttonSize,
                            padding: 0,
                            borderRadius: '50%',
                            border: `${Math.max(2, 3 * layout.scale)}px solid rgba(134, 239, 172, 0.96)`,
                            background: 'rgba(5, 46, 22, 0.92)',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(34, 197, 94, 0.72), inset 0 0 14px rgba(134, 239, 172, 0.18)',
                        }}
                    >
                        <span
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: buttonSize * 0.58,
                                height: buttonSize * 0.18,
                                borderRadius: buttonSize,
                                background: '#4ade80',
                                boxShadow: '0 0 8px rgba(134, 239, 172, 0.9)',
                                transform: 'translate(-50%, -50%)',
                            }}
                        />
                        <span
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: buttonSize * 0.18,
                                height: buttonSize * 0.58,
                                borderRadius: buttonSize,
                                background: '#4ade80',
                                boxShadow: '0 0 8px rgba(134, 239, 172, 0.9)',
                                transform: 'translate(-50%, -50%)',
                            }}
                        />
                    </button>
                );
            })}
        </div>
    );
};

export default BoardExpansionOverlay;
