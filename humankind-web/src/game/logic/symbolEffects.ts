import type { PlayerSymbolInstance } from '../types';
import { SymbolType } from '../data/symbolDefinitions';
import {
    buildEffectResult,
    createEffectState,
    getAdjacentCoords,
    type SymbolEffectHandler,
    type SymbolEffectHandlerContext,
} from './symbolEffects/core';
import { handleAncientEffects } from './symbolEffects/handlers/ancientEffects';
import { handleDisasterEffects } from './symbolEffects/handlers/disasterEffects';
import { handleEnemyEffects } from './symbolEffects/handlers/enemyEffects';
import { handleMedievalEffects } from './symbolEffects/handlers/medievalEffects';
import { handleNormalEffects } from './symbolEffects/handlers/normalEffects';
import { handleReligionEffects } from './symbolEffects/handlers/religionEffects';
import { handleTerrainEffects } from './symbolEffects/handlers/terrainEffects';
import { DEFAULT_RELIC_EFFECTS, type ActiveRelicEffects, type BoardGrid, type EffectResult, type SymbolEffectContext } from './symbolEffects/types';

export type { EffectResult, SymbolEffectContext } from './symbolEffects/types';

/** 현재 보유 유물의 활성 효과 플래그 (`relicDefinitions` 1–19 + 지식 업그레이드 일부, gameStore에서 조합) */
export type { ActiveRelicEffects } from './symbolEffects/types';

export { DEFAULT_RELIC_EFFECTS } from './symbolEffects/types';

const EFFECT_HANDLERS: SymbolEffectHandler[] = [
    handleDisasterEffects,
    handleTerrainEffects,
    handleAncientEffects,
    handleMedievalEffects,
    handleReligionEffects,
    handleEnemyEffects,
    handleNormalEffects,
];

export const processSingleSymbolEffects = (
    symbolInstance: PlayerSymbolInstance,
    boardGrid: BoardGrid,
    x: number,
    y: number,
    ctx: SymbolEffectContext,
    relicEffects: ActiveRelicEffects = DEFAULT_RELIC_EFFECTS,
    disabledTerrainCoords?: ReadonlySet<string>
): EffectResult => {
    symbolInstance.effect_counter = (symbolInstance.effect_counter || 0);

    if (
        disabledTerrainCoords &&
        symbolInstance.definition.type === SymbolType.TERRAIN &&
        disabledTerrainCoords.has(`${x},${y}`)
    ) {
        return { food: 0, gold: 0, knowledge: 0 };
    }

    const state = createEffectState();
    const handlerCtx: SymbolEffectHandlerContext = {
        symbolInstance,
        boardGrid,
        x,
        y,
        ctx,
        relicEffects,
        state,
        adj: getAdjacentCoords(x, y),
        upgrades: ctx.upgrades,
    };

    for (const handler of EFFECT_HANDLERS) {
        if (handler(handlerCtx)) break;
    }

    return buildEffectResult(state);
};
