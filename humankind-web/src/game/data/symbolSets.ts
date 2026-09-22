import type { SymbolKey } from './symbolDefinitions';

export interface SymbolSetDefinition {
    id: string;
    iconKey?: SymbolKey;
    symbolKeys: readonly SymbolKey[];
    color: string;
}

/** 임시 분류: 세트 소속 심볼 중 장착한 세트만 포함하며, 공통 심볼은 모든 덱에 포함한다. */
export const SYMBOL_SETS: readonly SymbolSetDefinition[] = [
    { id: 'agriculture', iconKey: 'wheat', symbolKeys: ['wheat', 'corn', 'rice'], color: '#b8d874' },
    { id: 'pastoralism', iconKey: 'cattle', symbolKeys: ['cattle', 'sheep', 'horse'], color: '#d4ad78' },
    { id: 'fisheries', iconKey: 'fish', symbolKeys: ['fish', 'crab', 'pearl', 'compass'], color: '#7ab9db' },
    { id: 'hunting', iconKey: 'deer', symbolKeys: ['deer', 'fur'], color: '#94bc7a' },
    { id: 'tropical', iconKey: 'banana', symbolKeys: ['banana', 'cassava', 'expedition'], color: '#70bfa4' },
    { id: 'trade', iconKey: 'date', symbolKeys: ['date', 'dye', 'papyrus', 'caravanserai', 'merchant'], color: '#d9b37c' },
    { id: 'faith', iconKey: 'christianity', symbolKeys: ['christianity', 'islam', 'buddhism', 'hinduism', 'monastery_garden'], color: '#dca6ce' },
    { id: 'scholarship', iconKey: 'library', symbolKeys: ['library', 'stargazer', 'totem'], color: '#9caee1' },
    { id: 'reserve09', symbolKeys: [], color: '#9a9a94' },
    { id: 'reserve10', symbolKeys: [], color: '#9a9a94' },
    { id: 'reserve11', symbolKeys: [], color: '#9a9a94' },
    { id: 'reserve12', symbolKeys: [], color: '#9a9a94' },
];

export type SymbolSetId = (typeof SYMBOL_SETS)[number]['id'];
export const SYMBOL_SET_DECK_SIZE = 8;
/** 보유/획득 기능 도입 전 임시 프로필. 후속 시스템에서 저장 데이터로 교체할 수 있다. */
export const OWNED_SYMBOL_SET_IDS: readonly SymbolSetId[] = SYMBOL_SETS.slice(0, SYMBOL_SET_DECK_SIZE).map((set) => set.id);
export const DEFAULT_SYMBOL_SET_DECK_IDS: readonly SymbolSetId[] = [...OWNED_SYMBOL_SET_IDS];

export const SYMBOL_SET_BY_ID = new Map(SYMBOL_SETS.map((set) => [set.id, set]));
export const SYMBOL_SET_MEMBER_KEYS = new Set<SymbolKey>(SYMBOL_SETS.flatMap((set) => [...set.symbolKeys]));

export const isSymbolSetId = (value: unknown): value is SymbolSetId =>
    typeof value === 'string' && SYMBOL_SET_BY_ID.has(value);

export const normalizeSymbolSetIds = (value: unknown): SymbolSetId[] =>
    Array.isArray(value)
        ? [...new Set(value.filter(isSymbolSetId))].slice(0, SYMBOL_SET_DECK_SIZE)
        : [];

export const isCompleteSymbolSetDeck = (value: unknown): value is SymbolSetId[] =>
    Array.isArray(value) &&
    value.length === SYMBOL_SET_DECK_SIZE &&
    normalizeSymbolSetIds(value).length === SYMBOL_SET_DECK_SIZE;
