import * as PIXI from 'pixi.js';
import { BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE, CELL_PADDING } from '../game/types';

export class BoardRenderer {
    private app: PIXI.Application;
    private boardContainer: PIXI.Container;
    private cellContainers: PIXI.Container[][] = [];

    constructor(canvas: HTMLCanvasElement) {
        // Initialize PixiJS application
        this.app = new PIXI.Application();

        // Calculate board dimensions
        const boardWidth = BOARD_WIDTH * (CELL_SIZE + CELL_PADDING) + CELL_PADDING;
        const boardHeight = BOARD_HEIGHT * (CELL_SIZE + CELL_PADDING) + CELL_PADDING;

        this.app.init({
            canvas,
            width: boardWidth,
            height: boardHeight,
            backgroundColor: 0x1a1a1a,
        }).then(() => {
            this.boardContainer = new PIXI.Container();
            this.app.stage.addChild(this.boardContainer);
            this.createBoard();
        });
    }

    private createBoard(): void {
        // Create grid cells
        for (let x = 0; x < BOARD_WIDTH; x++) {
            this.cellContainers[x] = [];
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const cellContainer = new PIXI.Container();

                // Calculate position
                const posX = x * (CELL_SIZE + CELL_PADDING) + CELL_PADDING;
                const posY = y * (CELL_SIZE + CELL_PADDING) + CELL_PADDING;
                cellContainer.position.set(posX, posY);

                // Create cell background
                const bg = new PIXI.Graphics();
                bg.rect(0, 0, CELL_SIZE, CELL_SIZE);
                bg.fill({ color: 0x2a2a2a });
                bg.stroke({ color: 0x444444, width: 2 });

                cellContainer.addChild(bg);
                this.boardContainer.addChild(cellContainer);
                this.cellContainers[x][y] = cellContainer;
            }
        }
    }

    public highlightCell(x: number, y: number, highlight: boolean): void {
        if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) return;

        const cell = this.cellContainers[x][y];
        const bg = cell.children[0] as PIXI.Graphics;

        bg.clear();
        bg.rect(0, 0, CELL_SIZE, CELL_SIZE);
        bg.fill({ color: highlight ? 0x4a4a00 : 0x2a2a2a });
        bg.stroke({ color: highlight ? 0xffff00 : 0x444444, width: highlight ? 4 : 2 });
    }

    public addSymbolSprite(x: number, y: number, texturePath: string): void {
        if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) return;

        const cell = this.cellContainers[x][y];

        // Remove existing sprites (keep background)
        while (cell.children.length > 1) {
            cell.removeChildAt(1);
        }

        // Create text placeholder (will be replaced with actual sprites later)
        const text = new PIXI.Text({
            text: '🌾',
            style: {
                fontSize: 48,
                fill: 0xffffff,
            }
        });
        text.anchor.set(0.5);
        text.position.set(CELL_SIZE / 2, CELL_SIZE / 2);
        cell.addChild(text);
    }

    public clearCell(x: number, y: number): void {
        if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) return;

        const cell = this.cellContainers[x][y];
        while (cell.children.length > 1) {
            cell.removeChildAt(1);
        }
    }

    public destroy(): void {
        this.app.destroy(true, { children: true, texture: true });
    }
}
