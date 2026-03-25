import { SymbolType } from './symbolDefinitions';

export interface KnowledgeUpgrade {
    id: number;
    name: string;
    type: KnowledgeUpgradeType;
    description: string;
    sprite?: string;
}

export type KnowledgeUpgradeType = SymbolType | 'ramesses' | 'pericles';

export const KNOWLEDGE_UPGRADES: Record<number, KnowledgeUpgrade> = {
    // ── Ancient Upgrades ──
    1: { id: 1, name: "Writing System", type: SymbolType.ANCIENT, description: "Permanently increases base Knowledge generation by +2. Unlocks Library symbol.", sprite: "001.png" },
    2: { id: 2, name: "Bronze Working", type: SymbolType.ANCIENT, description: "Warrior HP +10, Archer HP +3.", sprite: "002.png" },
    3: { id: 3, name: "Irrigation", type: SymbolType.ANCIENT, description: "All Grasslands produce triple Food instead of double.", sprite: "003.png" },
    4: { id: 4, name: "Theology", type: SymbolType.ANCIENT, description: "Unlocks Religion symbols for selection.", sprite: "004.png" },
    5: { id: 5, name: "Archery", type: SymbolType.ANCIENT, description: "Unlocks Archer symbol for selection.", sprite: "005.png" },
    6: { id: 6, name: "Currency", type: SymbolType.ANCIENT, description: "Permanently increases base Gold generation by +2. Unlocks Merchant symbol.", sprite: "006.png" },
    7: { id: 7, name: "Horsemanship", type: SymbolType.ANCIENT, description: "Unlocks Horse symbol. Plains base Food production +1.", sprite: "007.png" },
    8: { id: 8, name: "Sacrificial Rite", type: SymbolType.ANCIENT, description: "Immediately lets you select and destroy up to 3 owned symbols. +10 Gold per destroyed symbol.", sprite: "-" },
    9: { id: 9, name: "Celestial Navigation", type: SymbolType.ANCIENT, description: "Unlocks Crab and Pearl symbols for selection.", sprite: "-" },
    10: { id: 10, name: "Mathematics", type: SymbolType.ANCIENT, description: "Base Food +5, Base Gold +2, Base Knowledge +2.", sprite: "-" },
    /** 레벨 10 이상에서만 선택지에 등장 — 중세 풀·지형 가중·산 강화 */
    15: {
        id: 15,
        name: "Medieval Age",
        type: SymbolType.ANCIENT,
        description:
            "Medieval age: Ancient symbols leave the shop pool; Medieval symbols are added. Terrain symbol odds x0.2. Mountains +1 Food. Adjacent enemy units lose 3 HP each turn from Mountains.",
        sprite: "-",
    },

    // ── Medieval Upgrades (require Medieval Age upgrade or era 2+) ──
    16: {
        id: 16,
        name: "Education",
        type: SymbolType.MEDIEVAL,
        description: "All Libraries become Universities. Base Knowledge production +2.",
        sprite: "-",
    },
    17: { id: 17, name: "Cartography", type: SymbolType.MEDIEVAL, description: "Unlocks Harbor symbol.", sprite: "-" },
    18: {
        id: 18,
        name: "Engineering",
        type: SymbolType.MEDIEVAL,
        description: "Unlocks Aqueduct and Rye symbols.",
        sprite: "-",
    },
    19: {
        id: 19,
        name: "Stirrup",
        type: SymbolType.MEDIEVAL,
        description:
            "Warrior adjacent to Horse becomes Knight (+3 Attack, +3 HP); Horse is removed. Unlocks Sheep. Cattle: +3 Food; +2 Food when adjacent to Plains or Grassland.",
        sprite: "-",
    },
    20: {
        id: 20,
        name: "Architecture",
        type: SymbolType.MEDIEVAL,
        description: "Unlocks Sawmill and Wild Boar symbols.",
        sprite: "-",
    },
    21: {
        id: 21,
        name: "Caravel",
        type: SymbolType.MEDIEVAL,
        description:
            "Warrior adjacent to Sea becomes Caravel (+7 HP). Unlocks Gold Vein. Spices: +2 Food per terrain type; when adjacent to Rainforest: +2 Food and +3 Gold.",
        sprite: "-",
    },
    22: {
        id: 22,
        name: "Territorial Reorganization",
        type: SymbolType.MEDIEVAL,
        description:
            "Destroy up to 3 owned symbols (on-destroy effects do not trigger); +10 Gold each. Then: 1 terrain pick and 3 symbol picks.",
        sprite: "-",
    },
    23: {
        id: 23,
        name: "Castle",
        type: SymbolType.MEDIEVAL,
        description: "Barbarian invasion and Barbarian Camp threat growth per turn is halved.",
        sprite: "-",
    },
    24: {
        id: 24,
        name: "Printing Press",
        type: SymbolType.MEDIEVAL,
        description: "Base Food +10, Base Gold +5, Base Knowledge +5.",
        sprite: "-",
    },

    // ── Leader Effects (hidden from upgrade selection) ──
    // Selected leader skills are treated as knowledge upgrades, but they should never appear as selectable cards.
    // Ramesses
    11: {
        id: 11,
        name: "Golden Trade",
        type: 'ramesses',
        description: "Relic Shop prices are 20% cheaper. In addition, when the shop refreshes every 10 turns, one random relic appears at half price.",
        sprite: "-",
    },
    12: {
        id: 12,
        name: "Relic Vault",
        type: 'ramesses',
        description: "For each relic you own: +1 Knowledge per turn.",
        sprite: "-",
    },
    // Pericles
    13: {
        id: 13,
        name: "Delian League",
        type: 'pericles',
        description: "For every 5 different symbol types on the board: +2 Knowledge per turn.",
        sprite: "-",
    },
    14: {
        id: 14,
        name: "Democratic Order",
        type: 'pericles',
        description: "When choosing a Knowledge Upgrade card: you can refresh each card once.",
        sprite: "-",
    },
};

export const FEUDALISM_UPGRADE_ID = 15;
export const SACRIFICIAL_RITE_UPGRADE_ID = 8;
export const TERRITORIAL_REORG_UPGRADE_ID = 22;

