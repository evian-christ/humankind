import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const ASSET_BASE_URL = import.meta.env.BASE_URL;
const BASE_W = 1920;
const BASE_H = 1080;
const SPRITE_PX = 32;
const TOOLTIP_W = 280;
const TOOLTIP_H = 180;
const TOOLTIP_MARGIN = 12;

const ERA_NAME_KEYS: Record<number, string> = {
    [SymbolType.RELIGION]: 'era.special',
    [SymbolType.NORMAL]: 'era.normal',
    [SymbolType.ANCIENT]: 'era.ancient',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
};

type Props = {
    open: boolean;
    onClose: () => void;
};

type HoveredOwnedSymbol = {
    symbolId: number;
    symbolType: number;
    x: number;
    y: number;
} | null;

function computeBoardMetrics(resW: number, resH: number) {
    const scale = Math.min(resW / BASE_W, resH / BASE_H);
    const cellWidth  = BOARD_CELL_WIDTH_PX  * scale;
    const cellHeight = BOARD_CELL_HEIGHT_PX * scale;
    const rawSize = Math.min(cellWidth - 6, cellHeight) * 0.85;
    const spriteSize = SPRITE_PX * Math.max(1, Math.floor(rawSize / SPRITE_PX));

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

    const updateHoveredSymbol = useCallback((symbolId: number, symbolType: number, e: React.MouseEvent<HTMLDivElement>) => {
        const panel = panelRef.current;
        if (!panel) return;

        const rect = panel.getBoundingClientRect();
        const scaleX = panel.clientWidth / rect.width;
        const scaleY = panel.clientHeight / rect.height;

        setHoveredSymbol({
            symbolId,
            symbolType,
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        });
    }, []);

    const getTooltipStyle = (hoveredItem: HoveredOwnedSymbol): React.CSSProperties => {
        if (!hoveredItem || !panelRef.current) return { display: 'none' };

        let left = hoveredItem.x + TOOLTIP_MARGIN;
        let top = hoveredItem.y;
        const panelWidth = panelRef.current.clientWidth;
        const panelHeight = panelRef.current.clientHeight;

        if (left + TOOLTIP_W > panelWidth) left = hoveredItem.x - TOOLTIP_W - TOOLTIP_MARGIN;
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
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10001,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(0,0,0,0.94)',
                padding: '24px 28px 28px',
                overflow: 'hidden',
            }}
            onClick={onClose}
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    height: '100%',
                    background: 'rgba(11, 15, 20, 0.92)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        padding: '22px 28px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                        gap: 16,
                    }}
                >
                    <div
                        style={{
                            color: '#e5e7eb',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            fontSize: '34px',
                            fontFamily: 'Mulmaru, sans-serif',
                        }}
                    >
                        {t('ownedSymbols.title', language)} ({playerSymbols.length})
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.14)',
                            color: '#cbd5e1',
                            padding: '10px 18px',
                            fontSize: 22,
                            fontFamily: 'Mulmaru, sans-serif',
                        }}
                    >
                        {t('ownedSymbols.close', language)}
                    </button>
                </div>

                <div
                    style={{
                        padding: '28px',
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
                                fontFamily: 'Mulmaru, sans-serif',
                            }}
                        >
                            {t('ownedSymbols.empty', language)}
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 14,
                                alignItems: 'flex-start',
                                alignContent: 'flex-start',
                            }}
                        >
                            {playerSymbols.map((sym, idx) => {
                                const def = sym.definition;

                                return (
                                    <div
                                        key={`${sym.instanceId}-${idx}`}
                                        onMouseEnter={(e) => updateHoveredSymbol(def.id, def.type, e)}
                                        onMouseMove={(e) => updateHoveredSymbol(def.id, def.type, e)}
                                        onMouseLeave={() => setHoveredSymbol(null)}
                                        style={{
                                            width: metrics.cellWidth,
                                            height: metrics.cellHeight,
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'help',
                                        }}
                                    >
                                        {def.sprite && def.sprite !== '-' && def.sprite !== '-.png' ? (
                                            <img
                                                src={`${ASSET_BASE_URL}assets/symbols/${def.sprite}`}
                                                alt={t(`symbol.${def.key}.name`, language)}
                                                style={{
                                                    width: metrics.spriteSize,
                                                    height: metrics.spriteSize,
                                                    objectFit: 'contain',
                                                    imageRendering: 'pixelated',
                                                }}
                                            />
                                        ) : (
                                            <div style={{ fontSize: 18, opacity: 0.6, fontFamily: 'Mulmaru, sans-serif' }}>
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

