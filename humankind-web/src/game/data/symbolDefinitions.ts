import { SYMBOL_NUMERIC_ID, type SymbolKey, S } from './symbolIdRegistry';
import { SymbolType } from './symbolTypes';

export { SymbolType };

export interface SymbolDefinition {
    id: number;
    /** 번역 키·로직 식별용 — 정식 심볼은 `SymbolKey`, 후보·임시는 임의 문자열 */
    key: string;
    name: string;
    type: SymbolType;
    description: string;
    base_attack?: number;
    base_hp?: number;
    sprite: string;
}

type DefBody = Omit<SymbolDefinition, 'id' | 'key'>;

function def(key: SymbolKey, body: DefBody): SymbolDefinition {
    return { key, id: SYMBOL_NUMERIC_ID[key], ...body };
}

/**
 * 심볼 메타데이터(이름·설명·타입·스프라이트)는 여기서 관리합니다.
 * **숫자 ID만** 바꿀 때는 `symbolIdRegistry.ts`의 `SYMBOL_NUMERIC_ID`만 수정하세요.
 */
const SYMBOL_LIST: SymbolDefinition[] = [
    def('christianity', { name: "Christianity", type: SymbolType.RELIGION, description: "+Food equal to the highest Food produced by an adjacent symbol; adjacent to a Religion symbol: -50 Food.", sprite: "031.png" }),
    def('islam', { name: "Islam", type: SymbolType.RELIGION, description: "+2 Gold per adjacent symbol that produces Knowledge; adjacent to a Religion symbol: -50 Food.", sprite: "032.png" }),
    def('buddhism', { name: "Buddhism", type: SymbolType.RELIGION, description: "+2 Food per empty slot; adjacent to a Religion symbol: -50 Food.", sprite: "033.png" }),
    def('hinduism', { name: "Hinduism", type: SymbolType.RELIGION, description: "+5 Food and +5 Knowledge per symbol destroyed this turn; adjacent to a Religion symbol: -50 Food.", sprite: "034.png" }),

    def('wheat', { name: "Wheat", type: SymbolType.NORMAL, description: "Every 10 turns: +10 Food; per adjacent Grassland: counter +1.", sprite: "001.png" }),
    def('rice', { name: "Rice", type: SymbolType.NORMAL, description: "Every 20 turns: +25 Food; per adjacent Grassland: counter +1.", sprite: "002.png" }),
    def('cattle', {
        name: "Cattle",
        type: SymbolType.NORMAL,
        description:
            "+1 Food; 10% chance to produce Cattle; when adjacent to Plains, can butcher; on butcher: +10 Food.",
        sprite: "003.png",
    }),
    def('banana', { name: "Banana", type: SymbolType.NORMAL, description: "+2 Food; 6 turns: destroyed; when adjacent to Rainforest: reset counter.", sprite: "004.png" }),
    def('fish', { name: "Fish", type: SymbolType.NORMAL, description: "When adjacent to Sea: +2 Food.", sprite: "005.png" }),
    def('sea', { name: "Sea", type: SymbolType.TERRAIN, description: "+1 Gold per 4 adjacent symbols.", sprite: "006.png" }),
    def('stone', { name: "Stone", type: SymbolType.NORMAL, description: "+1 Gold; when adjacent to Mountain: +2 additional Gold.", sprite: "007.png" }),
    def('copper', { name: "Copper", type: SymbolType.NORMAL, description: "+1 Gold; if exactly 3 Copper on board: x3 Gold production.", sprite: "008.png" }),
    def('grassland', { name: "Grassland", type: SymbolType.TERRAIN, description: "+2 Food.", sprite: "009.png" }),
    def('monument', { name: "Monument", type: SymbolType.ANCIENT, description: "+5 Knowledge.", sprite: "010.png" }),
    def('oasis', { name: "Oasis", type: SymbolType.TERRAIN, description: "+1 Food per 2 adjacent empty slots.", sprite: "011.png" }),
    def('oral_tradition', { name: "Oral Tradition", type: SymbolType.ANCIENT, description: "10 turns: destroyed; on destroy: +10 Knowledge per adjacent symbol.", sprite: "012.png" }),
    def('rainforest', { name: "Rainforest", type: SymbolType.TERRAIN, description: "+1 Food.", sprite: "013.png" }),
    def('plains', { name: "Plains", type: SymbolType.TERRAIN, description: "+1 Food.", sprite: "014.png" }),
    def('mountain', { name: "Mountain", type: SymbolType.TERRAIN, description: "+1 Food.", sprite: "015.png" }),
    def('totem', { name: "Totem", type: SymbolType.ANCIENT, description: "In a corner: +20 Knowledge.", sprite: "016.png" }),
    def('offering', { name: "Offering", type: SymbolType.ANCIENT, description: "-1 Food, +10 Knowledge.", sprite: "017.png" }),
    def('omen', { name: "Omen", type: SymbolType.ANCIENT, description: "50% chance for +3 Food.", sprite: "018.png" }),
    def('campfire', { name: "Campfire", type: SymbolType.ANCIENT, description: "+1 Food; 10 turns: destroyed; on destroy: copies the effect of the adjacent symbol with the highest Food produced this turn.", sprite: "019.png" }),
    def('pottery', { name: "Pottery", type: SymbolType.ANCIENT, description: "+3 Food stored per turn; on destroy: gain Food equal to stored Counter.", sprite: "020.png" }),
    def('tribal_village', { name: "Tribal Village", type: SymbolType.ANCIENT, description: "Destroyed; on destroy: adds 2 random Ancient symbols.", sprite: "021.png" }),
    def('merchant', { name: "Merchant", type: SymbolType.NORMAL, description: "Not in corner: stores Gold equal to highest adjacent Food; in corner: gains stored Gold.", sprite: "022.png" }),
    def('crab', { name: "Crab", type: SymbolType.NORMAL, description: "When adjacent to Sea: +3 Food.", sprite: "024.png" }),
    def('library', { name: "Library", type: SymbolType.NORMAL, description: "+7 Knowledge.", sprite: "025.png" }),
    def('pearl', { name: "Pearl", type: SymbolType.NORMAL, description: "When adjacent to Sea: +3 Gold.", sprite: "026.png" }),
    def('desert', { name: "Desert", type: SymbolType.TERRAIN, description: "Destroys 1 random adjacent Normal or era symbol.", sprite: "027.png" }),
    def('forest', { name: "Forest", type: SymbolType.TERRAIN, description: "Per adjacent Forest: +1 Food.", sprite: "028.png" }),
    def('deer', { name: "Deer", type: SymbolType.NORMAL, description: "+1 Food; if 2 or more adjacent Forests: +2 Food.", sprite: "029.png" }),
    def('date', { name: "Date", type: SymbolType.NORMAL, description: "+1 Food; when destroyed by Desert: +2 Food and adds Date.", sprite: "030.png" }),

    def('warrior', { name: "Warrior", type: SymbolType.UNIT, description: "Ancient era melee unit.", base_attack: 5, base_hp: 10, sprite: "035.png" }),
    def('relic_caravan', { name: "Relic Caravan", type: SymbolType.NORMAL, description: "Destroyed; on destroy: refreshes relic shop.", sprite: "037.png" }),
    def('stargazer', { name: "Stargazer", type: SymbolType.NORMAL, description: "+1 Knowledge per 2 empty slots.", sprite: "038.png" }),
    def('stone_tablet', { name: "Stone Tablet", type: SymbolType.NORMAL, description: "+5 Knowledge per relic owned.", sprite: "039.png" }),
    def('archer', { name: "Archer", type: SymbolType.UNIT, description: "Ancient ranged unit.", base_attack: 3, base_hp: 5, sprite: "036.png" }),
    def('horse', { name: "Horse", type: SymbolType.NORMAL, description: "+1 Food, +1 Gold; when adjacent to Plains: +2 additional Food.", sprite: "023.png" }),
    def('barbarian_camp', { name: "Barbarian Camp", type: SymbolType.ENEMY, description: "Every 8 turns: adds 1 random current era enemy combat unit; Destroyed; on destroy: adds Loot.", base_hp: 20, sprite: "040.png" }),
    def('loot', { name: "Loot", type: SymbolType.NORMAL, description: "Destroyed; on destroy: get random reward.", sprite: "041.png" }),
    def('glowing_amber', { name: "Glowing Amber", type: SymbolType.NORMAL, description: "Destroyed; on destroy: adds random current era relic.", sprite: "042.png" }),
    def('enemy_warrior', { name: "Enemy Warrior", type: SymbolType.ENEMY, description: "-5 Food.", base_attack: 5, base_hp: 10, sprite: "043.png" }),
    def('flood', { name: "Flood", type: SymbolType.DISASTER, description: "Disables all adjacent terrain symbols. When counter reaches 0: Destroy.", sprite: "044.png" }),
    def('earthquake', { name: "Earthquake", type: SymbolType.DISASTER, description: "Destroyed. On destroy: destroy 1 random adjacent symbol.", sprite: "045.png" }),
    def('drought', { name: "Drought", type: SymbolType.DISASTER, description: "When counter reaches 0: Destroy.", sprite: "046.png" }),

    def('salt', { name: "Salt", type: SymbolType.NORMAL, description: "+1 Food per adjacent terrain symbol.", sprite: "047.png" }),
    def('honey', { name: "Honey", type: SymbolType.NORMAL, description: "After 5 turns: destroyed; on destruction: +5 Food.", sprite: "048.png" }),
    def('corn', { name: "Corn", type: SymbolType.NORMAL, description: "+2 Food.", sprite: "049.png" }),
    def('wild_berries', { name: "Wild Berries", type: SymbolType.NORMAL, description: "When adjacent to Forest: +1 Food. When adjacent to Rainforest: +1 Food.", sprite: "050.png" }),
    def('spices', { name: "Spices", type: SymbolType.NORMAL, description: "+1 Food per different terrain type placed.", sprite: "052.png" }),
    def('tax', {
        name: "Tax",
        type: SymbolType.MEDIEVAL,
        description:
            "+Gold equal to a random adjacent symbol's Food produced this turn; -Food equal to that amount.",
        sprite: "053.png",
    }),
    def('university', {
        name: "University",
        type: SymbolType.NORMAL,
        description: "+1 Knowledge per symbol placed on the board.",
        sprite: "054.png",
    }),
    def('harbor', {
        name: "Harbor",
        type: SymbolType.NORMAL,
        description: "+2 Food. Symbols adjacent to Harbor count as adjacent to Sea. +1 Gold per adjacent symbol.",
        sprite: "055.png",
    }),
    def('sheep', {
        name: "Sheep",
        type: SymbolType.NORMAL,
        description:
            "+1 Food; 10% chance to produce Sheep; 10% chance to produce Wool; when adjacent to Plains, can butcher; on butcher: +5 Food, +5 Gold.",
        sprite: "058.png",
    }),
    def('wool', {
        name: "Wool",
        type: SymbolType.NORMAL,
        description: "Destroyed; on destroy: +5 Gold.",
        sprite: "-",
    }),
    def('wild_boar', {
        name: "Wild Boar",
        type: SymbolType.NORMAL,
        description: "+2 Food; if 3 or more adjacent Forests: +4 additional Food.",
        sprite: "059.png",
    }),
    def('sawmill', {
        name: "Sawmill",
        type: SymbolType.NORMAL,
        description: "Per Forest in the same column: +5 Food. Per Mountain in the same column: +5 Knowledge and +5 Gold.",
        sprite: "060.png",
    }),
    def('gold_vein', { name: "Gold Vein", type: SymbolType.NORMAL, description: "+5 Gold.", sprite: "061.png" }),
    def('knight', {
        name: "Knight",
        type: SymbolType.UNIT,
        description: "Medieval melee unit (+3 Attack / +3 HP vs Warrior).",
        base_attack: 8,
        base_hp: 13,
        sprite: "062.png",
    }),
    def('caravel', {
        name: "Caravel",
        type: SymbolType.UNIT,
        description: "Medieval naval unit (+7 HP vs Warrior).",
        base_attack: 5,
        base_hp: 17,
        sprite: "063.png",
    }),
    def('scholar', {
        name: "Scholar",
        type: SymbolType.MEDIEVAL,
        description:
            "Destroys adjacent Ancient symbols. +10 Knowledge per Ancient symbol destroyed.",
        sprite: "064.png",
    }),
    def('holy_relic', {
        name: "Holy Relic",
        type: SymbolType.MEDIEVAL,
        description:
            "+5 Knowledge. Each turn adjacent to a Religion doctrine symbol: +1 toward a counter; at 10: permanently +5 Knowledge per turn and reset counter.",
        sprite: "065.png",
    }),
    def('telescope', {
        name: "Telescope",
        type: SymbolType.MEDIEVAL,
        description: "+Knowledge equal to this slot number (1–20, top-left first).",
        sprite: "066.png",
    }),
    def('scales', { name: "Scales", type: SymbolType.MEDIEVAL, description: "+8 Knowledge.", sprite: "067.png" }),
    def('pioneer', {
        name: "Pioneer",
        type: SymbolType.MEDIEVAL,
        description: "Destroyed; on destroy: next symbol selection includes at least one Terrain symbol.",
        sprite: "068.png",
    }),
    def('edict', {
        name: "Edict",
        type: SymbolType.MEDIEVAL,
        description: "Destroyed; on destroy: choose 1 owned symbol to remove (no on-destroy effects).",
        sprite: "069.png",
    }),
    def('embassy', {
        name: "Embassy",
        type: SymbolType.MEDIEVAL,
        description: "Destroyed; on destroy: next turn, the first symbol-selection reroll costs 0 Gold.",
        sprite: "070.png",
    }),
    def('wild_seeds', { name: "Wild Seeds", type: SymbolType.NORMAL, description: "+1 Food. Destroyed after 5 turns.", sprite: "071.png" }),
];

export const SYMBOLS: Record<number, SymbolDefinition> = Object.fromEntries(
    SYMBOL_LIST.map((s) => [s.id, s]),
) as Record<number, SymbolDefinition>;

export const SYMBOLS_BY_KEY: Record<SymbolKey, SymbolDefinition> = Object.fromEntries(
    SYMBOL_LIST.map((s) => [s.key, s]),
) as Record<SymbolKey, SymbolDefinition>;

/** 키로 정의 조회 — 숫자 ID 변경에도 안전 */
export const Sym = SYMBOLS_BY_KEY;

/** 세금 심볼 ID — 턴 종료 정산 시 인접 슬롯의 이번 턴 식량 합계를 참조 */
export const TAX_SYMBOL_ID = S.tax;

/** 칙령: 파괴 후 보유 심볼 1개 제거 UI */
export const EDICT_SYMBOL_ID = S.edict;

/** 야만인 주둔지: 이 턴 수마다 무작위 적 전투 유닛 1기 추가 */
export const BARBARIAN_CAMP_SPAWN_INTERVAL = 8;

const RELIGION_DOCTRINE_KEYS: readonly SymbolKey[] = ['christianity', 'islam', 'buddhism', 'hinduism'];

/** 종교 심볼 ID 목록 (4대 교리 심볼) */
export const RELIGION_SYMBOL_IDS = new Set<number>(RELIGION_DOCTRINE_KEYS.map((k) => SYMBOL_NUMERIC_ID[k]));

/** 종교 교리 심볼 ID 목록 (패널티 체크용) */
export const RELIGION_DOCTRINE_IDS = RELIGION_SYMBOL_IDS;

const EXCLUDED_POOL_KEYS: SymbolKey[] = [
    'merchant', 'horse', 'crab', 'library', 'pearl',
    'christianity', 'islam', 'buddhism', 'hinduism',
    'archer', 'stone_tablet', 'loot', 'glowing_amber', 'enemy_warrior',
    'flood', 'earthquake', 'drought',
    'university', 'harbor', 'sheep', 'wool', 'wild_boar', 'sawmill', 'gold_vein', 'knight', 'caravel',
];

/** 기본적으로 상점 풀에 등장할 수 없는 심볼 ID 목록 */
export const EXCLUDED_FROM_BASE_POOL = new Set<number>(EXCLUDED_POOL_KEYS.map((k) => SYMBOL_NUMERIC_ID[k]));

/** 해당 심볼이 아무 조건 없이 기본 상점 풀에 포함되는지 여부 */
export const isBasePool = (s: SymbolDefinition) => {
    return (s.type === SymbolType.NORMAL || s.type === SymbolType.TERRAIN || s.type === SymbolType.ANCIENT || s.type === SymbolType.UNIT) &&
        !EXCLUDED_FROM_BASE_POOL.has(s.id) &&
        !RELIGION_DOCTRINE_IDS.has(s.id);
};

const KNOWLEDGE_PRODUCING_KEYS: SymbolKey[] = [
    'monument', 'totem', 'offering', 'library', 'pearl', 'stargazer', 'stone_tablet',
    'university', 'sawmill', 'scholar', 'holy_relic', 'telescope', 'scales',
];

/** Knowledge를 생산하는 심볼 ID 목록 */
export const KNOWLEDGE_PRODUCING_IDS = new Set<number>(KNOWLEDGE_PRODUCING_KEYS.map((k) => SYMBOL_NUMERIC_ID[k]));

const GOLD_PRODUCING_KEYS: SymbolKey[] = [
    'sea', 'stone', 'copper', 'mountain', 'merchant', 'harbor', 'sawmill', 'gold_vein',
];

/** Gold를 생산하는 심볼 ID 목록 */
export const GOLD_PRODUCING_IDS = new Set<number>([
    ...GOLD_PRODUCING_KEYS.map((k) => SYMBOL_NUMERIC_ID[k]),
    TAX_SYMBOL_ID,
]);

export { SYMBOL_NUMERIC_ID, type SymbolKey, S } from './symbolIdRegistry';

export const getSymbolColor = (type: SymbolType): number => {
    switch (type) {
        case SymbolType.RELIGION: return 16777215; // 백색
        case SymbolType.NORMAL: return 0xffffff; // 일반 흰색
        case SymbolType.ANCIENT: return 0x8b4513; // 고대 갈색 (9127187)
        case SymbolType.MEDIEVAL: return 16347926; // 오렌지/중세
        case SymbolType.MODERN: return 3900150; // 파랑/현대
        case SymbolType.TERRAIN: return 0x22c55e; // 녹색 지형
        case SymbolType.UNIT: return 0x3b82f6; // 유닛 (파랑계열)
        case SymbolType.ENEMY: return 0xef4444; // 적 (빨강)
        default: return 0x9ca3af;
    }
};

export const getSymbolColorHex = (type: SymbolType): string => {
    switch (type) {
        case SymbolType.RELIGION: return '#ffffff';
        case SymbolType.NORMAL: return '#ffffff';
        case SymbolType.ANCIENT: return '#8b4513';
        case SymbolType.MEDIEVAL: return '#f97316';
        case SymbolType.MODERN: return '#3b82f6';
        case SymbolType.TERRAIN: return '#22c55e';
        case SymbolType.UNIT: return '#3b82f6';
        case SymbolType.ENEMY: return '#ef4444';
        default: return '#9ca3af';
    }
};
