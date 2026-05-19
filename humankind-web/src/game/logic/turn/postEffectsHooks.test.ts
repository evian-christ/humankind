import { describe, expect, it } from 'vitest';
import { runPostEffectsHooks } from './postEffectsHooks';
import { SYMBOLS, S } from '../../data/symbolDefinitions';
import { SymbolType } from '../../data/symbolTypes';
import { CARAVANSERAI_UPGRADE_ID, DESERT_STORAGE_UPGRADE_ID } from '../../data/knowledgeUpgrades';
import type { PlayerSymbolInstance } from '../../types';

const createEmptyBoard = (): (PlayerSymbolInstance | null)[][] => Array(5).fill(null).map(() => Array(4).fill(null));

const createInstance = (definition: (typeof SYMBOLS)[number], id: string): PlayerSymbolInstance => ({
    definition,
    instanceId: id,
    effect_counter: 0,
    is_marked_for_destruction: false,
    remaining_attacks: definition.base_attack ? 3 : 0,
    enemy_hp: definition.base_hp,
});

describe('postEffectsHooks', () => {
    it('applies Ramesses Relic Vault only from leader level 5', () => {
        const baseArgs = {
            board: createEmptyBoard(),
            boardWidth: 5,
            boardHeight: 4,
            effects: [],
            leaderId: 'ramesses' as const,
            bonusXpPerTurn: 0,
            unlockedKnowledgeUpgrades: [],
            getAdjacentCoords: () => [],
            relics: [
                { instanceId: 'relic-a', definition: { id: 9001 }, effect_counter: 0, bonus_stacks: 0 },
                { instanceId: 'relic-b', definition: { id: 9002 }, effect_counter: 0, bonus_stacks: 0 },
            ],
            relicStoreApi: {
                incrementRelicBonus: () => undefined,
                decrementRelicCounterOrRemove: () => undefined,
            },
        };

        expect(runPostEffectsHooks({ ...baseArgs, leaderProgressLevel: 4 }).bonusKnowledge).toBe(0);
        expect(runPostEffectsHooks({ ...baseArgs, leaderProgressLevel: 5 }).bonusKnowledge).toBe(2);
    });

    it('applies Qin Shi Huang prosperity from leader level 1 with ancient ratios', () => {
        const board = createEmptyBoard();
        board[0][0] = createInstance(SYMBOLS[S.wheat]!, 'wheat-a');
        board[1][0] = createInstance(SYMBOLS[S.rice]!, 'rice-a');
        board[2][0] = createInstance(SYMBOLS[S.stone]!, 'stone-a');
        board[3][0] = createInstance(SYMBOLS[S.monument]!, 'monument-a');

        const baseArgs = {
            board,
            boardWidth: 5,
            boardHeight: 4,
            effects: [],
            leaderId: 'shihuang' as const,
            bonusXpPerTurn: 0,
            unlockedKnowledgeUpgrades: [],
            getAdjacentCoords: () => [],
            relics: [],
            relicStoreApi: {
                incrementRelicBonus: () => undefined,
                decrementRelicCounterOrRemove: () => undefined,
            },
        };

        const result = runPostEffectsHooks({ ...baseArgs, leaderProgressLevel: 1 });

        expect(result.bonusFood).toBe(1);
        expect(result.bonusKnowledge).toBe(4);
    });

    it('scales Qin Shi Huang prosperity by era', () => {
        const board = createEmptyBoard();
        board[0][0] = createInstance(SYMBOLS[S.wheat]!, 'wheat-a');
        board[1][0] = createInstance(SYMBOLS[S.rice]!, 'rice-a');
        board[2][0] = createInstance(SYMBOLS[S.stone]!, 'stone-a');
        board[3][0] = createInstance(SYMBOLS[S.monument]!, 'monument-a');
        board[4][0] = createInstance(SYMBOLS[S.library]!, 'library-a');
        board[0][1] = createInstance(SYMBOLS[S.merchant]!, 'merchant-a');

        const baseArgs = {
            board,
            boardWidth: 5,
            boardHeight: 4,
            effects: [],
            leaderId: 'shihuang' as const,
            leaderProgressLevel: 1,
            bonusXpPerTurn: 0,
            unlockedKnowledgeUpgrades: [],
            getAdjacentCoords: () => [],
            relics: [],
            relicStoreApi: {
                incrementRelicBonus: () => undefined,
                decrementRelicCounterOrRemove: () => undefined,
            },
        };

        expect(runPostEffectsHooks({ ...baseArgs, currentEra: 2 }).bonusFood).toBe(2);
        expect(runPostEffectsHooks({ ...baseArgs, currentEra: 2 }).bonusKnowledge).toBe(4);
        expect(runPostEffectsHooks({ ...baseArgs, currentEra: 3 }).bonusFood).toBe(3);
        expect(runPostEffectsHooks({ ...baseArgs, currentEra: 3 }).bonusKnowledge).toBe(7);
    });

    it('upgrades Date destroy food to 20 with Dry Storage', () => {
        const board = createEmptyBoard();
        const date = createInstance(SYMBOLS[S.date]!, 'date');
        date.is_marked_for_destruction = true;
        board[0][0] = date;

        const result = runPostEffectsHooks({
            board,
            boardWidth: 5,
            boardHeight: 4,
            effects: [],
            leaderId: null,
            bonusXpPerTurn: 0,
            unlockedKnowledgeUpgrades: [DESERT_STORAGE_UPGRADE_ID],
            getAdjacentCoords: () => [],
            relics: [],
            relicStoreApi: {
                incrementRelicBonus: () => undefined,
                decrementRelicCounterOrRemove: () => undefined,
            },
        });

        expect(result.bonusFood).toBe(20);
    });

    it('grants campfire food equal to the highest adjacent food production', () => {
        const board = createEmptyBoard();
        const campfire = createInstance(SYMBOLS[S.campfire]!, 'campfire');
        const wheat = createInstance(SYMBOLS[S.wheat]!, 'wheat');
        const fish = createInstance(SYMBOLS[S.fish]!, 'fish');
        campfire.is_marked_for_destruction = true;
        board[1][1] = campfire;
        board[1][0] = wheat;
        board[2][1] = fish;

        const result = runPostEffectsHooks({
            board,
            boardWidth: 5,
            boardHeight: 4,
            effects: [
                { x: 1, y: 0, food: 6, gold: 0, knowledge: 0 },
                { x: 2, y: 1, food: 4, gold: 2, knowledge: 0 },
            ],
            leaderId: null,
            bonusXpPerTurn: 0,
            unlockedKnowledgeUpgrades: [],
            getAdjacentCoords: (x, y) => {
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
            },
            relics: [],
            relicStoreApi: {
                incrementRelicBonus: () => undefined,
                decrementRelicCounterOrRemove: () => undefined,
            },
        });

        expect(result.bonusFood).toBe(6);
        expect(result.bonusGold).toBe(0);
        expect(result.bonusKnowledge).toBe(0);
    });

    it('adds two random normal symbols when tribal village is destroyed', () => {
        const board = createEmptyBoard();
        const village = createInstance(SYMBOLS[S.tribal_village]!, 'tribal_village');
        village.is_marked_for_destruction = true;
        board[0][0] = village;

        const result = runPostEffectsHooks({
            board,
            boardWidth: 5,
            boardHeight: 4,
            effects: [],
            leaderId: null,
            bonusXpPerTurn: 0,
            unlockedKnowledgeUpgrades: [],
            getAdjacentCoords: () => [],
            relics: [],
            relicStoreApi: {
                incrementRelicBonus: () => undefined,
                decrementRelicCounterOrRemove: () => undefined,
            },
        });

        expect(result.addSymbolIds).toHaveLength(2);
        expect(result.addSymbolIds.every((id) => SYMBOLS[id]?.type === SymbolType.NORMAL)).toBe(true);
    });

    it('makes earthquake destroy every symbol in the same column', () => {
        const board = createEmptyBoard();
        const earthquake = createInstance(SYMBOLS[S.earthquake]!, 'earthquake');
        const wheat = createInstance(SYMBOLS[S.wheat]!, 'wheat');
        const fish = createInstance(SYMBOLS[S.fish]!, 'fish');
        const rice = createInstance(SYMBOLS[S.rice]!, 'rice');
        earthquake.is_marked_for_destruction = true;
        board[2][0] = wheat;
        board[2][1] = earthquake;
        board[2][3] = fish;
        board[3][1] = rice;

        runPostEffectsHooks({
            board,
            boardWidth: 5,
            boardHeight: 4,
            effects: [],
            leaderId: null,
            bonusXpPerTurn: 0,
            unlockedKnowledgeUpgrades: [],
            getAdjacentCoords: () => [],
            relics: [],
            relicStoreApi: {
                incrementRelicBonus: () => undefined,
                decrementRelicCounterOrRemove: () => undefined,
            },
        });

        expect(wheat.is_marked_for_destruction).toBe(true);
        expect(earthquake.is_marked_for_destruction).toBe(true);
        expect(fish.is_marked_for_destruction).toBe(true);
        expect(rice.is_marked_for_destruction).toBe(false);
    });

    it('lets tax produce gold without reducing food', () => {
        const board = createEmptyBoard();
        const tax = createInstance(SYMBOLS[S.tax]!, 'tax');
        const wheat = createInstance(SYMBOLS[S.wheat]!, 'wheat');
        board[1][1] = tax;
        board[1][0] = wheat;

        const result = runPostEffectsHooks({
            board,
            boardWidth: 5,
            boardHeight: 4,
            effects: [{ x: 1, y: 0, food: 5, gold: 0, knowledge: 0 }],
            leaderId: null,
            bonusXpPerTurn: 0,
            unlockedKnowledgeUpgrades: [],
            getAdjacentCoords: (x, y) => {
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
            },
            relics: [],
            relicStoreApi: {
                incrementRelicBonus: () => undefined,
                decrementRelicCounterOrRemove: () => undefined,
            },
        });

        expect(result.bonusFood).toBe(0);
        expect(result.bonusGold).toBe(5);
    });

    it('lets Caravanserai mirror destroyed symbols production types', () => {
        const board = createEmptyBoard();
        const wheat = createInstance(SYMBOLS[S.wheat]!, 'wheat');
        const dye = createInstance(SYMBOLS[S.dye]!, 'dye');
        const papyrus = createInstance(SYMBOLS[S.papyrus]!, 'papyrus');
        const caravanserai = createInstance(SYMBOLS[S.caravanserai]!, 'caravanserai');
        wheat.is_marked_for_destruction = true;
        dye.is_marked_for_destruction = true;
        papyrus.is_marked_for_destruction = true;
        board[0][0] = wheat;
        board[1][0] = dye;
        board[2][0] = papyrus;
        board[3][0] = caravanserai;

        const result = runPostEffectsHooks({
            board,
            boardWidth: 5,
            boardHeight: 4,
            effects: [
                { x: 0, y: 0, food: 5, gold: 0, knowledge: 0 },
                { x: 1, y: 0, food: 0, gold: 1, knowledge: 0 },
                { x: 2, y: 0, food: 0, gold: 0, knowledge: 1 },
            ],
            leaderId: null,
            bonusXpPerTurn: 0,
            unlockedKnowledgeUpgrades: [CARAVANSERAI_UPGRADE_ID],
            getAdjacentCoords: () => [],
            relics: [],
            relicStoreApi: {
                incrementRelicBonus: () => undefined,
                decrementRelicCounterOrRemove: () => undefined,
            },
        });

        expect(result.bonusFood).toBe(10);
        expect(result.bonusGold).toBe(30);
        expect(result.bonusKnowledge).toBe(30);
    });

    it('lets AGI Core absorb all board knowledge production and trigger victory at 500', () => {
        const board = createEmptyBoard();
        const agiCore = createInstance(SYMBOLS[S.agi_core]!, 'agi_core');
        const monument = createInstance(SYMBOLS[S.monument]!, 'monument');
        agiCore.effect_counter = 490;
        board[0][0] = agiCore;
        board[1][0] = monument;

        const result = runPostEffectsHooks({
            board,
            boardWidth: 5,
            boardHeight: 4,
            effects: [
                { x: 1, y: 0, food: 0, gold: 0, knowledge: 7 },
                { x: 2, y: 0, food: 0, gold: 0, knowledge: 5 },
            ],
            leaderId: null,
            bonusXpPerTurn: 0,
            unlockedKnowledgeUpgrades: [],
            getAdjacentCoords: () => [],
            relics: [],
            relicStoreApi: {
                incrementRelicBonus: () => undefined,
                decrementRelicCounterOrRemove: () => undefined,
            },
        });

        expect(board[0][0]?.effect_counter).toBe(502);
        expect(result.bonusKnowledge).toBe(0);
        expect(result.agiVictory).toBe(true);
    });
});
