import { useState } from 'react';
import { useSettingsStore, RESOLUTION_OPTIONS, type Language, type EffectSpeed, type SpinSpeed } from '../game/state/settingsStore';
import { t } from '../i18n';

const LANGUAGE_OPTIONS: { value: Language; labelKey: string }[] = [
    { value: 'en', labelKey: 'settings.lang.en' },
    { value: 'ko', labelKey: 'settings.lang.ko' },
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

type SettingsTab = 'gameplay' | 'graphics' | 'general';

interface PauseMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

const PauseMenu = ({ isOpen, onClose }: PauseMenuProps) => {
    const [screen, setScreen] = useState<'main' | 'settings'>('main');
    const [activeTab, setActiveTab] = useState<SettingsTab>('gameplay');
    const { resolutionWidth, resolutionHeight, language, effectSpeed, spinSpeed, setResolution, setLanguage, setEffectSpeed, setSpinSpeed } = useSettingsStore();

    if (!isOpen) return null;

    const currentResLabel = `${resolutionWidth} x ${resolutionHeight}`;

    const handleResume = () => {
        setScreen('main');
        onClose();
    };

    const handleSettings = () => {
        setScreen('settings');
    };

    const handleSettingsBack = () => {
        setScreen('main');
    };

    const tabs: { key: SettingsTab; labelKey: string }[] = [
        { key: 'gameplay', labelKey: 'settings.tab.gameplay' },
        { key: 'graphics', labelKey: 'settings.tab.graphics' },
        { key: 'general', labelKey: 'settings.tab.general' },
    ];

    return (
        <div className="pause-overlay">
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
                        <button className="pause-menu-btn pause-menu-btn-disabled">
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
                                                onChange={(e) => {
                                                    const opt = RESOLUTION_OPTIONS.find((o) => o.label === e.target.value);
                                                    if (opt) setResolution(opt.width, opt.height);
                                                }}
                                            >
                                                {RESOLUTION_OPTIONS.map((opt) => (
                                                    <option key={opt.label} value={opt.label}>
                                                        {opt.label}
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
                            </>
                        )}
                    </div>

                    <button className="settings-back-btn" onClick={handleSettingsBack}>
                        {t('settings.back', language)}
                    </button>
                </div>
            )}
        </div>
    );
};

export default PauseMenu;
