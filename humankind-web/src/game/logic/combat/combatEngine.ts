import type { PlayerSymbolInstance } from '../../types';
import { SymbolType, S } from '../../data/symbolDefinitions';

export type BoardGrid = (PlayerSymbolInstance | null)[][];

export function pickRandomLivingEnemy(board: BoardGrid, width: number, height: number): { x: number; y: number } | null {
    const enemyPositions: { x: number; y: number }[] = [];
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const sym = board[x][y];
            if (sym?.definition.type === SymbolType.ENEMY && !sym.is_marked_for_destruction) {
                enemyPositions.push({ x, y });
            }
        }
    }
    if (enemyPositions.length === 0) return null;
    return enemyPositions[Math.floor(Math.random() * enemyPositions.length)]!;
}

export function applyFixedDamageToEnemy(
    board: BoardGrid,
    pos: { x: number; y: number },
    dmg: number,
    getEffectiveMaxHP: (sym: PlayerSymbolInstance) => number
): void {
    const target = board[pos.x][pos.y];
    if (!target || target.is_marked_for_destruction || target.definition.type !== SymbolType.ENEMY) return;
    const maxHP = getEffectiveMaxHP(target);
    const cur = target.enemy_hp ?? maxHP;
    target.enemy_hp = cur - dmg;
    if (target.enemy_hp <= 0) target.is_marked_for_destruction = true;
}

/** 슬롯 인덱스 0..(w*h-1) — (행 y, 열 x) */
export function slotIndex(width: number, px: number, py: number): number {
    return py * width + px;
}

/**
 * 공격자 위치 기준으로 공격 대상 1칸을 결정한다.
 * - UNIT 공격자: 인접 ENEMY 중 슬롯 인덱스 최소 (궁수는 보드 전체 ENEMY 중 최소)
 * - ENEMY 공격자: 인접 UNIT 중 슬롯 인덱스 최소
 */
export function resolveCombatTarget(args: {
    board: BoardGrid;
    width: number;
    height: number;
    ax: number;
    ay: number;
    getAdjacentCoords: (x: number, y: number) => { x: number; y: number }[];
}): { tx: number; ty: number } | null {
    const { board, width, height, ax, ay, getAdjacentCoords } = args;
    const sym = board[ax][ay];
    if (!sym || sym.definition.base_attack === undefined) return null;
    if (sym.is_marked_for_destruction) return null;

    const isUnit = sym.definition.type === SymbolType.UNIT;
    const isEnemy = sym.definition.type === SymbolType.ENEMY;
    if (!isUnit && !isEnemy) return null;

    const targetType = isUnit ? SymbolType.ENEMY : SymbolType.UNIT;

    // 궁수: 보드 전체 대상 중 슬롯 최소
    if (sym.definition.id === S.archer) {
        let picked: { tx: number; ty: number; si: number } | null = null;
        for (let ty = 0; ty < height; ty++) {
            for (let tx = 0; tx < width; tx++) {
                const target = board[tx][ty];
                if (target?.definition.type === targetType && !target.is_marked_for_destruction) {
                    const si = slotIndex(width, tx, ty);
                    if (!picked || si < picked.si) picked = { tx, ty, si };
                }
            }
        }
        return picked ? { tx: picked.tx, ty: picked.ty } : null;
    }

    // 근접: 인접 대상 중 슬롯 최소
    let picked: { tx: number; ty: number; si: number } | null = null;
    for (const adj of getAdjacentCoords(ax, ay)) {
        const target = board[adj.x][adj.y];
        if (target?.definition.type === targetType && !target.is_marked_for_destruction) {
            const si = slotIndex(width, adj.x, adj.y);
            if (!picked || si < picked.si) picked = { tx: adj.x, ty: adj.y, si };
        }
    }
    return picked ? { tx: picked.tx, ty: picked.ty } : null;
}

export function buildCombatEvents(board: BoardGrid, width: number, height: number): Array<{ ax: number; ay: number }> {
    const events: Array<{ ax: number; ay: number }> = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const sym = board[x][y];
            if (!sym || sym.definition.base_attack === undefined) continue;
            if (sym.definition.type !== SymbolType.UNIT && sym.definition.type !== SymbolType.ENEMY) continue;
            events.push({ ax: x, ay: y });
        }
    }
    return events;
}

