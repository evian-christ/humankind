import type { LeaderId } from '../../data/leaders';
import { isLeaderUnlockActive } from '../../data/leaders';
import type { PlayerSymbolInstance } from '../../types';
import { FOOD_PRODUCING_IDS, GOLD_PRODUCING_IDS, KNOWLEDGE_PRODUCING_IDS, SymbolType, S } from '../../data/symbolDefinitions';
import {
    CARAVANSERAI_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';
import { RELIC_ID } from '../relics/relicIds';
import { countNonConsumableRelics } from '../relics/relicClassification';
import { randomBaseNormalSymbolId } from '../symbolEffects/core';

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
    incrementRelicCounter?: (instanceId: string) => void;
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
    addSymbolIds: number[];
    bonusFood: number;
    bonusGold: number;
    bonusKnowledge: number;
    agiVictory: boolean;
    refreshRelicShop: boolean;
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
    leaderProgressLevel?: number;
    currentEra?: number;
    currentGold?: number;
    unlockedKnowledgeUpgrades: number[];
    getAdjacentCoords: (x: number, y: number) => { x: number; y: number }[];
    relics: RelicInstanceLike[];
    ownedSymbols?: PlayerSymbolInstance[];
    relicStoreApi: RelicStoreApiLike;
}): PostEffectsResult {
    const {
        board,
        boardWidth,
        boardHeight,
        effects,
        leaderId,
        leaderProgressLevel = 1,
        currentEra = 1,
        currentGold = 0,
        unlockedKnowledgeUpgrades,
        getAdjacentCoords,
        relics,
        ownedSymbols = [],
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
    let agiVictory = false;
    let refreshRelicShop = false;
    const addSymbolIds: number[] = [];
    const relicOwnEffectFloats: RelicFloat[] = [];
    const knowledgeOwnEffectFloats: KnowledgeFloat[] = [];
    const pushRelicFloat = (relic: RelicInstanceLike, text: string, color: string) => {
        relicOwnEffectFloats.push({ relicInstanceId: relic.instanceId, text, color });
    };

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

    // ── Date (30): 파괴 시 +10 Food / 건조 저장술 후 +20 Food ──
    // ── Dye / Papyrus: 파괴 시 자원 보너스 ──
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

    // ── Earthquake (45): 파괴 시 무작위 인접 심볼 1개 파괴 ──
    let finalDestroyedCount = 0;
    for (let hx = 0; hx < boardWidth; hx++) {
        for (let hy = 0; hy < boardHeight; hy++) {
            if (board[hx][hy]?.is_marked_for_destruction) finalDestroyedCount++;
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
        pushRelicFloat(andeanRelic, '+2', '#4ade80');
    }

    // ── 유물 ID 20: 라스코 동굴 안료 — 매 5턴마다 무작위 자원 +5 ──
    const lascauxRelic = getRelicInst(RELIC_ID.LASCAUX_PIGMENT);
    if (lascauxRelic) {
        const nextCounter = (lascauxRelic.effect_counter ?? 0) + 1;
        relicStoreApi.incrementRelicCounter?.(lascauxRelic.instanceId);
        if (nextCounter % 5 === 0) {
            const roll = Math.floor(Math.random() * 3);
            if (roll === 0) {
                bonusFood += 5;
                pushRelicFloat(lascauxRelic, '+5', '#4ade80');
            } else if (roll === 1) {
                bonusGold += 5;
                pushRelicFloat(lascauxRelic, '+5', '#fbbf24');
            } else {
                bonusKnowledge += 5;
                pushRelicFloat(lascauxRelic, '+5', '#60a5fa');
            }
        }
    }

    // ── 유물 ID 21: 빌렌도르프 비너스 — 식량 납부 후 다음 턴 식량 +10 ──
    const venusRelic = getRelicInst(RELIC_ID.WILLENDORF_VENUS);
    if (venusRelic && venusRelic.bonus_stacks > 0) {
        const venusFood = venusRelic.bonus_stacks * 10;
        bonusFood += venusFood;
        pushRelicFloat(venusRelic, `+${venusFood}`, '#4ade80');
        relicStoreApi.incrementRelicBonus(venusRelic.instanceId, -venusRelic.bonus_stacks);
    }

    // ── 유물 ID 22: 외치의 구리 도끼 — 숲이 있으면 골드 +1 ──
    const otziRelic = getRelicInst(RELIC_ID.OTZI_COPPER_AXE);
    if (otziRelic) {
        let hasForest = false;
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                const cell = board[x][y];
                if (cell && !cell.is_marked_for_destruction && cell.definition.id === S.forest) hasForest = true;
            }
        }
        if (hasForest) {
            bonusGold += 1;
            pushRelicFloat(otziRelic, '+1', '#fbbf24');
        }
    }

    // ── 유물 ID 23: 세스테르티우스 동전 — 골드 50 이상이면 지식 +1 ──
    const sestertiusRelic = getRelicInst(RELIC_ID.SESTERTIUS_COIN);
    if (sestertiusRelic && currentGold >= 50) {
        bonusKnowledge += 1;
        pushRelicFloat(sestertiusRelic, '+1', '#60a5fa');
    }

    // ── 유물 ID 26: 이슈타르 문 황소 부조 — 소/양/말 하나당 골드 +1 ──
    const ishtarRelic = getRelicInst(RELIC_ID.ISHTAR_BULL_RELIEF);
    if (ishtarRelic) {
        let animalCount = 0;
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                const id = board[x][y]?.definition.id;
                if (id === S.cattle || id === S.sheep || id === S.horse) animalCount++;
            }
        }
        if (animalCount > 0) {
            bonusGold += animalCount;
            pushRelicFloat(ishtarRelic, `+${animalCount}`, '#fbbf24');
        }
    }

    // ── 유물 ID 27: 백제 금동대향로 — 종교 심볼이 있으면 지식 +2 ──
    const baekjeRelic = getRelicInst(RELIC_ID.BAEKJE_INCENSE_BURNER);
    if (baekjeRelic) {
        let hasReligionOnBoard = false;
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                const cell = board[x][y];
                if (cell && !cell.is_marked_for_destruction && cell.definition.type === SymbolType.RELIGION) hasReligionOnBoard = true;
            }
        }
        if (hasReligionOnBoard) {
            bonusKnowledge += 2;
            pushRelicFloat(baekjeRelic, '+2', '#60a5fa');
        }
    }

    // ── 유물 ID 28: 진시황 병마용 — 보유 전투 심볼 수당 골드 +2 ──
    const terracottaRelic = getRelicInst(RELIC_ID.TERRACOTTA_ARMY);
    if (terracottaRelic) {
        const combatSymbolCount = ownedSymbols.filter((s) => s.definition.type === SymbolType.UNIT).length;
        const terracottaGold = combatSymbolCount * 2;
        if (terracottaGold > 0) {
            bonusGold += terracottaGold;
            pushRelicFloat(terracottaRelic, `+${terracottaGold}`, '#fbbf24');
        }
    }

    // ── 유물 ID 29: 사양방존 청동기 — 네 구석이 모두 차 있으면 모든 자원 +1 ──
    const fangzunRelic = getRelicInst(RELIC_ID.SIYANG_FANGZUN);
    if (fangzunRelic) {
        const corners = [
            board[0]?.[0],
            board[boardWidth - 1]?.[0],
            board[0]?.[boardHeight - 1],
            board[boardWidth - 1]?.[boardHeight - 1],
        ];
        if (corners.every((cell) => cell && !cell.is_marked_for_destruction)) {
            bonusFood += 1;
            bonusGold += 1;
            bonusKnowledge += 1;
            pushRelicFloat(fangzunRelic, '+1/+1/+1', '#e5e7eb');
        }
    }

    // ── 유물 ID 30: 모아이 석상 — 빈 슬롯 3개당 골드 +1 ──
    const moaiRelic = getRelicInst(RELIC_ID.MOAI_STATUE);
    if (moaiRelic) {
        let emptySlots = 0;
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                const cell = board[x][y];
                if (!cell || cell.is_marked_for_destruction) emptySlots++;
            }
        }
        const moaiGold = Math.floor(emptySlots / 3);
        if (moaiGold > 0) {
            bonusGold += moaiGold;
            pushRelicFloat(moaiRelic, `+${moaiGold}`, '#fbbf24');
        }
    }

    // ── 유물 ID 31: 니네베의 사자 부조 — 적이 있으면 지식 +2 ──
    const ninevehRelic = getRelicInst(RELIC_ID.NINEVEH_LION_RELIEF);
    if (ninevehRelic) {
        let hasEnemyOnBoard = false;
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                const cell = board[x][y];
                if (cell && !cell.is_marked_for_destruction && cell.definition.type === SymbolType.ENEMY) hasEnemyOnBoard = true;
            }
        }
        if (hasEnemyOnBoard) {
            bonusKnowledge += 2;
            pushRelicFloat(ninevehRelic, '+2', '#60a5fa');
        }
    }

    // ── 유물 ID 34: 헤레포드 마파문디 — 모든 지형 유형이 보드에 있으면 모든 자원 +10 ──
    const herefordRelic = getRelicInst(RELIC_ID.HEREFORD_MAPPA_MUNDI);
    if (herefordRelic) {
        const terrainIdsOnBoard = new Set<number>();
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                const cell = board[x][y];
                if (cell && !cell.is_marked_for_destruction && cell.definition.type === SymbolType.TERRAIN) {
                    terrainIdsOnBoard.add(cell.definition.id);
                }
            }
        }
        const allTerrainIds = [S.grassland, S.plains, S.sea, S.forest, S.rainforest, S.desert, S.oasis, S.mountain];
        if (allTerrainIds.every((id) => terrainIdsOnBoard.has(id))) {
            bonusFood += 10;
            bonusGold += 10;
            bonusKnowledge += 10;
            pushRelicFloat(herefordRelic, '+10/+10/+10', '#e5e7eb');
        }
    }

    // ── 유물 ID 35: 수메르 왕명표 — 배치된 시대 심볼당 식량 +1 ──
    const kingListRelic = getRelicInst(RELIC_ID.SUMERIAN_KING_LIST);
    if (kingListRelic) {
        let eraSymbolCount = 0;
        const eraTypes = new Set<SymbolType>([SymbolType.ANCIENT, SymbolType.MEDIEVAL, SymbolType.MODERN]);
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                const cell = board[x][y];
                if (cell && !cell.is_marked_for_destruction && eraTypes.has(cell.definition.type)) eraSymbolCount++;
            }
        }
        if (eraSymbolCount > 0) {
            bonusFood += eraSymbolCount;
            pushRelicFloat(kingListRelic, `+${eraSymbolCount}`, '#4ade80');
        }
    }

    // ── 유물 ID 38: 아슈르바니팔 색인 점토판 — 보드에 중복 심볼이 없으면 식량/골드 +5 ──
    const ashurbanipalRelic = getRelicInst(RELIC_ID.ASHURBANIPAL_INDEX_TABLET);
    if (ashurbanipalRelic) {
        const seenIds = new Set<number>();
        let hasDuplicate = false;
        let symbolCount = 0;
        for (let x = 0; x < boardWidth; x++) {
            for (let y = 0; y < boardHeight; y++) {
                const cell = board[x][y];
                if (!cell || cell.is_marked_for_destruction) continue;
                symbolCount++;
                if (seenIds.has(cell.definition.id)) hasDuplicate = true;
                seenIds.add(cell.definition.id);
            }
        }
        if (symbolCount > 0 && !hasDuplicate) {
            bonusFood += 5;
            bonusGold += 5;
            pushRelicFloat(ashurbanipalRelic, '+5/+5', '#e5e7eb');
        }
    }

    // ── 리더/영구 보너스 ──
    // 진시황 천하부강: 보드 심볼 2개당 식량 +1, 빈 칸 2개당 지식 +1 (파괴 예정 칸은 빈 칸)
    if (isLeaderUnlockActive(leaderId, leaderProgressLevel, 'shihuang_prosperity')) {
        let placedSymbols = 0;
        let emptySlots = 0;
        for (let qx = 0; qx < boardWidth; qx++) {
            for (let qy = 0; qy < boardHeight; qy++) {
                const cell = board[qx][qy];
                if (cell && !cell.is_marked_for_destruction) placedSymbols++;
                else emptySlots++;
            }
        }
        const qinDivisor = currentEra >= 3 ? 2 : currentEra >= 2 ? 3 : 4;
        const qinFood = Math.floor(placedSymbols / qinDivisor);
        const qinKnowledge = Math.floor(emptySlots / qinDivisor);
        if (qinFood > 0) bonusFood += qinFood;
        if (qinKnowledge > 0) bonusKnowledge += qinKnowledge;
    }

    // 람세스 유물 금고: 보유 비소모형 유물 1개당 지식 +1/턴
    if (isLeaderUnlockActive(leaderId, leaderProgressLevel, 'relic_vault')) {
        const relicVaultKnowledge = countNonConsumableRelics(relics);
        if (relicVaultKnowledge > 0) {
            bonusKnowledge += relicVaultKnowledge;
        }
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

    // ── Tax (53): 무작위 인접 심볼 슬롯의 이번 턴 식량 합계만큼 G+ (effects 집계 후 정산)
    // ── 유물 ID 32: 솔로몬의 인장 반지 — 1번 슬롯(0,0) 자원 효과 한 번 더 적용 ──
    const solomonRelic = getRelicInst(RELIC_ID.SOLOMON_SEAL_RING);
    const slotOne = board[0]?.[0];
    if (solomonRelic && slotOne && !slotOne.is_marked_for_destruction) {
        let extraFood = 0;
        let extraGold = 0;
        let extraKnowledge = 0;
        for (const effect of effects) {
            if (effect.x !== 0 || effect.y !== 0) continue;
            extraFood += effect.food ?? 0;
            extraGold += effect.gold ?? 0;
            extraKnowledge += effect.knowledge ?? 0;
        }
        if (extraFood !== 0 || extraGold !== 0 || extraKnowledge !== 0) {
            bonusFood += extraFood;
            bonusGold += extraGold;
            bonusKnowledge += extraKnowledge;
            effects.push({ x: 0, y: 0, food: extraFood, gold: extraGold, knowledge: extraKnowledge });
            const parts = [
                extraFood ? `F${extraFood > 0 ? '+' : ''}${extraFood}` : null,
                extraGold ? `G${extraGold > 0 ? '+' : ''}${extraGold}` : null,
                extraKnowledge ? `K${extraKnowledge > 0 ? '+' : ''}${extraKnowledge}` : null,
            ].filter(Boolean);
            pushRelicFloat(solomonRelic, parts.join(' '), '#e5e7eb');
        }
    }

    // ── AGI Core (63): 보드 위 모든 심볼의 지식 생산량을 흡수하고, 누적 500 이상이면 즉시 승리 ──
    const knowledgeBySlotKey = new Map<string, number>();
    for (const e of effects) {
        const k = `${e.x},${e.y}`;
        knowledgeBySlotKey.set(k, (knowledgeBySlotKey.get(k) ?? 0) + (e.knowledge ?? 0));
    }
    const totalBoardKnowledgeProduced = Array.from(knowledgeBySlotKey.values()).reduce((sum, value) => sum + Math.max(0, value), 0);
    if (totalBoardKnowledgeProduced > 0) {
        for (let ax = 0; ax < boardWidth; ax++) {
            for (let ay = 0; ay < boardHeight; ay++) {
                const cell = board[ax][ay];
                if (!cell || cell.definition.id !== S.agi_core || cell.is_marked_for_destruction) continue;
                cell.effect_counter = (cell.effect_counter ?? 0) + totalBoardKnowledgeProduced;
                if (cell.effect_counter >= 500) agiVictory = true;
            }
        }
    }

    // ── 유물 ID 3: 우르의 전차 바퀴 — 대상 계산만(적용/연출은 호출자가 처리)
    let urWheelPlan: UrWheelPlan | null = null;
    const urWheelRelicForPlan = getRelicInst(RELIC_ID.UR_WHEEL);
    if (urWheelRelicForPlan && urWheelRelicForPlan.effect_counter > 0) {
        rebuildEffectBySlot();
        // Compare the final per-slot Food totals produced during this turn.
        let target: { x: number; y: number } | null = null;
        let minFood = Infinity;
        for (let ux = 0; ux < boardWidth; ux++) {
            for (let uy = 0; uy < boardHeight; uy++) {
                const s = board[ux][uy];
                if (!s || s.is_marked_for_destruction) continue;
                const producedFood = Math.max(0, effectBySlot.get(`${ux},${uy}`)?.food ?? 0);
                if (producedFood < minFood) {
                    minFood = producedFood;
                    target = { x: ux, y: uy };
                }
            }
        }
        urWheelPlan = { instanceId: urWheelRelicForPlan.instanceId, target };
    }

    // ── 야만인 침입 디버프 남은 턴수 차감 ──
    for (const s of ownedSymbols) {
        if (s.spawnedByBarbarianInvasion && s.barbarianInvasionTurnsRemaining !== undefined && s.barbarianInvasionTurnsRemaining > 0) {
            s.barbarianInvasionTurnsRemaining--;
        }
    }

    return {
        destroyedCount,
        destroyedSymbols,
        addSymbolIds,
        bonusFood,
        bonusGold,
        bonusKnowledge,
        agiVictory,
        refreshRelicShop,
        relicOwnEffectFloats,
        knowledgeOwnEffectFloats,
        urWheelPlan,
    };
}
