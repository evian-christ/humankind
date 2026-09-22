import type { PlayerSymbolInstance } from '../../types';
import { FOOD_PRODUCING_IDS, GOLD_PRODUCING_IDS, KNOWLEDGE_PRODUCING_IDS, S } from '../../data/symbolDefinitions';

export type BoardGrid = (PlayerSymbolInstance | null)[][];
export type EffectEntry = { x: number; y: number; food: number; gold: number; knowledge: number };
export type KnowledgeFloat =
    | { upgradeId: number; text: string; color?: string }
    | { upgradeId: number; inlineParts: { text: string; color: string }[] };

export interface PostEffectsResult {
    destroyedCount: number;
    destroyedSymbols: { id: number; x: number; y: number }[];
    addSymbolIds: number[];
    bonusFood: number;
    bonusGold: number;
    bonusKnowledge: number;
    agiVictory: boolean;
    knowledgeOwnEffectFloats: KnowledgeFloat[];
}

export function runPostEffectsHooks(args: {
    board: BoardGrid;
    boardWidth: number;
    boardHeight: number;
    effects: EffectEntry[];
}): PostEffectsResult {
    const { board, boardWidth, boardHeight, effects } = args;
    let destroyedCount = 0;
    const destroyedSymbols: { id: number; x: number; y: number }[] = [];
    for (let x = 0; x < boardWidth; x++) {
        for (let y = 0; y < boardHeight; y++) {
            const symbol = board[x][y];
            if (!symbol?.is_marked_for_destruction) continue;
            destroyedCount++;
            destroyedSymbols.push({ id: symbol.definition.id, x, y });
        }
    }

    let bonusFood = 0;
    let bonusGold = 0;
    let bonusKnowledge = 0;
    let agiVictory = false;
    const effectBySlot = new Map<string, { food: number; gold: number; knowledge: number }>();
    const rebuildEffectBySlot = () => {
        effectBySlot.clear();
        for (const effect of effects) {
            const key = `${effect.x},${effect.y}`;
            const previous = effectBySlot.get(key) ?? { food: 0, gold: 0, knowledge: 0 };
            effectBySlot.set(key, {
                food: previous.food + (effect.food ?? 0),
                gold: previous.gold + (effect.gold ?? 0),
                knowledge: previous.knowledge + (effect.knowledge ?? 0),
            });
        }
    };

    if (destroyedCount > 0) {
        rebuildEffectBySlot();
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                const caravanserai = board[x][y];
                if (!caravanserai || caravanserai.definition.id !== S.caravanserai || caravanserai.is_marked_for_destruction) continue;

                let food = 0;
                let gold = 0;
                let knowledge = 0;
                for (let dx = 0; dx < boardWidth; dx++) {
                    for (let dy = 0; dy < boardHeight; dy++) {
                        const destroyed = board[dx][dy];
                        if (!destroyed?.is_marked_for_destruction || destroyed.instanceId === caravanserai.instanceId) continue;
                        const produced = effectBySlot.get(`${dx},${dy}`);
                        const hasPositiveEffect =
                            (produced?.food ?? 0) > 0 ||
                            (produced?.gold ?? 0) > 0 ||
                            (produced?.knowledge ?? 0) > 0;
                        if ((produced?.food ?? 0) > 0 || (!hasPositiveEffect && FOOD_PRODUCING_IDS.has(destroyed.definition.id))) food += 10;
                        if ((produced?.gold ?? 0) > 0 || (!hasPositiveEffect && GOLD_PRODUCING_IDS.has(destroyed.definition.id))) gold += 10;
                        if ((produced?.knowledge ?? 0) > 0 || (!hasPositiveEffect && KNOWLEDGE_PRODUCING_IDS.has(destroyed.definition.id))) knowledge += 10;
                    }
                }
                if (food === 0 && gold === 0 && knowledge === 0) continue;
                bonusFood += food;
                bonusGold += gold;
                bonusKnowledge += knowledge;
                effects.push({ x, y, food, gold, knowledge });
            }
        }
    }

    const knowledgeBySlot = new Map<string, number>();
    for (const effect of effects) {
        const key = `${effect.x},${effect.y}`;
        knowledgeBySlot.set(key, (knowledgeBySlot.get(key) ?? 0) + (effect.knowledge ?? 0));
    }
    const totalKnowledge = Array.from(knowledgeBySlot.values()).reduce((sum, value) => sum + Math.max(0, value), 0);
    if (totalKnowledge > 0) {
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                const cell = board[x][y];
                if (!cell || cell.definition.id !== S.agi_core || cell.is_marked_for_destruction) continue;
                cell.effect_counter = (cell.effect_counter ?? 0) + totalKnowledge;
                if (cell.effect_counter >= 500) agiVictory = true;
            }
        }
    }

    return {
        destroyedCount,
        destroyedSymbols,
        addSymbolIds: [],
        bonusFood,
        bonusGold,
        bonusKnowledge,
        agiVictory,
        knowledgeOwnEffectFloats: [],
    };
}
