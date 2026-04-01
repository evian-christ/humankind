import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { BARBARIAN_CAMP_SPAWN_INTERVAL, getSymbolColorHex, SymbolType } from '../game/data/symbolDefinitions';
import { t } from '../i18n';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { EffectText } from './EffectText';

const ASSET_BASE_URL = import.meta.env.BASE_URL;
const BASE_W = 1920;
const BASE_H = 1080;
const BOARD_SCALE = 0.8;
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
    const cellWidth = 213 * scale * BOARD_SCALE;
    const cellHeight = 204 * scale * BOARD_SCALE;
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
                            cursor: 'pointer',
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

                                const showCounter =
                                    sym.effect_counter > 0 && def.type !== SymbolType.ENEMY && def.base_hp === undefined;
                                const showAtk = def.base_attack !== undefined && def.base_attack > 0;
                                const showHp = def.base_hp !== undefined && def.base_hp > 0;
                                const hpValue = sym.enemy_hp ?? def.base_hp;
                                const showCampCounter = def.id === 40;
                                const showMerchantStoredGold = def.id === 22 && (sym.stored_gold ?? 0) > 0;

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
                                                alt={t(`symbol.${def.id}.name`, language)}
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

                                        {showCounter && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    right: 2,
                                                    bottom: 4,
                                                    fontSize: 14,
                                                    fontFamily: 'Mulmaru, sans-serif',
                                                    lineHeight: 1,
                                                    color: '#8b7355',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {sym.effect_counter}
                                            </div>
                                        )}

                                        {showMerchantStoredGold && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    right: 2,
                                                    bottom: 4,
                                                    fontSize: 14,
                                                    fontFamily: 'Mulmaru, sans-serif',
                                                    lineHeight: 1,
                                                    color: '#fbbf24',
                                                    fontWeight: 800,
                                                }}
                                            >
                                                {sym.stored_gold}
                                            </div>
                                        )}

                                        {showAtk && (
                                            <>
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        left: 8,
                                                        bottom: 6,
                                                        fontSize: 18,
                                                        fontFamily: 'Mulmaru, sans-serif',
                                                        color: '#ff8c42',
                                                        opacity: 0.55,
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    ⚔
                                                </div>
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        left: 28,
                                                        bottom: 6,
                                                        fontSize: 14,
                                                        fontFamily: 'Mulmaru, sans-serif',
                                                        lineHeight: 1,
                                                        color: '#ffffff',
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    {def.base_attack}
                                                </div>
                                            </>
                                        )}

                                        {showHp && (
                                            <>
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        right: 6,
                                                        bottom: 6,
                                                        fontSize: 18,
                                                        fontFamily: 'Mulmaru, sans-serif',
                                                        color: '#4ade80',
                                                        opacity: 0.55,
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    ♥
                                                </div>
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        right: 24,
                                                        bottom: 6,
                                                        fontSize: 14,
                                                        fontFamily: 'Mulmaru, sans-serif',
                                                        lineHeight: 1,
                                                        color: '#ffffff',
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    {hpValue}
                                                </div>
                                            </>
                                        )}

                                        {showCampCounter && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: 28,
                                                    bottom: 6,
                                                    fontSize: 14,
                                                    fontFamily: 'Mulmaru, sans-serif',
                                                    lineHeight: 1,
                                                    color: '#8b7355',
                                                    fontWeight: 800,
                                                }}
                                            >
                                                {BARBARIAN_CAMP_SPAWN_INTERVAL - sym.effect_counter}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {hoveredSymbol && (
                    <div className="symbol-tooltip" style={getTooltipStyle(hoveredSymbol)}>
                        <div className="symbol-tooltip-name">{t(`symbol.${hoveredSymbol.symbolId}.name`, language)}</div>
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
                            {t(`symbol.${hoveredSymbol.symbolId}.desc`, language).split('\n').map((line, i) => (
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

