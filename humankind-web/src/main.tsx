import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './settingsKeyBindings.css'
import './crt.css'
import { CrtRoot } from './CrtRoot.tsx'
import { installBrowserBehaviorGuards } from './browserBehaviorGuards.ts'

installBrowserBehaviorGuards()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrtRoot />
  </StrictMode>,
)
