import { SymbolType } from './symbolDefinitions';
import type { KnowledgeUpgrade } from './knowledgeUpgrades';

export const KNOWLEDGE_UPGRADE_CANDIDATES: Record<number, KnowledgeUpgrade> = {
    // ── Ancient / Classical SymbolType Candidates ──
    201: { id: 201, name: "Hunting", type: SymbolType.NORMAL, description: "Destroys 1 'Banana' for +100 Gold. 'Banana' no longer appears in shop.", sprite: "001.png" },
    202: { id: 202, name: "Metallurgy", type: SymbolType.NORMAL, description: "(Placeholder - effect removed)", sprite: "002.png" },
    203: { id: 203, name: "Spearcraft", type: SymbolType.NORMAL, description: "'Warrior' no longer appears in shop.", sprite: "003.png" },
    204: { id: 204, name: "Shipbuilding", type: SymbolType.NORMAL, description: "Instantly transforms all 'Oasis' into 'Sea'.", sprite: "004.png" },
    205: { id: 205, name: "Shamanism", type: SymbolType.NORMAL, description: "Destroys 1 'Omen' to instantly gain +50 Knowledge.", sprite: "005.png" },
    206: { id: 206, name: "Weaving", type: SymbolType.NORMAL, description: "If you have 'Plains' or 'Grassland', +10 Gold every spin.", sprite: "006.png" },
    207: { id: 207, name: "Jewelry", type: SymbolType.NORMAL, description: "'Stone' produces -5 Food but +15 Gold.", sprite: "007.png" },
    208: { id: 208, name: "Epic Tales", type: SymbolType.NORMAL, description: "'Oral Tradition' Knowledge production x2.", sprite: "008.png" },
    209: { id: 209, name: "Trade", type: SymbolType.NORMAL, description: "(Placeholder - effect removed)", sprite: "009.png" },
};
