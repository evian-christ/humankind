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
/** 유목 전통 — 목축업 선행, 소·양·양모 보상 강화 */
export const NOMADIC_TRADITION_UPGRADE_ID = 39;
/** 나침반 — 나침반 심볼을 선택 풀에 추가 */
export const COMPASS_UPGRADE_ID = 40;
/** 조선 — 바다가 보드 위에서 2개로 간주됨 */
export const SHIPBUILDING_UPGRADE_ID = 41;
/** 어업 조합 — 물고기·게를 상위 단계로 업그레이드 */
export const FISHERY_GUILD_UPGRADE_ID = 42;
/** 해상 무역 — 진주와 바다를 강화 */
export const MARITIME_TRADE_UPGRADE_ID = 43;
/** 원양 항로 — 물고기·게·진주·바다의 최종 해상 업그레이드 */
export const OCEANIC_ROUTES_UPGRADE_ID = 44;
/** 플랜테이션 — 바나나·열대우림 업그레이드 */
export const PLANTATION_UPGRADE_ID = 45;
/** 정글탐사 — 탐사대 심볼 해금 */
export const JUNGLE_EXPEDITION_UPGRADE_ID = 46;
/** 열대 개발 — 열대우림·탐사대 최종 업그레이드 */
export const TROPICAL_DEVELOPMENT_UPGRADE_ID = 47;
/** 추적술 — 숲·버섯·사슴 업그레이드 */
export const TRACKING_UPGRADE_ID = 48;
/** 무두질 — 모피·사슴 업그레이드 */
export const TANNING_UPGRADE_ID = 49;
/** 임업 — 숲 상위 업그레이드 */
export const FORESTRY_UPGRADE_ID = 50;
/** 보존 — 사슴·버섯 상위 업그레이드 */
export const PRESERVATION_UPGRADE_ID = 51;
/** 목장제 — 유목 전통 선행, 도축 시 인접 평원 카운터 누적 */
export const PASTURE_MANAGEMENT_UPGRADE_ID = 38;
/** 기마술 — 말 풀 추가·평원 업그레이드(목축업 선행) */
export const HORSEMANSHIP_UPGRADE_ID = 7;
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
/** 대상품 교역 — 염료·파피루스 심볼 풀 해금(외국 무역 선행) */
export const DRY_STORAGE_UPGRADE_ID = 52;
/** 건조 저장술 — 오아시스·대추 업그레이드(대상품 교역 선행) */
export const DESERT_STORAGE_UPGRADE_ID = 53;
/** 카라밴세라이 — 카라밴세라이 해금 및 염료·파피루스 업그레이드(건조 저장술 선행) */
export const CARAVANSERAI_UPGRADE_ID = 54;
/** 오아시스 회수망 — 사막·오아시스 최종 업그레이드(카라밴세라이 선행) */
export const OASIS_RECOVERY_UPGRADE_ID = 55;
/** 족장제 — 기본 식량 +2, 야생열매 업그레이드 */
export const CHIEFDOM_UPGRADE_ID = 34;
/** 삼포제 — 관개 선행, 밀·쌀 주기 식량이 보드 위 초원 수를 참조하고 초원을 강화 */
export const THREE_FIELD_SYSTEM_UPGRADE_ID = 35;
/** 농업 잉여 — 삼포제 선행, 밀·쌀의 인접 초원 카운터 가속 강화 */
export const AGRICULTURAL_SURPLUS_UPGRADE_ID = 36;
/** 현대 농업 — 농업 잉여 선행, 밀·쌀이 보드 위 초원 수로 카운터 가속 */
export const MODERN_AGRICULTURE_UPGRADE_ID = 37;
/** 철제 기술 — 전사를 검사로 업그레이드 */
export const IRON_WORKING_UPGRADE_ID = 2;
/** 기계장치 — 궁수를 석궁병으로 업그레이드 */
export const MECHANICS_UPGRADE_ID = 56;
/** 화약 — 검사를 머스킷병으로 업그레이드 */
export const GUNPOWDER_UPGRADE_ID = 57;
/** 탄도학 — 석궁병을 대포로 업그레이드 */
export const BALLISTICS_UPGRADE_ID = 58;
/** 교체식 부품 — 머스킷병을 보병으로 업그레이드 */
export const INTERCHANGEABLE_PARTS_UPGRADE_ID = 59;

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
    [IRON_WORKING_UPGRADE_ID]: {
        id: IRON_WORKING_UPGRADE_ID,
        name: 'Iron Working',
        type: SymbolType.ANCIENT,
        description: 'Upgrades Warrior into Knight.',
        sprite: '002.png',
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
        description: 'Unlocks Mushroom and Fur for the symbol selection pool.',
        sprite: '-',
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
        type: SymbolType.ANCIENT,
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
        type: SymbolType.ANCIENT,
        description: 'Upgrades Forest.',
        sprite: '-',
        descSymbols: [
            { symbolKey: 'forest', relation: 'effect_modify' },
        ],
    },
    [PRESERVATION_UPGRADE_ID]: {
        id: PRESERVATION_UPGRADE_ID,
        name: 'Preservation',
        type: SymbolType.ANCIENT,
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
        sprite: '-',
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
        sprite: '-',
        descSymbols: [{ symbolKey: 'wild_berries', relation: 'effect_modify' }],
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
    24: {
        id: 24,
        name: 'Printing Press',
        type: SymbolType.MEDIEVAL,
        description: 'Base Food +10, Base Gold +5, Base Knowledge +5.',
        sprite: '-',
    },
    [COMPASS_UPGRADE_ID]: {
        id: COMPASS_UPGRADE_ID,
        name: 'Compass',
        type: SymbolType.ANCIENT,
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

export const FEUDALISM_UPGRADE_ID = 15;
export const SACRIFICIAL_RITE_UPGRADE_ID = 8;
export const TERRITORIAL_REORG_UPGRADE_ID = 22;

const KNOWLEDGE_UPGRADE_PREREQUISITES: Record<number, readonly number[]> = {
    [IRON_WORKING_UPGRADE_ID]: [5],
    [IRRIGATION_UPGRADE_ID]: [AGRICULTURE_UPGRADE_ID],
    [HORSEMANSHIP_UPGRADE_ID]: [PASTORALISM_UPGRADE_ID],
    [NOMADIC_TRADITION_UPGRADE_ID]: [PASTORALISM_UPGRADE_ID],
    [PASTURE_MANAGEMENT_UPGRADE_ID]: [NOMADIC_TRADITION_UPGRADE_ID],
    [SEAFARING_UPGRADE_ID]: [FISHERIES_UPGRADE_ID],
    [CELESTIAL_NAVIGATION_UPGRADE_ID]: [FISHERIES_UPGRADE_ID],
    [COMPASS_UPGRADE_ID]: [FISHERIES_UPGRADE_ID],
    [FEUDALISM_UPGRADE_ID]: [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
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
