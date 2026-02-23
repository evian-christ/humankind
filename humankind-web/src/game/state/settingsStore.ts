import { create } from 'zustand';

export type Language = 'en' | 'ko';
export type EffectSpeed = '1x' | '2x' | '4x' | 'instant';
export type SpinSpeed = '1x' | '2x' | '4x' | 'instant';

/** 효과 속도별 슬롯 간 딜레이(ms) */
export const EFFECT_SPEED_DELAY: Record<EffectSpeed, number> = {
    '1x': 300,
    '2x': 150,
    '4x': 75,
    'instant': 0,
};

/** 전투 바운스 애니메이션 지속시간(ms) — 효과 속도에 비례 */
export const COMBAT_BOUNCE_DURATION: Record<EffectSpeed, number> = {
    '1x': 220,
    '2x': 150,
    '4x': 80,
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

export const RESOLUTION_OPTIONS: ResolutionOption[] = [
    { label: '1280 x 720', width: 1280, height: 720 },
    { label: '1366 x 768', width: 1366, height: 768 },
    { label: '1600 x 900', width: 1600, height: 900 },
    { label: '1920 x 1080', width: 1920, height: 1080 },
    { label: '2560 x 1440', width: 2560, height: 1440 },
];

/** 기준 해상도 (모든 UI는 이 해상도 기준 px로 작성) */
export const BASE_WIDTH = 1920;
export const BASE_HEIGHT = 1080;

export interface SettingsState {
    resolutionWidth: number;
    resolutionHeight: number;
    language: Language;
    effectSpeed: EffectSpeed;
    spinSpeed: SpinSpeed;

    setResolution: (width: number, height: number) => void;
    setLanguage: (lang: Language) => void;
    setEffectSpeed: (speed: EffectSpeed) => void;
    setSpinSpeed: (speed: SpinSpeed) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    resolutionWidth: 1280,
    resolutionHeight: 720,
    language: 'ko',
    effectSpeed: '4x',
    spinSpeed: '4x',

    setResolution: (width, height) => {
        set({ resolutionWidth: width, resolutionHeight: height });
        applyResolutionToDOM(width, height);
    },

    setLanguage: (lang) => {
        set({ language: lang });
        applyLanguageToDOM(lang);
    },

    setEffectSpeed: (speed) => {
        set({ effectSpeed: speed });
    },

    setSpinSpeed: (speed) => {
        set({ spinSpeed: speed });
    },
}));

/** #root에 transform scale 적용 */
function applyResolutionToDOM(width: number, height: number) {
    const root = document.getElementById('root');
    if (!root) return;

    const scaleX = width / BASE_WIDTH;
    const scaleY = height / BASE_HEIGHT;
    const scale = Math.min(scaleX, scaleY);

    // #root는 항상 1920x1080 고정, transform: scale로 줄이거나 키움
    root.style.width = `${BASE_WIDTH}px`;
    root.style.height = `${BASE_HEIGHT}px`;
    root.style.transform = `translate(-50%, -50%) scale(${scale})`;
    root.style.transformOrigin = 'center center';

    // Desktop App (Tauri) 해상도 변경 적용
    if ('__TAURI_INTERNALS__' in window) {
        import('@tauri-apps/api/window').then(({ getCurrentWindow, LogicalSize }) => {
            getCurrentWindow().setSize(new LogicalSize(width, height)).catch(console.error);
        }).catch(console.error);
    }
}

/** #root에 data-lang 속성 설정 (CSS 폰트 전환용) */
function applyLanguageToDOM(lang: Language) {
    const root = document.getElementById('root');
    if (!root) return;
    root.setAttribute('data-lang', lang);
}
