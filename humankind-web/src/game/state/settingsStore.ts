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
    { label: '1280 x 720 (16:9)', width: 1280, height: 720 },
    { label: '1280 x 800 (16:10)', width: 1280, height: 800 },
    { label: '1280 x 960 (4:3)', width: 1280, height: 960 },
    { label: '1440 x 900 (16:10)', width: 1440, height: 900 },
    { label: '1600 x 900 (16:9)', width: 1600, height: 900 },
    { label: '1680 x 1050 (16:10)', width: 1680, height: 1050 },
    { label: '1920 x 1080 (16:9)', width: 1920, height: 1080 },
    { label: '1920 x 1200 (16:10)', width: 1920, height: 1200 },
    { label: '2560 x 1080 (21:9)', width: 2560, height: 1080 },
    { label: '2560 x 1440 (16:9)', width: 2560, height: 1440 },
    { label: '3440 x 1440 (21:9)', width: 3440, height: 1440 },
    { label: '3840 x 2160 (16:9)', width: 3840, height: 2160 },
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

/** #root에 뷰포트 기반 transform scale 적용 */
function applyScaleFromViewport() {
    const root = document.getElementById('root');
    if (!root) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scaleX = vw / BASE_WIDTH;
    const scaleY = vh / BASE_HEIGHT;
    const scale = Math.min(scaleX, scaleY);

    root.style.width = `${BASE_WIDTH}px`;
    root.style.height = `${BASE_HEIGHT}px`;
    root.style.transform = `translate(-50%, -50%) scale(${scale})`;
    root.style.transformOrigin = 'center center';
}

// 윈도우 리사이즈 / 전체화면 전환 시 스케일 자동 재계산
window.addEventListener('resize', () => applyScaleFromViewport());

/** 해상도 설정 변경 시 Tauri 윈도우 크기 변경 + 스케일 재계산 */
function applyResolutionToDOM(width: number, height: number) {
    import('@tauri-apps/api/core').then(({ isTauri }) => {
        if (isTauri()) {
            import('@tauri-apps/api/window').then(({ getCurrentWindow, LogicalSize }) => {
                const win = getCurrentWindow();
                const setWinSize = async () => {
                    const isFull = await win.isFullscreen();
                    if (!isFull) {
                        await win.setSize(new LogicalSize(width, height));
                    }
                };
                setWinSize().catch(console.error);
            }).catch(console.error);
        }
    }).catch(console.error);

    // 스케일 즉시 적용 (Tauri setSize 후에는 resize 이벤트로도 호출됨)
    requestAnimationFrame(() => applyScaleFromViewport());
}

/** #root에 data-lang 속성 설정 (CSS 폰트 전환용) */
function applyLanguageToDOM(lang: Language) {
    const root = document.getElementById('root');
    if (!root) return;
    root.setAttribute('data-lang', lang);
}
