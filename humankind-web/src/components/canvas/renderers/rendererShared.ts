import * as PIXI from 'pixi.js';
import type { Language } from '../../../game/state/settingsStore';
import { S, SymbolType } from '../../../game/data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../../../game/types';

export const ASSET_BASE_URL = import.meta.env.BASE_URL;

export const GAME_CURSOR_POINTER = `url('${ASSET_BASE_URL}assets/ui/cursor.png?v=2') 0 0, pointer`;
export const GAME_CURSOR_HELP = `url('${ASSET_BASE_URL}assets/ui/cursor.png?v=2') 0 0, help`;
export const DEFAULT_GAME_FONT_FAMILY = 'Mulmaru';
export const ZH_GAME_FONT_FAMILY = 'ZLabsPixel CN';
const DYNAMIC_CHILD_DESTROY_OPTIONS: Parameters<PIXI.Container['destroy']>[0] = {
    children: true,
    context: true,
    style: true,
};

export function getGameFontFamily(language: Language): string {
    return language === 'zh' ? ZH_GAME_FONT_FAMILY : DEFAULT_GAME_FONT_FAMILY;
}

export function destroyPixiChild(child: PIXI.Container) {
    child.destroy(DYNAMIC_CHILD_DESTROY_OPTIONS);
}

export function clearPixiContainer(container: PIXI.Container) {
    const children = container.removeChildren();
    for (const child of children) {
        destroyPixiChild(child);
    }
}

const SYMBOL_SPRITE_CELL_RATIO = 96 / (163.2 * 0.8);

export function getBoardSymbolSpriteSize(cellWidth: number, cellHeight: number): number {
    return Math.min(cellWidth, cellHeight) * SYMBOL_SPRITE_CELL_RATIO;
}

export const CLICKABLE_RELIC_IDS = new Set([4, 13, 15, 19, 24, 37, 39, 40]);

export function boardHasAdjacentPlains(board: (PlayerSymbolInstance | null)[][], x: number, y: number): boolean {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (
                nx < 0 ||
                nx >= board.length ||
                ny < 0 ||
                ny >= (board[nx]?.length ?? 0) ||
                !Object.prototype.hasOwnProperty.call(board[nx], ny)
            ) continue;
            if (board[nx][ny]?.definition.id === S.plains) return true;
        }
    }
    return false;
}

export function boardHasDestroyableAdjacentSymbol(board: (PlayerSymbolInstance | null)[][], x: number, y: number): boolean {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (
                nx < 0 ||
                nx >= board.length ||
                ny < 0 ||
                ny >= (board[nx]?.length ?? 0) ||
                !Object.prototype.hasOwnProperty.call(board[nx], ny)
            ) continue;
            const candidate = board[nx][ny];
            if (
                candidate &&
                !candidate.is_marked_for_destruction &&
                candidate.definition.type !== SymbolType.ENEMY &&
                candidate.definition.type !== SymbolType.DISASTER
            ) return true;
        }
    }
    return false;
}

export function isOpenableLoot(symbolId: number): boolean {
    return symbolId === S.loot || symbolId === S.greater_loot || symbolId === S.radiant_loot;
}
