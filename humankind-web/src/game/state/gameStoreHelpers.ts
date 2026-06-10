import { SYMBOLS, S, type SymbolDefinition } from '../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../types';
import { CARAVANSERAI_UPGRADE_ID, DESERT_STORAGE_UPGRADE_ID, NOMADIC_TRADITION_UPGRADE_ID } from '../data/knowledgeUpgrades';
import { resolveUpgradedUnitDefinition } from '../data/unitUpgrades';
import { RELIC_ID } from '../logic/relics/relicIds';
import { useRelicStore } from './relicStore';
import type { GamePhase } from './gameStore';
import type { BoardEffectDelta } from '../logic/turn/turnTypes';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;

export const ORAL_TRADITION_ANCHOR = { x: 2, y: 1 } as const;
export const STARTING_WILD_SEED_ANCHORS = [
    { x: 0, y: 1 },
    { x: 1, y: 2 },
    { x: 4, y: 1 },
    { x: 3, y: 2 },
    { x: 2, y: 3 },
] as const;

let instanceCounter = 0;
const generateInstanceId = (): string => `symbol_${Date.now()}_${instanceCounter++}`;

export const phaseAfterTurnFlowComplete = (): GamePhase => 'idle';

export const ensureOralTraditionOwned = (playerSymbols: PlayerSymbolInstance[]): PlayerSymbolInstance[] => {
    if (playerSymbols.some((s) => s.definition.id === S.oral_tradition)) return playerSymbols;
    const def = SYMBOLS[S.oral_tradition];
    if (!def) return playerSymbols;
    return [...playerSymbols, createInstance(def, [])];
};

export const ensureStartingWildSeedsOwned = (playerSymbols: PlayerSymbolInstance[]): PlayerSymbolInstance[] => {
    const wildSeedsDef = SYMBOLS[S.wild_seeds];
    if (!wildSeedsDef) return playerSymbols;

    const ownedCount = playerSymbols.filter((s) => s.definition.id === S.wild_seeds).length;
    if (ownedCount >= STARTING_WILD_SEED_ANCHORS.length) return playerSymbols;

    const next = [...playerSymbols];
    for (let i = ownedCount; i < STARTING_WILD_SEED_ANCHORS.length; i++) {
        next.push(createInstance(wildSeedsDef, []));
    }
    return next;
};

export const placeOralTraditionAtBoardCenter = (
    board: (PlayerSymbolInstance | null)[][],
    playerSymbols: PlayerSymbolInstance[],
): { board: (PlayerSymbolInstance | null)[][]; playerSymbols: PlayerSymbolInstance[] } => {
    const symList = [...playerSymbols];
    const oralIdx = symList.findIndex((s) => s.definition.id === S.oral_tradition);
    if (oralIdx < 0) return { board, playerSymbols: symList };

    const oralInst = symList[oralIdx]!;
    const b = board.map((col) => [...col]);
    const { x: ax, y: ay } = ORAL_TRADITION_ANCHOR;
    let oralX = -1;
    let oralY = -1;

    for (let x = 0; x < BOARD_WIDTH; x++) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            const cell = b[x][y];
            if (cell && cell.instanceId === oralInst.instanceId) {
                if (oralX < 0) {
                    oralX = x;
                    oralY = y;
                }
                b[x][y] = null;
            }
        }
    }

    const occupant = b[ax][ay];
    if (occupant && occupant.instanceId !== oralInst.instanceId) {
        let moved = false;
        if (oralX >= 0 && b[oralX]?.[oralY] === null) {
            b[oralX][oralY] = occupant;
            moved = true;
        }
        for (let x = 0; x < BOARD_WIDTH && !moved; x++) {
            for (let y = 0; y < BOARD_HEIGHT && !moved; y++) {
                if (x === ax && y === ay) continue;
                if (!b[x][y]) {
                    b[x][y] = occupant;
                    moved = true;
                }
            }
        }
    }

    b[ax][ay] = oralInst;
    return { board: b, playerSymbols: symList };
};

export const placeStartingWildSeeds = (
    board: (PlayerSymbolInstance | null)[][],
    playerSymbols: PlayerSymbolInstance[],
): { board: (PlayerSymbolInstance | null)[][]; playerSymbols: PlayerSymbolInstance[] } => {
    const symList = [...playerSymbols];
    const wildSeedInstances = symList.filter((s) => s.definition.id === S.wild_seeds);
    if (wildSeedInstances.length === 0) return { board, playerSymbols: symList };

    const b = board.map((col) => [...col]);

    for (const inst of wildSeedInstances) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const cell = b[x][y];
                if (cell && cell.instanceId === inst.instanceId) b[x][y] = null;
            }
        }
    }

    STARTING_WILD_SEED_ANCHORS.forEach((anchor, index) => {
        const inst = wildSeedInstances[index];
        if (!inst) return;
        b[anchor.x][anchor.y] = inst;
    });

    return { board: b, playerSymbols: symList };
};

export const createEmptyBoard = (): (PlayerSymbolInstance | null)[][] =>
    Array(BOARD_WIDTH)
        .fill(null)
        .map(() => Array(BOARD_HEIGHT).fill(null));

export const getStandardSymbolChoiceCount = (board: (PlayerSymbolInstance | null)[][]): number =>
    board.some((col) => col.some((cell) => cell?.definition.id === S.heatwave)) ? 2 : 3;

export const createInstance = (
    def: SymbolDefinition,
    unlockedUpgrades: readonly number[] = [],
): PlayerSymbolInstance => {
    const resolvedDef = resolveUpgradedUnitDefinition(def, unlockedUpgrades);
    const baseHp = resolvedDef.base_hp;
    let enemy_hp: number | undefined;
    if (baseHp === undefined) enemy_hp = undefined;
    else enemy_hp = baseHp;

    let effect_counter = 0;
    if (resolvedDef.id === S.plague) {
        effect_counter = Math.floor(Math.random() * 3) + 2;
    } else if (resolvedDef.id === S.heatwave) {
        effect_counter = Math.floor(Math.random() * 4) + 4;
    }

    return {
        definition: resolvedDef,
        instanceId: generateInstanceId(),
        effect_counter,
        is_marked_for_destruction: false,
        remaining_attacks: resolvedDef.base_attack ? 3 : 0,
        enemy_hp,
    };
};

export interface CollectionDestroyAgg {
    food: number;
    gold: number;
    knowledge: number;
    addSymbolDefIds: number[];
    openRelicShop: boolean;
    refreshRelicShop: boolean;
    forceTerrainInNextChoices: boolean;
    forceEventsInNextChoices: boolean;
    freeSelectionRerolls: number;
}

export const aggregateCollectionDestroyEffects = (
    removed: PlayerSymbolInstance[],
    _skipEdictFromSymbol69: boolean,
    unlockedKnowledgeUpgrades: readonly number[],
): CollectionDestroyAgg => {
    const out: CollectionDestroyAgg = {
        food: 0,
        gold: 0,
        knowledge: 0,
        addSymbolDefIds: [],
        openRelicShop: false,
        refreshRelicShop: false,
        forceTerrainInNextChoices: false,
        forceEventsInNextChoices: false,
        freeSelectionRerolls: 0,
    };
    for (const sym of removed) {
        const id = sym.definition.id;
        switch (id) {
            case S.pottery:
            case S.tax_storehouse:
                out.food += sym.effect_counter || 0;
                break;
            case S.date:
                out.food += unlockedKnowledgeUpgrades.includes(DESERT_STORAGE_UPGRADE_ID) ? 20 : 10;
                break;
            case S.relic_caravan:
                out.refreshRelicShop = true;
                break;
            case S.honey:
                out.food += 5;
                break;
            case S.dye:
                out.gold += unlockedKnowledgeUpgrades.includes(CARAVANSERAI_UPGRADE_ID) ? 20 : 10;
                break;
            case S.papyrus:
                out.knowledge += unlockedKnowledgeUpgrades.includes(CARAVANSERAI_UPGRADE_ID) ? 20 : 10;
                break;
            case S.pioneer:
                out.forceTerrainInNextChoices = true;
                break;
            case S.royal_colony:
                out.forceEventsInNextChoices = true;
                break;
            default:
                break;
        }
    }
    return out;
};

export const scarabBonusForOwnedRemoves = (
    _board: (PlayerSymbolInstance | null)[][],
    removeCount: number,
): { gold: number; food: number; knowledge: number } => {
    let gold = 0;
    const food = 0;
    const knowledge = 0;
    if (removeCount <= 0) return { gold, food, knowledge };
    const relics = useRelicStore.getState().relics;
    if (relics.some((r) => r.definition.id === RELIC_ID.SCARAB)) {
        gold += removeCount * 3;
    }
    return { gold, food, knowledge };
};

export const appendSymbolDefIdsToPlayer = (
    base: PlayerSymbolInstance[],
    defIds: number[],
    unlockedUpgrades: number[],
): PlayerSymbolInstance[] => {
    const next = [...base];
    for (const id of defIds) {
        const def = SYMBOLS[id];
        if (def) next.push(createInstance(def, unlockedUpgrades));
    }
    return next;
};

const findBoardSlotByInstanceId = (
    board: (PlayerSymbolInstance | null)[][],
    instanceId: string,
): { x: number; y: number } | null => {
    for (let x = 0; x < board.length; x++) {
        const col = board[x];
        for (let y = 0; y < (col?.length ?? 0); y++) {
            if (col[y]?.instanceId === instanceId) return { x, y };
        }
    }
    return null;
};

export const createStoredFoodDestroyEffects = (
    removed: readonly PlayerSymbolInstance[],
    board: (PlayerSymbolInstance | null)[][],
    unlockedKnowledgeUpgrades: readonly number[] = [],
): BoardEffectDelta[] => {
    const effects: BoardEffectDelta[] = [];
    for (const symbol of removed) {
        const slot = findBoardSlotByInstanceId(board, symbol.instanceId);
        if (!slot) continue;

        if (symbol.definition.id === S.pottery || symbol.definition.id === S.tax_storehouse) {
            const food = symbol.effect_counter || 0;
            if (food > 0) effects.push({ ...slot, food, gold: 0, knowledge: 0 });
        } else if (symbol.definition.id === S.date) {
            effects.push({
                ...slot,
                food: unlockedKnowledgeUpgrades.includes(DESERT_STORAGE_UPGRADE_ID) ? 20 : 10,
                gold: 0,
                knowledge: 0,
            });
        } else if (symbol.definition.id === S.dye) {
            effects.push({
                ...slot,
                food: 0,
                gold: unlockedKnowledgeUpgrades.includes(CARAVANSERAI_UPGRADE_ID) ? 20 : 10,
                knowledge: 0,
            });
        } else if (symbol.definition.id === S.papyrus) {
            effects.push({
                ...slot,
                food: 0,
                gold: 0,
                knowledge: unlockedKnowledgeUpgrades.includes(CARAVANSERAI_UPGRADE_ID) ? 20 : 10,
            });
        } else if (symbol.definition.id === S.oral_tradition) {
            const knowledge = countAdjacentBoardSymbols(board, slot.x, slot.y) * 10;
            if (knowledge > 0) effects.push({ ...slot, food: 0, gold: 0, knowledge });
        }
    }
    return effects;
};

const countAdjacentBoardSymbols = (
    board: (PlayerSymbolInstance | null)[][],
    x: number,
    y: number,
): number => {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= board.length || ny >= (board[nx]?.length ?? 0)) continue;
            if (board[nx]?.[ny]) count++;
        }
    }
    return count;
};

export const createBoardDestroyResourceEffects = (
    primarySlot: { x: number; y: number },
    delta: { food: number; gold: number; knowledge: number },
    symbolDestroyEffects: readonly BoardEffectDelta[],
): BoardEffectDelta[] => {
    const symbolDestroyTotals = symbolDestroyEffects.reduce(
        (totals, effect) => ({
            food: totals.food + effect.food,
            gold: totals.gold + effect.gold,
            knowledge: totals.knowledge + effect.knowledge,
        }),
        { food: 0, gold: 0, knowledge: 0 },
    );
    const primaryEffect = {
        x: primarySlot.x,
        y: primarySlot.y,
        food: delta.food - symbolDestroyTotals.food,
        gold: delta.gold - symbolDestroyTotals.gold,
        knowledge: delta.knowledge - symbolDestroyTotals.knowledge,
    };
    const effects: BoardEffectDelta[] = [];
    if (primaryEffect.food !== 0 || primaryEffect.gold !== 0 || primaryEffect.knowledge !== 0) {
        effects.push(primaryEffect);
    }
    effects.push(...symbolDestroyEffects);
    return effects;
};

export const getBoardOnlyDestroyEffectTotals = (
    effects: readonly BoardEffectDelta[],
    board: (PlayerSymbolInstance | null)[][],
): { food: number; gold: number; knowledge: number } =>
    effects.reduce(
        (totals, effect) => {
            const symbol = board[effect.x]?.[effect.y];
            if (symbol?.definition.id !== S.oral_tradition) return totals;
            return {
                food: totals.food + effect.food,
                gold: totals.gold + effect.gold,
                knowledge: totals.knowledge + effect.knowledge,
            };
        },
        { food: 0, gold: 0, knowledge: 0 },
    );

export const markBoardSymbolsForRemoval = (
    board: (PlayerSymbolInstance | null)[][],
    removedIds: ReadonlySet<string>,
): (PlayerSymbolInstance | null)[][] =>
    board.map((col) =>
        col.map((cell) =>
            cell && removedIds.has(cell.instanceId)
                ? { ...cell, is_marked_for_destruction: true }
                : cell,
        ),
    );

export const removeBoardSymbolsByInstanceIds = (
    board: (PlayerSymbolInstance | null)[][],
    removedIds: ReadonlySet<string>,
): (PlayerSymbolInstance | null)[][] =>
    board.map((col) => col.map((cell) => (cell && removedIds.has(cell.instanceId) ? null : cell)));

export const getStartingSymbols = (): PlayerSymbolInstance[] => {
    const oralTradition = SYMBOLS[S.oral_tradition];
    const wildSeeds = SYMBOLS[S.wild_seeds];
    const out: PlayerSymbolInstance[] = [];
    if (oralTradition) out.push(createInstance(oralTradition, []));
    if (wildSeeds) {
        for (let i = 0; i < STARTING_WILD_SEED_ANCHORS.length; i++) {
            out.push(createInstance(wildSeeds, []));
        }
    }
    return out;
};

export const createStartingBoard = (): {
    board: (PlayerSymbolInstance | null)[][];
    playerSymbols: PlayerSymbolInstance[];
} => {
    const symbols = getStartingSymbols();
    const board = createEmptyBoard();
    const oralPlaced = placeOralTraditionAtBoardCenter(board, symbols);
    return placeStartingWildSeeds(oralPlaced.board, oralPlaced.playerSymbols);
};
