import { Era } from './symbolDefinitions';
import type { KnowledgeUpgrade } from './knowledgeUpgrades';

export const KNOWLEDGE_UPGRADE_CANDIDATES: Record<number, KnowledgeUpgrade> = {
    // ── Ancient / Classical Era Candidates ──
    201: { id: 201, name: "Hunting", era: Era.ANCIENT, description: "Unlocks 'Bear'. Destroys 1 'Banana' for +100 Gold. 'Banana' no longer appears in shop.", sprite: "001.png" },
    202: { id: 202, name: "Metallurgy", era: Era.ANCIENT, description: "Unlocks 'Bronze'. Instantly transforms all 'Copper' into 'Bronze'.", sprite: "002.png" },
    203: { id: 203, name: "Spearcraft", era: Era.ANCIENT, description: "Unlocks 'Spearman'. 'Warrior' no longer appears in shop.", sprite: "003.png" },
    204: { id: 204, name: "Shipbuilding", era: Era.ANCIENT, description: "Unlocks 'Boat'. Instantly transforms all 'Oasis' into 'Sea'.", sprite: "004.png" },
    205: { id: 205, name: "Shamanism", era: Era.ANCIENT, description: "Unlocks 'Shaman'. Destroys 1 'Omen' to instantly gain +50 Knowledge.", sprite: "005.png" },
    206: { id: 206, name: "Weaving", era: Era.ANCIENT, description: "Unlocks 'Loom'. If you have 'Plains' or 'Grassland', +10 Gold every spin.", sprite: "006.png" },
    207: { id: 207, name: "Jewelry", era: Era.ANCIENT, description: "Unlocks 'Gem'. 'Stone' produces -5 Food but +15 Gold.", sprite: "007.png" },
    208: { id: 208, name: "Epic Tales", era: Era.ANCIENT, description: "Unlocks 'Storyteller'. 'Oral Tradition' Knowledge production x2.", sprite: "008.png" },
    209: { id: 209, name: "Trade", era: Era.ANCIENT, description: "Unlocks 'Market'. Instantly transforms up to 2 'Wheat' into 'Gem'.", sprite: "009.png" },
};
