import { SymbolType, type SymbolDefinition } from './symbolDefinitions';

/**
 * 심볼 후보 (브라인스토밍용). 실제 심볼은 symbolDefinitions.ts 의 SYMBOLS에 추가됨.
 */
export const SYMBOL_CANDIDATES: Record<number, SymbolDefinition> = {
    1001: {
        id: 1001,
        key: 'candidate1001',
        name: '상인 (고대 개편안)',
        type: SymbolType.ANCIENT,
        description:
            '골드 +1; 인접한 심볼이 이번 턴 식량 3 이상 생산 시: 골드 +2 추가 생산.',
        sprite: '-',
    },
    1002: {
        id: 1002,
        key: 'candidate1002',
        name: '향신료 (고대 개편안)',
        type: SymbolType.ANCIENT,
        description:
            '식량 +1; 인접한 열대우림 또는 오아시스 1개마다: 식량 +1; 둘 모두에 인접 시: 골드 +2.',
        sprite: '052.png',
    },
    1003: {
        id: 1003,
        key: 'candidate1003',
        name: '도서관 (고대 개편안)',
        type: SymbolType.ANCIENT,
        description:
            '지식 +2; 인접한 고대 심볼 1개마다: 지식 +2; 기념비, 토템, 구전 전통 중 하나에 인접 시: 지식 +2.',
        sprite: '-',
    },
};

export const SYMBOL_CANDIDATE_LIST = Object.values(SYMBOL_CANDIDATES);
