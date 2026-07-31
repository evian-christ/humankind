import type { GrowthKind, PlayerSymbolInstance, RainforestGrowthBonus } from '../../types';
import { S, SYMBOLS, EXCLUDED_FROM_BASE_POOL, SymbolType, isBasicSymbolType } from '../../data/symbolDefinitions';
import type {
    ActiveRelicEffects,
    BoardGrid,
    EffectResult,
    LootMergeResolution,
    SymbolEffectContext,
} from './types';
export const SEA_TERRAIN_ID = S.sea;

/** 열대우림 성장치가 이 값에 도달하면 소모되어 영구 생산량이 오른다. */
export const RAINFOREST_GROWTH_THRESHOLD = 10;

/**
 * 심볼별 성장 종류 — 열대우림 성장치를 10에 도달시킨 심볼이
 * 어느 자원의 영구 생산량을 올리는지 결정한다.
 */
const GROWTH_KIND_BY_SYMBOL_ID: Readonly<Record<number, GrowthKind>> = {
    [S.cassava]: 'food',
};

export const getGrowthKind = (symbolId: number): GrowthKind | null =>
    GROWTH_KIND_BY_SYMBOL_ID[symbolId] ?? null;

/** 카사바가 인접 열대우림에 주는 성장치와 그 성장 종류 */
export const CASSAVA_GROWTH_AMOUNT = 2;
export const CASSAVA_GROWTH_KIND: GrowthKind = 'food';

export const createRainforestGrowthBonus = (): RainforestGrowthBonus => ({
    food: 0,
    gold: 0,
    knowledge: 0,
});

/**
 * 열대우림에 성장치를 더하고, 10에 도달할 때마다 10을 소모해
 * `kind`에 해당하는 영구 생산량을 1씩 올린다.
 */
export const addRainforestGrowth = (
    rainforest: PlayerSymbolInstance,
    amount: number,
    kind: GrowthKind,
): void => {
    rainforest.effect_counter = (rainforest.effect_counter || 0) + amount;
    while (rainforest.effect_counter >= RAINFOREST_GROWTH_THRESHOLD) {
        rainforest.effect_counter -= RAINFOREST_GROWTH_THRESHOLD;
        const bonus = rainforest.rainforest_growth_bonus ?? createRainforestGrowthBonus();
        bonus[kind] += 1;
        rainforest.rainforest_growth_bonus = bonus;
    }
};

export interface EffectState {
    food: number;
    knowledge: number;
    gold: number;
    culture: number;
    military: number;
    addSymbolIds: number[];
    spawnOnBoard: number[];
    /** 심볼 효과로 지급할 유물(인장) ID 목록 */
    grantRelicIds: number[];
    triggerRelicSelection: boolean;
    triggerRelicRefresh: boolean;
    contributors: { x: number; y: number }[];
    forceTerrainInNextChoices: boolean;
    forceEventsInNextChoices: boolean;
    freeSelectionRerollsAcc: number;
    lootMerge: LootMergeResolution | null;
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
    culture: 0,
    military: 0,
    addSymbolIds: [],
    spawnOnBoard: [],
    grantRelicIds: [],
    triggerRelicSelection: false,
    triggerRelicRefresh: false,
    contributors: [],
    forceTerrainInNextChoices: false,
    forceEventsInNextChoices: false,
    freeSelectionRerollsAcc: 0,
    lootMerge: null,
});

export const buildEffectResult = (state: EffectState): EffectResult => {
    const result: EffectResult = {
        food: state.food,
        knowledge: state.knowledge,
        gold: state.gold,
    };
    if (state.culture !== 0) result.culture = state.culture;
    if (state.military !== 0) result.military = state.military;
    if (state.addSymbolIds.length > 0) result.addSymbolIds = state.addSymbolIds;
    if (state.spawnOnBoard.length > 0) result.spawnOnBoard = state.spawnOnBoard;
    if (state.grantRelicIds.length > 0) result.grantRelicIds = state.grantRelicIds;
    if (state.triggerRelicSelection) result.triggerRelicSelection = true;
    if (state.triggerRelicRefresh) result.triggerRelicRefresh = true;
    if (state.contributors.length > 0) result.contributors = state.contributors;
    if (state.forceTerrainInNextChoices) result.forceTerrainInNextChoices = true;
    if (state.forceEventsInNextChoices) result.forceEventsInNextChoices = true;
    if (state.freeSelectionRerollsAcc > 0) result.freeSelectionRerolls = state.freeSelectionRerollsAcc;
    if (state.lootMerge) result.lootMerge = state.lootMerge;
    return result;
};

export const getAdjacentCoords = (
    x: number,
    y: number,
    width = 5,
    height = 4,
): { x: number; y: number }[] => {
    const adj: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                adj.push({ x: nx, y: ny });
            }
        }
    }
    return adj;
};

export const getEffectiveAdjacentCoords = (
    boardGrid: BoardGrid,
    x: number,
    y: number,
    allSymbolsAdjacent = false,
): { x: number; y: number }[] => {
    const width = boardGrid.length;
    const height = boardGrid[x]?.length ?? boardGrid[0]?.length ?? 0;
    const coords = getAdjacentCoords(x, y, width, height)
        .filter((pos) => Object.prototype.hasOwnProperty.call(boardGrid[pos.x], pos.y));
    if (!allSymbolsAdjacent) return coords;

    const seen = new Set(coords.map((pos) => `${pos.x},${pos.y}`));
    for (let bx = 0; bx < boardGrid.length; bx++) {
        for (let by = 0; by < (boardGrid[bx]?.length ?? 0); by++) {
            if (!Object.prototype.hasOwnProperty.call(boardGrid[bx], by)) continue;
            if (bx === x && by === y) continue;
            const symbol = boardGrid[bx]?.[by];
            if (!symbol || symbol.is_marked_for_destruction) continue;
            const key = `${bx},${by}`;
            if (seen.has(key)) continue;
            seen.add(key);
            coords.push({ x: bx, y: by });
        }
    }
    return coords;
};

/**
 * 활성 슬롯 기준 가장자리 판정.
 * 8방향 이웃 슬롯이 하나라도 비활성(미개방)이거나 보드 밖이면 가장자리로 봅니다.
 * 보드 확장으로 슬롯이 열리면 기존 가장자리 칸이 안쪽으로 바뀝니다.
 */
export const isEdgeSlot = (boardGrid: BoardGrid, x: number, y: number): boolean => {
    const width = boardGrid.length;
    const height = boardGrid[x]?.length ?? boardGrid[0]?.length ?? 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true;
            if (!Object.prototype.hasOwnProperty.call(boardGrid[nx], ny)) return true;
        }
    }
    return false;
};

/** 바다가 해안(가장자리) 상태인가. 바다가 아니면 false. */
export const isCoastAt = (boardGrid: BoardGrid, x: number, y: number): boolean =>
    boardGrid[x]?.[y]?.definition.id === SEA_TERRAIN_ID && isEdgeSlot(boardGrid, x, y);

/** 바다가 해양(안쪽) 상태인가. 바다가 아니면 false. */
export const isOceanAt = (boardGrid: BoardGrid, x: number, y: number): boolean =>
    boardGrid[x]?.[y]?.definition.id === SEA_TERRAIN_ID && !isEdgeSlot(boardGrid, x, y);

export const hasSeaOrHarborAdjacent = (boardGrid: BoardGrid, x: number, y: number): boolean =>
    getAdjacentCoords(x, y, boardGrid.length, boardGrid[x]?.length ?? boardGrid[0]?.length ?? 0)
    .filter((p) => Object.prototype.hasOwnProperty.call(boardGrid[p.x], p.y))
    .some((p) => {
        const nid = boardGrid[p.x]?.[p.y]?.definition.id;
        return nid === SEA_TERRAIN_ID;
    });

export const findMountainSameColumn = (
    boardGrid: BoardGrid,
    stoneX: number,
): { x: number; y: number } | null => {
    for (let yy = 0; yy < (boardGrid[stoneX]?.length ?? 0); yy++) {
        const cell = boardGrid[stoneX]?.[yy];
        if (cell?.definition.id === S.mountain) return { x: stoneX, y: yy };
    }
    return null;
};

export const countPlacedSymbols = (boardGrid: BoardGrid): number => {
    let n = 0;
    for (let bx = 0; bx < boardGrid.length; bx++) {
        for (let by = 0; by < (boardGrid[bx]?.length ?? 0); by++) {
            if (!Object.prototype.hasOwnProperty.call(boardGrid[bx], by)) continue;
            if (boardGrid[bx]?.[by]) n++;
        }
    }
    return n;
};

export const countOnBoard = (boardGrid: BoardGrid, targetId: number): number => {
    let count = 0;
    for (let bx = 0; bx < boardGrid.length; bx++) {
        for (let by = 0; by < (boardGrid[bx]?.length ?? 0); by++) {
            if (!Object.prototype.hasOwnProperty.call(boardGrid[bx], by)) continue;
            if (boardGrid[bx]?.[by]?.definition.id === targetId) count++;
        }
    }
    return count;
};

/**
 * 같은 세로줄(동일 x)에서 대상 심볼이 놓인 좌표 — 자기 자신이 선 칸은 제외.
 * 인접(8방향)과 달리 거리 제한이 없고 가로 방향은 보지 않는다.
 */
export const getSameColumnCoordsBySymbolId = (
    boardGrid: BoardGrid,
    x: number,
    y: number,
    targetId: number,
): { x: number; y: number }[] => {
    const coords: { x: number; y: number }[] = [];
    const column = boardGrid[x];
    if (!column) return coords;
    for (let by = 0; by < column.length; by++) {
        if (by === y) continue;
        if (!Object.prototype.hasOwnProperty.call(column, by)) continue;
        if (column[by]?.definition.id === targetId) coords.push({ x, y: by });
    }
    return coords;
};

/**
 * 같은 가로줄(동일 y)에서 대상 심볼이 놓인 좌표 — 자기 자신이 선 칸은 제외.
 * 인접(8방향)과 달리 거리 제한이 없고 세로 방향은 보지 않는다.
 */
export const getSameRowCoordsBySymbolId = (
    boardGrid: BoardGrid,
    x: number,
    y: number,
    targetId: number,
): { x: number; y: number }[] => {
    const coords: { x: number; y: number }[] = [];
    for (let bx = 0; bx < boardGrid.length; bx++) {
        if (bx === x) continue;
        const column = boardGrid[bx];
        if (!column) continue;
        if (!Object.prototype.hasOwnProperty.call(column, y)) continue;
        if (column[y]?.definition.id === targetId) coords.push({ x: bx, y });
    }
    return coords;
};

export const countEmptySlots = (boardGrid: BoardGrid): number => {
    let emptySlots = 0;
    for (let bx = 0; bx < boardGrid.length; bx++) {
        for (let by = 0; by < (boardGrid[bx]?.length ?? 0); by++) {
            if (!Object.prototype.hasOwnProperty.call(boardGrid[bx], by)) continue;
            if (!boardGrid[bx]?.[by]) emptySlots++;
        }
    }
    return emptySlots;
};

export const isCorner = (x: number, y: number, width = 5, height = 4): boolean =>
    (x === 0 && y === 0) ||
    (x === 0 && y === height - 1) ||
    (x === width - 1 && y === 0) ||
    (x === width - 1 && y === height - 1);

export const randomBaseNormalSymbolId = (): number => {
    const pool = Object.values(SYMBOLS).filter((s) => isBasicSymbolType(s.type) && !EXCLUDED_FROM_BASE_POOL.has(s.id));
    const pick = pool.length > 0 ? pool : [SYMBOLS[S.wheat]!];
    return pick[Math.floor(Math.random() * pick.length)]!.id;
};

// 사치품은 사막 파괴 대상에서 제외한다.
export const DESERT_DESTRUCTIBLE_TYPES = new Set<SymbolType>([
    SymbolType.RESOURCE,
    SymbolType.ANCIENT,
    SymbolType.MEDIEVAL,
    SymbolType.MODERN,
]);

export const isDesertDestructibleSymbol = (symbol: PlayerSymbolInstance): boolean =>
    symbol.definition.id !== S.caravanserai &&
    DESERT_DESTRUCTIBLE_TYPES.has(symbol.definition.type);
