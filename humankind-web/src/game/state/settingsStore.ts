import { create } from 'zustand';
import { audioManager } from '../../audio/audioManager';

export type Language = 'en' | 'ko' | 'zh';
export type EffectSpeed = '1x' | '2x' | '4x' | 'instant';
export type SpinSpeed = '1x' | '2x' | '4x' | 'instant';
export type ScreenMode = 'windowed' | 'fullscreen' | 'borderless';

const SETTINGS_KEY = 'humankind.settings.v1';
const SETTINGS_VERSION = 1;

/** 효과 속도별 슬롯 간 딜레이(ms) */
export const EFFECT_SPEED_DELAY: Record<EffectSpeed, number> = {
    '1x': 300,
    '2x': 150,
    '4x': 75,
    'instant': 0,
};

/** 전투 바운스 애니메이션 지속시간(ms) — 효과 속도에 비례 */
export const COMBAT_BOUNCE_DURATION: Record<EffectSpeed, number> = {
    '1x': 300,
    '2x': 150,
    '4x': 75,
    'instant': 0,
};

/** 스핀 속도 설정: { speed 배수, stopInterval(ms) } */
export const SPIN_SPEED_CONFIG: Record<SpinSpeed, { speedMul: number; stopInterval: number }> = {
    '1x': { speedMul: 3.6, stopInterval: 50 },
    '2x': { speedMul: 6, stopInterval: 50 },
    '4x': { speedMul: 10, stopInterval: 50 },
    'instant': { speedMul: 0, stopInterval: 0 },
};

export interface ResolutionOption {
    label: string;
    width: number;
    height: number;
}

/**
 * 사용자 모니터 해상도 기반으로 같은 비율의 해상도 옵션 생성
 * 최대 = 모니터 해상도, 100% ~ 50% 단위로
 */
export function getResolutionOptions(): ResolutionOption[] {
    const sw = window.screen.width;
    const sh = window.screen.height;

    const percentages = [100, 85, 75, 65, 50];
    return percentages.map(pct => {
        const w = Math.round(sw * pct / 100);
        const h = Math.round(sh * pct / 100);
        return { label: `${w} x ${h} (${pct}%)`, width: w, height: h };
    });
}

// 초기 해상도: 모니터의 75%
const _initW = Math.round(window.screen.width * 0.75);
const _initH = Math.round(window.screen.height * 0.75);

/** 기준 해상도 (모든 UI는 이 해상도 기준 px로 작성) */
export const BASE_WIDTH = 1920;
export const BASE_HEIGHT = 1080;

export interface SettingsState {
    resolutionWidth: number;
    resolutionHeight: number;
    language: Language;
    effectSpeed: EffectSpeed;
    spinSpeed: SpinSpeed;
    masterVolume: number;
    musicVolume: number;
    effectVolume: number;
    ambientVolume: number;
    screenMode: ScreenMode;
    developerMode: boolean;

    setResolution: (width: number, height: number) => void;
    setLanguage: (lang: Language) => void;
    setEffectSpeed: (speed: EffectSpeed) => void;
    setSpinSpeed: (speed: SpinSpeed) => void;
    setMasterVolume: (volume: number) => void;
    setMusicVolume: (volume: number) => void;
    setEffectVolume: (volume: number) => void;
    setAmbientVolume: (volume: number) => void;
    setScreenMode: (mode: ScreenMode) => void;
    setDeveloperMode: (enabled: boolean) => void;
}

type PersistedSettings = Pick<
    SettingsState,
    | 'resolutionWidth'
    | 'resolutionHeight'
    | 'language'
    | 'effectSpeed'
    | 'spinSpeed'
    | 'masterVolume'
    | 'musicVolume'
    | 'effectVolume'
    | 'ambientVolume'
    | 'screenMode'
    | 'developerMode'
>;

interface SavedSettings {
    version: typeof SETTINGS_VERSION;
    savedAt: number;
    settings: PersistedSettings;
}

const defaultSettings: PersistedSettings = {
    resolutionWidth: _initW,
    resolutionHeight: _initH,
    language: 'en',
    effectSpeed: '1x',
    spinSpeed: '2x',
    masterVolume: 1,
    musicVolume: 1,
    effectVolume: 1,
    ambientVolume: 1,
    screenMode: 'windowed',
    developerMode: false,
};

const storage = (): Storage | null => {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
};

const hasSavedSettings = () => storage()?.getItem(SETTINGS_KEY) != null;

const isLanguage = (value: unknown): value is Language => value === 'en' || value === 'ko' || value === 'zh';
const isEffectSpeed = (value: unknown): value is EffectSpeed =>
    value === '1x' || value === '2x' || value === '4x' || value === 'instant';
const isSpinSpeed = (value: unknown): value is SpinSpeed =>
    value === '1x' || value === '2x' || value === '4x' || value === 'instant';
const isScreenMode = (value: unknown): value is ScreenMode =>
    value === 'windowed' || value === 'fullscreen' || value === 'borderless';

const sanitizeDimension = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;

function mapLocaleToLanguage(locale: string | null | undefined): Language | null {
    if (!locale) return null;
    const normalized = locale.trim().toLowerCase().replace('_', '-');
    if (normalized.startsWith('ko')) return 'ko';
    if (normalized.startsWith('zh') || normalized.includes('chinese')) return 'zh';
    if (normalized.startsWith('en') || normalized === 'english') return 'en';
    if (normalized === 'koreana' || normalized === 'korean') return 'ko';
    if (normalized === 'schinese' || normalized === 'tchinese') return 'zh';
    return null;
}

function getBrowserLanguage(): Language {
    const locales = [
        ...(Array.isArray(globalThis.navigator?.languages) ? globalThis.navigator.languages : []),
        globalThis.navigator?.language,
    ];
    for (const locale of locales) {
        const language = mapLocaleToLanguage(locale);
        if (language) return language;
    }
    return defaultSettings.language;
}

function loadSettings(): PersistedSettings {
    const raw = storage()?.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings, language: getBrowserLanguage() };

    try {
        const save = JSON.parse(raw) as Partial<SavedSettings>;
        if (save.version !== SETTINGS_VERSION || save.settings == null) return defaultSettings;

        const legacyFullscreen = (save.settings as { fullscreen?: unknown }).fullscreen;

        return {
            resolutionWidth: sanitizeDimension(save.settings.resolutionWidth, defaultSettings.resolutionWidth),
            resolutionHeight: sanitizeDimension(save.settings.resolutionHeight, defaultSettings.resolutionHeight),
            language: isLanguage(save.settings.language) ? save.settings.language : defaultSettings.language,
            effectSpeed: isEffectSpeed(save.settings.effectSpeed) ? save.settings.effectSpeed : defaultSettings.effectSpeed,
            spinSpeed: isSpinSpeed(save.settings.spinSpeed) ? save.settings.spinSpeed : defaultSettings.spinSpeed,
            masterVolume: clampVolume(save.settings.masterVolume),
            musicVolume: clampVolume(save.settings.musicVolume),
            effectVolume: clampVolume(save.settings.effectVolume),
            ambientVolume: clampVolume(save.settings.ambientVolume ?? defaultSettings.ambientVolume),
            screenMode: isScreenMode(save.settings.screenMode)
                ? save.settings.screenMode
                : legacyFullscreen === true
                    ? 'fullscreen'
                    : defaultSettings.screenMode,
            developerMode: typeof save.settings.developerMode === 'boolean'
                ? save.settings.developerMode
                : defaultSettings.developerMode,
        };
    } catch {
        return { ...defaultSettings, language: getBrowserLanguage() };
    }
}

function saveSettings(state: PersistedSettings): void {
    const store = storage();
    if (!store) return;

    const save: SavedSettings = {
        version: SETTINGS_VERSION,
        savedAt: Date.now(),
        settings: {
            resolutionWidth: state.resolutionWidth,
            resolutionHeight: state.resolutionHeight,
            language: state.language,
            effectSpeed: state.effectSpeed,
            spinSpeed: state.spinSpeed,
            masterVolume: state.masterVolume,
            musicVolume: state.musicVolume,
            effectVolume: state.effectVolume,
            ambientVolume: state.ambientVolume,
            screenMode: state.screenMode,
            developerMode: state.developerMode,
        },
    };

    store.setItem(SETTINGS_KEY, JSON.stringify(save));
}

const initialSettings = loadSettings();

export const useSettingsStore = create<SettingsState>((set) => ({
    ...initialSettings,

    setResolution: (width, height) => {
        set((state) => {
            const next = { ...state, resolutionWidth: width, resolutionHeight: height };
            saveSettings(next);
            return { resolutionWidth: width, resolutionHeight: height };
        });
        applyResolutionToDOM(width, height);
    },

    setLanguage: (lang) => {
        set((state) => {
            const next = { ...state, language: lang };
            saveSettings(next);
            return { language: lang };
        });
        applyLanguageToDOM(lang);
    },

    setEffectSpeed: (speed) => {
        set((state) => {
            const next = { ...state, effectSpeed: speed };
            saveSettings(next);
            return { effectSpeed: speed };
        });
    },

    setSpinSpeed: (speed) => {
        set((state) => {
            const next = { ...state, spinSpeed: speed };
            saveSettings(next);
            return { spinSpeed: speed };
        });
    },

    setMasterVolume: (volume) => {
        const clamped = clampVolume(volume);
        set((state) => {
            const next = { ...state, masterVolume: clamped };
            saveSettings(next);
            return { masterVolume: clamped };
        });
        audioManager.setMasterVolume(clamped);
    },

    setMusicVolume: (volume) => {
        const clamped = clampVolume(volume);
        set((state) => {
            const next = { ...state, musicVolume: clamped };
            saveSettings(next);
            return { musicVolume: clamped };
        });
        audioManager.setMusicVolume(clamped);
    },

    setEffectVolume: (volume) => {
        const clamped = clampVolume(volume);
        set((state) => {
            const next = { ...state, effectVolume: clamped };
            saveSettings(next);
            return { effectVolume: clamped };
        });
        audioManager.setEffectVolume(clamped);
    },

    setAmbientVolume: (volume) => {
        const clamped = clampVolume(volume);
        set((state) => {
            const next = { ...state, ambientVolume: clamped };
            saveSettings(next);
            return { ambientVolume: clamped };
        });
        audioManager.setAmbientVolume(clamped);
    },

    setScreenMode: (mode) => {
        set((state) => {
            const next = { ...state, screenMode: mode };
            saveSettings(next);
            return { screenMode: mode };
        });
        applyScreenModeToDOM(mode);
    },

    setDeveloperMode: (enabled) => {
        set((state) => {
            const next = { ...state, developerMode: enabled };
            saveSettings(next);
            return { developerMode: enabled };
        });
    },
}));

function clampVolume(value: number) {
    return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

// ─── 전체화면 상태 추적 ───
let _fillsScreen = initialSettings.screenMode !== 'windowed';

function syncScreenModeState() {
    if (document.fullscreenElement) {
        _fillsScreen = true;
        persistScreenModeState('fullscreen');
        applyRootScale();
        return;
    }
    import('@tauri-apps/api/core').then(({ isTauri }) => {
        if (isTauri()) {
            import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
                const win = getCurrentWindow();
                Promise.all([win.isFullscreen(), win.isDecorated()]).then(([isFull, isDecorated]) => {
                    const mode: ScreenMode = isFull
                        ? isDecorated ? 'fullscreen' : 'borderless'
                        : !isDecorated ? 'borderless' : 'windowed';
                    _fillsScreen = mode !== 'windowed';
                    persistScreenModeState(mode);
                    applyRootScale();
                });
            }).catch(() => { });
        } else {
            _fillsScreen = false;
            persistScreenModeState('windowed');
            applyRootScale();
        }
    }).catch(() => {
        _fillsScreen = false;
        persistScreenModeState('windowed');
        applyRootScale();
    });
}

/**
 * #root 스케일 적용
 *
 * uniformScale = min(resW / 1920, resH / 1080)
 * virtualW = resW / uniformScale,  virtualH = resH / uniformScale
 * #root 내부 좌표 공간 = virtualW × virtualH
 * CSS transform: scale(uniformScale) → 시각적 크기 = resW × resH
 *
 * 전체화면: scale(monW / virtualW, monH / virtualH) → 모니터에 늘여서 채움
 */
function applyRootScale() {
    const root = document.getElementById('root');
    if (!root) return;

    const { resolutionWidth: resW, resolutionHeight: resH } = useSettingsStore.getState();

    const uniformScale = Math.min(resW / BASE_WIDTH, resH / BASE_HEIGHT);
    const virtualW = resW / uniformScale;
    const virtualH = resH / uniformScale;

    root.style.width = `${virtualW}px`;
    root.style.height = `${virtualH}px`;

    if (_fillsScreen) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const fsScaleX = vw / virtualW;
        const fsScaleY = vh / virtualH;
        root.style.transform = `translate(-50%, -50%) scale(${fsScaleX}, ${fsScaleY})`;
    } else {
        // 실제 뷰포트 기반 스케일 (타이틀바 등 고려)
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const fitScale = Math.min(vw / virtualW, vh / virtualH);
        root.style.transform = `translate(-50%, -50%) scale(${fitScale})`;
    }
}

// 리사이즈 / 전체화면 이벤트
window.addEventListener('resize', () => syncScreenModeState());
document.addEventListener('fullscreenchange', () => {
    _fillsScreen = !!document.fullscreenElement;
    persistScreenModeState(_fillsScreen ? 'fullscreen' : 'windowed');
    applyRootScale();
});

/** 해상도 설정 변경 시 Tauri 윈도우 크기 변경 + 스케일 재계산 */
function applyResolutionToDOM(width: number, height: number) {
    import('@tauri-apps/api/core').then(({ isTauri }) => {
        if (isTauri()) {
            import('@tauri-apps/api/window').then(({ getCurrentWindow, LogicalSize }) => {
                const win = getCurrentWindow();
                const setWinSize = async () => {
                    if (useSettingsStore.getState().screenMode !== 'windowed') return;
                    const isFull = await win.isFullscreen();
                    const isDecorated = await win.isDecorated();
                    const isMaximized = await win.isMaximized();
                    if (!isFull && (isDecorated || !isMaximized)) {
                        await win.setSize(new LogicalSize(width, height));
                    }
                };
                setWinSize().catch(console.error);
            }).catch(console.error);
        }
    }).catch(console.error);

    scheduleFrame(() => applyRootScale());
}

function applyScreenModeToDOM(mode: ScreenMode) {
    import('@tauri-apps/api/core').then(({ isTauri }) => {
        if (isTauri()) {
            import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
                const win = getCurrentWindow();
                const apply = async () => {
                    if (mode === 'fullscreen') {
                        await win.setDecorations(true);
                        await win.setFullscreen(true);
                        return;
                    }

                    await win.setFullscreen(false);

                    if (mode === 'borderless') {
                        if (await win.isMaximized()) {
                            await win.unmaximize();
                        }
                        await win.setDecorations(false);
                        await win.setFullscreen(true);
                        return;
                    }

                    await win.setDecorations(true);
                    if (await win.isMaximized()) {
                        await win.unmaximize();
                    }
                    const { resolutionWidth, resolutionHeight } = useSettingsStore.getState();
                    const { LogicalSize } = await import('@tauri-apps/api/window');
                    await win.setSize(new LogicalSize(resolutionWidth, resolutionHeight));
                    await win.center();
                };
                apply()
                    .then(() => {
                        _fillsScreen = mode !== 'windowed';
                        persistScreenModeState(mode);
                        applyRootScale();
                    })
                    .catch(console.error);
            }).catch(console.error);
            return;
        }

        if (mode === 'fullscreen' || mode === 'borderless') {
            document.documentElement.requestFullscreen()
                .then(() => {
                    _fillsScreen = true;
                    persistScreenModeState(mode === 'borderless' ? 'fullscreen' : mode);
                    applyRootScale();
                })
                .catch(console.error);
            return;
        }

        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen()
                .then(() => {
                    _fillsScreen = false;
                    persistScreenModeState('windowed');
                    applyRootScale();
                })
                .catch(console.error);
            return;
        }

        _fillsScreen = false;
        persistScreenModeState('windowed');
        applyRootScale();
    }).catch(console.error);
}

function persistScreenModeState(screenMode: ScreenMode) {
    const state = useSettingsStore.getState();
    if (state.screenMode === screenMode) return;

    const next = { ...state, screenMode };
    saveSettings(next);
    useSettingsStore.setState({ screenMode });
}

/** #root에 data-lang 속성 설정 (CSS 폰트 전환용) */
function applyLanguageToDOM(lang: Language) {
    const root = document.getElementById('root');
    if (!root) return;
    root.setAttribute('data-lang', lang);
    const fontFamily = lang === 'zh' ? 'Noto Sans SC' : 'Mulmaru';
    document.fonts?.load(`16px "${fontFamily}"`).catch(() => {});
}

async function initializeLanguageFromSteam(): Promise<void> {
    if (hasSavedSettings()) return;

    try {
        const { invoke } = await import('@tauri-apps/api/core');
        const steamLanguage = await invoke<string | null>('get_steam_game_language');
        const language = mapLocaleToLanguage(steamLanguage);
        if (!language || useSettingsStore.getState().language === language || hasSavedSettings()) return;

        const next = { ...useSettingsStore.getState(), language };
        saveSettings(next);
        useSettingsStore.setState({ language });
        applyLanguageToDOM(language);
    } catch (error) {
        console.info('Steam language unavailable; using browser language.', error);
    }
}

function scheduleFrame(callback: () => void) {
    if (typeof globalThis.requestAnimationFrame === 'function') {
        globalThis.requestAnimationFrame(callback);
        return;
    }
    callback();
}

audioManager.setMasterVolume(initialSettings.masterVolume);
audioManager.setMusicVolume(initialSettings.musicVolume);
audioManager.setEffectVolume(initialSettings.effectVolume);
audioManager.setAmbientVolume(initialSettings.ambientVolume);
scheduleFrame(() => {
    applyLanguageToDOM(initialSettings.language);
    applyResolutionToDOM(initialSettings.resolutionWidth, initialSettings.resolutionHeight);
    if (initialSettings.screenMode !== 'windowed') {
        applyScreenModeToDOM(initialSettings.screenMode);
    } else {
        syncScreenModeState();
    }
});
initializeLanguageFromSteam();
