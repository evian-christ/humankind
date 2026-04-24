import type { PlayerSymbolInstance } from '../../types';
import { S, SYMBOLS, EXCLUDED_FROM_BASE_POOL, SymbolType } from '../../data/symbolDefinitions';
import type { ActiveRelicEffects, BoardGrid, EffectResult, SymbolEffectContext } from './types';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;

export const SEA_TERRAIN_ID = S.sea;

export interface EffectState {
    food: number;
    knowledge: number;
    gold: number;
    addSymbolIds: number[];
    spawnOnBoard: number[];
    triggerRelicSelection: boolean;
    triggerRelicRefresh: boolean;
    contributors: { x: number; y: number }[];
    bonusXpPerTurnDelta: number;
    forceTerrainInNextChoices: boolean;
    edictRemovalPendingFlag: boolean;
    freeSelectionRerollsAcc: number;
}

export interface SymbolEffectHandlerContext {
    symbolInstance: PlayerSymbolInstance;
    boardGrid: BoardGrid;
    x: number;
    y: number;
    ctx: SymbolEffectContext;
    relicEffects: ActiveRelicEffects;
    state: EffectState;
    adj: { x: number; y: number }[];
    upgrades: number[];
}

export type SymbolEffectHandler = (handlerCtx: SymbolEffectHandlerContext) => boolean;

export const createEffectState = (): EffectState => ({
    food: 0,
    knowledge: 0,
    gold: 0,
    addSymbolIds: [],
    spawnOnBoard: [],
    triggerRelicSelection: false,
    triggerRelicRefresh: false,
    contributors: [],
    bonusXpPerTurnDelta: 0,
    forceTerrainInNextChoices: false,
    edictRemovalPendingFlag: false,
    freeSelectionRerollsAcc: 0,
});

export const buildEffectResult = (state: EffectState): EffectResult => {
    const result: EffectResult = {
        food: state.food,
        knowledge: state.knowledge,
        gold: state.gold,
    };
    if (state.addSymbolIds.length > 0) result.addSymbolIds = state.addSymbolIds;
    if (state.spawnOnBoard.length > 0) result.spawnOnBoard = state.spawnOnBoard;
    if (state.triggerRelicSelection) result.triggerRelicSelection = true;
    if (state.triggerRelicRefresh) result.triggerRelicRefresh = true;
    if (state.contributors.length > 0) result.contributors = state.contributors;
    if (state.bonusXpPerTurnDelta > 0) result.bonusXpPerTurnDelta = state.bonusXpPerTurnDelta;
    if (state.forceTerrainInNextChoices) result.forceTerrainInNextChoices = true;
    if (state.edictRemovalPendingFlag) result.edictRemovalPending = true;
    if (state.freeSelectionRerollsAcc > 0) result.freeSelectionRerolls = state.freeSelectionRerollsAcc;
    return result;
};

export const getAdjacentCoords = (x: number, y: number): { x: number; y: number }[] => {
    const adj: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) {
                adj.push({ x: nx, y: ny });
            }
        }
    }
    return adj;
};

export const hasSeaOrHarborAdjacent = (boardGrid: BoardGrid, x: number, y: number): boolean =>
    getAdjacentCoords(x, y).some((p) => {
        const nid = boardGrid[p.x][p.y]?.definition.id;
        return nid === SEA_TERRAIN_ID || nid === HARBOR_ID;
    });

export const findMountainSameColumn = (
    boardGrid: BoardGrid,
    stoneX: number,
): { x: number; y: number } | null => {
    for (let yy = 0; yy < BOARD_HEIGHT; yy++) {
        const cell = boardGrid[stoneX][yy];
        if (cell?.definition.id === S.mountain) return { x: stoneX, y: yy };
    }
    return null;
};

export const countPlacedSymbols = (boardGrid: BoardGrid): number => {
    let n = 0;
    for (let bx = 0; bx < BOARD_WIDTH; bx++) {
        for (let by = 0; by < BOARD_HEIGHT; by++) {
            if (boardGrid[bx][by]) n++;
        }
    }
    return n;
};

export const countOnBoard = (boardGrid: BoardGrid, targetId: number): number => {
    let count = 0;
    for (let bx = 0; bx < BOARD_WIDTH; bx++) {
        for (let by = 0; by < BOARD_HEIGHT; by++) {
            if (boardGrid[bx][by]?.definition.id === targetId) count++;
        }
    }
    return count;
};

export const countEmptySlots = (boardGrid: BoardGrid): number => {
    let emptySlots = 0;
    for (let bx = 0; bx < BOARD_WIDTH; bx++) {
        for (let by = 0; by < BOARD_HEIGHT; by++) {
            if (!boardGrid[bx][by]) emptySlots++;
        }
    }
    return emptySlots;
};

export const isCorner = (x: number, y: number): boolean =>
    (x === 0 && y === 0) ||
    (x === 0 && y === BOARD_HEIGHT - 1) ||
    (x === BOARD_WIDTH - 1 && y === 0) ||
    (x === BOARD_WIDTH - 1 && y === BOARD_HEIGHT - 1);

export const randomBaseNormalSymbolId = (): number => {
    const pool = Object.values(SYMBOLS).filter((s) => s.type === SymbolType.NORMAL && !EXCLUDED_FROM_BASE_POOL.has(s.id));
    const pick = pool.length > 0 ? pool : [SYMBOLS[S.wheat]!];
    return pick[Math.floor(Math.random() * pick.length)]!.id;
};

export const DESERT_DESTRUCTIBLE_TYPES = new Set<SymbolType>([
    SymbolType.NORMAL,
    SymbolType.ANCIENT,
    SymbolType.MEDIEVAL,
    SymbolType.MODERN,
]);
