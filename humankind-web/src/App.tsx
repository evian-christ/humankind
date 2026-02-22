import { useState, useEffect } from 'react';
import { useGameStore } from './game/state/gameStore';
import { useSettingsStore } from './game/state/settingsStore';
import { t } from './i18n';
import GameCanvas from './components/GameCanvas';
import SymbolSelection from './components/SymbolSelection';
import EraUnlockModal from './components/EraUnlockModal';
import PauseMenu from './components/PauseMenu';
import DevOverlay from './components/DevOverlay';

function App() {
  const { phase, turn, spinBoard, initializeGame } = useGameStore();
  const language = useSettingsStore((s) => s.language);
  const { resolutionWidth, resolutionHeight, setResolution } = useSettingsStore();
  const [menuOpen, setMenuOpen] = useState(false);

  // 앱 최초 로드 시 저장된 해상도를 DOM에 적용
  useEffect(() => {
    setResolution(resolutionWidth, resolutionHeight);
  }, []);

  return (
    <>
      {/* ===== GAME BOARD (with integrated UI bars) ===== */}
      <div className="game-area">
        <GameCanvas />
      </div>

      {/* ===== MENU BUTTON (top-right corner) ===== */}
      <button
        className="menu-btn"
        onClick={() => setMenuOpen(true)}
      >
        ☰
      </button>

      {/* ===== PAUSE MENU OVERLAY ===== */}
      <PauseMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ===== SYMBOL SELECTION OVERLAY ===== */}
      <SymbolSelection />

      {/* ===== ERA UNLOCK MODAL ===== */}
      <EraUnlockModal />

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

      {/* ===== PIXEL ARCADE SPIN BUTTON ===== */}
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
    </>
  );
}

export default App;
