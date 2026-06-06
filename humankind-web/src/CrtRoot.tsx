import App from './App'
import { useSettingsStore } from './game/state/settingsStore'

export const CrtRoot = () => {
  const crtEffect = useSettingsStore((state) => state.crtEffect)

  return (
    <div className={`crt-display ${crtEffect ? '' : 'crt-disabled'}`}>
      <div className="crt-content">
        <App />
      </div>
      <div className="crt-overlay" aria-hidden="true" />
    </div>
  )
}
