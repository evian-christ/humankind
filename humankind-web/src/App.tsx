import { useGameStore } from './game/state/gameStore';
import { getSymbolColorHex } from './game/data/symbolDefinitions';
import GameCanvas from './components/GameCanvas';

function App() {
  const { food, gold, exp, level, turn, playerSymbols, spinBoard, initializeGame, isProcessing } = useGameStore();
  const expToNext = 50 + (level - 1) * 25;
  const expPercent = Math.min((exp / expToNext) * 100, 100);

  return (
    <>
      {/* ===== GAME TITLE ===== */}
      <div className="game-title">HUMANKIND</div>

      {/* ===== TURN COUNTER ===== */}
      <div className="turn-counter">TURN {turn}</div>

      {/* ===== TOP HUD BAR ===== */}
      <div className="hud-top">
        <div className="resource-group">
          <span className="resource-icon">🍎</span>
          <div>
            <div className="resource-value" style={{ color: food >= 0 ? '#6ee77a' : '#e74c4c' }}>{food}</div>
            <div className="resource-label">Food</div>
          </div>
        </div>

        <div className="resource-group">
          <span className="resource-icon">💰</span>
          <div>
            <div className="resource-value" style={{ color: '#f0d060' }}>{gold}</div>
            <div className="resource-label">Gold</div>
          </div>
        </div>

        <div className="resource-group level-badge">
          <span className="resource-icon">⚔️</span>
          <div>
            <div className="level-num">{level}</div>
            <div className="resource-label">Level</div>
          </div>
        </div>

        <div className="resource-group">
          <span className="resource-icon">⭐</span>
          <div>
            <div className="resource-value" style={{ color: '#a78bfa' }}>{exp}<span style={{ fontSize: 11, opacity: 0.4 }}>/{expToNext}</span></div>
            <div className="resource-label">EXP</div>
          </div>
        </div>
      </div>

      {/* ===== EXP BAR ===== */}
      <div className="exp-bar-container">
        <div className="exp-bar-fill" style={{ width: `${expPercent}%` }} />
      </div>

      {/* ===== GAME BOARD ===== */}
      <div className="game-area">
        <GameCanvas />
      </div>

      {/* ===== BOTTOM PANEL ===== */}
      <div className="bottom-panel">
        {/* Symbol Collection */}
        <div className="collection-strip">
          {playerSymbols.map((s, idx) => (
            <div
              key={idx}
              className="collection-item"
              style={{ borderColor: `${getSymbolColorHex(s.rarity)}33` }}
            >
              <img src={`/assets/sprites/${s.sprite}`} alt={s.name} />
              <div className="tooltip" style={{ color: getSymbolColorHex(s.rarity) }}>
                {s.name}
              </div>
            </div>
          ))}
        </div>

        {/* Spin Area */}
        <div className="spin-area">
          <button
            className="spin-btn"
            onClick={spinBoard}
            disabled={isProcessing}
          >
            <span className="spin-icon">⚡</span>
            {isProcessing ? '...' : 'SPIN'}
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
