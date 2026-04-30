import { describe, expect, it, vi } from 'vitest';
import {
    NOMADIC_TRADITION_UPGRADE_ID,
    PASTURE_MANAGEMENT_UPGRADE_ID,
    TRACKING_UPGRADE_ID,
} from '../data/knowledgeUpgrades';
import { Sym, type SymbolDefinition } from '../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../types';
import { useRelicStore } from './relicStore';

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

    it('opens loot for its base reward and removes it from the board', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const board = createEmptyBoard();
        const loot = createInstance(Sym.loot, 'loot');
        board[1][1] = loot;
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.1);

        useGameStore.setState({
            board,
            playerSymbols: [loot],
            phase: 'idle',
            food: 0,
            gold: 0,
            knowledge: 0,
            lastEffects: [],
        });

        useGameStore.getState().openLootAt(1, 1);

        const next = useGameStore.getState();
        expect(next.board[1][1]).toBeNull();
        expect(next.food).toBe(15);
        expect(next.gold).toBe(5);
        expect(next.knowledge).toBe(0);
        vi.restoreAllMocks();
    });

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

    it('consumes horse and trains an adjacent melee unit into cavalry', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const board = createEmptyBoard();
        const horse = createInstance(Sym.horse, 'horse');
        const warrior = createInstance(Sym.warrior, 'warrior');
        warrior.enemy_hp = 7;
        board[1][1] = horse;
        board[2][1] = warrior;

        useGameStore.setState({
            board,
            playerSymbols: [horse, warrior],
            phase: 'idle',
            lastEffects: [],
        });

        useGameStore.getState().trainHorseUnitAt(1, 1);

        const next = useGameStore.getState();
        expect(next.board[1][1]).toBeNull();
        expect(next.board[2][1]?.definition.id).toBe(Sym.cavalry.id);
        expect(next.board[2][1]?.enemy_hp).toBe(12);
        expect(next.playerSymbols.some((sym) => sym.instanceId === 'horse')).toBe(false);
        expect(next.playerSymbols.find((sym) => sym.instanceId === 'warrior')?.definition.id).toBe(Sym.cavalry.id);
    });

    it('consumes deer and trains an adjacent ranged unit into tracker archer after Tracking', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const board = createEmptyBoard();
        const deer = createInstance(Sym.deer, 'deer');
        const archer = createInstance(Sym.archer, 'archer');
        archer.enemy_hp = 3;
        board[1][1] = deer;
        board[2][1] = archer;

        useGameStore.setState({
            board,
            playerSymbols: [deer, archer],
            phase: 'idle',
            unlockedKnowledgeUpgrades: [TRACKING_UPGRADE_ID],
            lastEffects: [],
        });

        useGameStore.getState().trainDeerUnitAt(1, 1);

        const next = useGameStore.getState();
        expect(next.board[1][1]).toBeNull();
        expect(next.board[2][1]?.definition.id).toBe(Sym.tracker_archer.id);
        expect(next.board[2][1]?.enemy_hp).toBe(7);
        expect(next.playerSymbols.some((sym) => sym.instanceId === 'deer')).toBe(false);
        expect(next.playerSymbols.find((sym) => sym.instanceId === 'archer')?.definition.id).toBe(Sym.tracker_archer.id);
    });

    it('opens radiant loot and can grant a relic', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        useRelicStore.getState().resetRelics();
        const board = createEmptyBoard();
        const loot = createInstance(Sym.radiant_loot, 'radiant_loot');
        board[1][1] = loot;
        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.95)
            .mockReturnValueOnce(0);

        useGameStore.setState({
            board,
            playerSymbols: [loot],
            phase: 'idle',
            food: 0,
            gold: 0,
            knowledge: 0,
            lastEffects: [],
        });

        useGameStore.getState().openLootAt(1, 1);

        const next = useGameStore.getState();
        expect(next.food).toBe(50);
        expect(next.gold).toBe(20);
        expect(useRelicStore.getState().relics).toHaveLength(1);
        vi.restoreAllMocks();
    });

    it('consumes edict to destroy an adjacent symbol chosen by the player', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const board = createEmptyBoard();
        const edict = createInstance(Sym.edict, 'edict');
        const wheat = createInstance(Sym.wheat, 'wheat');
        board[1][1] = edict;
        board[2][1] = wheat;

        useGameStore.setState({
            board,
            playerSymbols: [edict, wheat],
            phase: 'idle',
            food: 0,
            gold: 0,
            knowledge: 0,
            lastEffects: [],
        });

        useGameStore.getState().activateEdictAt(1, 1);
        expect(useGameStore.getState().pendingEdictSource?.instanceId).toBe('edict');
        expect(useGameStore.getState().phase).toBe('oblivion_furnace_board');

        useGameStore.getState().confirmEdictDestroyAt(2, 1);

        const next = useGameStore.getState();
        expect(next.board[1][1]).toBeNull();
        expect(next.board[2][1]).toBeNull();
        expect(next.playerSymbols).toHaveLength(0);
        expect(next.phase).toBe('idle');
        expect(next.pendingEdictSource).toBeNull();
    });
});
