import { useState, useEffect } from 'react';
import { useGameStore } from './game/state/gameStore';
import { useSettingsStore } from './game/state/settingsStore';
import { t } from './i18n';
import GameCanvas from './components/GameCanvas';
import SymbolSelection from './components/SymbolSelection';
import RelicSelection from './components/RelicSelection';
import UpgradeSelection from './components/UpgradeSelection';
import DestroySelection from './components/DestroySelection';

import PauseMenu from './components/PauseMenu';
import DevOverlay from './components/DevOverlay';
import DataBrowser from './components/DataBrowser';
import SymbolPoolModal from './components/SymbolPoolModal';
import EffectLogOverlay from './components/EffectLogOverlay';

function App() {
  const { phase, turn, spinBoard, initializeGame, toggleRelicShop } = useGameStore();
  const language = useSettingsStore((s) => s.language);
  const { resolutionWidth, resolutionHeight, setResolution } = useSettingsStore();
  const [menuOpen, setMenuOpen] = useState(false);

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

  return (
    <>
      {/* ===== GAME BOARD (with integrated UI bars) ===== */}
      <div className="game-area">
        <GameCanvas />
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
            title={t('game.spin', language)}
          >
            {t('game.spin', language)}
          </button>
        </div>
        <div className="bottom-action-bar-right">
          <button
            className="bottom-right-btn"
            onClick={() => {}}
            title=""
          >
            ⋯
          </button>
          <button
            className="menu-btn"
            onClick={() => setMenuOpen(true)}
            title="메뉴"
          >
            ☰
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
      {phase === 'game_over' && (
        <div className="endgame-overlay">
          <div className="endgame-panel">
            <div className="endgame-title endgame-defeat">{t('game.gameOver', language)}</div>
            <div className="endgame-subtitle">{t('game.turn', language)} {turn} - {t('game.notEnoughFood', language)}</div>
            <button className="endgame-btn" onClick={initializeGame}>{t('game.restart', language)}</button>
          </div>
        </div>
      )}

      {/* ===== VICTORY OVERLAY ===== */}
      {phase === 'victory' && (
        <div className="endgame-overlay">
          <div className="endgame-panel">
            <div className="endgame-title endgame-victory">{t('game.victory', language)}</div>
            <div className="endgame-subtitle">{t('game.turn', language)} {turn}</div>
            <button className="endgame-btn" onClick={initializeGame}>{t('game.restart', language)}</button>
          </div>
        </div>
      )}

      {/* ===== DEV OVERLAY ===== */}
      <DevOverlay />

      {/* ===== DATA BROWSER (F3) ===== */}
      <DataBrowser />

      {/* ===== SYMBOL POOL PROBABILITY (F4) ===== */}
      <SymbolPoolModal />

      {/* ===== EFFECT / EVENT LOG (F12) ===== */}
      <EffectLogOverlay />
    </>
  );
}

export default App;
