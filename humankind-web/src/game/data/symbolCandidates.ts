import type { SymbolDefinition } from './symbolDefinitions';

/**
 * 심볼 후보 (브라인스토밍용). 실제 심볼은 symbolDefinitions.ts 의 SYMBOLS에 추가됨.
 */
export const SYMBOL_CANDIDATES: Record<number, SymbolDefinition> = {};

export const SYMBOL_CANDIDATE_LIST = Object.values(SYMBOL_CANDIDATES);
