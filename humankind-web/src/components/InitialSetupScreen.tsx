import { useEffect, useRef, useState } from 'react';
import {
  GAME_SPEED_PRESETS,
  getGameSpeed,
  type GameSpeedPreset,
} from '../game/state/gameSpeed';
import { useSettingsStore, type Language } from '../game/state/settingsStore';
import { t } from '../i18n';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '简体中文' },
  { value: 'ru', label: 'Русский' },
];

interface InitialSetupScreenProps {
  onComplete: () => void;
}

export default function InitialSetupScreen({ onComplete }: InitialSetupScreenProps) {
  const [step, setStep] = useState<'language' | 'gameSpeed'>('language');
  const [isFinishing, setIsFinishing] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(() => (
    LANGUAGE_OPTIONS.some((option) => option.value === useSettingsStore.getState().language)
      ? useSettingsStore.getState().language
      : 'en'
  ));
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const languageTriggerRef = useRef<HTMLButtonElement>(null);
  const languageOptionRefs = useRef<Partial<Record<Language, HTMLButtonElement | null>>>({});
  const {
    language,
    effectSpeed,
    spinSpeed,
    setLanguage,
    setGameSpeed,
  } = useSettingsStore();
  const gameSpeed = getGameSpeed(spinSpeed, effectSpeed);
  const [selectedGameSpeed, setSelectedGameSpeed] = useState<GameSpeedPreset>(
    gameSpeed === 'custom' ? '1x' : gameSpeed,
  );
  const selectedLanguageOption = LANGUAGE_OPTIONS.find((option) => option.value === selectedLanguage)
    ?? LANGUAGE_OPTIONS[0];

  useEffect(() => {
    if (!languageMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [languageMenuOpen]);

  useEffect(() => {
    if (languageMenuOpen) {
      languageOptionRefs.current[selectedLanguage]?.focus();
    }
  }, [languageMenuOpen, selectedLanguage]);

  const handleLanguageConfirm = () => {
    setLanguage(selectedLanguage);
    setStep('gameSpeed');
  };

  const handleLanguageSelect = (nextLanguage: Language) => {
    setSelectedLanguage(nextLanguage);
    setLanguageMenuOpen(false);
    languageTriggerRef.current?.focus();
  };

  const focusLanguageOption = (direction: 1 | -1) => {
    const currentIndex = LANGUAGE_OPTIONS.findIndex((option) => option.value === selectedLanguage);
    const nextIndex = (currentIndex + direction + LANGUAGE_OPTIONS.length) % LANGUAGE_OPTIONS.length;
    const nextLanguage = LANGUAGE_OPTIONS[nextIndex].value;
    setSelectedLanguage(nextLanguage);
    languageOptionRefs.current[nextLanguage]?.focus();
  };

  const handleGameSpeedConfirm = () => {
    if (isFinishing) return;

    setGameSpeed(selectedGameSpeed);
    setIsFinishing(true);
    window.setTimeout(() => {
      onComplete();
    }, 140);
  };

  return (
    <div
      className={`initial-setup-root${isFinishing ? ' is-finishing' : ''}`}
      data-lang={step === 'language' ? selectedLanguage : language}
    >
      <section
        className="initial-setup-panel"
        aria-labelledby="initial-setup-title"
      >
        <div className="initial-setup-progress" aria-hidden="true">
          {step === 'language' ? '1 / 2' : '2 / 2'}
        </div>

        {step === 'language' ? (
          <>
            <h1 id="initial-setup-title" className="initial-setup-title">
              {t('initialSetup.language.title', selectedLanguage)}
            </h1>
            <div className="initial-setup-language-form">
              <div
                ref={languageMenuRef}
                className={`initial-setup-language-picker${languageMenuOpen ? ' is-open' : ''}`}
              >
                <button
                  ref={languageTriggerRef}
                  type="button"
                  className="initial-setup-language-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={languageMenuOpen}
                  aria-controls="initial-setup-language-options"
                  onClick={() => setLanguageMenuOpen((open) => !open)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      setLanguageMenuOpen(true);
                    }
                  }}
                >
                  <span
                    className="initial-setup-language-label"
                    lang={selectedLanguage === 'zh' ? 'zh-CN' : selectedLanguage}
                  >
                    {selectedLanguageOption.label}
                  </span>
                  <span className="initial-setup-language-chevron" aria-hidden="true" />
                </button>

                {languageMenuOpen ? (
                  <div
                    id="initial-setup-language-options"
                    className="initial-setup-language-menu"
                    role="listbox"
                    aria-label="Language"
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <button
                        ref={(element) => {
                          languageOptionRefs.current[option.value] = element;
                        }}
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={selectedLanguage === option.value}
                        className={`initial-setup-language-option${selectedLanguage === option.value ? ' is-selected' : ''}`}
                        onClick={() => handleLanguageSelect(option.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            focusLanguageOption(1);
                          } else if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            focusLanguageOption(-1);
                          } else if (event.key === 'Escape') {
                            event.preventDefault();
                            setLanguageMenuOpen(false);
                            languageTriggerRef.current?.focus();
                          }
                        }}
                        lang={option.value === 'zh' ? 'zh-CN' : option.value}
                      >
                        <span className="initial-setup-language-label">{option.label}</span>
                        <span className="initial-setup-language-check" aria-hidden="true">
                          {selectedLanguage === option.value ? '✓' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="initial-setup-continue"
                onClick={handleLanguageConfirm}
              >
                {t('initialSetup.next', selectedLanguage)}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 id="initial-setup-title" className="initial-setup-title">
              {t('initialSetup.gameSpeed.title', language)}
            </h1>
            <p className="initial-setup-description">
              {t('initialSetup.gameSpeed.description', language)}
            </p>
            <div className="initial-setup-options initial-setup-options--speeds">
              {GAME_SPEED_PRESETS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  className={`initial-setup-option${selectedGameSpeed === speed ? ' active' : ''}`}
                  onClick={() => setSelectedGameSpeed(speed)}
                >
                  {speed}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="initial-setup-continue"
              onClick={handleGameSpeedConfirm}
              disabled={isFinishing}
            >
              {t('initialSetup.next', language)}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
