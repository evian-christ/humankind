import { useGameStore } from './game/state/gameStore';
import GameCanvas from './components/GameCanvas';
import SymbolSelection from './components/SymbolSelection';

function App() {
  const { phase, turn, spinBoard, initializeGame } = useGameStore();

  return (
    <>
      {/* ===== GAME BOARD (with integrated UI bars) ===== */}
      <div className="game-area">
        <GameCanvas />
      </div>

      {/* ===== SYMBOL SELECTION OVERLAY ===== */}
      <SymbolSelection />

      {/* ===== GAME OVER OVERLAY ===== */}
      {phase === 'game_over' && (
        <div className="endgame-overlay">
          <div className="endgame-panel">
            <div className="endgame-title endgame-defeat">GAME OVER</div>
            <div className="endgame-subtitle">Turn {turn} - Not enough food</div>
            <button className="endgame-btn" onClick={initializeGame}>RESTART</button>
          </div>
        </div>
      )}

      {/* ===== VICTORY OVERLAY ===== */}
      {phase === 'victory' && (
        <div className="endgame-overlay">
          <div className="endgame-panel">
            <div className="endgame-title endgame-victory">VICTORY!</div>
            <div className="endgame-subtitle">Turn {turn} - AGI Achieved</div>
            <button className="endgame-btn" onClick={initializeGame}>RESTART</button>
          </div>
        </div>
      )}

      {/* ===== BOTTOM PANEL ===== */}
      <div className="bottom-panel">
        {/* Spin Area */}
        <div className="spin-area">
          <button
            className="spin-btn"
            onClick={spinBoard}
            disabled={phase !== 'idle'}
          >
            <span className="spin-icon">⚡</span>
            {phase === 'processing' ? '...' : 'SPIN'}
          </button>
          <button className="reset-btn" onClick={initializeGame}>
            RESTART
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
