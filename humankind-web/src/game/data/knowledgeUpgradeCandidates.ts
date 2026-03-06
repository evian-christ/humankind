import { Era } from './symbolDefinitions';
import type { KnowledgeUpgrade } from './knowledgeUpgrades';

export const KNOWLEDGE_UPGRADE_CANDIDATES: Record<number, KnowledgeUpgrade> = {
    // ── Ancient / Classical Era Candidates ──
    201: { id: 201, name: "Iron Working", era: Era.ANCIENT, description: "All combat units produce +10 Gold every turn.", sprite: "001.png" },
    202: { id: 202, name: "Mathematics", era: Era.ANCIENT, description: "Permanently increases base Knowledge generation by +3.", sprite: "002.png" },
    203: { id: 203, name: "Construction", era: Era.ANCIENT, description: "'Stone' and 'Quarry' symbols produce an additional +20 Gold.", sprite: "003.png" },
    204: { id: 204, name: "Philosophy", era: Era.ANCIENT, description: "'Library' symbols produce double Knowledge.", sprite: "004.png" },
    205: { id: 205, name: "Code of Laws", era: Era.ANCIENT, description: "Provides +10 Food and +10 Gold every turn for each empty slot on the board.", sprite: "005.png" },
    206: { id: 206, name: "Mining", era: Era.ANCIENT, description: "'Copper' symbols produce +30 additional Gold.", sprite: "006.png" },
    207: { id: 207, name: "Pottery", era: Era.ANCIENT, description: "All base Food-producing symbols (Wheat, Rice, Banana, Fish, Farm, Pasture) produce +5 additional Food.", sprite: "007.png" },
    208: { id: 208, name: "Astrology", era: Era.ANCIENT, description: "Unlocks 'Stargazer' symbol for selection. Permanently increases base Knowledge generation by +1.", sprite: "008.png" },
    209: { id: 209, name: "Drama and Poetry", era: Era.ANCIENT, description: "'Monument' symbols also produce +15 Gold.", sprite: "009.png" },
    210: { id: 210, name: "Sacrificial Rite", era: Era.ANCIENT, description: "Immediately lets you select and destroy up to 3 owned symbols. +100 Gold per destroyed symbol.", sprite: "010.png" },
};
