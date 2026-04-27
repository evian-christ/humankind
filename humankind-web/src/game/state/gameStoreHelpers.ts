import { SYMBOLS, SymbolType, S, type SymbolDefinition } from '../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../types';
import { ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID, CARAVANSERAI_UPGRADE_ID, NOMADIC_TRADITION_UPGRADE_ID } from '../data/knowledgeUpgrades';
import { RELIC_ID } from '../logic/relics/relicIds';
import { useRelicStore } from './relicStore';
import type { GamePhase } from './gameStore';
import { getBronzeWorkingHpBonus } from './gameCalculations';

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 4;

export const ORAL_TRADITION_ANCHOR = { x: 2, y: 1 } as const;

let instanceCounter = 0;
const generateInstanceId = (): string => `symbol_${Date.now()}_${instanceCounter++}`;

export const phaseAfterTurnFlowComplete = (level: number, demoVictoryLevel: number): GamePhase =>
    level >= demoVictoryLevel ? 'victory' : 'idle';

export const ensureOralTraditionOwned = (playerSymbols: PlayerSymbolInstance[]): PlayerSymbolInstance[] => {
    if (playerSymbols.some((s) => s.definition.id === S.oral_tradition)) return playerSymbols;
    const def = SYMBOLS[S.oral_tradition];
    if (!def) return playerSymbols;
    return [...playerSymbols, createInstance(def, [])];
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

export const createEmptyBoard = (): (PlayerSymbolInstance | null)[][] =>
    Array(BOARD_WIDTH)
        .fill(null)
        .map(() => Array(BOARD_HEIGHT).fill(null));

export const createInstance = (
    def: SymbolDefinition,
    unlockedUpgrades: readonly number[] = [],
): PlayerSymbolInstance => {
    const baseHp = def.base_hp;
    let enemy_hp: number | undefined;
    if (baseHp === undefined) enemy_hp = undefined;
    else {
        const bonus = unlockedUpgrades.includes(2) ? getBronzeWorkingHpBonus(def) : 0;
        enemy_hp = baseHp + bonus;
    }

    return {
        definition: def,
        instanceId: generateInstanceId(),
        effect_counter: 0,
        is_marked_for_destruction: false,
        remaining_attacks: def.base_attack ? 3 : 0,
        enemy_hp,
    };
};

const randomEra1SymbolIdForDestroy = (unlockedKnowledgeUpgrades: readonly number[]): number => {
    const ids = [
        S.wheat, S.rice, S.cattle, S.banana, S.fish, S.sea, S.stone, S.copper, S.grassland, S.monument, S.oasis,
        S.oral_tradition, S.rainforest, S.plains, S.mountain, S.totem, S.omen, S.campfire, S.pottery,
        S.tribal_village, S.deer, S.date, S.warrior,
    ];
    const ancientOk = unlockedKnowledgeUpgrades.includes(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID);
    const pool = ancientOk
        ? ids
        : ids.filter((id) => SYMBOLS[id] && SYMBOLS[id].type !== SymbolType.ANCIENT);
    const pick = pool.length > 0 ? pool : [S.wheat];
    return pick[Math.floor(Math.random() * pick.length)];
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
    edictRemovalPending: boolean;
    freeSelectionRerolls: number;
}

export const aggregateCollectionDestroyEffects = (
    removed: PlayerSymbolInstance[],
    skipEdictFromSymbol69: boolean,
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
        edictRemovalPending: false,
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
                    randomEra1SymbolIdForDestroy(unlockedKnowledgeUpgrades),
                    randomEra1SymbolIdForDestroy(unlockedKnowledgeUpgrades),
                );
                break;
            case S.relic_caravan:
                out.refreshRelicShop = true;
                break;
            case S.barbarian_camp:
                out.addSymbolDefIds.push(S.loot);
                break;
            case S.loot:
                out.food += Math.floor(Math.random() * 10) + 1;
                out.gold += Math.floor(Math.random() * 10) + 1;
                out.knowledge += Math.floor(Math.random() * 30) + 1;
                if (Math.random() < 0.01) out.addSymbolDefIds.push(S.glowing_amber);
                break;
            case S.glowing_amber:
                out.openRelicShop = true;
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
            case S.edict:
                if (!skipEdictFromSymbol69) out.edictRemovalPending = true;
                break;
            case S.embassy:
                out.freeSelectionRerolls += 1;
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
    return oralTradition ? [createInstance(oralTradition, [])] : [];
};

export const createStartingBoard = (): {
    board: (PlayerSymbolInstance | null)[][];
    playerSymbols: PlayerSymbolInstance[];
} => {
    const symbols = getStartingSymbols();
    const board = createEmptyBoard();
    board[ORAL_TRADITION_ANCHOR.x][ORAL_TRADITION_ANCHOR.y] = symbols[0] ?? null;
    return { board, playerSymbols: symbols };
};
