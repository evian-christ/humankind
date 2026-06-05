import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './crt.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="crt-display">
      <div className="crt-content">
        <App />
      </div>
      <div className="crt-overlay" aria-hidden="true" />
    </div>
  </StrictMode>,
)
