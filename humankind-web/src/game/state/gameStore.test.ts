import { describe, expect, it, vi } from 'vitest';
import {
    NOMADIC_TRADITION_UPGRADE_ID,
    PASTURE_MANAGEMENT_UPGRADE_ID,
} from '../data/knowledgeUpgrades';
import { Sym, type SymbolDefinition } from '../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../types';

const BOARD_WIDTH = 5;
const BOARD_HEIGHT = 4;

const createEmptyBoard = (): (PlayerSymbolInstance | null)[][] =>
    Array(BOARD_WIDTH).fill(null).map(() => Array(BOARD_HEIGHT).fill(null));

const createInstance = (definition: SymbolDefinition, id: string): PlayerSymbolInstance => ({
    definition,
    instanceId: id,
    effect_counter: 0,
    is_marked_for_destruction: false,
    remaining_attacks: definition.base_attack ? 3 : 0,
    enemy_hp: definition.base_hp,
});

describe('gameStore pasture butchering', () => {
    const ensureDomGlobals = () => {
        vi.stubGlobal('window', {
            screen: { width: 1920, height: 1080 },
            innerWidth: 1920,
            innerHeight: 1080,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        });
        vi.stubGlobal('document', {
            fullscreenElement: null,
            getElementById: vi.fn(() => null),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            documentElement: { style: { setProperty: vi.fn() } },
        });
    };

    it('increments adjacent plains counters when Pasture Management is researched', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const board = createEmptyBoard();
        const cattle = createInstance(Sym.cattle, 'cattle');
        const plains = createInstance(Sym.plains, 'plains');
        board[1][1] = cattle;
        board[0][0] = plains;

        useGameStore.setState({
            board,
            playerSymbols: [cattle, plains],
            phase: 'idle',
            food: 0,
            gold: 0,
            knowledge: 0,
            unlockedKnowledgeUpgrades: [PASTURE_MANAGEMENT_UPGRADE_ID],
            lastEffects: [],
        });

        useGameStore.getState().butcherPastureAnimalAt(1, 1);

        const next = useGameStore.getState();
        expect(next.board[1][1]).toBeNull();
        expect(next.board[0][0]?.effect_counter).toBe(1);
        expect(next.food).toBe(10);
    });

    it('upgrades cattle and sheep butcher rewards with Nomadic Tradition', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const board = createEmptyBoard();
        const cattle = createInstance(Sym.cattle, 'cattle');
        const sheep = createInstance(Sym.sheep, 'sheep');
        const plainsA = createInstance(Sym.plains, 'plains_a');
        const plainsB = createInstance(Sym.plains, 'plains_b');
        board[1][1] = cattle;
        board[0][0] = plainsA;
        board[3][1] = sheep;
        board[4][0] = plainsB;

        useGameStore.setState({
            board,
            playerSymbols: [cattle, sheep, plainsA, plainsB],
            phase: 'idle',
            food: 0,
            gold: 0,
            knowledge: 0,
            unlockedKnowledgeUpgrades: [NOMADIC_TRADITION_UPGRADE_ID],
            lastEffects: [],
        });

        useGameStore.getState().butcherPastureAnimalAt(1, 1);
        useGameStore.getState().butcherPastureAnimalAt(3, 1);

        const next = useGameStore.getState();
        expect(next.food).toBe(20);
        expect(next.gold).toBe(10);
    });
});
