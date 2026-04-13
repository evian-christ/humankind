import { SymbolType, SYMBOLS } from './symbolDefinitions';

/** 지식 업그레이드 설명에 나오는 심볼과, 선택 풀·효과에 미치는 관계 */
export type KnowledgeUpgradeSymbolRelation = 'pool_add' | 'pool_remove' | 'effect_modify';

export interface KnowledgeUpgradeDescSymbol {
    id: number;
    relation: KnowledgeUpgradeSymbolRelation;
}

/** 중세시대(15) 카드 칩 — 풀 제외/추가는 게임과 동기, 효과 변경은 산만(지형 등장 확률만 바뀌는 타일은 칩 제외) */
export function buildFeudalismDescSymbols(): KnowledgeUpgradeDescSymbol[] {
    const poolRemoveIds = Object.values(SYMBOLS)
        .filter((s) => s.type === SymbolType.ANCIENT || s.id === 35 || s.id === 36)
        .map((s) => s.id)
        .sort((a, b) => a - b);

    /** `buildFlatPool`에서 중세시대 해금 시 포함되는 SymbolType.MEDIEVAL 심볼 */
    const poolAddIds = [53, 64, 65, 66, 67, 68, 69, 70];

    /** `symbolEffects` case 15: 식량·인접 적 피해 규칙이 바뀌는 지형만 */
    const effectModifyTerrainIds = [15];

    return [
        ...poolRemoveIds.map((id) => ({ id, relation: 'pool_remove' as const })),
        ...poolAddIds.map((id) => ({ id, relation: 'pool_add' as const })),
        ...effectModifyTerrainIds.map((id) => ({ id, relation: 'effect_modify' as const })),
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

export const KNOWLEDGE_UPGRADES: Record<number, KnowledgeUpgrade> = {
    // ── Ancient Upgrades ──
    1: {
        id: 1,
        name: 'Writing System',
        type: SymbolType.ANCIENT,
        description: 'Permanently increases base Knowledge generation by +2. Unlocks Library symbol.',
        sprite: '001.png',
        descSymbols: [{ id: 25, relation: 'pool_add' }],
    },
    2: {
        id: 2,
        name: 'Bronze Working',
        type: SymbolType.ANCIENT,
        description: 'Warrior HP +10, Archer HP +3.',
        sprite: '002.png',
        descSymbols: [
            { id: 35, relation: 'effect_modify' },
            { id: 36, relation: 'effect_modify' },
        ],
    },
    3: {
        id: 3,
        name: 'Irrigation',
        type: SymbolType.ANCIENT,
        description: 'All Grasslands produce triple Food instead of double.',
        sprite: '003.png',
        descSymbols: [
            { id: 1, relation: 'effect_modify' },
            { id: 2, relation: 'effect_modify' },
        ],
    },
    4: {
        id: 4,
        name: 'Theology',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Religion symbols for selection.',
        sprite: '004.png',
        descSymbols: [
            { id: 31, relation: 'pool_add' },
            { id: 32, relation: 'pool_add' },
            { id: 33, relation: 'pool_add' },
            { id: 34, relation: 'pool_add' },
        ],
    },
    5: {
        id: 5,
        name: 'Archery',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Archer symbol for selection.',
        sprite: '005.png',
        descSymbols: [{ id: 36, relation: 'pool_add' }],
    },
    6: {
        id: 6,
        name: 'Currency',
        type: SymbolType.ANCIENT,
        description: 'Permanently increases base Gold generation by +2. Unlocks Merchant symbol.',
        sprite: '006.png',
        descSymbols: [{ id: 22, relation: 'pool_add' }],
    },
    7: {
        id: 7,
        name: 'Horsemanship',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Horse symbol. Plains base Food production +1.',
        sprite: '007.png',
        descSymbols: [
            { id: 23, relation: 'pool_add' },
            { id: 14, relation: 'effect_modify' },
        ],
    },
    8: {
        id: 8,
        name: 'Sacrificial Rite',
        type: SymbolType.ANCIENT,
        description: 'Immediately lets you select and destroy up to 3 owned symbols. +10 Gold per destroyed symbol.',
        sprite: '-',
    },
    9: {
        id: 9,
        name: 'Celestial Navigation',
        type: SymbolType.ANCIENT,
        description: 'Unlocks Crab and Pearl symbols for selection.',
        sprite: '-',
        descSymbols: [
            { id: 24, relation: 'pool_add' },
            { id: 26, relation: 'pool_add' },
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
        type: SymbolType.ANCIENT,
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
            { id: 25, relation: 'pool_remove' },
            { id: 54, relation: 'pool_add' },
        ],
    },
    17: {
        id: 17,
        name: 'Cartography',
        type: SymbolType.MEDIEVAL,
        description: 'Unlocks Harbor symbol.',
        sprite: '-',
        descSymbols: [{ id: 55, relation: 'pool_add' }],
    },
    18: {
        id: 18,
        name: 'Engineering',
        type: SymbolType.MEDIEVAL,
        description: 'Unlocks Aqueduct and Rye symbols.',
        sprite: '-',
        descSymbols: [
            { id: 56, relation: 'pool_add' },
            { id: 57, relation: 'pool_add' },
        ],
    },
    19: {
        id: 19,
        name: 'Stirrup',
        type: SymbolType.MEDIEVAL,
        description:
            'Warrior adjacent to Horse becomes Knight (+3 Attack, +3 HP); Horse is removed. Unlocks Sheep. Cattle: +3 Food; +2 Food when adjacent to Plains or Grassland.',
        sprite: '-',
        descSymbols: [
            { id: 35, relation: 'effect_modify' },
            { id: 23, relation: 'effect_modify' },
            { id: 62, relation: 'pool_add' },
            { id: 58, relation: 'pool_add' },
            { id: 3, relation: 'effect_modify' },
        ],
    },
    20: {
        id: 20,
        name: 'Architecture',
        type: SymbolType.MEDIEVAL,
        description: 'Unlocks Sawmill and Wild Boar symbols.',
        sprite: '-',
        descSymbols: [
            { id: 60, relation: 'pool_add' },
            { id: 59, relation: 'pool_add' },
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
            { id: 35, relation: 'effect_modify' },
            { id: 6, relation: 'effect_modify' },
            { id: 63, relation: 'pool_add' },
            { id: 61, relation: 'pool_add' },
            { id: 52, relation: 'effect_modify' },
            { id: 13, relation: 'effect_modify' },
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
        descSymbols: [{ id: 40, relation: 'effect_modify' }],
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
