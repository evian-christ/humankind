import type { PlayerSymbolInstance } from '../../types';
import type { ActiveRelicEffects, EffectResult, SymbolEffectContext } from '../symbolEffects/types';

export type BoardGrid = (PlayerSymbolInstance | null)[][];

export interface ProcessSlotArgs {
    symbol: PlayerSymbolInstance;
    board: BoardGrid;
    x: number;
    y: number;
    effectCtx: SymbolEffectContext;
    relicEffects: ActiveRelicEffects;
    disabledTerrainCoords?: ReadonlySet<string>;
}

export interface TurnPipelineDeps {
    processSingleSymbolEffects: (args: ProcessSlotArgs) => EffectResult;
}

/**
 * TurnPipeline (최소 스캐폴딩)
 * - 현재 store 내부에 있는 setTimeout/phase 제어는 그대로 두고,
 *   “슬롯 효과 계산 호출 형태”만 표준화해 이후 오케스트레이터 분리를 쉽게 만든다.
 */
export function computeSingleSlotEffect(deps: TurnPipelineDeps, args: ProcessSlotArgs): EffectResult {
    return deps.processSingleSymbolEffects(args);
}

