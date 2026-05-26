import type { SymbolDefinition } from '../../data/symbolDefinitions';
import { SYMBOLS, SymbolType, RELIGION_DOCTRINE_IDS, EXCLUDED_FROM_BASE_POOL, S, Sym } from '../../data/symbolDefinitions';
import type { LeaderId } from '../../data/leaders';
import { isLeaderUnlockActive } from '../../data/leaders';
import {
    CAPITAL_RELOCATION_MIN_SYMBOLS,
    GAME_EVENTS,
    isGameEventDefinition,
    type GameEventDefinition,
} from '../../data/eventDefinitions';
import { resolveUpgradedUnitDefinition } from '../../data/unitUpgrades';
import {
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    CARAVANSERAI_UPGRADE_ID,
    COMPASS_UPGRADE_ID,
    CURRENCY_UPGRADE_ID,
    DRY_STORAGE_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    HUNTING_UPGRADE_ID,
    JUNGLE_EXPEDITION_UPGRADE_ID,
    MASS_MEDIA_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    PUBLIC_ADMINISTRATION_UPGRADE_ID,
    WRITING_SYSTEM_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';

export interface SelectionContext {
    era: number;
    religionUnlocked: boolean;
    upgrades: number[];
    ownedRelicDefIds: number[];
    ownedSymbolDefIds?: number[];
    leaderId?: LeaderId | null;
    leaderProgressLevel?: number;
    /** Ongoing board effects may reduce the standard symbol choice count. */
    choiceCount?: number;
    /** 개척자(68): 다음 선택지에 지형 1칸 이상 강제 */
    forceTerrainInNextSymbolChoices: boolean;
    /** 왕도개척(54): 다음 선택지에 이벤트 1개 이상 강제 */
    forceEventsInNextSymbolChoices?: boolean;
    /** Explicit terrain-only selections should still work after Modern Age removes terrain from standard choices. */
    includeModernTerrain?: boolean;
}

export type SelectionChoice = SymbolDefinition | GameEventDefinition;

const EVENT_REPLACE_CHANCE_PER_CARD = 0.1;
const PUBLIC_ADMINISTRATION_EVENT_CHANCE_MULTIPLIER = 1.5;
const MASS_MEDIA_EVENT_CHANCE_MULTIPLIER = 2;

/** 지형 보유 임계값으로 활성화되는 조건부 이벤트 룩업 — 키 추가만으로 풀이 확장됨 */
const TERRAIN_EVENT_REQUIREMENTS: Record<string, { symbolId: number; threshold: number }> = {
    grassland_festival: { symbolId: S.grassland, threshold: 3 },
    plains_pasture: { symbolId: S.plains, threshold: 2 },
    maritime_trade: { symbolId: S.sea, threshold: 3 },
    forest_harvest: { symbolId: S.forest, threshold: 3 },
    jungle_expedition: { symbolId: S.rainforest, threshold: 2 },
    desert_caravan: { symbolId: S.desert, threshold: 1 },
    mountain_lookout: { symbolId: S.mountain, threshold: 1 },
    oasis_blessing: { symbolId: S.oasis, threshold: 1 },
};

/** every_terrain_bounty 조건 — 8종 지형 모두 1개 이상 */
const EVERY_TERRAIN_REQUIRED_IDS: readonly number[] = [
    S.grassland,
    S.plains,
    S.sea,
    S.forest,
    S.rainforest,
    S.desert,
    S.oasis,
    S.mountain,
];

function getEligibleEvents(ctx: Pick<SelectionContext, 'era' | 'ownedSymbolDefIds' | 'leaderId' | 'leaderProgressLevel'>): GameEventDefinition[] {
    const ownedSymbolDefIds = ctx.ownedSymbolDefIds ?? [];

    return Object.values(GAME_EVENTS).filter((event) => {
        if (event.category === 'leader') {
            if (event.key === 'kadesh_battle_escape') {
                return isLeaderUnlockActive(ctx.leaderId ?? null, ctx.leaderProgressLevel ?? 1, 'kadesh_battle_escape');
            }
            if (event.key === 'currency_standardization') {
                return isLeaderUnlockActive(ctx.leaderId ?? null, ctx.leaderProgressLevel ?? 1, 'currency_standardization');
            }
            return false;
        }
        if (event.era != null && event.era !== ctx.era) return false;
        if (event.category !== 'conditional') return true;

        if (event.key === 'capital_relocation') {
            return ownedSymbolDefIds.length >= CAPITAL_RELOCATION_MIN_SYMBOLS;
        }

        if (event.key === 'every_terrain_bounty') {
            const owned = new Set(ownedSymbolDefIds);
            return EVERY_TERRAIN_REQUIRED_IDS.every((id) => owned.has(id));
        }

        if (event.key === 'military_draft') {
            const unitCount = ownedSymbolDefIds.filter((id) => SYMBOLS[id]?.type === SymbolType.UNIT).length;
            return unitCount >= 3;
        }

        const req = TERRAIN_EVENT_REQUIREMENTS[event.key];
        if (req) {
            const count = ownedSymbolDefIds.reduce((acc, id) => (id === req.symbolId ? acc + 1 : acc), 0);
            return count >= req.threshold;
        }

        return false;
    });
}

function getEventReplaceChancePerCard(upgrades: readonly number[]): number {
    let multiplier = 1;
    if (upgrades.includes(PUBLIC_ADMINISTRATION_UPGRADE_ID)) {
        multiplier *= PUBLIC_ADMINISTRATION_EVENT_CHANCE_MULTIPLIER;
    }
    if (upgrades.includes(MASS_MEDIA_UPGRADE_ID)) {
        multiplier *= MASS_MEDIA_EVENT_CHANCE_MULTIPLIER;
    }
    return Math.min(1, EVENT_REPLACE_CHANCE_PER_CARD * multiplier);
}

function maybeReplaceChoicesWithEvents(choices: SymbolDefinition[], ctx: SelectionContext): SelectionChoice[] {
    const events = getEligibleEvents(ctx);
    if (events.length === 0 || choices.length === 0) {
        return choices;
    }

    const eventReplaceChance = getEventReplaceChancePerCard(ctx.upgrades ?? []);
    return choices.map((choice) => {
        if (Math.random() >= eventReplaceChance) return choice;
        return events[Math.floor(Math.random() * events.length)]!;
    });
}

/** 유물에 의해 대체될 심볼 맵 (Relic ID -> [Original Symbol ID, Replacement Symbol ID]) */
const SYMBOL_REPLACEMENTS_BY_RELIC: Record<number, [number, number]> = {
    // 8: [7, 39] // (Disabled: Now adds Tablet as additional symbol)
};

/** 심볼을 시대별로 그룹화 (적 심볼은 이벤트로만 등장하므로 선택 풀에서 제외) */
export function getSymbolsByEra(ctx: Pick<SelectionContext, 'religionUnlocked' | 'upgrades' | 'ownedRelicDefIds' | 'leaderId' | 'leaderProgressLevel' | 'includeModernTerrain'>): Record<number, SymbolDefinition[]> {
    const result: Record<number, SymbolDefinition[]> = {};
    const hasRelic = (relicId: number) => ctx.ownedRelicDefIds.includes(relicId);

    // 현재 유물에 의해 대체되어야 할 심볼 ID들과 그 대체물들 파악
    const activeReplacements = new Map<number, number>();
    for (const [relicId, [oldId, newId]] of Object.entries(SYMBOL_REPLACEMENTS_BY_RELIC)) {
        if (hasRelic(Number(relicId))) {
            activeReplacements.set(oldId, newId);
        }
    }

    const upgrades = ctx.upgrades ?? [];
    const feudal = upgrades.includes(FEUDALISM_UPGRADE_ID);
    const modernAge = upgrades.includes(MODERN_AGE_UPGRADE_ID);

    for (const sym of Object.values(SYMBOLS)) {
        let finalSym = sym;

        // 1. 제외 목록에 있고, 어떤 유물의 대체물도 아니라면 건너뜀
        const isReplacementTarget = Array.from(activeReplacements.values()).includes(sym.id);

        if (feudal && sym.type === SymbolType.ANCIENT) continue;
        if (modernAge && sym.type === SymbolType.MEDIEVAL) continue;
        if (modernAge && sym.type === SymbolType.TERRAIN && !ctx.includeModernTerrain) continue;

        // 업그레이드로 해금되는 심볼들 예외 처리
        let isUnlocked = !EXCLUDED_FROM_BASE_POOL.has(sym.id);
        if (sym.type === SymbolType.ANCIENT && !upgrades.includes(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID)) {
            isUnlocked = false;
        }
        if (sym.id === S.library && upgrades.includes(WRITING_SYSTEM_UPGRADE_ID)) isUnlocked = true; // Writing -> Library
        if (sym.id === S.merchant && upgrades.includes(CURRENCY_UPGRADE_ID)) isUnlocked = true; // Currency -> Merchant
        if (sym.id === S.horse && upgrades.includes(HORSEMANSHIP_UPGRADE_ID)) isUnlocked = true; // Horsemanship -> Horse
        if ((sym.id === S.crab || sym.id === S.pearl) && upgrades.includes(FISHERIES_UPGRADE_ID)) isUnlocked = true; // Fisheries -> Crab, Pearl
        if (sym.id === S.compass && upgrades.includes(COMPASS_UPGRADE_ID)) isUnlocked = true; // Compass -> Compass
        if (sym.id === S.expedition && upgrades.includes(JUNGLE_EXPEDITION_UPGRADE_ID)) isUnlocked = true; // Jungle Expedition -> Expedition
        if ((sym.id === S.dye || sym.id === S.papyrus) && upgrades.includes(DRY_STORAGE_UPGRADE_ID)) isUnlocked = true; // Dry Storage -> Dye, Papyrus
        if (sym.id === S.caravanserai && upgrades.includes(CARAVANSERAI_UPGRADE_ID)) isUnlocked = true; // Caravanserai -> Caravanserai
        if (sym.id === S.stone_tablet && hasRelic(8)) isUnlocked = true; // Ten Commandments -> Tablet (Pool Unlock)
        if (RELIGION_DOCTRINE_IDS.has(sym.id) && ctx.religionUnlocked) isUnlocked = true; // Theology -> Religion (Doctrine)
        if ((sym.id === S.mushroom || sym.id === S.fur) && upgrades.includes(HUNTING_UPGRADE_ID)) isUnlocked = true;
        if (sym.id === S.heqet && isLeaderUnlockActive(ctx.leaderId ?? null, ctx.leaderProgressLevel ?? 1, 'heqet')) isUnlocked = true;
        if (sym.id === S.foxtail_millet && isLeaderUnlockActive(ctx.leaderId ?? null, ctx.leaderProgressLevel ?? 1, 'foxtail_millet')) isUnlocked = true;

        if (!isUnlocked && !isReplacementTarget) continue;

        // 2. 현재 활성화된 유물에 의해 대체되어야 하는 심볼인 경우 대체
        if (activeReplacements.has(sym.id)) {
            const replacementId = activeReplacements.get(sym.id)!;
            finalSym = SYMBOLS[replacementId] || sym;
        }

        finalSym = resolveUpgradedUnitDefinition(finalSym, upgrades);

        if (finalSym.type === SymbolType.ENEMY) continue;
        let e = finalSym.type as number;

        // ANCIENT, UNIT 은 확률 테이블 상 NORMAL로 편입
        if (e === SymbolType.ANCIENT || e === SymbolType.UNIT) {
            e = SymbolType.NORMAL;
        }

        // 종교 심볼은 해금되었을 때만 결과 풀에 넣음
        if (e === SymbolType.RELIGION && !ctx.religionUnlocked) continue;

        if (!result[e]) result[e] = [];

        // 중복 방지 (이미 대체된 심볼이 들어와 있을 수 있음)
        if (!result[e].find((s) => s.id === finalSym.id)) {
            result[e].push(finalSym);
        }
    }
    return result;
}

/** 현재 시대에 등장 가능한 심볼 플랫 풀 빌드 (균등 확률용) */
export function buildFlatPool(ctx: Pick<SelectionContext, 'era' | 'religionUnlocked' | 'upgrades' | 'ownedRelicDefIds' | 'leaderId' | 'leaderProgressLevel' | 'includeModernTerrain'>): SymbolDefinition[] {
    const symbolsByEra = getSymbolsByEra({
        religionUnlocked: ctx.religionUnlocked,
        upgrades: ctx.upgrades,
        ownedRelicDefIds: ctx.ownedRelicDefIds,
        leaderId: ctx.leaderId,
        leaderProgressLevel: ctx.leaderProgressLevel,
        includeModernTerrain: ctx.includeModernTerrain,
    });
    const flat: SymbolDefinition[] = [];
    const feudal = ctx.upgrades?.includes(FEUDALISM_UPGRADE_ID);
    const modernAge = ctx.upgrades?.includes(MODERN_AGE_UPGRADE_ID);

    for (const [catStr, syms] of Object.entries(symbolsByEra)) {
        if (!syms || syms.length === 0) continue;
        const cat = Number(catStr);
        if (cat === SymbolType.RELIGION && !ctx.religionUnlocked) continue;
        if (cat === SymbolType.MEDIEVAL && !feudal) continue;
        if (cat === SymbolType.MODERN && !modernAge) continue;
        if (modernAge && cat === SymbolType.MEDIEVAL) continue;
        if (modernAge && cat === SymbolType.TERRAIN && !ctx.includeModernTerrain) continue;
        flat.push(...syms);
    }

    return flat;
}

/** 지형 심볼만 3개 (영토 정비 보너스 선택용) */
export function generateTerrainOnlyChoices(ctx: Pick<SelectionContext, 'era' | 'religionUnlocked' | 'upgrades' | 'ownedRelicDefIds'>): SymbolDefinition[] {
    const pool = buildFlatPool({ ...ctx, includeModernTerrain: true }).filter((s) => s.type === SymbolType.TERRAIN);
    const choices: SymbolDefinition[] = [];
    for (let i = 0; i < 3; i++) {
        if (pool.length > 0) {
            choices.push(pool[Math.floor(Math.random() * pool.length)]!);
        } else {
            choices.push(Sym.grassland);
        }
    }
    return choices;
}

/** 유닛 심볼만 3개 (군사 소집 유물용) */
export function generateUnitOnlyChoices(ctx: Pick<SelectionContext, 'era' | 'religionUnlocked' | 'upgrades' | 'ownedRelicDefIds' | 'leaderId' | 'leaderProgressLevel'>): SymbolDefinition[] {
    const pool = buildFlatPool(ctx).filter((s) => s.type === SymbolType.UNIT);
    const choices: SymbolDefinition[] = [];
    const defaultUnit = SYMBOLS[S.warrior] || Sym.warrior || pool[0];
    for (let i = 0; i < 3; i++) {
        if (pool.length > 0) {
            choices.push(pool[Math.floor(Math.random() * pool.length)]!);
        } else {
            choices.push(defaultUnit);
        }
    }
    return choices;
}

/** 현재 플레이어에게 가능한 이벤트만 3개 뽑습니다. */
export function generateEventOnlyChoices(
    ctx: Pick<SelectionContext, 'era' | 'ownedSymbolDefIds' | 'leaderId' | 'leaderProgressLevel'>,
): GameEventDefinition[] {
    const pool = getEligibleEvents(ctx);
    const choices: GameEventDefinition[] = [];
    for (let i = 0; i < 3; i++) {
        if (pool.length === 0) break;
        choices.push(pool[Math.floor(Math.random() * pool.length)]!);
    }
    return choices;
}

export interface GenerateChoicesResult {
    choices: SelectionChoice[];
    consumedForceTerrain: boolean;
    consumedForceEvents?: boolean;
}

/** 심볼 3개 생성 — 중세시대(15) 해금 시 지형 가중 x0.2 */
export function generateChoices(ctx: SelectionContext): GenerateChoicesResult {
    const pool = buildFlatPool(ctx);
    const upgrades = ctx.upgrades || [];
    const feudalTerrainWeight = upgrades.includes(FEUDALISM_UPGRADE_ID);
    const choiceCount = ctx.choiceCount ?? 3;

    const terrainSyms = pool.filter((s) => s.type === SymbolType.TERRAIN);
    const otherSyms = pool.filter((s) => s.type !== SymbolType.TERRAIN);

    const pickOne = (): SymbolDefinition => {
        if (terrainSyms.length === 0 && otherSyms.length === 0) return Sym.wheat;
        if (terrainSyms.length === 0) return otherSyms[Math.floor(Math.random() * otherSyms.length)]!;
        if (otherSyms.length === 0) return terrainSyms[Math.floor(Math.random() * terrainSyms.length)]!;
        const tw = feudalTerrainWeight ? 0.2 * terrainSyms.length : terrainSyms.length;
        const ow = otherSyms.length;
        if (Math.random() * (tw + ow) < tw) {
            return terrainSyms[Math.floor(Math.random() * terrainSyms.length)]!;
        }
        return otherSyms[Math.floor(Math.random() * otherSyms.length)]!;
    };

    const choices: SymbolDefinition[] = [];
    let consumedForceTerrain = false;

    if (ctx.forceTerrainInNextSymbolChoices) {
        const tPick =
            terrainSyms.length > 0
                ? terrainSyms[Math.floor(Math.random() * terrainSyms.length)]!
                : otherSyms[Math.floor(Math.random() * otherSyms.length)] ?? Sym.grassland;
        choices.push(tPick);
        while (choices.length < choiceCount) choices.push(pickOne());
        consumedForceTerrain = true;
    } else {
        for (let i = 0; i < choiceCount; i++) choices.push(pickOne());
    }

    const finalChoices: SelectionChoice[] = maybeReplaceChoicesWithEvents(choices, ctx);
    let consumedForceEvents = false;

    if (ctx.forceEventsInNextSymbolChoices) {
        const hasEvent = finalChoices.some(isGameEventDefinition);
        if (!hasEvent) {
            const events = getEligibleEvents(ctx);
            if (events.length > 0) {
                const replaceIdx = Math.floor(Math.random() * finalChoices.length);
                finalChoices[replaceIdx] = events[Math.floor(Math.random() * events.length)]!;
            }
        }
        consumedForceEvents = true;
    }

    return {
        choices: finalChoices,
        consumedForceTerrain,
        consumedForceEvents,
    };
}

/** 개발자용: 현재 상태에서 각 심볼이 한 번 픽될 확률(%) 반환 (균등) */
export function getSymbolPoolProbabilities(ctx: Pick<SelectionContext, 'era' | 'religionUnlocked' | 'upgrades' | 'ownedRelicDefIds'>): {
    id: number;
    name: string;
    symbolType: number;
    probability: number;
}[] {
    const pool = buildFlatPool(ctx);
    if (pool.length === 0) return [];
    const prob = 100 / pool.length;
    return pool
        .map((sym) => ({ id: sym.id, name: sym.name, symbolType: sym.type, probability: prob }))
        .sort((a, b) => a.symbolType - b.symbolType || a.id - b.id);
}
