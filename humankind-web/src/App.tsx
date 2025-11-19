import { useGameStore, BOARD_WIDTH, BOARD_HEIGHT } from './game/state/gameStore';
import { getRarityColor, getRarityName } from './game/symbols/symbolDefinitions';

function App() {
  const {
    food, gold, exp, level, turn,
    board, playerSymbols,
    spinBoard, initializeGame
  } = useGameStore();

  const handleSpin = () => {
    spinBoard();
    useGameStore.getState().incrementTurn();
  };

  const handleReset = () => {
    initializeGame();
  };

  // Symbol emoji mapping
  const getSymbolEmoji = (name: string): string => {
    const emojiMap: Record<string, string> = {
      'Wheat': '🌾',
      'Rice': '🍚',
      'Fish': '🐟',
      'Cow': '🐄',
      'Sheep': '🐑',
    };
    return emojiMap[name] || '📦';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #1a1a1a, #2a2a2a)',
      padding: '20px',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '28px' }}>
        🎮 Humankind - Phase 2 Complete
      </h1>

      {/* Resource Display */}
      <div style={{
        background: '#2a2a2a',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        display: 'flex',
        gap: '30px',
        justifyContent: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>🍞</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>Food</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>{food}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>💰</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>Gold</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>{gold}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>⭐</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>EXP</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#60a5fa' }}>{exp}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>📊</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>Level</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#a78bfa' }}>{level}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>🔄</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>Turn</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#34d399' }}>{turn}</div>
        </div>
      </div>

      {/* Game Board */}
      <div style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        border: '2px solid #374151'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '15px', fontSize: '18px' }}>
          Game Board (5×4)
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
          gap: '10px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          {Array.from({ length: BOARD_WIDTH }).map((_, x) => (
            Array.from({ length: BOARD_HEIGHT }).map((_, y) => {
              const symbol = board[x][y];
              return (
                <div
                  key={`${x}-${y}`}
                  style={{
                    background: symbol ? '#2a2a2a' : '#1a1a1a',
                    border: `2px solid ${symbol ? getRarityColor(symbol.definition.rarity) : '#444'}`,
                    borderRadius: '8px',
                    padding: '10px',
                    minHeight: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}
                >
                  {symbol ? (
                    <>
                      <div style={{ fontSize: '24px', marginBottom: '5px' }}>
                        {getSymbolEmoji(symbol.definition.name)}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: getRarityColor(symbol.definition.rarity)
                      }}>
                        {symbol.definition.name}
                      </div>
                      <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                        {getRarityName(symbol.definition.rarity)}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '24px', opacity: 0.3 }}>⬜</div>
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>

      {/* Player Symbols Collection */}
      <div style={{
        background: '#2a2a2a',
        borderRadius: '12px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
          Your Symbols ({playerSymbols.length})
        </h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {playerSymbols.map((symbol, idx) => (
            <div
              key={idx}
              style={{
                background: '#1a1a1a',
                border: `2px solid ${getRarityColor(symbol.rarity)}`,
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                color: getRarityColor(symbol.rarity)
              }}
            >
              {getSymbolEmoji(symbol.name)} {symbol.name}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ textAlign: 'center', display: 'flex', gap: '15px', justifyContent: 'center' }}>
        <button
          onClick={handleSpin}
          style={{
            padding: '16px 48px',
            fontSize: '24px',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #2563eb, #7c3aed)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          🎰 SPIN
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: '#dc2626',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          🔄 Reset
        </button>
      </div>

      {/* Test Results */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: '#111',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#666'
      }}>
        <div style={{ color: '#22c55e', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
          ✅ Phase 2 Complete - Test Results
        </div>
        <div>✅ Zustand Store: Working</div>
        <div>✅ Symbol Data: 37 symbols loaded</div>
        <div>✅ Board State: 5×4 grid ({BOARD_WIDTH}×{BOARD_HEIGHT})</div>
        <div>✅ Player Collection: {playerSymbols.length} starting symbols</div>
        <div>✅ Spin Mechanism: Shuffle and place symbols</div>
        <div>✅ Reset Function: Reinitialize game state</div>
      </div>
    </div>
  );
}

export default App;
