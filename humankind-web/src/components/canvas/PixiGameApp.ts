import * as PIXI from 'pixi.js';
import {
    BOARD_WIDTH,
    BOARD_HEIGHT,
    useGameStore,
} from '../../game/state/gameStore';
import type { GameState } from '../../game/state/gameStore';
import { SPIN_SPEED_CONFIG, useSettingsStore } from '../../game/state/settingsStore';
import type { SettingsState } from '../../game/state/settingsStore';
import { t } from '../../i18n';
import { getSymbolColor, SymbolType, S } from '../../game/data/symbolDefinitions';
import type { SymbolDefinition } from '../../game/data/symbolDefinitions';
import type { HoveredSymbol, HoveredRelic, HoveredUpgrade, HoveredHudStat, CellLayout, ReelState } from './types';
import { loadGameAssets } from './AssetLoader';
import { BoardRenderer } from './renderers/BoardRenderer';
import { CombatRenderer } from './renderers/CombatRenderer';
import { FloatingTextRenderer } from './renderers/FloatingTextRenderer';
import { HudRenderer } from './renderers/HudRenderer';
import { RelicRenderer } from './renderers/RelicRenderer';
import { UpgradeRenderer } from './renderers/UpgradeRenderer';
import { audioManager, type AudioPlaybackHandle } from '../../audio/audioManager';
import { DEFAULT_AUDIO_CUES } from '../../audio/audioCues';
import {
    GAME_CURSOR_POINTER,
    boardHasAdjacentPlains,
    boardHasDestroyableAdjacentSymbol,
    boardHasTrainableAdjacentMelee,
    isOpenableLoot,
} from './renderers/rendererShared';
import { getSymbolSpriteUrl } from '../../game/data/symbolSpritePaths';

const SPIN_AUDIO_ESTIMATE_TICK_MS = 1000 / 60;
const CONTRIBUTOR_WOBBLE_SECOND_SOUND_MS = 140;

const clampPlaybackRate = (value: number) => Math.min(4, Math.max(0.25, value));

function estimateSpinDurationMs(args: {
    cellHeight: number;
    speedMul: number;
    stopInterval: number;
}) {
    const { cellHeight, speedMul, stopInterval } = args;
    if (speedMul <= 0) return 0;

    const reelSpeed = 1.2 * speedMul;
    const decelZone = cellHeight * 1.5;
    const baseRandomCount = 12;
    let latestStopMs = 0;

    for (let col = 0; col < BOARD_WIDTH; col++) {
        let elapsedMs = 0;
        let scrollY = 0;
        let stopped = false;
        let started = false;
        const startDelay = col * stopInterval;
        const colRandomCount = baseRandomCount + col;
        const targetScrollY = (BOARD_HEIGHT + colRandomCount) * cellHeight;

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
    /** init() 완료 전 destroy 시 ResizePlugin 등이 미초기화라 Pixi destroy가 터질 수 있음 (React Strict Mode 등) */
    private pixiInitComplete = false;

    // Containers
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
    private upgradeRenderer: UpgradeRenderer;

    // Callbacks
    private onHoverSymbol: (symbol: HoveredSymbol | null) => void;
    private onHoverHudStat!: (stat: HoveredHudStat | null) => void;
    private hudHoverSnapshot: HoveredHudStat | null = null;

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

    /** renderBoard가 히트영역을 갈아엎어도 포인터는 그대로일 수 있어, 마지막 호버를 저장 후 재동기화 */
    private symbolHoverCell: { x: number; y: number } | null = null;

    private getPulse01() {
        // 0..1 부드러운 펄스
        return 0.5 + 0.5 * Math.sin(Date.now() / 140);
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



    constructor(
        canvas: HTMLDivElement,
        onHoverSymbol: (symbol: HoveredSymbol | null) => void,
        onHoverRelic: (relic: HoveredRelic | null) => void,
        onHoverUpgrade: (upgrade: HoveredUpgrade | null) => void,
        onHoverHudStat: (stat: HoveredHudStat | null) => void
    ) {
        this.app = new PIXI.Application();
        this.canvas = canvas;
        this.onHoverSymbol = onHoverSymbol;
        this.onHoverHudStat = onHoverHudStat;
        this.hitContainer.eventMode = 'static';
        this.boardRenderer = new BoardRenderer({
            bgContainer: this.bgContainer,
            boardContainer: this.boardContainer,
        });
        this.floatingTextRenderer = new FloatingTextRenderer(this.floatContainer);
        this.combatRenderer = new CombatRenderer(this.combatContainer, this.floatingTextRenderer);
        this.hudRenderer = new HudRenderer(this.hudTopContainer);
        this.relicRenderer = new RelicRenderer({
            bgContainer: this.bgContainer,
            hitContainer: this.hitContainer,
            floatingTextRenderer: this.floatingTextRenderer,
            onHoverRelic,
        });
        this.upgradeRenderer = new UpgradeRenderer(onHoverUpgrade);
        audioManager.registerCue('spin_loop', DEFAULT_AUDIO_CUES.spin_loop);
    }

    public async init() {
        PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';
        // Tauri 프로토콜 환경에서는 XHR/Fetch에 CORS 헤더가 없을 수 있어서,
        // Pixi가 이미지 로드 시 crossOrigin 속성을 강제로 붙이지 않도록 합니다.
        // (React <img>는 표시 자체가 되지만, Pixi 로더는 실패해서 보드 스프라이트가 안 보이는 케이스가 있습니다.)
        (PIXI.TextureSource.defaultOptions as unknown as { crossOrigin?: string | null }).crossOrigin = null;
        await this.app.init({
            background: '#000000',
            antialias: false,
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
        await loadGameAssets();

        if (this.destroyed) return;

        this.app.stage.eventMode = 'static';
        this.app.stage.addChild(this.bgContainer);
        this.app.stage.addChild(this.boardContainer);
        this.app.stage.addChild(this.spinContainer);
        this.app.stage.addChild(this.combatContainer);
        this.app.stage.addChild(this.effectsContainer);
        this.app.stage.addChild(this.floatContainer);
        this.app.stage.addChild(this.hitContainer);
        this.app.stage.addChild(this.hudTopContainer);

        this.app.ticker.add((ticker) => this.onTick(ticker));
    }

    public destroy() {
        this.destroyed = true;
        this.stopSpinLoop();
        if (this.app) {
            try {
                if (this.pixiInitComplete && this.app.renderer) {
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
        if (!this.destroyed && this.app && this.app.renderer) {
            this.app.renderer.resize(width, height);
        }
    }

    /** 오버레이 열림 등으로 보드 툴팁을 끌 때 HUD 스냅샷도 초기화 */
    public clearHudHover() {
        this.hudHoverSnapshot = null;
        this.onHoverHudStat?.(null);
    }

    private onTick(ticker: PIXI.Ticker) {
        const dt = ticker.deltaMS;

        this.floatingTextRenderer.tick(dt);
        const combatBounceFinished = this.combatRenderer.tick(dt);
        this.hudRenderer.tickFoodDemandShake();

        // Contributor wobble: phase 2일 때만 타이머 증가·렌더 (phase 3 진입 시 두 번째 wobble 방지)
        const state = useGameStore.getState();
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
            this.renderBoard(state, useSettingsStore.getState());
        } else {
            this.contributorWobbleTime = 0;
            this.contributorWobbleSoundCount = 0;
        }

        // Pre-combat shake (e.g., Clovis relic): 흔들림은 시간 기반이므로 매 프레임 렌더가 필요
        if (state.preCombatShakeTarget || state.preCombatShakeRelicDefId) {
            this.renderBoard(state, useSettingsStore.getState());
        }

        if (combatBounceFinished) {
            this.renderBoard(state, useSettingsStore.getState());
        }

        // Reel spinning
        if (this.spinActive) {
            const spinConfig = SPIN_SPEED_CONFIG[useSettingsStore.getState().spinSpeed];

            // instant: 즉시 완료
            if (spinConfig.speedMul === 0) {
                for (const reel of this.reels) {
                    reel.scrollY = reel.targetScrollY;
                    reel.stopped = true;
                    reel.reelContainer.y = reel.stripInitialY + reel.scrollY;
                }
                this.finishSpin();
                return;
            }

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
        this.spinContainer.removeChildren();
        for (const reel of this.reels) { reel.mask.destroy(); }
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
        if (!this.app || !this.app.renderer || this.destroyed) return;

        const w = this.app.screen?.width || 1920;

        this.combatRenderer.setShaking(state.combatShaking);
        this.floatingTextRenderer.resetThreatGateIfNeeded(state.phase);

        this.boardContainer.removeChildren();
        this.effectsContainer.removeChildren();
        this.hitContainer.removeChildren();
        this.bgContainer.removeChildren();
        this.hudTopContainer.removeChildren();
        this.floatingTextRenderer.clearThreats();

        this.combatRenderer.clearIfNoAnimation(!!state.combatAnimation);

        const frame = this.boardRenderer.beginFrame(this.app, state, settings);
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
        } = frame;
        const lang = settings.language;
        const fontFamily = frame.fontFamily;
        const fs = 1;
        const rowGap = frame.rowGap;

        // (식량 납부 / 야만인 알림은 NotificationPanel React 컴포넌트가 처리)

        this.cellLayout = this.boardRenderer.toCellLayout(frame);


        // Spin initialization logic
        if (state.phase === 'spinning' && !this.spinActive) {
            this.spinContainer.removeChildren();
            this.reels = [];
            this.spinElapsed = 0;

            const totalBoardSlots = BOARD_WIDTH * BOARD_HEIGHT;
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
                }));
            }

            for (let col = 0; col < BOARD_WIDTH; col++) {
                const colX = startX + gridOffsetX + col * (cellWidth + colGap);
                const colYStart = startY + gridOffsetY;
                const visibleHeight = cellHeight * BOARD_HEIGHT;

                const mask = new PIXI.Graphics();
                mask.rect(colX, colYStart, cellWidth, visibleHeight);
                mask.fill({ color: 0xffffff });
                this.spinContainer.addChild(mask);

                const reelStrip = new PIXI.Container();
                reelStrip.mask = mask;
                this.spinContainer.addChild(reelStrip);

                const extraPerCol = 1;
                const colRandomCount = RANDOM_COUNT + col * extraPerCol;
                const stripOffsetY = -(BOARD_HEIGHT + colRandomCount) * cellHeight;

                const createSymbolGroup = (def: SymbolDefinition | null, yPos: number) => {
                    const group = new PIXI.Container();
                    group.x = colX;
                    group.y = yPos;
                    const spritePath = def ? getSymbolSpriteUrl(def) : null;
                    if (spritePath) {
                        const SPRITE_PX = 32;
                        const rawSize = Math.min(cellWidth - 6, cellHeight) * 0.85;
                        const spriteSize = SPRITE_PX * Math.max(1, Math.floor(rawSize / SPRITE_PX));
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

                for (let row = 0; row < BOARD_HEIGHT; row++) {
                    const sym = state.board[col][row];
                    reelStrip.addChild(createSymbolGroup(sym ? sym.definition : null, colYStart + row * cellHeight));
                }

                for (let i = 0; i < colRandomCount; i++) {
                    reelStrip.addChild(createSymbolGroup(pickRandomFromPool(), colYStart + (BOARD_HEIGHT + i) * cellHeight));
                }

                for (let i = 0; i < BOARD_HEIGHT; i++) {
                    const prevSym = state.prevBoard[col]?.[i];
                    reelStrip.addChild(createSymbolGroup(prevSym ? prevSym.definition : null, colYStart + (BOARD_HEIGHT + colRandomCount + i) * cellHeight));
                }

                reelStrip.y = stripOffsetY;
                const targetScrollY = (BOARD_HEIGHT + colRandomCount) * cellHeight;
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
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (state.phase === 'spinning') continue;
            for (let y = 0; y < BOARD_HEIGHT; y++) {
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
                const preShakeX = isPreCombatShakeTarget ? Math.sin(Date.now() / 22) * 5 : 0;
                const preShakeY = isPreCombatShakeTarget ? Math.cos(Date.now() / 18) * 4 : 0;

                const symDef = symbol.definition;
                const canButcherPasture =
                    state.phase === 'idle' &&
                    (symDef.id === S.cattle || symDef.id === S.sheep) &&
                    !symbol.is_marked_for_destruction &&
                    boardHasAdjacentPlains(state.board, x, y);
                const canTrainHorse =
                    state.phase === 'idle' &&
                    symDef.id === S.horse &&
                    !symbol.is_marked_for_destruction &&
                    boardHasTrainableAdjacentMelee(state.board, x, y, state.unlockedKnowledgeUpgrades);

                const canOpenLoot =
                    state.phase === 'idle' &&
                    !symbol.is_marked_for_destruction &&
                    isOpenableLoot(symDef.id);
                const canUseEdict =
                    state.phase === 'idle' &&
                    symDef.id === S.edict &&
                    !symbol.is_marked_for_destruction &&
                    boardHasDestroyableAdjacentSymbol(state.board, x, y);
                const canConsumeTribalVillage =
                    state.phase === 'idle' &&
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

                if (canButcherPasture || canTrainHorse || canOpenLoot || canUseEdict || canConsumeTribalVillage) {
                    const cellRoot = new PIXI.Container();
                    cellRoot.x = cellX;
                    cellRoot.y = cellY;
                    cellRoot.eventMode = 'static';
                    cellRoot.cursor = GAME_CURSOR_POINTER;
                    // 명시적 hitArea — 자식 bounds 계산에 의존하지 않음
                    cellRoot.hitArea = new PIXI.Rectangle(0, 0, cellWidth, cellHeight);

                    // OblivionFurnaceBoardOverlay «제거» 버튼과 동일 스타일
                    const btnFs = Math.max(15, 18 * scale);
                    const btnPadY = Math.max(8, 10 * scale);
                    const btnPadX = Math.max(18, 22 * scale);
                    const btnLabel = canButcherPasture
                        ? t('cattleButcher.button', lang)
                        : canUseEdict
                          ? t('edictBoard.remove', lang)
                        : canOpenLoot
                          ? t('lootOpen.button', lang)
                        : canConsumeTribalVillage
                          ? t('tribalVillage.button', lang)
                          : t('horseTrain.button', lang);
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
                    btnBg.stroke({ width: 3, color: 0xfca5a5, alpha: 1 });

                    const actionBtn = new PIXI.Container();
                    actionBtn.addChild(btnBg);
                    actionBtn.addChild(lbl);
                    actionBtn.x = cellWidth / 2;
                    actionBtn.y = cellHeight / 2;
                    actionBtn.visible = false;
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
                                useGameStore.getState().butcherPastureAnimalAt(x, y);
                            } else if (canUseEdict) {
                                useGameStore.getState().activateEdictAt(x, y);
                            } else if (canTrainHorse) {
                                useGameStore.getState().trainHorseUnitAt(x, y);
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

                const innerW = cellWidth - 6;
                const rarityColor = getSymbolColor(symDef.type);

                // Processing highlight: 1) 본체만 lift, 2) contributors는 밝은 초록 틴트 + 위아래 흔들림
                const isProcessing = state.phase === 'processing';
                const isActive = isProcessing && !!(state.activeSlot && state.activeSlot.x === x && state.activeSlot.y === y);
                const isDestroyBlockedInBoardPick =
                    state.phase === 'oblivion_furnace_board' &&
                    (symDef.type === SymbolType.ENEMY || symDef.type === SymbolType.DISASTER);
                const symbolAlpha = isDestroyBlockedInBoardPick ? 0.48 : 1;
                const isContrib = isProcessing && state.activeContributors.some(c => c.x === x && c.y === y);
                const counterOverride = state.counterDisplayOverrides.find((o) => o.x === x && o.y === y);
                const liftY = isActive ? -cellHeight * 0.14 : 0;
                // phase 2일 때만 contributor 위아래 2회 왔다갔다 (phase 3에서는 wobble 없음)
                const wobbleY = isContrib && state.effectPhase === 2 ? Math.sin(this.contributorWobbleTime * (4 * Math.PI / 280)) * 10 : 0;
                const contribGreenTint = isContrib ? 0x90ee90 : 0xffffff; // 밝은 초록

                // active 심볼: 들린 것 + 바로 아랫쪽에 픽셀 느낌 화살표(머리만, ▲, 밝은 연두 + 검은 테두리)
                if (isActive) {
                    const arrowG = new PIXI.Graphics();
                    const cx = cellX + cellWidth / 2;
                    const base = cellY + cellHeight * 0.92;
                    const s = Math.max(5, Math.min(cellWidth, cellHeight) * 0.07);
                    arrowG.moveTo(cx, base - s);
                    arrowG.lineTo(cx - s, base + s);
                    arrowG.lineTo(cx + s, base + s);
                    arrowG.closePath();
                    arrowG.fill({ color: 0x7cff7c, alpha: 0.98 });
                    arrowG.stroke({ color: 0x000000, width: 2, alpha: 1 });
                    this.effectsContainer.addChild(arrowG);
                }

                const spritePath = getSymbolSpriteUrl(symDef);
                if (spritePath) {
                    const SPRITE_PX = 32;
                    const rawSize = Math.min(innerW, cellHeight) * 0.85;
                    const spriteSize = SPRITE_PX * Math.max(1, Math.floor(rawSize / SPRITE_PX));
                    const sprite = PIXI.Sprite.from(spritePath);
                    sprite.x = cellX + cellWidth / 2 + preShakeX;
                    sprite.y = cellY + cellHeight / 2 + liftY + wobbleY + preShakeY;
                    sprite.anchor.set(0.5);
                    sprite.width = spriteSize;
                    sprite.height = spriteSize;
                    sprite.alpha = symbolAlpha;
                    if (isContrib) sprite.tint = contribGreenTint;
                    drawTarget.addChild(sprite);
                } else {
                    const symName = t(`symbol.${symDef.key}.name`, lang);
                    const fillColor = isContrib ? '#90ee90' : rarityColor;
                    const nameText = new PIXI.Text({
                        text: symName,
                        style: new PIXI.TextStyle({ fill: fillColor, fontSize: 32 * fs, fontFamily, stroke: { color: '#000000', width: 2 } }),
                    });
                    nameText.anchor.set(0.5);
                    nameText.x = cellX + cellWidth / 2 + preShakeX;
                    nameText.y = cellY + cellHeight / 2 + liftY + wobbleY + preShakeY;
                    nameText.alpha = symbolAlpha;
                    drawTarget.addChild(nameText);
                }

                // 바나나 영구 식량 보너스: 좌하단 별도 표시
                if (symDef.id === S.banana) {
                    const perm = symbol.banana_permanent_food_bonus ?? 0;
                    if (perm > 0) {
                        const permText = new PIXI.Text({
                            text: `+${perm}`,
                            style: new PIXI.TextStyle({ fill: '#8b7355', fontSize: 30 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3 } }),
                        });
                        permText.anchor.set(0.5, 0.5);
                        permText.x = cellX + 25;
                        permText.y = cellY + cellHeight - 24 + liftY + wobbleY;
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
                        style: new PIXI.TextStyle({ fill: '#8b7355', fontSize: 30 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3 } }),
                    });
                    counterText.anchor.set(0.5, 0.5);
                    counterText.x = cellX + cellWidth - 21;
                    counterText.y = cellY + cellHeight - 24 + liftY + wobbleY;
                    drawTarget.addChild(counterText);
                }

                if (symDef.base_attack !== undefined && symDef.base_attack > 0) {
                    const atkBg = new PIXI.Text({
                        text: '⚔',
                        style: new PIXI.TextStyle({ fill: '#ff8c42', fontSize: 60 * fs, fontFamily }),
                    });
                    atkBg.anchor.set(0.5, 0.5);
                    atkBg.x = cellX + 24;
                    atkBg.y = cellY + cellHeight - 24 + liftY + wobbleY;
                    atkBg.alpha = 0.4;
                    drawTarget.addChild(atkBg);

                    const atkText = new PIXI.Text({
                        text: String(symDef.base_attack),
                        style: new PIXI.TextStyle({ fill: '#ffffff', fontSize: 30 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3 } }),
                    });
                    atkText.anchor.set(0.5, 0.5);
                    atkText.x = cellX + 25;
                    atkText.y = cellY + cellHeight - 24 + liftY + wobbleY;
                    drawTarget.addChild(atkText);
                }

                if (symDef.base_hp !== undefined && symDef.base_hp > 0) {
                    const hpBg = new PIXI.Text({
                        text: '♥',
                        style: new PIXI.TextStyle({ fill: '#4ade80', fontSize: 60 * fs, fontFamily }),
                    });
                    hpBg.anchor.set(0.5, 0.5);
                    hpBg.x = cellX + cellWidth - 20;
                    hpBg.y = cellY + cellHeight - 24 + liftY + wobbleY;
                    hpBg.alpha = 0.4;
                    drawTarget.addChild(hpBg);

                    const hpText = new PIXI.Text({
                        text: String(symbol.enemy_hp ?? symDef.base_hp),
                        style: new PIXI.TextStyle({ fill: '#ffffff', fontSize: 30 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3 } }),
                    });
                    hpText.anchor.set(0.5, 0.5);
                    hpText.x = cellX + cellWidth - 21;
                    hpText.y = cellY + cellHeight - 24 + liftY + wobbleY;
                    drawTarget.addChild(hpText);
                }

                // 파괴 X: phase 3 시작 시 생성. 이 셀이 지금 active/contributor/pending으로 wobble 중이면 숨김.
                // contributor/pending만 wobble로 간주. active(자기 차례)는 lift만 하므로 X 유지
                const isPending = isProcessing && state.pendingContributors.some(c => c.x === x && c.y === y);
                const isWobblingThisSlot = (state.effectPhase === 1 || state.effectPhase === 2) && (isContrib || isPending);
                const showDestroyX =
                    state.phase === 'processing' &&
                    symbol.is_marked_for_destruction &&
                    !symbol.suppress_destroy_overlay &&
                    (state.effectPhase === 3 || state.effectPhase3ReachedThisRun) &&
                    !isWobblingThisSlot;
                if (showDestroyX) {
                    const destroyOverlay = new PIXI.Graphics();
                    const m = Math.min(cellWidth, cellHeight) * 0.22;
                    const cx = cellX + cellWidth / 2;
                    const cy = cellY + cellHeight / 2;
                    const strokeW = Math.max(5, Math.min(cellWidth, cellHeight) * 0.11);
                    const strokeOpt = { color: 0xef4444, width: strokeW, alpha: 0.78 };
                    destroyOverlay.moveTo(cx - m, cy - m);
                    destroyOverlay.lineTo(cx + m, cy + m);
                    destroyOverlay.stroke(strokeOpt);
                    destroyOverlay.moveTo(cx + m, cy - m);
                    destroyOverlay.lineTo(cx - m, cy + m);
                    destroyOverlay.stroke(strokeOpt);
                    drawTarget.addChild(destroyOverlay);
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
                    const SPRITE_PX = 32;
                    const innerW = cellWidth - 6;
                    const rawSize = Math.min(innerW, cellHeight) * 0.85;
                    const spriteSizeBase = SPRITE_PX * Math.max(1, Math.floor(rawSize / SPRITE_PX));
                    const fromCX =
                        startX + gridOffsetX + ax * (cellWidth + colGap) + cellWidth / 2;
                    const fromCY =
                        startY + gridOffsetY + ay * (cellHeight + rowGap) + cellHeight / 2;
                    const recvActive =
                        state.activeSlot?.x === rx && state.activeSlot?.y === ry;
                    const recvLiftY = recvActive ? -cellHeight * 0.14 : 0;
                    const toCX =
                        startX + gridOffsetX + rx * (cellWidth + colGap) + cellWidth / 2;
                    const toCY =
                        startY + gridOffsetY + ry * (cellHeight + rowGap) + cellHeight / 2 + recvLiftY;
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

        const floatLayout = { ...this.cellLayout!, scale };
        this.floatingTextRenderer.renderBoardEffectFloats(state, floatLayout);
        this.floatingTextRenderer.renderCombatFloats(state, floatLayout);
        this.floatingTextRenderer.renderThreatFloats(state, floatLayout);
        this.floatingTextRenderer.resetKnowledgeUpgradeFloatCountIfEmpty(state);

        this.hudRenderer.render(scale, w);
        this.relicRenderer.render(state, scale, w);
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

        this.relicRenderer.syncHoverAfterRebuild();
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
