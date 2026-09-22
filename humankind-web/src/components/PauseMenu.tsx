import { useState, useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useSettingsStore, getResolutionOptions, type Language, type EffectSpeed, type SpinSpeed, type ScreenMode } from '../game/state/settingsStore';
import { GAME_SPEED_PRESETS, getGameSpeed, type GameSpeedPreset } from '../game/state/gameSpeed';
import { t } from '../i18n';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { usePreGameStore } from '../game/state/preGameStore';
import { useGameStore } from '../game/state/gameStore';
import { clearSavedGame } from '../game/state/saveGame';
import { clearDemoAchievementProgress } from '../game/data/demoAchievements';
import {
    KEY_BINDING_ACTIONS,
    formatKeyCode,
    isBindableKeyCode,
    type KeyBindingAction,
} from '../game/input/keyBindings';
import { HISTORY_ICON_URL } from '../uiAssetUrls';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'ko', label: '한국어' },
    { value: 'zh', label: '中文' },
    { value: 'ru', label: 'Русский' },
];

const EFFECT_SPEED_OPTIONS: { value: EffectSpeed; label: string }[] = [
    { value: '1x', label: '1x' },
    { value: '2x', label: '2x' },
    { value: '4x', label: '4x' },
    { value: '8x', label: '8x' },
];

const SPIN_SPEED_OPTIONS: { value: SpinSpeed; label: string }[] = [
    { value: '1x', label: '1x' },
    { value: '2x', label: '2x' },
    { value: '4x', label: '4x' },
    { value: '8x', label: '8x' },
];

const GAME_SPEED_OPTIONS: { value: GameSpeedPreset; label: string }[] = GAME_SPEED_PRESETS.map((speed) => ({
    value: speed,
    label: speed,
}));

type GameSpeedControlValue = GameSpeedPreset | 'custom';

const SCREEN_MODE_OPTIONS: { value: ScreenMode; labelKey: string }[] = [
    { value: 'windowed', labelKey: 'settings.screenMode.windowed' },
    { value: 'fullscreen', labelKey: 'settings.screenMode.fullscreen' },
    { value: 'borderless', labelKey: 'settings.screenMode.borderless' },
];

type SettingsTab = 'general' | 'gameplay' | 'keyBindings' | 'graphics' | 'audio';

interface PauseMenuProps {
    isOpen: boolean;
    onClose: () => void;
    initialScreen?: 'main' | 'settings';
    onOpenLog?: () => void;
}

const PauseMenu = ({ isOpen, onClose, initialScreen = 'main', onOpenLog }: PauseMenuProps) => {
    const [screen, setScreen] = useState<'main' | 'settings'>(initialScreen);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [capturingAction, setCapturingAction] = useState<KeyBindingAction | null>(null);
    const [openSettingsDropdown, setOpenSettingsDropdown] = useState<string | null>(null);
    const [settingsScrollMetrics, setSettingsScrollMetrics] = useState({
        scrollTop: 0,
        scrollHeight: 1,
        clientHeight: 1,
    });
    const settingsBodyRef = useRef<HTMLDivElement>(null);
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
        crtEffect,
        keyBindings,
        setResolution,
        setLanguage,
        setGameSpeed,
        setEffectSpeed,
        setSpinSpeed,
        setMasterVolume,
        setMusicVolume,
        setEffectVolume,
        setAmbientVolume,
        setScreenMode,
        setCrtEffect,
        setKeyBinding,
        resetKeyBindings,
    } = useSettingsStore();
    const currentGameSpeed = getGameSpeed(spinSpeed, effectSpeed);
    const currentGameSpeedRef = useRef(currentGameSpeed);
    const [isCustomSpeedMode, setIsCustomSpeedMode] = useState(currentGameSpeed === 'custom');
    const returnToIntro = usePreGameStore((s) => s.returnToIntro);
    const resetPreGameProgress = usePreGameStore((s) => s.resetPreGameProgress);
    const initializeGame = useGameStore((s) => s.initializeGame);

    currentGameSpeedRef.current = currentGameSpeed;

    useEffect(() => {
        if (isOpen) {
            setScreen(initialScreen);
            setIsResetConfirmOpen(false);
            setCapturingAction(null);
            setOpenSettingsDropdown(null);
            setIsCustomSpeedMode(currentGameSpeedRef.current === 'custom');
        }
    }, [initialScreen, isOpen]);

    useEffect(() => {
        if (!isOpen || capturingAction === null) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            if (!isBindableKeyCode(event.code)) return;

            setKeyBinding(capturingAction, event.code);
            setCapturingAction(null);
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [capturingAction, isOpen, setKeyBinding]);

    useEffect(() => {
        if (!isOpen || openSettingsDropdown === null) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest('.settings-dropdown-custom')) return;
            setOpenSettingsDropdown(null);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                setOpenSettingsDropdown(null);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, openSettingsDropdown]);

    useEffect(() => {
        if (!isOpen || screen !== 'settings' || activeTab !== 'keyBindings') return;
        const scrollEl = settingsBodyRef.current;
        if (!scrollEl) return;

        const syncScrollMetrics = () => {
            setSettingsScrollMetrics({
                scrollTop: scrollEl.scrollTop,
                scrollHeight: Math.max(1, scrollEl.scrollHeight),
                clientHeight: Math.max(1, scrollEl.clientHeight),
            });
        };

        syncScrollMetrics();
        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(syncScrollMetrics)
            : null;
        resizeObserver?.observe(scrollEl);
        return () => resizeObserver?.disconnect();
    }, [activeTab, isOpen, screen]);

    useRegisterBoardTooltipBlock('pause-menu', isOpen);

    if (!isOpen) return null;

    const resOptions = getResolutionOptions();
    const currentResOption = resOptions.find(o => o.width === resolutionWidth && o.height === resolutionHeight);
    const currentResLabel = currentResOption ? currentResOption.label : `${resolutionWidth} x ${resolutionHeight}`;
    const isFillScreenMode = screenMode !== 'windowed';
    const gameSpeed: GameSpeedControlValue = isCustomSpeedMode || currentGameSpeed === 'custom'
        ? 'custom'
        : currentGameSpeed;
    const customSpeedControlsEnabled = gameSpeed === 'custom';
    const keyBindingsCanScroll = settingsScrollMetrics.scrollHeight > settingsScrollMetrics.clientHeight + 1;
    const keyBindingsScrollRange = Math.max(
        1,
        settingsScrollMetrics.scrollHeight - settingsScrollMetrics.clientHeight,
    );
    const keyBindingsScrollbarThumbHeight = keyBindingsCanScroll
        ? Math.max(12, (settingsScrollMetrics.clientHeight / settingsScrollMetrics.scrollHeight) * 100)
        : 100;
    const keyBindingsScrollbarThumbTop = keyBindingsCanScroll
        ? (settingsScrollMetrics.scrollTop / keyBindingsScrollRange) * (100 - keyBindingsScrollbarThumbHeight)
        : 0;

    const handleResume = () => {
        setScreen('main');
        onClose();
    };

    const handleOpenLog = () => {
        onClose();
        onOpenLog?.();
    };

    const handleSettings = () => {
        setScreen('settings');
    };

    const handleSettingsBack = () => {
        setCapturingAction(null);
        setOpenSettingsDropdown(null);
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
        returnToIntro();
        setScreen('main');
        onClose();
    };

    const handleResetGameData = () => {
        setIsResetConfirmOpen(true);
    };

    const handleConfirmResetGameData = () => {
        clearSavedGame();
        clearDemoAchievementProgress();
        initializeGame();
        resetPreGameProgress();
        setIsResetConfirmOpen(false);
        setScreen('main');
        onClose();
    };

    const handleGameSpeedChange = (speed: GameSpeedControlValue) => {
        if (speed === 'custom') {
            setIsCustomSpeedMode(true);
            return;
        }

        setIsCustomSpeedMode(false);
        setGameSpeed(speed);
    };

    const renderSettingsDropdown = <TValue extends string>(
        id: string,
        labelKey: string,
        value: TValue,
        options: { value: TValue; label: string }[],
        onChange: (value: TValue) => void,
        disabled = false,
        displayValue?: string,
    ) => {
        const selectedLabel = displayValue ?? options.find((opt) => opt.value === value)?.label ?? value;
        const isOpenDropdown = openSettingsDropdown === id;

        return (
            <div className="settings-row">
                <div className="settings-row-label">{t(labelKey, language)}</div>
                <div className="settings-row-controls">
                    <div className={`settings-dropdown-custom ${isOpenDropdown ? 'settings-dropdown-custom--open' : ''}`}>
                        <button
                            type="button"
                            className="settings-dropdown-trigger"
                            disabled={disabled}
                            aria-haspopup="listbox"
                            aria-expanded={isOpenDropdown}
                            aria-label={t(labelKey, language)}
                            onClick={() => setOpenSettingsDropdown((current) => current === id ? null : id)}
                        >
                            <span className="settings-dropdown-trigger-label">{selectedLabel}</span>
                            <span className="settings-dropdown-trigger-icon" aria-hidden="true" />
                        </button>
                        {isOpenDropdown && !disabled && (
                            <div className="settings-dropdown-menu" role="listbox" aria-label={t(labelKey, language)}>
                                {options.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`settings-dropdown-option ${opt.value === value ? 'settings-dropdown-option--selected' : ''}`}
                                        role="option"
                                        aria-selected={opt.value === value}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setOpenSettingsDropdown(null);
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const tabs: { key: SettingsTab; labelKey: string }[] = [
        { key: 'general', labelKey: 'settings.tab.general' },
        { key: 'gameplay', labelKey: 'settings.tab.gameplay' },
        { key: 'keyBindings', labelKey: 'settings.tab.keyBindings' },
        { key: 'graphics', labelKey: 'settings.tab.graphics' },
        { key: 'audio', labelKey: 'settings.tab.audio' },
    ];

    const changeVolumeFromPointer = (
        event: ReactPointerEvent<HTMLDivElement>,
        onChange: (volume: number) => void,
    ) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const next = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        onChange(next);
    };

    const scrollKeyBindingsFromTrack = (event: ReactPointerEvent<HTMLDivElement>) => {
        const scrollEl = settingsBodyRef.current;
        if (!scrollEl) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
        scrollEl.scrollTop = ratio * (scrollEl.scrollHeight - scrollEl.clientHeight);
        setSettingsScrollMetrics({
            scrollTop: scrollEl.scrollTop,
            scrollHeight: Math.max(1, scrollEl.scrollHeight),
            clientHeight: Math.max(1, scrollEl.clientHeight),
        });
    };

    const syncKeyBindingsScrollMetrics = (scrollEl: HTMLDivElement) => {
        setSettingsScrollMetrics({
            scrollTop: scrollEl.scrollTop,
            scrollHeight: Math.max(1, scrollEl.scrollHeight),
            clientHeight: Math.max(1, scrollEl.clientHeight),
        });
    };

    const renderVolumeRow = (labelKey: string, value: number, onChange: (volume: number) => void) => (
        <div className="settings-row">
            <div className="settings-row-label">{t(labelKey, language)}</div>
            <div className="settings-row-controls settings-row-controls--volume">
                <div
                    className="settings-volume-slider"
                    role="slider"
                    tabIndex={0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(value * 100)}
                    aria-label={t(labelKey, language)}
                    style={{ '--settings-volume-fill': `${Math.round(value * 100)}%` } as CSSProperties}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        changeVolumeFromPointer(event, onChange);
                    }}
                    onPointerMove={(event) => {
                        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                        changeVolumeFromPointer(event, onChange);
                    }}
                    onPointerUp={(event) => {
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                            event.currentTarget.releasePointerCapture(event.pointerId);
                        }
                    }}
                    onKeyDown={(event) => {
                        const step = event.shiftKey ? 0.1 : 0.05;
                        if (event.code === 'ArrowLeft' || event.code === 'ArrowDown') {
                            event.preventDefault();
                            onChange(Math.max(0, value - step));
                        } else if (event.code === 'ArrowRight' || event.code === 'ArrowUp') {
                            event.preventDefault();
                            onChange(Math.min(1, value + step));
                        } else if (event.code === 'Home') {
                            event.preventDefault();
                            onChange(0);
                        } else if (event.code === 'End') {
                            event.preventDefault();
                            onChange(1);
                        }
                    }}
                >
                    <div className="settings-volume-slider-track" />
                    <div className="settings-volume-slider-fill" />
                    <div className="settings-volume-slider-thumb" />
                </div>
                <div className="settings-volume-value">{Math.round(value * 100)}%</div>
            </div>
        </div>
    );

    const renderSpeedStepper = <TValue extends string>(
        labelKey: string,
        value: TValue,
        options: { value: TValue; label: string }[],
        onChange: (value: TValue) => void,
        disabled = false,
    ) => (
        <div className="settings-row">
            <div className="settings-row-label">{t(labelKey, language)}</div>
            <div className="settings-row-controls">
                <div className={`settings-stepper ${disabled ? 'settings-stepper--disabled' : ''}`}>
                    <button
                        type="button"
                        className="settings-stepper-btn"
                        disabled={disabled}
                        onClick={() => {
                            const currentIndex = Math.max(0, options.findIndex((opt) => opt.value === value));
                            const nextIndex = (currentIndex - 1 + options.length) % options.length;
                            onChange(options[nextIndex].value);
                        }}
                        aria-label={`${t(labelKey, language)} previous`}
                    >
                        {'<'}
                    </button>
                    <div className="settings-stepper-value">
                        {options.find((opt) => opt.value === value)?.label ?? value}
                    </div>
                    <button
                        type="button"
                        className="settings-stepper-btn"
                        disabled={disabled}
                        onClick={() => {
                            const currentIndex = Math.max(0, options.findIndex((opt) => opt.value === value));
                            const nextIndex = (currentIndex + 1) % options.length;
                            onChange(options[nextIndex].value);
                        }}
                        aria-label={`${t(labelKey, language)} next`}
                    >
                        {'>'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`pause-overlay ${screen === 'settings' ? 'pause-overlay--settings' : ''}`}>
            {onOpenLog && screen === 'main' && (
                <button
                    type="button"
                    className="pause-log-btn"
                    onClick={handleOpenLog}
                    aria-label={t('pause.log', language)}
                >
                    <img src={HISTORY_ICON_URL} alt="" draggable={false} style={{ imageRendering: 'pixelated' }} />
                    <span>{t('pause.log', language)}</span>
                </button>
            )}
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
                <div
                    className="settings-panel"
                    onWheel={(event) => {
                        if (activeTab !== 'keyBindings') return;
                        const scrollEl = settingsBodyRef.current;
                        if (!scrollEl || scrollEl.contains(event.target as Node)) return;
                        if (scrollEl.scrollHeight <= scrollEl.clientHeight + 1) return;
                        scrollEl.scrollTop += event.deltaY;
                        syncKeyBindingsScrollMetrics(scrollEl);
                    }}
                >
                    <div className="settings-title">{t('settings.title', language)}</div>

                    {/* ── Tab Bar ── */}
                    <div className="settings-tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                className={`settings-tab ${activeTab === tab.key ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab(tab.key);
                                    setCapturingAction(null);
                                    setOpenSettingsDropdown(null);
                                }}
                            >
                                {t(tab.labelKey, language)}
                            </button>
                        ))}
                    </div>

                    {/* ── Tab Content ── */}
                    <div
                        ref={settingsBodyRef}
                        className={`settings-body ${activeTab === 'keyBindings' ? 'settings-body--key-bindings' : ''}`}
                        onScroll={(event) => {
                            if (activeTab !== 'keyBindings') return;
                            const scrollEl = event.currentTarget;
                            syncKeyBindingsScrollMetrics(scrollEl);
                        }}
                    >

                        {/* ── Gameplay Tab ── */}
                        {activeTab === 'gameplay' && (
                            <>
                                {renderSpeedStepper<GameSpeedControlValue>(
                                    'settings.gameSpeed',
                                    gameSpeed,
                                    [
                                        ...GAME_SPEED_OPTIONS,
                                        { value: 'custom', label: t('settings.gameSpeed.custom', language) },
                                    ],
                                    handleGameSpeedChange,
                                )}

                                {renderSpeedStepper(
                                    'settings.spinSpeed',
                                    spinSpeed,
                                    SPIN_SPEED_OPTIONS,
                                    setSpinSpeed,
                                    !customSpeedControlsEnabled,
                                )}

                                {renderSpeedStepper(
                                    'settings.effectSpeed',
                                    effectSpeed,
                                    EFFECT_SPEED_OPTIONS,
                                    setEffectSpeed,
                                    !customSpeedControlsEnabled,
                                )}
                            </>
                        )}

                        {/* ── Graphics Tab ── */}
                        {activeTab === 'graphics' && (
                            <>
                                {renderSettingsDropdown(
                                    'resolution',
                                    'settings.resolution',
                                    currentResLabel,
                                    resOptions.map((opt) => ({ value: opt.label, label: opt.label })),
                                    (label) => {
                                        const opt = resOptions.find((option) => option.label === label);
                                        if (opt) setResolution(opt.width, opt.height);
                                    },
                                    isFillScreenMode,
                                    currentResLabel,
                                )}

                                {renderSettingsDropdown(
                                    'screen-mode',
                                    'settings.screenMode',
                                    screenMode,
                                    SCREEN_MODE_OPTIONS.map((opt) => ({
                                        value: opt.value,
                                        label: t(opt.labelKey, language),
                                    })),
                                    setScreenMode,
                                )}

                                <div className="settings-row">
                                    <div className="settings-row-label">{t('settings.crtEffect', language)}</div>
                                    <div className="settings-row-controls">
                                        <button
                                            className={`settings-seg-btn ${!crtEffect ? 'active' : ''}`}
                                            onClick={() => setCrtEffect(false)}
                                        >
                                            {t('settings.crtEffect.off', language)}
                                        </button>
                                        <button
                                            className={`settings-seg-btn ${crtEffect ? 'active' : ''}`}
                                            onClick={() => setCrtEffect(true)}
                                        >
                                            {t('settings.crtEffect.on', language)}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'keyBindings' && (
                            <div className="settings-key-bindings">
                                <div className="settings-key-bindings-hint">
                                    {t('settings.keyBindings.hint', language)}
                                </div>
                                {KEY_BINDING_ACTIONS.map((action) => (
                                    <div className="settings-row settings-key-binding-row" key={action}>
                                        <div className="settings-row-label">
                                            {t(`settings.keyBindings.action.${action}`, language)}
                                        </div>
                                        <button
                                            type="button"
                                            className={`settings-key-bind-btn ${capturingAction === action ? 'is-capturing' : ''}`}
                                            onClick={() => setCapturingAction((current) => current === action ? null : action)}
                                        >
                                            {capturingAction === action
                                                ? t('settings.keyBindings.pressKey', language)
                                                : formatKeyCode(keyBindings[action])}
                                        </button>
                                    </div>
                                ))}
                                <div className="settings-key-bindings-footer">
                                    <button
                                        type="button"
                                        className="settings-key-bindings-reset"
                                        onClick={() => {
                                            resetKeyBindings();
                                            setCapturingAction(null);
                                        }}
                                    >
                                        {t('settings.keyBindings.reset', language)}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── General Tab ── */}
                        {activeTab === 'general' && (
                            <>
                                {renderSettingsDropdown(
                                    'language',
                                    'settings.language',
                                    language,
                                    LANGUAGE_OPTIONS,
                                    setLanguage,
                                )}

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

                    {activeTab === 'keyBindings' && keyBindingsCanScroll && (
                        <div
                            className="settings-key-bindings-scrollbar"
                            aria-hidden="true"
                            onPointerDown={(event) => {
                                event.currentTarget.setPointerCapture(event.pointerId);
                                scrollKeyBindingsFromTrack(event);
                            }}
                            onPointerMove={(event) => {
                                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                                scrollKeyBindingsFromTrack(event);
                            }}
                            onPointerUp={(event) => {
                                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                    event.currentTarget.releasePointerCapture(event.pointerId);
                                }
                            }}
                        >
                            <div
                                className="settings-key-bindings-scrollbar-thumb"
                                style={{
                                    top: `${keyBindingsScrollbarThumbTop}%`,
                                    height: `${keyBindingsScrollbarThumbHeight}%`,
                                }}
                            />
                        </div>
                    )}

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
