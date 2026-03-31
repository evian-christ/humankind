import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from './game/state/gameStore';
import { useBoardTooltipBlockStore } from './game/state/boardTooltipBlockStore';
import { useSettingsStore } from './game/state/settingsStore';
import { usePreGameStore } from './game/state/preGameStore';
import { t } from './i18n';
import GameCanvas from './components/GameCanvas';
import SymbolSelection from './components/SymbolSelection';
import RelicSelection from './components/RelicSelection';
import UpgradeSelection from './components/UpgradeSelection';
import DestroySelection from './components/DestroySelection';
import StageSelectScreen from './components/StageSelectScreen';
import LeaderSelectScreen from './components/LeaderSelectScreen';

import PauseMenu from './components/PauseMenu';
import DevOverlay from './components/DevOverlay';
import DataBrowser from './components/DataBrowser';
import SymbolPoolModal from './components/SymbolPoolModal';
import OwnedSymbolsModal from './components/OwnedSymbolsModal';
import EffectLogOverlay from './components/EffectLogOverlay';

function App() {
  const preGameScreen = usePreGameStore((s) => s.screen);
  const returnToStageSelect = usePreGameStore((s) => s.returnToStageSelect);
  const { phase, turn, spinBoard, toggleRelicShop, isRelicShopOpen } = useGameStore();
  const fullscreenModalBlocksBoardTooltips = useBoardTooltipBlockStore((s) => s.ids.length > 0);
  const language = useSettingsStore((s) => s.language);
  const { resolutionWidth, resolutionHeight, setResolution } = useSettingsStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ownedSymbolsOpen, setOwnedSymbolsOpen] = useState(false);
  const isInGame = preGameScreen === null;
  const [gameCanvasReady, setGameCanvasReady] = useState(false);

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

  // 스페이스바로 스핀 (idle일 때만, 입력 필드 포커스 시 무시)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (phase !== 'idle') return;
      e.preventDefault();
      spinBoard();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, spinBoard]);

  const boardIsForegroundForTooltips =
    phase !== 'upgrade_selection' &&
    phase !== 'destroy_selection' &&
    phase !== 'game_over' &&
    phase !== 'victory' &&
    !isRelicShopOpen;

  const suppressBoardTooltips = !boardIsForegroundForTooltips || fullscreenModalBlocksBoardTooltips;

  // 스테이지 선택 화면
  if (preGameScreen === 'stage') {
    return <StageSelectScreen />;
  }

  // 리더 선택 화면
  if (preGameScreen === 'leader') {
    return <LeaderSelectScreen />;
  }

  // ===== 본게임 =====
  // 검은 화면으로 가린 뒤, 캔버스(에셋) 로드 완료 시 검은 레이어만 페이드 아웃
  return (
    <div className="game-screen">
      {/* 로드 완료 전 검은 오버레이 — onReady 후 페이드 아웃 */}
      <div
        className={`game-screen-black${gameCanvasReady ? ' game-screen-black--fade-out' : ''}`}
        aria-hidden="true"
      />
      {/* ===== 상단바 우측: 일시정지 버튼 ===== */}
      <button
        className="pause-btn-top"
        onClick={() => setMenuOpen(true)}
        title="일시정지"
        aria-label="일시정지"
      >
        ⏸
      </button>
      {/* ===== GAME BOARD (with integrated UI bars) ===== */}
      <div className="game-area">
        <GameCanvas onReady={handleCanvasReady} suppressBoardTooltips={suppressBoardTooltips} />
      </div>

      {/* ===== 보드 하단: 왼쪽(유물) · 중앙 고정(스핀) · 오른쪽(⋯, 메뉴) ===== */}
      <div className="bottom-action-bar">
        <div className="bottom-action-bar-left">
          <button
            className="relic-shop-btn"
            onClick={toggleRelicShop}
            title="유물 상점 (Relic Shop)"
          >
            🏺
          </button>
        </div>
        <div className="spin-area">
          <button
            className="spin-btn"
            onClick={spinBoard}
            disabled={phase !== 'idle'}
            title="SPIN"
          >
            SPIN
          </button>
        </div>
        <div className="bottom-action-bar-right">
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

      {/* ===== UPGRADE SELECTION OVERLAY ===== */}
      <UpgradeSelection />

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

      {/* ===== DEV OVERLAY ===== */}
      <DevOverlay />

      {/* ===== DATA BROWSER (F3) ===== */}
      <DataBrowser />

      {/* ===== SYMBOL POOL PROBABILITY (F4) ===== */}
      <SymbolPoolModal />

      {/* ===== OWNED SYMBOLS LIST (button ⋯) ===== */}
      <OwnedSymbolsModal open={ownedSymbolsOpen} onClose={() => setOwnedSymbolsOpen(false)} />

      {/* ===== EFFECT / EVENT LOG (F11) ===== */}
      <EffectLogOverlay />
    </div>
  );
}

export default App;
