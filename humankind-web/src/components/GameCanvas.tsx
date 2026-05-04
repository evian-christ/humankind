import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../game/state/gameStore';
import { getHudTurnStartPassiveTotals } from '../game/state/gameCalculations';
import { useSettingsStore } from '../game/state/settingsStore';
import { getSymbolColorHex, SymbolType } from '../game/data/symbolDefinitions';
import { KNOWLEDGE_UPGRADES } from '../game/data/knowledgeUpgrades';
import { getBoardSymbolTooltipDesc, t } from '../i18n';
import type { HoveredSymbol, HoveredRelic, HoveredUpgrade, HoveredHudStat } from './canvas/types';
import { PixiGameApp } from './canvas/PixiGameApp';
import { EffectText } from './EffectText';
import { useRelicStore } from '../game/state/relicStore';
import { FOOD_RESOURCE_ICON_URL, GOLD_RESOURCE_ICON_URL, KNOWLEDGE_RESOURCE_ICON_URL } from '../uiAssetUrls';

const ERA_NAME_KEYS: Record<number, string> = {
    [SymbolType.RELIGION]: 'era.special',
    [SymbolType.NORMAL]: 'era.normal',
    [SymbolType.ANCIENT]: 'era.ancient',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
    [SymbolType.SPECIAL]: 'era.specialSymbol',
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
    const [hoveredRelic, setHoveredRelic] = useState<HoveredRelic | null>(null);
    const [hoveredUpgrade, setHoveredUpgrade] = useState<HoveredUpgrade | null>(null);
    const [hoveredHudStat, setHoveredHudStat] = useState<HoveredHudStat | null>(null);
    const language = useSettingsStore((s) => s.language);
    const unlockedKnowledgeUpgrades = useGameStore((s) => s.unlockedKnowledgeUpgrades ?? []);

    suppressBoardTooltipsRef.current = suppressBoardTooltips;

    const setHoveredSymbolStable = useCallback((val: HoveredSymbol | null) => {
        if (suppressBoardTooltipsRef.current) return;
        setHoveredSymbol(val);
    }, []);

    const setHoveredRelicStable = useCallback((val: HoveredRelic | null) => {
        if (suppressBoardTooltipsRef.current) return;
        setHoveredRelic(val);
    }, []);

    const setHoveredUpgradeStable = useCallback((val: HoveredUpgrade | null) => {
        if (suppressBoardTooltipsRef.current) return;
        setHoveredUpgrade(val);
    }, []);

    const setHoveredHudStatStable = useCallback((val: HoveredHudStat | null) => {
        if (suppressBoardTooltipsRef.current) return;
        setHoveredHudStat(val);
    }, []);

    /** HUD 기본 생산 툴팁: 보드·업그레이드·보너스XP·유물 개수 변화 시 갱신 */
    useGameStore(
        useShallow((s) => ({
            board: s.board,
            unlockedKnowledgeUpgrades: s.unlockedKnowledgeUpgrades,
            bonusXpPerTurn: s.bonusXpPerTurn,
        })),
    );
    useRelicStore((s) => s.relics.length); // 유물 금고(람세스) 지식 반영

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
            setHoveredRelicStable,
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
    }, [setHoveredSymbolStable, setHoveredRelicStable, setHoveredUpgradeStable, setHoveredHudStatStable]);

    useEffect(() => {
        if (!suppressBoardTooltips) return;
        setHoveredSymbol(null);
        setHoveredRelic(null);
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
            combatAnimation: initial.combatAnimation,
            combatShaking: initial.combatShaking,
            pendingNewThreatFloats: initial.pendingNewThreatFloats,
            unlockedKnowledgeUpgrades: initial.unlockedKnowledgeUpgrades,
            bonusXpPerTurn: initial.bonusXpPerTurn,
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
                state.pendingNewThreatFloats !== prev.pendingNewThreatFloats ||
                state.unlockedKnowledgeUpgrades !== prev.unlockedKnowledgeUpgrades ||
                state.bonusXpPerTurn !== prev.bonusXpPerTurn;

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
                unlockedKnowledgeUpgrades: state.unlockedKnowledgeUpgrades,
                bonusXpPerTurn: state.bonusXpPerTurn,
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

            {showBoardTooltips && hoveredRelic && (() => {
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

            {showBoardTooltips && hoveredUpgrade && (
                <div className="symbol-tooltip" style={{ ...getUpgradeTooltipStyle(hoveredUpgrade), display: 'flex', flexDirection: 'column' }}>
                    <div className="symbol-tooltip-name" style={{ color: '#93c5fd' }}>{t(`knowledgeUpgrade.${hoveredUpgrade.upgrade.id}.name`, language)}</div>
                    {(() => {
                        const def = KNOWLEDGE_UPGRADES[hoveredUpgrade.upgrade.id];
                        if (!def) return null;

                        if (typeof def.type === 'number') {
                            const eraLabel = t(ERA_NAME_KEYS[def.type as SymbolType] ?? 'era.ancient', language);
                            const eraColor = getSymbolColorHex(def.type as SymbolType);
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
                        }

                        const leaderLabel = t(`leader.${def.type}.name`, language);
                        const leaderColor =
                            def.type === 'ramesses' ? '#f59e0b' : def.type === 'shihuang' ? '#dc2626' : '#60a5fa';
                        return (
                            <div
                                className="symbol-tooltip-effect"
                                style={{
                                    marginTop: '8px',
                                    color: leaderColor,
                                    fontWeight: 'bold',
                                    fontSize: '15px',
                                    textShadow: `0 0 6px ${leaderColor}80`,
                                }}
                            >
                                [{leaderLabel}]
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
