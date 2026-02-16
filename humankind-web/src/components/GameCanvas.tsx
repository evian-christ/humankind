import { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { useGameStore, BOARD_WIDTH, BOARD_HEIGHT } from '../game/state/gameStore';
import { getSymbolColor, getSymbolColorHex, Rarity, type SymbolDefinition } from '../game/data/symbolDefinitions';

interface HoveredSymbol {
    definition: SymbolDefinition;
    screenX: number;
    screenY: number;
}

const RARITY_NAMES: Record<Rarity, string> = {
    [Rarity.ANCIENT]: 'Ancient',
    [Rarity.CLASSICAL]: 'Classical',
    [Rarity.MEDIEVAL]: 'Medieval',
    [Rarity.INDUSTRIAL]: 'Industrial',
    [Rarity.MODERN]: 'Modern',
};

const GameCanvas = () => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const boardContainerRef = useRef<PIXI.Container | null>(null);
    const effectsContainerRef = useRef<PIXI.Container | null>(null);
    const hitContainerRef = useRef<PIXI.Container | null>(null);
    const bgContainerRef = useRef<PIXI.Container | null>(null);
    const [hoveredSymbol, setHoveredSymbol] = useState<HoveredSymbol | null>(null);
    const hoveredSymbolRef = useRef<HoveredSymbol | null>(null);
    const setHoveredSymbolStable = useCallback((val: HoveredSymbol | null) => {
        hoveredSymbolRef.current = val;
        setHoveredSymbol(val);
    }, []);

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
                // Register and load custom font
                PIXI.Assets.add({ alias: 'MiniPixel', src: '/mini_pixel-7.ttf' });

                const symbolPaths = Array.from({ length: 30 }, (_, i) => `/assets/sprites/${String(i + 1).padStart(3, '0')}.png`);
                await PIXI.Assets.load([
                    'MiniPixel',
                    '/assets/sprites/slot_bg.png',
                    '/assets/ui/stonebar_1880x80.png',
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

            // Effects layer (floating text)
            const effectsContainer = new PIXI.Container();
            app.stage.addChild(effectsContainer);
            effectsContainerRef.current = effectsContainer;

            // Hit area layer (topmost, for hover detection)
            const hitContainer = new PIXI.Container();
            hitContainer.eventMode = 'static';
            app.stage.addChild(hitContainer);
            hitContainerRef.current = hitContainer;

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

        // UI Bar (1880x80 at base resolution)
        const BASE_UI_BAR_W = 1900;
        const BASE_UI_BAR_H = 80;
        const uiBarW = BASE_UI_BAR_W * scale;
        const uiBarH = BASE_UI_BAR_H * scale;
        const uiBarX = (w - uiBarW) / 2;

        // Top UI Bar (Resources display)
        const uiBarMarginTop = 10 * scale;
        const topBar = PIXI.Sprite.from('/assets/ui/stonebar_1880x80.png');
        topBar.x = uiBarX;
        topBar.y = uiBarMarginTop;
        topBar.width = uiBarW;
        topBar.height = uiBarH;
        bgContainer.addChild(topBar);

        // Top Bar Resources Text
        const topBarText = new PIXI.Text({
            text: `Turn: ${state.turn}  Food: ${state.food}  Gold: ${state.gold}  Level: ${state.level}  EXP: ${state.exp}/${50 + (state.level - 1) * 25}`,
            style: new PIXI.TextStyle({
                fill: '#ffffff',
                fontSize: 48,
                fontWeight: 'normal',
                fontFamily: 'MiniPixel',
                stroke: { color: '#000000', width: 2 },
            }),
        });
        topBarText.anchor.set(0.5, 0.5);
        topBarText.x = w / 2;
        topBarText.y = uiBarMarginTop + uiBarH / 2;
        bgContainer.addChild(topBarText);

        // Board dimensions at base resolution
        const BOARD_SCALE = 0.9; // Board size ratio
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

        // Center board horizontally, vertically between top bar and bottom panel
        const topEdge = uiBarMarginTop + uiBarH;
        const bottomPanelH = 140 * scale;
        const availableHeight = h - topEdge - bottomPanelH;
        const startX = (w - boardW) / 2;
        const startY = topEdge + (availableHeight - boardH) / 2;

        // Draw board background (single sprite for entire board)
        const boardBg = PIXI.Sprite.from('/assets/sprites/slot_bg.png');

        const spritePaddingX = 8 * scale;
        const spritePaddingY = 8 * scale;

        boardBg.x = startX - spritePaddingX;
        boardBg.y = startY - spritePaddingY;
        boardBg.width = boardW + (spritePaddingX * 2);
        boardBg.height = boardH + (spritePaddingY * 2);
        boardContainer.addChild(boardBg);

        // Draw slot borders and symbols
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const cellX = startX + gridOffsetX + x * (cellWidth + colGap);
                const cellY = startY + gridOffsetY + y * (cellHeight + rowGap);

                // Draw red border for each slot
                const slotBorder = new PIXI.Graphics();
                slotBorder.rect(cellX, cellY, cellWidth, cellHeight);
                slotBorder.stroke({ color: 0xff0000, width: 1 });
                boardContainer.addChild(slotBorder);

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
                const rarityColor = getSymbolColor(symbol.definition.rarity);

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
                    const nameText = new PIXI.Text({
                        text: symbol.definition.name,
                        style: new PIXI.TextStyle({
                            fill: rarityColor,
                            fontSize: 32,
                            fontFamily: 'MiniPixel',
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
                    const badgeY = cellY + 8;

                    const counterText = new PIXI.Text({
                        text: String(symbol.effect_counter),
                        style: new PIXI.TextStyle({
                            fill: '#000000',
                            fontSize: 60, // Massive increase for MiniPixel
                            fontWeight: 'normal',
                            fontFamily: 'MiniPixel',
                        }),
                    });
                    counterText.anchor.set(1, 0); // Top-right anchor
                    counterText.x = badgeX;
                    counterText.y = badgeY;
                    boardContainer.addChild(counterText);
                }
            }
        }

        // Floating effect texts
        lastEffects.forEach((effect) => {
            const effectText = new PIXI.Text({
                text: effect.text,
                style: new PIXI.TextStyle({
                    fill: effect.color,
                    fontSize: Math.max(32, cellHeight * 0.3), // Massive increase for MiniPixel
                    fontWeight: 'normal',
                    fontFamily: 'MiniPixel',
                    stroke: { color: '#000000', width: 3 },
                }),
            });
            effectText.anchor.set(0.5);
            effectText.x = startX + effect.x * (cellWidth + colGap) + cellWidth / 2;
            effectText.y = startY + effect.y * (cellHeight + rowGap) + 12 * scale;
            effectsContainer.addChild(effectText);
        });
    };

    // Subscribe to store changes
    useEffect(() => {
        const unsubscribe = useGameStore.subscribe(() => {
            renderBoard();
        });
        return unsubscribe;
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
                    <div className="symbol-tooltip-name">{hoveredSymbol.definition.name}</div>
                    <div
                        className="symbol-tooltip-rarity"
                        style={{ color: getSymbolColorHex(hoveredSymbol.definition.rarity) }}
                    >
                        ── {RARITY_NAMES[hoveredSymbol.definition.rarity]} ──
                    </div>
                    <div className="symbol-tooltip-desc">
                        {hoveredSymbol.definition.description.split('\n').map((line, i) => (
                            <div key={i} className="symbol-tooltip-desc-line">{line}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameCanvas;
