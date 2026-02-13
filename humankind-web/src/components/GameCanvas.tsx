import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useGameStore, BOARD_WIDTH, BOARD_HEIGHT } from '../game/state/gameStore';
import { getSymbolColor } from '../game/data/symbolDefinitions';

const GameCanvas = () => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const boardContainerRef = useRef<PIXI.Container | null>(null);
    const effectsContainerRef = useRef<PIXI.Container | null>(null);
    const bgContainerRef = useRef<PIXI.Container | null>(null);

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
                    ...symbolPaths
                ]);
            } catch (error) {
                console.warn("Some assets failed to load, proceeding anyway:", error);
            }

            if (destroyed) return;

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
        const bgContainer = bgContainerRef.current;
        if (!app || !boardContainer || !effectsContainer || !bgContainer) return;

        const state = useGameStore.getState();
        const { board, lastEffects } = state;

        boardContainer.removeChildren();
        effectsContainer.removeChildren();
        bgContainer.removeChildren();

        const w = app.screen.width;
        const h = app.screen.height;

        // Background (Simple dark gray)
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, w, h);
        bg.fill({ color: 0x1a1a1a });
        bgContainer.addChild(bg);

        // Calculate cell sizing (Fixed frame based on cellSize)
        const gapRatio = 0.06; // Reduce gap ratio to 6%
        const maxCellW = (w * 0.85) / (BOARD_WIDTH + (BOARD_WIDTH - 1) * gapRatio);
        const maxCellH = (h * 0.88) / BOARD_HEIGHT;
        const cellSize = Math.min(maxCellW, maxCellH);

        // Fix board dimensions based on standard scale
        const boardW = (cellSize * BOARD_WIDTH) + (cellSize * gapRatio * (BOARD_WIDTH - 1));
        const boardH = cellSize * BOARD_HEIGHT;

        // Adjust internal slot width: Set to 102%, gap will adjust to fit fixed boardW
        const cellWidth = cellSize * 1.02;
        const colGap = (boardW - (cellWidth * BOARD_WIDTH)) / (BOARD_WIDTH - 1);
        const cellHeight = cellSize * 0.98;

        const totalGridH = cellHeight * BOARD_HEIGHT;
        const gridOffsetY = (boardH - totalGridH) / 2; // Extra padding to center if needed

        const startX = (w - boardW) / 2;
        const startY = (h - boardH) / 2;

        // Draw board background (single sprite for entire board)
        const boardBg = PIXI.Sprite.from('/assets/sprites/slot_bg.png');

        // Adjust these values to match the border thickness in your slot_bg.png
        const spritePaddingX = cellSize * 0.05;
        const spritePaddingY = cellSize * 0.05;

        boardBg.x = startX - spritePaddingX;
        boardBg.y = startY - spritePaddingY;
        boardBg.width = boardW + (spritePaddingX * 2);
        boardBg.height = boardH + (spritePaddingY * 2);
        boardContainer.addChild(boardBg);

        // Draw symbols
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const symbol = board[x][y];
                if (!symbol) continue;

                const cellX = startX + x * (cellWidth + colGap);
                const cellY = startY + gridOffsetY + y * cellHeight;
                const gap = 3;
                const innerW = cellWidth - gap * 2;
                const innerH = cellHeight;
                const rarityColor = getSymbolColor(symbol.definition.rarity);

                // Sprite
                const spritePath = `/assets/sprites/${symbol.definition.sprite}`;
                const spriteSize = Math.min(innerW, innerH) * 0.7; // 70% of slot size
                const sprite = PIXI.Sprite.from(spritePath);
                sprite.x = cellX + cellWidth / 2;
                sprite.y = cellY + cellHeight / 2; // Dead center
                sprite.anchor.set(0.5);
                sprite.width = spriteSize;
                sprite.height = spriteSize;
                boardContainer.addChild(sprite);

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
            effectText.y = startY + gridOffsetY + effect.y * cellHeight + 12;
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

    return (
        <div
            ref={canvasRef}
            style={{ width: '100%', height: '100%' }}
        />
    );
};

export default GameCanvas;
