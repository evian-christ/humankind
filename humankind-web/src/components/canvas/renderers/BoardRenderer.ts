import * as PIXI from 'pixi.js';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../game/state/gameStore';
import type { GameState } from '../../../game/state/gameStore';
import type { SettingsState } from '../../../game/state/settingsStore';
import { computeBoardPixelLayout } from '../../../game/layout/boardPixelLayout';
import type { CellLayout } from '../types';
import { getGameFontFamily } from './rendererShared';

export interface BoardRenderFrame {
    width: number;
    height: number;
    startX: number;
    startY: number;
    boardW: number;
    boardH: number;
    cellWidth: number;
    cellHeight: number;
    gridOffsetX: number;
    gridOffsetY: number;
    colGap: number;
    rowGap: number;
    scale: number;
    viewScale: number;
    fontFamily: string;
}

export class BoardRenderer {
    private bgContainer: PIXI.Container;
    private boardContainer: PIXI.Container;
    private slotAuraGraphics: PIXI.Graphics | null = null;
    private destroyAuraGraphics: Array<{ graphics: PIXI.Graphics; targetAlpha: number; delayMs: number }> = [];
    private destroyAuraElapsedMs = 0;
    private isDestroyAuraActive = false;
    private slotAuraElapsedMs = 0;

    constructor(args: {
        bgContainer: PIXI.Container;
        boardContainer: PIXI.Container;
    }) {
        this.bgContainer = args.bgContainer;
        this.boardContainer = args.boardContainer;
    }

    public beginFrame(app: PIXI.Application, state: GameState, settings: SettingsState): BoardRenderFrame | null {
        if (!app.renderer) return null;

        const width = app.screen?.width || 1920;
        const height = app.screen?.height || 1080;
        const viewLayout = computeBoardPixelLayout(width, height);
        const frame: BoardRenderFrame = {
            width,
            height,
            startX: viewLayout.startX,
            startY: viewLayout.startY,
            boardW: viewLayout.boardW,
            boardH: viewLayout.boardH,
            cellWidth: viewLayout.cellWidth,
            cellHeight: viewLayout.cellHeight,
            gridOffsetX: viewLayout.gridOffsetX,
            gridOffsetY: viewLayout.gridOffsetY,
            colGap: viewLayout.colGap,
            rowGap: 0,
            scale: viewLayout.scale,
            viewScale: viewLayout.viewScale,
            fontFamily: getGameFontFamily(settings.language),
        };

        this.renderBackground(frame);
        this.renderBoardAura(frame, state);
        this.renderSlotCells(frame);
        this.renderSlotNumbers(frame);
        return frame;
    }

    public toCellLayout(frame: BoardRenderFrame): CellLayout {
        return {
            startX: frame.startX,
            startY: frame.startY,
            boardW: frame.boardW,
            cellWidth: frame.cellWidth,
            cellHeight: frame.cellHeight,
            gridOffsetX: frame.gridOffsetX,
            gridOffsetY: frame.gridOffsetY,
            colGap: frame.colGap,
        };
    }

    public tick(deltaMs: number) {
        this.slotAuraElapsedMs = (this.slotAuraElapsedMs + deltaMs) % 4000;
        if (!this.slotAuraGraphics) return;

        const breath = (1 - Math.cos((this.slotAuraElapsedMs / 4000) * Math.PI * 2)) / 2;
        const scale = 0.985 + breath * 0.035;
        this.slotAuraGraphics.scale.set(scale);
        this.slotAuraGraphics.alpha = 0.88 + breath * 0.12;

        this.destroyAuraElapsedMs = this.isDestroyAuraActive
            ? Math.min(this.destroyAuraElapsedMs + deltaMs, 1400)
            : Math.max(this.destroyAuraElapsedMs - deltaMs * 2.6, 0);
        const easeOut = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
        for (const band of this.destroyAuraGraphics) {
            const progress = easeOut((this.destroyAuraElapsedMs - band.delayMs) / 620);
            band.graphics.alpha = progress * band.targetAlpha;
            band.graphics.scale.set(scale);
        }
    }

    private renderBackground(frame: BoardRenderFrame) {
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, frame.width, frame.height);
        bg.fill({ color: 0x242424 });
        this.bgContainer.addChild(bg);
    }

    private renderBoardAura(frame: BoardRenderFrame, state: GameState) {
        const auraGraphics = new PIXI.Graphics();
        const boardX = frame.startX + frame.gridOffsetX;
        const boardY = frame.startY + frame.gridOffsetY;
        const boardWidth = BOARD_WIDTH * frame.cellWidth + (BOARD_WIDTH - 1) * frame.colGap;
        const boardHeight = BOARD_HEIGHT * frame.cellHeight + (BOARD_HEIGHT - 1) * frame.rowGap;
        const isDestroyPick = state.phase === 'oblivion_furnace_board';
        const wasDestroyAuraActive = this.isDestroyAuraActive;
        if (isDestroyPick && !wasDestroyAuraActive && this.destroyAuraElapsedMs <= 0) {
            this.destroyAuraElapsedMs = 0;
        }
        this.isDestroyAuraActive = isDestroyPick;
        this.destroyAuraGraphics = [];
        const auraBands = [
            { spread: 104 * frame.scale, alpha: 0.035, color: 0x000000 },
            { spread: 84 * frame.scale, alpha: 0.055, color: 0x000000 },
            { spread: 66 * frame.scale, alpha: 0.085, color: 0x000000 },
            { spread: 50 * frame.scale, alpha: 0.13, color: 0x000000 },
            { spread: 36 * frame.scale, alpha: 0.2, color: 0x000000 },
            { spread: 24 * frame.scale, alpha: 0.3, color: 0x000000 },
            { spread: 14 * frame.scale, alpha: 0.46, color: 0x000000 },
            { spread: 7 * frame.scale, alpha: 0.58, color: 0x000000 },
        ];
        const destroyAuraBands = auraBands.map((band, index) => ({
            ...band,
            color: index >= auraBands.length - 2 ? 0x220404 : index >= auraBands.length - 5 ? 0x7f1d1d : 0xb91c1c,
            delayMs: (auraBands.length - 1 - index) * 70,
        }));

        const drawAuraBand = (graphics: PIXI.Graphics, spread: number, color: number, alpha: number) => {
            graphics
                .roundRect(
                    boardX - spread,
                    boardY - spread,
                    boardWidth + spread * 2,
                    boardHeight + spread * 2,
                    spread,
                )
                .fill({ color, alpha })
                .rect(boardX, boardY, boardWidth, boardHeight)
                .cut()
                .beginPath();
        };

        for (const { spread, alpha, color } of auraBands) {
            drawAuraBand(auraGraphics, spread, color, alpha);
        }
        type BlurFilterCtor = new (strength: number) => PIXI.Filter;
        const BlurFilterCtor = (PIXI as unknown as { BlurFilter?: BlurFilterCtor }).BlurFilter;
        const auraBlur = Math.max(10, 18 * frame.scale);
        if (BlurFilterCtor) {
            auraGraphics.filters = [new BlurFilterCtor(auraBlur)];
        }

        const auraCenterX = boardX + boardWidth / 2;
        const auraCenterY = boardY + boardHeight / 2;
        auraGraphics.pivot.set(auraCenterX, auraCenterY);
        auraGraphics.position.set(auraCenterX, auraCenterY);
        this.slotAuraGraphics = auraGraphics;
        this.boardContainer.addChild(auraGraphics);

        if (isDestroyPick || this.destroyAuraElapsedMs > 0) {
            for (const { spread, alpha, color, delayMs } of destroyAuraBands) {
                const redBand = new PIXI.Graphics();
                drawAuraBand(redBand, spread, color, 1);
                redBand.pivot.set(auraCenterX, auraCenterY);
                redBand.position.set(auraCenterX, auraCenterY);
                redBand.alpha = 0;
                if (BlurFilterCtor) {
                    redBand.filters = [new BlurFilterCtor(auraBlur)];
                }
                this.destroyAuraGraphics.push({ graphics: redBand, targetAlpha: alpha, delayMs });
                this.boardContainer.addChild(redBand);
            }
        }
        this.tick(0);
    }

    private renderSlotCells(frame: BoardRenderFrame) {
        const cellGraphics = new PIXI.Graphics();
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cellX = frame.startX + frame.gridOffsetX + x * (frame.cellWidth + frame.colGap);
                const cellY = frame.startY + frame.gridOffsetY + y * (frame.cellHeight + frame.rowGap);
                cellGraphics.rect(cellX, cellY, frame.cellWidth, frame.cellHeight);
                cellGraphics.fill({ color: 0xffffff });
            }
        }
        this.boardContainer.addChild(cellGraphics);
    }

    private renderSlotNumbers(frame: BoardRenderFrame) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cellX = frame.startX + frame.gridOffsetX + x * (frame.cellWidth + frame.colGap);
                const cellY = frame.startY + frame.gridOffsetY + y * (frame.cellHeight + frame.rowGap);
                const slotNum = y * BOARD_WIDTH + x + 1;
                const text = new PIXI.Text({
                    text: slotNum.toString(),
                    style: new PIXI.TextStyle({
                        fontFamily: frame.fontFamily,
                        fontSize: 64 * frame.scale,
                        fill: 0xe0e0e0,
                        fontWeight: 'bold',
                    }),
                });
                text.anchor.set(0.5);
                text.x = cellX + frame.cellWidth / 2;
                text.y = cellY + frame.cellHeight / 2;
                this.boardContainer.addChild(text);
            }
        }
    }
}
