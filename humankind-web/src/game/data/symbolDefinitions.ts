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

const UNIT_COMBAT_STATS = {
    warrior: { base_attack: 3, base_hp: 8 },
    cavalry: { base_attack: 4, base_hp: 15 },
    infantry: { base_attack: 20, base_hp: 80 },
    archer: { base_attack: 2, base_hp: 4 },
    crossbowman: { base_attack: 4, base_hp: 8 },
    cannon: { base_attack: 10, base_hp: 20 },
} as const;

const ENEMY_COMBAT_STATS = {
    warrior: { base_attack: 3, base_hp: 8 },
    cavalry: { base_attack: 7, base_hp: 16 },
    infantry: { base_attack: 9, base_hp: 20 },
    archer: { base_attack: 2, base_hp: 4 },
    crossbowman: { base_attack: 4, base_hp: 8 },
    cannon: { base_attack: 5, base_hp: 10 },
} as const;

/**
 * 심볼 메타데이터(이름·설명·타입·스프라이트)는 여기서 관리합니다.
 * **숫자 ID만** 바꿀 때는 `symbolIdRegistry.ts`의 `SYMBOL_NUMERIC_ID`만 수정하세요.
 */
const SYMBOL_LIST: SymbolDefinition[] = [
    // Terrain
    def('grassland', { name: "Grassland", type: SymbolType.TERRAIN, description: "+2 Food.", sprite: "001.png" }),
    def('plains', { name: "Plains", type: SymbolType.TERRAIN, description: "+1 Food.", sprite: "002.png" }),
    def('sea', { name: "Sea", type: SymbolType.TERRAIN, description: "+1 Gold per 4 adjacent symbols.", sprite: "003.png" }),
    def('forest', { name: "Forest", type: SymbolType.TERRAIN, description: "If 3 or more Forests are placed on the board: +2 Food; if 5 or more: +1 Gold; if Forest is the only terrain on the board: +1 Food.", sprite: "004.png" }),
    def('rainforest', { name: "Rainforest", type: SymbolType.TERRAIN, description: "+1 Food.", sprite: "005.png" }),
    def('desert', { name: "Desert", type: SymbolType.TERRAIN, description: "Destroys 1 random adjacent Normal or era symbol. When Desert destroys a symbol: +5 Food.", sprite: "006.png" }),
    def('oasis', { name: "Oasis", type: SymbolType.TERRAIN, description: "+2 Food per 2 adjacent empty slots. (Post-Arid Preservation: +4, Post-Oasis Reclamation: +6)", sprite: "007.png" }),
    def('mountain', { name: "Mountain", type: SymbolType.TERRAIN, description: "+2 Food, +2 Knowledge.", sprite: "008.png" }),

    // Normal: grassland deck
    def('wheat', { name: "Wheat", type: SymbolType.NORMAL, description: "Wheat: every 10 turns: 10 Food. Adjacent to Grassland: +1/turn.", sprite: "009.png" }),
    def('rice', { name: "Rice", type: SymbolType.NORMAL, description: "Rice: every 20 turns: 25 Food. Adjacent to Grassland: +1/turn.", sprite: "010.png" }),
    def('corn', { name: "Corn", type: SymbolType.NORMAL, description: "+2 Food.", sprite: "011.png" }),

    // Normal: plains deck
    def('cattle', {
        name: "Cattle",
        type: SymbolType.NORMAL,
        description:
            "+1 Food; when adjacent to Plains, can butcher; on butcher: +10 Food. With Pastoralism: 10% chance per turn to produce Cattle.",
        sprite: "012.png",
    }),
    def('sheep', {
        name: "Sheep",
        type: SymbolType.NORMAL,
        description:
            "+1 Food; when adjacent to Plains, can butcher; on butcher: +5 Food, +5 Gold. With Pastoralism: 10% chance per turn to produce Sheep.",
        sprite: "013.png",
    }),
    def('horse', { name: "Horse", type: SymbolType.NORMAL, description: "+2 Food, +2 Gold. Triggers even when not placed on the board.", sprite: "015.png" }),

    // Normal: sea deck
    def('fish', { name: "Fish", type: SymbolType.NORMAL, description: "With 1+ Sea on the board: +1 Food; 2+ Seas: +1 Food; 3+ Seas: +2 Food.", sprite: "016.png" }),
    def('crab', { name: "Crab", type: SymbolType.NORMAL, description: "With 1+ Sea on the board: +1 Food, +1 Gold; 2+ Seas: +1 Food, +1 Gold.", sprite: "017.png" }),
    def('pearl', { name: "Pearl", type: SymbolType.NORMAL, description: "With 1+ Sea on the board: +1 Gold; 2+ Seas: +1 Gold; 3+ Seas: +1 Gold.", sprite: "018.png" }),
    def('compass', { name: "Compass", type: SymbolType.NORMAL, description: "With 1+ Sea on the board: +5 Knowledge; 2+ Seas: +5 Knowledge; 3+ Seas: +5 Knowledge.", sprite: "019.png" }),

    // Normal: forest deck
    def('deer', { name: "Deer", type: SymbolType.NORMAL, description: "+1 Food per adjacent Forest.", sprite: "020.png" }),
    def('fur', { name: "Fur", type: SymbolType.NORMAL, description: "+2 Gold per 2 Forests placed on the board.", sprite: "022.png" }),

    // Normal: rainforest deck
    def('banana', { name: "Banana", type: SymbolType.NORMAL, description: "+1 Food; every 10 turns adjacent to Rainforest: +1 Food production.", sprite: "023.png" }),
    def('expedition', {
        name: "Expedition",
        type: SymbolType.NORMAL,
        description: "When adjacent to Rainforest: produces 10 Gold or Knowledge.",
        sprite: "024.png",
    }),

    // Normal: desert deck
    def('date', { name: "Date", type: SymbolType.NORMAL, description: "+1 Food; on destroy: +10 Food.", sprite: "025.png" }),
    def('dye', {
        name: "Dye",
        type: SymbolType.NORMAL,
        description: "+1 Gold; on destroy: +10 Gold.",
        sprite: "026.png",
    }),
    def('papyrus', {
        name: "Papyrus",
        type: SymbolType.NORMAL,
        description: "+1 Knowledge; on destroy: +10 Knowledge.",
        sprite: "027.png",
    }),
    def('caravanserai', {
        name: "Caravanserai",
        type: SymbolType.NORMAL,
        description: "+10 per symbol destroyed this turn; matches the destroyed symbol's production type. Not destroyed by Desert.",
        sprite: "028.png",
    }),

    // Normal: mountain / special position
    def('stone', { name: "Stone", type: SymbolType.NORMAL, description: "+1 Gold.", sprite: "029.png" }),

    // Normal: bridge / hybrid
    def('wild_berries', { name: "Wild Berries", type: SymbolType.NORMAL, description: "+1 Food; when adjacent to Forest or Rainforest: +2 Food; when adjacent to Mountain: +2 Knowledge.", sprite: "030.png" }),
    def('honey', { name: "Honey", type: SymbolType.NORMAL, description: "If 5 or more of the same terrain are placed on the board: +5 Food.", sprite: "031.png" }),
    def('spices', { name: "Spices", type: SymbolType.NORMAL, description: "+1 Food per different terrain type placed.", sprite: "032.png" }),
    def('salt', { name: "Salt", type: SymbolType.NORMAL, description: "+1 Food per adjacent terrain symbol.", sprite: "033.png" }),

    // Normal: common operations
    def('merchant', { name: "Merchant", type: SymbolType.NORMAL, description: "Produces Gold equal to the highest Food produced by an adjacent symbol.", sprite: "034.png" }),
    def('monument', { name: "Monument", type: SymbolType.NORMAL, description: "+5 Knowledge.", sprite: "035.png" }),
    def('library', { name: "Library", type: SymbolType.NORMAL, description: "+1 Knowledge per adjacent symbol.", sprite: "036.png" }),
    def('stone_tablet', { name: "Stone Tablet", type: SymbolType.NORMAL, description: "+2 Knowledge per non-consumable relic owned.", sprite: "037.png" }),
    def('relic_caravan', { name: "Relic Caravan", type: SymbolType.NORMAL, description: "Destroyed; on destroy: refreshes relic shop.", sprite: "038.png" }),

    // Ancient
    def('oral_tradition', { name: "Oral Tradition", type: SymbolType.ANCIENT, description: "10 turns: destroyed; on destroy: +10 Knowledge per adjacent symbol.", sprite: "039.png" }),
    def('totem', { name: "Totem", type: SymbolType.ANCIENT, description: "In a corner: +12 Knowledge.", sprite: "040.png" }),
    def('omen', { name: "Omen", type: SymbolType.ANCIENT, description: "50% chance for +3 Food.", sprite: "041.png" }),
    def('campfire', { name: "Campfire", type: SymbolType.ANCIENT, description: "Gain Food equal to the Food produced this turn by the highest-producing adjacent symbol. Destroyed.", sprite: "042.png" }),
    def('pottery', { name: "Pottery", type: SymbolType.ANCIENT, description: "+4 Food stored per turn; on destroy: gain Food equal to stored Counter.", sprite: "043.png" }),
    def('tribal_village', { name: "Tribal Village", type: SymbolType.ANCIENT, description: "Consume this: triggers 2 consecutive symbol selection phases.", sprite: "044.png" }),
    def('stargazer', { name: "Stargazer", type: SymbolType.ANCIENT, description: "+4 Knowledge per 4 empty slots.", sprite: "045.png" }),
    def('wild_seeds', { name: "Wild Seeds", type: SymbolType.ANCIENT, description: "+1 Food. Destroyed after 5 turns.", sprite: "046.png" }),
    def('bronze_tribute_chest', { name: "Bronze Tribute Chest", type: SymbolType.ANCIENT, description: "+1 Gold. Destroyed after 3 turns.", sprite: "086.png" }),
    def('heqet', { name: "Heqet", type: SymbolType.ANCIENT, description: "+1 Food; adjacent to Grassland: +2 Food; adjacent to Wheat: +2 Knowledge.", sprite: "087.png" }),
    def('foxtail_millet', { name: "Foxtail Millet", type: SymbolType.ANCIENT, description: "+5 Food per 2 adjacent Terrain symbols.", sprite: "088.png" }),

    // Medieval
    def('tax', { name: "Tax", type: SymbolType.MEDIEVAL, description: "+Gold equal to a random adjacent symbol's Food produced this turn.", sprite: "047.png" }),
    def('scholar', {
        name: "Scholar",
        type: SymbolType.MEDIEVAL,
        description:
            "Destroys all adjacent Ancient symbols. This Scholar permanently produces +5 Knowledge per Ancient symbol destroyed.",
        sprite: "048.png",
    }),
    def('holy_relic', {
        name: "Holy Relic",
        type: SymbolType.MEDIEVAL,
        description:
            "If there is a Religion symbol on the board: +7 Knowledge, +7 Gold.",
        sprite: "049.png",
    }),
    def('monastery_garden', {
        name: "Monastery Garden",
        type: SymbolType.MEDIEVAL,
        description:
            "If there is a Religion symbol on the board: +7 Food, +7 Knowledge.",
        sprite: "050.png",
    }),
    def('tax_storehouse', {
        name: "Tax Storehouse",
        type: SymbolType.MEDIEVAL,
        description: "+8 Food stored per turn; on destroy: gain Food equal to stored Counter.",
        sprite: "051.png",
    }),
    def('pioneer', {
        name: "Pioneer",
        type: SymbolType.MEDIEVAL,
        description: "Destroyed; on destroy: next symbol selection includes at least one Terrain symbol.",
        sprite: "052.png",
    }),
    def('edict', {
        name: "Edict",
        type: SymbolType.MEDIEVAL,
        description: "Consume this to destroy 1 adjacent symbol.",
        sprite: "053.png",
    }),
    def('royal_colony', {
        name: "Royal Colony",
        type: SymbolType.MEDIEVAL,
        description: "Destroyed; on destroy: next symbol selection includes at least one Event symbol.",
        sprite: "054.png",
    }),

    // Modern special
    def('agi_core', {
        name: "AGI Core",
        type: SymbolType.SPECIAL,
        description: "Absorbs the Knowledge production of all symbols on the board. When absorbed Knowledge reaches 500, you win the game.",
        sprite: "059.png",
    }),

    // Special reward
    def('loot', {
        name: "Loot",
        type: SymbolType.SPECIAL,
        description: "Open to gain a small reward. When adjacent to Loot: absorb it and upgrade into Greater Loot.",
        sprite: "060.png",
    }),
    def('greater_loot', {
        name: "Greater Loot",
        type: SymbolType.SPECIAL,
        description: "Open to gain a reward. When adjacent to Greater Loot: absorb it and upgrade into Radiant Loot.",
        sprite: "061.png",
    }),
    def('radiant_loot', {
        name: "Radiant Loot",
        type: SymbolType.SPECIAL,
        description: "Open to gain a large reward.",
        sprite: "062.png",
    }),

    // Religion
    def('christianity', { name: "Christianity", type: SymbolType.RELIGION, description: "+Food equal to the highest Food produced by an adjacent symbol. Destroyed if two or more Religion symbols are on the board.", sprite: "055.png" }),
    def('islam', { name: "Islam", type: SymbolType.RELIGION, description: "+2 Food per Knowledge-producing symbol on the board. Destroyed if two or more Religion symbols are on the board.", sprite: "056.png" }),
    def('buddhism', { name: "Buddhism", type: SymbolType.RELIGION, description: "+2 Food per empty slot on the board. Destroyed if two or more Religion symbols are on the board.", sprite: "057.png" }),
    def('hinduism', { name: "Hinduism", type: SymbolType.RELIGION, description: "If there are no duplicate symbols on the board: +1 Food per 2 symbols on the board. Destroyed if two or more Religion symbols are on the board.", sprite: "058.png" }),

    // Unit
    def('warrior', { name: "Warrior", type: SymbolType.UNIT, description: "Melee: attacks the first adjacent enemy symbol.", ...UNIT_COMBAT_STATS.warrior, sprite: "063.png" }),
    def('cavalry', { name: "Knight", type: SymbolType.UNIT, description: "Melee: attacks the first adjacent enemy symbol.", ...UNIT_COMBAT_STATS.cavalry, sprite: "064.png" }),
    def('infantry', { name: "Infantry", type: SymbolType.UNIT, description: "Melee: attacks the first adjacent enemy symbol.", ...UNIT_COMBAT_STATS.infantry, sprite: "065.png" }),
    def('archer', { name: "Archer", type: SymbolType.UNIT, description: "Ranged: attacks the first enemy symbol on the board.", ...UNIT_COMBAT_STATS.archer, sprite: "066.png" }),
    def('crossbowman', { name: "Crossbowman", type: SymbolType.UNIT, description: "Ranged: attacks the first enemy symbol on the board.", ...UNIT_COMBAT_STATS.crossbowman, sprite: "067.png" }),
    def('cannon', { name: "Cannon", type: SymbolType.UNIT, description: "Ranged: attacks the first enemy symbol on the board.", ...UNIT_COMBAT_STATS.cannon, sprite: "068.png" }),

    // Enemy
    def('enemy_warrior', { name: "Warrior", type: SymbolType.ENEMY, description: "-3 Food.", ...ENEMY_COMBAT_STATS.warrior, sprite: "069.png" }),
    def('enemy_cavalry', { name: "Knight", type: SymbolType.ENEMY, description: "-5 Food.", ...ENEMY_COMBAT_STATS.cavalry, sprite: "070.png" }),
    def('enemy_infantry', { name: "Infantry", type: SymbolType.ENEMY, description: "-8 Food.", ...ENEMY_COMBAT_STATS.infantry, sprite: "071.png" }),
    def('enemy_archer', { name: "Archer", type: SymbolType.ENEMY, description: "-3 Food.", ...ENEMY_COMBAT_STATS.archer, sprite: "072.png" }),
    def('enemy_crossbowman', { name: "Crossbowman", type: SymbolType.ENEMY, description: "-5 Food.", ...ENEMY_COMBAT_STATS.crossbowman, sprite: "073.png" }),
    def('enemy_cannon', { name: "Cannon", type: SymbolType.ENEMY, description: "-8 Food.", ...ENEMY_COMBAT_STATS.cannon, sprite: "074.png" }),

    // Disaster
    def('flood', { name: "Flood", type: SymbolType.DISASTER, description: "Disables production from adjacent terrain symbols. When counter reaches 0: Destroy.", sprite: "075.png" }),
    def('earthquake', { name: "Earthquake", type: SymbolType.DISASTER, description: "Destroyed. On destroy: destroy every symbol in the same column.", sprite: "076.png" }),
    def('drought', { name: "Drought", type: SymbolType.DISASTER, description: "When counter reaches 0: Destroy.", sprite: "077.png" }),
    def('plague', { name: "Plague", type: SymbolType.DISASTER, description: "Disables the symbol selection phase. When counter reaches 0: Destroy.", sprite: "078.png" }),
    def('heatwave', { name: "Heatwave", type: SymbolType.DISASTER, description: "Reduces symbol choices to two. When counter reaches 0: Destroy.", sprite: "079.png" }),
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

const RELIGION_DOCTRINE_KEYS: readonly SymbolKey[] = ['christianity', 'islam', 'buddhism', 'hinduism'];

/** 종교 심볼 ID 목록 (4대 교리 심볼) */
export const RELIGION_SYMBOL_IDS = new Set<number>(RELIGION_DOCTRINE_KEYS.map((k) => SYMBOL_NUMERIC_ID[k]));

/** 종교 교리 심볼 ID 목록 (패널티 체크용) */
export const RELIGION_DOCTRINE_IDS = RELIGION_SYMBOL_IDS;

const EXCLUDED_POOL_KEYS: SymbolKey[] = [
    'merchant', 'horse', 'crab', 'library', 'pearl',
    'compass',
    'agi_core',
    'loot', 'greater_loot', 'radiant_loot',
    'christianity', 'islam', 'buddhism', 'hinduism',
    'cavalry', 'crossbowman', 'cannon', 'infantry', 'stone_tablet', 'enemy_warrior',
    'flood', 'earthquake', 'drought', 'plague', 'heatwave',
    'fur', 'expedition', 'dye', 'papyrus', 'caravanserai',
    'heqet', 'foxtail_millet',
];

/** 기본적으로 상점 풀에 등장할 수 없는 심볼 ID 목록 */
export const EXCLUDED_FROM_BASE_POOL = new Set<number>(EXCLUDED_POOL_KEYS.map((k) => SYMBOL_NUMERIC_ID[k]));

/** 해당 심볼이 아무 조건 없이 기본 상점 풀에 포함되는지 여부 */
export const isBasePool = (s: SymbolDefinition) => {
    return (s.type === SymbolType.NORMAL || s.type === SymbolType.TERRAIN || s.type === SymbolType.UNIT) &&
        !EXCLUDED_FROM_BASE_POOL.has(s.id) &&
        !RELIGION_DOCTRINE_IDS.has(s.id);
};

const FOOD_PRODUCING_KEYS: SymbolKey[] = [
    'wheat', 'rice', 'cattle', 'banana', 'fish', 'grassland', 'oasis', 'rainforest', 'plains', 'mountain',
    'deer', 'date', 'christianity', 'buddhism', 'hinduism', 'salt', 'honey', 'corn', 'wild_berries',
    'sheep', 'forest', 'horse', 'crab', 'wild_seeds', 'expedition', 'heqet', 'foxtail_millet',
];

/** Food를 생산하는 심볼 ID 목록 */
export const FOOD_PRODUCING_IDS = new Set<number>(FOOD_PRODUCING_KEYS.map((k) => SYMBOL_NUMERIC_ID[k]));

const KNOWLEDGE_PRODUCING_KEYS: SymbolKey[] = [
    'monument', 'totem', 'library', 'pearl', 'stargazer', 'stone_tablet',
    'compass', 'papyrus', 'expedition', 'heqet',
];

/** Knowledge를 생산하는 심볼 ID 목록 */
export const KNOWLEDGE_PRODUCING_IDS = new Set<number>(KNOWLEDGE_PRODUCING_KEYS.map((k) => SYMBOL_NUMERIC_ID[k]));

const GOLD_PRODUCING_KEYS: SymbolKey[] = [
    'sea', 'stone', 'mountain', 'merchant', 'fur', 'dye', 'bronze_tribute_chest',
];

/** Gold를 생산하는 심볼 ID 목록 */
export const GOLD_PRODUCING_IDS = new Set<number>(GOLD_PRODUCING_KEYS.map((k) => SYMBOL_NUMERIC_ID[k]));

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
        case SymbolType.SPECIAL: return 0xc084fc; // 특수
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
        case SymbolType.SPECIAL: return '#c084fc';
        default: return '#9ca3af';
    }
};
