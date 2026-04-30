import { SYMBOLS, S, type SymbolDefinition } from '../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../types';
import { CARAVANSERAI_UPGRADE_ID, NOMADIC_TRADITION_UPGRADE_ID } from '../data/knowledgeUpgrades';
import { resolveUpgradedUnitDefinition } from '../data/unitUpgrades';
import { RELIC_ID } from '../logic/relics/relicIds';
import { randomBaseNormalSymbolId } from '../logic/symbolEffects/core';
import { useRelicStore } from './relicStore';
import type { GamePhase } from './gameStore';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;

export const ORAL_TRADITION_ANCHOR = { x: 2, y: 1 } as const;
export const STARTING_WILD_SEED_ANCHORS = [{ x: 1, y: 2 }, { x: 3, y: 2 }] as const;

let instanceCounter = 0;
const generateInstanceId = (): string => `symbol_${Date.now()}_${instanceCounter++}`;

export const phaseAfterTurnFlowComplete = (_level: number, _demoVictoryLevel: number): GamePhase => 'idle';

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

    for (let x = 0; x < BOARD_WIDTH; x++) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            const cell = b[x][y];
            if (cell && cell.instanceId === oralInst.instanceId) b[x][y] = null;
        }
    }

    const occupant = b[ax][ay];
    if (occupant && occupant.instanceId !== oralInst.instanceId) {
        let ox = -1;
        let oy = -1;
        for (let x = 0; x < BOARD_WIDTH; x++) {
            for (let y = 0; y < BOARD_HEIGHT; y++) {
                const cell = b[x][y];
                if (cell && cell.instanceId === oralInst.instanceId) {
                    ox = x;
                    oy = y;
                }
            }
        }
        if (ox >= 0) b[ox][oy] = occupant;
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

export const createInstance = (
    def: SymbolDefinition,
    unlockedUpgrades: readonly number[] = [],
): PlayerSymbolInstance => {
    const resolvedDef = resolveUpgradedUnitDefinition(def, unlockedUpgrades);
    const baseHp = resolvedDef.base_hp;
    let enemy_hp: number | undefined;
    if (baseHp === undefined) enemy_hp = undefined;
    else enemy_hp = baseHp;

    return {
        definition: resolvedDef,
        instanceId: generateInstanceId(),
        effect_counter: 0,
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
    bonusXpPerTurnDelta: number;
    forceTerrainInNextChoices: boolean;
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
        bonusXpPerTurnDelta: 0,
        forceTerrainInNextChoices: false,
        freeSelectionRerolls: 0,
    };
    for (const sym of removed) {
        const id = sym.definition.id;
        switch (id) {
            case S.pottery:
                out.food += sym.effect_counter || 0;
                break;
            case S.tribal_village:
                out.addSymbolDefIds.push(
                    randomBaseNormalSymbolId(),
                    randomBaseNormalSymbolId(),
                );
                break;
            case S.relic_caravan:
                out.refreshRelicShop = true;
                break;
            case S.honey:
                out.food += 5;
                break;
            case S.wool:
                out.gold += unlockedKnowledgeUpgrades.includes(NOMADIC_TRADITION_UPGRADE_ID) ? 10 : 5;
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
            default:
                break;
        }
    }
    return out;
};

export const scarabAndHinduismBonusForOwnedRemoves = (
    board: (PlayerSymbolInstance | null)[][],
    removeCount: number,
): { gold: number; food: number; knowledge: number } => {
    let gold = 0;
    let food = 0;
    let knowledge = 0;
    if (removeCount <= 0) return { gold, food, knowledge };
    const relics = useRelicStore.getState().relics;
    if (relics.some((r) => r.definition.id === RELIC_ID.SCARAB)) {
        gold += removeCount * 3;
    }
    let hinduTiles = 0;
    for (let x = 0; x < BOARD_WIDTH; x++) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            const s = board[x][y];
            if (s && s.definition.id === S.hinduism && !s.is_marked_for_destruction) hinduTiles++;
        }
    }
    if (hinduTiles > 0) {
        const d = hinduTiles * 5 * removeCount;
        food += d;
        knowledge += d;
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

export const getStartingSymbols = (): PlayerSymbolInstance[] => {
    const oralTradition = SYMBOLS[S.oral_tradition];
    const wildSeeds = SYMBOLS[S.wild_seeds];
    const out: PlayerSymbolInstance[] = [];
    if (oralTradition) out.push(createInstance(oralTradition, []));
    if (wildSeeds) {
        out.push(createInstance(wildSeeds, []));
        out.push(createInstance(wildSeeds, []));
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
