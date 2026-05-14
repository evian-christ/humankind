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
  const hasCompletedTutorial = usePreGameStore((s) => s.hasCompletedTutorial);
  const startTutorial = usePreGameStore((s) => s.startTutorial);
  const canStartGame = hasCompletedTutorial;
  const canContinue = hasCompletedTutorial && hasSavedGame();
  const shouldHighlightTutorial = !hasCompletedTutorial;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tutorialLabel = language === 'ko' ? '튜토리얼' : 'Tutorial';
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
        <h1 className="main-menu-title">
          <span className="main-menu-title-main">Humankind</span>
          <span className="main-menu-title-sub">in a nutshell</span>
          <span className="main-menu-title-demo">DEMO</span>
        </h1>

        <nav className="main-menu-actions" aria-label={t('mainMenu.actionsLabel', language)}>
          <button
            type="button"
            className={`main-menu-button${shouldHighlightTutorial ? ' main-menu-button--tutorial-highlight' : ''}`}
            onClick={startTutorial}
            aria-label={tutorialLabel}
          >
            {tutorialLabel}
          </button>
          <button
            type="button"
            className="main-menu-button"
            onClick={proceedToLeaderSelect}
            disabled={!canStartGame}
            aria-disabled={!canStartGame}
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
        a0.1.0
      </div>
      <PauseMenu isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} initialScreen="settings" />
    </div>
  );
}
