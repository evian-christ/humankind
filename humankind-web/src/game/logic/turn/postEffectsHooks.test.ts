import { describe, expect, it } from 'vitest';
import { runPostEffectsHooks } from './postEffectsHooks';
import { SYMBOLS, S } from '../../data/symbolDefinitions';
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
            toAdd: [],
            getAdjacentCoords: () => [],
            relics: [],
            relicStoreApi: {
                incrementRelicBonus: () => undefined,
                decrementRelicCounterOrRemove: () => undefined,
            },
        });

        expect(result.bonusFood).toBe(20);
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
            toAdd: [],
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
});
