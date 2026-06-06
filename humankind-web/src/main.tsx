import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './crt.css'
import { CrtRoot } from './CrtRoot.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrtRoot />
  </StrictMode>,
)
