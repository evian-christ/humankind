import type { PlayerSymbolInstance } from '../types';
import { SymbolType } from '../data/symbolDefinitions';
import {
    buildEffectResult,
    createEffectState,
    getEffectiveAdjacentCoords,
    type SymbolEffectHandler,
    type SymbolEffectHandlerContext,
} from './symbolEffects/core';
import { handleAncientEffects } from './symbolEffects/handlers/ancientEffects';
import { handleDisasterEffects } from './symbolEffects/handlers/disasterEffects';
import { handleMedievalEffects } from './symbolEffects/handlers/medievalEffects';
import { handleNormalEffects } from './symbolEffects/handlers/normalEffects';
import { handleReligionEffects } from './symbolEffects/handlers/religionEffects';
import { handleTerrainEffects } from './symbolEffects/handlers/terrainEffects';
import type { BoardGrid, EffectResult, SymbolEffectContext } from './symbolEffects/types';

export type { EffectResult, SymbolEffectContext } from './symbolEffects/types';

const EFFECT_HANDLERS: SymbolEffectHandler[] = [
    handleDisasterEffects,
    handleTerrainEffects,
    handleAncientEffects,
    handleMedievalEffects,
    handleReligionEffects,
    handleNormalEffects,
];

export const processSingleSymbolEffects = (
    symbolInstance: PlayerSymbolInstance,
    boardGrid: BoardGrid,
    x: number,
    y: number,
    ctx: SymbolEffectContext,
    disabledTerrainCoords?: ReadonlySet<string>
): EffectResult => {
    symbolInstance.effect_counter = (symbolInstance.effect_counter || 0);

    const isTerrainProductionDisabled =
        disabledTerrainCoords &&
        symbolInstance.definition.type === SymbolType.TERRAIN &&
        disabledTerrainCoords.has(`${x},${y}`);

    const state = createEffectState();
    const handlerCtx: SymbolEffectHandlerContext = {
        symbolInstance,
        boardGrid,
        x,
        y,
        ctx,
        state,
        adj: getEffectiveAdjacentCoords(boardGrid, x, y, ctx.allSymbolsAdjacent),
        upgrades: ctx.upgrades,
    };

    for (const handler of EFFECT_HANDLERS) {
        if (handler(handlerCtx)) break;
    }

    const result = buildEffectResult(state);
    if (isTerrainProductionDisabled) {
        result.food = 0;
        result.gold = 0;
        result.knowledge = 0;
    }
    return result;
};
