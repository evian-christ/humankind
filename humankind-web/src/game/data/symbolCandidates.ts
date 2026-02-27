import { Era, SymbolType, type SymbolDefinition } from './symbolDefinitions';

/**
 * 심볼 후보 정의 (실제 게임 데이터 오염 방지용 별도 파일)
 *
 * 브레인스토밍 및 디자인된 심볼 후보들. 데이터 브라우저에서 확인하고 추후 실제 SYMBOLS에 적용하기 위한 용도.
 */
export const SYMBOL_CANDIDATES: Record<number, SymbolDefinition> = {};
export const SYMBOL_CANDIDATE_LIST = Object.values(SYMBOL_CANDIDATES);
