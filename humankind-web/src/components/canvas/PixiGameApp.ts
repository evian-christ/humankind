import * as PIXI from 'pixi.js';
import { calculateFoodCost, BOARD_WIDTH, BOARD_HEIGHT, useGameStore } from '../../game/state/gameStore';
import type { GameState } from '../../game/state/gameStore';
import { SPIN_SPEED_CONFIG, COMBAT_BOUNCE_DURATION, useSettingsStore } from '../../game/state/settingsStore';
import type { SettingsState } from '../../game/state/settingsStore';
import { t } from '../../i18n';
import { getSymbolColor, SymbolType, BARBARIAN_CAMP_SPAWN_INTERVAL } from '../../game/data/symbolDefinitions';
import type { SymbolDefinition } from '../../game/data/symbolDefinitions';
import { useRelicStore } from '../../game/state/relicStore';
import type { HoveredSymbol, HoveredRelic, HoveredUpgrade, FloatingEffect, CombatBounce, CellLayout, ReelState } from './types';
import { KNOWLEDGE_UPGRADES } from '../../game/data/knowledgeUpgrades';
import { loadGameAssets } from './AssetLoader';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

const FLOAT_DURATION = 800; // ms — 텍스트가 떠오르는 시간
const FLOAT_DISTANCE = 30; // px — 위로 이동 거리

/** 야만인/재해 플로팅: 우측 이동 후 빠르게 위로 사라짐 */
const THREAT_FLOAT_DRIFT_MS = 220;
const THREAT_FLOAT_TOTAL_MS = 1800; // 위로 올라가는 시간 늘려서 글 읽을 여유
const THREAT_FLOAT_DRIFT_RIGHT = 36;
const THREAT_FLOAT_UP = 85;

/** 클릭으로 발동하는 유물 (gameStore.activateClickableRelic) */
const CLICKABLE_RELIC_IDS = new Set([4, 13, 15]);

const ERA_NAME_KEYS: Record<number, string> = {
    [SymbolType.RELIGION]: 'era.special',
    [SymbolType.NORMAL]: 'era.ancient',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
};

export class PixiGameApp {
    public app: PIXI.Application;
    private canvas: HTMLDivElement;
    private destroyed = false;

    // Containers
    private bgContainer = new PIXI.Container();
    private boardContainer = new PIXI.Container();
    private spinContainer = new PIXI.Container();
    private combatContainer = new PIXI.Container();
    private effectsContainer = new PIXI.Container();
    private floatContainer = new PIXI.Container();
    private hitContainer = new PIXI.Container();
    private hudTopContainer = new PIXI.Container();

    /** 식량 요구 텍스트 (2턴 이하일 때 진동용) */
    private foodDemandLabel: PIXI.Text | null = null;
    private foodDemandCenter: { x: number; y: number } = { x: 0, y: 0 };

    // Callbacks
    private onHoverSymbol: (symbol: HoveredSymbol | null) => void;
    private onHoverRelic: (relic: HoveredRelic | null) => void;
    private onHoverUpgrade: (upgrade: HoveredUpgrade | null) => void;

    // Refs equivalent state
    private floatingEffects: FloatingEffect[] = [];
    /** 야만인/재해 전용 플로팅 (우측 → 위로 빠르게) */
    private threatFloatingEffects: { texts: PIXI.Text[]; startX: number; startY: number; elapsed: number }[] = [];
    private runningTotalTexts: { food: PIXI.Text | null; gold: PIXI.Text | null; knowledge: PIXI.Text | null } = { food: null, gold: null, knowledge: null };
    private prevEffectCount: number = 0;

    private reels: ReelState[] = [];
    private spinElapsed: number = 0;
    private spinActive: boolean = false;

    private cellLayout: CellLayout | null = null;
    private pendingNewThreatFloatsShown = false;
    private combatBounce: CombatBounce | null = null;
    private combatShaking: boolean = false;
    private contributorWobbleTime: number = 0;

    /** renderBoard가 히트영역을 갈아엎어도 포인터는 그대로일 수 있어, 마지막 호버를 저장 후 재동기화 */
    private symbolHoverCell: { x: number; y: number } | null = null;
    private relicHoverSnapshot: { instanceId: string; screenX: number; screenY: number } | null = null;
    private upgradeHoverSnapshot: { id: number; screenX: number; screenY: number } | null = null;

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
        const BlurFilterCtor = (PIXI as any).BlurFilter;
        if (BlurFilterCtor) {
            // filter는 Graphics 단위로 적용
            g.filters = [new BlurFilterCtor(blur)];
        }
        // add(더하기) 블렌딩: 빛 번짐 느낌의 핵심
        g.blendMode = 'add' as any;

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
        onHoverUpgrade: (upgrade: HoveredUpgrade | null) => void
    ) {
        this.app = new PIXI.Application();
        this.canvas = canvas;
        this.onHoverSymbol = onHoverSymbol;
        this.onHoverRelic = onHoverRelic;
        this.onHoverUpgrade = onHoverUpgrade;
        this.hitContainer.eventMode = 'static';
    }

    public async init() {
        PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';
        // Tauri 프로토콜 환경에서는 XHR/Fetch에 CORS 헤더가 없을 수 있어서,
        // Pixi가 이미지 로드 시 crossOrigin 속성을 강제로 붙이지 않도록 합니다.
        // (React <img>는 표시 자체가 되지만, Pixi 로더는 실패해서 보드 스프라이트가 안 보이는 케이스가 있습니다.)
        (PIXI.TextureSource.defaultOptions as any).crossOrigin = null;
        await this.app.init({
            background: '#1a1a1a',
            antialias: false,
            roundPixels: true,
        });

        if (this.destroyed) {
            try {
                if (this.app.resizeTo) (this.app as any).resizeTo = null;
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
        if (this.app) {
            try {
                if (this.app.resizeTo) (this.app as any).resizeTo = null;
                this.app.destroy(true);
            } catch (e) {
                console.warn("Error destroying PIXI app:", e);
            }

            try {
                if (this.canvas) this.canvas.innerHTML = '';
            } catch (e) { }
        }
    }

    public resize(width: number, height: number) {
        if (!this.destroyed && this.app && this.app.renderer) {
            this.app.renderer.resize(width, height);
        }
    }

    private onTick(ticker: PIXI.Ticker) {
        const dt = ticker.deltaMS;

        // Floating effects
        for (let i = this.floatingEffects.length - 1; i >= 0; i--) {
            const f = this.floatingEffects[i];
            f.elapsed += dt;
            const progress = Math.min(f.elapsed / FLOAT_DURATION, 1);
            const ease = 1 - (1 - progress) * (1 - progress);
            const offsetY = -FLOAT_DISTANCE * ease;
            const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;

            for (const txt of f.texts) {
                txt.y = f.startY + (txt as PIXI.Text & { _baseOffsetY: number })._baseOffsetY + offsetY;
                txt.alpha = alpha;
            }

            if (progress >= 1) {
                for (const txt of f.texts) {
                    txt.parent?.removeChild(txt);
                    txt.destroy();
                }
                this.floatingEffects.splice(i, 1);
            }
        }

        // Threat floating: 작은 크기로 시작 → 가로 이동하면서 크기 커짐 → 위로 올라가며 사라짐
        for (let i = this.threatFloatingEffects.length - 1; i >= 0; i--) {
            const t = this.threatFloatingEffects[i];
            t.elapsed += dt;
            const elapsed = t.elapsed;
            if (elapsed < THREAT_FLOAT_DRIFT_MS) {
                const p = elapsed / THREAT_FLOAT_DRIFT_MS;
                const ease = 1 - (1 - p) * (1 - p);
                const offsetX = THREAT_FLOAT_DRIFT_RIGHT * ease;
                const scale = 0.35 + 0.65 * ease; // 작은 크기 → 최종 크기
                for (const txt of t.texts) {
                    txt.x = t.startX + offsetX;
                    txt.y = t.startY;
                    txt.alpha = 1;
                    txt.scale.set(scale, scale);
                }
            } else {
                const phase2Len = THREAT_FLOAT_TOTAL_MS - THREAT_FLOAT_DRIFT_MS;
                const phase2Elapsed = elapsed - THREAT_FLOAT_DRIFT_MS;
                const p = Math.min(phase2Elapsed / phase2Len, 1);
                const ease = 1 - (1 - p) * (1 - p);
                const offsetY = -THREAT_FLOAT_UP * ease;
                const alpha = p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5;
                for (const txt of t.texts) {
                    txt.x = t.startX + THREAT_FLOAT_DRIFT_RIGHT;
                    txt.y = t.startY + offsetY;
                    txt.alpha = alpha;
                    txt.scale.set(1, 1);
                }
                if (elapsed >= THREAT_FLOAT_TOTAL_MS) {
                    for (const txt of t.texts) {
                        txt.parent?.removeChild(txt);
                        txt.destroy();
                    }
                    this.threatFloatingEffects.splice(i, 1);
                }
            }
        }

        // Combat bounce
        if (this.combatBounce) {
            const b = this.combatBounce;
            b.elapsed += dt;
            const halfDur = b.duration / 2;
            const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            if (b.elapsed < halfDur) {
                const progress = b.elapsed / halfDur;
                const ease = easeInOut(Math.min(progress, 1));
                b.sprite.x = b.fromX + (b.toX - b.fromX) * ease;
                b.sprite.y = b.fromY + (b.toY - b.fromY) * ease;

                if (!b.hitSpawned && progress >= 0.7 && b.atkDmg > 0) {
                    b.hitSpawned = true;
                    const dmgTxt = new PIXI.Text({
                        text: `-${b.atkDmg}`,
                        style: new PIXI.TextStyle({
                            fill: '#ef4444',
                            fontSize: 34,
                            fontWeight: 'bold',
                            fontFamily: 'Mulmaru',
                            stroke: { color: '#000000', width: 3 },
                        }),
                    });
                    dmgTxt.anchor.set(1, 1);
                    dmgTxt.x = b.targetHpX;
                    dmgTxt.y = b.targetHpY;
                    (dmgTxt as PIXI.Text & { _baseOffsetY: number })._baseOffsetY = 0;
                    this.floatContainer.addChild(dmgTxt);
                    this.floatingEffects.push({
                        texts: [dmgTxt],
                        startY: b.targetHpY,
                        elapsed: 0,
                    });
                }
            } else if (b.elapsed < b.duration) {
                const progress = (b.elapsed - halfDur) / halfDur;
                const ease = easeInOut(Math.min(progress, 1));
                b.sprite.x = b.toX + (b.fromX - b.toX) * ease;
                b.sprite.y = b.toY + (b.fromY - b.toY) * ease;
            } else {
                if (b.sprite.parent) b.sprite.parent.removeChild(b.sprite);
                b.sprite.destroy();
                this.combatBounce = null;
            }
        }

        // Combat shake
        if (this.combatShaking) {
            this.combatContainer.x = Math.sin(Date.now() / 20) * 6;
        } else {
            this.combatContainer.x = 0;
        }

        // 식량 요구 텍스트 진동 (2턴 이하일 때 긴장감)
        if (this.foodDemandLabel?.parent) {
            const s = useGameStore.getState();
            const turnsUntilPayment = s.turn % 10 === 0 ? 10 : 10 - (s.turn % 10);
            if (turnsUntilPayment <= 2) {
                const shake = 2;
                this.foodDemandLabel.x = this.foodDemandCenter.x + (Math.random() - 0.5) * 2 * shake;
                this.foodDemandLabel.y = this.foodDemandCenter.y + (Math.random() - 0.5) * 2 * shake;
            } else {
                this.foodDemandLabel.x = this.foodDemandCenter.x;
                this.foodDemandLabel.y = this.foodDemandCenter.y;
            }
        }

        // Contributor wobble: phase 2일 때만 타이머 증가·렌더 (phase 3 진입 시 두 번째 wobble 방지)
        const state = useGameStore.getState();
        if (state.phase === 'processing' && state.effectPhase === 2 && state.activeContributors?.length > 0) {
            this.contributorWobbleTime += dt;
            this.renderBoard(state, useSettingsStore.getState());
        } else {
            this.contributorWobbleTime = 0;
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
        this.spinContainer.removeChildren();
        for (const reel of this.reels) { reel.mask.destroy(); }
        this.reels = [];
        useGameStore.getState().startProcessing();
    }

    public renderBoard(state: GameState, settings: SettingsState) {
        if (!this.app || !this.app.renderer || this.destroyed) return;

        const w = this.app.screen?.width || 1920;
        const h = this.app.screen?.height || 1080;

        this.combatShaking = state.combatShaking;
        if (state.phase !== 'showing_new_threats') this.pendingNewThreatFloatsShown = false;

        this.boardContainer.removeChildren();
        this.effectsContainer.removeChildren();
        this.hitContainer.removeChildren();
        this.bgContainer.removeChildren();
        this.hudTopContainer.removeChildren();
        this.foodDemandLabel = null;
        for (const t of this.threatFloatingEffects) {
            for (const txt of t.texts) {
                txt.parent?.removeChild(txt);
                txt.destroy();
            }
        }
        this.threatFloatingEffects = [];

        if (!state.combatAnimation) {
            this.combatContainer.removeChildren();
            this.combatContainer.x = 0;
        }

        // Render Background
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, w, h);
        bg.fill({ color: 0x252525 });
        this.bgContainer.addChild(bg);

        const BASE_W = 1920;
        const BASE_H = 1080;
        const scale = Math.min(w / BASE_W, h / BASE_H);
        const lang = settings.language;
        const fontFamily = 'Mulmaru';
        const fs = 1;

        // (식량 납부 / 야만인 알림은 NotificationPanel React 컴포넌트가 처리)


        const BOARD_SCALE = 0.8;
        const boardW = 1140 * scale * BOARD_SCALE;
        const boardH = 830 * scale * BOARD_SCALE;

        const cellWidth = 213 * scale * BOARD_SCALE;
        const cellHeight = 204 * scale * BOARD_SCALE;
        const colGap = 15 * scale * BOARD_SCALE;
        const rowGap = 0;

        const totalSlotsWidth = (cellWidth * BOARD_WIDTH) + (colGap * (BOARD_WIDTH - 1));
        const totalSlotsHeight = cellHeight * BOARD_HEIGHT;
        const gridOffsetX = (boardW - totalSlotsWidth) / 2;
        const gridOffsetY = (boardH - totalSlotsHeight) / 2;

        // 가로는 중앙, 세로는 HUD 바로 밑(상단)에 배치
        const HUD_BOTTOM_OFFSET = 92 * scale; // 상단 HUD 영역 아래 여유
        const startX = (w - boardW) / 2;
        const startY = HUD_BOTTOM_OFFSET;

        this.cellLayout = { startX, startY, boardW, cellWidth, cellHeight, gridOffsetX, gridOffsetY, colGap };

        // Board bg sprite
        const boardBg = PIXI.Sprite.from(`${ASSET_BASE_URL}assets/ui/slot_bg.png`);
        const spritePaddingX = 8 * scale;
        const spritePaddingY = 8 * scale;
        boardBg.x = startX - spritePaddingX;
        boardBg.y = startY - spritePaddingY;
        boardBg.width = boardW + (spritePaddingX * 2);
        boardBg.height = boardH + (spritePaddingY * 2);
        this.boardContainer.addChild(boardBg);

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
                    if (def && def.sprite && def.sprite !== '-' && def.sprite !== '-.png') {
                        const spritePath = `${ASSET_BASE_URL}assets/symbols/${def.sprite}`;
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

                if (state.combatAnimation && state.combatAnimation.ax === x && state.combatAnimation.ay === y) continue;

                const isShakingDeath = state.combatShaking && symbol.is_marked_for_destruction;
                const drawTarget = isShakingDeath ? this.combatContainer : this.boardContainer;

                const hitArea = new PIXI.Graphics();
                hitArea.rect(cellX, cellY, cellWidth, cellHeight);
                hitArea.fill({ color: 0x000000, alpha: 0 });
                hitArea.eventMode = 'static';
                hitArea.cursor = 'pointer';
                const symDef = symbol.definition;

                hitArea.on('pointerover', () => {
                    this.symbolHoverCell = { x, y };
                    this.onHoverSymbol({ definition: symDef, screenX: cellX + cellWidth, screenY: cellY });
                });
                hitArea.on('pointerout', () => {
                    this.symbolHoverCell = null;
                    this.onHoverSymbol(null);
                });
                this.hitContainer.addChild(hitArea);

                const innerW = cellWidth - 6;
                const rarityColor = getSymbolColor(symDef.type);

                // Processing highlight: 1) 본체만 lift, 2) contributors는 밝은 초록 틴트 + 위아래 흔들림
                const isProcessing = state.phase === 'processing';
                const isActive = isProcessing && !!(state.activeSlot && state.activeSlot.x === x && state.activeSlot.y === y);
                const isContrib = isProcessing && state.activeContributors.some(c => c.x === x && c.y === y);
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

                if (symDef.sprite && symDef.sprite !== '-' && symDef.sprite !== '-.png') {
                    const spritePath = `${ASSET_BASE_URL}assets/symbols/${symDef.sprite}`;
                    const SPRITE_PX = 32;
                    const rawSize = Math.min(innerW, cellHeight) * 0.85;
                    const spriteSize = SPRITE_PX * Math.max(1, Math.floor(rawSize / SPRITE_PX));
                    const sprite = PIXI.Sprite.from(spritePath);
                    sprite.x = cellX + cellWidth / 2;
                    sprite.y = cellY + cellHeight / 2 + liftY + wobbleY;
                    sprite.anchor.set(0.5);
                    sprite.width = spriteSize;
                    sprite.height = spriteSize;
                    if (isContrib) sprite.tint = contribGreenTint;
                    drawTarget.addChild(sprite);
                } else {
                    const symName = t(`symbol.${symDef.id}.name`, lang);
                    const fillColor = isContrib ? '#90ee90' : rarityColor;
                    const nameText = new PIXI.Text({
                        text: symName,
                        style: new PIXI.TextStyle({ fill: fillColor, fontSize: 32 * fs, fontFamily, stroke: { color: '#000000', width: 2 } }),
                    });
                    nameText.anchor.set(0.5);
                    nameText.x = cellX + cellWidth / 2;
                    nameText.y = cellY + cellHeight / 2 + liftY + wobbleY;
                    drawTarget.addChild(nameText);
                }

                if (symbol.effect_counter > 0 && symDef.type !== SymbolType.ENEMY && symDef.base_hp === undefined) {
                    const counterText = new PIXI.Text({
                        text: String(symbol.effect_counter),
                        style: new PIXI.TextStyle({ fill: '#8b7355', fontSize: 30 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3 } }),
                    });
                    counterText.anchor.set(0.5, 0.5);
                    counterText.x = cellX + cellWidth - 21;
                    counterText.y = cellY + cellHeight - 24 + liftY + wobbleY;
                    drawTarget.addChild(counterText);
                }

                // Merchant(22): 저장된 골드를 카운터로 표시
                if (symDef.id === 22 && (symbol.stored_gold ?? 0) > 0) {
                    const storedGoldText = new PIXI.Text({
                        text: String(symbol.stored_gold),
                        style: new PIXI.TextStyle({
                            fill: '#fbbf24',
                            fontSize: 30 * fs,
                            fontWeight: 'bold',
                            fontFamily,
                            stroke: { color: '#000000', width: 3 },
                        }),
                    });
                    storedGoldText.anchor.set(0.5, 0.5);
                    storedGoldText.x = cellX + cellWidth - 21;
                    storedGoldText.y = cellY + cellHeight - 24 + liftY + wobbleY;
                    drawTarget.addChild(storedGoldText);
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

                if (symDef.id === 40) { // Barbarian Camp
                    const campCounterText = new PIXI.Text({
                        text: String(BARBARIAN_CAMP_SPAWN_INTERVAL - symbol.effect_counter),
                        style: new PIXI.TextStyle({ fill: '#8b7355', fontSize: 30 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3 } }),
                    });
                    campCounterText.anchor.set(0.5, 0.5);
                    campCounterText.x = cellX + 25;
                    campCounterText.y = cellY + cellHeight - 24 + liftY + wobbleY;
                    drawTarget.addChild(campCounterText);
                }

                // 파괴 X: phase 3 시작 시 생성. 이 셀이 지금 active/contributor/pending으로 wobble 중이면 숨김.
                // contributor/pending만 wobble로 간주. active(자기 차례)는 lift만 하므로 X 유지
                const isPending = isProcessing && state.pendingContributors.some(c => c.x === x && c.y === y);
                const isWobblingThisSlot = (state.effectPhase === 1 || state.effectPhase === 2) && (isContrib || isPending);
                const showDestroyX = state.phase === 'processing' && symbol.is_marked_for_destruction && (state.effectPhase === 3 || state.effectPhase3ReachedThisRun) && !isWobblingThisSlot;
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

        // Floating texts for processed effects
        if (state.lastEffects.length === 0 && this.prevEffectCount > 0) {
            this.prevEffectCount = 0;
        } else if (state.lastEffects.length > this.prevEffectCount) {
            const newEffects = state.lastEffects.slice(this.prevEffectCount);
            this.prevEffectCount = state.lastEffects.length;

            for (const effect of newEffects) {
                const effectFontSize = Math.max(24, cellHeight * 0.22) * fs;
                const baseX = startX + gridOffsetX + effect.x * (cellWidth + colGap) + cellWidth / 2;
                const baseY = startY + gridOffsetY + effect.y * (cellHeight + rowGap) + 8 * scale;

                const lines = [];
                if (effect.food !== 0) lines.push({ text: `${effect.food > 0 ? '+' : ''}${effect.food}`, color: effect.food > 0 ? '#4ade80' : '#ef4444' });
                if (effect.gold !== 0) lines.push({ text: `${effect.gold > 0 ? '+' : ''}${effect.gold}`, color: effect.gold > 0 ? '#fbbf24' : '#ef4444' });
                if (effect.knowledge !== 0) lines.push({ text: `${effect.knowledge > 0 ? '+' : ''}${effect.knowledge}`, color: effect.knowledge > 0 ? '#60a5fa' : '#ef4444' });

                const gapText = 6 * scale;
                const tempTexts: PIXI.Text[] = [];
                for (const line of lines) {
                    const txt = new PIXI.Text({
                        text: line.text,
                        style: new PIXI.TextStyle({ fill: line.color, fontSize: effectFontSize, fontFamily, stroke: { color: '#000000', width: 3 } }),
                    });
                    txt.anchor.set(0, 0);
                    tempTexts.push(txt);
                }
                const totalW = tempTexts.reduce((sum, t) => sum + t.width, 0) + gapText * (tempTexts.length - 1);
                let curX = baseX - totalW / 2;

                const floatTexts: PIXI.Text[] = [];
                for (const txt of tempTexts) {
                    txt.x = curX;
                    (txt as PIXI.Text & { _baseOffsetY: number })._baseOffsetY = 0;
                    txt.y = baseY;
                    this.floatContainer.addChild(txt);
                    floatTexts.push(txt);
                    curX += txt.width + gapText;
                }

                if (floatTexts.length > 0) {
                    this.floatingEffects.push({ texts: floatTexts, startY: baseY, elapsed: 0 });
                }
            }
        }

        // ── 첫 배치된 야만인/재해: 셀 위 플로팅 (빨간색+검은테두리, 우측→위로 빠르게) ──
        if (state.phase === 'showing_new_threats' && state.pendingNewThreatFloats?.length && this.cellLayout && !this.pendingNewThreatFloatsShown) {
            this.pendingNewThreatFloatsShown = true;
            const { startX, startY, cellWidth, cellHeight, gridOffsetX, gridOffsetY, colGap } = this.cellLayout;
            const rowGap = 0;
            const threatFloatFontSize = Math.max(28, cellHeight * 0.24) * fs;
            for (const { x, y, label } of state.pendingNewThreatFloats) {
                const cx = startX + gridOffsetX + x * (cellWidth + colGap) + cellWidth / 2;
                const baseY = startY + gridOffsetY + y * (cellHeight + rowGap) + cellHeight * 0.28;
                const txt = new PIXI.Text({
                    text: label,
                    style: new PIXI.TextStyle({
                        fill: '#ff3333',
                        fontSize: threatFloatFontSize,
                        fontWeight: 'bold',
                        fontFamily: 'Mulmaru',
                        stroke: { color: '#000000', width: 4 },
                    }),
                });
                txt.anchor.set(0.5, 0);
                txt.x = cx;
                txt.y = baseY;
                txt.scale.set(0.35, 0.35); // 처음엔 작게, 가로 이동하면서 커짐
                this.floatContainer.addChild(txt);
                this.threatFloatingEffects.push({ texts: [txt], startX: cx, startY: baseY, elapsed: 0 });
            }
            setTimeout(() => useGameStore.getState().continueProcessingAfterNewThreatFloats(), THREAT_FLOAT_TOTAL_MS + 200);
        }

        // UI bars (Knowledge, Food, Gold)
        this.renderUI(state, settings, scale, fs, w);
        this.renderRelics(scale);
        this.renderKnowledgeUpgrades(state, scale);
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

        if (this.relicHoverSnapshot && this.onHoverRelic) {
            const relic = useRelicStore.getState().relics.find((r) => r.instanceId === this.relicHoverSnapshot!.instanceId);
            if (relic) {
                this.onHoverRelic({
                    relicInfo: relic,
                    screenX: this.relicHoverSnapshot.screenX,
                    screenY: this.relicHoverSnapshot.screenY,
                });
            } else {
                this.relicHoverSnapshot = null;
                this.onHoverRelic(null);
            }
        }

        if (this.upgradeHoverSnapshot && this.onHoverUpgrade) {
            const ids = state.unlockedKnowledgeUpgrades || [];
            if (ids.includes(this.upgradeHoverSnapshot.id)) {
                this.onHoverUpgrade({
                    upgrade: { id: this.upgradeHoverSnapshot.id },
                    screenX: this.upgradeHoverSnapshot.screenX,
                    screenY: this.upgradeHoverSnapshot.screenY,
                });
            } else {
                this.upgradeHoverSnapshot = null;
                this.onHoverUpgrade(null);
            }
        }
    }

    private renderRelics(scale: number) {
        if (!this.cellLayout) return;
        const relics = useRelicStore.getState().relics;
        if (relics.length === 0) return;

        const { startX, startY } = this.cellLayout;

        const iconSize = 96 * scale;
        const gapX = 16 * scale;
        const gapY = 32 * scale;

        // 한 줄에 들어갈 수 있는 최대 아이콘 수 계산 (양쪽 최소 여백 24px)
        const minMargin = 24 * scale;
        const maxRowWidth = startX - minMargin * 2;
        const iconsPerRow = Math.max(1, Math.floor((maxRowWidth + gapX) / (iconSize + gapX)));

        // 실제 한 줄의 폭 계산
        const actualRowWidth = iconsPerRow * iconSize + (iconsPerRow - 1) * gapX;

        // 왼쪽 가장자리와 보드 사이 공간의 정중앙에 배치
        const startRelicX = (startX - actualRowWidth) / 2;
        const availableWidth = actualRowWidth;

        const startRelicY = startY + 12 * scale;
        let curX = startRelicX;
        let curY = startRelicY;

        for (const relic of relics) {
            // 이번 유물을 현재 줄에 그릴 공간이 없다면 줄바꿈 (단, 첫 열이 아닐 때만)
            if (curX > startRelicX && curX + iconSize > startRelicX + availableWidth) {
                curX = startRelicX;
                curY += iconSize + gapY;
            }

            // 이벤트 핸들러에서 사용할 좌표는 고정(루프 변수 캡처 버그 방지)
            const iconX = curX;
            const iconY = curY;

            const hitArea = new PIXI.Graphics();
            hitArea.rect(iconX, iconY, iconSize, iconSize);
            hitArea.fill({ color: 0x000000, alpha: 0 }); // 투명 히트박스
            hitArea.eventMode = 'static';
            const relicClickable = CLICKABLE_RELIC_IDS.has(relic.definition.id);
            hitArea.cursor = relicClickable ? 'pointer' : 'help';

            hitArea.on('pointerover', () => {
                this.relicHoverSnapshot = { instanceId: relic.instanceId, screenX: iconX + iconSize, screenY: iconY };
                this.onHoverRelic({ relicInfo: relic, screenX: iconX + iconSize, screenY: iconY });
            });
            hitArea.on('pointerout', () => {
                this.relicHoverSnapshot = null;
                this.onHoverRelic(null);
            });
            if (relicClickable) {
                hitArea.on('pointertap', () => {
                    useGameStore.getState().activateClickableRelic(relic.instanceId);
                });
            }
            this.hitContainer.addChild(hitArea);

            if (relic.definition.sprite && relic.definition.sprite !== '-' && relic.definition.sprite !== '-.png') {
                const sp = PIXI.Sprite.from(`${ASSET_BASE_URL}assets/relics/${relic.definition.sprite}`);
                sp.width = iconSize;
                sp.height = iconSize;
                sp.x = iconX;
                sp.y = iconY;
                this.boardContainer.addChild(sp);
            } else {
                const spPlaceholder = new PIXI.Text({
                    text: '🏺',
                    style: new PIXI.TextStyle({ fontSize: iconSize * 0.6 })
                });
                spPlaceholder.anchor.set(0.5);
                spPlaceholder.x = iconX + iconSize / 2;
                spPlaceholder.y = iconY + iconSize / 2;
                this.boardContainer.addChild(spPlaceholder);
            }

            // 유물 카운터: 보드 심볼과 같이 우하단, 연회색 글씨 + 검은 테두리 (숫자만)
            {
                const rid = relic.definition.id;
                let counterStr: string | null = null;
                if (rid === 3 || rid === 9) counterStr = String(relic.effect_counter);
                else if (rid === 4) counterStr = String(relic.bonus_stacks);
                if (counterStr !== null) {
                    const counterText = new PIXI.Text({
                        text: counterStr,
                        style: new PIXI.TextStyle({
                            fill: '#d1d5db',
                            fontSize: 28 * scale,
                            fontWeight: 'bold',
                            fontFamily: 'Mulmaru',
                            stroke: { color: '#000000', width: 3 },
                        }),
                    });
                    counterText.anchor.set(0.5, 0.5);
                    counterText.x = iconX + iconSize - 16 * scale;
                    counterText.y = iconY + iconSize - 18 * scale;
                    this.boardContainer.addChild(counterText);
                }
            }

            curX += iconSize + gapX;
        }
    }

    private renderKnowledgeUpgrades(state: GameState, scale: number) {
        if (!this.cellLayout) return;
        const upgradeIds = state.unlockedKnowledgeUpgrades || [];
        if (upgradeIds.length === 0) return;

        const { startX, startY, boardW } = this.cellLayout;
        const w = this.app?.screen?.width ?? 1920;
        // 지식 업그레이드 선택 카드 64x64 스프라이트를 2배 크기로 표시
        const iconSize = 128 * scale;
        const gapX = 24 * scale;
        const gapY = 24 * scale;
        const minMargin = 24 * scale;

        // 보드 우측 여백 시작 (전체 업글 묶음 우측 이동)
        const UPGRADE_PANEL_OFFSET_X = 16 * scale;
        const startUpgradeX = startX + boardW + minMargin + UPGRADE_PANEL_OFFSET_X;
        const maxRowWidth = w - startUpgradeX - minMargin;
        const iconsPerRow = Math.max(1, Math.floor((maxRowWidth + gapX) / (iconSize + gapX)));
        const actualRowWidth = iconsPerRow * iconSize + (iconsPerRow - 1) * gapX;
        const rowStartX = startUpgradeX;

        let curX = rowStartX;
        let curY = startY - 6 * scale;

        for (const id of upgradeIds) {
            const upgrade = KNOWLEDGE_UPGRADES[id];
            if (!upgrade) continue;

            if (curX > rowStartX && curX + iconSize > rowStartX + actualRowWidth) {
                curX = rowStartX;
                curY += iconSize + gapY;
            }

            // 이벤트 핸들러에서 사용할 좌표는 고정(루프 변수 캡처 버그 방지)
            const iconX = curX;
            const iconY = curY;

            const hitArea = new PIXI.Graphics();
            hitArea.rect(iconX, iconY, iconSize, iconSize);
            hitArea.fill({ color: 0x000000, alpha: 0 });
            hitArea.eventMode = 'static';
            hitArea.cursor = 'help';
            hitArea.on('pointerover', () => {
                this.upgradeHoverSnapshot = { id: upgrade.id, screenX: iconX, screenY: iconY };
                this.onHoverUpgrade({ upgrade: { id: upgrade.id }, screenX: iconX, screenY: iconY });
            });
            hitArea.on('pointerout', () => {
                this.upgradeHoverSnapshot = null;
                this.onHoverUpgrade(null);
            });
            this.hitContainer.addChild(hitArea);

            // 지식 업그레이드 선택 카드와 동일: /assets/upgrades/ 64x64 스프라이트 (AssetLoader에서 선로드)
            const upgradeSpritePath = (upgrade.sprite && upgrade.sprite !== '-' && upgrade.sprite !== '-.png')
                ? `${ASSET_BASE_URL}assets/upgrades/${upgrade.sprite}`
                : `${ASSET_BASE_URL}assets/upgrades/000.png`;
            const texture = PIXI.Assets.get(upgradeSpritePath);
            const sp = texture
                ? new PIXI.Sprite(texture)
                : PIXI.Sprite.from(upgradeSpritePath); // 캐시 미스 시 비동기 로드
            sp.width = iconSize;
            sp.height = iconSize;
            sp.x = iconX;
            sp.y = iconY;
            this.boardContainer.addChild(sp);

            curX += iconSize + gapX;
        }
    }

    private renderUI(state: GameState, settings: SettingsState, scale: number, fs: number, w: number) {
        const lang = settings.language;
        const fontFamily = 'Mulmaru';
        const eraName = t(ERA_NAME_KEYS[state.era] ?? 'era.ancient', lang);
        const knowledgeRequired = state.level < 10 ? 50 : (state.level < 20 ? 100 : 200);
        const knowledgeCurrent = state.knowledge;
        const knowledgeRatio = knowledgeRequired > 0 ? Math.min(1, knowledgeCurrent / knowledgeRequired) : 0;

        const demandFontSize = 28 * fs;
        const rowCY = 40 * scale; // 상단에서 40px 아래
        const rowH = demandFontSize + 4 * scale;
        const rowY = rowCY - rowH / 2;
        const startPanelX = 32 * scale;
        const barW = 200 * scale;
        const barH = rowH;
        const gap = 12 * scale;

        // 상단 HUD 중앙: 식량 요구 텍스트 (2턴 이하는 ticker에서 진동)
        const turnsUntilPayment = state.turn % 10 === 0 ? 10 : 10 - (state.turn % 10);
        const nextCost = calculateFoodCost(state.turn + turnsUntilPayment);
        const foodDemandRaw = t('game.foodDemandFlavor', lang);
        const foodDemandText = foodDemandRaw.replace('{turns}', String(turnsUntilPayment)).replace('{amount}', nextCost.toLocaleString());
        const foodDemandFontSize = Math.round(32 * fs);
        const foodDemandLabel = new PIXI.Text({
            text: foodDemandText,
            style: new PIXI.TextStyle({
                fill: turnsUntilPayment <= 2 ? '#f87171' : turnsUntilPayment <= 4 ? '#f5c842' : '#a3b8cc',
                fontSize: foodDemandFontSize,
                fontFamily,
                stroke: { color: '#000000', width: 2 },
            }),
        });
        foodDemandLabel.anchor.set(0.5, 0.5);
        this.foodDemandCenter = { x: w / 2, y: rowCY };
        foodDemandLabel.x = this.foodDemandCenter.x;
        foodDemandLabel.y = this.foodDemandCenter.y;
        this.foodDemandLabel = foodDemandLabel;
        this.hudTopContainer.addChild(foodDemandLabel);

        const eraText = new PIXI.Text({
            text: `Lv.${state.level} ${eraName}`,
            style: new PIXI.TextStyle({ fill: '#e2e8f0', fontSize: demandFontSize, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 2 } }),
        });
        eraText.anchor.set(0, 0.5);
        eraText.x = startPanelX;
        eraText.y = rowCY;
        this.bgContainer.addChild(eraText);

        const barX = startPanelX + eraText.width + gap;
        const barY2 = rowY;
        const barBg = new PIXI.Graphics();
        barBg.rect(barX, barY2, barW, barH);
        barBg.fill({ color: 0x1e3a5f, alpha: 0.9 });
        barBg.rect(barX, barY2, barW, barH);
        barBg.stroke({ color: 0x3b82f6, width: 1.5, alpha: 0.7 });
        this.bgContainer.addChild(barBg);

        if (knowledgeRatio > 0) {
            const barFill = new PIXI.Graphics();
            barFill.rect(barX, barY2, barW * knowledgeRatio, barH);
            barFill.fill({ color: 0x3b82f6, alpha: 0.9 });
            this.bgContainer.addChild(barFill);
        }

        const fracLabel = new PIXI.Text({
            text: `✦ ${knowledgeCurrent}/${knowledgeRequired}`,
            style: new PIXI.TextStyle({ fill: '#ffffff', fontSize: 22 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3 } }),
        });
        fracLabel.anchor.set(0.5, 0.5);
        fracLabel.x = barX + barW / 2;
        fracLabel.y = rowCY;
        this.bgContainer.addChild(fracLabel);

        // Food & Gold — same row, right of knowledge bar
        const statsFontSize = demandFontSize;
        const statGap = 16 * scale;
        const statsStartX = barX + barW + gap * 2;

        const foodSym = new PIXI.Text({
            text: '⬟',
            style: new PIXI.TextStyle({ fill: '#4ade80', fontSize: statsFontSize, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 2 } }),
        });
        foodSym.anchor.set(0, 0.5);
        foodSym.x = statsStartX;
        foodSym.y = rowCY - 2 * scale;
        this.bgContainer.addChild(foodSym);

        const foodNum = new PIXI.Text({
            text: ` ${state.food}`,
            style: new PIXI.TextStyle({ fill: '#ffffff', fontSize: statsFontSize, fontFamily, stroke: { color: '#000000', width: 2 } }),
        });
        foodNum.anchor.set(0, 0.5);
        foodNum.x = foodSym.x + foodSym.width;
        foodNum.y = rowCY;
        this.bgContainer.addChild(foodNum);

        const goldSym = new PIXI.Text({
            text: '●',
            style: new PIXI.TextStyle({ fill: '#fbbf24', fontSize: statsFontSize, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 2 } }),
        });
        goldSym.anchor.set(0, 0.5);
        goldSym.x = foodNum.x + foodNum.width + statGap;
        goldSym.y = rowCY;
        this.bgContainer.addChild(goldSym);

        const goldNum = new PIXI.Text({
            text: ` ${state.gold}`,
            style: new PIXI.TextStyle({ fill: '#ffffff', fontSize: statsFontSize, fontFamily, stroke: { color: '#000000', width: 2 } }),
        });
        goldNum.anchor.set(0, 0.5);
        goldNum.x = goldSym.x + goldSym.width;
        goldNum.y = rowCY;
        this.bgContainer.addChild(goldNum);

        const rt = state.runningTotals;
        const totalsFontSize = 26 * fs;
        const rtTexts = this.runningTotalTexts;
        if (rtTexts.food) { rtTexts.food.parent?.removeChild(rtTexts.food); rtTexts.food.destroy(); rtTexts.food = null; }
        if (rtTexts.gold) { rtTexts.gold.parent?.removeChild(rtTexts.gold); rtTexts.gold.destroy(); rtTexts.gold = null; }
        if (rtTexts.knowledge) { rtTexts.knowledge.parent?.removeChild(rtTexts.knowledge); rtTexts.knowledge.destroy(); rtTexts.knowledge = null; }

        if (state.phase === 'processing') {
            if (rt.knowledge !== 0) {
                const txt = new PIXI.Text({
                    text: `${rt.knowledge > 0 ? '+' : ''}${rt.knowledge}`,
                    style: new PIXI.TextStyle({ fill: rt.knowledge > 0 ? '#60a5fa' : '#ef4444', fontSize: totalsFontSize, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 2 } }),
                });
                txt.anchor.set(0.5, 0);
                txt.x = barX + barW / 2;
                txt.y = barY2 + barH + 4 * scale;
                this.effectsContainer.addChild(txt);
                rtTexts.knowledge = txt;
            }
            if (rt.food !== 0) {
                const txt = new PIXI.Text({
                    text: `${rt.food > 0 ? '+' : ''}${rt.food}`,
                    style: new PIXI.TextStyle({ fill: rt.food > 0 ? '#4ade80' : '#ef4444', fontSize: totalsFontSize, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 2 } }),
                });
                txt.anchor.set(0.5, 0);
                txt.x = foodSym.x + (foodNum.x + foodNum.width - foodSym.x) / 2;
                txt.y = rowCY + rowH / 2 + 4 * scale;
                this.effectsContainer.addChild(txt);
                rtTexts.food = txt;
            }
            if (rt.gold !== 0) {
                const txt = new PIXI.Text({
                    text: `${rt.gold > 0 ? '+' : ''}${rt.gold}`,
                    style: new PIXI.TextStyle({ fill: rt.gold > 0 ? '#fbbf24' : '#ef4444', fontSize: totalsFontSize, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 2 } }),
                });
                txt.anchor.set(0.5, 0);
                txt.x = goldSym.x + (goldNum.x + goldNum.width - goldSym.x) / 2;
                txt.y = rowCY + rowH / 2 + 4 * scale;
                this.effectsContainer.addChild(txt);
                rtTexts.gold = txt;
            }
        }
    }

    public triggerCombatAnimation(anim: { ax: number; ay: number; tx: number; ty: number; atkDmg: number; counterDmg: number }) {
        if (!this.cellLayout) return;

        const effectSpeed = useSettingsStore.getState().effectSpeed;
        const bounceDuration = COMBAT_BOUNCE_DURATION[effectSpeed];
        if (bounceDuration === 0) return;

        if (this.combatBounce) {
            const prev = this.combatBounce;
            if (prev.sprite.parent) prev.sprite.parent.removeChild(prev.sprite);
            prev.sprite.destroy();
            this.combatBounce = null;
        }

        const { startX, startY, cellWidth, cellHeight, gridOffsetX, gridOffsetY, colGap } = this.cellLayout;
        const { ax, ay, tx, ty, atkDmg } = anim;

        const aCX = startX + gridOffsetX + ax * (cellWidth + colGap) + cellWidth / 2;
        const aCY = startY + gridOffsetY + ay * cellHeight + cellHeight / 2;
        const tCX = startX + gridOffsetX + tx * (cellWidth + colGap) + cellWidth / 2;
        const tCY = startY + gridOffsetY + ty * cellHeight + cellHeight / 2;

        const moveToX = aCX + (tCX - aCX) * 0.55;
        const moveToY = aCY + (tCY - aCY) * 0.55;

        const board = useGameStore.getState().board;
        const attackerDef = board[ax]?.[ay]?.definition;
        let bounceSprite: PIXI.Container;

        if (attackerDef?.sprite && attackerDef.sprite !== '-' && attackerDef.sprite !== '-.png') {
            const SPRITE_PX = 32;
            const rawSize = Math.min(cellWidth - 6, cellHeight) * 0.85;
            const spriteSize = SPRITE_PX * Math.max(1, Math.floor(rawSize / SPRITE_PX));
            const sp = PIXI.Sprite.from(`${ASSET_BASE_URL}assets/symbols/${attackerDef.sprite}`);
            sp.anchor.set(0.5);
            sp.width = spriteSize;
            sp.height = spriteSize;
            bounceSprite = sp;
        } else {
            const lang = useSettingsStore.getState().language;
            const symName = t(`symbol.${attackerDef?.id ?? 0}.name`, lang);
            const rarityColor = attackerDef ? getSymbolColor(attackerDef.type) : 0xffffff;
            const container = new PIXI.Container();
            const txt = new PIXI.Text({
                text: symName,
                style: new PIXI.TextStyle({ fill: rarityColor, fontSize: 32, fontFamily: 'Mulmaru', stroke: { color: '#000000', width: 2 } }),
            });
            txt.anchor.set(0.5);
            container.addChild(txt);
            bounceSprite = container;
        }
        bounceSprite.x = aCX;
        bounceSprite.y = aCY;
        this.combatContainer.addChild(bounceSprite);

        const targetHpX = startX + gridOffsetX + tx * (cellWidth + colGap) + cellWidth - 5;
        const targetHpY = startY + gridOffsetY + ty * cellHeight + cellHeight - 5;

        this.combatBounce = {
            sprite: bounceSprite,
            fromX: aCX, fromY: aCY,
            toX: moveToX, toY: moveToY,
            elapsed: 0,
            duration: bounceDuration,
            hitSpawned: false,
            atkDmg,
            targetHpX,
            targetHpY,
        };
    }
}
