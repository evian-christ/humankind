import { useEffect, useState } from 'react';
import { useSettingsStore } from '../game/state/settingsStore';
import { usePreGameStore } from '../game/state/preGameStore';
import { t } from '../i18n';
import PauseMenu from './PauseMenu';

export default function DemoStartScreen() {
  const language = useSettingsStore((s) => s.language);
  const proceedToLeaderSelect = usePreGameStore((s) => s.proceedToLeaderSelect);
  const skipIntroToDefaults = usePreGameStore((s) => s.skipIntroToDefaults);
  const continueSavedGame = usePreGameStore((s) => s.continueSavedGame);
  const hasSavedGame = usePreGameStore((s) => s.hasSavedGame);
  const canContinue = hasSavedGame();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleQuit = () => {
    void (async () => {
      try {
        const { isTauri } = await import('@tauri-apps/api/core');
        if (isTauri()) {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().close();
          return;
        }
      } catch (error) {
        console.error('Failed to close app window:', error);
      }

      window.close();
    })();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'KeyS') return;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return;
      e.preventDefault();
      skipIntroToDefaults();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [skipIntroToDefaults]);

  return (
    <div className="demo-start-root">
      <main className="main-menu" aria-label={t('mainMenu.title', language)}>
        <h1 className="main-menu-title">
          <span className="main-menu-title-main">Humankind</span>
          <span className="main-menu-title-sub">in a nutshell</span>
        </h1>

        <nav className="main-menu-actions" aria-label={t('mainMenu.actionsLabel', language)}>
          <button
            type="button"
            className="main-menu-button"
            onClick={proceedToLeaderSelect}
            aria-label={t('mainMenu.newGame', language)}
          >
            {t('mainMenu.newGame', language)}
          </button>
          <button
            type="button"
            className="main-menu-button"
            onClick={continueSavedGame}
            disabled={!canContinue}
            aria-disabled={!canContinue}
            aria-label={t('mainMenu.continue', language)}
          >
            {t('mainMenu.continue', language)}
          </button>
          <button type="button" className="main-menu-button" aria-label={t('mainMenu.achievements', language)}>
            {t('mainMenu.achievements', language)}
          </button>
          <button
            type="button"
            className="main-menu-button"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('mainMenu.settings', language)}
          >
            {t('mainMenu.settings', language)}
          </button>
        </nav>
      </main>
      <button
        type="button"
        className="main-menu-exit-button"
        onClick={handleQuit}
        aria-label="나가기"
      >
        →]
      </button>
      <PauseMenu isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} initialScreen="settings" />
    </div>
  );
}
