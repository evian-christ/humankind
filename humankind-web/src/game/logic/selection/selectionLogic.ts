import type { SymbolDefinition } from '../../data/symbolDefinitions';
import { SYMBOLS, SymbolType, RELIGION_DOCTRINE_IDS, EXCLUDED_FROM_BASE_POOL, S, Sym } from '../../data/symbolDefinitions';
import { resolveUpgradedUnitDefinition } from '../../data/unitUpgrades';
import {
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    CARAVANSERAI_UPGRADE_ID,
    COMPASS_UPGRADE_ID,
    DRY_STORAGE_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    HUNTING_UPGRADE_ID,
    JUNGLE_EXPEDITION_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
} from '../../data/knowledgeUpgrades';

export interface SelectionContext {
    era: number;
    religionUnlocked: boolean;
    upgrades: number[];
    ownedRelicDefIds: number[];
    /** 개척자(68): 다음 선택지에 지형 1칸 이상 강제 */
    forceTerrainInNextSymbolChoices: boolean;
}

/** 유물에 의해 대체될 심볼 맵 (Relic ID -> [Original Symbol ID, Replacement Symbol ID]) */
const SYMBOL_REPLACEMENTS_BY_RELIC: Record<number, [number, number]> = {
    // 8: [7, 39] // (Disabled: Now adds Tablet as additional symbol)
};

/** 심볼을 시대별로 그룹화 (적 심볼은 이벤트로만 등장하므로 선택 풀에서 제외) */
export function getSymbolsByEra(ctx: Pick<SelectionContext, 'religionUnlocked' | 'upgrades' | 'ownedRelicDefIds'>): Record<number, SymbolDefinition[]> {
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
        if (modernAge && sym.type === SymbolType.TERRAIN) continue;

        // 업그레이드로 해금되는 심볼들 예외 처리
        let isUnlocked = !EXCLUDED_FROM_BASE_POOL.has(sym.id);
        if (sym.type === SymbolType.ANCIENT && !upgrades.includes(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID)) {
            isUnlocked = false;
        }
        if (sym.id === S.library && upgrades.includes(1)) isUnlocked = true; // Writing -> Library
        if (sym.id === S.archer && upgrades.includes(5)) isUnlocked = true; // Archery -> Archer
        if (sym.id === S.merchant && upgrades.includes(6)) isUnlocked = true; // Currency -> Merchant
        if (sym.id === S.horse && upgrades.includes(HORSEMANSHIP_UPGRADE_ID)) isUnlocked = true; // Horsemanship -> Horse
        if ((sym.id === S.crab || sym.id === S.pearl) && upgrades.includes(FISHERIES_UPGRADE_ID)) isUnlocked = true; // Fisheries -> Crab, Pearl
        if (sym.id === S.compass && upgrades.includes(COMPASS_UPGRADE_ID)) isUnlocked = true; // Compass -> Compass
        if (sym.id === S.expedition && upgrades.includes(JUNGLE_EXPEDITION_UPGRADE_ID)) isUnlocked = true; // Jungle Expedition -> Expedition
        if ((sym.id === S.dye || sym.id === S.papyrus) && upgrades.includes(DRY_STORAGE_UPGRADE_ID)) isUnlocked = true; // Dry Storage -> Dye, Papyrus
        if (sym.id === S.caravanserai && upgrades.includes(CARAVANSERAI_UPGRADE_ID)) isUnlocked = true; // Caravanserai -> Caravanserai
        if (sym.id === S.stone_tablet && hasRelic(8)) isUnlocked = true; // Ten Commandments -> Tablet (Pool Unlock)
        if (RELIGION_DOCTRINE_IDS.has(sym.id) && ctx.religionUnlocked) isUnlocked = true; // Theology -> Religion (Doctrine)
        if ((sym.id === S.mushroom || sym.id === S.fur) && upgrades.includes(HUNTING_UPGRADE_ID)) isUnlocked = true;

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
export function buildFlatPool(ctx: Pick<SelectionContext, 'era' | 'religionUnlocked' | 'upgrades' | 'ownedRelicDefIds'>): SymbolDefinition[] {
    const symbolsByEra = getSymbolsByEra({
        religionUnlocked: ctx.religionUnlocked,
        upgrades: ctx.upgrades,
        ownedRelicDefIds: ctx.ownedRelicDefIds,
    });
    const flat: SymbolDefinition[] = [];
    const feudal = ctx.upgrades?.includes(FEUDALISM_UPGRADE_ID);
    const modernAge = ctx.upgrades?.includes(MODERN_AGE_UPGRADE_ID);

    for (const [catStr, syms] of Object.entries(symbolsByEra)) {
        if (!syms || syms.length === 0) continue;
        const cat = Number(catStr);
        if (cat === SymbolType.RELIGION && !ctx.religionUnlocked) continue;
        if (cat === SymbolType.MEDIEVAL && ctx.era < 2 && !feudal) continue;
        if (cat === SymbolType.MODERN && ctx.era < 3) continue;
        if (modernAge && cat === SymbolType.MEDIEVAL) continue;
        if (modernAge && cat === SymbolType.TERRAIN) continue;
        flat.push(...syms);
    }

    return flat;
}

/** 지형 심볼만 3개 (영토 정비 보너스 선택용) */
export function generateTerrainOnlyChoices(ctx: Pick<SelectionContext, 'era' | 'religionUnlocked' | 'upgrades' | 'ownedRelicDefIds'>): SymbolDefinition[] {
    const pool = buildFlatPool(ctx).filter((s) => s.type === SymbolType.TERRAIN);
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

export interface GenerateChoicesResult {
    choices: SymbolDefinition[];
    consumedForceTerrain: boolean;
}

/** 심볼 3개 생성 — 중세시대(15) 해금 시 지형 가중 x0.2 */
export function generateChoices(ctx: SelectionContext): GenerateChoicesResult {
    const pool = buildFlatPool(ctx);
    const upgrades = ctx.upgrades || [];
    const feudalTerrainWeight = upgrades.includes(FEUDALISM_UPGRADE_ID);

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

    if (ctx.forceTerrainInNextSymbolChoices) {
        const choices: SymbolDefinition[] = [];
        const tPick =
            terrainSyms.length > 0
                ? terrainSyms[Math.floor(Math.random() * terrainSyms.length)]!
                : otherSyms[Math.floor(Math.random() * otherSyms.length)] ?? Sym.grassland;
        choices.push(tPick);
        while (choices.length < 3) choices.push(pickOne());
        return { choices, consumedForceTerrain: true };
    }

    const choices: SymbolDefinition[] = [];
    for (let i = 0; i < 3; i++) choices.push(pickOne());
    return { choices, consumedForceTerrain: false };
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
