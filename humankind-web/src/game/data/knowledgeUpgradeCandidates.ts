import { SymbolType } from './symbolDefinitions';
import type { KnowledgeUpgrade } from './knowledgeUpgrades';

export const KNOWLEDGE_UPGRADE_CANDIDATES: Record<number, KnowledgeUpgrade> = {
    // ── Ancient / Classical SymbolType Candidates ──
    201: { id: 201, name: "Hunting", type: SymbolType.NORMAL, description: "Unlocks 'Bear'. Destroys 1 'Banana' for +100 Gold. 'Banana' no longer appears in shop.", sprite: "001.png" },
    202: { id: 202, name: "Metallurgy", type: SymbolType.NORMAL, description: "Unlocks 'Bronze'. Instantly transforms all 'Copper' into 'Bronze'.", sprite: "002.png" },
    203: { id: 203, name: "Spearcraft", type: SymbolType.NORMAL, description: "Unlocks 'Spearman'. 'Warrior' no longer appears in shop.", sprite: "003.png" },
    204: { id: 204, name: "Shipbuilding", type: SymbolType.NORMAL, description: "Unlocks 'Boat'. Instantly transforms all 'Oasis' into 'Sea'.", sprite: "004.png" },
    205: { id: 205, name: "Shamanism", type: SymbolType.NORMAL, description: "Unlocks 'Shaman'. Destroys 1 'Omen' to instantly gain +50 Knowledge.", sprite: "005.png" },
    206: { id: 206, name: "Weaving", type: SymbolType.NORMAL, description: "Unlocks 'Loom'. If you have 'Plains' or 'Grassland', +10 Gold every spin.", sprite: "006.png" },
    207: { id: 207, name: "Jewelry", type: SymbolType.NORMAL, description: "Unlocks 'Gem'. 'Stone' produces -5 Food but +15 Gold.", sprite: "007.png" },
    208: { id: 208, name: "Epic Tales", type: SymbolType.NORMAL, description: "Unlocks 'Storyteller'. 'Oral Tradition' Knowledge production x2.", sprite: "008.png" },
    209: { id: 209, name: "Trade", type: SymbolType.NORMAL, description: "Unlocks 'Market'. Instantly transforms up to 2 'Wheat' into 'Gem'.", sprite: "009.png" },
};
