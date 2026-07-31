import * as PIXI from 'pixi.js';
import type { GameState } from '../../../game/state/gameStore';
import { isBoardSlotActive } from '../../../game/state/gameStoreHelpers';
import type { SettingsState } from '../../../game/state/settingsStore';
import { computeBoardPixelLayout } from '../../../game/layout/boardPixelLayout';
import type { CellLayout } from '../types';
import { getGameFontFamily } from './rendererShared';

/** DOS 스타일 플랫 팔레트 — 단색 배경 + 단선 프레임 */
const BACKGROUND_COLOR = 0x000000;
const SLOT_FACE_COLOR = 0xffffff;
const SLOT_NUMBER_COLOR = 0x000000;
const SLOT_NUMBER_ALPHA = 0.18;

/** 프레임 규격 — 슬롯 가장자리에서 바깥으로 CLEARANCE만큼 나간 실루엣에 단선 테두리 */
export const BOARD_FRAME_CLEARANCE = 10;
const FRAME_LINE_WIDTH = 2;
const FRAME_LINE_COLOR = 0x606060;
const FRAME_FILL_COLOR = 0x000000;

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
    boardWidth: number;
    boardHeight: number;
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

    public beginFrame(
        app: PIXI.Application,
        state: GameState,
        settings: SettingsState,
        zoom: number,
    ): BoardRenderFrame | null {
        if (!app.renderer) return null;

        const width = app.screen?.width || 1920;
        const height = app.screen?.height || 1080;
        const boardWidth = state.board.length;
        const boardHeight = Math.max(0, ...state.board.map((col) => col.length));
        const viewLayout = computeBoardPixelLayout(width, height, boardWidth, boardHeight, zoom);
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
            boardWidth,
            boardHeight,
        };

        this.renderBackground(frame);
        this.renderBoardAura(frame, state);
        this.renderBoardFrame(frame, state);
        this.renderSlotCells(frame, state);
        this.renderSlotNumbers(frame, state);
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
            scale: frame.scale,
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
        bg.fill({ color: BACKGROUND_COLOR });
        this.bgContainer.addChild(bg);
    }

    /**
     * 활성 슬롯 실루엣에 딱 맞게 두르는 단선 프레임.
     * 셀 사각형들을 d만큼 부풀린 합집합을 겹쳐 그려서,
     * 보드가 계단형·비정형으로 확장돼도 테두리가 모양을 그대로 따라간다.
     */
    private renderBoardFrame(frame: BoardRenderFrame, state: GameState) {
        const boardX = frame.startX + frame.gridOffsetX;
        const boardY = frame.startY + frame.gridOffsetY;
        const stepX = frame.cellWidth + frame.colGap;
        const stepY = frame.cellHeight + frame.rowGap;
        const w = frame.cellWidth;
        const h = frame.cellHeight;
        const cells: Array<{ gx: number; gy: number; l: number; t: number }> = [];
        for (let y = 0; y < frame.boardHeight; y++) {
            for (let x = 0; x < frame.boardWidth; x++) {
                if (!isBoardSlotActive(state.board, x, y)) continue;
                cells.push({ gx: x, gy: y, l: boardX + x * stepX, t: boardY + y * stepY });
            }
        }
        if (cells.length === 0) return;

        // 셀 사각형들을 d만큼 부풀려 합집합으로 채운다.
        // (그리드 인접 셀 사이 틈은 d*2가 틈 폭보다 크면 자연스럽게 메워진다)
        const fillExpanded = (g: PIXI.Graphics, d: number, color: number, alpha = 1, dx = 0, dy = 0) => {
            for (const c of cells) {
                g.rect(c.l - d + dx, c.t - d + dy, w + d * 2, h + d * 2);
            }
            g.fill({ color, alpha });
        };

        // 플랫 프레임: 실루엣 단선 테두리 + 안쪽 단색 채움
        const g = new PIXI.Graphics();
        fillExpanded(g, BOARD_FRAME_CLEARANCE, FRAME_LINE_COLOR);
        fillExpanded(g, BOARD_FRAME_CLEARANCE - FRAME_LINE_WIDTH, FRAME_FILL_COLOR);
        this.boardContainer.addChild(g);
    }

    private renderBoardAura(frame: BoardRenderFrame, state: GameState) {
        const auraGraphics = new PIXI.Graphics();
        const boardX = frame.startX + frame.gridOffsetX;
        const boardY = frame.startY + frame.gridOffsetY;
        const activeSlots: Array<{ x: number; y: number }> = [];
        for (let y = 0; y < frame.boardHeight; y++) {
            for (let x = 0; x < frame.boardWidth; x++) {
                if (isBoardSlotActive(state.board, x, y)) activeSlots.push({ x, y });
            }
        }
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
            const bridgeX = frame.colGap / 2;
            const bridgeY = frame.rowGap / 2;
            for (const { x, y } of activeSlots) {
                const cellX = boardX + x * (frame.cellWidth + frame.colGap);
                const cellY = boardY + y * (frame.cellHeight + frame.rowGap);
                graphics.roundRect(
                    cellX - spread - bridgeX,
                    cellY - spread - bridgeY,
                    frame.cellWidth + spread * 2 + bridgeX * 2,
                    frame.cellHeight + spread * 2 + bridgeY * 2,
                    spread,
                );
            }
            graphics.fill({ color, alpha });
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

        const auraBounds = auraGraphics.getLocalBounds();
        const auraCenterX = auraBounds.x + auraBounds.width / 2;
        const auraCenterY = auraBounds.y + auraBounds.height / 2;
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

    private renderSlotCells(frame: BoardRenderFrame, state: GameState) {
        // 플랫 단색 릴 창. 세로로 이어진 활성 칸은 경계 없이 하나의 릴 창으로 그린다.
        const windows: Array<{ x: number; y: number; w: number; h: number }> = [];
        for (let x = 0; x < frame.boardWidth; x++) {
            let runStart = -1;
            for (let y = 0; y <= frame.boardHeight; y++) {
                const active = y < frame.boardHeight && isBoardSlotActive(state.board, x, y);
                if (active && runStart < 0) runStart = y;
                if (active || runStart < 0) continue;
                const runRows = y - runStart;
                windows.push({
                    x: frame.startX + frame.gridOffsetX + x * (frame.cellWidth + frame.colGap),
                    y: frame.startY + frame.gridOffsetY + runStart * (frame.cellHeight + frame.rowGap),
                    w: frame.cellWidth,
                    h: runRows * frame.cellHeight + (runRows - 1) * frame.rowGap,
                });
                runStart = -1;
            }
        }
        if (windows.length === 0) return;

        const faces = new PIXI.Graphics();
        for (const win of windows) {
            faces.rect(win.x, win.y, win.w, win.h);
        }
        faces.fill({ color: SLOT_FACE_COLOR });
        this.boardContainer.addChild(faces);
    }

    private renderSlotNumbers(frame: BoardRenderFrame, state: GameState) {
        let slotNum = 0;
        for (let y = 0; y < frame.boardHeight; y++) {
            for (let x = 0; x < frame.boardWidth; x++) {
                if (!isBoardSlotActive(state.board, x, y)) continue;
                slotNum += 1;
                const cellX = frame.startX + frame.gridOffsetX + x * (frame.cellWidth + frame.colGap);
                const cellY = frame.startY + frame.gridOffsetY + y * (frame.cellHeight + frame.rowGap);
                const centerX = cellX + frame.cellWidth / 2;
                const centerY = cellY + frame.cellHeight / 2;
                const makeNumberText = (fill: number) =>
                    new PIXI.Text({
                        text: slotNum.toString(),
                        style: new PIXI.TextStyle({
                            fontFamily: frame.fontFamily,
                            fontSize: 64 * frame.scale,
                            fill,
                            fontWeight: 'bold',
                        }),
                    });
                const numberText = makeNumberText(SLOT_NUMBER_COLOR);
                numberText.alpha = SLOT_NUMBER_ALPHA;
                numberText.anchor.set(0.5);
                numberText.x = centerX;
                numberText.y = centerY;
                this.boardContainer.addChild(numberText);
            }
        }
    }
}
