import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { getSymbolColorHex, SymbolType } from '../game/data/symbolDefinitions';
import { t } from '../i18n';
import type { HoveredSymbol, HoveredRelic } from './canvas/types';
import { PixiGameApp } from './canvas/PixiGameApp';
import { EffectText } from './EffectText';
import { useRelicStore } from '../game/state/relicStore';

const ERA_NAME_KEYS: Record<number, string> = {
    [SymbolType.RELIGION]: 'era.special',
    [SymbolType.NORMAL]: 'era.normal',
    [SymbolType.ANCIENT]: 'era.ancient',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
};

const GameCanvas = () => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PixiGameApp | null>(null);
    const [hoveredSymbol, setHoveredSymbol] = useState<HoveredSymbol | null>(null);
    const [hoveredRelic, setHoveredRelic] = useState<HoveredRelic | null>(null);
    const language = useSettingsStore((s) => s.language);

    const setHoveredSymbolStable = useCallback((val: HoveredSymbol | null) => {
        setHoveredSymbol(val);
    }, []);

    const setHoveredRelicStable = useCallback((val: HoveredRelic | null) => {
        setHoveredRelic(val);
    }, []);

    // 1. Initialize PixiGameApp
    useEffect(() => {
        if (!canvasRef.current) return;

        let destroyed = false;
        const app = new PixiGameApp(canvasRef.current, setHoveredSymbolStable, setHoveredRelicStable);
        appRef.current = app;

        let resizeObserver: ResizeObserver;

        const init = async () => {
            if (destroyed) return;
            await app.init();
            if (destroyed) return;

            resizeObserver = new ResizeObserver((entries) => {
                if (!destroyed && appRef.current) {
                    if (entries[0] && entries[0].contentRect) {
                        appRef.current.resize(entries[0].contentRect.width, entries[0].contentRect.height);
                    }
                    appRef.current.renderBoard(useGameStore.getState(), useSettingsStore.getState());
                }
            });
            if (canvasRef.current) {
                resizeObserver.observe(canvasRef.current);
            }

            if (!destroyed && appRef.current) {
                appRef.current.renderBoard(useGameStore.getState(), useSettingsStore.getState());
            }
        };

        init();

        return () => {
            destroyed = true;
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            if (appRef.current) {
                appRef.current.destroy();
                appRef.current = null;
            }
        };
    }, [setHoveredSymbolStable]);

    // 2. Subscribe to store changes
    useEffect(() => {
        const unsub1 = useGameStore.subscribe((state) => {
            if (appRef.current) {
                appRef.current.renderBoard(state, useSettingsStore.getState());
            }
        });
        const unsub2 = useSettingsStore.subscribe((settings) => {
            if (appRef.current) {
                appRef.current.renderBoard(useGameStore.getState(), settings);
            }
        });
        const unsub3 = useRelicStore.subscribe(() => {
            if (appRef.current) {
                appRef.current.renderBoard(useGameStore.getState(), useSettingsStore.getState());
            }
        });

        return () => {
            unsub1();
            unsub2();
            unsub3();
        };
    }, []);

    // 3. Combat animation
    useEffect(() => {
        let prev = useGameStore.getState().combatAnimation;
        const unsub = useGameStore.subscribe((state) => {
            if (state.combatAnimation !== prev) {
                prev = state.combatAnimation;
                if (state.combatAnimation && appRef.current) {
                    appRef.current.triggerCombatAnimation(state.combatAnimation);
                }
            }
        });
        return () => unsub();
    }, []);

    // 5. Tooltip positioning

    const getTooltipStyle = (hoveredItem: { screenX: number; screenY: number } | null): React.CSSProperties => {
        if (!hoveredItem) return { display: 'none' };
        const tooltipW = 280;
        const tooltipH = 180;
        const margin = 12;
        let left = hoveredItem.screenX + margin;
        let top = hoveredItem.screenY;

        if (left + tooltipW > 1920) left = hoveredItem.screenX - tooltipW - margin;
        if (top + tooltipH > 1080) top = 1080 - tooltipH - margin;
        if (top < 0) top = 0;

        return { left: `${left}px`, top: `${top}px` };
    };

    return (
        <div ref={canvasRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            {hoveredSymbol && (
                <div className="symbol-tooltip" style={getTooltipStyle(hoveredSymbol)}>
                    <div className="symbol-tooltip-name">{t(`symbol.${hoveredSymbol.definition.id}.name`, language)}</div>
                    <div className="symbol-tooltip-rarity" style={{
                        color: getSymbolColorHex(hoveredSymbol.definition.type),
                        fontWeight: 'bold',
                        fontSize: '18px',
                        letterSpacing: '2px',
                        textShadow: `0 0 10px ${getSymbolColorHex(hoveredSymbol.definition.type)}80`,
                    }}>
                        {t(ERA_NAME_KEYS[hoveredSymbol.definition.type] ?? 'era.ancient', language)}
                    </div>
                    <div className="symbol-tooltip-desc">
                        {t(`symbol.${hoveredSymbol.definition.id}.desc`, language).split('\n').map((line, i) => (
                            <div key={i} className="symbol-tooltip-desc-line"><EffectText text={line} /></div>
                        ))}
                    </div>
                    {hoveredSymbol.definition.tags && hoveredSymbol.definition.tags.length > 0 && (
                        <div className="symbol-tooltip-tags" style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                            {hoveredSymbol.definition.tags.map(tag => (
                                <span key={tag} style={{ background: 'rgba(55, 65, 81, 0.9)', padding: '4px 10px', borderRadius: '6px', fontSize: '15px', color: '#e5e7eb', border: '1px solid #4b5563', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                    {t(`tag.${tag}`, language)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {hoveredRelic && (() => {
                const info = hoveredRelic.relicInfo;
                const counterMax = (info.definition.id === 3 || info.definition.id === 9) ? 5 : 0;
                return (
                    <div className="symbol-tooltip" style={{ ...getTooltipStyle(hoveredRelic), display: 'flex', flexDirection: 'column' }}>
                        <div className="symbol-tooltip-name" style={{ color: '#dcfce7' }}>{t(`relic.${info.definition.id}.name`, language)}</div>
                        <div className="symbol-tooltip-desc">
                            {t(`relic.${info.definition.id}.desc`, language).split('\n').map((line: string, i: number) => (
                                <div key={i} className="symbol-tooltip-desc-line"><EffectText text={line} /></div>
                            ))}
                        </div>
                        {counterMax > 0 && (
                            <div className="symbol-tooltip-effect" style={{ marginTop: '8px', color: '#f5bd56' }}>
                                {info.effect_counter} / {counterMax}
                            </div>
                        )}
                        {info.bonus_stacks > 0 && (
                            <div className="symbol-tooltip-effect" style={{ marginTop: '8px', color: '#4ade80' }}>
                                +{info.bonus_stacks} Bonus
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
};

export default GameCanvas;
