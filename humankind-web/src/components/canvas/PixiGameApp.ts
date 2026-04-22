import * as PIXI from 'pixi.js';
import {
    calculateFoodCost,
    BOARD_WIDTH,
    BOARD_HEIGHT,
    BOARD_BG_SPRITE_PADDING_PX,
    useGameStore,
} from '../../game/state/gameStore';
import { computeBoardPixelLayout } from '../../game/layout/boardPixelLayout';
import type { GameState } from '../../game/state/gameStore';
import { SPIN_SPEED_CONFIG, COMBAT_BOUNCE_DURATION, useSettingsStore } from '../../game/state/settingsStore';
import type { Language, SettingsState } from '../../game/state/settingsStore';
import { t } from '../../i18n';
import { getSymbolColor, SymbolType, BARBARIAN_CAMP_SPAWN_INTERVAL, S } from '../../game/data/symbolDefinitions';
import type { SymbolDefinition } from '../../game/data/symbolDefinitions';
import { useRelicStore } from '../../game/state/relicStore';
import type { RelicInstance } from '../../game/state/relicStore';
import type { HoveredSymbol, HoveredRelic, HoveredUpgrade, HoveredHudStat, FloatingEffect, CombatBounce, CellLayout, ReelState } from './types';
import type { PlayerSymbolInstance } from '../../game/types';
import { KNOWLEDGE_UPGRADES } from '../../game/data/knowledgeUpgrades';
import { loadGameAssets } from './AssetLoader';
import {
    FOOD_RESOURCE_ICON_URL,
    GOLD_RESOURCE_ICON_URL,
    KNOWLEDGE_RESOURCE_ICON_URL,
    RELIC_PANEL_TITLE_ICON_URL,
} from '../../uiAssetUrls';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

function boardHasAdjacentPlains(board: (PlayerSymbolInstance | null)[][], x: number, y: number): boolean {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= BOARD_WIDTH || ny < 0 || ny >= BOARD_HEIGHT) continue;
            if (board[nx][ny]?.definition.id === S.plains) return true;
        }
    }
    return false;
}

/** index.css 커스텀 커서와 동일 (캔버스 위 호버) */
const GAME_CURSOR_POINTER = `url('${ASSET_BASE_URL}assets/ui/cursor.png?v=2') 0 0, pointer`;
const GAME_CURSOR_HELP = `url('${ASSET_BASE_URL}assets/ui/cursor.png?v=2') 0 0, help`;

const FLOAT_DURATION = 800; // ms — 텍스트가 떠오르는 시간
const FLOAT_DISTANCE = 30; // px — 위로 이동 거리

/** 야만인/재해 플로팅: 우측 이동 후 빠르게 위로 사라짐 */
const THREAT_FLOAT_DRIFT_MS = 220;
const THREAT_FLOAT_TOTAL_MS = 1800; // 위로 올라가는 시간 늘려서 글 읽을 여유
const THREAT_FLOAT_DRIFT_RIGHT = 36;
const THREAT_FLOAT_UP = 85;

/** 클릭으로 발동하는 유물 (gameStore.activateClickableRelic) */
const CLICKABLE_RELIC_IDS = new Set([4, 13, 15, 19]);

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

    /** 식량 요구 텍스트 (2턴 이하일 때 진동용) */
    private foodDemandLabel: PIXI.Text | null = null;
    private foodDemandCenter: { x: number; y: number } = { x: 0, y: 0 };

    // Callbacks
    private onHoverSymbol: (symbol: HoveredSymbol | null) => void;
    private onHoverRelic: (relic: HoveredRelic | null) => void;
    private onHoverUpgrade: (upgrade: HoveredUpgrade | null) => void;
    private onHoverHudStat!: (stat: HoveredHudStat | null) => void;
    private hudHoverSnapshot: HoveredHudStat | null = null;

    // Refs equivalent state
    private floatingEffects: FloatingEffect[] = [];
    /** 야만인/재해 전용 플로팅 (우측 → 위로 빠르게) */
    private threatFloatingEffects: { texts: PIXI.Text[]; startX: number; startY: number; elapsed: number }[] = [];
    private runningTotalTexts: { food: PIXI.Text | null; gold: PIXI.Text | null; knowledge: PIXI.Text | null } = { food: null, gold: null, knowledge: null };
    private prevEffectCount: number = 0;
    private prevCombatFloatCount: number = 0;
    private prevRelicFloatCount: number = 0;
    private prevKnowledgeUpgradeFloatCount: number = 0;

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
        onHoverUpgrade: (upgrade: HoveredUpgrade | null) => void,
        onHoverHudStat: (stat: HoveredHudStat | null) => void
    ) {
        this.app = new PIXI.Application();
        this.canvas = canvas;
        this.onHoverSymbol = onHoverSymbol;
        this.onHoverRelic = onHoverRelic;
        this.onHoverUpgrade = onHoverUpgrade;
        this.onHoverHudStat = onHoverHudStat;
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
        this.pixiInitComplete = true;

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
                if (this.pixiInitComplete && this.app.renderer) {
                    if (this.app.resizeTo) (this.app as any).resizeTo = null;
                    this.app.destroy(true);
                }
            } catch (e) {
                console.warn("Error destroying PIXI app:", e);
            }

            try {
                if (this.canvas) this.canvas.innerHTML = '';
            } catch (e) { }
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

        // Pre-combat shake (e.g., Clovis relic): 흔들림은 시간 기반이므로 매 프레임 렌더가 필요
        if (state.preCombatShakeTarget || state.preCombatShakeRelicDefId) {
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

        const viewLayout = computeBoardPixelLayout(w, h);
        const {
            startX,
            startY,
            boardW,
            boardH,
            cellWidth,
            cellHeight,
            gridOffsetX,
            gridOffsetY,
            colGap,
            scale,
        } = viewLayout;
        const lang = settings.language;
        const fontFamily = 'Mulmaru';
        const fs = 1;
        const rowGap = 0;

        // (식량 납부 / 야만인 알림은 NotificationPanel React 컴포넌트가 처리)

        this.cellLayout = { startX, startY, boardW, cellWidth, cellHeight, gridOffsetX, gridOffsetY, colGap };

        // Draw Slot Cells (White background with thin black border)
        const cellGraphics = new PIXI.Graphics();
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cellX = startX + gridOffsetX + x * (cellWidth + colGap);
                const cellY = startY + gridOffsetY + y * (cellHeight + rowGap);
                
                cellGraphics.rect(cellX, cellY, cellWidth, cellHeight);
                cellGraphics.fill({ color: 0xffffff });
            }
        }
        this.boardContainer.addChild(cellGraphics);

        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cellX = startX + gridOffsetX + x * (cellWidth + colGap);
                const cellY = startY + gridOffsetY + y * (cellHeight + rowGap);
                const slotNum = y * BOARD_WIDTH + x + 1;
                
                const text = new PIXI.Text({
                    text: slotNum.toString(),
                    style: new PIXI.TextStyle({
                        fontFamily,
                        fontSize: 64 * scale,
                        fill: 0xe0e0e0,
                        fontWeight: 'bold',
                    })
                });
                text.anchor.set(0.5);
                text.x = cellX + cellWidth / 2;
                text.y = cellY + cellHeight / 2;
                this.boardContainer.addChild(text);
            }
        }


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

                const showSymbolHover = () => {
                    this.symbolHoverCell = { x, y };
                    this.onHoverSymbol({ definition: symDef, screenX: cellX + cellWidth, screenY: cellY });
                };
                const clearSymbolHover = () => {
                    this.symbolHoverCell = null;
                    this.onHoverSymbol(null);
                };

                if (canButcherPasture) {
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
                    const btnLabel = t('cattleButcher.button', lang);
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

                    const butcherBtn = new PIXI.Container();
                    butcherBtn.addChild(btnBg);
                    butcherBtn.addChild(lbl);
                    butcherBtn.x = cellWidth / 2;
                    butcherBtn.y = cellHeight / 2;
                    butcherBtn.visible = false;
                    butcherBtn.eventMode = 'none';
                    cellRoot.addChild(butcherBtn);

                    // 버튼 로컬 히트 영역 (cellRoot 좌표계)
                    const btnX1 = cellWidth / 2 - bw / 2;
                    const btnX2 = cellWidth / 2 + bw / 2;
                    const btnY1 = cellHeight / 2 - bh / 2;
                    const btnY2 = cellHeight / 2 + bh / 2;

                    cellRoot.on('pointerover', () => {
                        showSymbolHover();
                        butcherBtn.visible = true;
                    });
                    cellRoot.on('pointerleave', () => {
                        clearSymbolHover();
                        butcherBtn.visible = false;
                    });
                    cellRoot.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
                        if (!butcherBtn.visible) return;
                        const local = e.getLocalPosition(cellRoot);
                        if (local.x >= btnX1 && local.x <= btnX2 && local.y >= btnY1 && local.y <= btnY2) {
                            useGameStore.getState().butcherPastureAnimalAt(x, y);
                            butcherBtn.visible = false;
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
                    sprite.x = cellX + cellWidth / 2 + preShakeX;
                    sprite.y = cellY + cellHeight / 2 + liftY + wobbleY + preShakeY;
                    sprite.anchor.set(0.5);
                    sprite.width = spriteSize;
                    sprite.height = spriteSize;
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
                    drawTarget.addChild(nameText);
                }

                const bananaCounterText =
                    symDef.id === S.banana
                        ? (() => {
                              const perm = symbol.banana_permanent_food_bonus ?? 0;
                              const pr = symbol.effect_counter || 0;
                              const parts: string[] = [];
                              if (perm > 0) parts.push(`+${perm}`);
                              if (pr > 0) parts.push(`${pr}/10`);
                              return parts.length ? parts.join(' ') : '';
                          })()
                        : '';
                const genericCounterText =
                    symDef.id !== S.banana &&
                    symbol.effect_counter > 0 &&
                    symDef.type !== SymbolType.ENEMY &&
                    symDef.base_hp === undefined
                        ? String(symbol.effect_counter)
                        : '';
                const boardCounterOverlay = bananaCounterText || genericCounterText;
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

                // Merchant(22): 저장된 골드를 카운터로 표시
                if (symDef.id === S.merchant && (symbol.stored_gold ?? 0) > 0) {
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

                if (symDef.id === S.barbarian_camp) { // Barbarian Camp
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

        // ── Combat/relic float texts (e.g., Clovis -1) ──
        if (!state.combatFloats || state.combatFloats.length === 0) {
            this.prevCombatFloatCount = 0;
        } else if (state.combatFloats.length > this.prevCombatFloatCount) {
            const newFloats = state.combatFloats.slice(this.prevCombatFloatCount);
            this.prevCombatFloatCount = state.combatFloats.length;
            const fontSize = Math.max(28, cellHeight * 0.28) * fs;
            for (const f of newFloats) {
                const fx = startX + gridOffsetX + f.x * (cellWidth + colGap) + cellWidth / 2;
                const fy = startY + gridOffsetY + f.y * (cellHeight + rowGap) + cellHeight * 0.25;
                const txt = new PIXI.Text({
                    text: f.text,
                    style: new PIXI.TextStyle({
                        fill: f.color ?? '#ef4444',
                        fontSize,
                        fontWeight: 'bold',
                        fontFamily: 'Mulmaru',
                        stroke: { color: '#000000', width: 4 },
                    }),
                });
                txt.anchor.set(0.5, 0);
                txt.x = fx;
                txt.y = fy;
                (txt as PIXI.Text & { _baseOffsetY: number })._baseOffsetY = 0;
                this.floatContainer.addChild(txt);
                this.floatingEffects.push({ texts: [txt], startY: fy, elapsed: 0 });
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

        // UI bars (Knowledge, Food, Gold) — 하단 스핀 버튼 위쪽 중앙
        this.renderUI(state, settings, scale, fs, w, h, startX, startY, boardW, boardH);
        this.renderRelics(scale, lang);
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


        if (this.hudHoverSnapshot && this.onHoverHudStat) {
            this.onHoverHudStat(this.hudHoverSnapshot);
        }
    }

    private renderRelics(scale: number, _lang: Language) {
        if (!this.cellLayout) return;
        const relics = useRelicStore.getState().relics;
        if (relics.length === 0) return;

        const shakeRelicDefId = useGameStore.getState().preCombatShakeRelicDefId;
        const state = useGameStore.getState();

        // 상단 HUD 바 아래 — 화면 좌측 상단에 작게 가로 배치
        const HUD_HEIGHT = 80 * scale;       // 상단 UI 바 높이
        const iconSize = 64 * scale;         // 컴팩트 크기
        const gapX = 8 * scale;
        const gapY = 8 * scale;
        const MARGIN_LEFT = 16 * scale;
        const MARGIN_TOP = HUD_HEIGHT + 8 * scale;
        const w = this.app?.screen?.width ?? 1920;
        const iconsPerRow = Math.max(1, Math.floor((w - MARGIN_LEFT * 2) / (iconSize + gapX)));

        const relicPanel = new PIXI.Container();
        relicPanel.x = MARGIN_LEFT;
        relicPanel.y = MARGIN_TOP;
        this.bgContainer.addChildAt(relicPanel, 1);


        const layout: { relic: RelicInstance; iconX: number; iconY: number }[] = [];
        let curX = 0;
        let curY = 0;
        for (const relic of relics) {
            if (curX > 0 && curX + iconSize > iconsPerRow * (iconSize + gapX)) {
                curX = 0;
                curY += iconSize + gapY;
            }
            layout.push({ relic, iconX: curX, iconY: curY });
            curX += iconSize + gapX;
        }

        const panelWX = relicPanel.x;
        const panelWY = relicPanel.y;

        const relicCenterByInstanceId = new Map<string, { x: number; y: number }>();

        for (const { relic, iconX, iconY } of layout) {
            const isShakingThisRelic = shakeRelicDefId === relic.definition.id;
            const shakeX = isShakingThisRelic ? Math.sin(Date.now() / 20) * (5 * scale) : 0;
            const shakeY = isShakingThisRelic ? Math.cos(Date.now() / 17) * (4 * scale) : 0;
            const worldIconX = panelWX + iconX + shakeX;
            const worldIconY = panelWY + iconY + shakeY;
            relicCenterByInstanceId.set(relic.instanceId, {
                x: worldIconX + iconSize / 2,
                y: worldIconY + iconSize / 2,
            });

            const cx = iconX + iconSize / 2 + shakeX;
            const cy = iconY + iconSize / 2 + shakeY;

            if (relic.definition.sprite && relic.definition.sprite !== '-' && relic.definition.sprite !== '-.png') {
                const texture =
                    (PIXI.Assets.get(`${ASSET_BASE_URL}assets/relics/${relic.definition.sprite}`) as PIXI.Texture | undefined)
                    ?? PIXI.Texture.from(`${ASSET_BASE_URL}assets/relics/${relic.definition.sprite}`);
                const sp = new PIXI.Sprite(texture);
                sp.x = iconX + shakeX;
                sp.y = iconY + shakeY;
                sp.width = iconSize;
                sp.height = iconSize;
                relicPanel.addChild(sp);
            } else {
                const spPlaceholder = new PIXI.Text({
                    text: '🏺',
                    style: new PIXI.TextStyle({ fontSize: iconSize * 0.6 }),
                });
                spPlaceholder.anchor.set(0.5);
                spPlaceholder.x = cx;
                spPlaceholder.y = cy;
                relicPanel.addChild(spPlaceholder);
            }

            const hitArea = new PIXI.Graphics();
            hitArea.rect(worldIconX, worldIconY, iconSize, iconSize);
            hitArea.fill({ color: 0x000000, alpha: 0 });
            hitArea.eventMode = 'static';
            const relicClickable = CLICKABLE_RELIC_IDS.has(relic.definition.id);
            hitArea.cursor = relicClickable ? GAME_CURSOR_POINTER : GAME_CURSOR_HELP;

            hitArea.on('pointerover', () => {
                this.relicHoverSnapshot = {
                    instanceId: relic.instanceId,
                    screenX: worldIconX + iconSize,
                    screenY: worldIconY,
                };
                this.onHoverRelic({ relicInfo: relic, screenX: worldIconX + iconSize, screenY: worldIconY });
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

            {
                const rid = relic.definition.id;
                let counterStr: string | null = null;
                if (rid === 3 || rid === 9) counterStr = String(relic.effect_counter);
                else if (rid === 4) counterStr = String(relic.bonus_stacks);
                else if (rid === 6) counterStr = String(1 + (relic.bonus_stacks ?? 0));
                if (counterStr !== null) {
                    const counterText = new PIXI.Text({
                        text: counterStr,
                        style: new PIXI.TextStyle({
                            fill: '#d1d5db',
                            fontSize: 26 * scale,
                            fontWeight: 'bold',
                            fontFamily: 'Mulmaru',
                            stroke: { color: '#000000', width: 3 },
                        }),
                    });
                    counterText.anchor.set(0.5, 0.5);
                    counterText.x = iconX + iconSize - 14 * scale;
                    counterText.y = iconY + iconSize - 16 * scale;
                    relicPanel.addChild(counterText);
                }
            }
        }

        // ── Relic floats (e.g., Jomon cashout +Food) ──
        if (!state.relicFloats || state.relicFloats.length === 0) {
            this.prevRelicFloatCount = 0;
        } else if (state.relicFloats.length > this.prevRelicFloatCount) {
            const newFloats = state.relicFloats.slice(this.prevRelicFloatCount);
            this.prevRelicFloatCount = state.relicFloats.length;
            const fontSize = Math.max(26, iconSize * 0.32);
            for (const f of newFloats) {
                const c = relicCenterByInstanceId.get(f.relicInstanceId);
                if (!c) continue;
                const txt = new PIXI.Text({
                    text: f.text,
                    style: new PIXI.TextStyle({
                        fill: f.color ?? '#ffffff',
                        fontSize,
                        fontWeight: 'bold',
                        fontFamily: 'Mulmaru',
                        stroke: { color: '#000000', width: 4 },
                    }),
                });
                txt.anchor.set(0.5, 0.5);
                txt.x = c.x;
                txt.y = c.y - iconSize * 0.15;
                (txt as PIXI.Text & { _baseOffsetY: number })._baseOffsetY = 0;
                this.floatContainer.addChild(txt);
                this.floatingEffects.push({ texts: [txt], startY: txt.y, elapsed: 0 });
            }
        }
    }


    private renderUI(
        _state: GameState,
        _settings: SettingsState,
        scale: number,
        _fs: number,
        w: number,
        _h: number,
        _boardStartX: number,
        _boardStartY: number,
        _boardW: number,
        _boardH: number
    ) {
        // UI rendering is now handled by React (App.tsx / .hud-top)
        this.hudTopContainer.removeChildren();
        this.foodDemandCenter = { x: w / 2, y: 44 * scale };
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
            const symName = t(`symbol.${attackerDef?.key ?? 'warrior'}.name`, lang);
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
