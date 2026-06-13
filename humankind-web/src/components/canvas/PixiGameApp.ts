import * as PIXI from 'pixi.js';
import { useGameStore } from '../../game/state/gameStore';
import type { GameState } from '../../game/state/gameStore';
import { getActiveBoardCoords, isBoardSlotActive } from '../../game/state/gameStoreHelpers';
import { EFFECT_SPEED_DELAY, SPIN_SPEED_CONFIG, useSettingsStore } from '../../game/state/settingsStore';
import type { SettingsState } from '../../game/state/settingsStore';
import { t } from '../../i18n';
import { getSymbolColor, SymbolType, S } from '../../game/data/symbolDefinitions';
import type { SymbolDefinition } from '../../game/data/symbolDefinitions';
import type { HoveredSymbol, HoveredRelic, HoveredStatus, HoveredUpgrade, HoveredHudStat, CellLayout, ReelState } from './types';
import { loadGameAssets } from './AssetLoader';
import { BoardRenderer } from './renderers/BoardRenderer';
import { CombatRenderer } from './renderers/CombatRenderer';
import { FloatingTextRenderer } from './renderers/FloatingTextRenderer';
import { HudRenderer } from './renderers/HudRenderer';
import { RelicRenderer } from './renderers/RelicRenderer';
import { StatusRenderer } from './renderers/StatusRenderer';
import { UpgradeRenderer } from './renderers/UpgradeRenderer';
import { audioManager, type AudioPlaybackHandle } from '../../audio/audioManager';
import { DEFAULT_AUDIO_CUES } from '../../audio/audioCues';
import {
    GAME_CURSOR_POINTER,
    boardHasAdjacentPlains,
    boardHasDestroyableAdjacentSymbol,
    clearPixiContainer,
    getBoardSymbolSpriteSize,
    isOpenableLoot,
} from './renderers/rendererShared';
import { getSymbolSpriteUrl } from '../../game/data/symbolSpritePaths';
import {
    getProductionHighlightScaleForDelta,
    PRODUCTION_HIGHLIGHT_SCALE_IN_MS,
    PRODUCTION_HIGHLIGHT_SCALE_OUT_MS,
} from './productionHighlightScale';
import { createCrtScreenFilter } from './CrtScreenFilter';
import { mapCrtOutputToSource, mapCrtSourceToOutput } from './crtProjection';
import { BOARD_DISPLAY_SCALE } from '../../game/layout/boardPixelLayout';
import { useBoardViewStore } from '../../game/state/boardViewStore';

const SPIN_AUDIO_ESTIMATE_TICK_MS = 1000 / 60;
const CONTRIBUTOR_WOBBLE_SECOND_SOUND_MS = 140;
const MARKED_FOR_DESTRUCTION_ALPHA = 0.38;
const DESTROY_REMOVAL_BLINKS = 2;
const DESTROY_REMOVAL_BLINK_MIN_ALPHA = 0.12;
const DESTROY_REMOVAL_BLINK_DURATION_MS: Record<SettingsState['effectSpeed'], number> = {
    '1x': 360,
    '2x': 240,
    '4x': 120,
    '8x': 60,
};
const ACTIVE_SYMBOL_ASCENT_MS: Record<SettingsState['effectSpeed'], number> = {
    '1x': 120,
    '2x': 75,
    '4x': 38,
    '8x': 19,
};
const PRODUCTION_STICKER_DEPTH = 0.11;
const PRODUCTION_STICKER_LIFT = 0.05;
const PRODUCTION_STICKER_DRIFT_X = 0.14;
const PRODUCTION_STICKER_DRIFT_Y = 0.18;
const PRODUCTION_STICKER_FLOAT_TIME_SCALE: Record<SettingsState['effectSpeed'], number> = {
    '1x': 1.35,
    '2x': 1.8,
    '4x': 3.6,
    '8x': 7.2,
};

const clampPlaybackRate = (value: number) => Math.min(4, Math.max(0.25, value));
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOutBack = (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const shortestAngleDelta = (from: number, to: number) =>
    Math.atan2(Math.sin(to - from), Math.cos(to - from));
const seededSignedValue = (seed: number, index: number) => {
    const value = Math.sin(seed * 91.3458 + index * 47.853) * 43758.5453;
    return (value - Math.floor(value)) * 2 - 1;
};
const getSmoothRandomShift = (seed: number, elapsedMs: number, segmentMs: number) => {
    const segment = Math.floor(elapsedMs / segmentMs);
    const t = smoothstep((elapsedMs % segmentMs) / segmentMs);
    const from = seededSignedValue(seed, segment);
    const to = seededSignedValue(seed, segment + 1);
    return from + (to - from) * t;
};

function getNowMs() {
    return typeof globalThis.performance !== 'undefined' && typeof globalThis.performance.now === 'function'
        ? globalThis.performance.now()
        : Date.now();
}

function getDestroyMarkedAlpha(state: GameState, settings: SettingsState, fallbackAlpha: number) {
    const blinkStartedAtMs = state.destroyRemovalBlinkStartedAtMs;
    if (blinkStartedAtMs != null) {
        const durationMs = DESTROY_REMOVAL_BLINK_DURATION_MS[settings.effectSpeed];
        if (durationMs > 0) {
            const progress = clamp01((getNowMs() - blinkStartedAtMs) / durationMs);
            const wave = 0.5 + 0.5 * Math.cos(progress * DESTROY_REMOVAL_BLINKS * Math.PI * 2);
            return DESTROY_REMOVAL_BLINK_MIN_ALPHA + (1 - DESTROY_REMOVAL_BLINK_MIN_ALPHA) * wave;
        }
    }
    if (state.phase === 'processing') return Math.min(fallbackAlpha, MARKED_FOR_DESTRUCTION_ALPHA);
    return fallbackAlpha;
}

function getActiveSlotProductionScale(state: GameState, x: number, y: number) {
    if (state.phase !== 'processing' || state.effectPhase !== 3) return 1;

    const effect = [...state.lastEffects].reverse().find((entry) => entry.x === x && entry.y === y);
    if (!effect) return 1;

    return getProductionHighlightScaleForDelta(effect);
}

function estimateSpinDurationMs(args: {
    cellHeight: number;
    speedMul: number;
    stopInterval: number;
    boardWidth: number;
    boardHeight: number;
}) {
    const { cellHeight, speedMul, stopInterval, boardWidth, boardHeight } = args;
    if (speedMul <= 0) return 0;

    const reelSpeed = 1.2 * speedMul;
    const decelZone = cellHeight * 1.5;
    const baseRandomCount = 12;
    let latestStopMs = 0;

    for (let col = 0; col < boardWidth; col++) {
        let elapsedMs = 0;
        let scrollY = 0;
        let stopped = false;
        let started = false;
        const startDelay = col * stopInterval;
        const colRandomCount = baseRandomCount + col;
        const targetScrollY = (boardHeight + colRandomCount) * cellHeight;

        while (!stopped && elapsedMs < 15000) {
            elapsedMs += SPIN_AUDIO_ESTIMATE_TICK_MS;

            if (!started) {
                if (elapsedMs >= startDelay) {
                    started = true;
                } else {
                    continue;
                }
            }

            const remaining = targetScrollY - scrollY;
            if (remaining <= 0) {
                stopped = true;
                break;
            }

            const speed = remaining < decelZone
                ? Math.max(0.2, reelSpeed * (remaining / decelZone))
                : reelSpeed;

            scrollY += speed * SPIN_AUDIO_ESTIMATE_TICK_MS;
            if (scrollY >= targetScrollY) {
                scrollY = targetScrollY;
            }
        }

        latestStopMs = Math.max(latestStopMs, elapsedMs);
    }

    // finishSpin runs on the tick after the last reel has already reported stopped.
    return latestStopMs + SPIN_AUDIO_ESTIMATE_TICK_MS;
}

export class PixiGameApp {
    public app: PIXI.Application;
    private canvas: HTMLDivElement;
    private destroyed = false;
    private contextLost = false;
    private crtFilter: PIXI.Filter | null = null;
    private flatCrtFilter: PIXI.Filter | null = null;
    private crtEnabled = true;
    /** init() 완료 전 destroy 시 ResizePlugin 등이 미초기화라 Pixi destroy가 터질 수 있음 (React Strict Mode 등) */
    private pixiInitComplete = false;

    // Containers
    private crtSceneContainer = new PIXI.Container();
    private flatRelicSceneContainer = new PIXI.Container();
    private flatRelicContainer = new PIXI.Container();
    private flatRelicFloatContainer = new PIXI.Container();
    private flatRelicHitContainer = new PIXI.Container();
    private bgContainer = new PIXI.Container();
    private boardContainer = new PIXI.Container();
    private spinContainer = new PIXI.Container();
    private combatContainer = new PIXI.Container();
    private effectsContainer = new PIXI.Container();
    private floatContainer = new PIXI.Container();
    private hitContainer = new PIXI.Container();
    private hudTopContainer = new PIXI.Container();

    private boardRenderer: BoardRenderer;
    private floatingTextRenderer: FloatingTextRenderer;
    private combatRenderer: CombatRenderer;
    private hudRenderer: HudRenderer;
    private relicRenderer: RelicRenderer;
    private statusRenderer: StatusRenderer;
    private upgradeRenderer: UpgradeRenderer;

    // Callbacks
    private onHoverSymbol: (symbol: HoveredSymbol | null) => void;
    private onHoverHudStat!: (stat: HoveredHudStat | null) => void;
    private hudHoverSnapshot: HoveredHudStat | null = null;
    private pointerPosition: {
        output: { x: number; y: number };
        source: { x: number; y: number };
    } | null = null;

    // Refs equivalent state
    private runningTotalTexts: { food: PIXI.Text | null; gold: PIXI.Text | null; knowledge: PIXI.Text | null } = { food: null, gold: null, knowledge: null };

    private reels: ReelState[] = [];
    private spinElapsed: number = 0;
    private spinActive: boolean = false;
    private spinLoopHandle: AudioPlaybackHandle | null = null;
    private spinLoopPendingStop = false;
    private spinLoopRunId = 0;

    private cellLayout: CellLayout | null = null;
    private contributorWobbleTime: number = 0;
    private contributorWobbleSoundCount = 0;
    private transientRenderElapsedMs = 33;
    private activeSlotMotion: {
        key: string;
        phase: GameState['effectPhase'];
        slotStartedAtMs: number;
        phaseStartedAtMs: number;
    } | null = null;
    private productionScaleMotions = new Map<string, {
        targetScale: number;
        growStartedAtMs: number;
        floatSpeed: number;
        driftStrength: number;
        driftSeedX: number;
        driftSeedY: number;
        tiltStartAngle: number;
        tiltEndAngle: number;
        tiltDirectionProgressAtRelease?: number;
        releaseStartedAtMs?: number;
        releaseFromScale?: number;
    }>();
    /** renderBoard가 히트영역을 갈아엎어도 포인터는 그대로일 수 있어, 마지막 호버를 저장 후 재동기화 */
    private symbolHoverCell: { x: number; y: number } | null = null;

    private handleCanvasPointerMove = (event: PointerEvent) => {
        const canvas = this.app.canvas;
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const output = {
            x: (event.clientX - rect.left) * (this.app.screen.width / rect.width),
            y: (event.clientY - rect.top) * (this.app.screen.height / rect.height),
        };
        const source = this.crtEnabled
            ? mapCrtOutputToSource(output.x, output.y, this.app.screen.width, this.app.screen.height)
            : output;
        this.pointerPosition = { output, source };
        this.reconcileHoverWithPointer();
    };

    private handlePointerExit = () => {
        this.pointerPosition = null;
        this.clearAllHover();
    };

    private handleBoardWheel = (event: WheelEvent) => {
        if (event.deltaY === 0) return;
        event.preventDefault();
        const { zoom, setZoom } = useBoardViewStore.getState();
        const nextZoom = zoom * Math.exp(-event.deltaY * 0.0012);
        setZoom(nextZoom);
        this.renderBoard(useGameStore.getState(), useSettingsStore.getState());
    };

    private getPulse01() {
        // 0..1 부드러운 펄스
        return 0.5 + 0.5 * Math.sin(Date.now() / 140);
    }

    private syncActiveSlotMotion(state: GameState) {
        if (state.phase !== 'processing' || !state.activeSlot || state.effectPhase == null) {
            this.activeSlotMotion = null;
            return;
        }

        const key = `${state.activeSlot.x}:${state.activeSlot.y}`;
        const now = getNowMs();
        if (!this.activeSlotMotion || this.activeSlotMotion.key !== key) {
            this.activeSlotMotion = {
                key,
                phase: state.effectPhase,
                slotStartedAtMs: now,
                phaseStartedAtMs: now,
            };
            return;
        }

        if (this.activeSlotMotion.phase !== state.effectPhase) {
            this.activeSlotMotion.phase = state.effectPhase;
            this.activeSlotMotion.phaseStartedAtMs = now;
        }
    }

    private getActiveSlotMotion(cellHeight: number, effectSpeed: SettingsState['effectSpeed']) {
        if (!this.activeSlotMotion) {
            return { x: 0, y: 0, shadowScale: 0, shadowAlpha: 0 };
        }

        const now = getNowMs();
        const liftY = -cellHeight * 0.18;
        const ascentMs = Math.max(1, ACTIVE_SYMBOL_ASCENT_MS[effectSpeed]);
        const descentMinMs = effectSpeed === '8x' ? 35 : 70;
        const descentMs = Math.max(descentMinMs, EFFECT_SPEED_DELAY[effectSpeed]);
        const phaseElapsed = now - this.activeSlotMotion.phaseStartedAtMs;
        const slotElapsed = now - this.activeSlotMotion.slotStartedAtMs;

        if (this.activeSlotMotion.phase === 3) {
            const t = easeInOutCubic(clamp01(phaseElapsed / descentMs));
            const hoverFade = 1 - t;
            const hoverElapsed = Math.max(0, slotElapsed - ascentMs);
            return {
                x: Math.sin((hoverElapsed / 1300) * Math.PI * 2) * cellHeight * 0.006 * hoverFade,
                y: liftY * hoverFade + Math.sin((hoverElapsed / 980) * Math.PI * 2) * cellHeight * 0.011 * hoverFade,
                shadowScale: hoverFade,
                shadowAlpha: 0.34 * hoverFade,
            };
        }

        const ascentT = clamp01(slotElapsed / ascentMs);
        const liftedY = liftY * easeOutBack(ascentT);
        const hoverElapsed = Math.max(0, slotElapsed - ascentMs);
        return {
            x: Math.sin((hoverElapsed / 1300) * Math.PI * 2) * cellHeight * 0.006 * ascentT,
            y: liftedY + Math.sin((hoverElapsed / 980) * Math.PI * 2) * cellHeight * 0.014 * ascentT,
            shadowScale: ascentT,
            shadowAlpha: 0.34 * ascentT,
        };
    }

    private getProductionScaleMotionValue(
        motion: {
            targetScale: number;
            growStartedAtMs: number;
            floatSpeed: number;
            driftStrength: number;
            driftSeedX: number;
            driftSeedY: number;
            tiltStartAngle: number;
            tiltEndAngle: number;
            tiltDirectionProgressAtRelease?: number;
            releaseStartedAtMs?: number;
            releaseFromScale?: number;
        },
        effectSpeed: SettingsState['effectSpeed'],
        now: number,
    ) {
        if (motion.releaseStartedAtMs != null) {
            const scaleOutMs = Math.max(1, PRODUCTION_HIGHLIGHT_SCALE_OUT_MS[effectSpeed]);
            const t = clamp01((now - motion.releaseStartedAtMs) / scaleOutMs);
            const fromScale = motion.releaseFromScale ?? motion.targetScale;
            return fromScale + (1 - fromScale) * easeInOutCubic(t);
        }

        const scaleInMs = Math.max(1, PRODUCTION_HIGHLIGHT_SCALE_IN_MS[effectSpeed]);
        const t = clamp01((now - motion.growStartedAtMs) / scaleInMs);
        return 1 + (motion.targetScale - 1) * easeOutCubic(t);
    }

    private syncProductionScaleMotions(state: GameState, settings: SettingsState) {
        const effectSpeed = settings.effectSpeed;
        const now = getNowMs();
        const activeSlot = state.phase === 'processing' && state.effectPhase === 3 ? state.activeSlot : null;
        const activeKey = activeSlot ? `${activeSlot.x}:${activeSlot.y}` : null;
        const activeTargetScale = activeSlot
            ? getActiveSlotProductionScale(state, activeSlot.x, activeSlot.y)
            : 1;

        if (activeKey && activeTargetScale > 1) {
            const existing = this.productionScaleMotions.get(activeKey);
            if (!existing || existing.targetScale !== activeTargetScale || existing.releaseStartedAtMs != null) {
                this.productionScaleMotions.set(activeKey, {
                    targetScale: activeTargetScale,
                    growStartedAtMs: now,
                    floatSpeed: 0.82 + Math.random() * 0.32,
                    driftStrength: 0.9 + Math.random() * 0.4,
                    driftSeedX: Math.random() * 1000,
                    driftSeedY: Math.random() * 1000,
                    tiltStartAngle: Math.random() * Math.PI * 2,
                    tiltEndAngle: Math.random() * Math.PI * 2,
                });
            }
        }

        const scaleOutMs = Math.max(1, PRODUCTION_HIGHLIGHT_SCALE_OUT_MS[effectSpeed]);
        for (const [key, motion] of this.productionScaleMotions) {
            const isCurrentActive = key === activeKey && activeTargetScale > 1;
            if (!isCurrentActive && motion.releaseStartedAtMs == null) {
                motion.releaseFromScale = this.getProductionScaleMotionValue(motion, effectSpeed, now);
                const directionInMs = Math.max(
                    1,
                    PRODUCTION_HIGHLIGHT_SCALE_IN_MS[effectSpeed] + EFFECT_SPEED_DELAY[effectSpeed],
                );
                motion.tiltDirectionProgressAtRelease = 0.72
                    * easeInOutCubic(clamp01((now - motion.growStartedAtMs) / directionInMs));
                motion.releaseStartedAtMs = now;
            }

            if (motion.releaseStartedAtMs != null && now - motion.releaseStartedAtMs >= scaleOutMs) {
                this.productionScaleMotions.delete(key);
            }
        }
    }

    private getProductionStickerMotionForCell(x: number, y: number, effectSpeed: SettingsState['effectSpeed']) {
        const motion = this.productionScaleMotions.get(`${x}:${y}`);
        if (!motion) return { scale: 1, tilt: 0, orbitX: 0, orbitY: 0, driftX: 0, driftY: 0 };

        const now = getNowMs();
        const scale = this.getProductionScaleMotionValue(motion, effectSpeed, now);
        const scaleRange = Math.max(0.0001, motion.targetScale - 1);
        const normalizedScale = clamp01((scale - 1) / scaleRange);
        const tilt = motion.releaseStartedAtMs == null
            ? Math.sqrt(normalizedScale)
            : normalizedScale * normalizedScale;
        const floatTime = (now - motion.growStartedAtMs)
            * PRODUCTION_STICKER_FLOAT_TIME_SCALE[effectSpeed]
            * motion.floatSpeed;
        const directionInMs = Math.max(
            1,
            PRODUCTION_HIGHLIGHT_SCALE_IN_MS[effectSpeed] + EFFECT_SPEED_DELAY[effectSpeed],
        );
        let directionProgress = 0.72 * easeInOutCubic(clamp01((now - motion.growStartedAtMs) / directionInMs));
        if (motion.releaseStartedAtMs != null) {
            const releaseT = clamp01(
                (now - motion.releaseStartedAtMs)
                / Math.max(1, PRODUCTION_HIGHLIGHT_SCALE_OUT_MS[effectSpeed]),
            );
            const releaseFrom = motion.tiltDirectionProgressAtRelease ?? directionProgress;
            directionProgress = releaseFrom + (1 - releaseFrom) * easeInOutCubic(releaseT);
        }
        const tiltAngle = motion.tiltStartAngle
            + shortestAngleDelta(motion.tiltStartAngle, motion.tiltEndAngle) * directionProgress;
        const driftX = getSmoothRandomShift(motion.driftSeedX, floatTime, 460) * motion.driftStrength * tilt;
        const driftY = getSmoothRandomShift(motion.driftSeedY, floatTime, 540) * motion.driftStrength * tilt;
        return {
            scale,
            tilt,
            orbitX: Math.cos(tiltAngle),
            orbitY: Math.sin(tiltAngle),
            driftX,
            driftY,
        };
    }

    private drawBackGlow(
        g: PIXI.Graphics,
        cx: number,
        cy: number,
        baseR: number,
        color: number,
        pulse01: number,
        kind: 'active' | 'contrib'
    ) {
        // "진짜 빛" 느낌: filled blob + blur filter + ADD blend.
        // 테두리(stroke)는 빛이 아니라 원처럼 보이기 쉬워서 사용하지 않는다.
        const strength = kind === 'active' ? 1 : 0.7;
        const blobR = baseR * (0.95 + 0.08 * pulse01);
        const coreR = baseR * (0.45 + 0.05 * pulse01);

        // blur 강도는 반경에 비례 (너무 강하면 뿌옇게만 보임)
        const blur = Math.max(6, Math.min(22, baseR * 0.22));
        type BlurFilterCtor = new (strength: number) => PIXI.Filter;
        const BlurFilterCtor = (PIXI as unknown as { BlurFilter?: BlurFilterCtor }).BlurFilter;
        if (BlurFilterCtor) {
            // filter는 Graphics 단위로 적용
            g.filters = [new BlurFilterCtor(blur)];
        }
        // add(더하기) 블렌딩: 빛 번짐 느낌의 핵심
        g.blendMode = 'add';

        // outer soft blob
        g.circle(cx, cy, blobR);
        g.fill({ color, alpha: (0.22 + 0.14 * pulse01) * strength });

        // inner core (조금 더 밝게)
        g.circle(cx, cy, coreR);
        g.fill({ color, alpha: (0.26 + 0.18 * pulse01) * strength });
    }

    private readonly handleWebglContextLost = (event: Event) => {
        event.preventDefault();
        this.contextLost = true;
    };

    private readonly handleWebglContextRestored = () => {
        this.contextLost = false;
        requestAnimationFrame(() => {
            if (!this.destroyed) {
                this.renderBoard(useGameStore.getState(), useSettingsStore.getState());
            }
        });
    };

    private addContextListeners() {
        const canvas = this.app.canvas;
        canvas.addEventListener('webglcontextlost', this.handleWebglContextLost, false);
        canvas.addEventListener('webglcontextrestored', this.handleWebglContextRestored, false);
        canvas.addEventListener('pointermove', this.handleCanvasPointerMove);
        canvas.addEventListener('pointerleave', this.handlePointerExit);
        canvas.addEventListener('pointercancel', this.handlePointerExit);
        canvas.addEventListener('wheel', this.handleBoardWheel, { passive: false });
        window.addEventListener('blur', this.handlePointerExit);
    }

    private removeContextListeners() {
        const canvas = this.app?.canvas;
        canvas?.removeEventListener('webglcontextlost', this.handleWebglContextLost);
        canvas?.removeEventListener('webglcontextrestored', this.handleWebglContextRestored);
        canvas?.removeEventListener('pointermove', this.handleCanvasPointerMove);
        canvas?.removeEventListener('pointerleave', this.handlePointerExit);
        canvas?.removeEventListener('pointercancel', this.handlePointerExit);
        canvas?.removeEventListener('wheel', this.handleBoardWheel);
        window.removeEventListener('blur', this.handlePointerExit);
    }



    constructor(
        canvas: HTMLDivElement,
        onHoverSymbol: (symbol: HoveredSymbol | null) => void,
        onHoverRelic: (relic: HoveredRelic | null) => void,
        onHoverStatus: (status: HoveredStatus | null) => void,
        onHoverUpgrade: (upgrade: HoveredUpgrade | null) => void,
        onHoverHudStat: (stat: HoveredHudStat | null) => void
    ) {
        this.app = new PIXI.Application();
        this.canvas = canvas;
        this.onHoverSymbol = (symbol) => {
            if (!symbol) {
                onHoverSymbol(null);
                return;
            }
            const projected = this.projectScreenPoint(symbol.screenX, symbol.screenY);
            onHoverSymbol({ ...symbol, screenX: projected.x, screenY: projected.y });
        };
        this.onHoverHudStat = onHoverHudStat;
        this.hitContainer.eventMode = 'static';
        this.flatRelicHitContainer.eventMode = 'static';
        this.boardRenderer = new BoardRenderer({
            bgContainer: this.bgContainer,
            boardContainer: this.boardContainer,
        });
        this.floatingTextRenderer = new FloatingTextRenderer(this.floatContainer);
        this.combatRenderer = new CombatRenderer(this.combatContainer, this.floatingTextRenderer);
        this.hudRenderer = new HudRenderer(this.hudTopContainer);
        this.relicRenderer = new RelicRenderer({
            displayContainer: this.flatRelicContainer,
            floatContainer: this.flatRelicFloatContainer,
            hitContainer: this.flatRelicHitContainer,
            floatingTextRenderer: this.floatingTextRenderer,
            onHoverRelic,
        });
        this.statusRenderer = new StatusRenderer({
            bgContainer: this.flatRelicContainer,
            onHoverStatus,
        });
        this.upgradeRenderer = new UpgradeRenderer((upgrade) => {
            if (!upgrade) {
                onHoverUpgrade(null);
                return;
            }
            const projected = this.projectScreenPoint(upgrade.screenX, upgrade.screenY);
            onHoverUpgrade({ ...upgrade, screenX: projected.x, screenY: projected.y });
        });
        audioManager.registerCue('spin_loop', DEFAULT_AUDIO_CUES.spin_loop);
        audioManager.registerCue('cow_butcher', DEFAULT_AUDIO_CUES.cow_butcher);
    }

    public async init() {
        PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';
        // Tauri 프로토콜 환경에서는 XHR/Fetch에 CORS 헤더가 없을 수 있어서,
        // Pixi가 이미지 로드 시 crossOrigin 속성을 강제로 붙이지 않도록 합니다.
        // (React <img>는 표시 자체가 되지만, Pixi 로더는 실패해서 보드 스프라이트가 안 보이는 케이스가 있습니다.)
        (PIXI.TextureSource.defaultOptions as unknown as { crossOrigin?: string | null }).crossOrigin = null;
        await this.app.init({
            background: '#242424',
            antialias: false,
            preference: 'webgl',
            roundPixels: true,
        });
        this.pixiInitComplete = true;

        if (this.destroyed) {
            try {
                if (this.app.resizeTo) (this.app as unknown as { resizeTo?: unknown }).resizeTo = null;
                this.app.destroy(true);
            } catch (e) {
                console.warn("PIXI destroy error:", e);
            }
            return;
        }

        this.canvas.appendChild(this.app.canvas);
        this.addContextListeners();
        await loadGameAssets();

        if (this.destroyed) return;

        this.app.stage.eventMode = 'static';
        this.crtSceneContainer.addChild(this.bgContainer);
        this.crtSceneContainer.addChild(this.boardContainer);
        this.crtSceneContainer.addChild(this.spinContainer);
        this.crtSceneContainer.addChild(this.combatContainer);
        this.crtSceneContainer.addChild(this.effectsContainer);
        this.crtSceneContainer.addChild(this.floatContainer);
        this.crtSceneContainer.addChild(this.hitContainer);
        this.crtSceneContainer.addChild(this.hudTopContainer);
        this.flatRelicSceneContainer.addChild(this.flatRelicContainer);
        this.flatRelicSceneContainer.addChild(this.flatRelicFloatContainer);
        this.flatRelicSceneContainer.addChild(this.flatRelicHitContainer);
        this.app.stage.addChild(this.crtSceneContainer);
        this.app.stage.addChild(this.flatRelicSceneContainer);
        this.crtFilter = createCrtScreenFilter();
        this.flatCrtFilter = createCrtScreenFilter(0);
        this.crtSceneContainer.filters = [this.crtFilter];
        this.flatRelicSceneContainer.filters = [this.flatCrtFilter];
        this.updateCrtFilterArea();
        this.installCrtPointerMapping();

        this.app.ticker.add((ticker) => this.onTick(ticker));
    }

    public destroy() {
        this.destroyed = true;
        this.stopSpinLoop();
        if (this.app) {
            try {
                if (this.pixiInitComplete && this.app.renderer) {
                    this.removeContextListeners();
                    this.crtFilter?.destroy();
                    this.crtFilter = null;
                    this.flatCrtFilter?.destroy();
                    this.flatCrtFilter = null;
                    if (this.app.resizeTo) (this.app as unknown as { resizeTo?: unknown }).resizeTo = null;
                    this.app.destroy(true);
                }
            } catch (e) {
                console.warn("Error destroying PIXI app:", e);
            }

            try {
                if (this.canvas) this.canvas.innerHTML = '';
            } catch {
                // ignore
            }
        }
        this.pixiInitComplete = false;
    }

    public resize(width: number, height: number) {
        if (!this.destroyed && !this.contextLost && this.app && this.app.renderer) {
            this.app.renderer.resize(width, height);
            this.updateCrtFilterArea();
        }
    }

    private updateCrtFilterArea() {
        if (!this.app?.screen) return;
        const filterArea = new PIXI.Rectangle(
            0,
            0,
            this.app.screen.width,
            this.app.screen.height,
        );
        this.crtSceneContainer.filterArea = filterArea;
        this.flatRelicSceneContainer.filterArea = filterArea;
    }

    private installCrtPointerMapping() {
        const events = this.app.renderer.events;
        const mapPositionToPoint = events.mapPositionToPoint.bind(events);
        events.mapPositionToPoint = (point, clientX, clientY) => {
            mapPositionToPoint(point, clientX, clientY);
            if (!this.crtEnabled) return;
            if (
                this.relicRenderer.containsScreenPoint(point.x, point.y)
                || this.statusRenderer.containsScreenPoint(point.x, point.y)
            ) return;
            const mapped = mapCrtOutputToSource(
                point.x,
                point.y,
                this.app.screen.width,
                this.app.screen.height,
            );
            point.x = mapped.x;
            point.y = mapped.y;
        };
    }

    private projectScreenPoint(x: number, y: number) {
        if (!this.crtEnabled) return { x, y };
        const width = this.app.screen?.width || this.canvas.clientWidth || 1920;
        const height = this.app.screen?.height || this.canvas.clientHeight || 1080;
        return mapCrtSourceToOutput(x, y, width, height);
    }

    private syncCrtEffect(enabled: boolean) {
        if (this.crtEnabled === enabled) return;
        this.crtEnabled = enabled;
        this.crtSceneContainer.filters = enabled && this.crtFilter ? [this.crtFilter] : [];
        this.flatRelicSceneContainer.filters = enabled && this.flatCrtFilter ? [this.flatCrtFilter] : [];
    }

    /** 오버레이 열림 등으로 보드 툴팁을 끌 때 HUD 스냅샷도 초기화 */
    public clearHudHover() {
        this.hudHoverSnapshot = null;
        this.onHoverHudStat?.(null);
    }

    private clearAllHover() {
        if (this.symbolHoverCell) {
            this.symbolHoverCell = null;
            this.onHoverSymbol(null);
        }
        this.relicRenderer.clearHover();
        this.statusRenderer.clearHover();
        this.upgradeRenderer.clearHover();
        this.clearHudHover();
    }

    private reconcileHoverWithPointer() {
        const pointer = this.pointerPosition;
        if (this.symbolHoverCell) {
            const layout = this.cellLayout;
            const { x, y } = this.symbolHoverCell;
            const cellX = layout
                ? layout.startX + layout.gridOffsetX + x * (layout.cellWidth + layout.colGap)
                : 0;
            const cellY = layout
                ? layout.startY + layout.gridOffsetY + y * layout.cellHeight
                : 0;
            const isInside = !!layout && !!pointer
                && pointer.source.x >= cellX
                && pointer.source.x <= cellX + layout.cellWidth
                && pointer.source.y >= cellY
                && pointer.source.y <= cellY + layout.cellHeight;
            if (!isInside) {
                this.symbolHoverCell = null;
                this.onHoverSymbol(null);
            }
        }

        this.relicRenderer.validateHover(pointer?.output ?? null);
        this.statusRenderer.syncHover(pointer?.output ?? null);
    }

    private onTick(ticker: PIXI.Ticker) {
        const dt = ticker.deltaMS;

        this.boardRenderer.tick(dt);
        this.floatingTextRenderer.tick(dt);
        const combatBounceFinished = this.combatRenderer.tick(dt);
        this.hudRenderer.tickFoodDemandShake();

        // Contributor wobble: phase 2일 때만 타이머 증가·렌더 (phase 3 진입 시 두 번째 wobble 방지)
        const state = useGameStore.getState();
        this.syncActiveSlotMotion(state);
        this.syncProductionScaleMotions(state, useSettingsStore.getState());
        let needsTransientRender = false;
        let forceTransientRender = false;
        if (
            state.phase === 'processing' &&
            !!state.activeSlot &&
            state.effectPhase != null
        ) {
            needsTransientRender = true;
        }
        if (state.destroyRemovalBlinkStartedAtMs != null) {
            needsTransientRender = true;
        }
        if (state.earthquakeFx != null) {
            needsTransientRender = true;
        }
        if (this.productionScaleMotions.size > 0) {
            needsTransientRender = true;
        }
        if (state.phase === 'processing' && state.effectPhase === 2 && state.activeContributors?.length > 0) {
            if (this.contributorWobbleSoundCount === 0) {
                void audioManager.play('symbol_interact');
                this.contributorWobbleSoundCount = 1;
            }
            this.contributorWobbleTime += dt;
            if (
                this.contributorWobbleSoundCount === 1 &&
                this.contributorWobbleTime >= CONTRIBUTOR_WOBBLE_SECOND_SOUND_MS
            ) {
                void audioManager.play('symbol_interact');
                this.contributorWobbleSoundCount = 2;
            }
            needsTransientRender = true;
        } else {
            this.contributorWobbleTime = 0;
            this.contributorWobbleSoundCount = 0;
        }

        // Pre-combat shake (e.g., Clovis relic): 흔들림은 시간 기반이므로 매 프레임 렌더가 필요
        if (state.preCombatShakeTarget || state.preCombatShakeRelicDefId) {
            needsTransientRender = true;
        }

        if (combatBounceFinished) {
            needsTransientRender = true;
            forceTransientRender = true;
        }

        if (needsTransientRender) {
            this.transientRenderElapsedMs += dt;
            if (forceTransientRender || this.transientRenderElapsedMs >= 33) {
                this.transientRenderElapsedMs = 0;
                this.renderBoard(state, useSettingsStore.getState());
            }
        } else {
            this.transientRenderElapsedMs = 33;
        }

        // Reel spinning
        if (this.spinActive) {
            const spinConfig = SPIN_SPEED_CONFIG[useSettingsStore.getState().spinSpeed];

            this.spinElapsed += dt;
            const REEL_SPEED = 1.2 * spinConfig.speedMul;
            let allStopped = true;

            for (const reel of this.reels) {
                if (reel.stopped) continue;
                allStopped = false;

                if (!reel.started) {
                    if (this.spinElapsed >= reel.startDelay) reel.started = true;
                    else continue;
                }

                const remaining = reel.targetScrollY - reel.scrollY;
                const decelZone = reel.cellHeight * 1.5;

                if (remaining <= 0) {
                    reel.scrollY = reel.targetScrollY;
                    reel.speed = 0;
                    reel.stopped = true;
                } else if (remaining < decelZone) {
                    const t = remaining / decelZone;
                    reel.speed = Math.max(0.2, REEL_SPEED * t);
                } else {
                    reel.speed = REEL_SPEED;
                }

                if (!reel.stopped) {
                    reel.scrollY += reel.speed * dt;
                    if (reel.scrollY >= reel.targetScrollY) {
                        reel.scrollY = reel.targetScrollY;
                        reel.speed = 0;
                        reel.stopped = true;
                    }
                }

                reel.reelContainer.y = reel.stripInitialY + reel.scrollY;
            }

            if (allStopped) {
                this.finishSpin();
            }
        }
    }

    private finishSpin() {
        this.spinActive = false;
        this.stopSpinLoop();
        clearPixiContainer(this.spinContainer);
        this.reels = [];
        useGameStore.getState().startProcessing();
    }

    private startSpinLoop(targetDurationMs: number) {
        if (this.spinLoopHandle || this.spinLoopPendingStop) return;
        const runId = ++this.spinLoopRunId;

        void audioManager.unlock()
            .then(() => audioManager.getCueDurationMs('spin_loop'))
            .then((audioDurationMs) => {
                const playbackRate = audioDurationMs && targetDurationMs > 0
                    ? clampPlaybackRate(audioDurationMs / targetDurationMs)
                    : 1;
                return audioManager.play('spin_loop', { playbackRate });
            })
            .then((handle) => {
                if (!handle) return;
                if (this.spinLoopPendingStop || this.spinLoopRunId !== runId || !this.spinActive || this.destroyed) {
                    handle.stop();
                    return;
                }
                this.spinLoopHandle = handle;
            });
    }

    private stopSpinLoop() {
        this.spinLoopRunId += 1;
        this.spinLoopPendingStop = true;
        this.spinLoopHandle?.stop();
        this.spinLoopHandle = null;
    }

    public renderBoard(state: GameState, settings: SettingsState) {
        if (!this.app || !this.app.renderer || this.destroyed || this.contextLost) return;

        this.syncCrtEffect(settings.crtEffect);
        this.syncActiveSlotMotion(state);
        this.syncProductionScaleMotions(state, settings);
        const w = this.app.screen?.width || 1920;

        this.combatRenderer.setShaking(state.combatShaking);
        this.floatingTextRenderer.resetThreatGateIfNeeded(state.phase);

        clearPixiContainer(this.boardContainer);
        clearPixiContainer(this.effectsContainer);
        clearPixiContainer(this.hitContainer);
        clearPixiContainer(this.bgContainer);
        clearPixiContainer(this.hudTopContainer);
        clearPixiContainer(this.flatRelicContainer);
        clearPixiContainer(this.flatRelicHitContainer);
        this.floatingTextRenderer.clearThreats();

        this.combatRenderer.clearIfNoAnimation(!!state.combatAnimation);

        const frame = this.boardRenderer.beginFrame(
            this.app,
            state,
            settings,
            useBoardViewStore.getState().zoom,
        );
        if (!frame) return;
        const {
            startX,
            startY,
            cellWidth,
            cellHeight,
            gridOffsetX,
            gridOffsetY,
            colGap,
            scale,
            viewScale,
        } = frame;
        const lang = settings.language;
        const fontFamily = frame.fontFamily;
        const fs = scale;
        const rowGap = frame.rowGap;
        const boardWidth = frame.boardWidth;
        const boardHeight = frame.boardHeight;

        // (식량 납부 / 야만인 알림은 NotificationPanel React 컴포넌트가 처리)

        this.cellLayout = this.boardRenderer.toCellLayout(frame);


        // Spin initialization logic
        if (state.phase === 'spinning' && !this.spinActive) {
            clearPixiContainer(this.spinContainer);
            this.reels = [];
            this.spinElapsed = 0;

            const totalBoardSlots = getActiveBoardCoords(state.board).length;
            const reelPool: (SymbolDefinition | null)[] = state.playerSymbols.slice(0, totalBoardSlots).map(s => s.definition);
            const emptyCount = totalBoardSlots - reelPool.length;
            for (let i = 0; i < emptyCount; i++) reelPool.push(null);
            const pickRandomFromPool = () => reelPool[Math.floor(Math.random() * reelPool.length)];

            const RANDOM_COUNT = 12;
            const currentSpinConfig = SPIN_SPEED_CONFIG[settings.spinSpeed];
            if (currentSpinConfig.speedMul > 0) {
                this.spinLoopPendingStop = false;
                this.startSpinLoop(estimateSpinDurationMs({
                    cellHeight,
                    speedMul: currentSpinConfig.speedMul,
                    stopInterval: currentSpinConfig.stopInterval,
                    boardWidth,
                    boardHeight,
                }));
            }

            for (let col = 0; col < boardWidth; col++) {
                const colX = startX + gridOffsetX + col * (cellWidth + colGap);
                const colYStart = startY + gridOffsetY;
                const mask = new PIXI.Graphics();
                for (let row = 0; row < boardHeight; row++) {
                    if (!isBoardSlotActive(state.board, col, row)) continue;
                    mask.rect(colX, colYStart + row * cellHeight, cellWidth, cellHeight);
                }
                mask.fill({ color: 0xffffff });
                this.spinContainer.addChild(mask);

                const reelStrip = new PIXI.Container();
                reelStrip.mask = mask;
                this.spinContainer.addChild(reelStrip);

                const extraPerCol = 1;
                const colRandomCount = RANDOM_COUNT + col * extraPerCol;
                const stripOffsetY = -(boardHeight + colRandomCount) * cellHeight;

                const createSymbolGroup = (def: SymbolDefinition | null, yPos: number) => {
                    const group = new PIXI.Container();
                    group.x = colX;
                    group.y = yPos;
                    const spritePath = def ? getSymbolSpriteUrl(def) : null;
                    if (spritePath) {
                        const spriteSize = getBoardSymbolSpriteSize(cellWidth, cellHeight);
                        const sprite = PIXI.Sprite.from(spritePath);
                        sprite.x = cellWidth / 2;
                        sprite.y = cellHeight / 2;
                        sprite.anchor.set(0.5);
                        sprite.width = spriteSize;
                        sprite.height = spriteSize;
                        group.addChild(sprite);
                    }
                    return group;
                };

                for (let row = 0; row < boardHeight; row++) {
                    const sym = state.board[col]?.[row];
                    reelStrip.addChild(createSymbolGroup(sym ? sym.definition : null, colYStart + row * cellHeight));
                }

                for (let i = 0; i < colRandomCount; i++) {
                    reelStrip.addChild(createSymbolGroup(pickRandomFromPool(), colYStart + (boardHeight + i) * cellHeight));
                }

                for (let i = 0; i < boardHeight; i++) {
                    const prevSym = state.prevBoard[col]?.[i];
                    reelStrip.addChild(createSymbolGroup(prevSym ? prevSym.definition : null, colYStart + (boardHeight + colRandomCount + i) * cellHeight));
                }

                reelStrip.y = stripOffsetY;
                const targetScrollY = (boardHeight + colRandomCount) * cellHeight;
                const colStartDelay = col * currentSpinConfig.stopInterval;

                this.reels.push({
                    container: reelStrip, mask, scrollY: 0, speed: 0, started: false, stopped: false,
                    decelerating: false, startDelay: colStartDelay, targetScrollY, cellHeight,
                    stripInitialY: stripOffsetY, reelContainer: reelStrip,
                });
            }
            this.spinActive = true;
        }

        // Draw slots (non-spinning)
        for (let x = 0; x < boardWidth; x++) {
            if (state.phase === 'spinning') continue;
            for (let y = 0; y < boardHeight; y++) {
                if (!isBoardSlotActive(state.board, x, y)) continue;
                const cellX = startX + gridOffsetX + x * (cellWidth + colGap);
                const cellY = startY + gridOffsetY + y * (cellHeight + rowGap);
                const symbol = state.board[x][y];
                if (!symbol) continue;

                if (this.combatRenderer.isAnimatingAttacker(x, y)) continue;

                const lm = state.lootMergeFx;
                const lootMergeFlying =
                    lm &&
                    state.phase === 'processing' &&
                    (state.effectPhase === 1 || state.effectPhase === 2);
                if (
                    lootMergeFlying &&
                    lm!.absorbed.x === x &&
                    lm!.absorbed.y === y
                ) {
                    continue;
                }
                if (
                    state.phase === 'processing' &&
                    symbol.is_marked_for_destruction &&
                    symbol.suppress_destroy_overlay &&
                    (state.effectPhase === 3 || state.effectPhase3ReachedThisRun)
                ) {
                    continue;
                }

                const isShakingDeath = state.combatShaking && symbol.is_marked_for_destruction;
                const drawTarget = isShakingDeath ? this.combatContainer : this.boardContainer;

                const isPreCombatShakeTarget =
                    !!state.preCombatShakeTarget &&
                    state.preCombatShakeTarget.x === x &&
                    state.preCombatShakeTarget.y === y;
                const preShakeX = isPreCombatShakeTarget
                    ? Math.sin(Date.now() / 22) * 5 * BOARD_DISPLAY_SCALE
                    : 0;
                const preShakeY = isPreCombatShakeTarget
                    ? Math.cos(Date.now() / 18) * 4 * BOARD_DISPLAY_SCALE
                    : 0;

                const symDef = symbol.definition;
                const canUseBoardSymbolAction =
                    state.phase === 'idle' || state.phase === 'food_payment';
                const canButcherPasture =
                    canUseBoardSymbolAction &&
                    (symDef.id === S.cattle || symDef.id === S.sheep) &&
                    !symbol.is_marked_for_destruction &&
                    boardHasAdjacentPlains(state.board, x, y);
                const canOpenLoot =
                    canUseBoardSymbolAction &&
                    !symbol.is_marked_for_destruction &&
                    isOpenableLoot(symDef.id);
                const canUseEdict =
                    canUseBoardSymbolAction &&
                    symDef.id === S.edict &&
                    !symbol.is_marked_for_destruction &&
                    boardHasDestroyableAdjacentSymbol(state.board, x, y);
                const canConsumeTribalVillage =
                    canUseBoardSymbolAction &&
                    symDef.id === S.tribal_village &&
                    !symbol.is_marked_for_destruction;

                const showSymbolHover = () => {
                    this.symbolHoverCell = { x, y };
                    this.onHoverSymbol({ definition: symDef, screenX: cellX + cellWidth, screenY: cellY });
                };
                const clearSymbolHover = () => {
                    this.symbolHoverCell = null;
                    this.onHoverSymbol(null);
                };

                if (canButcherPasture || canOpenLoot || canUseEdict || canConsumeTribalVillage) {
                    const cellRoot = new PIXI.Container();
                    cellRoot.x = cellX;
                    cellRoot.y = cellY;
                    cellRoot.eventMode = 'static';
                    cellRoot.cursor = GAME_CURSOR_POINTER;
                    // 명시적 hitArea — 자식 bounds 계산에 의존하지 않음
                    cellRoot.hitArea = new PIXI.Rectangle(0, 0, cellWidth, cellHeight);

                    // OblivionFurnaceBoardOverlay «제거» 버튼과 동일 스타일
                    const btnFs = Math.max(12, 18 * scale);
                    const btnPadY = Math.max(6.4, 10 * scale);
                    const btnPadX = Math.max(14.4, 22 * scale);
                    const btnLabel = canButcherPasture
                        ? t('cattleButcher.button', lang)
                        : canUseEdict
                          ? t('edictBoard.remove', lang)
                        : canOpenLoot
                          ? t('lootOpen.button', lang)
                        : canConsumeTribalVillage
                          ? t('tribalVillage.button', lang)
                          : t('lootOpen.button', lang);
                    const lbl = new PIXI.Text({
                        text: btnLabel,
                        style: new PIXI.TextStyle({
                            fill: '#ffffff',
                            fontSize: btnFs,
                            fontWeight: '800',
                            fontFamily,
                        }),
                    });
                    lbl.anchor.set(0.5);
                    const bw = lbl.width + btnPadX * 2;
                    const bh = lbl.height + btnPadY * 2;
                    const btnBg = new PIXI.Graphics();
                    btnBg.rect(-bw / 2, -bh / 2, bw, bh);
                    btnBg.fill({ color: 0xb91c1c, alpha: 1 });
                    btnBg.stroke({ width: 3 * BOARD_DISPLAY_SCALE, color: 0xfca5a5, alpha: 1 });

                    const actionBtn = new PIXI.Container();
                    actionBtn.addChild(btnBg);
                    actionBtn.addChild(lbl);
                    actionBtn.x = cellWidth / 2;
                    actionBtn.y = cellHeight / 2;
                    const pointer = this.pointerPosition?.source;
                    actionBtn.visible =
                        !!pointer &&
                        pointer.x >= cellX &&
                        pointer.x <= cellX + cellWidth &&
                        pointer.y >= cellY &&
                        pointer.y <= cellY + cellHeight;
                    actionBtn.eventMode = 'none';
                    cellRoot.addChild(actionBtn);

                    // 버튼 로컬 히트 영역 (cellRoot 좌표계)
                    const btnX1 = cellWidth / 2 - bw / 2;
                    const btnX2 = cellWidth / 2 + bw / 2;
                    const btnY1 = cellHeight / 2 - bh / 2;
                    const btnY2 = cellHeight / 2 + bh / 2;

                    cellRoot.on('pointerover', () => {
                        showSymbolHover();
                        actionBtn.visible = true;
                    });
                    cellRoot.on('pointerleave', () => {
                        clearSymbolHover();
                        actionBtn.visible = false;
                    });
                    cellRoot.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
                        if (!actionBtn.visible) return;
                        const local = e.getLocalPosition(cellRoot);
                        if (local.x >= btnX1 && local.x <= btnX2 && local.y >= btnY1 && local.y <= btnY2) {
                            if (canButcherPasture) {
                                const store = useGameStore.getState();
                                if (store.board[x]?.[y]?.definition.id === S.cattle) {
                                    void audioManager.play('cow_butcher');
                                }
                                store.butcherPastureAnimalAt(x, y);
                            } else if (canUseEdict) {
                                useGameStore.getState().activateEdictAt(x, y);
                            } else if (canConsumeTribalVillage) {
                                useGameStore.getState().consumeTribalVillageAt(x, y);
                            } else {
                                void audioManager.play('open_reward');
                                useGameStore.getState().openLootAt(x, y);
                            }
                            actionBtn.visible = false;
                            clearSymbolHover();
                        }
                    });

                    this.hitContainer.addChild(cellRoot);
                } else {
                    const hitArea = new PIXI.Graphics();
                    hitArea.rect(cellX, cellY, cellWidth, cellHeight);
                    hitArea.fill({ color: 0x000000, alpha: 0 });
                    hitArea.eventMode = 'static';
                    hitArea.cursor = GAME_CURSOR_POINTER;

                    hitArea.on('pointerover', () => {
                        showSymbolHover();
                    });
                    hitArea.on('pointerout', () => {
                        clearSymbolHover();
                    });
                    this.hitContainer.addChild(hitArea);
                }

                const rarityColor = getSymbolColor(symDef.type);

                // Processing highlight: 1) 본체만 lift, 2) contributors는 밝은 초록 틴트 + 위아래 흔들림
                const isProcessing = state.phase === 'processing';
                const isActive = isProcessing && !!(state.activeSlot && state.activeSlot.x === x && state.activeSlot.y === y);
                const isDestroyBlockedInBoardPick =
                    state.phase === 'oblivion_furnace_board' &&
                    (symDef.type === SymbolType.ENEMY || symDef.type === SymbolType.DISASTER);
                const earthquakeFx = state.earthquakeFx;
                const isEarthquakeShaking =
                    state.phase === 'processing' &&
                    !!earthquakeFx &&
                    earthquakeFx.affected.some((pos) => pos.x === x && pos.y === y);
                const earthquakeElapsedMs = isEarthquakeShaking
                    ? Math.max(0, getNowMs() - earthquakeFx!.startedAtMs)
                    : 0;
                const earthquakeProgress = isEarthquakeShaking && earthquakeFx!.durationMs > 0
                    ? clamp01(earthquakeElapsedMs / earthquakeFx!.durationMs)
                    : 1;
                const earthquakeShakeX = isEarthquakeShaking
                    ? Math.sin(earthquakeElapsedMs / 18) * (1 - earthquakeProgress * 0.25) * 9 * BOARD_DISPLAY_SCALE
                    : 0;
                const symbolAlpha = isEarthquakeShaking
                    ? 1
                    : symbol.is_marked_for_destruction
                    ? getDestroyMarkedAlpha(state, settings, isDestroyBlockedInBoardPick ? 0.48 : 1)
                    : isDestroyBlockedInBoardPick ? 0.48 : 1;
                const isContrib = isProcessing && state.activeContributors.some(c => c.x === x && c.y === y);
                const counterOverride = state.counterDisplayOverrides.find((o) => o.x === x && o.y === y);
                const activeMotion = isActive
                    ? this.getActiveSlotMotion(cellHeight, settings.effectSpeed)
                    : { x: 0, y: 0, shadowScale: 0, shadowAlpha: 0 };
                const productionStickerMotion = this.getProductionStickerMotionForCell(x, y, settings.effectSpeed);
                const activeProductionScale = productionStickerMotion.scale;
                const productionStickerTilt = productionStickerMotion.tilt;
                const productionStickerOrbitX = productionStickerMotion.orbitX;
                const productionStickerOrbitY = productionStickerMotion.orbitY;
                const activeOffsetX = activeMotion.x;
                const activeOffsetY = activeMotion.y;
                // phase 2일 때만 contributor 위아래 2회 왔다갔다 (phase 3에서는 wobble 없음)
                const wobbleY = isContrib && state.effectPhase === 2
                    ? Math.sin(this.contributorWobbleTime * (4 * Math.PI / 280)) * 10 * BOARD_DISPLAY_SCALE
                    : 0;
                const contribGreenTint = isContrib ? 0x90ee90 : 0xffffff; // 밝은 초록
                const isActionable =
                    canButcherPasture || canOpenLoot || canUseEdict || canConsumeTribalVillage;

                // active 심볼: 들린 것 + 바로 아랫쪽에 픽셀 느낌 화살표(머리만, ▲, 밝은 연두 + 검은 테두리)
                if (isActive) {
                    if (activeMotion.shadowAlpha > 0) {
                        const shadow = new PIXI.Graphics();
                        const shadowCx = cellX + cellWidth / 2;
                        const shadowCy = cellY + cellHeight * 0.72;
                        const shadowW = cellWidth * (0.35 + activeMotion.shadowScale * 0.12);
                        const shadowH = cellHeight * (0.055 + activeMotion.shadowScale * 0.018);
                        type BlurFilterCtor = new (strength: number) => PIXI.Filter;
                        const BlurFilterCtor = (PIXI as unknown as { BlurFilter?: BlurFilterCtor }).BlurFilter;
                        if (BlurFilterCtor) {
                            shadow.filters = [new BlurFilterCtor(Math.max(5, cellHeight * 0.045))];
                        }
                        shadow.ellipse(shadowCx, shadowCy, shadowW * 1.22, shadowH * 1.35);
                        shadow.fill({ color: 0x000000, alpha: activeMotion.shadowAlpha * 0.32 });
                        shadow.ellipse(shadowCx, shadowCy, shadowW * 0.86, shadowH);
                        shadow.fill({ color: 0x000000, alpha: activeMotion.shadowAlpha * 0.44 });
                        shadow.ellipse(shadowCx, shadowCy, shadowW * 0.48, shadowH * 0.58);
                        shadow.fill({ color: 0x000000, alpha: activeMotion.shadowAlpha * 0.34 });
                        this.effectsContainer.addChild(shadow);
                    }
                    const arrowG = new PIXI.Graphics();
                    const cx = cellX + cellWidth / 2 + activeOffsetX * 0.25;
                    const base = cellY + cellHeight * 0.92 + activeOffsetY * 0.12;
                    const s = Math.max(5, Math.min(cellWidth, cellHeight) * 0.07);
                    arrowG.moveTo(cx, base - s);
                    arrowG.lineTo(cx - s, base + s);
                    arrowG.lineTo(cx + s, base + s);
                    arrowG.closePath();
                    arrowG.fill({ color: 0x7cff7c, alpha: 0.98 });
                    arrowG.stroke({ color: 0x000000, width: 2 * BOARD_DISPLAY_SCALE, alpha: 1 });
                    this.effectsContainer.addChild(arrowG);
                }

                const spritePath = getSymbolSpriteUrl(symDef);
                if (spritePath) {
                    const spriteSize = getBoardSymbolSpriteSize(cellWidth, cellHeight);
                    const spriteCenterX = cellX + cellWidth / 2 + activeOffsetX + preShakeX + earthquakeShakeX;
                    const spriteCenterY = cellY + cellHeight / 2 + activeOffsetY + wobbleY + preShakeY;
                    const texture = PIXI.Texture.from(spritePath);
                    if (productionStickerTilt > 0) {
                        const halfSize = spriteSize * activeProductionScale / 2;
                        const projectCorner = (cornerX: number, cornerY: number) => {
                            const depth = (
                                productionStickerOrbitX * cornerX
                                + productionStickerOrbitY * cornerY
                            ) * productionStickerTilt;
                            const perspectiveScale = 1 + depth * PRODUCTION_STICKER_DEPTH;
                            return {
                                x: cornerX * halfSize * perspectiveScale,
                                y: cornerY * halfSize * perspectiveScale
                                    - depth * spriteSize * PRODUCTION_STICKER_LIFT,
                            };
                        };
                        const topLeft = projectCorner(-1, -1);
                        const topRight = projectCorner(1, -1);
                        const bottomRight = projectCorner(1, 1);
                        const bottomLeft = projectCorner(-1, 1);
                        const mesh = new PIXI.PerspectiveMesh({
                            texture,
                            verticesX: 6,
                            verticesY: 6,
                        });
                        mesh.setCorners(
                            topLeft.x, topLeft.y,
                            topRight.x, topRight.y,
                            bottomRight.x, bottomRight.y,
                            bottomLeft.x, bottomLeft.y,
                        );
                        mesh.x = spriteCenterX
                            + productionStickerMotion.driftX * spriteSize * PRODUCTION_STICKER_DRIFT_X;
                        mesh.y = spriteCenterY
                            + productionStickerMotion.driftY * spriteSize * PRODUCTION_STICKER_DRIFT_Y;
                        mesh.alpha = symbolAlpha;
                        if (isContrib) mesh.tint = contribGreenTint;
                        drawTarget.addChild(mesh);
                    } else {
                        const sprite = new PIXI.Sprite(texture);
                        sprite.anchor.set(0.5);
                        sprite.x = spriteCenterX;
                        sprite.y = spriteCenterY;
                        sprite.width = spriteSize;
                        sprite.height = spriteSize;
                        sprite.alpha = symbolAlpha;
                        if (isContrib) sprite.tint = contribGreenTint;
                        drawTarget.addChild(sprite);
                    }
                } else {
                    const symName = t(`symbol.${symDef.key}.name`, lang);
                    const fillColor = isContrib ? '#90ee90' : rarityColor;
                    const nameText = new PIXI.Text({
                        text: symName,
                        style: new PIXI.TextStyle({
                            fill: fillColor,
                            fontSize: 32 * fs,
                            fontFamily,
                            stroke: { color: '#000000', width: 2 * fs },
                        }),
                    });
                    nameText.anchor.set(0.5);
                    nameText.x = cellX + cellWidth / 2 + activeOffsetX + preShakeX;
                    nameText.y = cellY + cellHeight / 2 + activeOffsetY + wobbleY + preShakeY;
                    nameText.scale.set(activeProductionScale);
                    nameText.skew.set(-0.16 * productionStickerTilt, 0.06 * productionStickerTilt);
                    nameText.alpha = symbolAlpha;
                    drawTarget.addChild(nameText);
                }

                // 클릭 가능한 액션 심볼: 우상단 경고 배지
                if (isActionable) {
                    const actionSpriteSize = getBoardSymbolSpriteSize(cellWidth, cellHeight);
                    const actionSpriteCenterX = cellX + cellWidth / 2 + activeOffsetX + preShakeX;
                    const actionSpriteCenterY =
                        cellY + cellHeight / 2 + activeOffsetY + wobbleY + preShakeY;
                    const badgeSize = 40 * scale;
                    const badgeX = actionSpriteCenterX + actionSpriteSize / 2 + 6 * scale;
                    const badgeY = actionSpriteCenterY - actionSpriteSize / 2 - 6 * scale;
                    const badge = new PIXI.Graphics();
                    badge.poly([
                        badgeX - badgeSize,
                        badgeY,
                        badgeX,
                        badgeY,
                        badgeX,
                        badgeY + badgeSize,
                    ]);
                    badge.fill({ color: 0xf97316 });
                    badge.stroke({
                        color: 0xffedd5,
                        width: Math.max(1, 2 * scale),
                        alpha: 0.9,
                    });
                    drawTarget.addChild(badge);

                    const mark = new PIXI.Text({
                        text: '!',
                        style: new PIXI.TextStyle({
                            fill: '#ffffff',
                            fontSize: 23 * scale,
                            fontWeight: 'bold',
                            fontFamily,
                            stroke: {
                                color: '#7c2d12',
                                width: Math.max(1, 2 * scale),
                            },
                        }),
                    });
                    mark.anchor.set(0.5);
                    mark.x = badgeX - badgeSize * 0.28;
                    mark.y = badgeY + badgeSize * 0.28;
                    drawTarget.addChild(mark);
                }

                // 바나나 영구 식량 보너스: 좌하단 별도 표시
                if (symDef.id === S.banana) {
                    const perm = symbol.banana_permanent_food_bonus ?? 0;
                    if (perm > 0) {
                        const permText = new PIXI.Text({
                            text: `+${perm}`,
                            style: new PIXI.TextStyle({ fill: '#8b7355', fontSize: 36 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3.5 * fs } }),
                        });
                        permText.anchor.set(0.5, 0.5);
                        permText.x = cellX + 25 * fs + activeOffsetX;
                        permText.y = cellY + cellHeight - 24 * fs + activeOffsetY + wobbleY;
                        drawTarget.addChild(permText);
                    }
                }
                // 우하단 카운터: 바나나는 열대우림 인접 카운터만 숫자로 표시
                const genericCounterText =
                    symbol.effect_counter > 0 &&
                    symDef.type !== SymbolType.ENEMY &&
                    symDef.base_hp === undefined
                        ? String(symbol.effect_counter)
                        : '';
                const boardCounterOverlay = counterOverride
                    ? (counterOverride.text ?? '')
                    : genericCounterText;
                if (boardCounterOverlay) {
                    const counterText = new PIXI.Text({
                        text: boardCounterOverlay,
                        style: new PIXI.TextStyle({ fill: '#8b7355', fontSize: 36 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3.5 * fs } }),
                    });
                    counterText.anchor.set(0.5, 0.5);
                    counterText.x = cellX + cellWidth - 21 * fs + activeOffsetX;
                    counterText.y = cellY + cellHeight - 24 * fs + activeOffsetY + wobbleY;
                    drawTarget.addChild(counterText);
                }

                if (symDef.base_attack !== undefined && symDef.base_attack > 0) {
                    const atkBg = new PIXI.Text({
                        text: '⚔',
                        style: new PIXI.TextStyle({ fill: '#ff8c42', fontSize: 68 * fs, fontFamily }),
                    });
                    atkBg.anchor.set(0.5, 0.5);
                    atkBg.x = cellX + 24 * fs + activeOffsetX;
                    atkBg.y = cellY + cellHeight - 24 * fs + activeOffsetY + wobbleY;
                    atkBg.alpha = 0.4;
                    drawTarget.addChild(atkBg);

                    const atkText = new PIXI.Text({
                        text: String(symDef.base_attack),
                        style: new PIXI.TextStyle({ fill: '#ffffff', fontSize: 36 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3.5 * fs } }),
                    });
                    atkText.anchor.set(0.5, 0.5);
                    atkText.x = cellX + 25 * fs + activeOffsetX;
                    atkText.y = cellY + cellHeight - 24 * fs + activeOffsetY + wobbleY;
                    drawTarget.addChild(atkText);
                }

                if (symDef.base_hp !== undefined && symDef.base_hp > 0) {
                    const hpBg = new PIXI.Text({
                        text: '♥',
                        style: new PIXI.TextStyle({ fill: '#4ade80', fontSize: 68 * fs, fontFamily }),
                    });
                    hpBg.anchor.set(0.5, 0.5);
                    hpBg.x = cellX + cellWidth - 20 * fs + activeOffsetX;
                    hpBg.y = cellY + cellHeight - 24 * fs + activeOffsetY + wobbleY;
                    hpBg.alpha = 0.4;
                    drawTarget.addChild(hpBg);

                    const hpText = new PIXI.Text({
                        text: String(symbol.enemy_hp ?? symDef.base_hp),
                        style: new PIXI.TextStyle({ fill: '#ffffff', fontSize: 36 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3.5 * fs } }),
                    });
                    hpText.anchor.set(0.5, 0.5);
                    hpText.x = cellX + cellWidth - 21 * fs + activeOffsetX;
                    hpText.y = cellY + cellHeight - 24 * fs + activeOffsetY + wobbleY;
                    drawTarget.addChild(hpText);
                }

            }
        }

        // 인접 전리품 합류: 원본 칸은 숨기고 스프라이트가 receiver 쪽으로 이동하는 연출
        const lmDraw = state.lootMergeFx;
        if (
            lmDraw &&
            state.phase === 'processing' &&
            (state.effectPhase === 1 || state.effectPhase === 2)
        ) {
            const ax = lmDraw.absorbed.x;
            const ay = lmDraw.absorbed.y;
            const rx = lmDraw.receiver.x;
            const ry = lmDraw.receiver.y;
            const absorbedInst = state.board[ax]?.[ay];
            if (absorbedInst) {
                const defFly = absorbedInst.definition;
                const path = getSymbolSpriteUrl(defFly);
                if (path) {
                    const spriteSizeBase = getBoardSymbolSpriteSize(cellWidth, cellHeight);
                    const fromCX =
                        startX + gridOffsetX + ax * (cellWidth + colGap) + cellWidth / 2;
                    const fromCY =
                        startY + gridOffsetY + ay * (cellHeight + rowGap) + cellHeight / 2;
                    const recvActive =
                        state.activeSlot?.x === rx && state.activeSlot?.y === ry;
                    const recvMotion = recvActive
                        ? this.getActiveSlotMotion(cellHeight, settings.effectSpeed)
                        : { x: 0, y: 0 };
                    const toCX =
                        startX + gridOffsetX + rx * (cellWidth + colGap) + cellWidth / 2 + recvMotion.x;
                    const toCY =
                        startY + gridOffsetY + ry * (cellHeight + rowGap) + cellHeight / 2 + recvMotion.y;
                    const nowPerf =
                        typeof globalThis.performance !== 'undefined'
                            ? globalThis.performance.now()
                            : Date.now();
                    const rawT = Math.max(
                        0,
                        Math.min(1, (nowPerf - lmDraw.startedAtPerfMs) / lmDraw.durationMs),
                    );
                    const e = rawT * rawT * (3 - 2 * rawT); // smoothstep
                    const fly = PIXI.Sprite.from(path);
                    fly.anchor.set(0.5);
                    const shrinking = spriteSizeBase * (1 - 0.08 * rawT);
                    fly.width = shrinking;
                    fly.height = shrinking;
                    fly.x = fromCX + (toCX - fromCX) * e;
                    fly.y = fromCY + (toCY - fromCY) * e;
                    fly.alpha = 0.94 + 0.06 * e;
                    this.effectsContainer.addChild(fly);
                }
            }
        }

        const floatLayout = { ...this.cellLayout!, scale, fontFamily };
        this.floatingTextRenderer.renderBoardEffectFloats(state, floatLayout);
        this.floatingTextRenderer.renderCombatFloats(state, floatLayout);
        this.floatingTextRenderer.renderThreatFloats(state, floatLayout);
        this.floatingTextRenderer.resetKnowledgeUpgradeFloatCountIfEmpty(state);

        this.hudRenderer.render(viewScale, w);
        this.statusRenderer.render(
            state,
            viewScale,
            w,
            frame.height,
            fontFamily,
        );
        const boardLeft = startX + gridOffsetX;
        const boardRight = boardLeft + boardWidth * cellWidth + Math.max(0, boardWidth - 1) * colGap;
        this.relicRenderer.render(state, viewScale, w, boardLeft, boardRight, fontFamily);
        this.syncHoverTooltipsAfterBoardRebuild(state, startX, startY, cellWidth, cellHeight, gridOffsetX, gridOffsetY, colGap, rowGap);
    }

    private syncHoverTooltipsAfterBoardRebuild(
        state: GameState,
        startX: number,
        startY: number,
        cellWidth: number,
        cellHeight: number,
        gridOffsetX: number,
        gridOffsetY: number,
        colGap: number,
        rowGap: number
    ) {
        if (state.phase === 'spinning') {
            if (this.symbolHoverCell) {
                this.symbolHoverCell = null;
                this.onHoverSymbol?.(null);
            }
        } else if (this.symbolHoverCell && this.onHoverSymbol) {
            const { x, y } = this.symbolHoverCell;
            const symbol = state.board[x]?.[y];
            if (!symbol || (state.combatAnimation && state.combatAnimation.ax === x && state.combatAnimation.ay === y)) {
                this.symbolHoverCell = null;
                this.onHoverSymbol(null);
            } else {
                const cellX = startX + gridOffsetX + x * (cellWidth + colGap);
                const cellY = startY + gridOffsetY + y * (cellHeight + rowGap);
                this.onHoverSymbol({
                    definition: symbol.definition,
                    screenX: cellX + cellWidth,
                    screenY: cellY,
                });
            }
        }

        this.relicRenderer.syncHoverAfterRebuild(this.pointerPosition?.output ?? null);
        this.statusRenderer.syncHover(this.pointerPosition?.output ?? null);
        this.upgradeRenderer.syncHoverAfterRebuild();

        if (this.hudHoverSnapshot && this.onHoverHudStat) {
            this.onHoverHudStat(this.hudHoverSnapshot);
        }
    }

    public triggerCombatAnimation(anim: { ax: number; ay: number; tx: number; ty: number; atkDmg: number; counterDmg: number }) {
        this.combatRenderer.trigger(anim, this.cellLayout);
        this.renderBoard(useGameStore.getState(), useSettingsStore.getState());
    }
}
