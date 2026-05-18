import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../game/state/gameStore';
import { S, SymbolType } from '../../../game/data/symbolDefinitions';
import { isMeleeUnit, isRangedUnit } from '../../../game/data/unitUpgrades';
import { MILITARY_SCIENCE_UPGRADE_ID, TRACKING_UPGRADE_ID } from '../../../game/data/knowledgeUpgrades';
import type { PlayerSymbolInstance } from '../../../game/types';

export const ASSET_BASE_URL = import.meta.env.BASE_URL;

export const GAME_CURSOR_POINTER = `url('${ASSET_BASE_URL}assets/ui/cursor.png?v=2') 0 0, pointer`;
export const GAME_CURSOR_HELP = `url('${ASSET_BASE_URL}assets/ui/cursor.png?v=2') 0 0, help`;

export const CLICKABLE_RELIC_IDS = new Set([4, 13, 15, 19, 24, 37]);

export function boardHasAdjacentPlains(board: (PlayerSymbolInstance | null)[][], x: number, y: number): boolean {
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

export function boardHasTrainableAdjacentMelee(
    board: (PlayerSymbolInstance | null)[][],
    x: number,
    y: number,
    unlockedKnowledgeUpgrades: readonly number[],
): boolean {
    const trainedCavalryId = unlockedKnowledgeUpgrades.includes(MILITARY_SCIENCE_UPGRADE_ID)
        ? S.cavalry_corps
        : S.cavalry;

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= BOARD_WIDTH || ny < 0 || ny >= BOARD_HEIGHT) continue;
            const candidate = board[nx][ny];
            if (candidate && !candidate.is_marked_for_destruction && isMeleeUnit(candidate.definition) && candidate.definition.id !== trainedCavalryId) {
                return true;
            }
        }
    }
    return false;
}

export function boardHasTrainableAdjacentRanged(
    board: (PlayerSymbolInstance | null)[][],
    x: number,
    y: number,
    unlockedKnowledgeUpgrades: readonly number[],
): boolean {
    if (!unlockedKnowledgeUpgrades.includes(TRACKING_UPGRADE_ID)) return false;

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= BOARD_WIDTH || ny < 0 || ny >= BOARD_HEIGHT) continue;
            const candidate = board[nx][ny];
            if (candidate && !candidate.is_marked_for_destruction && isRangedUnit(candidate.definition) && candidate.definition.id !== S.tracker_archer) {
                return true;
            }
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
            if (nx < 0 || nx >= BOARD_WIDTH || ny < 0 || ny >= BOARD_HEIGHT) continue;
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
