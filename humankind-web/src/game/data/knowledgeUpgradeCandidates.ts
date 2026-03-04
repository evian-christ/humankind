import { Era } from './symbolDefinitions';
import type { KnowledgeUpgrade } from './knowledgeUpgrades';

export const KNOWLEDGE_UPGRADE_CANDIDATES: Record<number, KnowledgeUpgrade> = {
    // ── Ancient Upgrades (Moved to Candidates) ──
    // ── Medieval Upgrades (Moved to Candidates) ──
    101: { id: 101, name: "Feudalism", era: Era.MEDIEVAL, description: "For every combat unit, gain +5 Food and +5 Gold each turn.", sprite: "feudalism.png" },
    102: { id: 102, name: "Universities", era: Era.MEDIEVAL, description: "All Knowledge generation is increased by 50%.", sprite: "universities.png" },

    // ── Ancient Era Candidates ──
    201: {
        id: 201,
        name: "Wheel",
        description: "Increases movement speed of combat units.",
        era: 1,
        sprite: "wheel_icon.png"
    },
    202: {
        id: 202,
        name: "Sailing",
        description: "Allows traversal over water tiles.",
        era: 1,
        sprite: "sail_icon.png"
    },
    // ── Medieval Era Candidates ──
    301: {
        id: 301,
        name: "Compass",
        description: "Reduces exploration cost.",
        era: 2,
        sprite: "compass_icon.png"
    },
    302: {
        id: 302,
        name: "Gunpowder",
        description: "Allows creation of ranged explosive units.",
        era: 2,
        sprite: "gunpowder_icon.png"
    }
};
