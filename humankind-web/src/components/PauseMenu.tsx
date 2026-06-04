import { useState, useEffect } from 'react';
import { useSettingsStore, getResolutionOptions, type Language, type EffectSpeed, type SpinSpeed, type ScreenMode } from '../game/state/settingsStore';
import { t } from '../i18n';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { usePreGameStore } from '../game/state/preGameStore';
import { useGameStore } from '../game/state/gameStore';
import { useRelicStore } from '../game/state/relicStore';
import { clearSavedGame } from '../game/state/saveGame';
import { clearLeaderProgress } from '../game/data/leaders';

const LANGUAGE_OPTIONS: { value: Language; labelKey: string }[] = [
    { value: 'en', labelKey: 'settings.lang.en' },
    { value: 'ko', labelKey: 'settings.lang.ko' },
    { value: 'zh', labelKey: 'settings.lang.zh' },
];

const EFFECT_SPEED_OPTIONS: { value: EffectSpeed; label: string }[] = [
    { value: '1x', label: '1x' },
    { value: '2x', label: '2x' },
    { value: '4x', label: '4x' },
    { value: 'instant', label: 'Instant' },
];

const SPIN_SPEED_OPTIONS: { value: SpinSpeed; label: string }[] = [
    { value: '1x', label: '1x' },
    { value: '2x', label: '2x' },
    { value: '4x', label: '4x' },
    { value: 'instant', label: 'Instant' },
];

const SCREEN_MODE_OPTIONS: { value: ScreenMode; labelKey: string }[] = [
    { value: 'windowed', labelKey: 'settings.screenMode.windowed' },
    { value: 'fullscreen', labelKey: 'settings.screenMode.fullscreen' },
    { value: 'borderless', labelKey: 'settings.screenMode.borderless' },
];

type SettingsTab = 'general' | 'gameplay' | 'graphics' | 'audio';

interface PauseMenuProps {
    isOpen: boolean;
    onClose: () => void;
    initialScreen?: 'main' | 'settings';
}

const PauseMenu = ({ isOpen, onClose, initialScreen = 'main' }: PauseMenuProps) => {
    const [screen, setScreen] = useState<'main' | 'settings'>(initialScreen);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const {
        resolutionWidth,
        resolutionHeight,
        language,
        effectSpeed,
        spinSpeed,
        masterVolume,
        musicVolume,
        effectVolume,
        ambientVolume,
        screenMode,
        developerMode,
        setResolution,
        setLanguage,
        setEffectSpeed,
        setSpinSpeed,
        setMasterVolume,
        setMusicVolume,
        setEffectVolume,
        setAmbientVolume,
        setScreenMode,
        setDeveloperMode,
    } = useSettingsStore();
    const returnToIntro = usePreGameStore((s) => s.returnToIntro);
    const resetPreGameProgress = usePreGameStore((s) => s.resetPreGameProgress);
    const initializeGame = useGameStore((s) => s.initializeGame);
    const resetRelics = useRelicStore((s) => s.resetRelics);

    useEffect(() => {
        if (isOpen) {
            setScreen(initialScreen);
            setIsResetConfirmOpen(false);
        }
    }, [initialScreen, isOpen]);

    useRegisterBoardTooltipBlock('pause-menu', isOpen);

    if (!isOpen) return null;

    const resOptions = getResolutionOptions();
    const currentResOption = resOptions.find(o => o.width === resolutionWidth && o.height === resolutionHeight);
    const currentResLabel = currentResOption ? currentResOption.label : `${resolutionWidth} x ${resolutionHeight}`;
    const isFillScreenMode = screenMode !== 'windowed';

    const handleResume = () => {
        setScreen('main');
        onClose();
    };

    const handleSettings = () => {
        setScreen('settings');
    };

    const handleSettingsBack = () => {
        if (isResetConfirmOpen) {
            setIsResetConfirmOpen(false);
            return;
        }
        if (initialScreen === 'settings') {
            onClose();
            return;
        }
        setScreen('main');
    };

    const handleMainMenu = () => {
        // 게임 상태 초기화 후, 프리게임 튜토리얼(데모 시작) 화면으로 복귀
        initializeGame();
        resetRelics();
        returnToIntro();
        setScreen('main');
        onClose();
    };

    const handleResetGameData = () => {
        setIsResetConfirmOpen(true);
    };

    const handleConfirmResetGameData = () => {
        clearSavedGame();
        clearLeaderProgress();
        initializeGame();
        resetRelics();
        resetPreGameProgress();
        setIsResetConfirmOpen(false);
        setScreen('main');
        onClose();
    };

    const tabs: { key: SettingsTab; labelKey: string }[] = [
        { key: 'general', labelKey: 'settings.tab.general' },
        { key: 'gameplay', labelKey: 'settings.tab.gameplay' },
        { key: 'graphics', labelKey: 'settings.tab.graphics' },
        { key: 'audio', labelKey: 'settings.tab.audio' },
    ];

    const renderVolumeRow = (labelKey: string, value: number, onChange: (volume: number) => void) => (
        <div className="settings-row">
            <div className="settings-row-label">{t(labelKey, language)}</div>
            <div className="settings-row-controls settings-row-controls--volume">
                <input
                    className="settings-volume-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(value * 100)}
                    onChange={(e) => onChange(Number(e.target.value) / 100)}
                    aria-label={t(labelKey, language)}
                />
                <div className="settings-volume-value">{Math.round(value * 100)}%</div>
            </div>
        </div>
    );

    return (
        <div className={`pause-overlay ${screen === 'settings' ? 'pause-overlay--settings' : ''}`}>
            {screen === 'main' && (
                <div className="pause-panel">
                    <div className="pause-title">{t('pause.title', language)}</div>
                    <div className="pause-menu-items">
                        <button className="pause-menu-btn" onClick={handleResume}>
                            {t('pause.resume', language)}
                        </button>
                        <button className="pause-menu-btn" onClick={handleSettings}>
                            {t('pause.settings', language)}
                        </button>
                        <button className="pause-menu-btn" onClick={handleMainMenu}>
                            {t('pause.mainMenu', language)}
                        </button>
                    </div>
                </div>
            )}

            {screen === 'settings' && (
                <div className="settings-panel">
                    <div className="settings-title">{t('settings.title', language)}</div>

                    {/* ── Tab Bar ── */}
                    <div className="settings-tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                className={`settings-tab ${activeTab === tab.key ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {t(tab.labelKey, language)}
                            </button>
                        ))}
                    </div>

                    {/* ── Tab Content ── */}
                    <div className="settings-body">

                        {/* ── Gameplay Tab ── */}
                        {activeTab === 'gameplay' && (
                            <>
                                <div className="settings-row">
                                    <div className="settings-row-label">{t('settings.spinSpeed', language)}</div>
                                    <div className="settings-row-controls">
                                        {SPIN_SPEED_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                className={`settings-seg-btn ${spinSpeed === opt.value ? 'active' : ''}`}
                                                onClick={() => setSpinSpeed(opt.value)}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="settings-row">
                                    <div className="settings-row-label">{t('settings.effectSpeed', language)}</div>
                                    <div className="settings-row-controls">
                                        {EFFECT_SPEED_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                className={`settings-seg-btn ${effectSpeed === opt.value ? 'active' : ''}`}
                                                onClick={() => setEffectSpeed(opt.value)}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Graphics Tab ── */}
                        {activeTab === 'graphics' && (
                            <>
                                <div className="settings-row">
                                    <div className="settings-row-label">{t('settings.resolution', language)}</div>
                                    <div className="settings-row-controls">
                                        <div className="settings-dropdown-wrap">
                                            <select
                                                className="settings-dropdown"
                                                value={currentResLabel}
                                                disabled={isFillScreenMode}
                                                onChange={(e) => {
                                                    const opt = resOptions.find((o) => o.label === e.target.value);
                                                    if (opt) setResolution(opt.width, opt.height);
                                                }}
                                            >
                                                {resOptions.map((opt) => (
                                                    <option key={opt.label} value={opt.label}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="settings-row">
                                    <div className="settings-row-label">{t('settings.screenMode', language)}</div>
                                    <div className="settings-row-controls">
                                        <div className="settings-dropdown-wrap">
                                            <select
                                                className="settings-dropdown"
                                                value={screenMode}
                                                onChange={(e) => setScreenMode(e.target.value as ScreenMode)}
                                            >
                                                {SCREEN_MODE_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {t(opt.labelKey, language)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── General Tab ── */}
                        {activeTab === 'general' && (
                            <>
                                <div className="settings-row">
                                    <div className="settings-row-label">{t('settings.language', language)}</div>
                                    <div className="settings-row-controls">
                                        <div className="settings-dropdown-wrap">
                                            <select
                                                className="settings-dropdown"
                                                value={language}
                                                onChange={(e) => setLanguage(e.target.value as Language)}
                                            >
                                                {LANGUAGE_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {t(opt.labelKey, language)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="settings-row">
                                    <div className="settings-row-label">{t('settings.developerMode', language)}</div>
                                    <div className="settings-row-controls">
                                        <button
                                            className={`settings-seg-btn ${!developerMode ? 'active' : ''}`}
                                            onClick={() => setDeveloperMode(false)}
                                        >
                                            {t('settings.developerMode.off', language)}
                                        </button>
                                        <button
                                            className={`settings-seg-btn ${developerMode ? 'active' : ''}`}
                                            onClick={() => setDeveloperMode(true)}
                                        >
                                            {t('settings.developerMode.on', language)}
                                        </button>
                                    </div>
                                </div>

                                <div className="settings-row settings-row--danger">
                                    <div className="settings-row-copy">
                                        <div className="settings-row-label">{t('settings.resetProgress', language)}</div>
                                        <div className="settings-row-hint">{t('settings.resetProgress.hint', language)}</div>
                                    </div>
                                    <div className="settings-row-controls">
                                        <button
                                            className="settings-danger-btn"
                                            onClick={handleResetGameData}
                                        >
                                            {t('settings.resetProgress.button', language)}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'audio' && (
                            <>
                                {renderVolumeRow('settings.masterVolume', masterVolume, setMasterVolume)}
                                {renderVolumeRow('settings.musicVolume', musicVolume, setMusicVolume)}
                                {renderVolumeRow('settings.ambientVolume', ambientVolume, setAmbientVolume)}
                                {renderVolumeRow('settings.effectVolume', effectVolume, setEffectVolume)}
                            </>
                        )}
                    </div>

                    <button className="settings-back-btn" onClick={handleSettingsBack}>
                        {t('settings.back', language)}
                    </button>

                    {isResetConfirmOpen && (
                        <div className="settings-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-reset-confirm-title">
                            <div className="settings-confirm-panel">
                                <div id="settings-reset-confirm-title" className="settings-confirm-title">
                                    {t('settings.resetProgress.confirmTitle', language)}
                                </div>
                                <div className="settings-confirm-message">
                                    {t('settings.resetProgress.confirm', language)}
                                </div>
                                <div className="settings-confirm-actions">
                                    <button
                                        className="settings-confirm-btn settings-confirm-btn--cancel"
                                        onClick={() => setIsResetConfirmOpen(false)}
                                    >
                                        {t('settings.resetProgress.cancel', language)}
                                    </button>
                                    <button
                                        className="settings-confirm-btn settings-confirm-btn--danger"
                                        onClick={handleConfirmResetGameData}
                                    >
                                        {t('settings.resetProgress.confirmButton', language)}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PauseMenu;
