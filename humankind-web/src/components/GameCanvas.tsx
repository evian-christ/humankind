import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { getSymbolColorHex, SymbolType } from '../game/data/symbolDefinitions';
import { t } from '../i18n';
import type { HoveredSymbol, HoveredRelic, HoveredUpgrade } from './canvas/types';
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

interface GameCanvasProps {
    /** 캔버스 초기화 및 에셋 로드 완료 시 호출 (본게임 페이드인용) */
    onReady?: () => void;
}

const GameCanvas = ({ onReady }: GameCanvasProps) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PixiGameApp | null>(null);
    const onReadyRef = useRef<GameCanvasProps['onReady']>(onReady);
    const [hoveredSymbol, setHoveredSymbol] = useState<HoveredSymbol | null>(null);
    const [hoveredRelic, setHoveredRelic] = useState<HoveredRelic | null>(null);
    const [hoveredUpgrade, setHoveredUpgrade] = useState<HoveredUpgrade | null>(null);
    const language = useSettingsStore((s) => s.language);

    const setHoveredSymbolStable = useCallback((val: HoveredSymbol | null) => {
        setHoveredSymbol(val);
    }, []);

    const setHoveredRelicStable = useCallback((val: HoveredRelic | null) => {
        setHoveredRelic(val);
    }, []);

    const setHoveredUpgradeStable = useCallback((val: HoveredUpgrade | null) => {
        setHoveredUpgrade(val);
    }, []);

    // onReady는 App에서 매 렌더마다 새 함수가 들어올 수 있으므로 ref로 고정해둠
    useEffect(() => {
        onReadyRef.current = onReady;
    }, [onReady]);

    // 1. Initialize PixiGameApp
    useEffect(() => {
        if (!canvasRef.current) return;

        let destroyed = false;
        const app = new PixiGameApp(canvasRef.current, setHoveredSymbolStable, setHoveredRelicStable, setHoveredUpgradeStable);
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
            onReadyRef.current?.();
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
    }, [setHoveredSymbolStable, setHoveredRelicStable, setHoveredUpgradeStable]);

    // 2. Subscribe to store changes
    useEffect(() => {
        // PixiGameApp.renderBoard는 내부적으로 컨테이너/스프라이트를 대량 재생성합니다.
        // 따라서 Zustand의 "어떤 상태든 변경되면" 바로 renderBoard를 호출하면
        // 스핀/처리 중 깜빡임 + WebGL context loss로 이어질 수 있어, 시각적으로 필요한 변경만 렌더합니다.
        const initial = useGameStore.getState();
        let prev = {
            phase: initial.phase,
            food: initial.food,
            gold: initial.gold,
            knowledge: initial.knowledge,
            level: initial.level,
            era: initial.era,
            turn: initial.turn,
            board: initial.board,
            prevBoard: initial.prevBoard,
            activeSlot: initial.activeSlot,
            activeContributors: initial.activeContributors,
            effectPhase: initial.effectPhase,
            effectPhase3ReachedThisRun: initial.effectPhase3ReachedThisRun,
            runningTotals: initial.runningTotals,
            lastEffects: initial.lastEffects,
            combatAnimation: initial.combatAnimation,
            combatShaking: initial.combatShaking,
            pendingNewThreatFloats: initial.pendingNewThreatFloats,
        };

        const unsub1 = useGameStore.subscribe((state) => {
            if (!appRef.current) return;

            const needs =
                state.phase !== prev.phase ||
                state.food !== prev.food ||
                state.gold !== prev.gold ||
                state.knowledge !== prev.knowledge ||
                state.level !== prev.level ||
                state.era !== prev.era ||
                state.turn !== prev.turn ||
                state.board !== prev.board ||
                state.prevBoard !== prev.prevBoard ||
                state.activeSlot !== prev.activeSlot ||
                state.activeContributors !== prev.activeContributors ||
                state.effectPhase !== prev.effectPhase ||
                state.effectPhase3ReachedThisRun !== prev.effectPhase3ReachedThisRun ||
                state.runningTotals !== prev.runningTotals ||
                state.lastEffects !== prev.lastEffects ||
                state.combatAnimation !== prev.combatAnimation ||
                state.combatShaking !== prev.combatShaking ||
                state.pendingNewThreatFloats !== prev.pendingNewThreatFloats;

            if (!needs) return;

            prev = {
                phase: state.phase,
                food: state.food,
                gold: state.gold,
                knowledge: state.knowledge,
                level: state.level,
                era: state.era,
                turn: state.turn,
                board: state.board,
                prevBoard: state.prevBoard,
                activeSlot: state.activeSlot,
                activeContributors: state.activeContributors,
                effectPhase: state.effectPhase,
                effectPhase3ReachedThisRun: state.effectPhase3ReachedThisRun,
                runningTotals: state.runningTotals,
                lastEffects: state.lastEffects,
                combatAnimation: state.combatAnimation,
                combatShaking: state.combatShaking,
                pendingNewThreatFloats: state.pendingNewThreatFloats,
            };

            appRef.current.renderBoard(state, useSettingsStore.getState());
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
    const TOOLTIP_W = 280;
    const TOOLTIP_H = 180;
    const TOOLTIP_MARGIN = 12;

    const getTooltipStyle = (hoveredItem: { screenX: number; screenY: number } | null): React.CSSProperties => {
        if (!hoveredItem) return { display: 'none' };
        let left = hoveredItem.screenX + TOOLTIP_MARGIN;
        let top = hoveredItem.screenY;
        if (left + TOOLTIP_W > 1920) left = hoveredItem.screenX - TOOLTIP_W - TOOLTIP_MARGIN;
        if (top + TOOLTIP_H > 1080) top = 1080 - TOOLTIP_H - TOOLTIP_MARGIN;
        if (top < 0) top = 0;
        return { left: `${left}px`, top: `${top}px` };
    };

    /** 유물 툴팁: 해당 유물 아이콘 우측에 고정 표시 */
    const getRelicTooltipStyle = (hoveredItem: { screenX: number; screenY: number } | null): React.CSSProperties => {
        if (!hoveredItem) return { display: 'none' };
        const left = hoveredItem.screenX + TOOLTIP_MARGIN;
        let top = hoveredItem.screenY;
        if (top + TOOLTIP_H > 1080) top = 1080 - TOOLTIP_H - TOOLTIP_MARGIN;
        if (top < 0) top = 0;
        return { left: `${left}px`, top: `${top}px` };
    };

    /** 지식 업그레이드 툴팁: 해당 스프라이트 좌측에 고정 표시 */
    const getUpgradeTooltipStyle = (hoveredItem: { screenX: number; screenY: number } | null): React.CSSProperties => {
        if (!hoveredItem) return { display: 'none' };
        const left = hoveredItem.screenX - TOOLTIP_W - TOOLTIP_MARGIN;
        let top = hoveredItem.screenY;
        if (top + TOOLTIP_H > 1080) top = 1080 - TOOLTIP_H - TOOLTIP_MARGIN;
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
                    <div className="symbol-tooltip" style={{ ...getRelicTooltipStyle(hoveredRelic), display: 'flex', flexDirection: 'column' }}>
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

            {hoveredUpgrade && (
                <div className="symbol-tooltip" style={{ ...getUpgradeTooltipStyle(hoveredUpgrade), display: 'flex', flexDirection: 'column' }}>
                    <div className="symbol-tooltip-name" style={{ color: '#93c5fd' }}>{t(`knowledgeUpgrade.${hoveredUpgrade.upgrade.id}.name`, language)}</div>
                    <div className="symbol-tooltip-desc">
                        {t(`knowledgeUpgrade.${hoveredUpgrade.upgrade.id}.desc`, language).split('\n').map((line: string, i: number) => (
                            <div key={i} className="symbol-tooltip-desc-line"><EffectText text={line} /></div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameCanvas;
