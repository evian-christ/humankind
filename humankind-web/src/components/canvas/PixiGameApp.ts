import * as PIXI from 'pixi.js';
import { calculateFoodCost, BOARD_WIDTH, BOARD_HEIGHT, useGameStore } from '../../game/state/gameStore';
import type { GameState } from '../../game/state/gameStore';
import { SPIN_SPEED_CONFIG, COMBAT_BOUNCE_DURATION, useSettingsStore } from '../../game/state/settingsStore';
import type { SettingsState } from '../../game/state/settingsStore';
import { t } from '../../i18n';
import { getSymbolColor, Era, SymbolType } from '../../game/data/symbolDefinitions';
import type { SymbolDefinition } from '../../game/data/symbolDefinitions';
import type { HoveredSymbol, FloatingEffect, CombatBounce, CellLayout, ReelState } from './types';
import { loadGameAssets } from './AssetLoader';

const FLOAT_DURATION = 800; // ms — 텍스트가 떠오르는 시간
const FLOAT_DISTANCE = 30; // px — 위로 이동 거리

const ERA_NAME_KEYS: Record<number, string> = {
    [Era.RELIGION]: 'era.religion',
    [Era.ANCIENT]: 'era.ancient',
    [Era.CLASSICAL]: 'era.classical',
    [Era.MEDIEVAL]: 'era.medieval',
    [Era.INDUSTRIAL]: 'era.industrial',
    [Era.MODERN]: 'era.modern',
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

    // Callbacks
    private onHoverSymbol: (symbol: HoveredSymbol | null) => void;

    // Refs equivalent state
    private floatingEffects: FloatingEffect[] = [];
    private runningTotalTexts: { food: PIXI.Text | null; gold: PIXI.Text | null; knowledge: PIXI.Text | null } = { food: null, gold: null, knowledge: null };
    private prevEffectCount: number = 0;

    private reels: ReelState[] = [];
    private spinElapsed: number = 0;
    private spinActive: boolean = false;

    private cellLayout: CellLayout | null = null;
    private combatBounce: CombatBounce | null = null;
    private combatShaking: boolean = false;



    constructor(canvas: HTMLDivElement, onHoverSymbol: (symbol: HoveredSymbol | null) => void) {
        this.app = new PIXI.Application();
        this.canvas = canvas;
        this.onHoverSymbol = onHoverSymbol;
        this.hitContainer.eventMode = 'static';
    }

    public async init() {
        PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';
        await this.app.init({
            background: '#1a1a1a',
            antialias: false,
            roundPixels: true,
            resizeTo: this.canvas,
        });

        if (this.destroyed) {
            this.app.destroy(true, { children: true, texture: true });
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

        this.app.ticker.add((ticker) => this.onTick(ticker));
    }

    public destroy() {
        this.destroyed = true;
        if (this.app) {
            try {
                this.app.destroy(true, { children: true, texture: true });
            } catch (e) {
                console.warn("Error destroying PIXI app:", e);
            }
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

        this.boardContainer.removeChildren();
        this.effectsContainer.removeChildren();
        this.hitContainer.removeChildren();
        this.bgContainer.removeChildren();

        if (!state.combatAnimation) {
            this.combatContainer.removeChildren();
            this.combatContainer.x = 0;
        }

        // Render Background
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, w, h);
        bg.fill({ color: 0x1a1a1a });
        this.bgContainer.addChild(bg);

        const BASE_W = 1920;
        const BASE_H = 1080;
        const scale = Math.min(w / BASE_W, h / BASE_H);
        const lang = settings.language;
        const fontFamily = 'Mulmaru';
        const fs = 1;

        // Top-center message
        const turnsUntilPayment = 10 - (state.turn % 10);
        const nextPaymentTurn = state.turn + turnsUntilPayment;
        const nextCost = calculateFoodCost(nextPaymentTurn);
        const demandMsg = t('game.foodDemand', lang).replace('{turns}', String(turnsUntilPayment)).replace('{amount}', String(nextCost));

        const topRowCY = 40 * scale;
        const demandText = new PIXI.Text({
            text: demandMsg,
            style: new PIXI.TextStyle({ fill: '#e0e0e0', fontSize: 28 * fs, fontFamily, stroke: { color: '#000000', width: 2 } }),
        });
        demandText.anchor.set(0.5, 0.5);
        demandText.x = w / 2;
        demandText.y = topRowCY;
        this.bgContainer.addChild(demandText);

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

        const startX = (w - boardW) / 2;
        const startY = (h - boardH) / 2;

        this.cellLayout = { startX, startY, cellWidth, cellHeight, gridOffsetX, gridOffsetY, colGap };

        // Board bg sprite
        const boardBg = PIXI.Sprite.from('/assets/sprites/slot_bg.png');
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
                    if (def && def.sprite) {
                        const spritePath = `/assets/sprites/${def.sprite}`;
                        const spriteSize = Math.min(cellWidth - 6, cellHeight) * 0.7;
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
                    this.onHoverSymbol({ definition: symDef, screenX: cellX + cellWidth, screenY: cellY, enemy_effect_id: symbol.enemy_effect_id });
                });
                hitArea.on('pointerout', () => this.onHoverSymbol(null));
                this.hitContainer.addChild(hitArea);

                const innerW = cellWidth - 6;
                const rarityColor = getSymbolColor(symDef.era);

                if (symDef.sprite) {
                    const spritePath = `/assets/sprites/${symDef.sprite}`;
                    const spriteSize = Math.min(innerW, cellHeight) * 0.7;
                    const sprite = PIXI.Sprite.from(spritePath);
                    sprite.x = cellX + cellWidth / 2;
                    sprite.y = cellY + cellHeight / 2;
                    sprite.anchor.set(0.5);
                    sprite.width = spriteSize;
                    sprite.height = spriteSize;
                    drawTarget.addChild(sprite);
                } else {
                    const symName = t(`symbol.${symDef.id}.name`, lang);
                    const nameText = new PIXI.Text({
                        text: symName,
                        style: new PIXI.TextStyle({ fill: rarityColor, fontSize: 32 * fs, fontFamily, stroke: { color: '#000000', width: 2 } }),
                    });
                    nameText.anchor.set(0.5);
                    nameText.x = cellX + cellWidth / 2;
                    nameText.y = cellY + cellHeight / 2;
                    drawTarget.addChild(nameText);
                }

                if (symbol.effect_counter > 0 && symDef.symbol_type === SymbolType.FRIENDLY) {
                    const counterText = new PIXI.Text({
                        text: String(symbol.effect_counter),
                        style: new PIXI.TextStyle({ fill: '#000000', fontSize: 42 * fs, fontFamily }),
                    });
                    counterText.anchor.set(1, 1);
                    counterText.x = cellX + cellWidth - 8;
                    counterText.y = cellY + cellHeight - 8;
                    drawTarget.addChild(counterText);
                }

                if (symDef.base_attack !== undefined && symDef.base_attack > 0) {
                    const atkText = new PIXI.Text({
                        text: `⚔${symDef.base_attack}`,
                        style: new PIXI.TextStyle({ fill: '#ff8c42', fontSize: 30 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3 } }),
                    });
                    atkText.anchor.set(0, 1);
                    atkText.x = cellX + 6;
                    atkText.y = cellY + cellHeight - 5;
                    drawTarget.addChild(atkText);
                }

                if (symDef.base_hp !== undefined && symDef.base_hp > 0) {
                    const hpText = new PIXI.Text({
                        text: `♥${symbol.enemy_hp ?? symDef.base_hp}`,
                        style: new PIXI.TextStyle({ fill: '#4ade80', fontSize: 30 * fs, fontWeight: 'bold', fontFamily, stroke: { color: '#000000', width: 3 } }),
                    });
                    hpText.anchor.set(1, 1);
                    hpText.x = cellX + cellWidth - 5;
                    hpText.y = cellY + cellHeight - 5;
                    drawTarget.addChild(hpText);
                }

                if (state.activeSlot && state.activeSlot.x === x && state.activeSlot.y === y) {
                    const highlight = new PIXI.Graphics();
                    highlight.rect(cellX - 3, cellY - 3, cellWidth + 6, cellHeight + 6);
                    highlight.stroke({ color: 0xfbbf24, width: 4, alpha: 0.7 });
                    highlight.rect(cellX, cellY, cellWidth, cellHeight);
                    highlight.fill({ color: 0xfbbf24, alpha: 0.2 });
                    drawTarget.addChild(highlight);
                }

                if (state.activeContributors.some(c => c.x === x && c.y === y)) {
                    const contrib = new PIXI.Graphics();
                    contrib.rect(cellX - 2, cellY - 2, cellWidth + 4, cellHeight + 4);
                    contrib.stroke({ color: 0x60a5fa, width: 3, alpha: 0.8 });
                    contrib.rect(cellX, cellY, cellWidth, cellHeight);
                    contrib.fill({ color: 0x60a5fa, alpha: 0.15 });
                    drawTarget.addChild(contrib);
                }

                if (state.phase === 'processing' && symbol.is_marked_for_destruction) {
                    const destroyOverlay = new PIXI.Graphics();
                    destroyOverlay.rect(cellX, cellY, cellWidth, cellHeight);
                    destroyOverlay.fill({ color: 0x000000, alpha: 0.4 });
                    destroyOverlay.rect(cellX, cellY, cellWidth, cellHeight);
                    destroyOverlay.stroke({ color: 0xef4444, width: 3, alpha: 0.8 });
                    const margin = cellWidth * 0.25;
                    destroyOverlay.moveTo(cellX + margin, cellY + margin);
                    destroyOverlay.lineTo(cellX + cellWidth - margin, cellY + cellHeight - margin);
                    destroyOverlay.stroke({ color: 0xef4444, width: 3, alpha: 0.7 });
                    destroyOverlay.moveTo(cellX + cellWidth - margin, cellY + margin);
                    destroyOverlay.lineTo(cellX + margin, cellY + cellHeight - margin);
                    destroyOverlay.stroke({ color: 0xef4444, width: 3, alpha: 0.7 });
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

        // UI bars (Knowledge, Food, Gold)
        this.renderUI(state, settings, scale, h, topRowCY, fs);
    }

    private renderUI(state: GameState, settings: SettingsState, scale: number, h: number, topRowCY: number, fs: number) {
        const lang = settings.language;
        const fontFamily = 'Mulmaru';
        const eraName = t(ERA_NAME_KEYS[state.era] ?? 'era.ancient', lang);
        const knowledgeThresholds = [50, 100, 175, 275];
        const knowledgeCap = knowledgeThresholds[Math.min(state.era - 1, knowledgeThresholds.length - 1)] ?? 275;
        const knowledgeCurrent = Math.min(state.knowledge, knowledgeCap);
        const knowledgeRatio = knowledgeCap > 0 ? knowledgeCurrent / knowledgeCap : 0;

        const demandFontSize = 28 * fs;
        const rowCY = topRowCY;
        const rowH = demandFontSize + 4 * scale;
        const rowY = rowCY - rowH / 2;
        const startPanelX = 32 * scale;
        const barW = 200 * scale;
        const barH = rowH;
        const gap = 12 * scale;

        const eraText = new PIXI.Text({
            text: eraName,
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
            text: `✦ ${knowledgeCurrent}/${knowledgeCap}`,
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

        if (attackerDef?.sprite) {
            const spriteSize = Math.min(cellWidth - 6, cellHeight) * 0.7;
            const sp = PIXI.Sprite.from(`/assets/sprites/${attackerDef.sprite}`);
            sp.anchor.set(0.5);
            sp.width = spriteSize;
            sp.height = spriteSize;
            bounceSprite = sp;
        } else {
            const lang = useSettingsStore.getState().language;
            const symName = t(`symbol.${attackerDef?.id ?? 0}.name`, lang);
            const rarityColor = attackerDef ? getSymbolColor(attackerDef.era) : 0xffffff;
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
