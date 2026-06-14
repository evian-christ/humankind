import { describe, expect, it, vi } from 'vitest';
import {
    NOMADIC_TRADITION_UPGRADE_ID,
    PASTURE_MANAGEMENT_UPGRADE_ID,
} from '../data/knowledgeUpgrades';
import { RELICS } from '../data/relicDefinitions';
import { isGameEventDefinition } from '../data/eventDefinitions';
import { RELIC_ID } from '../logic/relics/relicIds';
import { Sym, SymbolType, type SymbolDefinition } from '../data/symbolDefinitions';
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

    it('opens loot for chosen reward and removes it from the board', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const rewardMod = await import('../data/rewardDefinitions');
        const lootChoicesSpy = vi.spyOn(rewardMod, 'generateLootRewardChoices').mockReturnValue([
            rewardMod.REWARDS[1]!,
            rewardMod.REWARDS[6]!,
            rewardMod.REWARDS[11]!,
        ]);

        const board = createEmptyBoard();
        const loot = createInstance(Sym.loot, 'loot');
        board[1][1] = loot;

        useGameStore.setState({
            board,
            playerSymbols: [loot],
            phase: 'idle',
            era: 1,
            food: 0,
            gold: 0,
            knowledge: 0,
            lastEffects: [],
        });

        useGameStore.getState().openLootAt(1, 1);
        expect(useGameStore.getState().phase).toBe('loot_reward_selection');
        vi.useFakeTimers();
        useGameStore.getState().selectLootReward(1);

        const next = useGameStore.getState();
        expect(next.board[1][1]?.is_marked_for_destruction).toBe(true);
        expect(next.phase).toBe('idle');
        expect(next.food).toBe(8);
        expect(next.gold).toBe(0);
        expect(next.knowledge).toBe(0);
        await vi.advanceTimersByTimeAsync(360);
        expect(useGameStore.getState().board[1][1]).toBeNull();
        vi.useRealTimers();
        lootChoicesSpy.mockRestore();
    });

    it('levels up immediately when a player action grants enough knowledge', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const board = createEmptyBoard();
        const loot = createInstance(Sym.loot, 'knowledge_loot');
        board[1][1] = loot;

        useGameStore.setState({
            board,
            playerSymbols: [loot],
            phase: 'loot_reward_selection',
            pendingLootSlot: { x: 1, y: 1, symbolId: Sym.loot.id },
            era: 0,
            level: 0,
            knowledge: 49,
            levelUpResearchPoints: 0,
            knowledgeResearchCredits: [],
            lastEffects: [],
        });

        useGameStore.getState().selectLootReward(11);

        const next = useGameStore.getState();
        expect(next.level).toBe(1);
        expect(next.era).toBe(1);
        expect(next.knowledge).toBe(3);
        expect(next.levelUpResearchPoints).toBe(1);
        expect(next.knowledgeResearchCredits).toEqual([
            { grantLevel: 1, minLevel: 1, maxLevel: 1 },
        ]);
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

        vi.useFakeTimers();
        useGameStore.getState().butcherPastureAnimalAt(1, 1);

        const next = useGameStore.getState();
        expect(next.board[1][1]?.is_marked_for_destruction).toBe(true);
        expect(next.board[0][0]?.effect_counter).toBe(1);
        expect(next.food).toBe(10);
        await vi.advanceTimersByTimeAsync(360);
        expect(useGameStore.getState().board[1][1]).toBeNull();
        vi.useRealTimers();
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
        expect(next.food).toBe(30);
        expect(next.gold).toBe(10);
    });

    it('opens radiant loot choice and can grant a relic reward', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const rewardMod = await import('../data/rewardDefinitions');
        const lootChoicesSpy = vi.spyOn(rewardMod, 'generateLootRewardChoices').mockReturnValue([
            rewardMod.REWARDS[16]!,
            rewardMod.REWARDS[8]!,
            rewardMod.REWARDS[13]!,
        ]);

        useRelicStore.getState().resetRelics();
        const board = createEmptyBoard();
        const loot = createInstance(Sym.radiant_loot, 'radiant_loot');
        board[1][1] = loot;
        vi.spyOn(Math, 'random').mockReturnValue(0);

        useGameStore.setState({
            board,
            playerSymbols: [loot],
            phase: 'idle',
            era: 1,
            food: 0,
            gold: 0,
            knowledge: 0,
            lastEffects: [],
        });

        useGameStore.getState().openLootAt(1, 1);
        expect(useGameStore.getState().phase).toBe('loot_reward_selection');
        vi.useFakeTimers();
        useGameStore.getState().selectLootReward(16);

        const next = useGameStore.getState();
        expect(next.board[1][1]?.is_marked_for_destruction).toBe(true);
        expect(next.phase).toBe('idle');
        expect(next.food).toBe(0);
        expect(next.gold).toBe(0);
        expect(useRelicStore.getState().relics).toHaveLength(1);
        await vi.advanceTimersByTimeAsync(360);
        expect(useGameStore.getState().board[1][1]).toBeNull();
        vi.useRealTimers();
        lootChoicesSpy.mockRestore();
        vi.restoreAllMocks();
    });

    it('can grant configured relics from a loot reward', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const board = createEmptyBoard();
        const loot = createInstance(Sym.radiant_loot, 'configured_relic_loot');
        board[1][1] = loot;

        useRelicStore.getState().resetRelics();
        useGameStore.setState({
            board,
            playerSymbols: [loot],
            phase: 'idle',
            era: 1,
            food: 0,
            gold: 0,
            knowledge: 0,
            lastEffects: [],
        });

        useGameStore.getState().openLootAt(1, 1);
        useGameStore.getState().selectLootReward(22);

        expect(useRelicStore.getState().relics.map((relic) => relic.definition.id)).toEqual([
            RELIC_ID.ANCIENT_TRIBE_JOIN,
            RELIC_ID.ANCIENT_RELIC_DEBRIS,
            RELIC_ID.ANCIENT_RELIC_DEBRIS,
        ]);
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

        vi.useFakeTimers();
        try {
            useGameStore.getState().confirmEdictDestroyAt(2, 1);

            const next = useGameStore.getState();
            expect(next.board[1][1]?.is_marked_for_destruction).toBe(true);
            expect(next.board[2][1]?.is_marked_for_destruction).toBe(true);
            expect(next.playerSymbols).toHaveLength(0);
            expect(next.phase).toBe('idle');
            expect(next.pendingEdictSource).toBeNull();

            await vi.advanceTimersByTimeAsync(360);
            const afterBlink = useGameStore.getState();
            expect(afterBlink.board[1][1]).toBeNull();
            expect(afterBlink.board[2][1]).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('activates Military Levy into a unit-only symbol selection', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');

        useRelicStore.getState().resetRelics();
        useRelicStore.getState().addRelic(RELICS[RELIC_ID.MILITARY_LEVY]!);
        const relicInstanceId = useRelicStore.getState().relics[0]!.instanceId;

        useGameStore.setState({
            phase: 'idle',
            era: 1,
            religionUnlocked: false,
            unlockedKnowledgeUpgrades: [],
            symbolChoices: [],
            symbolSelectionRelicSourceId: null,
        });

        useGameStore.getState().activateClickableRelic(relicInstanceId);

        const next = useGameStore.getState();
        expect(next.phase).toBe('selection');
        expect(next.symbolSelectionRelicSourceId).toBe(RELIC_ID.MILITARY_LEVY);
        expect(next.symbolChoices).toHaveLength(3);
        expect(next.symbolChoices.every((choice) => 'type' in choice && choice.type === SymbolType.UNIT)).toBe(true);
        expect(useRelicStore.getState().relics).toHaveLength(0);
    });

    it('allows a consumable relic to open its selection while food payment is pending', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');

        useRelicStore.getState().resetRelics();
        useRelicStore.getState().addRelic(RELICS[RELIC_ID.MILITARY_LEVY]!);
        const relicInstanceId = useRelicStore.getState().relics[0]!.instanceId;

        useGameStore.setState({
            phase: 'food_payment',
            pendingFoodPayment: true,
            era: 1,
            religionUnlocked: false,
            unlockedKnowledgeUpgrades: [],
            symbolChoices: [],
            symbolSelectionRelicSourceId: null,
        });

        useGameStore.getState().activateClickableRelic(relicInstanceId);

        const next = useGameStore.getState();
        expect(next.phase).toBe('selection');
        expect(next.pendingFoodPayment).toBe(true);
        expect(next.symbolSelectionRelicSourceId).toBe(RELIC_ID.MILITARY_LEVY);
        expect(useRelicStore.getState().relics).toHaveLength(0);
        useGameStore.setState({ pendingFoodPayment: false });
    });

    it('allows an instant-use relic during food payment without leaving the payment phase', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');

        useRelicStore.getState().resetRelics();
        useRelicStore.getState().addRelic(RELICS[RELIC_ID.EGYPTIAN_GRANARY_MODEL]!);
        const relicInstanceId = useRelicStore.getState().relics[0]!.instanceId;

        useGameStore.setState({
            phase: 'food_payment',
            pendingFoodPayment: true,
            era: 1,
            food: 0,
            relicFloats: [],
        });

        useGameStore.getState().activateClickableRelic(relicInstanceId);

        const next = useGameStore.getState();
        expect(next.phase).toBe('food_payment');
        expect(next.pendingFoodPayment).toBe(true);
        expect(next.food).toBe(30);
        useGameStore.setState({ pendingFoodPayment: false });
    });

    it('scales Trojan Gold Loot with gold inflation before the era changes', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');

        useRelicStore.getState().resetRelics();
        useRelicStore.getState().addRelic(RELICS[RELIC_ID.TROY_GOLD_LOOT]!);
        const relicInstanceId = useRelicStore.getState().relics[0]!.instanceId;

        useGameStore.setState({
            phase: 'idle',
            era: 1,
            level: 10,
            gold: 0,
            relicFloats: [],
        });

        useGameStore.getState().activateClickableRelic(relicInstanceId);

        const next = useGameStore.getState();
        expect(next.gold).toBe(42);
        expect(next.relicFloats.at(-1)).toMatchObject({
            relicInstanceId,
            text: '+42',
            color: '#fbbf24',
        });
    });

    it('activates Prophecy Die into an event-only selection', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');

        useRelicStore.getState().resetRelics();
        useRelicStore.getState().addRelic(RELICS[RELIC_ID.PROPHECY_DIE]!);
        const relicInstanceId = useRelicStore.getState().relics[0]!.instanceId;

        useGameStore.setState({
            phase: 'idle',
            era: 1,
            playerSymbols: [],
            symbolChoices: [],
            symbolSelectionRelicSourceId: null,
        });

        useGameStore.getState().activateClickableRelic(relicInstanceId);

        const next = useGameStore.getState();
        expect(next.phase).toBe('selection');
        expect(next.symbolSelectionRelicSourceId).toBe(RELIC_ID.PROPHECY_DIE);
        expect(next.symbolChoices).toHaveLength(3);
        expect(next.symbolChoices.every(isGameEventDefinition)).toBe(true);
        expect(useRelicStore.getState().relics).toHaveLength(0);
    });

    it('consumes tribal village to trigger symbol selection 2 times consecutively', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const board = createEmptyBoard();
        const village = createInstance(Sym.tribal_village, 'village');
        board[1][1] = village;

        useGameStore.setState({
            board,
            playerSymbols: [village],
            phase: 'idle',
            era: 1,
            food: 0,
            gold: 0,
            knowledge: 0,
            lastEffects: [],
            bonusSelectionQueue: [],
        });

        // 부족 마을 소모
        vi.useFakeTimers();
        useGameStore.getState().consumeTribalVillageAt(1, 1);

        const storeAfterConsume = useGameStore.getState();
        expect(storeAfterConsume.board[1][1]?.is_marked_for_destruction).toBe(true);
        expect(storeAfterConsume.phase).toBe('selection');
        expect(storeAfterConsume.bonusSelectionQueue).toEqual(['any', 'any']);
        expect(storeAfterConsume.symbolSelectionSymbolSourceId).toBe(Sym.tribal_village.id);
        expect(storeAfterConsume.symbolChoices.length).toBeGreaterThan(0);
        await vi.advanceTimersByTimeAsync(360);
        expect(useGameStore.getState().board[1][1]).toBeNull();
        vi.useRealTimers();

        // 첫 번째 심볼 선택 (선택지 중 첫 번째 심볼 ID 선택)
        const firstChoice = storeAfterConsume.symbolChoices[0];
        const firstChoiceId = 'reward' in firstChoice ? (firstChoice.reward?.food ? 0 : 0) : firstChoice.id; // type safety
        useGameStore.getState().selectSymbol(firstChoiceId || 1); // 기본 wheat 등의 심볼 ID

        const storeAfterFirstSelect = useGameStore.getState();
        // 큐에서 하나가 차감되어 ['any']가 대기 중이어야 하고, 페이즈는 여전히 selection 이어야 함
        expect(storeAfterFirstSelect.phase).toBe('selection');
        expect(storeAfterFirstSelect.bonusSelectionQueue).toEqual(['any']);
        expect(storeAfterFirstSelect.symbolSelectionSymbolSourceId).toBe(Sym.tribal_village.id);
        expect(storeAfterFirstSelect.symbolChoices.length).toBeGreaterThan(0);

        // 두 번째 심볼 선택
        const secondChoice = storeAfterFirstSelect.symbolChoices[0];
        const secondChoiceId = 'reward' in secondChoice ? (secondChoice.reward?.food ? 0 : 0) : secondChoice.id;
        useGameStore.getState().selectSymbol(secondChoiceId || 1);

        const storeAfterSecondSelect = useGameStore.getState();
        // 이제 큐가 완전히 비어서 phase가 idle로 돌아와야 함
        expect(storeAfterSecondSelect.phase).toBe('idle');
        expect(storeAfterSecondSelect.bonusSelectionQueue).toEqual([]);
        expect(storeAfterSecondSelect.symbolSelectionSymbolSourceId).toBeNull();
    });

    it('allows pasture animals to be butchered during food payment', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const board = createEmptyBoard();
        const cattle = createInstance(Sym.cattle, 'payment_cattle');
        const plains = createInstance(Sym.plains, 'payment_plains');
        board[1][1] = cattle;
        board[0][0] = plains;

        useGameStore.setState({
            board,
            playerSymbols: [cattle, plains],
            phase: 'food_payment',
            pendingFoodPayment: true,
            food: 0,
            gold: 0,
            knowledge: 0,
            unlockedKnowledgeUpgrades: [],
            lastEffects: [],
        });

        vi.useFakeTimers();
        useGameStore.getState().butcherPastureAnimalAt(1, 1);

        expect(useGameStore.getState().board[1][1]?.is_marked_for_destruction).toBe(true);
        expect(useGameStore.getState().phase).toBe('food_payment');
        expect(useGameStore.getState().food).toBe(10);
        await vi.advanceTimersByTimeAsync(360);
        expect(useGameStore.getState().board[1][1]).toBeNull();
        vi.useRealTimers();
        useGameStore.setState({ pendingFoodPayment: false });
    });

    it('returns to food payment after opening loot during food payment', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const rewardMod = await import('../data/rewardDefinitions');
        const lootChoicesSpy = vi.spyOn(rewardMod, 'generateLootRewardChoices').mockReturnValue([
            rewardMod.REWARDS[1]!,
        ]);
        const board = createEmptyBoard();
        const loot = createInstance(Sym.loot, 'payment_loot');
        board[1][1] = loot;

        useGameStore.setState({
            board,
            playerSymbols: [loot],
            phase: 'food_payment',
            pendingFoodPayment: true,
            era: 1,
            food: 0,
            gold: 0,
            knowledge: 0,
            lastEffects: [],
        });

        useGameStore.getState().openLootAt(1, 1);
        useGameStore.getState().selectLootReward(1);

        expect(useGameStore.getState().phase).toBe('food_payment');
        expect(useGameStore.getState().food).toBe(8);
        lootChoicesSpy.mockRestore();
        useGameStore.setState({ pendingFoodPayment: false });
    });

    it('returns to food payment after using an edict during food payment', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const board = createEmptyBoard();
        const edict = createInstance(Sym.edict, 'payment_edict');
        const wheat = createInstance(Sym.wheat, 'payment_wheat');
        board[1][1] = edict;
        board[2][1] = wheat;

        useGameStore.setState({
            board,
            playerSymbols: [edict, wheat],
            phase: 'food_payment',
            pendingFoodPayment: true,
            food: 0,
            gold: 0,
            knowledge: 0,
            lastEffects: [],
        });

        useGameStore.getState().activateEdictAt(1, 1);
        vi.useFakeTimers();
        try {
            useGameStore.getState().confirmEdictDestroyAt(2, 1);
            expect(useGameStore.getState().phase).toBe('food_payment');
            await vi.advanceTimersByTimeAsync(360);
        } finally {
            vi.useRealTimers();
            useGameStore.setState({ pendingFoodPayment: false });
        }
    });

    it('returns to food payment after consuming a tribal village during food payment', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const board = createEmptyBoard();
        const village = createInstance(Sym.tribal_village, 'payment_village');
        board[1][1] = village;

        useGameStore.setState({
            board,
            playerSymbols: [village],
            phase: 'food_payment',
            pendingFoodPayment: true,
            era: 1,
            food: 0,
            gold: 0,
            knowledge: 0,
            lastEffects: [],
            bonusSelectionQueue: [],
        });

        useGameStore.getState().consumeTribalVillageAt(1, 1);
        expect(useGameStore.getState().phase).toBe('selection');
        useGameStore.getState().skipSelection();
        useGameStore.getState().skipSelection();

        expect(useGameStore.getState().phase).toBe('food_payment');
        expect(useGameStore.getState().pendingFoodPayment).toBe(true);
        useGameStore.setState({ pendingFoodPayment: false });
    });

    it('sets up the tutorial adjacency spin with four symbols around the sea', async () => {
        ensureDomGlobals();
        const { useGameStore } = await import('./gameStore');
        const cornA = createInstance(Sym.corn, 'tutorial-corn-a');
        const cornB = createInstance(Sym.corn, 'tutorial-corn-b');
        const monument = createInstance(Sym.monument, 'tutorial-monument');

        useGameStore.setState({
            board: createEmptyBoard(),
            playerSymbols: [cornA, cornB, monument],
            phase: 'idle',
            isTutorialMode: true,
            tutorialSpinStep: 'monument_done',
        });

        useGameStore.getState().setupTutorialAdjacencyStep();
        const prepared = useGameStore.getState();
        expect(prepared.playerSymbols.map((symbol) => symbol.definition.id)).toEqual([
            Sym.corn.id,
            Sym.corn.id,
            Sym.monument.id,
            Sym.sea.id,
            Sym.pearl.id,
        ]);
        expect(prepared.board[2][1]?.definition.id).toBe(Sym.sea.id);
        expect(prepared.board[3][1]?.definition.id).toBe(Sym.pearl.id);

        useGameStore.getState().spinTutorialAdjacencyStep();
        const spun = useGameStore.getState();
        expect(spun.phase).toBe('spinning');
        expect(spun.tutorialSpinStep).toBe('adjacency_spin');
        expect(spun.board[2][1]?.definition.id).toBe(Sym.sea.id);
        expect([
            spun.board[1][0]?.definition.id,
            spun.board[2][0]?.definition.id,
            spun.board[1][1]?.definition.id,
            spun.board[3][2]?.definition.id,
        ]).toEqual([
            Sym.corn.id,
            Sym.corn.id,
            Sym.monument.id,
            Sym.pearl.id,
        ]);
    });
});
