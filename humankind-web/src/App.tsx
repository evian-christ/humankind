import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGameStore } from './game/state/gameStore';
import { useBoardTooltipBlockStore } from './game/state/boardTooltipBlockStore';
import { useSettingsStore } from './game/state/settingsStore';
import { usePreGameStore } from './game/state/preGameStore';
import { t } from './i18n';
import GameCanvas from './components/GameCanvas';
import SymbolSelection from './components/SymbolSelection';
import RelicSelection from './components/RelicSelection';
import DestroySelection from './components/DestroySelection';
import OblivionFurnaceBoardOverlay from './components/OblivionFurnaceBoardOverlay';
import DemoStartScreen from './components/DemoStartScreen';
import StageSelectScreen from './components/StageSelectScreen';
import LeaderSelectScreen from './components/LeaderSelectScreen';

import PauseMenu from './components/PauseMenu';
import DevOverlay from './components/DevOverlay';
import DataBrowser from './components/DataBrowser';
import SymbolPoolModal from './components/SymbolPoolModal';
import OwnedSymbolsModal from './components/OwnedSymbolsModal';
import EffectLogOverlay from './components/EffectLogOverlay';
import KnowledgeUpgradesOverlay from './components/KnowledgeUpgradesOverlay';
import { calculateFoodCost, getHudTurnStartPassiveTotals } from './game/state/gameStore';
import { FOOD_RESOURCE_ICON_URL, GOLD_RESOURCE_ICON_URL, KNOWLEDGE_RESOURCE_ICON_URL, RELIC_PANEL_TITLE_ICON_URL } from './uiAssetUrls';

const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    const onHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isPointer = target.closest('button, [role="button"], .cursor-pointer, a') !== null;
      
      if (cursorRef.current) {
        cursorRef.current.style.display = 'block';
        if (isPointer) cursorRef.current.classList.add('is-pointer');
        else cursorRef.current.classList.remove('is-pointer');

        const rect = root.getBoundingClientRect();
        const scale = rect.width / root.clientWidth;
        const vx = (e.clientX - rect.left) / scale;
        const vy = (e.clientY - rect.top) / scale;
        cursorRef.current.style.transform = `translate(${vx}px, ${vy}px)`;
      }
    };

    const onLeave = () => {
      if (cursorRef.current) cursorRef.current.style.display = 'none';
    };

    window.addEventListener('mousemove', onHover);
    window.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget) onLeave();
    });
    
    return () => {
      window.removeEventListener('mousemove', onHover);
    };
  }, []);

  return <div ref={cursorRef} className="custom-mouse-cursor" />;
};


const ERA_NAME_KEYS: Record<number, string> = {
  1: 'era.ancient',
  2: 'era.medieval',
  3: 'era.modern',
};

function App() {
  const preGameScreen = usePreGameStore((s) => s.screen);
  const returnToStageSelect = usePreGameStore((s) => s.returnToStageSelect);
  const {
    phase,
    turn,
    spinBoard,
    toggleRelicShop,
    isRelicShopOpen,
    hasNewRelicShopStock,
    clearRelicShopStockBadge,
    levelUpResearchPoints,
  } = useGameStore();
  const fullscreenModalBlocksBoardTooltips = useBoardTooltipBlockStore((s) => s.ids.length > 0);
  const language = useSettingsStore((s) => s.language);
  const { resolutionWidth, resolutionHeight, setResolution } = useSettingsStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ownedSymbolsOpen, setOwnedSymbolsOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);
  const isInGame = preGameScreen === null;
  const [gameCanvasReady, setGameCanvasReady] = useState(false);
  const [hoveredStat, setHoveredStat] = useState<'knowledge' | 'food' | 'gold' | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const handleCanvasReady = useCallback(() => {
    setGameCanvasReady(true);
  }, []);

  // 본게임 벗어나면 캔버스 준비 플래그 리셋 (다음 진입 시 검은 화면 → 로드 후 페이드)
  useEffect(() => {
    if (preGameScreen !== null) setGameCanvasReady(false);
  }, [preGameScreen]);

  // 앱 최초 로드 시 저장된 해상도를 DOM에 적용
  useEffect(() => {
    setResolution(resolutionWidth, resolutionHeight);
  }, []);

  useEffect(() => {
    if (isRelicShopOpen && hasNewRelicShopStock) {
      clearRelicShopStockBadge();
    }
  }, [isRelicShopOpen, hasNewRelicShopStock, clearRelicShopStockBadge]);

  // 스페이스바로 스핀 (idle + 연구 포인트 없음, 입력 필드 포커스 시 무시)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const st = useGameStore.getState();
      const rp = st.levelUpResearchPoints ?? 0;
      const canSpin = st.phase === 'idle' && rp === 0;
      if (!canSpin) return;
      e.preventDefault();
      spinBoard();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, spinBoard, levelUpResearchPoints]);

  const boardIsForegroundForTooltips =
    phase !== 'destroy_selection' &&
    phase !== 'oblivion_furnace_board' &&
    phase !== 'game_over' &&
    phase !== 'victory' &&
    !isRelicShopOpen;

  const suppressBoardTooltips = !boardIsForegroundForTooltips || fullscreenModalBlocksBoardTooltips;

  const knowledge = useGameStore((s) => s.knowledge);
  const level = useGameStore((s) => s.level);
  const food = useGameStore((s) => s.food);
  const gold = useGameStore((s) => s.gold);
  const stageId = useGameStore((s) => s.stageId);
  const era = useGameStore((s) => s.era);
  const runningTotals = useGameStore((s) => s.runningTotals);
  const leaderId = useGameStore((s) => s.leaderId);
  const canPressSpin = phase === 'idle' && (levelUpResearchPoints ?? 0) === 0;

  // 스테이지 선택 화면
  if (preGameScreen === 'intro') {
    return (
      <>
        <CustomCursor />
        <DemoStartScreen />
      </>
    );
  }

  // 스테이지 선택 화면
  if (preGameScreen === 'stage') {
    return (
      <>
        <CustomCursor />
        <StageSelectScreen />
      </>
    );
  }

  // 리더 선택 화면
  if (preGameScreen === 'leader') {
    return (
      <>
        <CustomCursor />
        <LeaderSelectScreen />
      </>
    );
  }

  // ===== 본게임 =====
  const eraName = t(ERA_NAME_KEYS[era] ?? 'era.ancient', language);

  const knowledgeRequired = level < 10 ? 50 : level < 20 ? 100 : 200;
  const knowledgeRatio = Math.min(1, knowledge / knowledgeRequired);
  const turnsUntilPayment = turn % 10 === 0 ? 10 : 10 - (turn % 10);
  const nextCost = calculateFoodCost(turn + turnsUntilPayment, stageId);

  const activeState = useGameStore.getState();
  const hudPassiveTotals = hoveredStat ? getHudTurnStartPassiveTotals(activeState) : null;

  const renderTooltip = (kind: 'knowledge' | 'food' | 'gold') => {
    if (hoveredStat !== kind || !hudPassiveTotals) return null;
    const n = hudPassiveTotals[kind];
    const line = t('game.hudBaseProductionShort', language).replace('{n}', String(n));
    const icon = kind === 'food' ? FOOD_RESOURCE_ICON_URL : kind === 'gold' ? GOLD_RESOURCE_ICON_URL : KNOWLEDGE_RESOURCE_ICON_URL;
    return (
      <div className="hud-stat-tooltip" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '12px' }}>
        <div className="hud-stat-tooltip-inner">
          <img src={icon} alt="" width={40} height={40} style={{ imageRendering: 'pixelated', flexShrink: 0 }} />
          <span style={{ color: '#e5e5e5', marginLeft: '4px' }}>{line}</span>
        </div>
      </div>
    );
  };

  const renderRunningTotal = (kind: 'knowledge' | 'food' | 'gold') => {
    if (phase !== 'processing' || !runningTotals) return null;
    const value = runningTotals[kind];
    if (value === 0) return null;
    
    let color = '#fff';
    if (kind === 'knowledge') color = value > 0 ? '#60a5fa' : '#ef4444';
    if (kind === 'food') color = value > 0 ? '#4ade80' : '#ef4444';
    if (kind === 'gold') color = value > 0 ? '#fbbf24' : '#ef4444';

    return (
      <div className="running-total-pop" style={{ color }}>
        {value > 0 ? '+' : ''}{value}
      </div>
    );
  };

  return (
    <div className="game-screen">
      <CustomCursor />
      <div className="hud-top">
        <div className="hud-top-left">
          <div className="level-info-mini" style={{ cursor: 'help' }} onMouseEnter={() => setHoveredStat('knowledge')} onMouseLeave={() => setHoveredStat(null)}>
            <span className="lv-text">Lv.{level}</span>
            <span className="era-text">{eraName}</span>
            <div className="exp-bar-mini">
              <div className="exp-bar-mini-fill" style={{ width: `${knowledgeRatio * 100}%` }} />
              <div className="exp-bar-mini-text">
                <img src={KNOWLEDGE_RESOURCE_ICON_URL} alt="XP" style={{ width: 22, height: 22, imageRendering: 'pixelated' }} />
                <span>{knowledge}/{knowledgeRequired}</span>
              </div>
              {renderRunningTotal('knowledge')}
            </div>
            {renderTooltip('knowledge')}
          </div>
          <div className="resource-group" onMouseEnter={() => setHoveredStat('food')} onMouseLeave={() => setHoveredStat(null)}>
            <img src={FOOD_RESOURCE_ICON_URL} alt="Food" className="resource-icon" />
            <span className="resource-value">
              {food}
              {renderRunningTotal('food')}
            </span>
            {renderTooltip('food')}
          </div>
          <div className="resource-group" onMouseEnter={() => setHoveredStat('gold')} onMouseLeave={() => setHoveredStat(null)}>
            <img src={GOLD_RESOURCE_ICON_URL} alt="Gold" className="resource-icon" />
            <span className="resource-value">
              {gold}
              {renderRunningTotal('gold')}
            </span>
            {renderTooltip('gold')}
          </div>
        </div>

        <div className="hud-top-center">
          <div className={`food-demand-mini ${turnsUntilPayment <= 2 ? 'warning-low' : turnsUntilPayment <= 4 ? 'warning-mid' : ''}`}>
             {t('game.foodDemandFlavor', language).replace('{turns}', String(turnsUntilPayment)).replace('{amount}', nextCost.toLocaleString())}
          </div>
        </div>

        <div className="hud-top-right">
          <button
            className="pause-btn-top"
            onClick={() => setMenuOpen(true)}
            title="일시정지"
            aria-label="일시정지"
            style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto' }}
          >
            ⏸
          </button>
        </div>
      </div>



      {/* 로드 완료 전 검은 오버레이 — onReady 후 페이드 아웃 */}
      <div
        className={`game-screen-black${gameCanvasReady ? ' game-screen-black--fade-out' : ''}`}
        aria-hidden="true"
      />
      {/* ===== GAME BOARD (with integrated UI bars) ===== */}
      <div className="game-area" ref={gameAreaRef}>
        <GameCanvas onReady={handleCanvasReady} suppressBoardTooltips={suppressBoardTooltips} />
        {phase === 'oblivion_furnace_board' && <OblivionFurnaceBoardOverlay anchorRef={gameAreaRef} />}
      </div>

      {/* ===== 보드 하단: 왼쪽(유물) · 중앙 고정(스핀) · 오른쪽(⋯, 메뉴) ===== */}
      <div className="bottom-action-bar">
        <div className="bottom-action-bar-left">
          <button
            className="relic-shop-btn"
            onClick={toggleRelicShop}
            title={
              hasNewRelicShopStock
                ? t('game.relicShopNewStockHint', language)
                : t('game.relicShopTitleShort', language)
            }
            aria-label={
              hasNewRelicShopStock
                ? t('game.relicShopNewStockAria', language)
                : t('game.relicShopTitleShort', language)
            }
          >
            <img src={RELIC_PANEL_TITLE_ICON_URL} alt="" style={{ width: 44, height: 44, imageRendering: 'pixelated' }} />
            {hasNewRelicShopStock && (
              <span className="hud-new-stock-tab" aria-hidden="true">
                {t('game.knowledgeHudPendingTab', language)}
              </span>
            )}
          </button>
          <button
            type="button"
            className="relic-shop-btn relic-shop-btn--knowledge"
            aria-label={
              levelUpResearchPoints > 0
                ? t('game.knowledgeHudButtonHintPending', language).replace(
                    '{title}',
                    t('game.knowledgeUpgradeTreeTitle', language),
                  )
                : t('game.knowledgeUpgradeTreeTitle', language)
            }
            title={
              levelUpResearchPoints > 0
                ? t('game.knowledgeHudButtonHintPending', language).replace(
                    '{title}',
                    t('game.knowledgeUpgradeTreeTitle', language),
                  )
                : t('game.knowledgeUpgradeTreeTitle', language)
            }
            onClick={() => setIsKnowledgeOpen(true)}
          >
            {levelUpResearchPoints > 0 && (
              <span className="hud-new-stock-tab" aria-hidden="true">
                {t('game.knowledgeHudPendingTab', language)}
              </span>
            )}
            <img src={KNOWLEDGE_RESOURCE_ICON_URL} alt="" draggable={false} style={{ width: 54, height: 54, imageRendering: 'pixelated' }} />
          </button>
        </div>
        <div className="spin-area">
          <button
            type="button"
            className="spin-btn"
            onClick={spinBoard}
            disabled={!canPressSpin}
            aria-label={t('game.spin', language)}
            title={t('game.spin', language)}
          >
            <span style={{ display: 'inline-block', transform: 'scaleX(1.8)', fontSize: '48px', fontWeight: 600, letterSpacing: '8px' }}>SPIN</span>
          </button>
        </div>
        <div className="bottom-action-bar-right">
          <button
            className="bottom-right-btn"
            onClick={() => setIsLogOpen(true)}
            title="이벤트 로그"
          >
            📋
          </button>
          <button
            className="bottom-right-btn"
            onClick={() => setOwnedSymbolsOpen(true)}
            title="보유 심볼 목록"
          >
            ▦
          </button>
        </div>
      </div>

      {/* ===== PAUSE MENU OVERLAY ===== */}
      <PauseMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ===== SYMBOL SELECTION OVERLAY ===== */}
      <SymbolSelection />

      {/* ===== RELIC SELECTION OVERLAY ===== */}
      <RelicSelection />

      {/* ===== DESTROY SYMBOLS OVERLAY ===== */}
      <DestroySelection />

      {/* ===== GAME OVER OVERLAY ===== */}
      {isInGame && phase === 'game_over' && (
        <div className="endgame-overlay">
          <div className="endgame-panel">
            <div className="endgame-title endgame-defeat">{t('game.gameOver', language)}</div>
            <div className="endgame-subtitle">{t('game.turn', language)} {turn} - {t('game.notEnoughFood', language)}</div>
            <button className="endgame-btn" onClick={returnToStageSelect}>{t('game.restart', language)}</button>
          </div>
        </div>
      )}

      {/* ===== VICTORY OVERLAY ===== */}
      {isInGame && phase === 'victory' && (
        <div className="endgame-overlay">
          <div className="endgame-panel">
            <div className="endgame-title endgame-victory">{t('game.victory', language)}</div>
            <div className="endgame-subtitle">{t('game.turn', language)} {turn}</div>
            <button className="endgame-btn" onClick={returnToStageSelect}>{t('game.restart', language)}</button>
          </div>
        </div>
      )}

      {/* ===== DEV OVERLAY (F1) ===== */}
      <DevOverlay />

      {/* ===== DATA BROWSER (F2) ===== */}
      <DataBrowser />

      {/* ===== SYMBOL POOL PROBABILITY (F4) ===== */}
      <SymbolPoolModal />

      {/* ===== OWNED SYMBOLS LIST (button ⋯) ===== */}
      <OwnedSymbolsModal open={ownedSymbolsOpen} onClose={() => setOwnedSymbolsOpen(false)} />

      {/* ===== EFFECT / EVENT LOG (F11/Button) ===== */}
      <EffectLogOverlay isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />

      {/* ===== KNOWLEDGE UPGRADES OVERLAY ===== */}
      <KnowledgeUpgradesOverlay isOpen={isKnowledgeOpen} onClose={() => setIsKnowledgeOpen(false)} />
    </div>
  );
}

export default App;
