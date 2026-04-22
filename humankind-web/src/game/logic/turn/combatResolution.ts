import { S } from '../../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../../types';
import {
    applyFixedDamageToEnemy,
    buildCombatEvents,
    pickRandomLivingEnemy,
    resolveCombatTarget,
    type BoardGrid,
} from '../combat/combatEngine';

export interface CombatCoord {
    x: number;
    y: number;
}

export interface CombatEvent {
    ax: number;
    ay: number;
}

export interface CombatAnimationEvent {
    ax: number;
    ay: number;
    tx: number;
    ty: number;
    atkDmg: number;
    counterDmg: 0;
}

export interface CombatStepInput {
    board: BoardGrid;
    width: number;
    height: number;
    event: CombatEvent;
    getAdjacentCoords: (x: number, y: number) => CombatCoord[];
    getEffectiveMaxHP: (sym: PlayerSymbolInstance) => number;
}

export interface CombatStepResult {
    animation: CombatAnimationEvent | null;
}

export interface ClovisPreDamageResult {
    target: CombatCoord;
    float: { x: number; y: number; text: string; color: string };
}

export function collectCombatEvents(board: BoardGrid, width: number, height: number): CombatEvent[] {
    return buildCombatEvents(board, width, height).filter(({ ax, ay }) => {
        const sym = board[ax][ay];
        return !!sym && !sym.is_marked_for_destruction;
    });
}

export function resolveCombatStep(input: CombatStepInput): CombatStepResult {
    const { board, width, height, event, getAdjacentCoords, getEffectiveMaxHP } = input;
    const { ax, ay } = event;
    const attacker = board[ax][ay];
    const picked = resolveCombatTarget({
        board,
        width,
        height,
        ax,
        ay,
        getAdjacentCoords,
    });
    const target = picked ? board[picked.tx][picked.ty] : null;

    let atkDmg = 0;
    if (
        picked &&
        attacker &&
        !attacker.is_marked_for_destruction &&
        target &&
        !target.is_marked_for_destruction
    ) {
        atkDmg = attacker.definition.base_attack ?? 0;

        if (atkDmg > 0) {
            const maxHP = getEffectiveMaxHP(target);
            target.enemy_hp = (target.enemy_hp ?? maxHP) - atkDmg;
            if (target.enemy_hp <= 0) target.is_marked_for_destruction = true;
        }
    }

    return {
        animation:
            atkDmg > 0 && picked
                ? { ax, ay, tx: picked.tx, ty: picked.ty, atkDmg, counterDmg: 0 }
                : null,
    };
}

export function collectCombatDestroyedSymbols(board: BoardGrid, width: number, height: number): string[] {
    const destroyedIds: string[] = [];
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const sym = board[x][y];
            if (sym?.is_marked_for_destruction) destroyedIds.push(sym.instanceId);
        }
    }
    return destroyedIds;
}

export function collectLootFromDestroyedCamps(
    board: BoardGrid,
    width: number,
    height: number,
    destroyedIds: ReadonlySet<string>,
): number[] {
    const lootFromCamps: number[] = [];
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const sym = board[x][y];
            if (
                sym?.is_marked_for_destruction &&
                destroyedIds.has(sym.instanceId) &&
                sym.definition.id === S.barbarian_camp
            ) {
                lootFromCamps.push(S.loot);
            }
        }
    }
    return lootFromCamps;
}

export function pickClovisPreDamageTarget(board: BoardGrid, width: number, height: number): CombatCoord | null {
    return pickRandomLivingEnemy(board, width, height);
}

export function applyClovisPreDamage(args: {
    board: BoardGrid;
    target: CombatCoord;
    getEffectiveMaxHP: (sym: PlayerSymbolInstance) => number;
}): ClovisPreDamageResult {
    const { board, target, getEffectiveMaxHP } = args;
    applyFixedDamageToEnemy(board, target, 1, getEffectiveMaxHP);
    return {
        target,
        float: { x: target.x, y: target.y, text: '-1', color: '#ef4444' },
    };
}
