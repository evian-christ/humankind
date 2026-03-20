import { type SymbolDefinition } from './symbolDefinitions';

/**
 * 심볼 후보 정의 (실제 게임 데이터 오염 방지용 별도 파일)
 *
 * 브레인스토밍 및 디자인된 심볼 후보들. 데이터 브라우저에서 확인하고 추후 실제 SYMBOLS에 적용하기 위한 용도.
 */
// NOTE: 신규 심볼 후보를 추가하기 전에 “심볼 후보” 테이블을 비우기 위한 용도입니다.
// 필요하면 아래에 후보 엔트리를 다시 추가하세요.
export const SYMBOL_CANDIDATES: Record<number, SymbolDefinition> = {};
export const SYMBOL_CANDIDATE_LIST = [];
