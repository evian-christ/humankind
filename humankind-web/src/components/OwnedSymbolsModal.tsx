import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    useGameStore,
    BOARD_CELL_WIDTH_PX,
    BOARD_CELL_HEIGHT_PX,
} from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { getSymbolColorHex, SymbolType, SYMBOLS } from '../game/data/symbolDefinitions';
import { getBoardSymbolTooltipDesc, t } from '../i18n';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { EffectText } from './EffectText';
import { SymbolCellBoardOverlays } from './SymbolCellBoardOverlays';
import { getSymbolSpriteUrl } from '../game/data/symbolSpritePaths';

const BASE_W = 1920;
const BASE_H = 1080;
const OWNED_SYMBOL_CELL_SCALE = 0.5;
const OWNED_SYMBOL_SPRITE_FILL = 0.98;
const OWNED_SYMBOL_GRID_GAP = 4;
const TOOLTIP_W = 280;
const TOOLTIP_H = 180;
const TOOLTIP_MARGIN = 12;

const SYMBOL_TYPE_ORDER = [
    SymbolType.TERRAIN,
    SymbolType.NORMAL,
    SymbolType.ANCIENT,
    SymbolType.UNIT,
    SymbolType.MEDIEVAL,
    SymbolType.MODERN,
    SymbolType.RELIGION,
    SymbolType.SPECIAL,
    SymbolType.ENEMY,
    SymbolType.DISASTER,
];

const ERA_NAME_KEYS: Record<number, string> = {
    [SymbolType.RELIGION]: 'era.special',
    [SymbolType.NORMAL]: 'era.normal',
    [SymbolType.ANCIENT]: 'era.ancient',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
    [SymbolType.SPECIAL]: 'era.specialSymbol',
    [SymbolType.UNIT]: 'era.unit',
    [SymbolType.ENEMY]: 'era.enemy',
    [SymbolType.DISASTER]: 'era.disaster',
};

type Props = {
    open: boolean;
    onClose: () => void;
};

type HoveredOwnedSymbol = {
    symbolId: number;
    symbolType: number;
    left: number;
    right: number;
    top: number;
} | null;

type OwnedSymbolSort = 'acquired' | 'type' | 'name' | 'count';

function computeBoardMetrics(resW: number, resH: number) {
    const scale = Math.min(resW / BASE_W, resH / BASE_H);
    const cellWidth  = BOARD_CELL_WIDTH_PX * scale * OWNED_SYMBOL_CELL_SCALE;
    const cellHeight = BOARD_CELL_HEIGHT_PX * scale * OWNED_SYMBOL_CELL_SCALE;
    const spriteSize = Math.min(cellWidth, cellHeight) * OWNED_SYMBOL_SPRITE_FILL;

    return {
        cellWidth,
        cellHeight,
        spriteSize,
    };
}

const OwnedSymbolsModal = ({ open, onClose }: Props) => {
    const playerSymbols = useGameStore((s) => s.playerSymbols);
    const unlockedKnowledgeUpgrades = useGameStore((s) => s.unlockedKnowledgeUpgrades ?? []);
    const resolutionWidth = useSettingsStore((s) => s.resolutionWidth);
    const resolutionHeight = useSettingsStore((s) => s.resolutionHeight);
    const language = useSettingsStore((s) => s.language);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [hoveredSymbol, setHoveredSymbol] = useState<HoveredOwnedSymbol>(null);
    const [panelSize, setPanelSize] = useState({ w: 0, h: 0 });
    const [sortBy, setSortBy] = useState<OwnedSymbolSort>('acquired');
    const [sortDescending, setSortDescending] = useState(false);

    const metrics = useMemo(
        () => computeBoardMetrics(resolutionWidth, resolutionHeight),
        [resolutionWidth, resolutionHeight],
    );

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    useRegisterBoardTooltipBlock('owned-symbols-modal', open);

    useLayoutEffect(() => {
        if (!open) return;
        const el = panelRef.current;
        if (!el) return;

        const measure = () => {
            setPanelSize({ w: el.clientWidth, h: el.clientHeight });
        };
        measure();

        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
        ro?.observe(el);
        return () => ro?.disconnect();
    }, [open]);

    const ownedSymbolCounts = useMemo(() => {
        const counts = new Map<number, number>();
        for (const symbol of playerSymbols) {
            counts.set(symbol.definition.id, (counts.get(symbol.definition.id) ?? 0) + 1);
        }
        return counts;
    }, [playerSymbols]);

    const typeSummaries = useMemo(() => {
        const counts = new Map<number, number>();
        for (const symbol of playerSymbols) {
            counts.set(symbol.definition.type, (counts.get(symbol.definition.type) ?? 0) + 1);
        }

        return SYMBOL_TYPE_ORDER
            .filter((type) => counts.has(type))
            .map((type) => ({ type, count: counts.get(type) ?? 0 }));
    }, [playerSymbols]);

    const sortedSymbols = useMemo(() => {
        const typeRank = new Map(SYMBOL_TYPE_ORDER.map((type, index) => [type, index]));
        const decorated = playerSymbols.map((symbol, acquiredIndex) => ({ symbol, acquiredIndex }));

        decorated.sort((left, right) => {
            const leftDef = left.symbol.definition;
            const rightDef = right.symbol.definition;
            let result = 0;

            if (sortBy === 'type') {
                result =
                    (typeRank.get(leftDef.type) ?? SYMBOL_TYPE_ORDER.length) -
                    (typeRank.get(rightDef.type) ?? SYMBOL_TYPE_ORDER.length);
            } else if (sortBy === 'name') {
                result = t(`symbol.${leftDef.key}.name`, language).localeCompare(
                    t(`symbol.${rightDef.key}.name`, language),
                    language,
                );
            } else if (sortBy === 'count') {
                result = (ownedSymbolCounts.get(leftDef.id) ?? 0) - (ownedSymbolCounts.get(rightDef.id) ?? 0);
            }

            if (result === 0 && sortBy !== 'acquired') {
                result = leftDef.id - rightDef.id;
            }
            if (result === 0) {
                result = left.acquiredIndex - right.acquiredIndex;
            }

            return sortDescending ? -result : result;
        });

        return decorated.map(({ symbol }) => symbol);
    }, [language, ownedSymbolCounts, playerSymbols, sortBy, sortDescending]);

    const updateHoveredSymbol = useCallback((symbolId: number, symbolType: number, e: React.MouseEvent<HTMLDivElement>) => {
        const panel = panelRef.current;
        if (!panel) return;

        const panelRect = panel.getBoundingClientRect();
        const itemRect = e.currentTarget.getBoundingClientRect();
        const scaleX = panel.clientWidth / panelRect.width;
        const scaleY = panel.clientHeight / panelRect.height;

        setHoveredSymbol({
            symbolId,
            symbolType,
            left: (itemRect.left - panelRect.left) * scaleX,
            right: (itemRect.right - panelRect.left) * scaleX,
            top: (itemRect.top - panelRect.top) * scaleY,
        });
    }, []);

    const getTooltipStyle = (hoveredItem: HoveredOwnedSymbol): React.CSSProperties => {
        if (!hoveredItem || panelSize.w <= 0 || panelSize.h <= 0) return { display: 'none' };

        let left = hoveredItem.right + TOOLTIP_MARGIN;
        let top = hoveredItem.top;
        const panelWidth = panelSize.w;
        const panelHeight = panelSize.h;

        if (left + TOOLTIP_W > panelWidth) left = hoveredItem.left - TOOLTIP_W - TOOLTIP_MARGIN;
        if (left < TOOLTIP_MARGIN) left = TOOLTIP_MARGIN;
        if (top + TOOLTIP_H > panelHeight) top = panelHeight - TOOLTIP_H - TOOLTIP_MARGIN;
        if (top < 0) top = 0;

        return {
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            zIndex: 2,
            pointerEvents: 'none',
        };
    };

    if (!open) return null;

    return (
        <div
            className="owned-symbols-modal"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10001,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                padding: '42px',
                overflow: 'hidden',
            }}
            onClick={onClose}
        >
            <div
                className="owned-symbols-panel"
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: 'min(1220px, calc(100vw - 72px))',
                    height: 'min(820px, calc(100vh - 72px))',
                    minHeight: '420px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                <div
                    className="owned-symbols-header"
                    style={{
                        padding: '22px 28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                        gap: 16,
                    }}
                >
                    <div
                        className="owned-symbols-title"
                        style={{
                            fontFamily: 'var(--game-font-family), sans-serif',
                        }}
                    >
                        {t('ownedSymbols.title', language)} ({playerSymbols.length})
                    </div>
                    <button
                        className="owned-symbols-close-btn"
                        onClick={onClose}
                        style={{
                            padding: '9px 16px',
                            fontSize: 20,
                            fontFamily: 'var(--game-font-family), sans-serif',
                        }}
                    >
                        {t('ownedSymbols.close', language)}
                    </button>
                </div>

                <div
                    className="owned-symbols-toolbar"
                    style={{
                        padding: '14px 28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                        flexShrink: 0,
                    }}
                >
                    <div className="owned-symbols-type-summary" aria-label={t('ownedSymbols.types', language)}>
                        {typeSummaries.map(({ type, count }) => (
                            <span
                                key={type}
                                className="owned-symbols-type-pill"
                                style={{ '--owned-symbol-type-color': getSymbolColorHex(type) } as React.CSSProperties}
                            >
                                {t(ERA_NAME_KEYS[type] ?? 'era.ancient', language)}
                                <strong>{count}</strong>
                            </span>
                        ))}
                    </div>
                    <div className="owned-symbols-sort-controls">
                        <label htmlFor="owned-symbol-sort">{t('ownedSymbols.sort', language)}</label>
                        <select
                            id="owned-symbol-sort"
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value as OwnedSymbolSort)}
                        >
                            <option value="acquired">{t('ownedSymbols.sort.acquired', language)}</option>
                            <option value="type">{t('ownedSymbols.sort.type', language)}</option>
                            <option value="name">{t('ownedSymbols.sort.name', language)}</option>
                            <option value="count">{t('ownedSymbols.sort.count', language)}</option>
                        </select>
                        <button
                            type="button"
                            className={sortDescending ? 'owned-symbols-sort-direction owned-symbols-sort-direction--desc' : 'owned-symbols-sort-direction'}
                            aria-label={t(sortDescending ? 'ownedSymbols.sort.desc' : 'ownedSymbols.sort.asc', language)}
                            onClick={() => setSortDescending((value) => !value)}
                        >
                            <span aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <div
                    onScroll={() => setHoveredSymbol(null)}
                    style={{
                        padding: '22px 28px 28px',
                        overflowY: 'auto',
                        flex: 1,
                    }}
                >
                    {playerSymbols.length === 0 ? (
                        <div
                            style={{
                                color: '#9ca3af',
                                textAlign: 'center',
                                padding: '72px 28px',
                                fontSize: 30,
                                fontFamily: 'var(--game-font-family), sans-serif',
                            }}
                        >
                            {t('ownedSymbols.empty', language)}
                        </div>
                    ) : (
                        <div
                            className="owned-symbols-grid"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                                gap: OWNED_SYMBOL_GRID_GAP,
                                alignItems: 'start',
                                alignContent: 'start',
                            }}
                        >
                            {sortedSymbols.map((sym, idx) => {
                                const def = sym.definition;
                                const spriteUrl = getSymbolSpriteUrl(def);

                                return (
                                    <div
                                        key={`${sym.instanceId}-${idx}`}
                                        className={def.key === 'monument' ? 'owned-symbol-item owned-symbol-item--monument' : 'owned-symbol-item'}
                                        onMouseEnter={(e) => updateHoveredSymbol(def.id, def.type, e)}
                                        onMouseLeave={() => setHoveredSymbol(null)}
                                        style={{
                                            width: '100%',
                                            aspectRatio: `${metrics.cellWidth} / ${metrics.cellHeight}`,
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'help',
                                            borderColor: `${getSymbolColorHex(def.type)}55`,
                                        }}
                                    >
                                        {spriteUrl ? (
                                            <img
                                                src={spriteUrl}
                                                alt={t(`symbol.${def.key}.name`, language)}
                                                style={{
                                                    width: `${OWNED_SYMBOL_SPRITE_FILL * 100}%`,
                                                    height: `${OWNED_SYMBOL_SPRITE_FILL * 100}%`,
                                                    objectFit: 'contain',
                                                    imageRendering: 'pixelated',
                                                }}
                                            />
                                        ) : (
                                            <div style={{ fontSize: 18, opacity: 0.6, fontFamily: 'var(--game-font-family), sans-serif' }}>
                                                ?
                                            </div>
                                        )}

                                        <SymbolCellBoardOverlays
                                            sym={sym}
                                            cellWidth={metrics.cellWidth}
                                            cellHeight={metrics.cellHeight}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {hoveredSymbol && (
                    <div className="symbol-tooltip" style={getTooltipStyle(hoveredSymbol)}>
                        <div className="symbol-tooltip-name">
                            {t(`symbol.${SYMBOLS[hoveredSymbol.symbolId]?.key ?? hoveredSymbol.symbolId}.name`, language)}
                        </div>
                        <div
                            className="symbol-tooltip-rarity"
                            style={{
                                color: getSymbolColorHex(hoveredSymbol.symbolType),
                                fontWeight: 'bold',
                                fontSize: '18px',
                                letterSpacing: '2px',
                                textShadow: `0 0 10px ${getSymbolColorHex(hoveredSymbol.symbolType)}80`,
                            }}
                        >
                            {t(ERA_NAME_KEYS[hoveredSymbol.symbolType] ?? 'era.ancient', language)}
                        </div>
                        <div className="symbol-tooltip-desc">
                            {getBoardSymbolTooltipDesc(
                                String(SYMBOLS[hoveredSymbol.symbolId]?.key ?? hoveredSymbol.symbolId),
                                language,
                                unlockedKnowledgeUpgrades,
                            )
                                .split('\n')
                                .map((line, i) => (
                                    <div key={i} className="symbol-tooltip-desc-line">
                                        <EffectText text={line} />
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OwnedSymbolsModal;
