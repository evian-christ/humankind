import { describe, expect, it, vi } from 'vitest';
import { S, SYMBOLS, Sym, type SymbolDefinition } from '../../data/symbolDefinitions';
import {
    AGRICULTURE_UPGRADE_ID,
    AGRICULTURAL_SURPLUS_UPGRADE_ID,
    ARCHITECTURE_UPGRADE_ID,
    CASTLE_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    MERCANTILISM_UPGRADE_ID,
    DESERT_STORAGE_UPGRADE_ID,
    EDUCATION_UPGRADE_ID,
    EXPLORATION_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FEUDAL_CORN_UPGRADE_ID,
    FISHERY_GUILD_UPGRADE_ID,
    FORESTRY_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    GUILD_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    JUNGLE_EXPEDITION_UPGRADE_ID,
    MARITIME_TRADE_UPGRADE_ID,
    MASON_GUILD_UPGRADE_ID,
    MILITARY_SCIENCE_UPGRADE_ID,
    MINING_UPGRADE_ID,
    MODERN_AGRICULTURE_UPGRADE_ID,
    NATIONALISM_UPGRADE_ID,
    OCEANIC_ROUTES_UPGRADE_ID,
    OASIS_RECOVERY_UPGRADE_ID,
    PLANTATION_UPGRADE_ID,
    PRESERVATION_UPGRADE_ID,
    SCIENTIFIC_THEORY_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    SHIPBUILDING_UPGRADE_ID,
    TANNING_UPGRADE_ID,
    THEOCRACY_UPGRADE_ID,
    TRACKING_UPGRADE_ID,
    TROPICAL_AGRICULTURE_UPGRADE_ID,
    TROPICAL_DEVELOPMENT_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';
import type { PlayerSymbolInstance } from '../../types';
import { DEFAULT_RELIC_EFFECTS, processSingleSymbolEffects } from '../symbolEffects';
import { commitLootMerge } from './turnPipeline';
import {
    buildFoodBySlotKey,
    collectDisabledTerrainCoords,
    computeMerchantDeferredEffects,
    computeReligionDeferredEffects,
    slotKey,
} from './symbolEffectResolution';
import type { BoardGrid } from './turnTypes';

const createEmptyBoard = (): BoardGrid => Array(5).fill(null).map(() => Array(4).fill(null));

const createInstance = (definition: SymbolDefinition, id: string): PlayerSymbolInstance => ({
    definition,
    instanceId: id,
    effect_counter: 0,
    is_marked_for_destruction: false,
    remaining_attacks: definition.base_attack ? 3 : 0,
    enemy_hp: definition.base_hp,
});

const getAdjacentCoords = (x: number, y: number) => {
    const adj: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < 5 && ny >= 0 && ny < 4) adj.push({ x: nx, y: ny });
        }
    }
    return adj;
};

describe('symbolEffectResolution', () => {
    it('scales sea gold by research tier without increasing gold per group', () => {
        const board = createEmptyBoard();
        const sea = createInstance(Sym.sea, 'sea');
        board[2][2] = sea;
        getAdjacentCoords(2, 2).slice(0, 6).forEach(({ x, y }, index) => {
            board[x][y] = createInstance(Sym.wheat, `adjacent_${index}`);
        });

        expect(processSingleSymbolEffects(sea, board, 2, 2, { upgrades: [] }).gold).toBe(1);
        expect(processSingleSymbolEffects(
            sea,
            board,
            2,
            2,
            { upgrades: [CELESTIAL_NAVIGATION_UPGRADE_ID] },
        ).gold).toBe(2);
        expect(processSingleSymbolEffects(
            sea,
            board,
            2,
            2,
            { upgrades: [CELESTIAL_NAVIGATION_UPGRADE_ID, MARITIME_TRADE_UPGRADE_ID] },
        ).gold).toBe(3);
        expect(processSingleSymbolEffects(
            sea,
            board,
            2,
            2,
            {
                upgrades: [
                    CELESTIAL_NAVIGATION_UPGRADE_ID,
                    MARITIME_TRADE_UPGRADE_ID,
                    OCEANIC_ROUTES_UPGRADE_ID,
                ],
            },
        ).gold).toBe(6);
    });

    it('prevents barbarian invasion enemies from plundering food with Castle', () => {
        const board = createEmptyBoard();
        const enemy = createInstance(Sym.enemy_warrior, 'enemy');
        enemy.spawnedByBarbarianInvasion = true;
        enemy.barbarianInvasionTurnsRemaining = 3;
        board[1][1] = enemy;

        const result = processSingleSymbolEffects(enemy, board, 1, 1, { upgrades: [CASTLE_UPGRADE_ID] });

        expect(result).toEqual({ food: 0, gold: 0, knowledge: 0 });
    });

    it('lets barbarian invasion enemies plunder food after Castle grace expires', () => {
        const board = createEmptyBoard();
        const enemy = createInstance(Sym.enemy_warrior, 'enemy');
        enemy.spawnedByBarbarianInvasion = true;
        enemy.barbarianInvasionTurnsRemaining = 0;
        board[1][1] = enemy;

        const result = processSingleSymbolEffects(enemy, board, 1, 1, { upgrades: [CASTLE_UPGRADE_ID] });

        expect(result.food).toBe(-3);
    });

    it('lets Bronze Tribute Chest produce gold for three turns then mark itself for destruction', () => {
        const board = createEmptyBoard();
        const chest = createInstance(Sym.bronze_tribute_chest, 'bronze-tribute-chest');
        board[1][1] = chest;

        const first = processSingleSymbolEffects(chest, board, 1, 1, { upgrades: [] });
        expect(first).toMatchObject({ food: 0, gold: 1, knowledge: 0 });
        expect(chest.effect_counter).toBe(1);
        expect(chest.is_marked_for_destruction).toBe(false);

        const second = processSingleSymbolEffects(chest, board, 1, 1, { upgrades: [] });
        expect(second).toMatchObject({ food: 0, gold: 1, knowledge: 0 });
        expect(chest.effect_counter).toBe(2);
        expect(chest.is_marked_for_destruction).toBe(false);

        const third = processSingleSymbolEffects(chest, board, 1, 1, { upgrades: [] });
        expect(third).toMatchObject({ food: 0, gold: 1, knowledge: 0 });
        expect(chest.effect_counter).toBe(3);
        expect(chest.is_marked_for_destruction).toBe(true);
    });

    it('upgrades Mountain with Medieval Age to produce food and knowledge', () => {
        const board = createEmptyBoard();
        const mountain = createInstance(Sym.mountain, 'mountain');
        board[1][1] = mountain;

        const baseResult = processSingleSymbolEffects(mountain, board, 1, 1, { upgrades: [] });
        const upgradedResult = processSingleSymbolEffects(mountain, board, 1, 1, { upgrades: [FEUDALISM_UPGRADE_ID] });

        expect(baseResult).toMatchObject({ food: 1, gold: 0, knowledge: 0 });
        expect(upgradedResult).toMatchObject({ food: 2, gold: 0, knowledge: 4 });
    });

    it('collects terrain disabled by flood and initializes flood counter', () => {
        const board = createEmptyBoard();
        const flood = createInstance(SYMBOLS[S.flood]!, 'flood');
        board[1][1] = flood;
        board[0][0] = createInstance(Sym.grassland, 'terrain');
        board[2][2] = createInstance(Sym.wheat, 'normal');

        const disabled = collectDisabledTerrainCoords(board, 5, 4);

        expect(flood.effect_counter).toBe(3);
        expect(disabled.has(slotKey(0, 0))).toBe(true);
        expect(disabled.has(slotKey(2, 2))).toBe(false);
    });

    it('lets flood disable terrain production without blocking adjacency-based terrain checks', () => {
        const board = createEmptyBoard();
        const salt = createInstance(Sym.salt, 'salt');
        const grassland = createInstance(Sym.grassland, 'grassland');
        board[1][1] = salt;
        board[0][1] = grassland;
        const disabled = new Set([slotKey(0, 1)]);

        const terrainResult = processSingleSymbolEffects(
            grassland,
            board,
            0,
            1,
            { upgrades: [] },
            undefined,
            disabled,
        );
        const saltResult = processSingleSymbolEffects(
            salt,
            board,
            1,
            1,
            { upgrades: [] },
            undefined,
            disabled,
        );

        expect(terrainResult).toEqual({ food: 0, gold: 0, knowledge: 0 });
        expect(saltResult.food).toBe(1);
    });

    it('lets flood disable Desert production without blocking its destruction effect', () => {
        const board = createEmptyBoard();
        const desert = createInstance(Sym.desert, 'desert');
        const wheat = createInstance(Sym.wheat, 'wheat');
        board[1][1] = desert;
        board[0][1] = wheat;
        const disabled = new Set([slotKey(1, 1)]);

        vi.spyOn(Math, 'random').mockReturnValue(0);
        const result = processSingleSymbolEffects(
            desert,
            board,
            1,
            1,
            { upgrades: [DESERT_STORAGE_UPGRADE_ID] },
            undefined,
            disabled,
        );

        expect(result).toMatchObject({ food: 0, gold: 0, knowledge: 0 });
        expect(wheat.is_marked_for_destruction).toBe(true);
        vi.mocked(Math.random).mockRestore();
    });

    it('prevents Desert from destroying Caravanserai', () => {
        const board = createEmptyBoard();
        const desert = createInstance(Sym.desert, 'desert');
        const caravanserai = createInstance(Sym.caravanserai, 'caravanserai');
        const wheat = createInstance(Sym.wheat, 'wheat');
        board[1][1] = desert;
        board[0][1] = caravanserai;
        board[2][1] = wheat;

        vi.spyOn(Math, 'random').mockReturnValue(0);
        processSingleSymbolEffects(desert, board, 1, 1, { upgrades: [] });

        expect(caravanserai.is_marked_for_destruction).toBe(false);
        expect(wheat.is_marked_for_destruction).toBe(true);
        vi.mocked(Math.random).mockRestore();
    });

    it('grants Food when base Desert destroys a random adjacent symbol', () => {
        const board = createEmptyBoard();
        const desert = createInstance(Sym.desert, 'desert');
        const wheat = createInstance(Sym.wheat, 'wheat');
        board[1][1] = desert;
        board[0][1] = wheat;

        vi.spyOn(Math, 'random').mockReturnValue(0);
        const result = processSingleSymbolEffects(desert, board, 1, 1, { upgrades: [] });

        expect(result).toMatchObject({ food: 5, gold: 0, knowledge: 0 });
        expect(wheat.is_marked_for_destruction).toBe(true);
        vi.mocked(Math.random).mockRestore();
    });

    it('upgrades Desert destruction rewards with Foreign Trade', () => {
        const board = createEmptyBoard();
        const desert = createInstance(Sym.desert, 'desert');
        const wheat = createInstance(Sym.wheat, 'wheat');
        board[1][1] = desert;
        board[0][1] = wheat;

        vi.spyOn(Math, 'random').mockReturnValue(0);
        const result = processSingleSymbolEffects(
            desert,
            board,
            1,
            1,
            { upgrades: [FOREIGN_TRADE_UPGRADE_ID] },
        );

        expect(result).toMatchObject({ food: 10, gold: 1, knowledge: 0 });
        expect(wheat.is_marked_for_destruction).toBe(true);
        vi.mocked(Math.random).mockRestore();
    });

    it('computes deferred Christianity, Islam, and Hinduism effects from board state', () => {
        const board = createEmptyBoard();
        board[1][1] = createInstance(Sym.christianity, 'christianity');
        board[2][1] = createInstance(Sym.wheat, 'wheat');

        const cache = new Map([
            [slotKey(2, 1), { food: 4, gold: 0, knowledge: 0 }],
        ]);

        const christianityResult = computeReligionDeferredEffects({
            board,
            religionSlots: [
                { x: 1, y: 1, id: S.christianity },
            ],
            religionEffectCache: cache,
            getAdjacentCoords,
        });

        expect(christianityResult.effects).toEqual([
            { x: 1, y: 1, food: 4, gold: 0, knowledge: 0 },
        ]);
        expect(christianityResult.foodDelta).toBe(4);
        expect(christianityResult.goldDelta).toBe(0);
        expect(christianityResult.knowledgeDelta).toBe(0);

        const islamBoard = createEmptyBoard();
        islamBoard[2][2] = createInstance(Sym.islam, 'islam');
        islamBoard[3][2] = createInstance(Sym.library, 'library');
        const islamResult = computeReligionDeferredEffects({
            board: islamBoard,
            religionSlots: [{ x: 2, y: 2, id: S.islam }],
            religionEffectCache: new Map([[slotKey(3, 2), { food: 0, gold: 0, knowledge: 5 }]]),
            getAdjacentCoords,
        });
        expect(islamResult.effects).toEqual([{ x: 2, y: 2, food: 2, gold: 0, knowledge: 0 }]);

        const hinduismBoard = createEmptyBoard();
        hinduismBoard[0][0] = createInstance(Sym.hinduism, 'hinduism');
        hinduismBoard[1][0] = createInstance(Sym.wheat, 'wheat');
        const hinduismResult = computeReligionDeferredEffects({
            board: hinduismBoard,
            religionSlots: [{ x: 0, y: 0, id: S.hinduism }],
            religionEffectCache: new Map(),
            getAdjacentCoords,
        });
        expect(hinduismResult.effects).toEqual([{ x: 0, y: 0, food: 1, gold: 0, knowledge: 0 }]);
    });

    it('computes Buddhism food immediately from the current empty slots', () => {
        const board = createEmptyBoard();
        const buddhism = createInstance(Sym.buddhism, 'buddhism');
        board[0][1] = buddhism;
        board[4][3] = createInstance(Sym.wheat, 'wheat');

        const result = processSingleSymbolEffects(buddhism, board, 0, 1, { upgrades: [] });

        expect(result).toEqual({ food: 36, gold: 0, knowledge: 0 });
    });

    it('upgrades immediate Buddhism food with Theocracy', () => {
        const board = createEmptyBoard();
        const buddhism = createInstance(Sym.buddhism, 'buddhism');
        board[0][1] = buddhism;
        board[4][3] = createInstance(Sym.wheat, 'wheat');

        const result = processSingleSymbolEffects(buddhism, board, 0, 1, {
            upgrades: [THEOCRACY_UPGRADE_ID],
        });

        expect(result).toEqual({ food: 72, gold: 0, knowledge: 0 });
    });

    it('blocks immediate Buddhism food when another religion is on the board', () => {
        const board = createEmptyBoard();
        const buddhism = createInstance(Sym.buddhism, 'buddhism');
        board[0][1] = buddhism;
        board[4][3] = createInstance(Sym.christianity, 'christianity');

        const result = processSingleSymbolEffects(buddhism, board, 0, 1, { upgrades: [] });

        expect(result).toEqual({ food: 0, gold: 0, knowledge: 0 });
        expect(buddhism.is_marked_for_destruction).toBe(false);
    });

    it('upgrades religion effects with Theocracy while preserving destroy-on-other-religion', () => {
        const christianityBoard = createEmptyBoard();
        christianityBoard[1][1] = createInstance(Sym.christianity, 'christianity');
        christianityBoard[2][1] = createInstance(Sym.wheat, 'wheat');
        christianityBoard[4][3] = createInstance(Sym.rice, 'rice');

        const christianityResult = computeReligionDeferredEffects({
            board: christianityBoard,
            religionSlots: [{ x: 1, y: 1, id: S.christianity }],
            religionEffectCache: new Map([
                [slotKey(2, 1), { food: 4, gold: 0, knowledge: 0 }],
                [slotKey(4, 3), { food: 9, gold: 0, knowledge: 0 }],
            ]),
            getAdjacentCoords,
            unlockedKnowledgeUpgrades: [THEOCRACY_UPGRADE_ID],
        });
        expect(christianityResult.effects).toEqual([{ x: 1, y: 1, food: 9, gold: 0, knowledge: 0 }]);

        const islamBoard = createEmptyBoard();
        islamBoard[2][2] = createInstance(Sym.islam, 'islam');
        islamBoard[3][2] = createInstance(Sym.library, 'library');
        const islamResult = computeReligionDeferredEffects({
            board: islamBoard,
            religionSlots: [{ x: 2, y: 2, id: S.islam }],
            religionEffectCache: new Map([[slotKey(3, 2), { food: 0, gold: 0, knowledge: 5 }]]),
            getAdjacentCoords,
            unlockedKnowledgeUpgrades: [THEOCRACY_UPGRADE_ID],
        });
        expect(islamResult.effects).toEqual([{ x: 2, y: 2, food: 3, gold: 0, knowledge: 0 }]);

        const hinduismBoard = createEmptyBoard();
        hinduismBoard[0][0] = createInstance(Sym.hinduism, 'hinduism');
        hinduismBoard[1][0] = createInstance(Sym.wheat, 'wheat');
        hinduismBoard[2][0] = createInstance(Sym.rice, 'rice');
        const hinduismResult = computeReligionDeferredEffects({
            board: hinduismBoard,
            religionSlots: [{ x: 0, y: 0, id: S.hinduism }],
            religionEffectCache: new Map(),
            getAdjacentCoords,
            unlockedKnowledgeUpgrades: [THEOCRACY_UPGRADE_ID],
        });
        expect(hinduismResult.effects).toEqual([{ x: 0, y: 0, food: 3, gold: 0, knowledge: 0 }]);

        const conflictBoard = createEmptyBoard();
        const christianity = createInstance(Sym.christianity, 'c1');
        const islam = createInstance(Sym.islam, 'i1');
        conflictBoard[0][0] = christianity;
        conflictBoard[4][3] = islam;
        const conflictResult = computeReligionDeferredEffects({
            board: conflictBoard,
            religionSlots: [
                { x: 0, y: 0, id: S.christianity },
                { x: 4, y: 3, id: S.islam },
            ],
            religionEffectCache: new Map(),
            getAdjacentCoords,
            unlockedKnowledgeUpgrades: [THEOCRACY_UPGRADE_ID],
        });
        expect(conflictResult.effects).toEqual([]);
        expect(christianity.is_marked_for_destruction).toBe(true);
        expect(islam.is_marked_for_destruction).toBe(true);
    });

    it('blocks Hinduism when any duplicate symbol is on the board', () => {
        const board = createEmptyBoard();
        board[0][0] = createInstance(Sym.hinduism, 'hinduism');
        board[1][0] = createInstance(Sym.wheat, 'wheat_1');
        board[2][0] = createInstance(Sym.wheat, 'wheat_2');

        const result = computeReligionDeferredEffects({
            board,
            religionSlots: [{ x: 0, y: 0, id: S.hinduism }],
            religionEffectCache: new Map(),
            getAdjacentCoords,
        });

        expect(result.effects).toEqual([]);
        expect(result.foodDelta).toBe(0);
    });

    it('destroys religion symbols when another religion is on the board', () => {
        const board = createEmptyBoard();
        const christianity = createInstance(Sym.christianity, 'christianity');
        const islam = createInstance(Sym.islam, 'islam');
        board[1][1] = christianity;
        board[2][2] = islam;
        board[3][2] = createInstance(Sym.library, 'library');

        const cache = new Map([
            [slotKey(3, 2), { food: 0, gold: 0, knowledge: 5 }],
        ]);

        const result = computeReligionDeferredEffects({
            board,
            religionSlots: [
                { x: 1, y: 1, id: S.christianity },
                { x: 2, y: 2, id: S.islam },
            ],
            religionEffectCache: cache,
            getAdjacentCoords,
        });

        expect(result.effects).toEqual([]);
        expect(result.foodDelta).toBe(0);
        expect(result.goldDelta).toBe(0);
        expect(result.knowledgeDelta).toBe(0);
        expect(christianity.is_marked_for_destruction).toBe(true);
        expect(islam.is_marked_for_destruction).toBe(true);
    });

    it('uses deferred religion recalculation to destroy Buddhism conflicts without adding food', () => {
        const board = createEmptyBoard();
        const buddhism = createInstance(Sym.buddhism, 'buddhism');
        const christianity = createInstance(Sym.christianity, 'christianity');
        board[0][1] = buddhism;
        board[4][3] = christianity;

        const result = computeReligionDeferredEffects({
            board,
            religionSlots: [
                { x: 0, y: 1, id: S.buddhism },
                { x: 4, y: 3, id: S.christianity },
            ],
            religionEffectCache: new Map(),
            getAdjacentCoords,
        });

        expect(result.effects).toEqual([]);
        expect(result.foodDelta).toBe(0);
        expect(buddhism.is_marked_for_destruction).toBe(true);
        expect(christianity.is_marked_for_destruction).toBe(true);
    });

    it('destroys matching religion symbols when two or more religion symbols are on the board', () => {
        const board = createEmptyBoard();
        const christianityA = createInstance(Sym.christianity, 'christianity_a');
        const christianityB = createInstance(Sym.christianity, 'christianity_b');
        board[1][1] = christianityA;
        board[2][2] = christianityB;

        const result = computeReligionDeferredEffects({
            board,
            religionSlots: [
                { x: 1, y: 1, id: S.christianity },
                { x: 2, y: 2, id: S.christianity },
            ],
            religionEffectCache: new Map(),
            getAdjacentCoords,
        });

        expect(result.effects).toEqual([]);
        expect(christianityA.is_marked_for_destruction).toBe(true);
        expect(christianityB.is_marked_for_destruction).toBe(true);
    });

    it('builds food totals by slot and applies deferred merchant gold from the highest adjacent food producer', () => {
        const board = createEmptyBoard();
        const merchant = createInstance(Sym.merchant, 'merchant');
        merchant.merchant_store_pending = true;
        merchant.stored_gold = 1;
        board[1][1] = merchant;
        board[0][1] = createInstance(Sym.wheat, 'left');
        board[2][1] = createInstance(Sym.rice, 'right');
        board[4][3] = createInstance(Sym.corn, 'distant');

        const foodBySlotKey = buildFoodBySlotKey([
            { x: 0, y: 1, food: -2, gold: 0, knowledge: 0 },
            { x: 2, y: 1, food: 4, gold: 0, knowledge: 0 },
            { x: 2, y: 1, food: 3, gold: 0, knowledge: 0 },
            { x: 4, y: 3, food: 12, gold: 0, knowledge: 0 },
        ]);

        const result = computeMerchantDeferredEffects({
            board,
            width: 5,
            height: 4,
            foodBySlotKey,
            getAdjacentCoords,
        });

        expect(foodBySlotKey.get(slotKey(2, 1))).toBe(7);
        expect(result.effects).toEqual([{ x: 1, y: 1, food: 0, gold: 7, knowledge: 0 }]);
        expect(result.goldDelta).toBe(7);
        expect(merchant.stored_gold).toBe(0);
        expect(merchant.merchant_store_pending).toBe(false);
    });

    it('upgrades merchant to use the highest food on the board with Guild', () => {
        const board = createEmptyBoard();
        const merchant = createInstance(Sym.merchant, 'merchant');
        merchant.merchant_store_pending = true;
        board[1][1] = merchant;
        board[0][1] = createInstance(Sym.wheat, 'left');
        board[2][1] = createInstance(Sym.rice, 'right');
        board[4][3] = createInstance(Sym.corn, 'distant');

        const result = computeMerchantDeferredEffects({
            board,
            width: 5,
            height: 4,
            foodBySlotKey: buildFoodBySlotKey([
                { x: 0, y: 1, food: 3, gold: 0, knowledge: 0 },
                { x: 2, y: 1, food: 8, gold: 0, knowledge: 0 },
                { x: 4, y: 3, food: 11, gold: 0, knowledge: 0 },
            ]),
            getAdjacentCoords,
            unlockedKnowledgeUpgrades: [GUILD_UPGRADE_ID],
        });

        expect(result.effects).toEqual([{ x: 1, y: 1, food: 0, gold: 11, knowledge: 0 }]);
        expect(result.goldDelta).toBe(11);
        expect(merchant.merchant_store_pending).toBe(false);
    });

    it('upgrades corn to produce 4 food with Feudalism', () => {
        const board = createEmptyBoard();
        const corn = createInstance(Sym.corn, 'corn');
        board[0][0] = corn;

        const baseResult = processSingleSymbolEffects(corn, board, 0, 0, { upgrades: [] });
        const upgradedResult = processSingleSymbolEffects(corn, board, 0, 0, { upgrades: [FEUDAL_CORN_UPGRADE_ID] });

        expect(baseResult.food).toBe(2);
        expect(upgradedResult.food).toBe(4);
    });

    it('upgrades salt to produce 2 food per adjacent terrain with Architecture', () => {
        const board = createEmptyBoard();
        const salt = createInstance(Sym.salt, 'salt');
        board[1][1] = salt;
        board[0][0] = createInstance(Sym.grassland, 'grassland');
        board[1][0] = createInstance(Sym.plains, 'plains');
        board[2][2] = createInstance(Sym.forest, 'forest');

        const baseResult = processSingleSymbolEffects(salt, board, 1, 1, { upgrades: [] });
        const upgradedResult = processSingleSymbolEffects(salt, board, 1, 1, { upgrades: [ARCHITECTURE_UPGRADE_ID] });

        expect(baseResult.food).toBe(3);
        expect(upgradedResult.food).toBe(6);
    });

    it('upgrades monument to produce 10 knowledge with Nationalism', () => {
        const board = createEmptyBoard();
        const monument = createInstance(Sym.monument, 'monument');
        board[0][0] = monument;

        const baseResult = processSingleSymbolEffects(monument, board, 0, 0, { upgrades: [] });
        const upgradedResult = processSingleSymbolEffects(monument, board, 0, 0, { upgrades: [NATIONALISM_UPGRADE_ID] });

        expect(baseResult.knowledge).toBe(5);
        expect(upgradedResult.knowledge).toBe(10);
    });

    it('upgrades honey to produce 10 food with Exploration when 5 of the same terrain exist', () => {
        const board = createEmptyBoard();
        const honey = createInstance(Sym.honey, 'honey');
        board[0][0] = honey;
        board[0][1] = createInstance(Sym.forest, 'forest_1');
        board[1][0] = createInstance(Sym.forest, 'forest_2');
        board[1][1] = createInstance(Sym.forest, 'forest_3');
        board[2][0] = createInstance(Sym.forest, 'forest_4');
        board[2][1] = createInstance(Sym.forest, 'forest_5');

        const baseResult = processSingleSymbolEffects(honey, board, 0, 0, { upgrades: [] });
        const upgradedResult = processSingleSymbolEffects(honey, board, 0, 0, { upgrades: [EXPLORATION_UPGRADE_ID] });

        expect(baseResult.food).toBe(5);
        expect(upgradedResult.food).toBe(10);
    });

    it('upgrades spices to produce 3 food per terrain type with Mercantilism', () => {
        const board = createEmptyBoard();
        const spices = createInstance(Sym.spices, 'spices');
        board[0][0] = spices;
        board[0][1] = createInstance(Sym.grassland, 'grassland');
        board[1][0] = createInstance(Sym.plains, 'plains');
        board[1][1] = createInstance(Sym.forest, 'forest');

        const baseResult = processSingleSymbolEffects(spices, board, 0, 0, { upgrades: [] });
        const upgradedResult = processSingleSymbolEffects(spices, board, 0, 0, { upgrades: [MERCANTILISM_UPGRADE_ID] });

        expect(baseResult.food).toBe(3);
        expect(upgradedResult.food).toBe(9);
    });

    it('upgrades horse with Military Science', () => {
        const board = createEmptyBoard();
        const horse = createInstance(Sym.horse, 'horse');
        board[1][1] = horse;
        board[0][1] = createInstance(Sym.plains, 'plains');

        const baseResult = processSingleSymbolEffects(horse, board, 1, 1, { upgrades: [] });
        const upgradedResult = processSingleSymbolEffects(horse, board, 1, 1, { upgrades: [MILITARY_SCIENCE_UPGRADE_ID] });

        expect(baseResult.food).toBe(2);
        expect(baseResult.gold).toBe(2);
        expect(upgradedResult.food).toBe(3);
        expect(upgradedResult.gold).toBe(4);
    });

    it('adds board grassland count to wheat payout with Three-field System', () => {
        const board = createEmptyBoard();
        const wheat = createInstance(Sym.wheat, 'wheat');
        wheat.effect_counter = 9;
        board[0][0] = wheat;
        board[2][3] = createInstance(Sym.grassland, 'grassland_1');
        board[3][3] = createInstance(Sym.grassland, 'grassland_2');
        board[4][3] = createInstance(Sym.grassland, 'grassland_3');

        const result = processSingleSymbolEffects(
            wheat,
            board,
            0,
            0,
            { upgrades: [THREE_FIELD_SYSTEM_UPGRADE_ID] },
        );

        expect(result.food).toBe(13);
        expect(wheat.effect_counter).toBe(0);
    });

    it('marks campfire for destruction immediately', () => {
        const board = createEmptyBoard();
        const campfire = createInstance(Sym.campfire, 'campfire');
        board[0][0] = campfire;

        const result = processSingleSymbolEffects(campfire, board, 0, 0, { upgrades: [] });

        expect(result.food).toBe(0);
        expect(campfire.is_marked_for_destruction).toBe(true);
    });

    it('does not mark tribal village for destruction during slot resolution', () => {
        const board = createEmptyBoard();
        const village = createInstance(Sym.tribal_village, 'tribal_village');
        board[0][0] = village;

        const result = processSingleSymbolEffects(village, board, 0, 0, { upgrades: [] });

        expect(result.addSymbolIds).toBeUndefined();
        expect(village.is_marked_for_destruction).toBe(false);
    });

    it('lets Heqet stack base food with grassland food and gain knowledge from wheat adjacency once each', () => {
        const board = createEmptyBoard();
        const heqet = createInstance(Sym.heqet, 'heqet');
        board[1][1] = heqet;
        board[0][1] = createInstance(Sym.grassland, 'grassland_1');
        board[2][1] = createInstance(Sym.grassland, 'grassland_2');
        board[1][0] = createInstance(Sym.wheat, 'wheat_1');
        board[1][2] = createInstance(Sym.wheat, 'wheat_2');

        const result = processSingleSymbolEffects(heqet, board, 1, 1, { upgrades: [] });

        expect(result.food).toBe(3);
        expect(result.knowledge).toBe(2);
    });

    it('lets Foxtail Millet gain food per two adjacent terrain symbols', () => {
        const board = createEmptyBoard();
        const millet = createInstance(Sym.foxtail_millet, 'foxtail_millet');
        board[1][1] = millet;
        board[0][1] = createInstance(Sym.grassland, 'grassland');
        board[2][1] = createInstance(Sym.plains, 'plains');
        board[1][0] = createInstance(Sym.sea, 'sea');
        board[1][2] = createInstance(Sym.wheat, 'wheat');

        const result = processSingleSymbolEffects(millet, board, 1, 1, { upgrades: [] });

        expect(result.food).toBe(5);
        expect(result.contributors).toHaveLength(3);
    });

    it('stores scholar knowledge production per destroyed adjacent ancient symbol', () => {
        const board = createEmptyBoard();
        const scholar = createInstance(Sym.scholar, 'scholar');
        const campfire = createInstance(Sym.campfire, 'campfire');
        const totem = createInstance(Sym.totem, 'totem');
        board[1][1] = scholar;
        board[1][0] = campfire;
        board[2][1] = totem;

        const result = processSingleSymbolEffects(scholar, board, 1, 1, { upgrades: [] });

        expect(result.knowledge).toBe(10);
        expect(scholar.effect_counter).toBe(10);
        expect(campfire.is_marked_for_destruction).toBe(true);
        expect(totem.is_marked_for_destruction).toBe(true);
    });

    it('lets scholar produce knowledge from its stored counter on later turns', () => {
        const board = createEmptyBoard();
        const scholar = createInstance(Sym.scholar, 'scholar');
        scholar.effect_counter = 5;
        board[1][1] = scholar;

        const result = processSingleSymbolEffects(scholar, board, 1, 1, { upgrades: [] });

        expect(result.knowledge).toBe(5);
        expect(scholar.effect_counter).toBe(5);
    });

    it('grants holy relic resources when any religion symbol is on the board', () => {
        const board = createEmptyBoard();
        const relic = createInstance(Sym.holy_relic, 'holy_relic');
        const doctrine = createInstance(Sym.christianity, 'christianity');
        board[1][1] = relic;
        board[4][3] = doctrine;

        const result = processSingleSymbolEffects(relic, board, 1, 1, { upgrades: [] });

        expect(result.knowledge).toBe(7);
        expect(result.gold).toBe(7);
    });

    it('adds board grassland count on top of upgraded crop payout', () => {
        const board = createEmptyBoard();
        const rice = createInstance(Sym.rice, 'rice');
        rice.effect_counter = 19;
        board[0][0] = rice;
        board[2][3] = createInstance(Sym.grassland, 'grassland_1');
        board[3][3] = createInstance(Sym.grassland, 'grassland_2');

        const result = processSingleSymbolEffects(
            rice,
            board,
            0,
            0,
            { upgrades: [AGRICULTURE_UPGRADE_ID, THREE_FIELD_SYSTEM_UPGRADE_ID] },
        );

        expect(result.food).toBe(32);
        expect(rice.effect_counter).toBe(0);
    });

    it('doubles adjacent grassland counter gain with Agricultural Surplus', () => {
        const board = createEmptyBoard();
        const wheat = createInstance(Sym.wheat, 'wheat');
        const rice = createInstance(Sym.rice, 'rice');
        board[0][0] = wheat;
        board[1][0] = createInstance(Sym.grassland, 'grassland_wheat');
        board[4][3] = rice;
        board[3][3] = createInstance(Sym.grassland, 'grassland_rice');

        processSingleSymbolEffects(wheat, board, 0, 0, { upgrades: [AGRICULTURAL_SURPLUS_UPGRADE_ID] });
        processSingleSymbolEffects(rice, board, 4, 3, { upgrades: [AGRICULTURAL_SURPLUS_UPGRADE_ID] });

        expect(wheat.effect_counter).toBe(3);
        expect(rice.effect_counter).toBe(3);
    });

    it('uses board grassland count for crop counter gain with Modern Agriculture', () => {
        const board = createEmptyBoard();
        const wheat = createInstance(Sym.wheat, 'wheat');
        board[0][0] = wheat;
        board[4][2] = createInstance(Sym.grassland, 'grassland_1');
        board[4][3] = createInstance(Sym.grassland, 'grassland_2');

        processSingleSymbolEffects(wheat, board, 0, 0, { upgrades: [MODERN_AGRICULTURE_UPGRADE_ID] });

        expect(wheat.effect_counter).toBe(3);
    });

    it('produces more grassland food with Irrigation and Three-field System', () => {
        const board = createEmptyBoard();
        const grassland = createInstance(Sym.grassland, 'grassland');
        board[0][0] = grassland;

        const baseResult = processSingleSymbolEffects(grassland, board, 0, 0, { upgrades: [] });
        const irrigationResult = processSingleSymbolEffects(grassland, board, 0, 0, { upgrades: [IRRIGATION_UPGRADE_ID] });
        const threeFieldResult = processSingleSymbolEffects(grassland, board, 0, 0, { upgrades: [THREE_FIELD_SYSTEM_UPGRADE_ID] });

        expect(baseResult.food).toBe(2);
        expect(irrigationResult.food).toBe(3);
        expect(threeFieldResult.food).toBe(5);
    });

    it('adds plains counter to plains food production', () => {
        const board = createEmptyBoard();
        const plains = createInstance(Sym.plains, 'plains');
        plains.effect_counter = 3;
        board[0][0] = plains;

        const result = processSingleSymbolEffects(plains, board, 0, 0, { upgrades: [] });

        expect(result.food).toBe(4);
    });

    it('produces four knowledge per four empty slots for Stargazer', () => {
        const board = createEmptyBoard();
        const stargazer = createInstance(Sym.stargazer, 'stargazer');
        board[0][0] = stargazer;

        const result = processSingleSymbolEffects(stargazer, board, 0, 0, { upgrades: [] });

        expect(result.knowledge).toBe(16);
    });

    it('gives Stone Tablet 2 knowledge per owned relic', () => {
        const board = createEmptyBoard();
        const tablet = createInstance(Sym.stone_tablet, 'tablet');
        board[0][0] = tablet;

        const result = processSingleSymbolEffects(
            tablet,
            board,
            0,
            0,
            { upgrades: [] },
            { ...DEFAULT_RELIC_EFFECTS, relicCount: 4 },
        );

        expect(result).toMatchObject({ food: 0, gold: 0, knowledge: 8 });
    });

    it('produces food per two adjacent empty slots by default for Oasis', () => {
        const board = createEmptyBoard();
        const oasis = createInstance(Sym.oasis, 'oasis');
        board[1][1] = oasis;
        board[0][1] = createInstance(Sym.wheat, 'occupied_1');
        board[1][0] = createInstance(Sym.rice, 'occupied_2');

        const result = processSingleSymbolEffects(
            oasis,
            board,
            1,
            1,
            { upgrades: [] },
        );

        expect(result.food).toBe(6);
    });

    it('upgrades Oasis to produce food per two adjacent empty slots with Dry Storage', () => {
        const board = createEmptyBoard();
        const oasis = createInstance(Sym.oasis, 'oasis');
        board[1][1] = oasis;
        board[0][1] = createInstance(Sym.wheat, 'occupied_1');
        board[1][0] = createInstance(Sym.rice, 'occupied_2');

        const result = processSingleSymbolEffects(
            oasis,
            board,
            1,
            1,
            { upgrades: [DESERT_STORAGE_UPGRADE_ID] },
        );

        expect(result.food).toBe(12);
    });

    it('upgrades Oasis to produce food per two adjacent empty slots with Oasis Recovery Network', () => {
        const board = createEmptyBoard();
        const oasis = createInstance(Sym.oasis, 'oasis');
        board[1][1] = oasis;
        board[0][1] = createInstance(Sym.wheat, 'occupied_1');
        board[1][0] = createInstance(Sym.rice, 'occupied_2');

        const result = processSingleSymbolEffects(
            oasis,
            board,
            1,
            1,
            { upgrades: [OASIS_RECOVERY_UPGRADE_ID] },
        );

        expect(result.food).toBe(18);
    });

    it('upgrades Desert to destroy all adjacent normal and era symbols with Dry Storage', () => {
        const board = createEmptyBoard();
        const desert = createInstance(Sym.desert, 'desert');
        const wheat = createInstance(Sym.wheat, 'wheat');
        const library = createInstance(Sym.library, 'library');
        const papyrus = createInstance(Sym.papyrus, 'papyrus');
        const caravanserai = createInstance(Sym.caravanserai, 'caravanserai');
        const flood = createInstance(Sym.flood, 'flood');
        board[1][1] = desert;
        board[0][1] = wheat;
        board[1][0] = papyrus;
        board[2][1] = library;
        board[0][0] = caravanserai;
        board[2][2] = flood;

        const result = processSingleSymbolEffects(
            desert,
            board,
            1,
            1,
            { upgrades: [DESERT_STORAGE_UPGRADE_ID] },
        );

        expect(result.food).toBe(60);
        expect(result.gold).toBe(2);
        expect(wheat.is_marked_for_destruction).toBe(true);
        expect(papyrus.is_marked_for_destruction).toBe(true);
        expect(library.is_marked_for_destruction).toBe(true);
        expect(caravanserai.is_marked_for_destruction).toBe(false);
        expect(flood.is_marked_for_destruction).toBe(false);
    });

    it('upgrades Desert to destroy all board normal and era symbols with Oasis Recovery Network', () => {
        const board = createEmptyBoard();
        const desert = createInstance(Sym.desert, 'desert');
        const wheat = createInstance(Sym.wheat, 'wheat');
        const library = createInstance(Sym.library, 'library');
        const papyrus = createInstance(Sym.papyrus, 'papyrus');
        const caravanserai = createInstance(Sym.caravanserai, 'caravanserai');
        const flood = createInstance(Sym.flood, 'flood');
        board[1][1] = desert;
        board[0][0] = wheat;
        board[4][3] = papyrus;
        board[3][1] = library;
        board[0][1] = caravanserai;
        board[2][2] = flood;

        const result = processSingleSymbolEffects(
            desert,
            board,
            1,
            1,
            { upgrades: [OASIS_RECOVERY_UPGRADE_ID] },
        );

        expect(result.food).toBe(90);
        expect(result.gold).toBe(5);
        expect(wheat.is_marked_for_destruction).toBe(true);
        expect(papyrus.is_marked_for_destruction).toBe(true);
        expect(library.is_marked_for_destruction).toBe(true);
        expect(caravanserai.is_marked_for_destruction).toBe(false);
        expect(flood.is_marked_for_destruction).toBe(false);
    });

    it('produces base gold and knowledge for Dye and Papyrus', () => {
        const board = createEmptyBoard();
        const dye = createInstance(Sym.dye, 'dye');
        const papyrus = createInstance(Sym.papyrus, 'papyrus');
        board[0][0] = dye;
        board[1][0] = papyrus;

        const dyeResult = processSingleSymbolEffects(dye, board, 0, 0, { upgrades: [] });
        const papyrusResult = processSingleSymbolEffects(papyrus, board, 1, 0, { upgrades: [] });

        expect(dyeResult.gold).toBe(1);
        expect(papyrusResult.knowledge).toBe(1);
    });

    it('makes Library produce knowledge per adjacent symbol and double with Education', () => {
        const board = createEmptyBoard();
        const library = createInstance(Sym.library, 'library');
        board[1][1] = library;
        board[0][1] = createInstance(Sym.wheat, 'wheat');
        board[1][0] = createInstance(Sym.rice, 'rice');
        board[2][2] = createInstance(Sym.stone, 'stone');

        const baseResult = processSingleSymbolEffects(library, board, 1, 1, { upgrades: [] });
        const educationResult = processSingleSymbolEffects(library, board, 1, 1, { upgrades: [EDUCATION_UPGRADE_ID] });

        expect(baseResult.knowledge).toBe(3);
        expect(baseResult.contributors).toEqual([{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 2 }]);
        expect(educationResult.knowledge).toBe(6);
        expect(educationResult.contributors).toEqual([{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 2 }]);
    });

    it('makes Stone produce base Gold and same-column Mountain bonus, upgraded by Mining', () => {
        const board = createEmptyBoard();
        const stone = createInstance(Sym.stone, 'stone');
        const isolatedStone = createInstance(Sym.stone, 'isolated_stone');
        board[1][0] = isolatedStone;
        board[2][0] = stone;
        board[2][3] = createInstance(Sym.mountain, 'mountain');

        const isolatedBaseResult = processSingleSymbolEffects(isolatedStone, board, 1, 0, { upgrades: [] });
        const isolatedMiningResult = processSingleSymbolEffects(isolatedStone, board, 1, 0, { upgrades: [MINING_UPGRADE_ID] });
        const baseResult = processSingleSymbolEffects(stone, board, 2, 0, { upgrades: [] });
        const miningResult = processSingleSymbolEffects(stone, board, 2, 0, { upgrades: [MINING_UPGRADE_ID] });

        expect(isolatedBaseResult.gold).toBe(1);
        expect(isolatedMiningResult.gold).toBe(2);
        expect(baseResult.gold).toBe(3);
        expect(miningResult.gold).toBe(6);
    });

    it('makes Mason Guild Stone use any Mountain on the board for its bonus', () => {
        const board = createEmptyBoard();
        const stone = createInstance(Sym.stone, 'stone');
        board[0][0] = stone;
        board[4][3] = createInstance(Sym.mountain, 'mountain');

        const result = processSingleSymbolEffects(stone, board, 0, 0, { upgrades: [MASON_GUILD_UPGRADE_ID] });

        expect(result.gold).toBe(6);
        expect(result.contributors).toEqual([{ x: 4, y: 3 }]);
    });

    it('makes Library produce knowledge per board symbol with Scientific Theory', () => {
        const board = createEmptyBoard();
        const library = createInstance(Sym.library, 'library');
        board[1][1] = library;
        board[0][1] = createInstance(Sym.wheat, 'wheat');
        board[1][0] = createInstance(Sym.rice, 'rice');
        board[2][2] = createInstance(Sym.stone, 'stone');
        board[4][3] = createInstance(Sym.fish, 'fish');

        const result = processSingleSymbolEffects(library, board, 1, 1, { upgrades: [EDUCATION_UPGRADE_ID, SCIENTIFIC_THEORY_UPGRADE_ID] });

        expect(result.knowledge).toBe(10);
        expect(result.contributors).toEqual([
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 2, y: 2 },
            { x: 4, y: 3 },
        ]);
    });

    it('applies tiered fish and pearl effects from board-wide sea counts', () => {
        const board = createEmptyBoard();
        const fish = createInstance(Sym.fish, 'fish');
        const pearl = createInstance(Sym.pearl, 'pearl');
        board[0][0] = fish;
        board[4][3] = pearl;
        board[2][1] = createInstance(Sym.sea, 'sea');

        const fishResult = processSingleSymbolEffects(fish, board, 0, 0, { upgrades: [] });
        const pearlResult = processSingleSymbolEffects(pearl, board, 4, 3, { upgrades: [] });

        expect(fishResult.food).toBe(1);
        expect(fishResult.contributors).toEqual([{ x: 2, y: 1 }]);
        expect(pearlResult.gold).toBe(2);
        expect(pearlResult.contributors).toEqual([{ x: 2, y: 1 }]);

        board[1][2] = createInstance(Sym.sea, 'sea_2');
        board[3][1] = createInstance(Sym.sea, 'sea_3');

        const fishThreeSeas = processSingleSymbolEffects(fish, board, 0, 0, { upgrades: [] });
        const pearlThreeSeas = processSingleSymbolEffects(pearl, board, 4, 3, { upgrades: [] });

        expect(fishThreeSeas.food).toBe(4);
        expect(pearlThreeSeas.gold).toBe(5);
    });

    it('applies tiered crab rewards and keeps seafaring as a food upgrade', () => {
        const board = createEmptyBoard();
        const crab = createInstance(Sym.crab, 'crab');
        board[0][0] = crab;
        board[1][1] = createInstance(Sym.sea, 'sea_1');

        const oneSeaResult = processSingleSymbolEffects(crab, board, 0, 0, { upgrades: [] });
        expect(oneSeaResult.food).toBe(1);
        expect(oneSeaResult.gold).toBe(1);

        board[3][2] = createInstance(Sym.sea, 'sea_2');
        const baseResult = processSingleSymbolEffects(crab, board, 0, 0, { upgrades: [] });
        const upgradedResult = processSingleSymbolEffects(
            crab,
            board,
            0,
            0,
            { upgrades: [SEAFARING_UPGRADE_ID] },
        );

        expect(baseResult.food).toBe(2);
        expect(baseResult.gold).toBe(2);
        expect(baseResult.contributors).toEqual([{ x: 1, y: 1 }, { x: 3, y: 2 }]);
        expect(upgradedResult.food).toBe(3);
        expect(upgradedResult.gold).toBe(2);
    });

    it('upgrades pearl gold with celestial navigation on top of the tiered sea counts', () => {
        const board = createEmptyBoard();
        const pearl = createInstance(Sym.pearl, 'pearl');
        board[1][0] = pearl;
        board[4][2] = createInstance(Sym.sea, 'sea');

        const result = processSingleSymbolEffects(
            pearl,
            board,
            1,
            0,
            { upgrades: [CELESTIAL_NAVIGATION_UPGRADE_ID] },
        );

        expect(result.gold).toBe(4);
        expect(result.contributors).toEqual([{ x: 4, y: 2 }]);
    });

    it('applies tiered compass knowledge from board-wide sea counts', () => {
        const board = createEmptyBoard();
        const compass = createInstance(Sym.compass, 'compass');
        board[0][0] = compass;
        board[2][1] = createInstance(Sym.sea, 'sea_1');

        const oneSeaResult = processSingleSymbolEffects(compass, board, 0, 0, { upgrades: [] });
        expect(oneSeaResult.knowledge).toBe(5);
        expect(oneSeaResult.contributors).toEqual([{ x: 2, y: 1 }]);

        board[1][2] = createInstance(Sym.sea, 'sea_2');
        board[3][1] = createInstance(Sym.sea, 'sea_3');

        const threeSeasResult = processSingleSymbolEffects(compass, board, 0, 0, { upgrades: [] });
        expect(threeSeasResult.knowledge).toBe(15);
        expect(threeSeasResult.contributors).toEqual([{ x: 1, y: 2 }, { x: 2, y: 1 }, { x: 3, y: 1 }]);
    });

    it('treats each sea as two placed seas when Shipbuilding is unlocked', () => {
        const board = createEmptyBoard();
        const fish = createInstance(Sym.fish, 'fish');
        const pearl = createInstance(Sym.pearl, 'pearl');
        const compass = createInstance(Sym.compass, 'compass');
        board[0][0] = fish;
        board[1][0] = pearl;
        board[2][0] = compass;
        board[4][3] = createInstance(Sym.sea, 'sea');

        const fishResult = processSingleSymbolEffects(
            fish,
            board,
            0,
            0,
            { upgrades: [SHIPBUILDING_UPGRADE_ID] },
        );
        const pearlResult = processSingleSymbolEffects(
            pearl,
            board,
            1,
            0,
            { upgrades: [SHIPBUILDING_UPGRADE_ID] },
        );
        const compassResult = processSingleSymbolEffects(
            compass,
            board,
            2,
            0,
            { upgrades: [SHIPBUILDING_UPGRADE_ID] },
        );

        expect(fishResult.food).toBe(2);
        expect(pearlResult.gold).toBe(3);
        expect(compassResult.knowledge).toBe(10);
    });

    it('overrides fish and crab with Fishery Guild values', () => {
        const board = createEmptyBoard();
        const fish = createInstance(Sym.fish, 'fish');
        const crab = createInstance(Sym.crab, 'crab');
        board[0][0] = fish;
        board[1][0] = crab;
        board[2][1] = createInstance(Sym.sea, 'sea_1');
        board[3][1] = createInstance(Sym.sea, 'sea_2');
        board[4][1] = createInstance(Sym.sea, 'sea_3');

        const fishResult = processSingleSymbolEffects(
            fish,
            board,
            0,
            0,
            { upgrades: [SEAFARING_UPGRADE_ID, FISHERY_GUILD_UPGRADE_ID] },
        );
        const crabResult = processSingleSymbolEffects(
            crab,
            board,
            1,
            0,
            { upgrades: [SEAFARING_UPGRADE_ID, FISHERY_GUILD_UPGRADE_ID] },
        );

        expect(fishResult.food).toBe(10);
        expect(crabResult.food).toBe(5);
        expect(crabResult.gold).toBe(5);
    });

    it('upgrades pearl and sea further with Maritime Trade', () => {
        const board = createEmptyBoard();
        const pearl = createInstance(Sym.pearl, 'pearl');
        const sea = createInstance(Sym.sea, 'sea');
        board[0][0] = pearl;
        board[1][0] = sea;
        board[2][1] = createInstance(Sym.sea, 'sea_2');
        board[0][1] = createInstance(Sym.wheat, 'wheat');
        board[1][1] = createInstance(Sym.rice, 'rice');
        board[2][0] = createInstance(Sym.stone, 'stone');

        const pearlResult = processSingleSymbolEffects(
            pearl,
            board,
            0,
            0,
            { upgrades: [CELESTIAL_NAVIGATION_UPGRADE_ID, MARITIME_TRADE_UPGRADE_ID] },
        );
        const seaResult = processSingleSymbolEffects(
            sea,
            board,
            1,
            0,
            { upgrades: [CELESTIAL_NAVIGATION_UPGRADE_ID, MARITIME_TRADE_UPGRADE_ID] },
        );

        expect(pearlResult.gold).toBe(7);
        expect(seaResult.gold).toBe(2);
    });

    it('applies Oceanic Routes as the highest tier for fish crab pearl and sea', () => {
        const board = createEmptyBoard();
        const fish = createInstance(Sym.fish, 'fish');
        const crab = createInstance(Sym.crab, 'crab');
        const pearl = createInstance(Sym.pearl, 'pearl');
        const sea = createInstance(Sym.sea, 'sea');
        board[0][0] = fish;
        board[1][0] = crab;
        board[2][0] = pearl;
        board[3][0] = sea;
        board[4][3] = createInstance(Sym.sea, 'sea_2');
        board[4][2] = createInstance(Sym.sea, 'sea_3');
        board[2][1] = createInstance(Sym.wheat, 'wheat');
        board[3][1] = createInstance(Sym.rice, 'rice');

        const upgrades = [SEAFARING_UPGRADE_ID, FISHERY_GUILD_UPGRADE_ID, CELESTIAL_NAVIGATION_UPGRADE_ID, MARITIME_TRADE_UPGRADE_ID, OCEANIC_ROUTES_UPGRADE_ID];
        const fishResult = processSingleSymbolEffects(fish, board, 0, 0, { upgrades });
        const crabResult = processSingleSymbolEffects(crab, board, 1, 0, { upgrades });
        const pearlResult = processSingleSymbolEffects(pearl, board, 2, 0, { upgrades });
        const seaResult = processSingleSymbolEffects(sea, board, 3, 0, { upgrades });

        expect(fishResult.food).toBe(15);
        expect(crabResult.food).toBe(8);
        expect(crabResult.gold).toBe(8);
        expect(pearlResult.gold).toBe(30);
        expect(seaResult.gold).toBe(3);
    });

    it('upgrades rainforest yields with Tropical Agriculture', () => {
        const board = createEmptyBoard();
        board[1][2] = createInstance(Sym.rainforest, 'rainforest');

        const rainforestResult = processSingleSymbolEffects(
            board[1][2]!,
            board,
            1,
            2,
            { upgrades: [TROPICAL_AGRICULTURE_UPGRADE_ID] },
        );

        expect(rainforestResult.food).toBe(3);
        expect(rainforestResult.gold).toBe(0);
    });

    it('upgrades banana cadence with Plantation', () => {
        const board = createEmptyBoard();
        const banana = createInstance(Sym.banana, 'banana');
        banana.effect_counter = 6;
        board[1][1] = banana;
        board[1][2] = createInstance(Sym.rainforest, 'rainforest');

        const bananaResult = processSingleSymbolEffects(
            banana,
            board,
            1,
            1,
            { upgrades: [PLANTATION_UPGRADE_ID] },
        );

        expect(bananaResult.food).toBe(1);
        expect(banana.banana_permanent_food_bonus).toBe(1);
        expect(banana.effect_counter).toBe(0);
    });

    it('lets Expedition produce one random resource when adjacent to Rainforest', () => {
        const board = createEmptyBoard();
        const expedition = createInstance(Sym.expedition, 'expedition');
        board[1][1] = expedition;
        board[1][2] = createInstance(Sym.rainforest, 'rainforest');

        const randomSpy = vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.6)
            .mockReturnValueOnce(0.8);

        const result = processSingleSymbolEffects(
            expedition,
            board,
            1,
            1,
            { upgrades: [JUNGLE_EXPEDITION_UPGRADE_ID] },
        );

        expect(result.food).toBe(0);
        expect(result.gold).toBe(0);
        expect(result.knowledge).toBe(7);
        expect(result.contributors).toEqual([{ x: 1, y: 2 }]);

        randomSpy.mockRestore();
    });

    it('upgrades Rainforest and Expedition with Tropical Development', () => {
        const board = createEmptyBoard();
        const expedition = createInstance(Sym.expedition, 'expedition');
        const rainforest = createInstance(Sym.rainforest, 'rainforest');
        board[1][1] = expedition;
        board[1][2] = rainforest;

        const randomSpy = vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.0)
            .mockReturnValueOnce(0.4)
            .mockReturnValueOnce(0.9);

        const expeditionResult = processSingleSymbolEffects(
            expedition,
            board,
            1,
            1,
            { upgrades: [TROPICAL_DEVELOPMENT_UPGRADE_ID] },
        );
        const rainforestResult = processSingleSymbolEffects(
            rainforest,
            board,
            1,
            2,
            { upgrades: [TROPICAL_DEVELOPMENT_UPGRADE_ID] },
        );

        expect(expeditionResult.food).toBe(1);
        expect(expeditionResult.gold).toBe(5);
        expect(expeditionResult.knowledge).toBe(10);
        expect(rainforestResult.food).toBe(5);
        expect(rainforestResult.gold).toBe(5);
        expect(rainforestResult.knowledge).toBe(5);

        randomSpy.mockRestore();
    });

    it('applies the new Forest thresholds and unique-terrain bonus', () => {
        const board = createEmptyBoard();
        const forest = createInstance(Sym.forest, 'forest_1');
        board[0][0] = forest;
        board[1][0] = createInstance(Sym.forest, 'forest_2');
        board[2][0] = createInstance(Sym.forest, 'forest_3');
        board[3][0] = createInstance(Sym.forest, 'forest_4');
        board[4][0] = createInstance(Sym.forest, 'forest_5');

        const result = processSingleSymbolEffects(forest, board, 0, 0, { upgrades: [] });

        expect(result.food).toBe(3);
        expect(result.gold).toBe(1);
    });

    it('applies the new Deer and Fur forest-adjacency rules', () => {
        const board = createEmptyBoard();
        const deer = createInstance(Sym.deer, 'deer');
        board[1][1] = deer;
        board[1][2] = createInstance(Sym.forest, 'forest');

        const deerResult = processSingleSymbolEffects(deer, board, 1, 1, { upgrades: [] });
        const fur = createInstance(Sym.fur, 'fur');
        board[0][0] = fur;
        board[3][3] = createInstance(Sym.forest, 'forest_2');
        const furResult = processSingleSymbolEffects(fur, board, 0, 0, { upgrades: [] });

        expect(deerResult.food).toBe(1);
        expect(deerResult.gold).toBe(0);
        expect(deer.is_marked_for_destruction).toBe(false);
        expect(furResult.gold).toBe(2);
        expect(furResult.knowledge).toBe(0);

        const isolatedDeer = createInstance(Sym.deer, 'isolated_deer');
        const isolatedBoard = createEmptyBoard();
        isolatedBoard[0][0] = isolatedDeer;

        processSingleSymbolEffects(isolatedDeer, isolatedBoard, 0, 0, { upgrades: [] });

        expect(isolatedDeer.is_marked_for_destruction).toBe(false);
    });

    it('upgrades Forest with Tracking', () => {
        const board = createEmptyBoard();
        const forest = createInstance(Sym.forest, 'forest_1');
        board[0][0] = forest;
        board[0][1] = createInstance(Sym.forest, 'forest_2');
        board[1][1] = createInstance(Sym.forest, 'forest_3');
        board[2][1] = createInstance(Sym.forest, 'forest_4');
        board[3][1] = createInstance(Sym.forest, 'forest_5');

        const forestResult = processSingleSymbolEffects(
            forest,
            board,
            0,
            0,
            { upgrades: [TRACKING_UPGRADE_ID] },
        );

        expect(forestResult.food).toBe(4);
        expect(forestResult.gold).toBe(2);
    });

    it('upgrades Fur and Deer with Tanning', () => {
        const board = createEmptyBoard();
        const deer = createInstance(Sym.deer, 'deer');
        const fur = createInstance(Sym.fur, 'fur');
        board[1][1] = deer;
        board[0][0] = fur;
        board[1][2] = createInstance(Sym.forest, 'forest_1');
        board[2][1] = createInstance(Sym.forest, 'forest_2');
        board[3][3] = createInstance(Sym.forest, 'forest_3');

        const deerResult = processSingleSymbolEffects(
            deer,
            board,
            1,
            1,
            { upgrades: [TANNING_UPGRADE_ID] },
        );
        const furResult = processSingleSymbolEffects(
            fur,
            board,
            0,
            0,
            { upgrades: [TANNING_UPGRADE_ID] },
        );

        expect(deerResult.food).toBe(4);
        expect(furResult.gold).toBe(3);
    });

    it('upgrades Forest further with Forestry and adds its unique-terrain bonus', () => {
        const board = createEmptyBoard();
        const forest = createInstance(Sym.forest, 'forest_1');
        board[0][0] = forest;
        board[1][0] = createInstance(Sym.forest, 'forest_2');
        board[2][0] = createInstance(Sym.forest, 'forest_3');
        board[3][0] = createInstance(Sym.forest, 'forest_4');
        board[4][0] = createInstance(Sym.forest, 'forest_5');
        board[0][1] = createInstance(Sym.forest, 'forest_6');
        board[1][1] = createInstance(Sym.forest, 'forest_7');

        const result = processSingleSymbolEffects(
            forest,
            board,
            0,
            0,
            { upgrades: [FORESTRY_UPGRADE_ID] },
        );

        expect(result.food).toBe(6);
        expect(result.gold).toBe(3);
        expect(result.knowledge).toBe(0);
    });

    it('upgrades Deer further with Preservation', () => {
        const board = createEmptyBoard();
        const deer = createInstance(Sym.deer, 'deer');
        board[1][1] = deer;
        board[1][2] = createInstance(Sym.forest, 'forest_1');
        board[2][2] = createInstance(Sym.forest, 'forest_2');

        const deerResult = processSingleSymbolEffects(
            deer,
            board,
            1,
            1,
            { upgrades: [PRESERVATION_UPGRADE_ID] },
        );

        expect(deerResult.food).toBe(6);
    });

    it('upgrades Loot into Greater Loot when adjacent to another Loot', () => {
        const board = createEmptyBoard();
        const lootA = createInstance(Sym.loot, 'loot_a');
        const lootB = createInstance(Sym.loot, 'loot_b');
        board[1][1] = lootA;
        board[2][1] = lootB;

        const result = processSingleSymbolEffects(
            lootA,
            board,
            1,
            1,
            { upgrades: [] },
        );

        expect(result.lootMerge).toEqual({
            absorbed: { x: 2, y: 1 },
            receiver: { x: 1, y: 1 },
            nextDefinitionId: Sym.greater_loot.id,
        });
        commitLootMerge(board, result.lootMerge!);
        expect(lootA.definition.id).toBe(Sym.greater_loot.id);
        expect(lootB.is_marked_for_destruction).toBe(true);
        expect(lootB.suppress_destroy_overlay).toBe(true);
    });

    it('upgrades Greater Loot into Radiant Loot when adjacent to another Greater Loot', () => {
        const board = createEmptyBoard();
        const lootA = createInstance(Sym.greater_loot, 'greater_loot_a');
        const lootB = createInstance(Sym.greater_loot, 'greater_loot_b');
        board[1][1] = lootA;
        board[2][1] = lootB;

        const result = processSingleSymbolEffects(
            lootA,
            board,
            1,
            1,
            { upgrades: [] },
        );

        expect(result.lootMerge).toEqual({
            absorbed: { x: 2, y: 1 },
            receiver: { x: 1, y: 1 },
            nextDefinitionId: Sym.radiant_loot.id,
        });
        commitLootMerge(board, result.lootMerge!);

        expect(lootA.definition.id).toBe(Sym.radiant_loot.id);
        expect(lootB.is_marked_for_destruction).toBe(true);
        expect(lootB.suppress_destroy_overlay).toBe(true);
    });

    it('lets Honey pay out when five of the same terrain are on the board', () => {
        const board = createEmptyBoard();
        const honey = createInstance(Sym.honey, 'honey');
        board[0][0] = honey;
        board[0][1] = createInstance(Sym.forest, 'forest_1');
        board[1][1] = createInstance(Sym.forest, 'forest_2');
        board[2][1] = createInstance(Sym.forest, 'forest_3');
        board[3][1] = createInstance(Sym.forest, 'forest_4');
        board[4][1] = createInstance(Sym.forest, 'forest_5');

        const result = processSingleSymbolEffects(honey, board, 0, 0, { upgrades: [] });

        expect(result.food).toBe(5);
        expect(honey.is_marked_for_destruction).toBe(false);
    });
});
