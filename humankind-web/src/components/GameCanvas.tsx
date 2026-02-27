import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { Era, getSymbolColorHex } from '../game/data/symbolDefinitions';
import { t } from '../i18n';
import type { HoveredSymbol } from './canvas/types';
import { PixiGameApp } from './canvas/PixiGameApp';
import { EffectText } from './EffectText';

const ERA_NAME_KEYS: Record<number, string> = {
    [Era.SPECIAL]: 'era.special',
    [Era.ANCIENT]: 'era.ancient',
    [Era.CLASSICAL]: 'era.classical',
    [Era.MEDIEVAL]: 'era.medieval',
    [Era.INDUSTRIAL]: 'era.industrial',
    [Era.MODERN]: 'era.modern',
};

const GameCanvas = () => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PixiGameApp | null>(null);
    const [hoveredSymbol, setHoveredSymbol] = useState<HoveredSymbol | null>(null);
    const language = useSettingsStore((s) => s.language);

    const setHoveredSymbolStable = useCallback((val: HoveredSymbol | null) => {
        setHoveredSymbol(val);
    }, []);

    // 1. Initialize PixiGameApp
    useEffect(() => {
        if (!canvasRef.current) return;

        let destroyed = false;
        const app = new PixiGameApp(canvasRef.current, setHoveredSymbolStable);
        appRef.current = app;

        let resizeObserver: ResizeObserver;

        const init = async () => {
            if (destroyed) return;
            await app.init();
            if (destroyed) return;

            resizeObserver = new ResizeObserver(() => {
                if (!destroyed && appRef.current) {
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

        return () => {
            unsub1();
            unsub2();
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

    // 4. Tooltip positioning
    const getTooltipStyle = (): React.CSSProperties => {
        if (!hoveredSymbol) return { display: 'none' };
        const tooltipW = 280;
        const tooltipH = 180;
        const margin = 12;
        let left = hoveredSymbol.screenX + margin;
        let top = hoveredSymbol.screenY;

        if (left + tooltipW > 1920) left = hoveredSymbol.screenX - tooltipW - margin;
        if (top + tooltipH > 1080) top = 1080 - tooltipH - margin;
        if (top < 0) top = 0;

        return { left: `${left}px`, top: `${top}px` };
    };

    return (
        <div ref={canvasRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            {hoveredSymbol && (
                <div className="symbol-tooltip" style={getTooltipStyle()}>
                    <div className="symbol-tooltip-name">{t(`symbol.${hoveredSymbol.definition.id}.name`, language)}</div>
                    <div className="symbol-tooltip-rarity" style={{
                        color: getSymbolColorHex(hoveredSymbol.definition.era),
                        fontWeight: 'bold',
                        fontSize: '18px',
                        letterSpacing: '2px',
                        textShadow: `0 0 10px ${getSymbolColorHex(hoveredSymbol.definition.era)}80`,
                    }}>
                        {t(ERA_NAME_KEYS[hoveredSymbol.definition.era] ?? 'era.ancient', language)}
                    </div>
                    <div className="symbol-tooltip-desc">
                        {t(`symbol.${hoveredSymbol.definition.id}.desc`, language).split('\n').map((line, i) => (
                            <div key={i} className="symbol-tooltip-desc-line"><EffectText text={line} /></div>
                        ))}
                        {hoveredSymbol.enemy_effect_id && (
                            <div className="symbol-tooltip-effect">
                                ▸ <EffectText text={t(`enemyEffect.${hoveredSymbol.enemy_effect_id}.desc`, language)} />
                            </div>
                        )}
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
        </div>
    );
};

export default GameCanvas;
