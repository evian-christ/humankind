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
    const poolAddKeys: SymbolKey[] = ['tax', 'scholar', 'holy_relic', 'pioneer', 'edict'];

    return [
        ...poolRemoveKeys.map((symbolKey) => ({ symbolKey, relation: 'pool_remove' as const })),
        ...poolAddKeys.map((symbolKey) => ({ symbolKey, relation: 'pool_add' as const })),
    ];
}

export function buildModernAgeDescSymbols(): KnowledgeUpgradeDescSymbol[] {
    const poolRemoveKeys = Object.values(SYMBOLS)
        .filter((s) => s.type === SymbolType.MEDIEVAL || s.type === SymbolType.TERRAIN)
        .map((s) => s.key as SymbolKey)
        .sort((a, b) => SYMBOL_NUMERIC_ID[a] - SYMBOL_NUMERIC_ID[b]);

    const poolAddKeys = Object.values(SYMBOLS)
        .filter((s) => s.type === SymbolType.MODERN && s.key !== 'agi_core')
        .map((s) => s.key as SymbolKey)
        .sort((a, b) => SYMBOL_NUMERIC_ID[a] - SYMBOL_NUMERIC_ID[b]);

    return [
        ...poolRemoveKeys.map((symbolKey) => ({ symbolKey, relation: 'pool_remove' as const })),
        ...poolAddKeys.map((symbolKey) => ({ symbolKey, relation: 'pool_add' as const })),
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
export const ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID = 1;
export const HUNTING_UPGRADE_ID = 2;
export const PASTORALISM_UPGRADE_ID = 3;
export const FISHERIES_UPGRADE_ID = 4;
export const AGRICULTURE_UPGRADE_ID = 5;
export const MINING_UPGRADE_ID = 6;
export const FOREIGN_TRADE_UPGRADE_ID = 7;
export const CHIEFDOM_UPGRADE_ID = 8;
export const ARCHERY_UPGRADE_ID = 9;
export const LAW_CODE_UPGRADE_ID = 10;
export const CURRENCY_UPGRADE_ID = 11;
export const SACRIFICIAL_RITE_UPGRADE_ID = 12;
export const HORSEMANSHIP_UPGRADE_ID = 13;
export const SEAFARING_UPGRADE_ID = 14;
export const CELESTIAL_NAVIGATION_UPGRADE_ID = 15;
export const IRRIGATION_UPGRADE_ID = 16;
export const WRITING_SYSTEM_UPGRADE_ID = 17;
export const ARCHITECTURE_UPGRADE_ID = 18;
export const DRY_STORAGE_UPGRADE_ID = 19;
export const TRACKING_UPGRADE_ID = 20;
export const THEOLOGY_UPGRADE_ID = 21;
export const IRON_WORKING_UPGRADE_ID = 22;
export const MATHEMATICS_UPGRADE_ID = 23;
export const NOMADIC_TRADITION_UPGRADE_ID = 24;
export const STATE_LABOR_UPGRADE_ID = 25;
export const FEUDALISM_UPGRADE_ID = 26;
export const FISHERY_GUILD_UPGRADE_ID = 27;
export const THREE_FIELD_SYSTEM_UPGRADE_ID = 28;
export const PLANTATION_UPGRADE_ID = 29;
export const TANNING_UPGRADE_ID = 30;
export const COMPASS_UPGRADE_ID = 31;
export const DESERT_STORAGE_UPGRADE_ID = 32;
export const MECHANICS_UPGRADE_ID = 33;
export const MARITIME_TRADE_UPGRADE_ID = 34;
export const MILITARY_SCIENCE_UPGRADE_ID = 35;
export const FEUDAL_CORN_UPGRADE_ID = 36;
export const GUILD_UPGRADE_ID = 37;
export const EXPLORATION_UPGRADE_ID = 38;
export const SHIPBUILDING_UPGRADE_ID = 39;
export const EDUCATION_UPGRADE_ID = 40;
export const THEOCRACY_UPGRADE_ID = 41;
export const JUNGLE_EXPEDITION_UPGRADE_ID = 42;
export const AGRICULTURAL_SURPLUS_UPGRADE_ID = 43;
export const PRINTING_PRESS_UPGRADE_ID = 44;
export const CARAVANSERAI_UPGRADE_ID = 45;
export const FORESTRY_UPGRADE_ID = 46;
export const PASTURE_MANAGEMENT_UPGRADE_ID = 47;
export const GUNPOWDER_UPGRADE_ID = 48;
export const NATIONALISM_UPGRADE_ID = 49;
export const COLONIALISM_UPGRADE_ID = 50;
export const MODERN_AGE_UPGRADE_ID = 51;
export const OCEANIC_ROUTES_UPGRADE_ID = 52;
export const STEAM_POWER_UPGRADE_ID = 53;
export const OASIS_RECOVERY_UPGRADE_ID = 54;
export const BALLISTICS_UPGRADE_ID = 55;
export const MODERN_AGRICULTURE_UPGRADE_ID = 56;
export const PRESERVATION_UPGRADE_ID = 57;
export const URBANIZATION_UPGRADE_ID = 58;
export const SCIENTIFIC_THEORY_UPGRADE_ID = 59;
export const TROPICAL_DEVELOPMENT_UPGRADE_ID = 60;
export const ELECTRICITY_UPGRADE_ID = 61;
export const INTERCHANGEABLE_PARTS_UPGRADE_ID = 62;
export const AGI_PROJECT_UPGRADE_ID = 63;
export const MODERN_AGE_LEVEL_UPGRADE_ID = MODERN_AGE_UPGRADE_ID;
export const TERRITORIAL_REORG_UPGRADE_ID = -1;

export const KNOWLEDGE_UPGRADES: Record<number, KnowledgeUpgrade> = {
    // ── Ancient Upgrades ──
    [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID]: {
        id: ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
        name: 'Ancient Era',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Ancient-type symbols for the symbol selection pool.',
        sprite: '001.png',
        descSymbols: buildAncientSymbolsUnlockDescSymbols(),
    },
    [PASTORALISM_UPGRADE_ID]: {
        id: PASTORALISM_UPGRADE_ID,
        name: 'Pastoralism',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Cattle and Sheep.',
        sprite: '003.png',
        descSymbols: [
            { symbolKey: 'cattle', relation: 'effect_modify' },
            { symbolKey: 'sheep', relation: 'effect_modify' },
        ],
    },
    [WRITING_SYSTEM_UPGRADE_ID]: {
        id: WRITING_SYSTEM_UPGRADE_ID,
        name: 'Writing System',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Library.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'library', relation: 'pool_add' }],
    },
    [IRON_WORKING_UPGRADE_ID]: {
        id: IRON_WORKING_UPGRADE_ID,
        name: 'Iron Working',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Warrior into Knight.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'warrior', relation: 'effect_modify' },
            { symbolKey: 'knight', relation: 'pool_add' },
        ],
    },
    [IRRIGATION_UPGRADE_ID]: {
        id: IRRIGATION_UPGRADE_ID,
        name: 'Irrigation',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Wheat, Rice, and Grassland.',
        sprite: '-',
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
        sprite: '005.png',
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
        sprite: '006.png',
        descSymbols: [
            { symbolKey: 'rainforest', relation: 'effect_modify' },
            { symbolKey: 'stone', relation: 'effect_modify' },
        ],
    },
    [HUNTING_UPGRADE_ID]: {
        id: HUNTING_UPGRADE_ID,
        name: 'Hunting',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Mushroom and Fur for the symbol selection pool.',
        sprite: '002.png',
        descSymbols: [
            { symbolKey: 'mushroom', relation: 'pool_add' },
            { symbolKey: 'fur', relation: 'pool_add' },
        ],
    },
    [TRACKING_UPGRADE_ID]: {
        id: TRACKING_UPGRADE_ID,
        name: 'Tracking',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Forest, Mushroom, and Deer.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'forest', relation: 'effect_modify' },
            { symbolKey: 'mushroom', relation: 'effect_modify' },
            { symbolKey: 'deer', relation: 'effect_modify' },
        ],
    },
    [TANNING_UPGRADE_ID]: {
        id: TANNING_UPGRADE_ID,
        name: 'Tanning',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Fur and Deer.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'fur', relation: 'effect_modify' },
            { symbolKey: 'deer', relation: 'effect_modify' },
        ],
    },
    [FORESTRY_UPGRADE_ID]: {
        id: FORESTRY_UPGRADE_ID,
        name: 'Forestry',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Forest.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'forest', relation: 'effect_modify' },
        ],
    },
    [PRESERVATION_UPGRADE_ID]: {
        id: PRESERVATION_UPGRADE_ID,
        name: 'Preservation',
        type: SymbolType.MODERN,
        description: 'Upgrades Deer and Mushroom.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'deer', relation: 'effect_modify' },
            { symbolKey: 'mushroom', relation: 'effect_modify' },
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
        sprite: '007.png',
        descSymbols: [{ symbolKey: 'desert', relation: 'effect_modify' }],
    },
    [DRY_STORAGE_UPGRADE_ID]: {
        id: DRY_STORAGE_UPGRADE_ID,
        name: 'Trade Goods Exchange',
        type: SymbolType.ANCIENT,
        description: 'Dye and Papyrus are added to the symbol selection pool.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'dye', relation: 'pool_add' },
            { symbolKey: 'papyrus', relation: 'pool_add' },
        ],
    },
    [DESERT_STORAGE_UPGRADE_ID]: {
        id: DESERT_STORAGE_UPGRADE_ID,
        name: 'Dry Storage',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Desert, Oasis, and Date.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'desert', relation: 'effect_modify' },
            { symbolKey: 'oasis', relation: 'effect_modify' },
            { symbolKey: 'date', relation: 'effect_modify' },
        ],
    },
    [CARAVANSERAI_UPGRADE_ID]: {
        id: CARAVANSERAI_UPGRADE_ID,
        name: 'Caravanserai',
        type: SymbolType.MEDIEVAL,
        description: 'Unlocks Caravanserai. Upgrades Dye and Papyrus.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'caravanserai', relation: 'pool_add' },
            { symbolKey: 'dye', relation: 'effect_modify' },
            { symbolKey: 'papyrus', relation: 'effect_modify' },
        ],
    },
    [OASIS_RECOVERY_UPGRADE_ID]: {
        id: OASIS_RECOVERY_UPGRADE_ID,
        name: 'Oasis Recovery Network',
        type: SymbolType.MODERN,
        description: 'Upgrades Desert and Oasis.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'desert', relation: 'effect_modify' },
            { symbolKey: 'oasis', relation: 'effect_modify' },
        ],
    },
    [CHIEFDOM_UPGRADE_ID]: {
        id: CHIEFDOM_UPGRADE_ID,
        name: 'Chiefdom',
        type: SymbolType.ANCIENT,
        description: 'Base Food production +2. Upgrades Wild Berries.',
        sprite: '008.png',
        descSymbols: [{ symbolKey: 'wild_berries', relation: 'effect_modify' }],
    },
    [ARCHITECTURE_UPGRADE_ID]: {
        id: ARCHITECTURE_UPGRADE_ID,
        name: 'Architecture',
        type: SymbolType.ANCIENT,
        description: 'Base Knowledge production +1. Upgrades Salt.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'salt', relation: 'effect_modify' }],
    },
    [NATIONALISM_UPGRADE_ID]: {
        id: NATIONALISM_UPGRADE_ID,
        name: 'Nationalism',
        type: SymbolType.MEDIEVAL,
        description: 'Base Knowledge production +3. Upgrades Monument.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'monument', relation: 'effect_modify' }],
    },
    [EXPLORATION_UPGRADE_ID]: {
        id: EXPLORATION_UPGRADE_ID,
        name: 'Exploration',
        type: SymbolType.MEDIEVAL,
        description: 'Base Gold production +2. Upgrades Honey.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'honey', relation: 'effect_modify' }],
    },
    [COLONIALISM_UPGRADE_ID]: {
        id: COLONIALISM_UPGRADE_ID,
        name: 'Colonialism',
        type: SymbolType.MEDIEVAL,
        description: 'Base Gold production +3. Upgrades Spices.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'spices', relation: 'effect_modify' }],
    },
    [MILITARY_SCIENCE_UPGRADE_ID]: {
        id: MILITARY_SCIENCE_UPGRADE_ID,
        name: 'Military Science',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Horse.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'horse', relation: 'effect_modify' }],
    },
    [MECHANICS_UPGRADE_ID]: {
        id: MECHANICS_UPGRADE_ID,
        name: 'Mechanics',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Archer into Crossbowman.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'archer', relation: 'effect_modify' },
            { symbolKey: 'crossbowman', relation: 'pool_add' },
        ],
    },
    [GUNPOWDER_UPGRADE_ID]: {
        id: GUNPOWDER_UPGRADE_ID,
        name: 'Gunpowder',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Knight into Musketman.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'knight', relation: 'effect_modify' },
            { symbolKey: 'musketman', relation: 'pool_add' },
        ],
    },
    [BALLISTICS_UPGRADE_ID]: {
        id: BALLISTICS_UPGRADE_ID,
        name: 'Ballistics',
        type: SymbolType.MODERN,
        description: 'Upgrades Crossbowman into Cannon.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'crossbowman', relation: 'effect_modify' },
            { symbolKey: 'cannon', relation: 'pool_add' },
        ],
    },
    [INTERCHANGEABLE_PARTS_UPGRADE_ID]: {
        id: INTERCHANGEABLE_PARTS_UPGRADE_ID,
        name: 'Interchangeable Parts',
        type: SymbolType.MODERN,
        description: 'Upgrades Musketman into Infantry.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'musketman', relation: 'effect_modify' },
            { symbolKey: 'infantry', relation: 'pool_add' },
        ],
    },
    [THEOLOGY_UPGRADE_ID]: {
        id: THEOLOGY_UPGRADE_ID,
        name: 'Theology',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Religion symbols for selection.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'christianity', relation: 'pool_add' },
            { symbolKey: 'islam', relation: 'pool_add' },
            { symbolKey: 'buddhism', relation: 'pool_add' },
            { symbolKey: 'hinduism', relation: 'pool_add' },
        ],
    },
    [ARCHERY_UPGRADE_ID]: {
        id: ARCHERY_UPGRADE_ID,
        name: 'Archery',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Archer.',
        sprite: '009.png',
        descSymbols: [{ symbolKey: 'archer', relation: 'pool_add' }],
    },
    [CURRENCY_UPGRADE_ID]: {
        id: CURRENCY_UPGRADE_ID,
        name: 'Currency',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Merchant symbol.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'merchant', relation: 'pool_add' }],
    },
    [HORSEMANSHIP_UPGRADE_ID]: {
        id: HORSEMANSHIP_UPGRADE_ID,
        name: 'Horsemanship',
        type: SymbolType.ANCIENT,
        description: 'Adds Horse to the symbol selection pool. Upgrades Plains.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'horse', relation: 'pool_add' },
            { symbolKey: 'plains', relation: 'effect_modify' },
        ],
    },
    [SACRIFICIAL_RITE_UPGRADE_ID]: {
        id: SACRIFICIAL_RITE_UPGRADE_ID,
        name: 'Sacrificial Rite',
        type: SymbolType.ANCIENT,
        description:
            'Gain 3 Furnaces of Oblivion. Each consumes the relic to destroy 1 symbol on the board.',
        sprite: '-',
    },
    [STATE_LABOR_UPGRADE_ID]: {
        id: STATE_LABOR_UPGRADE_ID,
        name: 'State Labor',
        type: SymbolType.ANCIENT,
        description: 'Base Food production +1. Base Gold production +1.',
        sprite: '-',
    },
    [URBANIZATION_UPGRADE_ID]: {
        id: URBANIZATION_UPGRADE_ID,
        name: 'Urbanization',
        type: SymbolType.MODERN,
        description: 'Base Food production +10. Base Gold production +2.',
        sprite: '-',
    },
    [STEAM_POWER_UPGRADE_ID]: {
        id: STEAM_POWER_UPGRADE_ID,
        name: 'Steam Power',
        type: SymbolType.MODERN,
        description: 'Base Gold production +8. Base Knowledge production +4.',
        sprite: '-',
    },
    [ELECTRICITY_UPGRADE_ID]: {
        id: ELECTRICITY_UPGRADE_ID,
        name: 'Electricity',
        type: SymbolType.MODERN,
        description: 'Base Food production +5. Base Gold production +10. Base Knowledge production +5.',
        sprite: '-',
    },
    [FEUDAL_CORN_UPGRADE_ID]: {
        id: FEUDAL_CORN_UPGRADE_ID,
        name: 'Feudalism',
        type: SymbolType.MEDIEVAL,
        description: 'Base Food production +2. Upgrades Corn.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'corn', relation: 'effect_modify' }],
    },
    [FISHERIES_UPGRADE_ID]: {
        id: FISHERIES_UPGRADE_ID,
        name: 'Fisheries',
        type: SymbolType.ANCIENT,
        description: 'Crab and Pearl are added to the symbol selection pool.',
        sprite: '004.png',
        descSymbols: [
            { symbolKey: 'crab', relation: 'pool_add' },
            { symbolKey: 'pearl', relation: 'pool_add' },
        ],
    },
    [MATHEMATICS_UPGRADE_ID]: {
        id: MATHEMATICS_UPGRADE_ID,
        name: 'Mathematics',
        type: SymbolType.ANCIENT,
        description: 'Base Food +1, Base Knowledge +1.',
        sprite: '-',
    },
    /** 레벨 10 이상에서만 선택지에 등장 — 중세 풀·지형 가중 */
    [FEUDALISM_UPGRADE_ID]: {
        id: FEUDALISM_UPGRADE_ID,
        name: 'Medieval Age',
        type: SymbolType.MEDIEVAL,
        description: 'Ancient symbols no longer appear. Unlocks all Medieval symbols. Terrain symbol odds become x0.2.',
        sprite: '-',
        descSymbols: buildFeudalismDescSymbols(),
    },

    // ── Medieval Upgrades (require Medieval Age upgrade or era 2+) ──
    [EDUCATION_UPGRADE_ID]: {
        id: EDUCATION_UPGRADE_ID,
        name: 'Education',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Library.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'library', relation: 'effect_modify' }],
    },
    [THEOCRACY_UPGRADE_ID]: {
        id: THEOCRACY_UPGRADE_ID,
        name: 'Theocracy',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Christianity, Islam, Buddhism, and Hinduism.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'christianity', relation: 'effect_modify' },
            { symbolKey: 'islam', relation: 'effect_modify' },
            { symbolKey: 'buddhism', relation: 'effect_modify' },
            { symbolKey: 'hinduism', relation: 'effect_modify' },
        ],
    },
    [GUILD_UPGRADE_ID]: {
        id: GUILD_UPGRADE_ID,
        name: 'Guild',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Merchant.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'merchant', relation: 'effect_modify' }],
    },
    [PRINTING_PRESS_UPGRADE_ID]: {
        id: PRINTING_PRESS_UPGRADE_ID,
        name: 'Printing Press',
        type: SymbolType.MEDIEVAL,
        description: 'Base Gold +2, Base Knowledge +2.',
        sprite: '-',
    },
    [SCIENTIFIC_THEORY_UPGRADE_ID]: {
        id: SCIENTIFIC_THEORY_UPGRADE_ID,
        name: 'Scientific Theory',
        type: SymbolType.MODERN,
        description: 'Upgrades Library.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'library', relation: 'effect_modify' }],
    },
    [COMPASS_UPGRADE_ID]: {
        id: COMPASS_UPGRADE_ID,
        name: 'Compass',
        type: SymbolType.MEDIEVAL,
        description: 'Compass is added to the symbol selection pool.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'compass', relation: 'pool_add' }],
    },
    [SHIPBUILDING_UPGRADE_ID]: {
        id: SHIPBUILDING_UPGRADE_ID,
        name: 'Shipbuilding',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Sea.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'sea', relation: 'effect_modify' }],
    },
    [FISHERY_GUILD_UPGRADE_ID]: {
        id: FISHERY_GUILD_UPGRADE_ID,
        name: 'Fishery Guild',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Fish and Crab.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'fish', relation: 'effect_modify' },
            { symbolKey: 'crab', relation: 'effect_modify' },
        ],
    },
    [MARITIME_TRADE_UPGRADE_ID]: {
        id: MARITIME_TRADE_UPGRADE_ID,
        name: 'Maritime Trade',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Pearl and Sea.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'pearl', relation: 'effect_modify' },
            { symbolKey: 'sea', relation: 'effect_modify' },
        ],
    },
    [OCEANIC_ROUTES_UPGRADE_ID]: {
        id: OCEANIC_ROUTES_UPGRADE_ID,
        name: 'Oceanic Routes',
        type: SymbolType.MODERN,
        description: 'Upgrades Fish, Crab, Pearl, and Sea.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'fish', relation: 'effect_modify' },
            { symbolKey: 'crab', relation: 'effect_modify' },
            { symbolKey: 'pearl', relation: 'effect_modify' },
            { symbolKey: 'sea', relation: 'effect_modify' },
        ],
    },
    [PLANTATION_UPGRADE_ID]: {
        id: PLANTATION_UPGRADE_ID,
        name: 'Plantation',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Banana and Rainforest.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'banana', relation: 'effect_modify' },
            { symbolKey: 'rainforest', relation: 'effect_modify' },
        ],
    },
    [JUNGLE_EXPEDITION_UPGRADE_ID]: {
        id: JUNGLE_EXPEDITION_UPGRADE_ID,
        name: 'Jungle Expedition',
        type: SymbolType.MEDIEVAL,
        description: 'Expedition is added to the symbol selection pool.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'expedition', relation: 'pool_add' }],
    },
    [TROPICAL_DEVELOPMENT_UPGRADE_ID]: {
        id: TROPICAL_DEVELOPMENT_UPGRADE_ID,
        name: 'Tropical Development',
        type: SymbolType.MODERN,
        description: 'Upgrades Rainforest and Expedition.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'rainforest', relation: 'effect_modify' },
            { symbolKey: 'expedition', relation: 'effect_modify' },
        ],
    },
    [THREE_FIELD_SYSTEM_UPGRADE_ID]: {
        id: THREE_FIELD_SYSTEM_UPGRADE_ID,
        name: 'Three-field System',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Wheat, Rice, and Grassland.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'wheat', relation: 'effect_modify' },
            { symbolKey: 'rice', relation: 'effect_modify' },
            { symbolKey: 'grassland', relation: 'effect_modify' },
        ],
    },
    [AGRICULTURAL_SURPLUS_UPGRADE_ID]: {
        id: AGRICULTURAL_SURPLUS_UPGRADE_ID,
        name: 'Agricultural Surplus',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Wheat and Rice.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'wheat', relation: 'effect_modify' },
            { symbolKey: 'rice', relation: 'effect_modify' },
        ],
    },
    [MODERN_AGRICULTURE_UPGRADE_ID]: {
        id: MODERN_AGRICULTURE_UPGRADE_ID,
        name: 'Modern Agriculture',
        type: SymbolType.MODERN,
        description: 'Upgrades Wheat and Rice.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'wheat', relation: 'effect_modify' },
            { symbolKey: 'rice', relation: 'effect_modify' },
        ],
    },
    [MODERN_AGE_UPGRADE_ID]: {
        id: MODERN_AGE_UPGRADE_ID,
        name: 'Modern Age',
        type: SymbolType.MODERN,
        description: 'Medieval symbols no longer appear. Unlocks all Modern symbols. Terrain symbols no longer appear.',
        sprite: '-',
        descSymbols: buildModernAgeDescSymbols(),
    },
    [AGI_PROJECT_UPGRADE_ID]: {
        id: AGI_PROJECT_UPGRADE_ID,
        name: 'AGI Project',
        type: SymbolType.MODERN,
        description: 'Gain the AGI Core.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'agi_core', relation: 'pool_add' }],
    },
    [PASTURE_MANAGEMENT_UPGRADE_ID]: {
        id: PASTURE_MANAGEMENT_UPGRADE_ID,
        name: 'Pasture Management',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Plains.',
        sprite: '-',
        descSymbols: [{ symbolKey: 'plains', relation: 'effect_modify' }],
    },
    [NOMADIC_TRADITION_UPGRADE_ID]: {
        id: NOMADIC_TRADITION_UPGRADE_ID,
        name: 'Nomadic Tradition',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Cattle, Sheep, and Wool.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'cattle', relation: 'effect_modify' },
            { symbolKey: 'sheep', relation: 'effect_modify' },
            { symbolKey: 'wool', relation: 'effect_modify' },
        ],
    },


};

export const KNOWLEDGE_UPGRADE_PREREQUISITES: Record<number, readonly number[]> = {
    [EDUCATION_UPGRADE_ID]: [WRITING_SYSTEM_UPGRADE_ID],
    [THEOCRACY_UPGRADE_ID]: [THEOLOGY_UPGRADE_ID],
    [GUILD_UPGRADE_ID]: [CURRENCY_UPGRADE_ID],
    [MILITARY_SCIENCE_UPGRADE_ID]: [HORSEMANSHIP_UPGRADE_ID],
    [SCIENTIFIC_THEORY_UPGRADE_ID]: [EDUCATION_UPGRADE_ID],
    [IRON_WORKING_UPGRADE_ID]: [ARCHERY_UPGRADE_ID],
    [IRRIGATION_UPGRADE_ID]: [AGRICULTURE_UPGRADE_ID],
    [HORSEMANSHIP_UPGRADE_ID]: [PASTORALISM_UPGRADE_ID],
    [NOMADIC_TRADITION_UPGRADE_ID]: [PASTORALISM_UPGRADE_ID],
    [PASTURE_MANAGEMENT_UPGRADE_ID]: [NOMADIC_TRADITION_UPGRADE_ID],
    [SEAFARING_UPGRADE_ID]: [FISHERIES_UPGRADE_ID],
    [CELESTIAL_NAVIGATION_UPGRADE_ID]: [FISHERIES_UPGRADE_ID],
    [COMPASS_UPGRADE_ID]: [FISHERIES_UPGRADE_ID],
    [FEUDALISM_UPGRADE_ID]: [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
    [MODERN_AGE_UPGRADE_ID]: [FEUDALISM_UPGRADE_ID],
    [AGI_PROJECT_UPGRADE_ID]: [MODERN_AGE_UPGRADE_ID],
    [SHIPBUILDING_UPGRADE_ID]: [FISHERIES_UPGRADE_ID],
    [FISHERY_GUILD_UPGRADE_ID]: [SEAFARING_UPGRADE_ID],
    [MARITIME_TRADE_UPGRADE_ID]: [CELESTIAL_NAVIGATION_UPGRADE_ID],
    [OCEANIC_ROUTES_UPGRADE_ID]: [MARITIME_TRADE_UPGRADE_ID, FISHERY_GUILD_UPGRADE_ID],
    [TRACKING_UPGRADE_ID]: [HUNTING_UPGRADE_ID],
    [TANNING_UPGRADE_ID]: [TRACKING_UPGRADE_ID],
    [FORESTRY_UPGRADE_ID]: [TANNING_UPGRADE_ID],
    [PRESERVATION_UPGRADE_ID]: [FORESTRY_UPGRADE_ID],
    [PLANTATION_UPGRADE_ID]: [MINING_UPGRADE_ID],
    [JUNGLE_EXPEDITION_UPGRADE_ID]: [PLANTATION_UPGRADE_ID],
    [TROPICAL_DEVELOPMENT_UPGRADE_ID]: [JUNGLE_EXPEDITION_UPGRADE_ID],
    [THREE_FIELD_SYSTEM_UPGRADE_ID]: [IRRIGATION_UPGRADE_ID],
    [AGRICULTURAL_SURPLUS_UPGRADE_ID]: [THREE_FIELD_SYSTEM_UPGRADE_ID],
    [MODERN_AGRICULTURE_UPGRADE_ID]: [AGRICULTURAL_SURPLUS_UPGRADE_ID],
    [MECHANICS_UPGRADE_ID]: [IRON_WORKING_UPGRADE_ID],
    [GUNPOWDER_UPGRADE_ID]: [MECHANICS_UPGRADE_ID],
    [BALLISTICS_UPGRADE_ID]: [GUNPOWDER_UPGRADE_ID],
    [INTERCHANGEABLE_PARTS_UPGRADE_ID]: [BALLISTICS_UPGRADE_ID],
    [DRY_STORAGE_UPGRADE_ID]: [FOREIGN_TRADE_UPGRADE_ID],
    [DESERT_STORAGE_UPGRADE_ID]: [DRY_STORAGE_UPGRADE_ID],
    [CARAVANSERAI_UPGRADE_ID]: [DESERT_STORAGE_UPGRADE_ID],
    [OASIS_RECOVERY_UPGRADE_ID]: [CARAVANSERAI_UPGRADE_ID],
};

const KNOWLEDGE_UPGRADE_DEPENDENTS = Object.entries(KNOWLEDGE_UPGRADE_PREREQUISITES).reduce<
    Record<number, number[]>
>((acc, [upgradeId, prereqIds]) => {
    const parsedUpgradeId = Number(upgradeId);
    for (const prereqId of prereqIds) {
        acc[prereqId] ??= [];
        acc[prereqId]!.push(parsedUpgradeId);
    }
    return acc;
}, {});

export function getKnowledgeUpgradeDirectPrerequisites(upgradeId: number): readonly number[] {
    return KNOWLEDGE_UPGRADE_PREREQUISITES[Number(upgradeId)] ?? [];
}

export function getKnowledgeUpgradeDirectDependents(upgradeId: number): readonly number[] {
    return KNOWLEDGE_UPGRADE_DEPENDENTS[Number(upgradeId)] ?? [];
}

export function getKnowledgeUpgradePrerequisiteClosure(upgradeId: number): number[] {
    const result = new Set<number>();
    const visit = (id: number) => {
        for (const prereqId of KNOWLEDGE_UPGRADE_PREREQUISITES[id] ?? []) {
            if (result.has(prereqId)) continue;
            result.add(prereqId);
            visit(prereqId);
        }
    };
    visit(Number(upgradeId));
    return [...result];
}
