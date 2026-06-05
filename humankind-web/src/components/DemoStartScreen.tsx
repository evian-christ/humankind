import { useEffect, useState } from 'react';
import type { Language } from '../game/state/settingsStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { usePreGameStore } from '../game/state/preGameStore';
import {
  DEMO_ACHIEVEMENT_SECTIONS,
  getDemoAchievementProgress,
  type LocalizedText,
} from '../game/data/demoAchievements';
import { t } from '../i18n';
import PauseMenu from './PauseMenu';

const textForLanguage = (text: LocalizedText, language: Language) => (
  text[language] ?? text.en
);

const getMainMenuTitleSpriteSrc = (language: Language) => (
  language === 'ko'
    ? './capsules/kor/librarylogo.png'
    : './capsules/librarylogo.png'
);

const FALLBACK_STEAM_PROOF_CODE = '0000-0000-0000';
const STEAM_PROOF_SALT = 'humankind-demo-steam-proof-v1';

async function createSteamProofCode(steamId64: string | null): Promise<string> {
  if (!steamId64 || !/^\d+$/.test(steamId64)) return FALLBACK_STEAM_PROOF_CODE;
  try {
    const data = new TextEncoder().encode(`${STEAM_PROOF_SALT}:${steamId64}`);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hex = [...new Uint8Array(hash)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 12)
      .toUpperCase();
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
  } catch (error) {
    console.error('Failed to create Steam proof code:', error);
    return FALLBACK_STEAM_PROOF_CODE;
  }
}

async function loadSteamProofCode(): Promise<string> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const steamId64 = await invoke<string | null>('get_steam_id64');
    return createSteamProofCode(steamId64);
  } catch (error) {
    console.error('Failed to load Steam ID64:', error);
    return FALLBACK_STEAM_PROOF_CODE;
  }
}

const demoAchievementPanelTitle: LocalizedText = {
  en: 'Demo achievements',
  ko: '데모 도전과제',
  zh: '演示成就',
  ru: 'Достижения демоверсии',
};

const demoAchievementEmptyText: LocalizedText = {
  en: 'Coming soon',
  ko: '준비 중',
  zh: '即将推出',
  ru: 'Скоро',
};

function DemoAchievementsPanel({ language }: { language: Language }) {
  return (
    <aside className="demo-achievements-panel" aria-label={textForLanguage(demoAchievementPanelTitle, language)}>
      <h2 className="demo-achievements-title">
        {textForLanguage(demoAchievementPanelTitle, language)}
      </h2>
      <div className="demo-achievements-sections">
        {DEMO_ACHIEVEMENT_SECTIONS.map((section) => (
          <section
            key={section.id}
            className={`demo-achievement-section demo-achievement-section--${section.id}`}
            aria-label={section.label}
          >
            <h3 className="demo-achievement-section-title">
              {section.label}
            </h3>
            {section.achievements.length > 0 ? (
              <div className="demo-achievement-list">
                {section.achievements.map((achievement) => {
                  const { progress, target } = getDemoAchievementProgress(achievement);
                  const progressRatio = target > 0
                    ? Math.min(1, Math.max(0, progress / target))
                    : 0;
                  const progressText = `${progress}/${target}`;
                  const achievementName = textForLanguage(achievement.name, language);
                  const completed = target > 0 && progress >= target;

                  return (
                    <article key={achievement.id} className="demo-achievement-item">
                      <div className="demo-achievement-item-header">
                        <h4 className="demo-achievement-name">
                          {achievementName}
                          {completed ? (
                            <span className="demo-achievement-complete-check" aria-label="completed">
                              ✓
                            </span>
                          ) : null}
                        </h4>
                        <span className="demo-achievement-progress-text">
                          {progressText}
                        </span>
                      </div>
                      <p className="demo-achievement-condition">
                        {textForLanguage(achievement.condition, language)}
                      </p>
                      <div
                        className="demo-achievement-progress"
                        role="progressbar"
                        aria-label={`${achievementName} ${progressText}`}
                        aria-valuemin={0}
                        aria-valuemax={target}
                        aria-valuenow={progress}
                      >
                        <span
                          className="demo-achievement-progress-fill"
                          style={{ width: `${progressRatio * 100}%` }}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="demo-achievement-empty">
                {textForLanguage(demoAchievementEmptyText, language)}
              </p>
            )}
          </section>
        ))}
      </div>
    </aside>
  );
}

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
  const [steamProofCode, setSteamProofCode] = useState(FALLBACK_STEAM_PROOF_CODE);
  const quitLabel = language === 'ko' ? '나가기' : language === 'zh' ? '退出' : language === 'ru' ? 'Выйти' : 'Quit';

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

  useEffect(() => {
    let cancelled = false;
    void loadSteamProofCode().then((code) => {
      if (!cancelled) setSteamProofCode(code);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="demo-start-root">
      <div className="main-menu-proof-code" aria-label={`Steam proof code ${steamProofCode}`} title={steamProofCode}>
        {steamProofCode}
      </div>
      <DemoAchievementsPanel language={language} />
      <main className="main-menu" aria-label={t('mainMenu.title', language)}>
        <div className="main-menu-version" aria-label="beta version">
          b1.1.0
        </div>
        <h1 className="main-menu-title main-menu-title--image">
          <img
            className="main-menu-title-sprite"
            src={getMainMenuTitleSpriteSrc(language)}
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
        </nav>
      </main>
      <a
        className="main-menu-steam-button"
        href="https://store.steampowered.com/app/1779280/"
        target="_blank"
        rel="noreferrer"
        aria-label="Wishlist on Steam"
      >
        <span className="main-menu-steam-button-text">Wishlist on</span>
        <img
          className="main-menu-steam-button-logo"
          src="./capsules/steam-removebg-preview.png"
          alt="Steam"
          draggable={false}
        />
      </a>
      <button
        type="button"
        className="main-menu-settings-button"
        onClick={() => setSettingsOpen(true)}
        aria-label={t('mainMenu.settings', language)}
      />
      <button
        type="button"
        className="main-menu-exit-button"
        onClick={handleQuit}
        aria-label={quitLabel}
      >
        ×
      </button>
      <PauseMenu isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} initialScreen="settings" />
    </div>
  );
}
