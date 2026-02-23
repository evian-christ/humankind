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

/**
 * 사용자 모니터 해상도 기반으로 같은 비율의 해상도 옵션 생성
 * 최대 = 모니터 해상도, 100% ~ 50% 단위로
 */
export function getResolutionOptions(): ResolutionOption[] {
    const sw = window.screen.width;
    const sh = window.screen.height;

    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const g = gcd(sw, sh);
    const rw = sw / g;
    const rh = sh / g;

    // 비율 라벨 생성
    const KNOWN_RATIOS: Record<string, string> = {
        '16:9': '16:9', '8:5': '16:10', '16:10': '16:10',
        '4:3': '4:3', '21:9': '21:9', '32:9': '32:9',
    };
    const rawRatio = `${rw}:${rh}`;
    const ratioLabel = KNOWN_RATIOS[rawRatio] || rawRatio;

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

    setResolution: (width: number, height: number) => void;
    setLanguage: (lang: Language) => void;
    setEffectSpeed: (speed: EffectSpeed) => void;
    setSpinSpeed: (speed: SpinSpeed) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    resolutionWidth: _initW,
    resolutionHeight: _initH,
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

// ─── 전체화면 상태 추적 ───
let _isFullscreen = false;

function syncFullscreenState() {
    if (document.fullscreenElement) {
        _isFullscreen = true;
        applyRootScale();
        return;
    }
    import('@tauri-apps/api/core').then(({ isTauri }) => {
        if (isTauri()) {
            import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
                getCurrentWindow().isFullscreen().then(isFull => {
                    _isFullscreen = isFull;
                    applyRootScale();
                });
            }).catch(() => { });
        } else {
            _isFullscreen = false;
            applyRootScale();
        }
    }).catch(() => {
        _isFullscreen = false;
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

    if (_isFullscreen) {
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
window.addEventListener('resize', () => syncFullscreenState());
document.addEventListener('fullscreenchange', () => {
    _isFullscreen = !!document.fullscreenElement;
    applyRootScale();
});

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

    requestAnimationFrame(() => applyRootScale());
}

/** #root에 data-lang 속성 설정 (CSS 폰트 전환용) */
function applyLanguageToDOM(lang: Language) {
    const root = document.getElementById('root');
    if (!root) return;
    root.setAttribute('data-lang', lang);
}
