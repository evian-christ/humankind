import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../game/state/gameStore';
import { getHudTurnStartPassiveTotals } from '../game/state/gameCalculations';
import { useSettingsStore } from '../game/state/settingsStore';
import { getSymbolColorHex, SymbolType } from '../game/data/symbolDefinitions';
import { KNOWLEDGE_UPGRADES } from '../game/data/knowledgeUpgrades';
import { getBoardSymbolTooltipDesc, t } from '../i18n';
import type { HoveredSymbol, HoveredStatus, HoveredUpgrade, HoveredHudStat } from './canvas/types';
import { PixiGameApp } from './canvas/PixiGameApp';
import { EffectText } from './EffectText';
import { FOOD_RESOURCE_ICON_URL, GOLD_RESOURCE_ICON_URL, KNOWLEDGE_RESOURCE_ICON_URL } from '../uiAssetUrls';

const ERA_NAME_KEYS: Record<number, string> = {
    [SymbolType.RELIGION]: 'era.special',
    [SymbolType.RESOURCE]: 'era.resource',
    [SymbolType.LUXURY]: 'era.luxury',
    [SymbolType.ANCIENT]: 'era.ancient',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
    [SymbolType.SPECIAL]: 'era.specialSymbol',
    [SymbolType.DISASTER]: 'era.disaster',
};

interface GameCanvasProps {
    /** 캔버스 초기화 및 에셋 로드 완료 시 호출 (본게임 페이드인용) */
    onReady?: () => void;
    /** 일시정지 메뉴·설정 등 오버레이가 열린 동안 보드 툴팁 비표시 */
    suppressBoardTooltips?: boolean;
}

const GameCanvas = ({ onReady, suppressBoardTooltips = false }: GameCanvasProps) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PixiGameApp | null>(null);
    const onReadyRef = useRef<GameCanvasProps['onReady']>(onReady);
    const suppressBoardTooltipsRef = useRef(suppressBoardTooltips);
    const [hoveredSymbol, setHoveredSymbol] = useState<HoveredSymbol | null>(null);
    const [hoveredStatus, setHoveredStatus] = useState<HoveredStatus | null>(null);
    const [hoveredUpgrade, setHoveredUpgrade] = useState<HoveredUpgrade | null>(null);
    const [hoveredHudStat, setHoveredHudStat] = useState<HoveredHudStat | null>(null);
    const language = useSettingsStore((s) => s.language);
    const unlockedKnowledgeUpgrades = useGameStore((s) => s.unlockedKnowledgeUpgrades ?? []);
    const naturalDisasterChance = useGameStore((s) => s.naturalDisasterThreat);

    suppressBoardTooltipsRef.current = suppressBoardTooltips;

    const setHoveredSymbolStable = useCallback((val: HoveredSymbol | null) => {
        if (suppressBoardTooltipsRef.current) return;
        setHoveredSymbol(val);
    }, []);

    const setHoveredStatusStable = useCallback((val: HoveredStatus | null) => {
        if (suppressBoardTooltipsRef.current) return;
        setHoveredStatus(val);
    }, []);

    const setHoveredUpgradeStable = useCallback((val: HoveredUpgrade | null) => {
        if (suppressBoardTooltipsRef.current) return;
        setHoveredUpgrade(val);
    }, []);

    const setHoveredHudStatStable = useCallback((val: HoveredHudStat | null) => {
        if (suppressBoardTooltipsRef.current) return;
        setHoveredHudStat(val);
    }, []);

    /** HUD 기본 생산 툴팁: 보드·업그레이드 변화 시 갱신 */
    useGameStore(
        useShallow((s) => ({
            board: s.board,
            unlockedKnowledgeUpgrades: s.unlockedKnowledgeUpgrades,
        })),
    );
    // onReady는 App에서 매 렌더마다 새 함수가 들어올 수 있으므로 ref로 고정해둠
    useEffect(() => {
        onReadyRef.current = onReady;
    }, [onReady]);

    // 1. Initialize PixiGameApp
    useEffect(() => {
        if (!canvasRef.current) return;

        let destroyed = false;
        const app = new PixiGameApp(
            canvasRef.current,
            setHoveredSymbolStable,
            setHoveredStatusStable,
            setHoveredUpgradeStable,
            setHoveredHudStatStable,
        );
        appRef.current = app;

        let resizeObserver: ResizeObserver;

        const init = async () => {
            if (destroyed) return;
            await app.init();
            if (destroyed) return;

            resizeObserver = new ResizeObserver((entries) => {
                if (!destroyed && appRef.current) {
                    if (entries[0] && entries[0].contentRect) {
                        const { width, height } = entries[0].contentRect;
                        appRef.current.resize(width, height);
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
    }, [setHoveredSymbolStable, setHoveredStatusStable, setHoveredUpgradeStable, setHoveredHudStatStable]);

    useEffect(() => {
        if (!suppressBoardTooltips) return;
        setHoveredSymbol(null);
        setHoveredStatus(null);
        setHoveredUpgrade(null);
        setHoveredHudStat(null);
        appRef.current?.clearHudHover();
    }, [suppressBoardTooltips]);

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
            pendingNewThreatFloats: initial.pendingNewThreatFloats,
            unlockedKnowledgeUpgrades: initial.unlockedKnowledgeUpgrades,
            naturalDisasterThreat: initial.naturalDisasterThreat,
            activeStatusIds: initial.activeStatusIds,
            activeStatuses: initial.activeStatuses,
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
                state.pendingNewThreatFloats !== prev.pendingNewThreatFloats ||
                state.unlockedKnowledgeUpgrades !== prev.unlockedKnowledgeUpgrades ||
                state.naturalDisasterThreat !== prev.naturalDisasterThreat ||
                state.activeStatusIds !== prev.activeStatusIds ||
                state.activeStatuses !== prev.activeStatuses;

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
                pendingNewThreatFloats: state.pendingNewThreatFloats,
                unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades,
                naturalDisasterThreat: state.naturalDisasterThreat,
                activeStatusIds: state.activeStatusIds,
                activeStatuses: state.activeStatuses,
            };

            appRef.current.renderBoard(state, useSettingsStore.getState());
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

    const getStatusTooltipStyle = (hoveredItem: { screenX: number; screenY: number } | null): React.CSSProperties => {
        if (!hoveredItem) return { display: 'none' };
        let left = hoveredItem.screenX;
        if (left + TOOLTIP_W > 1920) left = hoveredItem.screenX - TOOLTIP_W - TOOLTIP_MARGIN;
        const top = hoveredItem.screenY - TOOLTIP_MARGIN;
        if (top < TOOLTIP_MARGIN) {
            return { left: `${left}px`, top: `${hoveredItem.screenY + TOOLTIP_MARGIN}px` };
        }
        return { left: `${left}px`, top: `${top}px`, transform: 'translateY(-100%)' };
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

    /** HUD 기본 생산: 뷰포트 고정, 가로는 커서 기준 중앙, 세로는 커서 위 */
    const HUD_GAP_ABOVE_POINTER = 8;
    const getHudStatTooltipStyle = (hoveredItem: { clientX: number; clientY: number } | null): React.CSSProperties => {
        if (!hoveredItem) return { display: 'none' };
        return {
            position: 'fixed',
            left: hoveredItem.clientX,
            top: hoveredItem.clientY,
            transform: `translate(-50%, calc(-100% - ${HUD_GAP_ABOVE_POINTER}px))`,
            whiteSpace: 'nowrap',
            zIndex: 400,
        };
    };

    const showBoardTooltips = !suppressBoardTooltips;

    const hudPassiveTotals = hoveredHudStat ? getHudTurnStartPassiveTotals(useGameStore.getState()) : null;
    const hudStatTooltip = showBoardTooltips && hoveredHudStat && hudPassiveTotals && (() => {
        const n =
            hoveredHudStat.kind === 'knowledge'
                ? hudPassiveTotals.knowledge
                : hoveredHudStat.kind === 'food'
                  ? hudPassiveTotals.food
                  : hudPassiveTotals.gold;
        const line = t('game.hudBaseProductionShort', language).replace('{n}', String(n));
        return (
            <div className="hud-stat-tooltip" style={getHudStatTooltipStyle(hoveredHudStat)}>
                <div className="hud-stat-tooltip-inner">
                    {hoveredHudStat.kind === 'food' ? (
                        <img
                            src={FOOD_RESOURCE_ICON_URL}
                            alt=""
                            width={40}
                            height={40}
                            style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                        />
                    ) : hoveredHudStat.kind === 'gold' ? (
                        <img
                            src={GOLD_RESOURCE_ICON_URL}
                            alt=""
                            width={40}
                            height={40}
                            style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                        />
                    ) : (
                        <img
                            src={KNOWLEDGE_RESOURCE_ICON_URL}
                            alt=""
                            width={40}
                            height={40}
                            style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                        />
                    )}
                    <span style={{ color: '#e5e5e5' }}>{line}</span>
                </div>
            </div>
        );
    })();

    return (
        <>
        <div ref={canvasRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            {showBoardTooltips && hoveredSymbol && (
                <div className="symbol-tooltip" style={getTooltipStyle(hoveredSymbol)}>
                    <div className="symbol-tooltip-name">{t(`symbol.${hoveredSymbol.definition.key}.name`, language)}</div>
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
                        {getBoardSymbolTooltipDesc(hoveredSymbol.definition.key, language, unlockedKnowledgeUpgrades)
                            .split('\n')
                            .map((line, i) => (
                                <div key={i} className="symbol-tooltip-desc-line">
                                    <EffectText text={line} />
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {showBoardTooltips && hoveredStatus && (
                <div className="symbol-tooltip" style={{ ...getStatusTooltipStyle(hoveredStatus), display: 'flex', flexDirection: 'column' }}>
                    <div className="symbol-tooltip-name" style={{ color: '#fde68a' }}>
                        {t(`status.${hoveredStatus.status.key}.name`, language)}
                    </div>
                    <div className="symbol-tooltip-desc">
                        {t(`status.${hoveredStatus.status.key}.desc`, language)
                            .split('\n')
                            .map((line: string, i: number) => (
                                <div key={i} className="symbol-tooltip-desc-line"><EffectText text={line} /></div>
                            ))}
                        {hoveredStatus.status.badge === 'naturalDisasterChance' && (
                            <div className="symbol-tooltip-desc-line">
                                {t('status.currentChance', language).replace('{chance}', String(naturalDisasterChance))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showBoardTooltips && hoveredUpgrade && (
                <div className="symbol-tooltip" style={{ ...getUpgradeTooltipStyle(hoveredUpgrade), display: 'flex', flexDirection: 'column' }}>
                    <div className="symbol-tooltip-name" style={{ color: '#93c5fd' }}>{t(`knowledgeUpgrade.${hoveredUpgrade.upgrade.id}.name`, language)}</div>
                    {(() => {
                        const def = KNOWLEDGE_UPGRADES[hoveredUpgrade.upgrade.id];
                        if (!def) return null;

                        const eraLabel = t(ERA_NAME_KEYS[def.type] ?? 'era.ancient', language);
                        const eraColor = getSymbolColorHex(def.type);
                        return (
                            <div
                                className="symbol-tooltip-effect"
                                style={{
                                    marginTop: '8px',
                                    color: eraColor,
                                    fontWeight: 'bold',
                                    fontSize: '15px',
                                    textShadow: `0 0 6px ${eraColor}80`,
                                }}
                            >
                                [{eraLabel}]
                            </div>
                        );
                    })()}
                    <div className="symbol-tooltip-desc">
                        {t(`knowledgeUpgrade.${hoveredUpgrade.upgrade.id}.desc`, language).split('\n').map((line: string, i: number) => (
                            <div key={i} className="symbol-tooltip-desc-line"><EffectText text={line} /></div>
                        ))}
                    </div>
                </div>
            )}
        </div>
        {hudStatTooltip && typeof document !== 'undefined'
            ? createPortal(hudStatTooltip, document.body)
            : null}
        </>
    );
};

export default GameCanvas;
