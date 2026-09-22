import type { SymbolDefinition } from '../../data/symbolDefinitions';
import { SYMBOLS, SymbolType, S, Sym } from '../../data/symbolDefinitions';
import { SYMBOL_SET_BY_ID, SYMBOL_SET_MEMBER_KEYS, type SymbolSetId } from '../../data/symbolSets';
import {
    CAPITAL_RELOCATION_MIN_SYMBOLS,
    GAME_EVENTS,
    isGameEventDefinition,
    type GameEventDefinition,
} from '../../data/eventDefinitions';

export interface SelectionContext {
    era: number;
    religionUnlocked: boolean;
    upgrades: number[];
    symbolSetId?: SymbolSetId | null;
    symbolSetIds?: readonly SymbolSetId[] | null;
    ownedSymbolDefIds?: number[];
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

const EVENT_REPLACE_CHANCE_PER_CARD = 0.05;

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

function getEligibleEvents(ctx: Pick<SelectionContext, 'era' | 'ownedSymbolDefIds'>): GameEventDefinition[] {
    const ownedSymbolDefIds = ctx.ownedSymbolDefIds ?? [];

    return Object.values(GAME_EVENTS).filter((event) => {
        if (event.era != null && event.era !== ctx.era) return false;
        if (event.category !== 'conditional') return true;

        if (event.key === 'capital_relocation') {
            return ownedSymbolDefIds.length >= CAPITAL_RELOCATION_MIN_SYMBOLS;
        }

        if (event.key === 'every_terrain_bounty') {
            const owned = new Set(ownedSymbolDefIds);
            return EVERY_TERRAIN_REQUIRED_IDS.every((id) => owned.has(id));
        }

        const req = TERRAIN_EVENT_REQUIREMENTS[event.key];
        if (req) {
            const count = ownedSymbolDefIds.reduce((acc, id) => (id === req.symbolId ? acc + 1 : acc), 0);
            return count >= req.threshold;
        }

        return false;
    });
}

function maybeReplaceChoicesWithEvents(choices: SymbolDefinition[], ctx: SelectionContext): SelectionChoice[] {
    const events = getEligibleEvents(ctx);
    if (events.length === 0 || choices.length === 0) {
        return choices;
    }

    return choices.map((choice) => {
        if (Math.random() >= EVENT_REPLACE_CHANCE_PER_CARD) return choice;
        return events[Math.floor(Math.random() * events.length)]!;
    });
}

/** 심볼을 시대별로 그룹화 */
const getActiveSymbolSets = (ctx: Pick<SelectionContext, 'symbolSetId' | 'symbolSetIds'>) => {
    const ids = ctx.symbolSetIds?.length ? ctx.symbolSetIds : ctx.symbolSetId ? [ctx.symbolSetId] : [];
    return ids.map((id) => SYMBOL_SET_BY_ID.get(id)).filter((set) => set != null);
};

export function getSymbolsByEra(ctx: Pick<SelectionContext, 'religionUnlocked' | 'upgrades' | 'includeModernTerrain' | 'symbolSetId' | 'symbolSetIds'>): Record<number, SymbolDefinition[]> {
    const result: Record<number, SymbolDefinition[]> = {};

    const selectedSets = getActiveSymbolSets(ctx);
    if (selectedSets.length > 0) {
        const includedKeys = new Set(selectedSets.flatMap((set) => [...set.symbolKeys]));
        for (const sym of Object.values(SYMBOLS)) {
            if (sym.type === SymbolType.DISASTER || sym.id === S.loot || sym.id === S.greater_loot || sym.id === S.radiant_loot) continue;
            if (SYMBOL_SET_MEMBER_KEYS.has(sym.key as keyof typeof Sym) && !includedKeys.has(sym.key as keyof typeof Sym)) continue;
            const category = sym.type === SymbolType.ANCIENT ? SymbolType.RESOURCE : sym.type;
            (result[category] ??= []).push(sym);
        }
        return result;
    }

    for (const sym of Object.values(SYMBOLS)) {
        if (sym.type === SymbolType.DISASTER || sym.id === S.loot || sym.id === S.greater_loot || sym.id === S.radiant_loot) continue;

        let e = sym.type as number;

        // ANCIENT 는 확률 테이블 상 기본 자원 묶음으로 편입
        if (e === SymbolType.ANCIENT) {
            e = SymbolType.RESOURCE;
        }

        if (!result[e]) result[e] = [];

        if (!result[e].find((s) => s.id === sym.id)) {
            result[e].push(sym);
        }
    }
    return result;
}

/** 현재 시대에 등장 가능한 심볼 플랫 풀 빌드 (균등 확률용) */
export function buildFlatPool(ctx: Pick<SelectionContext, 'era' | 'religionUnlocked' | 'upgrades' | 'includeModernTerrain' | 'symbolSetId' | 'symbolSetIds'>): SymbolDefinition[] {
    const symbolsByEra = getSymbolsByEra({
        religionUnlocked: ctx.religionUnlocked,
        upgrades: ctx.upgrades,
        includeModernTerrain: ctx.includeModernTerrain,
        symbolSetId: ctx.symbolSetId,
        symbolSetIds: ctx.symbolSetIds,
    });
    if (getActiveSymbolSets(ctx).length > 0) return Object.values(symbolsByEra).flat();
    const flat: SymbolDefinition[] = [];
    for (const syms of Object.values(symbolsByEra)) {
        if (!syms || syms.length === 0) continue;
        flat.push(...syms);
    }

    return flat;
}

/** 지형 심볼만 3개 (영토 정비 보너스 선택용) */
export function generateTerrainOnlyChoices(ctx: Pick<SelectionContext, 'era' | 'religionUnlocked' | 'upgrades' | 'symbolSetId' | 'symbolSetIds'>): SymbolDefinition[] {
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

/** 현재 플레이어에게 가능한 이벤트만 3개 뽑습니다. */
export function generateEventOnlyChoices(
    ctx: Pick<SelectionContext, 'era' | 'ownedSymbolDefIds'>,
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

/** 지식 연구 없이 현재 덱의 전체 해금 심볼 풀에서 선택지를 생성합니다. */
export function generateChoices(ctx: SelectionContext): GenerateChoicesResult {
    const pool = buildFlatPool(ctx);
    const choiceCount = ctx.choiceCount ?? 3;

    const terrainSyms = pool.filter((s) => s.type === SymbolType.TERRAIN);
    const otherSyms = pool.filter((s) => s.type !== SymbolType.TERRAIN);

    const pickOne = (): SymbolDefinition => {
        if (terrainSyms.length === 0 && otherSyms.length === 0) return Sym.wheat;
        if (terrainSyms.length === 0) return otherSyms[Math.floor(Math.random() * otherSyms.length)]!;
        if (otherSyms.length === 0) return terrainSyms[Math.floor(Math.random() * terrainSyms.length)]!;
        const tw = terrainSyms.length;
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
export function getSymbolPoolProbabilities(ctx: Pick<SelectionContext, 'era' | 'religionUnlocked' | 'upgrades' | 'symbolSetId' | 'symbolSetIds'>): {
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
