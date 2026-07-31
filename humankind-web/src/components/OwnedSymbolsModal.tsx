import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    BOARD_CELL_HEIGHT_PX,
    BOARD_CELL_WIDTH_PX,
    useGameStore,
} from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { getSymbolColorHex, SymbolType, type SymbolDefinition } from '../game/data/symbolDefinitions';
import { getBoardSymbolTooltipDesc, t } from '../i18n';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { getSymbolSpriteUrl } from '../game/data/symbolSpritePaths';
import { SymbolCellBoardOverlays } from './SymbolCellBoardOverlays';
import { EffectText } from './EffectText';

const OWNED_SYMBOL_CELL_SCALE = 0.56;
const OWNED_SYMBOL_CELL_WIDTH = BOARD_CELL_WIDTH_PX * OWNED_SYMBOL_CELL_SCALE;
const OWNED_SYMBOL_CELL_HEIGHT = BOARD_CELL_HEIGHT_PX * OWNED_SYMBOL_CELL_SCALE;
const TOOLTIP_W = 280;
const TOOLTIP_H = 180;
const TOOLTIP_MARGIN = 12;

const SYMBOL_TYPE_ORDER = [
    SymbolType.TERRAIN,
    SymbolType.RESOURCE,
    SymbolType.LUXURY,
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
    [SymbolType.RESOURCE]: 'era.resource',
    [SymbolType.LUXURY]: 'era.luxury',
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

type OwnedSymbolSort = 'acquired' | 'type' | 'name' | 'count';

type HoveredOwnedSymbol = {
    definition: SymbolDefinition;
    left: number;
    right: number;
    top: number;
} | null;

const OwnedSymbolsModal = ({ open, onClose }: Props) => {
    const playerSymbols = useGameStore((state) => state.playerSymbols);
    const unlockedKnowledgeUpgrades = useGameStore((state) => state.unlockedKnowledgeUpgrades ?? []);
    const language = useSettingsStore((state) => state.language);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [sortBy, setSortBy] = useState<OwnedSymbolSort>('acquired');
    const [sortDescending, setSortDescending] = useState(false);
    const [hoveredSymbol, setHoveredSymbol] = useState<HoveredOwnedSymbol>(null);
    const [panelSize, setPanelSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!open) return;
        setHoveredSymbol(null);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    useRegisterBoardTooltipBlock('owned-symbols-modal', open);

    useLayoutEffect(() => {
        if (!open || !panelRef.current) return;
        const panel = panelRef.current;
        const measure = () => setPanelSize({ width: panel.clientWidth, height: panel.clientHeight });
        measure();

        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        observer?.observe(panel);
        return () => observer?.disconnect();
    }, [open]);

    const ownedSymbolCounts = useMemo(() => {
        const counts = new Map<number, number>();
        playerSymbols.forEach((symbol) => {
            counts.set(symbol.definition.id, (counts.get(symbol.definition.id) ?? 0) + 1);
        });
        return counts;
    }, [playerSymbols]);

    const sortedSymbols = useMemo(() => {
        const typeRank = new Map(SYMBOL_TYPE_ORDER.map((type, index) => [type, index]));
        const symbols = playerSymbols.map((symbol, acquiredIndex) => ({ symbol, acquiredIndex }));

        symbols.sort((left, right) => {
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
                result =
                    (ownedSymbolCounts.get(leftDef.id) ?? 0) -
                    (ownedSymbolCounts.get(rightDef.id) ?? 0);
            } else {
                result = left.acquiredIndex - right.acquiredIndex;
            }

            if (result === 0 && sortBy !== 'acquired') result = leftDef.id - rightDef.id;
            if (result === 0) result = left.acquiredIndex - right.acquiredIndex;
            return sortDescending ? -result : result;
        });

        return symbols.map(({ symbol }) => symbol);
    }, [language, ownedSymbolCounts, playerSymbols, sortBy, sortDescending]);

    const updateHoveredSymbol = useCallback((
        definition: SymbolDefinition,
        event: React.SyntheticEvent<HTMLDivElement>,
    ) => {
        const panel = panelRef.current;
        if (!panel) return;

        const panelRect = panel.getBoundingClientRect();
        const itemRect = event.currentTarget.getBoundingClientRect();
        const scaleX = panel.clientWidth / panelRect.width;
        const scaleY = panel.clientHeight / panelRect.height;

        setHoveredSymbol({
            definition,
            left: (itemRect.left - panelRect.left) * scaleX,
            right: (itemRect.right - panelRect.left) * scaleX,
            top: (itemRect.top - panelRect.top) * scaleY,
        });
    }, []);

    const getTooltipStyle = (hoveredItem: HoveredOwnedSymbol): React.CSSProperties => {
        if (!hoveredItem || panelSize.width <= 0 || panelSize.height <= 0) return { display: 'none' };

        let left = hoveredItem.right + TOOLTIP_MARGIN;
        let top = hoveredItem.top;
        if (left + TOOLTIP_W > panelSize.width) left = hoveredItem.left - TOOLTIP_W - TOOLTIP_MARGIN;
        if (left < TOOLTIP_MARGIN) left = TOOLTIP_MARGIN;
        if (top + TOOLTIP_H > panelSize.height) top = panelSize.height - TOOLTIP_H - TOOLTIP_MARGIN;
        if (top < 0) top = 0;

        return {
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            zIndex: 6,
            pointerEvents: 'none',
        };
    };

    if (!open) return null;

    return (
        <div className="owned-symbols-modal" onClick={onClose}>
            <div
                className="owned-symbols-panel owned-symbols-panel--simple"
                ref={panelRef}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="owned-symbols-title"
            >
                <header className="owned-symbols-header owned-symbols-header--simple">
                    <div className="owned-symbols-title owned-symbols-title--simple" id="owned-symbols-title">
                        {t('ownedSymbols.title', language)}
                        <strong>{playerSymbols.length}</strong>
                    </div>

                    <div className="owned-symbols-header-actions owned-symbols-header-actions--simple">
                        <div className="owned-symbols-sort-controls owned-symbols-sort-controls--simple">
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

                        <button
                            type="button"
                            className="owned-symbols-close-btn owned-symbols-close-btn--simple"
                            onClick={onClose}
                        >
                            {t('ownedSymbols.close', language)}
                        </button>
                    </div>
                </header>

                <div
                    className="owned-symbols-scroll owned-symbols-scroll--simple"
                    onScroll={() => setHoveredSymbol(null)}
                >
                    {sortedSymbols.length === 0 ? (
                        <div className="owned-symbols-empty">
                            {t('ownedSymbols.empty', language)}
                        </div>
                    ) : (
                        <div className="owned-symbols-grid owned-symbols-grid--simple">
                            {sortedSymbols.map((symbol, index) => {
                                const definition = symbol.definition;
                                const symbolName = t(`symbol.${definition.key}.name`, language);
                                const spriteUrl = getSymbolSpriteUrl(definition);

                                return (
                                    <div
                                        key={`${symbol.instanceId}-${index}`}
                                        className={definition.key === 'monument'
                                            ? 'owned-symbol-item owned-symbol-item--simple owned-symbol-item--monument'
                                            : 'owned-symbol-item owned-symbol-item--simple'}
                                        onMouseEnter={(event) => updateHoveredSymbol(definition, event)}
                                        onMouseMove={(event) => updateHoveredSymbol(definition, event)}
                                        onMouseLeave={() => setHoveredSymbol(null)}
                                        onFocus={(event) => updateHoveredSymbol(definition, event)}
                                        onBlur={() => setHoveredSymbol(null)}
                                        tabIndex={0}
                                        aria-label={symbolName}
                                    >
                                        <div className="owned-symbol-sprite-frame owned-symbol-sprite-frame--simple">
                                            {spriteUrl ? (
                                                <img src={spriteUrl} alt="" draggable={false} />
                                            ) : (
                                                <span className="owned-symbol-missing-sprite">?</span>
                                            )}
                                            <SymbolCellBoardOverlays
                                                sym={symbol}
                                                cellWidth={OWNED_SYMBOL_CELL_WIDTH}
                                                cellHeight={OWNED_SYMBOL_CELL_HEIGHT}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {hoveredSymbol && (
                    <div className="symbol-tooltip" style={getTooltipStyle(hoveredSymbol)}>
                        <div className="symbol-tooltip-name">
                            {t(`symbol.${hoveredSymbol.definition.key}.name`, language)}
                        </div>
                        <div
                            className="symbol-tooltip-rarity"
                            style={{
                                color: getSymbolColorHex(hoveredSymbol.definition.type),
                                fontWeight: 'bold',
                                fontSize: '18px',
                                letterSpacing: '2px',
                                textShadow: `0 0 10px ${getSymbolColorHex(hoveredSymbol.definition.type)}80`,
                            }}
                        >
                            {t(ERA_NAME_KEYS[hoveredSymbol.definition.type] ?? 'era.ancient', language)}
                        </div>
                        <div className="symbol-tooltip-desc">
                            {getBoardSymbolTooltipDesc(
                                hoveredSymbol.definition.key,
                                language,
                                unlockedKnowledgeUpgrades,
                            )
                                .split('\n')
                                .map((line, index) => (
                                    <div key={index} className="symbol-tooltip-desc-line">
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
