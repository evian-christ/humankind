import { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { useGameStore, BOARD_WIDTH, BOARD_HEIGHT, calculateFoodCost } from '../game/state/gameStore';
import { useSettingsStore, SPIN_SPEED_CONFIG } from '../game/state/settingsStore';
import { getSymbolColor, getSymbolColorHex, Era, SYMBOLS, type SymbolDefinition } from '../game/data/symbolDefinitions';
import { t } from '../i18n';

interface HoveredSymbol {
    definition: SymbolDefinition;
    screenX: number;
    screenY: number;
}

/** 슬롯에서 떠오르는 이펙트 텍스트 */
interface FloatingEffect {
    texts: PIXI.Text[];
    startY: number;
    elapsed: number; // ms
}

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

const GameCanvas = () => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const boardContainerRef = useRef<PIXI.Container | null>(null);
    const effectsContainerRef = useRef<PIXI.Container | null>(null);    // 합산 텍스트 등 정적 이펙트
    const floatContainerRef = useRef<PIXI.Container | null>(null);       // 떠오르는 텍스트 (ticker 관리)
    const hitContainerRef = useRef<PIXI.Container | null>(null);
    const bgContainerRef = useRef<PIXI.Container | null>(null);
    const [hoveredSymbol, setHoveredSymbol] = useState<HoveredSymbol | null>(null);
    const hoveredSymbolRef = useRef<HoveredSymbol | null>(null);
    const language = useSettingsStore((s) => s.language);
    const setHoveredSymbolStable = useCallback((val: HoveredSymbol | null) => {
        hoveredSymbolRef.current = val;
        setHoveredSymbol(val);
    }, []);

    // 떠오르는 이펙트 텍스트 관리
    const floatingEffectsRef = useRef<FloatingEffect[]>([]);
    // 합산 텍스트 PIXI 객체
    const runningTotalTextsRef = useRef<{ food: PIXI.Text | null; gold: PIXI.Text | null; knowledge: PIXI.Text | null }>({ food: null, gold: null, knowledge: null });
    // 이전에 렌더된 이펙트 수 (새로 추가된 것만 애니메이션)
    const prevEffectCountRef = useRef<number>(0);

    // 슬롯 머신 릴 애니메이션 상태
    const spinContainerRef = useRef<PIXI.Container | null>(null);
    /** 각 열의 릴 데이터 */
    interface ReelState {
        container: PIXI.Container;
        mask: PIXI.Graphics;
        scrollY: number;         // 현재 스크롤 오프셋 (증가 → 스트립이 아래로 내려옴)
        speed: number;           // 현재 속도 (px/ms)
        started: boolean;        // 출발했는지
        stopped: boolean;
        decelerating: boolean;
        startDelay: number;      // 출발 지연 시간 (ms)
        targetScrollY: number;   // 실제 심볼이 보이는 최종 스크롤 위치
        cellHeight: number;
        stripInitialY: number;   // 스트립 초기 y 오프셋
        reelContainer: PIXI.Container; // 전체 릴 스트립
    }
    const reelsRef = useRef<ReelState[]>([]);
    const spinElapsedRef = useRef<number>(0);
    const spinActiveRef = useRef<boolean>(false);

    // Initialize Pixi Application
    useEffect(() => {
        if (!canvasRef.current) return;

        const app = new PIXI.Application();
        let destroyed = false;

        const init = async () => {
            // Set global scale mode to nearest for sharp pixel art
            PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';

            await app.init({
                background: '#1a1a1a', // Dark gray background
                antialias: false,
                roundPixels: true,
                resizeTo: canvasRef.current!,
            });

            if (destroyed) {
                app.destroy(true);
                return;
            }

            canvasRef.current!.appendChild(app.canvas);
            appRef.current = app;

            // Preload assets with error handling
            try {
                // Register and load custom fonts
                PIXI.Assets.add({ alias: 'Mulmaru', src: '/Mulmaru.ttf' });

                const symbolPaths = Array.from({ length: 30 }, (_, i) => `/assets/sprites/${String(i + 1).padStart(3, '0')}.png`);
                await PIXI.Assets.load([
                    'Mulmaru',
                    '/assets/sprites/slot_bg.png',
                    '/assets/sprites/pasture.png',
                    '/assets/ui/stonebar_1880x82.png',
                    '/assets/ui/buttons/menu0.png',
                    '/assets/ui/buttons/menu1.png',
                    ...symbolPaths
                ]);
            } catch (error) {
                console.warn("Some assets failed to load, proceeding anyway:", error);
            }

            if (destroyed) return;

            // Enable events on the stage
            app.stage.eventMode = 'static';

            // Background layer
            const bgContainer = new PIXI.Container();
            app.stage.addChild(bgContainer);
            bgContainerRef.current = bgContainer;

            // Board layer
            const boardContainer = new PIXI.Container();
            app.stage.addChild(boardContainer);
            boardContainerRef.current = boardContainer;

            // Spin reel layer (above board, below effects)
            const spinContainer = new PIXI.Container();
            app.stage.addChild(spinContainer);
            spinContainerRef.current = spinContainer;

            // Effects layer (running totals, static)
            const effectsContainer = new PIXI.Container();
            app.stage.addChild(effectsContainer);
            effectsContainerRef.current = effectsContainer;

            // Float layer (animated floating text, managed by ticker)
            const floatContainer = new PIXI.Container();
            app.stage.addChild(floatContainer);
            floatContainerRef.current = floatContainer;

            // Hit area layer (topmost, for hover detection)
            const hitContainer = new PIXI.Container();
            hitContainer.eventMode = 'static';
            app.stage.addChild(hitContainer);
            hitContainerRef.current = hitContainer;

            // Ticker for floating effect animations + reel spinning
            app.ticker.add((ticker) => {
                const dt = ticker.deltaMS;

                // --- Floating effects ---
                const floats = floatingEffectsRef.current;
                for (let i = floats.length - 1; i >= 0; i--) {
                    const f = floats[i];
                    f.elapsed += dt;
                    const progress = Math.min(f.elapsed / FLOAT_DURATION, 1);
                    const ease = 1 - (1 - progress) * (1 - progress);
                    const offsetY = -FLOAT_DISTANCE * ease;
                    const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
                    for (const txt of f.texts) {
                        txt.y = f.startY + (txt as unknown as { _baseOffsetY: number })._baseOffsetY + offsetY;
                        txt.alpha = alpha;
                    }
                    if (progress >= 1) {
                        for (const txt of f.texts) {
                            txt.parent?.removeChild(txt);
                            txt.destroy();
                        }
                        floats.splice(i, 1);
                    }
                }

                // --- Reel spinning ---
                if (!spinActiveRef.current) return;

                const spinConfig = SPIN_SPEED_CONFIG[useSettingsStore.getState().spinSpeed];
                const reels = reelsRef.current;

                // instant: 즉시 완료
                if (spinConfig.speedMul === 0) {
                    for (const reel of reels) {
                        reel.scrollY = reel.targetScrollY;
                        reel.stopped = true;
                        reel.reelContainer.y = reel.stripInitialY + reel.scrollY;
                    }
                    spinActiveRef.current = false;
                    spinContainer.removeChildren();
                    for (const reel of reels) { reel.mask.destroy(); }
                    reelsRef.current = [];
                    useGameStore.getState().startProcessing();
                    return;
                }

                spinElapsedRef.current += dt;
                const REEL_SPEED = 1.2 * spinConfig.speedMul;

                let allStopped = true;

                for (let col = 0; col < reels.length; col++) {
                    const reel = reels[col];
                    if (reel.stopped) continue;
                    allStopped = false;

                    // 출발 지연: elapsed가 startDelay 미만이면 아직 안 움직임
                    if (!reel.started) {
                        if (spinElapsedRef.current >= reel.startDelay) {
                            reel.started = true;
                        } else {
                            continue;
                        }
                    }

                    // 감속: targetScrollY까지 남은 거리 기준
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
                    spinActiveRef.current = false;
                    spinContainer.removeChildren();
                    for (const reel of reels) { reel.mask.destroy(); }
                    reelsRef.current = [];
                    useGameStore.getState().startProcessing();
                }
            });

            renderBoard();

            // Handle resize
            const resizeObserver = new ResizeObserver(() => {
                renderBoard();
            });
            if (canvasRef.current) {
                resizeObserver.observe(canvasRef.current);
            }
        };

        init();

        return () => {
            destroyed = true;
            if (appRef.current) {
                appRef.current.destroy(true);
                appRef.current = null;
            }
        };
    }, []);

    const renderBoard = () => {
        const app = appRef.current;
        const boardContainer = boardContainerRef.current;
        const effectsContainer = effectsContainerRef.current;
        const hitContainer = hitContainerRef.current;
        const bgContainer = bgContainerRef.current;
        if (!app || !boardContainer || !effectsContainer || !hitContainer || !bgContainer) return;

        const state = useGameStore.getState();
        const { board, lastEffects } = state;

        boardContainer.removeChildren();
        effectsContainer.removeChildren();
        // floatContainer는 ticker가 관리하므로 건드리지 않음
        hitContainer.removeChildren();
        bgContainer.removeChildren();

        const w = app.screen.width;
        const h = app.screen.height;

        // Background (Simple dark gray)
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, w, h);
        bg.fill({ color: 0x1a1a1a });
        bgContainer.addChild(bg);

        // Base resolution: 1920x1080, scale for other resolutions
        const BASE_W = 1920;
        const BASE_H = 1080;
        const scale = Math.min(w / BASE_W, h / BASE_H);

        // Font setup
        const lang = useSettingsStore.getState().language;
        const fontFamily = 'Mulmaru';
        const fs = 1;

        // Top-center: Food demand message
        const turnsUntilPayment = 10 - (state.turn % 10);
        const nextPaymentTurn = state.turn + turnsUntilPayment;
        const nextCost = calculateFoodCost(nextPaymentTurn);
        const demandMsg = t('game.foodDemand', lang)
            .replace('{turns}', String(turnsUntilPayment))
            .replace('{amount}', String(nextCost));
        const demandText = new PIXI.Text({
            text: demandMsg,
            style: new PIXI.TextStyle({
                fill: '#e0e0e0',
                fontSize: 28 * fs,
                fontWeight: 'normal',
                fontFamily,
                stroke: { color: '#000000', width: 2 },
            }),
        });
        demandText.anchor.set(0.5, 0);
        demandText.x = w / 2;
        demandText.y = 16 * scale;
        bgContainer.addChild(demandText);

        // Board dimensions at base resolution
        const BOARD_SCALE = 0.8; // Board size ratio
        const boardW = 1140 * scale * BOARD_SCALE;
        const boardH = 830 * scale * BOARD_SCALE;

        // Slot size and gaps
        const cellWidth = 213 * scale * BOARD_SCALE;
        const cellHeight = 204 * scale * BOARD_SCALE;
        const colGap = 15 * scale * BOARD_SCALE;
        const rowGap = 0;

        // Center slots within the board
        const totalSlotsWidth = (cellWidth * BOARD_WIDTH) + (colGap * (BOARD_WIDTH - 1));
        const totalSlotsHeight = cellHeight * BOARD_HEIGHT;
        const gridOffsetX = (boardW - totalSlotsWidth) / 2;
        const gridOffsetY = (boardH - totalSlotsHeight) / 2;

        // Center board horizontally and vertically
        const startX = (w - boardW) / 2;
        const startY = (h - boardH) / 2;

        // Draw board background (single sprite for entire board)
        const boardBg = PIXI.Sprite.from('/assets/sprites/slot_bg.png');

        const spritePaddingX = 8 * scale;
        const spritePaddingY = 8 * scale;

        boardBg.x = startX - spritePaddingX;
        boardBg.y = startY - spritePaddingY;
        boardBg.width = boardW + (spritePaddingX * 2);
        boardBg.height = boardH + (spritePaddingY * 2);
        boardContainer.addChild(boardBg);

        // spinning 상태에서 릴 애니메이션 시작
        if (state.phase === 'spinning' && !spinActiveRef.current) {
            const spinCont = spinContainerRef.current;
            if (spinCont) {
                spinCont.removeChildren();
                reelsRef.current = [];
                spinElapsedRef.current = 0;

                // 보유 심볼 풀 (null 포함 — 보유 심볼 < 20이면 빈 칸도 릴에 등장)
                const totalBoardSlots = BOARD_WIDTH * BOARD_HEIGHT;
                const reelPool: (SymbolDefinition | null)[] = state.playerSymbols
                    .slice(0, totalBoardSlots)
                    .map(s => s.definition);
                // 빈 슬롯 수만큼 null 추가
                const emptyCount = totalBoardSlots - reelPool.length;
                for (let i = 0; i < emptyCount; i++) reelPool.push(null);

                const pickRandomFromPool = () => reelPool[Math.floor(Math.random() * reelPool.length)];

                // 랜덤 심볼 수 (많을수록 오래 돌아감)
                const RANDOM_COUNT = 12;
                const currentSpinConfig = SPIN_SPEED_CONFIG[useSettingsStore.getState().spinSpeed];

                for (let col = 0; col < BOARD_WIDTH; col++) {
                    const colX = startX + gridOffsetX + col * (cellWidth + colGap);
                    const colYStart = startY + gridOffsetY;
                    const visibleHeight = cellHeight * BOARD_HEIGHT;

                    // 마스크: 이 열의 보드 영역만 보이게
                    const mask = new PIXI.Graphics();
                    mask.rect(colX, colYStart, cellWidth, visibleHeight);
                    mask.fill({ color: 0xffffff });
                    spinCont.addChild(mask);

                    // 릴 스트립 컨테이너 — y를 움직여서 스크롤
                    const reelStrip = new PIXI.Container();
                    reelStrip.mask = mask;
                    spinCont.addChild(reelStrip);

                    // 뒤쪽 열일수록 더 많은 랜덤 심볼 → 더 오래 스크롤
                    const extraPerCol = 1; // 열당 추가 랜덤 심볼 수
                    const colRandomCount = RANDOM_COUNT + col * extraPerCol;
                    const stripOffsetY = -(BOARD_HEIGHT + colRandomCount) * cellHeight;

                    /** 심볼 또는 빈 슬롯을 그룹으로 생성 */
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
                        // def가 null이면 빈 그룹 (빈 슬롯)
                        return group;
                    };

                    // 슬롯 0~3: 실제 배치될 심볼 (스트립 맨 위 — 최종 도착점)
                    for (let row = 0; row < BOARD_HEIGHT; row++) {
                        const sym = board[col][row];
                        reelStrip.addChild(createSymbolGroup(sym ? sym.definition : null, colYStart + row * cellHeight));
                    }

                    // 중간 랜덤 심볼 (스크롤 중에 지나감)
                    for (let i = 0; i < colRandomCount; i++) {
                        reelStrip.addChild(createSymbolGroup(pickRandomFromPool(), colYStart + (BOARD_HEIGHT + i) * cellHeight));
                    }

                    // 초기에 보이는 심볼 (스트립 맨 아래) — 이전 보드 배치에서 가져옴
                    const prevBoard = state.prevBoard;
                    for (let i = 0; i < BOARD_HEIGHT; i++) {
                        const prevSym = prevBoard[col]?.[i];
                        reelStrip.addChild(createSymbolGroup(prevSym ? prevSym.definition : null, colYStart + (BOARD_HEIGHT + colRandomCount + i) * cellHeight));
                    }

                    // 초기 위치: 맨 아래 랜덤 4개가 마스크 영역에 보이도록
                    reelStrip.y = stripOffsetY;

                    // targetScrollY: 이만큼 아래로 내려오면 맨 위 실제 심볼이 마스크 영역에 보임
                    const targetScrollY = (BOARD_HEIGHT + colRandomCount) * cellHeight;
                    const colStartDelay = col * currentSpinConfig.stopInterval;

                    reelsRef.current.push({
                        container: reelStrip,
                        mask,
                        scrollY: 0,
                        speed: 0,
                        started: false,
                        stopped: false,
                        decelerating: false,
                        startDelay: colStartDelay,
                        targetScrollY,
                        cellHeight,
                        stripInitialY: stripOffsetY,
                        reelContainer: reelStrip,
                    });
                }

                spinActiveRef.current = true;
            }
        }

        // Draw slot borders and symbols
        // spinning 중에는 릴이 표시하므로 boardContainer에 심볼 안 그림
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (state.phase === 'spinning') continue;

            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const cellX = startX + gridOffsetX + x * (cellWidth + colGap);
                const cellY = startY + gridOffsetY + y * (cellHeight + rowGap);

                const symbol = board[x][y];
                if (!symbol) continue;

                // Hit area for hover tooltip
                const hitArea = new PIXI.Graphics();
                hitArea.rect(cellX, cellY, cellWidth, cellHeight);
                hitArea.fill({ color: 0x000000, alpha: 0 });
                hitArea.eventMode = 'static';
                hitArea.cursor = 'pointer';
                const symDef = symbol.definition;
                hitArea.on('pointerover', () => {
                    setHoveredSymbolStable({
                        definition: symDef,
                        screenX: cellX + cellWidth,
                        screenY: cellY,
                    });
                });
                hitArea.on('pointerout', () => {
                    setHoveredSymbolStable(null);
                });
                hitContainer.addChild(hitArea);

                const gap = 3;
                const innerW = cellWidth - gap * 2;
                const innerH = cellHeight;
                const rarityColor = getSymbolColor(symbol.definition.era);

                // Sprite (skip if no sprite defined)
                if (symbol.definition.sprite) {
                    const spritePath = `/assets/sprites/${symbol.definition.sprite}`;
                    const spriteSize = Math.min(innerW, innerH) * 0.7; // 70% of slot size
                    const sprite = PIXI.Sprite.from(spritePath);
                    sprite.x = cellX + cellWidth / 2;
                    sprite.y = cellY + cellHeight / 2; // Dead center
                    sprite.anchor.set(0.5);
                    sprite.width = spriteSize;
                    sprite.height = spriteSize;
                    boardContainer.addChild(sprite);
                } else {
                    // No sprite: show symbol name as fallback
                    const symName = t(`symbol.${symbol.definition.id}.name`, lang);
                    const nameText = new PIXI.Text({
                        text: symName,
                        style: new PIXI.TextStyle({
                            fill: rarityColor,
                            fontSize: 32 * fs,
                            fontFamily,
                            stroke: { color: '#000000', width: 2 },
                        }),
                    });
                    nameText.anchor.set(0.5);
                    nameText.x = cellX + cellWidth / 2;
                    nameText.y = cellY + cellHeight / 2;
                    boardContainer.addChild(nameText);
                }

                // Counter badge
                if (symbol.effect_counter > 0) {
                    const badgeX = cellX + cellWidth - 8;
                    const badgeY = cellY + cellHeight - 8;

                    const counterText = new PIXI.Text({
                        text: String(symbol.effect_counter),
                        style: new PIXI.TextStyle({
                            fill: '#000000',
                            fontSize: 42 * fs,
                            fontWeight: 'normal',
                            fontFamily,
                        }),
                    });
                    counterText.anchor.set(1, 1); // Bottom-right anchor
                    counterText.x = badgeX;
                    counterText.y = badgeY;
                    boardContainer.addChild(counterText);
                }

                // Active slot highlight
                if (state.activeSlot && state.activeSlot.x === x && state.activeSlot.y === y) {
                    const highlight = new PIXI.Graphics();
                    // 바깥 글로우
                    highlight.rect(cellX - 3, cellY - 3, cellWidth + 6, cellHeight + 6);
                    highlight.stroke({ color: 0xfbbf24, width: 4, alpha: 0.7 });
                    // 안쪽 밝은 오버레이
                    highlight.rect(cellX, cellY, cellWidth, cellHeight);
                    highlight.fill({ color: 0xfbbf24, alpha: 0.2 });
                    boardContainer.addChild(highlight);
                }

                // Contributor highlight (인접 기여 심볼)
                if (state.activeContributors.some(c => c.x === x && c.y === y)) {
                    const contrib = new PIXI.Graphics();
                    contrib.rect(cellX - 2, cellY - 2, cellWidth + 4, cellHeight + 4);
                    contrib.stroke({ color: 0x60a5fa, width: 3, alpha: 0.8 });
                    contrib.rect(cellX, cellY, cellWidth, cellHeight);
                    contrib.fill({ color: 0x60a5fa, alpha: 0.15 });
                    boardContainer.addChild(contrib);
                }

                // 파괴 예고 (processing 중 is_marked_for_destruction인 심볼)
                if (state.phase === 'processing' && symbol.is_marked_for_destruction) {
                    const destroyOverlay = new PIXI.Graphics();
                    // 어두운 빨간 오버레이
                    destroyOverlay.rect(cellX, cellY, cellWidth, cellHeight);
                    destroyOverlay.fill({ color: 0x000000, alpha: 0.4 });
                    destroyOverlay.rect(cellX, cellY, cellWidth, cellHeight);
                    destroyOverlay.stroke({ color: 0xef4444, width: 3, alpha: 0.8 });
                    // X 표시
                    const margin = cellWidth * 0.25;
                    destroyOverlay.moveTo(cellX + margin, cellY + margin);
                    destroyOverlay.lineTo(cellX + cellWidth - margin, cellY + cellHeight - margin);
                    destroyOverlay.stroke({ color: 0xef4444, width: 3, alpha: 0.7 });
                    destroyOverlay.moveTo(cellX + cellWidth - margin, cellY + margin);
                    destroyOverlay.lineTo(cellX + margin, cellY + cellHeight - margin);
                    destroyOverlay.stroke({ color: 0xef4444, width: 3, alpha: 0.7 });
                    boardContainer.addChild(destroyOverlay);
                }
            }
        }

        // 새로 추가된 이펙트만 떠오르는 애니메이션 생성
        const floatContainer = floatContainerRef.current;
        const prevCount = prevEffectCountRef.current;

        // lastEffects가 비워졌으면 카운터 리셋 (idle/selection 진입 시)
        if (lastEffects.length === 0 && prevCount > 0) {
            prevEffectCountRef.current = 0;
        } else if (lastEffects.length > prevCount && floatContainer) {
            const newEffects = lastEffects.slice(prevCount);
            prevEffectCountRef.current = lastEffects.length;

            for (const effect of newEffects) {
                const effectFontSize = Math.max(24, cellHeight * 0.22) * fs;
                const baseX = startX + gridOffsetX + effect.x * (cellWidth + colGap) + cellWidth / 2;
                const baseY = startY + gridOffsetY + effect.y * (cellHeight + rowGap) + 8 * scale;

                const lines: { text: string; color: string }[] = [];
                if (effect.food !== 0) {
                    lines.push({
                        text: `${effect.food > 0 ? '+' : ''}${effect.food}`,
                        color: effect.food > 0 ? '#4ade80' : '#ef4444',
                    });
                }
                if (effect.gold !== 0) {
                    lines.push({
                        text: `${effect.gold > 0 ? '+' : ''}${effect.gold}`,
                        color: effect.gold > 0 ? '#fbbf24' : '#ef4444',
                    });
                }
                if (effect.knowledge !== 0) {
                    lines.push({
                        text: `${effect.knowledge > 0 ? '+' : ''}${effect.knowledge}`,
                        color: effect.knowledge > 0 ? '#60a5fa' : '#ef4444',
                    });
                }

                // 가로 배치: 각 텍스트를 먼저 생성해서 width 측정 후 중앙 정렬
                const gap = 6 * scale;
                const floatTexts: PIXI.Text[] = [];
                const tempTexts: PIXI.Text[] = [];
                for (const line of lines) {
                    const txt = new PIXI.Text({
                        text: line.text,
                        style: new PIXI.TextStyle({
                            fill: line.color,
                            fontSize: effectFontSize,
                            fontWeight: 'normal',
                            fontFamily,
                            stroke: { color: '#000000', width: 3 },
                        }),
                    });
                    txt.anchor.set(0, 0);
                    tempTexts.push(txt);
                }
                const totalW = tempTexts.reduce((sum, t) => sum + t.width, 0) + gap * (tempTexts.length - 1);
                let curX = baseX - totalW / 2;
                for (const txt of tempTexts) {
                    txt.x = curX;
                    (txt as unknown as { _baseOffsetY: number })._baseOffsetY = 0;
                    txt.y = baseY;
                    floatContainer.addChild(txt);
                    floatTexts.push(txt);
                    curX += txt.width + gap;
                }

                if (floatTexts.length > 0) {
                    floatingEffectsRef.current.push({
                        texts: floatTexts,
                        startY: baseY,
                        elapsed: 0,
                    });
                }
            }
        }

        // Bottom-center: Resource stats
        const foodLabel = t('game.food', lang);
        const goldLabel = t('game.gold', lang);
        const eraName = t(ERA_NAME_KEYS[state.era] ?? 'era.ancient', lang);
        const eraLabel = t('game.era', lang);
        const statsFontSize = 30 * fs;
        const statsBottomY = h - 20 * scale - statsFontSize;

        const statsStr = state.era >= 5
            ? `${foodLabel}: ${state.food}  ${goldLabel}: ${state.gold}  ${eraName} ${eraLabel}`
            : `${foodLabel}: ${state.food}  ${goldLabel}: ${state.gold}  ${eraName} ${eraLabel}  ${t('game.knowledge', lang)}: ${state.knowledge}/${[50, 100, 175, 275][state.era - 1]}`;
        const bottomStats = new PIXI.Text({
            text: statsStr,
            style: new PIXI.TextStyle({
                fill: '#ffffff',
                fontSize: statsFontSize,
                fontWeight: 'normal',
                fontFamily,
                stroke: { color: '#000000', width: 2 },
            }),
        });
        bottomStats.anchor.set(0.5, 0);
        bottomStats.x = w / 2;
        bottomStats.y = statsBottomY;
        bgContainer.addChild(bottomStats);

        // 합산 텍스트 (하단 스탯 바로 위에 running totals)
        const rt = state.runningTotals;
        const totalsFontSize = 26 * fs;
        const totalsY = statsBottomY - totalsFontSize - 6 * scale;

        // 기존 합산 텍스트 제거
        const rtTexts = runningTotalTextsRef.current;
        if (rtTexts.food) { rtTexts.food.parent?.removeChild(rtTexts.food); rtTexts.food.destroy(); rtTexts.food = null; }
        if (rtTexts.gold) { rtTexts.gold.parent?.removeChild(rtTexts.gold); rtTexts.gold.destroy(); rtTexts.gold = null; }
        if (rtTexts.knowledge) { rtTexts.knowledge.parent?.removeChild(rtTexts.knowledge); rtTexts.knowledge.destroy(); rtTexts.knowledge = null; }

        if (state.phase === 'processing' && (rt.food !== 0 || rt.gold !== 0 || rt.knowledge !== 0)) {
            const parts: { text: string; color: string }[] = [];
            if (rt.food !== 0) parts.push({ text: `${rt.food > 0 ? '+' : ''}${rt.food}`, color: rt.food > 0 ? '#4ade80' : '#ef4444' });
            if (rt.gold !== 0) parts.push({ text: `${rt.gold > 0 ? '+' : ''}${rt.gold}`, color: rt.gold > 0 ? '#fbbf24' : '#ef4444' });
            if (rt.knowledge !== 0) parts.push({ text: `${rt.knowledge > 0 ? '+' : ''}${rt.knowledge}`, color: rt.knowledge > 0 ? '#60a5fa' : '#ef4444' });

            const totalWidth = parts.reduce((sum, p) => sum + p.text.length * totalsFontSize * 0.55, 0) + (parts.length - 1) * 16;
            let curX = w / 2 - totalWidth / 2;

            for (const p of parts) {
                const txt = new PIXI.Text({
                    text: p.text,
                    style: new PIXI.TextStyle({
                        fill: p.color,
                        fontSize: totalsFontSize,
                        fontWeight: 'normal',
                        fontFamily,
                        stroke: { color: '#000000', width: 2 },
                    }),
                });
                txt.anchor.set(0, 0);
                txt.x = curX;
                txt.y = totalsY;
                effectsContainer.addChild(txt);

                if (p.color === '#4ade80') rtTexts.food = txt;
                else if (p.color === '#fbbf24') rtTexts.gold = txt;
                else rtTexts.knowledge = txt;

                curX += txt.width + 16;
            }
        }
    };

    // Subscribe to store changes (game + settings)
    useEffect(() => {
        const unsub1 = useGameStore.subscribe(() => renderBoard());
        const unsub2 = useSettingsStore.subscribe(() => renderBoard());
        return () => { unsub1(); unsub2(); };
    }, []);

    // Calculate tooltip position, clamping to stay within viewport
    const getTooltipStyle = (): React.CSSProperties => {
        if (!hoveredSymbol) return { display: 'none' };
        const tooltipW = 280;
        const tooltipH = 180;
        const margin = 12;
        let left = hoveredSymbol.screenX + margin;
        let top = hoveredSymbol.screenY;

        // Clamp right edge
        if (left + tooltipW > 1920) {
            left = hoveredSymbol.screenX - tooltipW - margin;
        }
        // Clamp bottom edge
        if (top + tooltipH > 1080) {
            top = 1080 - tooltipH - margin;
        }
        if (top < 0) top = 0;

        return {
            left: `${left}px`,
            top: `${top}px`,
        };
    };

    return (
        <div
            ref={canvasRef}
            style={{ width: '100%', height: '100%', position: 'relative' }}
        >
            {hoveredSymbol && (
                <div className="symbol-tooltip" style={getTooltipStyle()}>
                    <div className="symbol-tooltip-name">{t(`symbol.${hoveredSymbol.definition.id}.name`, language)}</div>
                    <div
                        className="symbol-tooltip-rarity"
                        style={{ color: getSymbolColorHex(hoveredSymbol.definition.era) }}
                    >
                        ── {t(ERA_NAME_KEYS[hoveredSymbol.definition.era] ?? 'era.ancient', language)} ──
                    </div>
                    <div className="symbol-tooltip-desc">
                        {t(`symbol.${hoveredSymbol.definition.id}.desc`, language).split('\n').map((line, i) => (
                            <div key={i} className="symbol-tooltip-desc-line">{line}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameCanvas;
