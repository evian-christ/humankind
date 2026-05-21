import { useEffect, useState } from 'react';
import { useSettingsStore } from '../game/state/settingsStore';
import { usePreGameStore } from '../game/state/preGameStore';
import { t } from '../i18n';
import PauseMenu from './PauseMenu';

export default function DemoStartScreen() {
  const language = useSettingsStore((s) => s.language);
  const proceedToLeaderSelect = usePreGameStore((s) => s.proceedToLeaderSelect);
  const proceedToLeaderProgress = usePreGameStore((s) => s.proceedToLeaderProgress);
  const skipIntroToDefaults = usePreGameStore((s) => s.skipIntroToDefaults);
  const continueSavedGame = usePreGameStore((s) => s.continueSavedGame);
  const hasSavedGame = usePreGameStore((s) => s.hasSavedGame);
  const hasCompletedTutorial = usePreGameStore((s) => s.hasCompletedTutorial);
  const startTutorial = usePreGameStore((s) => s.startTutorial);
  const canStartGame = hasCompletedTutorial;
  const canContinue = hasCompletedTutorial && hasSavedGame();
  const shouldHighlightTutorial = !hasCompletedTutorial;
  const [playOptionsOpen, setPlayOptionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const quitLabel = language === 'ko' ? '나가기' : 'Quit';

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
      if (!hasCompletedTutorial) return;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return;
      e.preventDefault();
      skipIntroToDefaults();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasCompletedTutorial, skipIntroToDefaults]);

  return (
    <div className="demo-start-root">
      <main className="main-menu" aria-label={t('mainMenu.title', language)}>
        <h1 className="main-menu-title main-menu-title--image">
          <img
            className="main-menu-title-sprite"
            src="./capsules/librarylogo.png"
            alt="Humankind in a nutshell"
            draggable={false}
          />
          <span className="main-menu-title-demo">DEMO</span>
        </h1>

        <nav className="main-menu-actions" aria-label={t('mainMenu.actionsLabel', language)}>
          <div className="main-menu-play-row">
            <button
              type="button"
              className={`main-menu-button main-menu-play-button${playOptionsOpen ? ' main-menu-play-button--open' : ''}`}
              onClick={() => setPlayOptionsOpen((open) => !open)}
              aria-expanded={playOptionsOpen}
              aria-controls="main-menu-play-options"
              aria-label={t('mainMenu.play', language)}
            >
              {t('mainMenu.play', language)}
            </button>
            <div
              id="main-menu-play-options"
              className={`main-menu-play-options${playOptionsOpen ? ' main-menu-play-options--open' : ''}`}
              aria-hidden={!playOptionsOpen}
            >
              <button
                type="button"
                className={`main-menu-button main-menu-option-button${shouldHighlightTutorial ? ' main-menu-button--tutorial-highlight' : ''}`}
                onClick={startTutorial}
                tabIndex={playOptionsOpen ? 0 : -1}
                aria-label={t('mainMenu.tutorial', language)}
              >
                {t('mainMenu.tutorial', language)}
              </button>
              <button
                type="button"
                className="main-menu-button main-menu-option-button"
                onClick={proceedToLeaderSelect}
                disabled={!canStartGame}
                aria-disabled={!canStartGame}
                tabIndex={playOptionsOpen ? 0 : -1}
                aria-label={t('mainMenu.restart', language)}
              >
                {t('mainMenu.restart', language)}
              </button>
              <button
                type="button"
                className="main-menu-button main-menu-option-button"
                onClick={continueSavedGame}
                disabled={!canContinue}
                aria-disabled={!canContinue}
                tabIndex={playOptionsOpen ? 0 : -1}
                aria-label={t('mainMenu.resume', language)}
              >
                {t('mainMenu.resume', language)}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="main-menu-button"
            onClick={() => proceedToLeaderProgress()}
            aria-label={t('mainMenu.leaders', language)}
          >
            {t('mainMenu.leaders', language)}
          </button>
          <button
            type="button"
            className="main-menu-button"
            disabled
            aria-disabled="true"
            aria-label={t('mainMenu.achievements', language)}
          >
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
        aria-label={quitLabel}
      >
        ×
      </button>
      <div className="main-menu-version" aria-label="alpha version">
        a1.2.0
      </div>
      <PauseMenu isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} initialScreen="settings" />
    </div>
  );
}
