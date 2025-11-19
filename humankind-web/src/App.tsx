import { useState } from 'react';

function App() {
  const [food, setFood] = useState(100);
  const [gold, setGold] = useState(0);
  const [exp, setExp] = useState(0);
  const [level, setLevel] = useState(1);
  const [turn, setTurn] = useState(0);

  const handleSpin = () => {
    console.log('Spin clicked!');
    setFood(f => f + 10);
    setTurn(t => t + 1);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #1a1a1a, #2a2a2a)',
      padding: '20px',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
        🎮 Humankind in a Nutshell - Web
      </h1>

      {/* Resource Display */}
      <div style={{
        background: '#2a2a2a',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '30px',
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

      {/* Board Placeholder */}
      <div style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        padding: '40px',
        marginBottom: '30px',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #374151'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎲</div>
          <div style={{ fontSize: '18px', color: '#9ca3af' }}>
            5×4 Game Board
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '10px' }}>
            (PixiJS renderer will be added here)
          </div>
        </div>
      </div>

      {/* Spin Button */}
      <div style={{ textAlign: 'center' }}>
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
      </div>

      {/* Debug Info */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        background: '#111',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#666'
      }}>
        <div>✅ React: Working</div>
        <div>✅ State Management: Working (useState)</div>
        <div>⏳ PixiJS Board: Pending</div>
        <div>⏳ Zustand: Pending</div>
      </div>
    </div>
  );
}

export default App;
