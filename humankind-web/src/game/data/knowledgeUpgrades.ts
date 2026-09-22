import { SymbolType, type SymbolKey } from './symbolDefinitions';

/** 지식 업그레이드 설명에 나오는 심볼과, 선택 풀·효과에 미치는 관계 */
export type KnowledgeUpgradeSymbolRelation = 'pool_add' | 'pool_remove' | 'effect_modify';

/** 업그레이드 카드 칩·툴팁 — 게임 풀에서 제거된 심볼 키도 문구·스프라이트 표시용으로 허용 */
export type KnowledgeUpgradeDescSymbolKey = SymbolKey | 'aqueduct' | 'rye' | 'hay';

export interface KnowledgeUpgradeDescSymbol {
    /** 활성 심볼 키 또는 표시 전용(제거된 심볼) 키 */
    symbolKey: KnowledgeUpgradeDescSymbolKey;
    relation: KnowledgeUpgradeSymbolRelation;
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

/** 과거 심볼 해금 연구의 ID는 저장 데이터 호환을 위해 유지한다. 새 게임에서는 시대 확장 연구다. */
export const ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID = 1;
export const HUNTING_UPGRADE_ID = 2;
export const PASTORALISM_UPGRADE_ID = 3;
export const FISHERIES_UPGRADE_ID = 4;
export const AGRICULTURE_UPGRADE_ID = 5;
export const FOREIGN_TRADE_UPGRADE_ID = 7;
export const LAW_CODE_UPGRADE_ID = 10;
export const CURRENCY_UPGRADE_ID = 11;
export const SACRIFICIAL_RITE_UPGRADE_ID = 12;
export const INQUISITION_UPGRADE_ID = 64;
export const RESTRUCTURING_UPGRADE_ID = 65;
export const HORSEMANSHIP_UPGRADE_ID = 13;
export const SEAFARING_UPGRADE_ID = 14;
export const CELESTIAL_NAVIGATION_UPGRADE_ID = 15;
export const IRRIGATION_UPGRADE_ID = 16;
export const WRITING_SYSTEM_UPGRADE_ID = 17;
export const DRY_STORAGE_UPGRADE_ID = 19;
export const TRACKING_UPGRADE_ID = 20;
export const THEOLOGY_UPGRADE_ID = 21;
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
export const MARITIME_TRADE_UPGRADE_ID = 34;
export const GUILD_UPGRADE_ID = 37;
export const SHIPBUILDING_UPGRADE_ID = 39;
export const EDUCATION_UPGRADE_ID = 40;
export const THEOCRACY_UPGRADE_ID = 41;
export const JUNGLE_EXPEDITION_UPGRADE_ID = 42;
export const AGRICULTURAL_SURPLUS_UPGRADE_ID = 43;
export const PRINTING_PRESS_UPGRADE_ID = 44;
export const CARAVANSERAI_UPGRADE_ID = 45;
export const FORESTRY_UPGRADE_ID = 46;
export const PASTURE_MANAGEMENT_UPGRADE_ID = 47;
export const MODERN_AGE_UPGRADE_ID = 51;
export const OCEANIC_ROUTES_UPGRADE_ID = 52;
export const STEAM_POWER_UPGRADE_ID = 53;
export const OASIS_RECOVERY_UPGRADE_ID = 54;
export const MODERN_AGRICULTURE_UPGRADE_ID = 56;
export const PRESERVATION_UPGRADE_ID = 57;
export const URBANIZATION_UPGRADE_ID = 58;
export const SCIENTIFIC_THEORY_UPGRADE_ID = 59;
export const TROPICAL_DEVELOPMENT_UPGRADE_ID = 60;
export const ELECTRICITY_UPGRADE_ID = 61;
export const AGI_PROJECT_UPGRADE_ID = 63;
export const MODERN_AGE_LEVEL_UPGRADE_ID = MODERN_AGE_UPGRADE_ID;
export const PUBLIC_ADMINISTRATION_UPGRADE_ID = 66;
export const MASS_MEDIA_UPGRADE_ID = 67;
export const ELECTION_SYSTEM_UPGRADE_ID = 68;
export const BUTTRESS_UPGRADE_ID = 70;
export const COLONIALISM_UPGRADE_ID = 72;
export const TROPICAL_AGRICULTURE_UPGRADE_ID = 76;
export const GREAT_MIGRATION_UPGRADE_ID = 78;
export const LAND_ALLOTMENT_UPGRADE_ID = 79;
export const KNOWLEDGE_UPGRADES: Record<number, KnowledgeUpgrade> = {
    // ── Ancient Upgrades ──
    [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID]: {
        id: ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
        name: 'Ancient Era',
        type: SymbolType.ANCIENT,
        description: 'Expand the slot board three times.',
        sprite: '001.png',
    },
    [AGRICULTURE_UPGRADE_ID]: {
        id: AGRICULTURE_UPGRADE_ID,
        name: 'Agriculture',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Corn.',
        sprite: '005.png',
        descSymbols: [{ symbolKey: 'corn', relation: 'pool_add' }],
    },
    [IRRIGATION_UPGRADE_ID]: {
        id: IRRIGATION_UPGRADE_ID,
        name: 'Irrigation',
        type: SymbolType.ANCIENT,
        description: 'No current effect.',
        sprite: '016.png',
    },
    [PASTORALISM_UPGRADE_ID]: {
        id: PASTORALISM_UPGRADE_ID,
        name: 'Pastoralism',
        type: SymbolType.ANCIENT,
        description: 'Plains produces 1 additional Food.',
        sprite: '003.png',
        descSymbols: [{ symbolKey: 'plains', relation: 'effect_modify' }],
    },
    [FISHERIES_UPGRADE_ID]: {
        id: FISHERIES_UPGRADE_ID,
        name: 'Fisheries',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Pearl.',
        sprite: '004.png',
        descSymbols: [{ symbolKey: 'pearl', relation: 'pool_add' }],
    },
    [HUNTING_UPGRADE_ID]: {
        id: HUNTING_UPGRADE_ID,
        name: 'Hunting',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Deer.',
        sprite: '002.png',
        descSymbols: [{ symbolKey: 'deer', relation: 'pool_add' }],
    },
    [FOREIGN_TRADE_UPGRADE_ID]: {
        id: FOREIGN_TRADE_UPGRADE_ID,
        name: 'Foreign Trade',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Date.',
        sprite: '007.png',
        descSymbols: [{ symbolKey: 'date', relation: 'pool_add' }],
    },
    [TROPICAL_AGRICULTURE_UPGRADE_ID]: {
        id: TROPICAL_AGRICULTURE_UPGRADE_ID,
        name: 'Tropical Agriculture',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Cassava.',
        sprite: '076.png',
        descSymbols: [{ symbolKey: 'cassava', relation: 'pool_add' }],
    },
    [WRITING_SYSTEM_UPGRADE_ID]: {
        id: WRITING_SYSTEM_UPGRADE_ID,
        name: 'Writing System',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Library.',
        sprite: '017.png',
        descSymbols: [{ symbolKey: 'library', relation: 'pool_add' }],
    },
    [THEOLOGY_UPGRADE_ID]: {
        id: THEOLOGY_UPGRADE_ID,
        name: 'Theology',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Religion symbols for selection.',
        sprite: '021.png',
        descSymbols: [
            { symbolKey: 'christianity', relation: 'pool_add' },
            { symbolKey: 'islam', relation: 'pool_add' },
            { symbolKey: 'buddhism', relation: 'pool_add' },
            { symbolKey: 'hinduism', relation: 'pool_add' },
        ],
    },
    [CURRENCY_UPGRADE_ID]: {
        id: CURRENCY_UPGRADE_ID,
        name: 'Currency',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Merchant symbol.',
        sprite: '011.png',
        descSymbols: [{ symbolKey: 'merchant', relation: 'pool_add' }],
    },
    [PUBLIC_ADMINISTRATION_UPGRADE_ID]: {
        id: PUBLIC_ADMINISTRATION_UPGRADE_ID,
        name: 'Public Administration',
        type: SymbolType.MEDIEVAL,
        description: 'In the selection phase, each card is 2x as likely to become an event.',
        sprite: '066.png',
    },
    [MASS_MEDIA_UPGRADE_ID]: {
        id: MASS_MEDIA_UPGRADE_ID,
        name: 'Mass Media',
        type: SymbolType.MODERN,
        description: 'In the selection phase, each card is 2x as likely to become an event.',
        sprite: '067.png',
    },
    /** 레벨 10 이상에서만 선택지에 등장 — 산 효과·보드 확장 */
    [FEUDALISM_UPGRADE_ID]: {
        id: FEUDALISM_UPGRADE_ID,
        name: 'Medieval Age',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Mountain. Expand the slot board three times.',
        sprite: '026.png',
        descSymbols: [{ symbolKey: 'mountain', relation: 'effect_modify' }],
    },

    // ── Medieval Upgrades (require Medieval Age upgrade or era 2+) ──
    [EDUCATION_UPGRADE_ID]: {
        id: EDUCATION_UPGRADE_ID,
        name: 'Education',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Library.',
        sprite: '040.png',
        descSymbols: [{ symbolKey: 'library', relation: 'effect_modify' }],
    },
    [THEOCRACY_UPGRADE_ID]: {
        id: THEOCRACY_UPGRADE_ID,
        name: 'Theocracy',
        type: SymbolType.MEDIEVAL,
        description: 'Upgrades Christianity, Islam, Buddhism, and Hinduism.',
        sprite: '041.png',
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
        sprite: '037.png',
        descSymbols: [{ symbolKey: 'merchant', relation: 'effect_modify' }],
    },
    [THREE_FIELD_SYSTEM_UPGRADE_ID]: {
        id: THREE_FIELD_SYSTEM_UPGRADE_ID,
        name: 'Three-field System',
        type: SymbolType.MEDIEVAL,
        description: 'No current effect.',
        sprite: '028.png',
    },
    [AGRICULTURAL_SURPLUS_UPGRADE_ID]: {
        id: AGRICULTURAL_SURPLUS_UPGRADE_ID,
        name: 'Agricultural Surplus',
        type: SymbolType.MEDIEVAL,
        description: 'No current effect.',
        sprite: '043.png',
    },
    [MODERN_AGRICULTURE_UPGRADE_ID]: {
        id: MODERN_AGRICULTURE_UPGRADE_ID,
        name: 'Modern Agriculture',
        type: SymbolType.MODERN,
        description: 'No current effect.',
        sprite: '056.png',
    },
    [SCIENTIFIC_THEORY_UPGRADE_ID]: {
        id: SCIENTIFIC_THEORY_UPGRADE_ID,
        name: 'Scientific Theory',
        type: SymbolType.MODERN,
        description: 'Upgrades Library.',
        sprite: '059.png',
        descSymbols: [{ symbolKey: 'library', relation: 'effect_modify' }],
    },
    [MODERN_AGE_UPGRADE_ID]: {
        id: MODERN_AGE_UPGRADE_ID,
        name: 'Modern Age',
        type: SymbolType.MODERN,
        description: 'Expand the slot board three times. Upgrades Mountain.',
        sprite: '051.png',
        descSymbols: [{ symbolKey: 'mountain', relation: 'effect_modify' }],
    },
    [AGI_PROJECT_UPGRADE_ID]: {
        id: AGI_PROJECT_UPGRADE_ID,
        name: 'AGI Project',
        type: SymbolType.MODERN,
        description: 'Adds AGI Core to the symbol selection pool.',
        sprite: '063.png',
        descSymbols: [{ symbolKey: 'agi_core', relation: 'pool_add' }],
    },
};

/** 같은 업그레이드 안에서는 직전 레벨만 선행조건으로 사용한다. */
export const KNOWLEDGE_UPGRADE_PREREQUISITES: Record<number, readonly number[]> = {
    [IRRIGATION_UPGRADE_ID]: [AGRICULTURE_UPGRADE_ID],
    [THREE_FIELD_SYSTEM_UPGRADE_ID]: [IRRIGATION_UPGRADE_ID],
    [AGRICULTURAL_SURPLUS_UPGRADE_ID]: [THREE_FIELD_SYSTEM_UPGRADE_ID],
    [MODERN_AGRICULTURE_UPGRADE_ID]: [AGRICULTURAL_SURPLUS_UPGRADE_ID],

    [CURRENCY_UPGRADE_ID]: [FOREIGN_TRADE_UPGRADE_ID],
    [SCIENTIFIC_THEORY_UPGRADE_ID]: [EDUCATION_UPGRADE_ID],

    [FEUDALISM_UPGRADE_ID]: [ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID],
    [MODERN_AGE_UPGRADE_ID]: [FEUDALISM_UPGRADE_ID],
    [AGI_PROJECT_UPGRADE_ID]: [MODERN_AGE_UPGRADE_ID],
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
