import { Era } from './symbolDefinitions';

export interface KnowledgeUpgrade {
    id: number;
    name: string;
    era: Era;
    description: string;
    sprite?: string;
}

export const KNOWLEDGE_UPGRADES: Record<number, KnowledgeUpgrade> = {
    // ── Ancient Upgrades ──
    1: { id: 1, name: "Writing System", era: Era.ANCIENT, description: "Permanently increases base Knowledge generation by +2. Unlocks Library symbol.", sprite: "001.png" },
    2: { id: 2, name: "Bronze Working", era: Era.ANCIENT, description: "Warrior HP +10, Archer HP +3.", sprite: "002.png" },
    3: { id: 3, name: "Irrigation", era: Era.ANCIENT, description: "All Farms produce triple Food instead of double.", sprite: "003.png" },
    4: { id: 4, name: "Theology", era: Era.ANCIENT, description: "Unlocks Religion symbols for selection.", sprite: "004.png" },
    5: { id: 5, name: "Archery", era: Era.ANCIENT, description: "Unlocks Archer symbol for selection.", sprite: "005.png" },
    6: { id: 6, name: "Currency", era: Era.ANCIENT, description: "Permanently increases base Gold generation by +2. Unlocks Merchant symbol.", sprite: "006.png" },
    7: { id: 7, name: "Horsemanship", era: Era.ANCIENT, description: "Unlocks Horse symbol. Pasture base production +10.", sprite: "007.png" },
    8: { id: 8, name: "Sacrificial Rite", era: Era.ANCIENT, description: "Immediately lets you select and destroy up to 3 owned symbols. +100 Gold per destroyed symbol.", sprite: "-" },
    9: { id: 9, name: "Celestial Navigation", era: Era.ANCIENT, description: "Unlocks Crab and Pearl symbols for selection.", sprite: "009.png" },
};

