import type { LeaderId } from '../../data/leaders';
import type { PlayerSymbolInstance } from '../../types';
import { FOOD_PRODUCING_IDS, GOLD_PRODUCING_IDS, KNOWLEDGE_PRODUCING_IDS, SymbolType, S, TAX_SYMBOL_ID } from '../../data/symbolDefinitions';
import {
    CARAVANSERAI_UPGRADE_ID,
    DESERT_STORAGE_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';
import { RELIC_ID } from '../relics/relicIds';

export type BoardGrid = (PlayerSymbolInstance | null)[][];
export type EffectEntry = { x: number; y: number; food: number; gold: number; knowledge: number };

export type RelicFloat = { relicInstanceId: string; text: string; color?: string };
export type KnowledgeFloat =
    | { upgradeId: number; text: string; color?: string }
    | { upgradeId: number; inlineParts: { text: string; color: string }[] };

export interface RelicInstanceLike {
    instanceId: string;
    definition: { id: number };
    effect_counter: number;
    bonus_stacks: number;
}

export interface RelicStoreApiLike {
    incrementRelicBonus: (instanceId: string, delta: number) => void;
    decrementRelicCounterOrRemove: (instanceId: string) => void;
}

export interface UrWheelPlan {
    instanceId: string;
    target: { x: number; y: number } | null;
}

export interface PostEffectsResult {
    destroyedCount: number;
    destroyedSymbols: { id: number; x: number; y: number }[];
    bonusFood: number;
    bonusGold: number;
    bonusKnowledge: number;
    relicOwnEffectFloats: RelicFloat[];
    knowledgeOwnEffectFloats: KnowledgeFloat[];
    /** 우르 전차 바퀴(3) 처리 계획(애니메이션은 호출자가 결정) */
    urWheelPlan: UrWheelPlan | null;
}

export function runPostEffectsHooks(args: {
    board: BoardGrid;
    boardWidth: number;
    boardHeight: number;
    effects: EffectEntry[];
    leaderId: LeaderId | null;
    bonusXpPerTurn: number;
    unlockedKnowledgeUpgrades: number[];
    getAdjacentCoords: (x: number, y: number) => { x: number; y: number }[];
    relics: RelicInstanceLike[];
    relicStoreApi: RelicStoreApiLike;
}): PostEffectsResult {
    const {
        board,
        boardWidth,
        boardHeight,
        effects,
        leaderId,
        bonusXpPerTurn,
        unlockedKnowledgeUpgrades,
        getAdjacentCoords,
        relics,
        relicStoreApi,
    } = args;

    const getRelicInst = (id: number) => relics.find((r) => r.definition.id === id) ?? null;

    let destroyedCount = 0;
    const destroyedSymbols: { id: number; x: number; y: number }[] = [];
    for (let x = 0; x < boardWidth; x++) {
        for (let y = 0; y < boardHeight; y++) {
            const s = board[x][y];
            if (s?.is_marked_for_destruction) {
                destroyedCount++;
                destroyedSymbols.push({ id: s.definition.id, x, y });
            }
        }
    }

    let bonusFood = 0;
    let bonusGold = 0;
    let bonusKnowledge = 0;
    const relicOwnEffectFloats: RelicFloat[] = [];
    const knowledgeOwnEffectFloats: KnowledgeFloat[] = [];

    // ── 유물 ID 9: 나일 강 비옥한 흑니 — 효과 페이즈 집계 `effects`의 식량 합만큼 추가(3턴 후 제거는 호출자에서 감소)
    const nileRelicInst = getRelicInst(RELIC_ID.NILE_SILT);
    if (nileRelicInst && nileRelicInst.effect_counter > 0) {
        const boardFoodProduced = effects.reduce((s, e) => s + (e.food ?? 0), 0);
        if (boardFoodProduced !== 0) {
            bonusFood += boardFoodProduced;
            relicOwnEffectFloats.push({
                relicInstanceId: nileRelicInst.instanceId,
                text: `+${boardFoodProduced}`,
                color: '#4ade80',
            });
        }
    }

    // ── Pottery (20): 파괴 시 저장 식량 방출
    for (let x = 0; x < boardWidth; x++) {
        for (let y = 0; y < boardHeight; y++) {
            const s = board[x][y];
            if (s && s.definition.id === S.pottery && s.is_marked_for_destruction) {
                bonusFood += s.effect_counter || 0;
            }
        }
    }

    // ── Date (30): 파괴 시 +10 Food / 건조 저장술 후 +20 Food ──
    for (let x = 0; x < boardWidth; x++) {
        for (let y = 0; y < boardHeight; y++) {
            const s = board[x][y];
            if (!s || s.definition.id !== S.date || !s.is_marked_for_destruction) continue;
            bonusFood += unlockedKnowledgeUpgrades.includes(DESERT_STORAGE_UPGRADE_ID) ? 20 : 10;
        }
    }

    // ── Dye / Papyrus: 파괴 시 자원 보너스 ──
    for (let x = 0; x < boardWidth; x++) {
        for (let y = 0; y < boardHeight; y++) {
            const s = board[x][y];
            if (!s || !s.is_marked_for_destruction) continue;
            if (s.definition.id === S.dye) {
                bonusGold += unlockedKnowledgeUpgrades.includes(CARAVANSERAI_UPGRADE_ID) ? 20 : 10;
            }
            if (s.definition.id === S.papyrus) {
                bonusKnowledge += unlockedKnowledgeUpgrades.includes(CARAVANSERAI_UPGRADE_ID) ? 20 : 10;
            }
        }
    }

    // ── 유물 ID 4: 조몬 토기 조각 — 매 턴 유물에 식량 1 저장(bonus_stacks)
    const jomonRelicInst = getRelicInst(RELIC_ID.JOMON_POTTERY);
    if (jomonRelicInst) {
        relicStoreApi.incrementRelicBonus(jomonRelicInst.instanceId, 1);
    }

    const effectBySlot = new Map<string, { food: number; gold: number; knowledge: number }>();
    const rebuildEffectBySlot = () => {
        effectBySlot.clear();
        for (const e of effects) {
            const k = `${e.x},${e.y}`;
            const prev = effectBySlot.get(k) ?? { food: 0, gold: 0, knowledge: 0 };
            effectBySlot.set(k, {
                food: prev.food + (e.food ?? 0),
                gold: prev.gold + (e.gold ?? 0),
                knowledge: prev.knowledge + (e.knowledge ?? 0),
            });
        }
    };

    // ── Campfire (19): 파괴 시 인접 심볼 중 "이번 턴 식량 생산"이 가장 높은 심볼의 효과 복사 ──
    {
        rebuildEffectBySlot();

        for (let cx = 0; cx < boardWidth; cx++) {
            for (let cy = 0; cy < boardHeight; cy++) {
                const camp = board[cx][cy];
                if (!camp || camp.definition.id !== S.campfire || !camp.is_marked_for_destruction) continue;

                let bestPos: { x: number; y: number } | null = null;
                let bestFood = -Infinity;
                for (const pos of getAdjacentCoords(cx, cy)) {
                    const adj = board[pos.x][pos.y];
                    if (!adj) continue;
                    const adjFood = effectBySlot.get(`${pos.x},${pos.y}`)?.food ?? 0;
                    if (adjFood > bestFood) {
                        bestFood = adjFood;
                        bestPos = pos;
                    }
                }

                if (!bestPos || bestFood <= 0) continue;

                const src = effectBySlot.get(`${bestPos.x},${bestPos.y}`);
                if (!src) continue;
                if (src.food === 0 && src.gold === 0 && src.knowledge === 0) continue;

                bonusFood += src.food;
                bonusGold += src.gold;
                bonusKnowledge += src.knowledge;
                effects.push({ x: cx, y: cy, food: src.food, gold: src.gold, knowledge: src.knowledge });
            }
        }
    }

    // ── Earthquake (45): 파괴 시 무작위 인접 심볼 1개 파괴 ──
    for (let x = 0; x < boardWidth; x++) {
        for (let y = 0; y < boardHeight; y++) {
            const s = board[x][y];
            if (!s || s.definition.id !== S.earthquake || !s.is_marked_for_destruction) continue;

            const candidates: { x: number; y: number }[] = [];
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx,
                        ny = y + dy;
                    if (nx < 0 || nx >= boardWidth || ny < 0 || ny >= boardHeight) continue;
                    const nb = board[nx][ny];
                    if (!nb || nb.is_marked_for_destruction) continue;
                    candidates.push({ x: nx, y: ny });
                }
            }

            if (candidates.length > 0) {
                const pick = candidates[Math.floor(Math.random() * candidates.length)];
                const target = board[pick.x][pick.y];
                if (target) target.is_marked_for_destruction = true;
            }
        }
    }

    // ── Hinduism (34): 이번 턴 파괴 예정 심볼 1개당 식량/지식 +5 (힌두교 타일마다)
    let finalDestroyedCount = 0;
    for (let hx = 0; hx < boardWidth; hx++) {
        for (let hy = 0; hy < boardHeight; hy++) {
            if (board[hx][hy]?.is_marked_for_destruction) finalDestroyedCount++;
        }
    }
    if (finalDestroyedCount > 0) {
        for (let hx = 0; hx < boardWidth; hx++) {
            for (let hy = 0; hy < boardHeight; hy++) {
                const hs = board[hx][hy];
                if (!hs || hs.definition.id !== S.hinduism || hs.is_marked_for_destruction) continue;
                const delta = finalDestroyedCount * 5;
                bonusFood += delta;
                bonusKnowledge += delta;
                effects.push({ x: hx, y: hy, food: delta, gold: 0, knowledge: delta });
            }
        }
    }

    // ── Caravanserai (74): 파괴된 심볼당 같은 생산 종류로 +10 ──
    if (finalDestroyedCount > 0) {
        rebuildEffectBySlot();
        for (let cx = 0; cx < boardWidth; cx++) {
            for (let cy = 0; cy < boardHeight; cy++) {
                const cs = board[cx][cy];
                if (!cs || cs.definition.id !== S.caravanserai || cs.is_marked_for_destruction) continue;

                let deltaFood = 0;
                let deltaGold = 0;
                let deltaKnowledge = 0;

                for (let dx = 0; dx < boardWidth; dx++) {
                    for (let dy = 0; dy < boardHeight; dy++) {
                        const destroyed = board[dx][dy];
                        if (!destroyed?.is_marked_for_destruction) continue;
                        if (destroyed.instanceId === cs.instanceId) continue;

                        const produced = effectBySlot.get(`${dx},${dy}`);
                        const hasPositiveEffect =
                            (produced?.food ?? 0) > 0 ||
                            (produced?.gold ?? 0) > 0 ||
                            (produced?.knowledge ?? 0) > 0;

                        if ((produced?.food ?? 0) > 0 || (!hasPositiveEffect && FOOD_PRODUCING_IDS.has(destroyed.definition.id))) {
                            deltaFood += 10;
                        }
                        if ((produced?.gold ?? 0) > 0 || (!hasPositiveEffect && GOLD_PRODUCING_IDS.has(destroyed.definition.id))) {
                            deltaGold += 10;
                        }
                        if ((produced?.knowledge ?? 0) > 0 || (!hasPositiveEffect && KNOWLEDGE_PRODUCING_IDS.has(destroyed.definition.id))) {
                            deltaKnowledge += 10;
                        }
                    }
                }

                if (deltaFood === 0 && deltaGold === 0 && deltaKnowledge === 0) continue;
                bonusFood += deltaFood;
                bonusGold += deltaGold;
                bonusKnowledge += deltaKnowledge;
                effects.push({ x: cx, y: cy, food: deltaFood, gold: deltaGold, knowledge: deltaKnowledge });
            }
        }
    }

    // ── 유물 ID 6: 바빌로니아 세계 지도 ──
    // 매 턴 F+10(+ 누적 보너스). 보드 마지막 슬롯(x=4,y=3) 심볼이 0이하 식량이면 영구 +10.
    const babylonRelic = getRelicInst(RELIC_ID.BABYLON_MAP);
    if (babylonRelic) {
        const baseBonus = 1 + babylonRelic.bonus_stacks;
        bonusFood += baseBonus;
        relicOwnEffectFloats.push({
            relicInstanceId: babylonRelic.instanceId,
            text: `+${baseBonus}`,
            color: '#4ade80',
        });
        const lastSym = board[boardWidth - 1][boardHeight - 1];
        if (lastSym) {
            const lastEffect = effects.find((e) => e.x === boardWidth - 1 && e.y === boardHeight - 1);
            const lastFood = lastEffect?.food ?? 0;
            if (lastFood <= 0) {
                relicStoreApi.incrementRelicBonus(babylonRelic.instanceId, 1);
            }
        }
    }

    // ── 유물 ID 10: 괴베클리 테페 신전 석주 — 빈 슬롯당 식량 +1 ──
    const gobekliRelic = getRelicInst(RELIC_ID.GOBEKLI_PILLAR);
    if (gobekliRelic) {
        let emptySlots = 0;
        for (let x = 0; x < boardWidth; x++) for (let y = 0; y < boardHeight; y++) if (!board[x][y]) emptySlots++;
        if (emptySlots > 0) {
            bonusFood += emptySlots;
            relicOwnEffectFloats.push({
                relicInstanceId: gobekliRelic.instanceId,
                text: `+${emptySlots}`,
                color: '#4ade80',
            });
        }
    }

    // ── 유물 ID 11: 차탈회위크 여신상 — 보드 심볼 15개 이상 시 식량 +5 ──
    const catalRelic = getRelicInst(RELIC_ID.CATALHOYUK);
    if (catalRelic) {
        let symbolCount = 0;
        for (let x = 0; x < boardWidth; x++) for (let y = 0; y < boardHeight; y++) if (board[x][y]) symbolCount++;
        if (symbolCount >= 15) {
            bonusFood += 5;
            relicOwnEffectFloats.push({
                relicInstanceId: catalRelic.instanceId,
                text: '+5',
                color: '#4ade80',
            });
        }
    }

    // ── 유물 ID 14: 에피쿠로스의 원자론 명판 — 보드에 종교 심볼이 없으면 지식 +3 ──
    const epicurusRelic = getRelicInst(RELIC_ID.EPICURUS_PLAQUE);
    if (epicurusRelic) {
        let hasReligionOnBoard = false;
        for (let rx = 0; rx < boardWidth; rx++) {
            for (let ry = 0; ry < boardHeight; ry++) {
                const c = board[rx][ry];
                if (c && c.definition.type === SymbolType.RELIGION) {
                    hasReligionOnBoard = true;
                    break;
                }
            }
            if (hasReligionOnBoard) break;
        }
        if (!hasReligionOnBoard) {
            bonusKnowledge += 3;
            relicOwnEffectFloats.push({
                relicInstanceId: epicurusRelic.instanceId,
                text: '+3',
                color: '#60a5fa',
            });
        }
    }

    // ── 유물 ID 18: 안데스의 추뇨 — 매 턴 식량 +2 ──
    const andeanRelic = getRelicInst(RELIC_ID.ANDEAN_CHUNO);
    if (andeanRelic) {
        bonusFood += 2;
        relicOwnEffectFloats.push({
            relicInstanceId: andeanRelic.instanceId,
            text: '+2',
            color: '#4ade80',
        });
    }

    // ── 리더/영구 보너스 ──
    // 진시황 천하부강: 보드 심볼 2개당 식량 +1, 빈 칸 2개당 지식 +1 (파괴 예정 칸은 빈 칸)
    if (leaderId === 'shihuang') {
        let placedSymbols = 0;
        let emptySlots = 0;
        for (let qx = 0; qx < boardWidth; qx++) {
            for (let qy = 0; qy < boardHeight; qy++) {
                const cell = board[qx][qy];
                if (cell && !cell.is_marked_for_destruction) placedSymbols++;
                else emptySlots++;
            }
        }
        const qinFood = Math.floor(placedSymbols / 2);
        const qinKnowledge = Math.floor(emptySlots / 2);
        if (qinFood > 0) bonusFood += qinFood;
        if (qinKnowledge > 0) bonusKnowledge += qinKnowledge;
    }

    // 람세스 유물 금고: 보유 유물 1개당 지식 +1/턴
    if (leaderId === 'ramesses') {
        const relicVaultKnowledge = relics.length;
        if (relicVaultKnowledge > 0) {
            bonusKnowledge += relicVaultKnowledge;
        }
    }

    // 영구 턴당 지식 보너스(`bonusXpPerTurn`)
    if ((bonusXpPerTurn ?? 0) > 0) {
        bonusKnowledge += bonusXpPerTurn ?? 0;
    }

    // ── 유물 ID 12: 쇠똥구리 부적 — 심볼 파괴 시 G+3/파괴 ──
    const scarabRelic = getRelicInst(RELIC_ID.SCARAB);
    if (destroyedCount > 0 && scarabRelic) {
        const scarabGold = destroyedCount * 3;
        bonusGold += scarabGold;
        relicOwnEffectFloats.push({
            relicInstanceId: scarabRelic.instanceId,
            text: `+${scarabGold}`,
            color: '#fbbf24',
        });
    }

    // ── Tax (53): 무작위 인접 심볼 슬롯의 이번 턴 식량 합계만큼 G+, F- (effects 집계 후 정산)
    const foodBySlotKey = new Map<string, number>();
    for (const e of effects) {
        const k = `${e.x},${e.y}`;
        foodBySlotKey.set(k, (foodBySlotKey.get(k) ?? 0) + e.food);
    }
    for (let tx = 0; tx < boardWidth; tx++) {
        for (let ty = 0; ty < boardHeight; ty++) {
            const cell = board[tx][ty];
            if (!cell || cell.definition.id !== TAX_SYMBOL_ID || cell.is_marked_for_destruction) continue;
            const adjOccupied: { x: number; y: number }[] = [];
            for (const pos of getAdjacentCoords(tx, ty)) {
                const n = board[pos.x][pos.y];
                if (n && !n.is_marked_for_destruction) adjOccupied.push(pos);
            }
            if (adjOccupied.length === 0) continue;
            const pick = adjOccupied[Math.floor(Math.random() * adjOccupied.length)];
            const F = Math.max(0, foodBySlotKey.get(`${pick.x},${pick.y}`) ?? 0);
            if (F <= 0) continue;
            bonusFood -= F;
            bonusGold += F;
            effects.push({ x: tx, y: ty, food: -F, gold: F, knowledge: 0 });
        }
    }

    // ── 유물 ID 3: 우르의 전차 바퀴 — 대상 계산만(적용/연출은 호출자가 처리)
    let urWheelPlan: UrWheelPlan | null = null;
    const urWheelRelicForPlan = getRelicInst(RELIC_ID.UR_WHEEL);
    if (urWheelRelicForPlan && urWheelRelicForPlan.effect_counter > 0) {
        const upgrades = (unlockedKnowledgeUpgrades ?? []).map(Number);
        // 기존 gameStore 로직과 동일하게 최소 baseFood를 찾는다.
        const urWheelGrasslandFood = upgrades.includes(THREE_FIELD_SYSTEM_UPGRADE_ID)
            ? 5
            : upgrades.includes(IRRIGATION_UPGRADE_ID) ? 2 : 1;
        let target: { x: number; y: number } | null = null;
        let minFood = Infinity;
        for (let ux = 0; ux < boardWidth; ux++) {
            for (let uy = 0; uy < boardHeight; uy++) {
                const s = board[ux][uy];
                if (!s || s.is_marked_for_destruction) continue;
                const baseFood = (() => {
                    switch (s.definition.id) {
                        case S.wheat:
                            return 1;
                        case S.rice:
                            return 1;
                        case S.cattle:
                            return 1;
                        case S.banana:
                            return 1 + (s.banana_permanent_food_bonus ?? 0);
                        case S.fish:
                            return 0;
                        case S.sea:
                            return 0;
                        case S.stone:
                            return 0;
                        case S.grassland:
                            return urWheelGrasslandFood;
                        case S.rainforest:
                            return 1;
                        case S.plains:
                            return 1 +
                                (upgrades.includes(HORSEMANSHIP_UPGRADE_ID) ? 1 : 0) +
                                (s.effect_counter || 0);
                        case S.campfire:
                            return 1;
                        case S.merchant:
                            return 2;
                        case S.horse:
                            return 1;
                        case S.wild_seeds:
                            return 1;
                        default:
                            return 0;
                    }
                })();
                if (baseFood < minFood) {
                    minFood = baseFood;
                    target = { x: ux, y: uy };
                }
            }
        }
        urWheelPlan = { instanceId: urWheelRelicForPlan.instanceId, target };
    }

    return {
        destroyedCount,
        destroyedSymbols,
        bonusFood,
        bonusGold,
        bonusKnowledge,
        relicOwnEffectFloats,
        knowledgeOwnEffectFloats,
        urWheelPlan,
    };
}
