import { SymbolType, SYMBOLS, SYMBOL_NUMERIC_ID, type SymbolKey } from './symbolDefinitions';

/** 지식 업그레이드 설명에 나오는 심볼과, 선택 풀·효과에 미치는 관계 */
export type KnowledgeUpgradeSymbolRelation = 'pool_add' | 'pool_remove' | 'effect_modify';

/** 업그레이드 카드 칩·툴팁 — 게임 풀에서 제거된 심볼 키도 문구·스프라이트 표시용으로 허용 */
export type KnowledgeUpgradeDescSymbolKey = SymbolKey | 'aqueduct' | 'rye' | 'hay';

export interface KnowledgeUpgradeDescSymbol {
    /** 활성 심볼 키 또는 표시 전용(제거된 심볼) 키 */
    symbolKey: KnowledgeUpgradeDescSymbolKey;
    relation: KnowledgeUpgradeSymbolRelation;
}

/** 중세시대(15) 카드 칩 — 풀 제외/추가는 게임과 동기, 효과 변경은 산만(지형 등장 확률만 바뀌는 타일은 칩 제외) */
/** 고대 시대(지식) — 고대 타입 심볼 풀 해금 카드 칩용 */
export function buildAncientSymbolsUnlockDescSymbols(): KnowledgeUpgradeDescSymbol[] {
    return Object.values(SYMBOLS)
        .filter((s) => s.type === SymbolType.ANCIENT)
        .sort((a, b) => a.id - b.id)
        .map((s) => ({ symbolKey: s.key as SymbolKey, relation: 'pool_add' as const }));
}

export function buildFeudalismDescSymbols(): KnowledgeUpgradeDescSymbol[] {
    const poolRemoveKeys = Object.values(SYMBOLS)
        .filter((s) => s.type === SymbolType.ANCIENT)
        .map((s) => s.key as SymbolKey)
        .sort((a, b) => SYMBOL_NUMERIC_ID[a] - SYMBOL_NUMERIC_ID[b]);

    /** `buildFlatPool`에서 중세시대 해금 시 포함되는 SymbolType.MEDIEVAL 심볼 */
    const poolAddKeys: SymbolKey[] = ['tax', 'scholar', 'holy_relic', 'telescope', 'scales', 'pioneer', 'edict', 'embassy'];

    /** `symbolEffects` case mountain: 식량·인접 적 피해 규칙이 바뀌는 지형만 */
    const effectModifyTerrainKeys: SymbolKey[] = ['mountain'];

    return [
        ...poolRemoveKeys.map((symbolKey) => ({ symbolKey, relation: 'pool_remove' as const })),
        ...poolAddKeys.map((symbolKey) => ({ symbolKey, relation: 'pool_add' as const })),
        ...effectModifyTerrainKeys.map((symbolKey) => ({ symbolKey, relation: 'effect_modify' as const })),
    ];
}

export interface KnowledgeUpgrade {
    id: number;
    name: string;
    type: KnowledgeUpgradeType;
    description: string;
    sprite?: string;
    /** 효과 설명에 등장하는 심볼 — 카드에서 아이콘·관계(추가/제외/효과 변경)·툴팁 */
    descSymbols?: KnowledgeUpgradeDescSymbol[];
}

export type KnowledgeUpgradeType = SymbolType;

/** 고대 타입 심볼을 상점/선택 풀에 넣기 위한 선행 연구 */
export const ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID = 25;
/** 목축업 — 소·양 효과 업그레이드(상세는 심볼 툴팁) */
export const PASTORALISM_UPGRADE_ID = 26;
/** 기마술 — 말 풀 추가·평원 업그레이드(목축업 선행) */
export const HORSEMANSHIP_UPGRADE_ID = 7;
/** 등자 — 소 식량 +3 등 */
export const STIRRUP_UPGRADE_ID = 19;
/** 농업 — 밀·쌀 주기 식량 보정 */
export const AGRICULTURE_UPGRADE_ID = 27;
/** 관개 — 농업(27) 선행 */
export const IRRIGATION_UPGRADE_ID = 3;
/** 어업 — 게·진주 심볼 풀 해금 */
export const FISHERIES_UPGRADE_ID = 9;
/** 항해술 — 물고기·게 바다 인접 생산 업그레이드(어업 선행) */
export const SEAFARING_UPGRADE_ID = 28;
/** 천문항법 — 천체·해도로 항해를 정밀화(항해술 선행) */
export const CELESTIAL_NAVIGATION_UPGRADE_ID = 29;
/** 채광 — 열대우림·돌 업그레이드 */
export const MINING_UPGRADE_ID = 30;
/** 수렵 — 멧돼지·모피 심볼 풀 해금 */
export const HUNTING_UPGRADE_ID = 31;
/** 법전 — 기본 지식 생산 +2 */
export const LAW_CODE_UPGRADE_ID = 32;
/** 외국 무역 — 사막 업그레이드 */
export const FOREIGN_TRADE_UPGRADE_ID = 33;
/** 족장제 — 기본 식량 +2, 야생열매 업그레이드 */
export const CHIEFDOM_UPGRADE_ID = 34;

export const KNOWLEDGE_UPGRADES: Record<number, KnowledgeUpgrade> = {
    // ── Ancient Upgrades ──
    [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID]: {
        id: ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
        name: 'Ancient Era',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Ancient-type symbols for the symbol selection pool.',
        sprite: '-',
        descSymbols: buildAncientSymbolsUnlockDescSymbols(),
    },
    [PASTORALISM_UPGRADE_ID]: {
        id: PASTORALISM_UPGRADE_ID,
        name: 'Pastoralism',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Cattle and Sheep.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'cattle', relation: 'effect_modify' },
            { symbolKey: 'sheep', relation: 'effect_modify' },
        ],
    },
    1: {
        id: 1,
        name: 'Writing System',
        type: SymbolType.ANCIENT,
        description: 'Permanently increases base Knowledge generation by +2. Unlocks Library symbol.',
        sprite: '001.png',
        descSymbols: [{ symbolKey: 'library', relation: 'pool_add' }],
    },
    2: {
        id: 2,
        name: 'Bronze Working',
        type: SymbolType.ANCIENT,
        description: 'Warrior HP +10, Archer HP +3.',
        sprite: '002.png',
        descSymbols: [
            { symbolKey: 'warrior', relation: 'effect_modify' },
            { symbolKey: 'archer', relation: 'effect_modify' },
        ],
    },
    [IRRIGATION_UPGRADE_ID]: {
        id: IRRIGATION_UPGRADE_ID,
        name: 'Irrigation',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Wheat, Rice, and Grassland.',
        sprite: '003.png',
        descSymbols: [
            { symbolKey: 'wheat', relation: 'effect_modify' },
            { symbolKey: 'rice', relation: 'effect_modify' },
            { symbolKey: 'grassland', relation: 'effect_modify' },
        ],
    },
    [AGRICULTURE_UPGRADE_ID]: {
        id: AGRICULTURE_UPGRADE_ID,
        name: 'Agriculture',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Wheat and Rice.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'wheat', relation: 'effect_modify' },
            { symbolKey: 'rice', relation: 'effect_modify' },
        ],
    },
    [SEAFARING_UPGRADE_ID]: {
        id: SEAFARING_UPGRADE_ID,
        name: 'Navigation',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Fish and Crab.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'fish', relation: 'effect_modify' },
            { symbolKey: 'crab', relation: 'effect_modify' },
        ],
    },
    [CELESTIAL_NAVIGATION_UPGRADE_ID]: {
        id: CELESTIAL_NAVIGATION_UPGRADE_ID,
        name: 'Celestial Navigation',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Pearl and Sea.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'pearl', relation: 'effect_modify' },
            { symbolKey: 'sea', relation: 'effect_modify' },
        ],
    },
    [MINING_UPGRADE_ID]: {
        id: MINING_UPGRADE_ID,
        name: 'Mining',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Rainforest and Stone.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'rainforest', relation: 'effect_modify' },
            { symbolKey: 'stone', relation: 'effect_modify' },
        ],
    },
    [HUNTING_UPGRADE_ID]: {
        id: HUNTING_UPGRADE_ID,
        name: 'Hunting',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Wild Boar and Fur for the symbol selection pool.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'wild_boar', relation: 'pool_add' },
            { symbolKey: 'fur', relation: 'pool_add' },
        ],
    },
    [LAW_CODE_UPGRADE_ID]: {
        id: LAW_CODE_UPGRADE_ID,
        name: 'Law Code',
        type: SymbolType.ANCIENT,
        description: 'Permanently increases base Knowledge generation by +2.',
        sprite: '-',
    },
    [FOREIGN_TRADE_UPGRADE_ID]: {
        id: FOREIGN_TRADE_UPGRADE_ID,
        name: 'Foreign Trade',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Desert.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'desert', relation: 'effect_modify' }],
    },
    [CHIEFDOM_UPGRADE_ID]: {
        id: CHIEFDOM_UPGRADE_ID,
        name: 'Chiefdom',
        type: SymbolType.ANCIENT,
        description: 'Base Food production +2. Upgrades Wild Berries.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'wild_berries', relation: 'effect_modify' }],
    },
    4: {
        id: 4,
        name: 'Theology',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Religion symbols for selection.',
        sprite: '004.png',
        descSymbols: [
            { symbolKey: 'christianity', relation: 'pool_add' },
            { symbolKey: 'islam', relation: 'pool_add' },
            { symbolKey: 'buddhism', relation: 'pool_add' },
            { symbolKey: 'hinduism', relation: 'pool_add' },
        ],
    },
    5: {
        id: 5,
        name: 'Archery',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Archer symbol for selection.',
        sprite: '005.png',
        descSymbols: [{ symbolKey: 'archer', relation: 'pool_add' }],
    },
    6: {
        id: 6,
        name: 'Currency',
        type: SymbolType.ANCIENT,
        description: 'Permanently increases base Gold generation by +2. Unlocks Merchant symbol.',
        sprite: '006.png',
        descSymbols: [{ symbolKey: 'merchant', relation: 'pool_add' }],
    },
    [HORSEMANSHIP_UPGRADE_ID]: {
        id: HORSEMANSHIP_UPGRADE_ID,
        name: 'Horsemanship',
        type: SymbolType.ANCIENT,
        description: 'Adds Horse to the symbol selection pool. Upgrades Plains.',
        sprite: '007.png',
        descSymbols: [
            { symbolKey: 'horse', relation: 'pool_add' },
            { symbolKey: 'plains', relation: 'effect_modify' },
        ],
    },
    8: {
        id: 8,
        name: 'Sacrificial Rite',
        type: SymbolType.ANCIENT,
        description:
            'Gain 3 Furnaces of Oblivion. Each consumes the relic to destroy 1 symbol on the board.',
        sprite: '-',
    },
    [FISHERIES_UPGRADE_ID]: {
        id: FISHERIES_UPGRADE_ID,
        name: 'Fisheries',
        type: SymbolType.ANCIENT,
        description: 'Crab and Pearl are added to the symbol selection pool.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'crab', relation: 'pool_add' },
            { symbolKey: 'pearl', relation: 'pool_add' },
        ],
    },
    10: {
        id: 10,
        name: 'Mathematics',
        type: SymbolType.ANCIENT,
        description: 'Base Food +5, Base Gold +2, Base Knowledge +2.',
        sprite: '-',
    },
    /** 레벨 10 이상에서만 선택지에 등장 — 중세 풀·지형 가중·산 강화 */
    15: {
        id: 15,
        name: 'Medieval Age',
        type: SymbolType.MEDIEVAL,
        description:
            'Medieval age: Ancient symbols leave the shop pool; Medieval symbols are added. Terrain symbol odds x0.2. Mountains +1 Food. Adjacent enemy units lose 3 HP each turn from Mountains.',
        sprite: '-',
        descSymbols: buildFeudalismDescSymbols(),
    },

    // ── Medieval Upgrades (require Medieval Age upgrade or era 2+) ──
    16: {
        id: 16,
        name: 'Education',
        type: SymbolType.MEDIEVAL,
        description: 'Libraries are replaced with Universities. Base Knowledge production +2.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'library', relation: 'pool_remove' },
            { symbolKey: 'university', relation: 'pool_add' },
        ],
    },
    17: {
        id: 17,
        name: 'Cartography',
        type: SymbolType.MEDIEVAL,
        description: 'Unlocks Harbor symbol.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'harbor', relation: 'pool_add' }],
    },
    18: {
        id: 18,
        name: 'Engineering',
        type: SymbolType.MEDIEVAL,
        description: 'Unlocks Aqueduct and Rye symbols.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'aqueduct', relation: 'pool_add' },
            { symbolKey: 'rye', relation: 'pool_add' },
        ],
    },
    19: {
        id: 19,
        name: 'Stirrup',
        type: SymbolType.MEDIEVAL,
        description:
            'Warrior adjacent to Horse becomes Knight (+3 Attack, +3 HP); Horse is removed. Cattle: +3 Food per turn; butcher when adjacent to Plains: +10 Food.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'warrior', relation: 'effect_modify' },
            { symbolKey: 'horse', relation: 'effect_modify' },
            { symbolKey: 'knight', relation: 'pool_add' },
            { symbolKey: 'wool', relation: 'effect_modify' },
            { symbolKey: 'cattle', relation: 'effect_modify' },
        ],
    },
    20: {
        id: 20,
        name: 'Architecture',
        type: SymbolType.MEDIEVAL,
        description: 'Unlocks Sawmill and Wild Boar symbols.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'sawmill', relation: 'pool_add' },
            { symbolKey: 'wild_boar', relation: 'pool_add' },
        ],
    },
    21: {
        id: 21,
        name: 'Caravel',
        type: SymbolType.MEDIEVAL,
        description:
            'Warrior adjacent to Sea becomes Caravel (+7 HP). Unlocks Gold Vein. Spices: +1 Food per terrain type; when adjacent to Rainforest: +2 Food and +3 Gold.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'warrior', relation: 'effect_modify' },
            { symbolKey: 'sea', relation: 'effect_modify' },
            { symbolKey: 'caravel', relation: 'pool_add' },
            { symbolKey: 'gold_vein', relation: 'pool_add' },
            { symbolKey: 'spices', relation: 'effect_modify' },
            { symbolKey: 'rainforest', relation: 'effect_modify' },
        ],
    },
    22: {
        id: 22,
        name: 'Territorial Reorganization',
        type: SymbolType.MEDIEVAL,
        description:
            'Destroy up to 3 owned symbols (on-destroy effects do not trigger); +10 Gold each. Then: 1 terrain pick and 3 symbol picks.',
        sprite: '-',
    },
    23: {
        id: 23,
        name: 'Castle',
        type: SymbolType.MEDIEVAL,
        description: 'Barbarian invasion and Barbarian Camp threat growth per turn is halved.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'barbarian_camp', relation: 'effect_modify' }],
    },
    24: {
        id: 24,
        name: 'Printing Press',
        type: SymbolType.MEDIEVAL,
        description: 'Base Food +10, Base Gold +5, Base Knowledge +5.',
        sprite: '-',
    },


};

export const FEUDALISM_UPGRADE_ID = 15;
export const SACRIFICIAL_RITE_UPGRADE_ID = 8;
export const TERRITORIAL_REORG_UPGRADE_ID = 22;

/** 초기 지식 트리(고대 시대 25 없이도 연구 가능) — `KnowledgeUpgradesOverlay`와 동기 유지 필요 */
export const KNOWLEDGE_TIER_LEVEL_2_UPGRADE_IDS: readonly number[] = [
    HUNTING_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    AGRICULTURE_UPGRADE_ID,
    5,
    MINING_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    // Lv3로 이동했지만 초기 트리 카드이므로 고대 시대(25) 없이도 연구 가능하게 유지
    SACRIFICIAL_RITE_UPGRADE_ID,
];
