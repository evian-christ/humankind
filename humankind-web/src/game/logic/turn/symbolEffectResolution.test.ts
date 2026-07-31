import { describe, expect, it, vi } from 'vitest';
import { S, SYMBOLS, Sym, type SymbolDefinition } from '../../data/symbolDefinitions';
import { SEAL_RELIC_IDS } from '../relics/relicClassification';
import {
    AGRICULTURE_UPGRADE_ID,
    AGRICULTURAL_SURPLUS_UPGRADE_ID,
    CASTLE_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    DESERT_STORAGE_UPGRADE_ID,
    EDUCATION_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FISHERY_GUILD_UPGRADE_ID,
    FORESTRY_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    GUILD_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    JUNGLE_EXPEDITION_UPGRADE_ID,
    MARITIME_TRADE_UPGRADE_ID,
    MILITARY_SCIENCE_UPGRADE_ID,
    MODERN_AGRICULTURE_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    OCEANIC_ROUTES_UPGRADE_ID,
    OASIS_RECOVERY_UPGRADE_ID,
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
    it('produces nothing on its own since sea is a reference-only terrain', () => {
        const board = createEmptyBoard();
        const sea = createInstance(Sym.sea, 'sea');
        board[2][2] = sea;
        getAdjacentCoords(2, 2).slice(0, 6).forEach(({ x, y }, index) => {
            board[x][y] = createInstance(Sym.wheat, `adjacent_${index}`);
        });

        const result = processSingleSymbolEffects(sea, board, 2, 2, { upgrades: [] });
        expect(result.gold).toBe(0);
        expect(result.food).toBe(0);
        expect(result.knowledge).toBe(0);
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

    it('lets Militia produce military and expire after five turns', () => {
        const board = createEmptyBoard();
        const militia = createInstance(Sym.militia, 'militia');
        board[1][1] = militia;

        for (let i = 1; i <= 4; i++) {
            const result = processSingleSymbolEffects(militia, board, 1, 1, { upgrades: [] });
            expect(result).toMatchObject({ food: 0, gold: 0, knowledge: 0, military: 3 });
            expect(militia.effect_counter).toBe(i);
            expect(militia.is_marked_for_destruction).toBe(false);
        }

        const fifth = processSingleSymbolEffects(militia, board, 1, 1, { upgrades: [] });
        expect(fifth).toMatchObject({ food: 0, gold: 0, knowledge: 0, military: 3 });
        expect(militia.effect_counter).toBe(5);
        expect(militia.is_marked_for_destruction).toBe(true);
    });

    it('lets Warrior and Archer produce military with Archer terrain adjacency bonus', () => {
        const board = createEmptyBoard();
        const warrior = createInstance(Sym.warrior, 'warrior');
        const archer = createInstance(Sym.archer, 'archer');
        board[1][1] = warrior;
        board[3][1] = archer;

        expect(processSingleSymbolEffects(warrior, board, 1, 1, { upgrades: [] })).toMatchObject({
            food: 0,
            gold: 0,
            knowledge: 0,
            military: 2,
        });
        expect(processSingleSymbolEffects(archer, board, 3, 1, { upgrades: [] })).toMatchObject({
            food: 0,
            gold: 0,
            knowledge: 0,
            military: 1,
        });

        board[2][1] = createInstance(Sym.forest, 'forest');
        expect(processSingleSymbolEffects(archer, board, 3, 1, { upgrades: [] })).toMatchObject({
            food: 0,
            gold: 0,
            knowledge: 0,
            military: 3,
        });
    });

    it('lets Horseman and Mercenary produce military with their costs and board enemy bonus', () => {
        const board = createEmptyBoard();
        const horseman = createInstance(Sym.horseman, 'horseman');
        const mercenary = createInstance(Sym.mercenary, 'mercenary');
        board[1][1] = horseman;
        board[3][1] = mercenary;

        expect(processSingleSymbolEffects(horseman, board, 1, 1, { upgrades: [] })).toMatchObject({
            food: 0,
            gold: 0,
            knowledge: 0,
            military: 1,
        });
        expect(processSingleSymbolEffects(mercenary, board, 3, 1, { upgrades: [] })).toMatchObject({
            food: 0,
            gold: -2,
            knowledge: 0,
            military: 4,
        });

        board[0][0] = createInstance(Sym.enemy_warrior, 'enemy');
        expect(processSingleSymbolEffects(horseman, board, 1, 1, { upgrades: [] })).toMatchObject({
            food: 0,
            gold: 0,
            knowledge: 0,
            military: 5,
        });
    });

    it('upgrades Mountain production in the Medieval and Modern Ages', () => {
        const board = createEmptyBoard();
        const mountain = createInstance(Sym.mountain, 'mountain');
        board[1][1] = mountain;

        const baseResult = processSingleSymbolEffects(mountain, board, 1, 1, { upgrades: [] });
        const medievalResult = processSingleSymbolEffects(mountain, board, 1, 1, {
            upgrades: [FEUDALISM_UPGRADE_ID],
        });
        const modernResult = processSingleSymbolEffects(mountain, board, 1, 1, {
            upgrades: [FEUDALISM_UPGRADE_ID, MODERN_AGE_UPGRADE_ID],
        });

        expect(baseResult).toMatchObject({ food: 2, gold: 0, knowledge: 2 });
        expect(medievalResult).toMatchObject({ food: 5, gold: 0, knowledge: 5 });
        expect(modernResult).toMatchObject({ food: 10, gold: 0, knowledge: 10 });
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

    it('destroys a random adjacent symbol without producing anything for base Desert', () => {
        const board = createEmptyBoard();
        const desert = createInstance(Sym.desert, 'desert');
        const wheat = createInstance(Sym.wheat, 'wheat');
        board[1][1] = desert;
        board[0][1] = wheat;

        vi.spyOn(Math, 'random').mockReturnValue(0);
        const result = processSingleSymbolEffects(desert, board, 1, 1, { upgrades: [] });

        expect(result).toMatchObject({ food: 0, gold: 0, knowledge: 0 });
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
        board[4][3] = createInstance(Sym.honey, 'distant');

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
        board[4][3] = createInstance(Sym.honey, 'distant');

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

    it('doubles same-row grassland counter gain with Agricultural Surplus', () => {
        const board = createEmptyBoard();
        const wheat = createInstance(Sym.wheat, 'wheat');
        const rice = createInstance(Sym.rice, 'rice');
        board[0][0] = wheat;
        board[1][0] = createInstance(Sym.grassland, 'grassland_wheat');
        board[4][3] = rice;
        board[0][3] = createInstance(Sym.grassland, 'grassland_rice');

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

    it('produces food per adjacent empty slot by default for Oasis', () => {
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

    it('counts an odd number of adjacent empty slots for Oasis', () => {
        const board = createEmptyBoard();
        const oasis = createInstance(Sym.oasis, 'oasis');
        board[1][1] = oasis;
        board[0][1] = createInstance(Sym.wheat, 'occupied_1');
        board[1][0] = createInstance(Sym.rice, 'occupied_2');
        board[2][1] = createInstance(Sym.wheat, 'occupied_3');

        const result = processSingleSymbolEffects(
            oasis,
            board,
            1,
            1,
            { upgrades: [] },
        );

        // 인접 8칸 중 3칸이 차 있어 빈칸 5개 → 식량 5 (2개 단위 반올림 없음).
        expect(result.food).toBe(5);
    });

    it('upgrades Oasis to produce food per adjacent empty slot with Dry Storage', () => {
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

    it('upgrades Oasis to produce food per adjacent empty slot with Oasis Recovery Network', () => {
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

        expect(result.food).toBe(40);
        expect(result.gold).toBe(2);
        expect(wheat.is_marked_for_destruction).toBe(true);
        expect(papyrus.is_marked_for_destruction).toBe(true);
        expect(library.is_marked_for_destruction).toBe(false);
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

        expect(result.food).toBe(60);
        expect(result.gold).toBe(5);
        expect(wheat.is_marked_for_destruction).toBe(true);
        expect(papyrus.is_marked_for_destruction).toBe(true);
        expect(library.is_marked_for_destruction).toBe(false);
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
        board[2][2] = createInstance(Sym.honey, 'honey');

        const baseResult = processSingleSymbolEffects(library, board, 1, 1, { upgrades: [] });
        const educationResult = processSingleSymbolEffects(library, board, 1, 1, { upgrades: [EDUCATION_UPGRADE_ID] });

        expect(baseResult.knowledge).toBe(3);
        expect(baseResult.contributors).toEqual([{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 2 }]);
        expect(educationResult.knowledge).toBe(6);
        expect(educationResult.contributors).toEqual([{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 2 }]);
    });

    it('makes Library produce knowledge per board symbol with Scientific Theory', () => {
        const board = createEmptyBoard();
        const library = createInstance(Sym.library, 'library');
        board[1][1] = library;
        board[0][1] = createInstance(Sym.wheat, 'wheat');
        board[1][0] = createInstance(Sym.rice, 'rice');
        board[2][2] = createInstance(Sym.honey, 'honey');
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

    it('applies tiered pearl effects from board-wide sea counts', () => {
        const board = createEmptyBoard();
        const pearl = createInstance(Sym.pearl, 'pearl');
        board[4][3] = pearl;
        board[2][1] = createInstance(Sym.sea, 'sea');

        const pearlResult = processSingleSymbolEffects(pearl, board, 4, 3, { upgrades: [] });

        expect(pearlResult.gold).toBe(1);
        expect(pearlResult.contributors).toEqual([{ x: 2, y: 1 }]);

        board[1][2] = createInstance(Sym.sea, 'sea_2');
        board[3][1] = createInstance(Sym.sea, 'sea_3');

        const pearlThreeSeas = processSingleSymbolEffects(pearl, board, 4, 3, { upgrades: [] });

        expect(pearlThreeSeas.gold).toBe(3);
    });

    it('gives fish +2 food per adjacent Coast and ignores Ocean', () => {
        const board = createEmptyBoard();
        const fish = createInstance(Sym.fish, 'fish');
        // 5x4 보드에서 안쪽(해양)은 x=1..3, y=1..2. 그 외는 가장자리(해안).
        board[1][0] = fish;
        board[0][0] = createInstance(Sym.sea, 'coast_1'); // 가장자리 -> 해안
        board[2][0] = createInstance(Sym.sea, 'coast_2'); // 가장자리 -> 해안
        board[1][1] = createInstance(Sym.sea, 'ocean_1'); // 안쪽 -> 해양

        const result = processSingleSymbolEffects(fish, board, 1, 0, { upgrades: [] });

        // 인접 해안 2개 x 2 = 4. 인접한 해양은 세지 않음.
        expect(result.food).toBe(4);
        expect(result.contributors).toEqual([{ x: 0, y: 0 }, { x: 2, y: 0 }]);
    });

    it('gives fish nothing when only Ocean is adjacent', () => {
        const board = createEmptyBoard();
        const fish = createInstance(Sym.fish, 'fish');
        board[2][2] = fish;
        board[2][1] = createInstance(Sym.sea, 'ocean_1'); // 안쪽 -> 해양

        const result = processSingleSymbolEffects(fish, board, 2, 2, { upgrades: [] });

        expect(result.food).toBe(0);
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

        expect(result.gold).toBe(1);
        expect(result.contributors).toEqual([{ x: 4, y: 2 }]);
    });

    it.each([
        { name: 'base', upgrades: [], expected: [1, 2, 3] },
        { name: 'Celestial Navigation', upgrades: [CELESTIAL_NAVIGATION_UPGRADE_ID], expected: [1, 3, 5] },
        {
            name: 'Maritime Trade',
            upgrades: [CELESTIAL_NAVIGATION_UPGRADE_ID, MARITIME_TRADE_UPGRADE_ID],
            expected: [2, 4, 7],
        },
        {
            name: 'Oceanic Routes',
            upgrades: [
                CELESTIAL_NAVIGATION_UPGRADE_ID,
                MARITIME_TRADE_UPGRADE_ID,
                OCEANIC_ROUTES_UPGRADE_ID,
            ],
            expected: [3, 6, 10],
        },
    ])('applies $name pearl rewards cumulatively at each sea threshold', ({ upgrades, expected }) => {
        for (let seaCount = 1; seaCount <= 3; seaCount += 1) {
            const board = createEmptyBoard();
            const pearl = createInstance(Sym.pearl, `pearl_${seaCount}`);
            board[0][0] = pearl;
            for (let index = 0; index < seaCount; index += 1) {
                board[index + 1][0] = createInstance(Sym.sea, `sea_${index}`);
            }

            const result = processSingleSymbolEffects(pearl, board, 0, 0, { upgrades });

            expect(result.gold).toBe(expected[seaCount - 1]);
        }
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
        const pearl = createInstance(Sym.pearl, 'pearl');
        const compass = createInstance(Sym.compass, 'compass');
        board[1][0] = pearl;
        board[2][0] = compass;
        board[4][3] = createInstance(Sym.sea, 'sea');

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

        expect(pearlResult.gold).toBe(2);
        expect(compassResult.knowledge).toBe(10);
    });

    it('overrides crab with Fishery Guild values', () => {
        const board = createEmptyBoard();
        const crab = createInstance(Sym.crab, 'crab');
        board[1][0] = crab;
        board[2][1] = createInstance(Sym.sea, 'sea_1');
        board[3][1] = createInstance(Sym.sea, 'sea_2');
        board[4][1] = createInstance(Sym.sea, 'sea_3');

        const crabResult = processSingleSymbolEffects(
            crab,
            board,
            1,
            0,
            { upgrades: [SEAFARING_UPGRADE_ID, FISHERY_GUILD_UPGRADE_ID] },
        );

        expect(crabResult.food).toBe(5);
        expect(crabResult.gold).toBe(5);
    });

    it('upgrades pearl further with Maritime Trade', () => {
        const board = createEmptyBoard();
        const pearl = createInstance(Sym.pearl, 'pearl');
        board[0][0] = pearl;
        board[1][0] = createInstance(Sym.sea, 'sea');
        board[2][1] = createInstance(Sym.sea, 'sea_2');
        board[0][1] = createInstance(Sym.wheat, 'wheat');
        board[1][1] = createInstance(Sym.rice, 'rice');
        board[2][0] = createInstance(Sym.honey, 'honey');

        const pearlResult = processSingleSymbolEffects(
            pearl,
            board,
            0,
            0,
            { upgrades: [CELESTIAL_NAVIGATION_UPGRADE_ID, MARITIME_TRADE_UPGRADE_ID] },
        );

        expect(pearlResult.gold).toBe(4);
    });

    it.each([
        { seaCount: 1, expectedFood: 5, expectedGold: 3 },
        { seaCount: 2, expectedFood: 8, expectedGold: 5 },
    ])(
        'applies Oceanic Routes crab rewards with $seaCount effective Seas',
        ({ seaCount, expectedFood, expectedGold }) => {
            const board = createEmptyBoard();
            const crab = createInstance(Sym.crab, 'crab');
            board[0][0] = crab;
            for (let index = 0; index < seaCount; index += 1) {
                board[index + 1][0] = createInstance(Sym.sea, `sea_${index}`);
            }

            const result = processSingleSymbolEffects(crab, board, 0, 0, {
                upgrades: [OCEANIC_ROUTES_UPGRADE_ID],
            });

            expect(result.food).toBe(expectedFood);
            expect(result.gold).toBe(expectedGold);
        },
    );

    it('applies Oceanic Routes as the highest tier for crab and pearl', () => {
        const board = createEmptyBoard();
        const crab = createInstance(Sym.crab, 'crab');
        const pearl = createInstance(Sym.pearl, 'pearl');
        board[1][0] = crab;
        board[2][0] = pearl;
        board[3][0] = createInstance(Sym.sea, 'sea');
        board[4][3] = createInstance(Sym.sea, 'sea_2');
        board[4][2] = createInstance(Sym.sea, 'sea_3');
        board[2][1] = createInstance(Sym.wheat, 'wheat');
        board[3][1] = createInstance(Sym.rice, 'rice');

        const upgrades = [SEAFARING_UPGRADE_ID, FISHERY_GUILD_UPGRADE_ID, CELESTIAL_NAVIGATION_UPGRADE_ID, MARITIME_TRADE_UPGRADE_ID, OCEANIC_ROUTES_UPGRADE_ID];
        const crabResult = processSingleSymbolEffects(crab, board, 1, 0, { upgrades });
        const pearlResult = processSingleSymbolEffects(pearl, board, 2, 0, { upgrades });

        expect(crabResult.food).toBe(8);
        expect(crabResult.gold).toBe(5);
        expect(pearlResult.gold).toBe(10);
    });

    it('keeps Rainforest at its base yield even with Tropical Agriculture', () => {
        const board = createEmptyBoard();
        board[1][2] = createInstance(Sym.rainforest, 'rainforest');

        const rainforestResult = processSingleSymbolEffects(
            board[1][2]!,
            board,
            1,
            2,
            { upgrades: [TROPICAL_AGRICULTURE_UPGRADE_ID] },
        );

        // 성장 보너스가 없으면 기본 식량 +1만 나온다.
        expect(rainforestResult.food).toBe(1);
        expect(rainforestResult.gold).toBe(0);
    });

    it('adds the Rainforest growth bonus on top of its base Food', () => {
        const board = createEmptyBoard();
        const rainforest = createInstance(Sym.rainforest, 'rainforest');
        rainforest.rainforest_growth_bonus = { food: 2, gold: 1, knowledge: 3 };
        board[1][2] = rainforest;

        const result = processSingleSymbolEffects(rainforest, board, 1, 2, { upgrades: [] });

        expect(result.food).toBe(3);
        expect(result.gold).toBe(1);
        expect(result.knowledge).toBe(3);
    });

    it('lets Cassava add 2 Growth to an adjacent Rainforest and destroys itself', () => {
        const board = createEmptyBoard();
        const rainforest = createInstance(Sym.rainforest, 'rainforest');
        const cassava = createInstance(Sym.cassava, 'cassava');
        board[1][2] = rainforest;
        board[1][1] = cassava;

        processSingleSymbolEffects(cassava, board, 1, 1, { upgrades: [] });

        expect(rainforest.effect_counter).toBe(2);
        expect(rainforest.rainforest_growth_bonus).toBeUndefined();
        expect(cassava.is_marked_for_destruction).toBe(true);
    });

    it('converts 10 Growth into a permanent Food bonus for Cassava growth', () => {
        const board = createEmptyBoard();
        const rainforest = createInstance(Sym.rainforest, 'rainforest');
        board[1][2] = rainforest;
        board[1][1] = createInstance(Sym.cassava, 'cassava');

        // 카사바 5번이면 성장치 10에 도달해 식량 생산이 영구히 +1.
        for (let i = 0; i < 5; i += 1) {
            const cassava = createInstance(Sym.cassava, `cassava_${i}`);
            board[1][1] = cassava;
            processSingleSymbolEffects(cassava, board, 1, 1, { upgrades: [] });
        }

        expect(rainforest.effect_counter).toBe(0);
        expect(rainforest.rainforest_growth_bonus).toEqual({ food: 1, gold: 0, knowledge: 0 });

        const result = processSingleSymbolEffects(rainforest, board, 1, 2, { upgrades: [] });
        expect(result.food).toBe(2);
    });

    it('does nothing for Cassava without an adjacent Rainforest', () => {
        const board = createEmptyBoard();
        const cassava = createInstance(Sym.cassava, 'cassava');
        board[1][1] = cassava;
        board[4][3] = createInstance(Sym.rainforest, 'distant_rainforest');

        processSingleSymbolEffects(cassava, board, 1, 1, { upgrades: [] });

        expect(cassava.is_marked_for_destruction).toBe(false);
    });

    it('gives Banana +1 Food, doubled when adjacent to Rainforest', () => {
        const board = createEmptyBoard();
        const banana = createInstance(Sym.banana, 'banana');
        board[1][1] = banana;

        // 열대우림이 없으면 기본 식량 +1.
        expect(processSingleSymbolEffects(banana, board, 1, 1, { upgrades: [] }).food).toBe(1);

        board[1][2] = createInstance(Sym.rainforest, 'rainforest');

        // 열대우림에 인접하면 식량 +1이 더해져 총 2.
        const adjacentResult = processSingleSymbolEffects(banana, board, 1, 1, { upgrades: [] });
        expect(adjacentResult.food).toBe(2);
        expect(adjacentResult.contributors).toEqual([{ x: 1, y: 2 }]);
    });

    it('keeps Banana Food flat regardless of how many Rainforests are adjacent', () => {
        const board = createEmptyBoard();
        const banana = createInstance(Sym.banana, 'banana');
        board[1][1] = banana;
        board[1][2] = createInstance(Sym.rainforest, 'rainforest_1');
        board[0][1] = createInstance(Sym.rainforest, 'rainforest_2');
        board[2][1] = createInstance(Sym.rainforest, 'rainforest_3');

        expect(processSingleSymbolEffects(banana, board, 1, 1, { upgrades: [] }).food).toBe(2);
    });

    it.each([
        { random: 0.2, expectedGold: 10, expectedKnowledge: 0 },
        { random: 0.8, expectedGold: 0, expectedKnowledge: 10 },
    ])('lets Expedition produce 10 Gold or Knowledge when adjacent to Rainforest', ({
        random,
        expectedGold,
        expectedKnowledge,
    }) => {
        const board = createEmptyBoard();
        const expedition = createInstance(Sym.expedition, 'expedition');
        board[1][1] = expedition;
        board[1][2] = createInstance(Sym.rainforest, 'rainforest');

        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(random);

        const result = processSingleSymbolEffects(
            expedition,
            board,
            1,
            1,
            { upgrades: [JUNGLE_EXPEDITION_UPGRADE_ID] },
        );

        expect(result.food).toBe(0);
        expect(result.gold).toBe(expectedGold);
        expect(result.knowledge).toBe(expectedKnowledge);
        expect(result.contributors).toEqual([{ x: 1, y: 2 }]);

        randomSpy.mockRestore();
    });

    it('upgrades Expedition with Tropical Development', () => {
        const board = createEmptyBoard();
        const expedition = createInstance(Sym.expedition, 'expedition');
        const rainforest = createInstance(Sym.rainforest, 'rainforest');
        board[1][1] = expedition;
        board[1][2] = rainforest;

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

        expect(expeditionResult.food).toBe(0);
        expect(expeditionResult.gold).toBe(15);
        expect(expeditionResult.knowledge).toBe(15);
        // 열대우림은 성장 기반이라 업그레이드 영향을 받지 않고 기본 식량 +1만 낸다.
        expect(rainforestResult.food).toBe(1);
        expect(rainforestResult.gold).toBe(0);
        expect(rainforestResult.knowledge).toBe(0);
    });

    it('gives Forest +1 Food per adjacent Forest on top of its base Food', () => {
        const board = createEmptyBoard();
        const forest = createInstance(Sym.forest, 'forest_1');
        board[0][0] = forest;
        board[1][0] = createInstance(Sym.forest, 'forest_2');
        board[1][1] = createInstance(Sym.forest, 'forest_3');
        board[0][1] = createInstance(Sym.forest, 'forest_4');

        const result = processSingleSymbolEffects(forest, board, 0, 0, { upgrades: [] });

        // 기본 +1 + 인접한 숲 3개 = +4.
        expect(result.food).toBe(4);
        expect(result.gold).toBe(0);
    });

    it('gives Forest only its base Food without an adjacent Forest', () => {
        const board = createEmptyBoard();
        const forest = createInstance(Sym.forest, 'forest_1');
        board[0][0] = forest;
        board[3][3] = createInstance(Sym.forest, 'distant_forest');

        const result = processSingleSymbolEffects(forest, board, 0, 0, { upgrades: [] });

        expect(result.food).toBe(1);
    });

    it('produces a random Seal every 10 turns', () => {
        const board = createEmptyBoard();
        const forest = createInstance(Sym.forest, 'forest_1');
        board[0][0] = forest;

        // 9턴째까지는 인장이 나오지 않는다.
        for (let turn = 0; turn < 9; turn += 1) {
            const result = processSingleSymbolEffects(forest, board, 0, 0, { upgrades: [] });
            expect(result.grantRelicIds).toBeUndefined();
        }

        const tenth = processSingleSymbolEffects(forest, board, 0, 0, { upgrades: [] });

        expect(tenth.grantRelicIds).toHaveLength(1);
        expect(SEAL_RELIC_IDS).toContain(tenth.grantRelicIds![0]);
        // 카운터가 리셋되어 다음 주기가 다시 시작된다.
        expect(forest.effect_counter).toBe(0);
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

        expect(deerResult.food).toBe(2);
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

    it('keeps Deer food flat regardless of how many Forests are adjacent', () => {
        const board = createEmptyBoard();
        const deer = createInstance(Sym.deer, 'deer');
        board[1][1] = deer;
        board[0][0] = createInstance(Sym.forest, 'forest_1');
        board[1][0] = createInstance(Sym.forest, 'forest_2');
        board[2][1] = createInstance(Sym.forest, 'forest_3');

        const result = processSingleSymbolEffects(deer, board, 1, 1, { upgrades: [] });

        // 인접한 숲이 3개여도 정액 +2.
        expect(result.food).toBe(2);
    });

    it('gives Deer nothing without an adjacent Forest', () => {
        const board = createEmptyBoard();
        const deer = createInstance(Sym.deer, 'deer');
        board[1][1] = deer;
        board[3][3] = createInstance(Sym.forest, 'distant_forest');

        const result = processSingleSymbolEffects(deer, board, 1, 1, { upgrades: [] });

        expect(result.food).toBe(0);
    });

    it('keeps the Forest adjacency rule unchanged with Tracking unlocked', () => {
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

        // 기본 +1 + 인접한 숲 2개(0,1 / 1,1) = +3.
        expect(forestResult.food).toBe(3);
        expect(forestResult.gold).toBe(0);
    });

    it('upgrades Fur with Tanning', () => {
        const board = createEmptyBoard();
        const fur = createInstance(Sym.fur, 'fur');
        board[0][0] = fur;
        board[1][2] = createInstance(Sym.forest, 'forest_1');
        board[2][1] = createInstance(Sym.forest, 'forest_2');
        board[3][3] = createInstance(Sym.forest, 'forest_3');

        const furResult = processSingleSymbolEffects(
            fur,
            board,
            0,
            0,
            { upgrades: [TANNING_UPGRADE_ID] },
        );

        expect(furResult.gold).toBe(3);
    });

    it('keeps the Forest adjacency rule unchanged with Forestry unlocked', () => {
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

        // 기본 +1 + 인접한 숲 3개 = +4.
        expect(result.food).toBe(4);
        expect(result.gold).toBe(0);
        expect(result.knowledge).toBe(0);
    });

    it('keeps Deer food flat even with Preservation unlocked', () => {
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

        expect(deerResult.food).toBe(2);
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
