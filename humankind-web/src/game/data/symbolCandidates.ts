import { Era, SymbolType, type SymbolDefinition } from './symbolDefinitions';

/**
 * 심볼 후보 정의 (실제 게임 데이터 오염 방지용 별도 파일)
 *
 * 브레인스토밍 및 디자인된 심볼 후보들. 데이터 브라우저에서 확인하고 추후 실제 SYMBOLS에 적용하기 위한 용도.
 */
export const SYMBOL_CANDIDATES: Record<number, SymbolDefinition> = {
    // ── Medieval Candidates ──
    101: { id: 101, name: "Knight", era: Era.MEDIEVAL, symbol_type: SymbolType.COMBAT, description: "A heavily armored combat unit. High HP and attack.", base_attack: 15, base_hp: 40, sprite: "101.png", tags: ["unit", "military"] },
    102: { id: 102, name: "Castle", era: Era.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +20 Food, +10 Gold. Adjacent combat units gain +10 HP.", sprite: "102.png", tags: ["building", "military"] },
    103: { id: 103, name: "Blacksmith", era: Era.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +10 Gold. Adjacent combat units gain +5 Attack.", sprite: "103.png", tags: ["building"] },
    104: { id: 104, name: "Monastery", era: Era.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +15 Knowledge. Adjacent Religion symbols produce double.", sprite: "104.png", tags: ["building", "religion"] },
    105: { id: 105, name: "Windmill", era: Era.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +30 Food. Adjacent Wheat and Farm produce double.", sprite: "105.png", tags: ["building", "food"] },
    106: { id: 106, name: "Plague Doctor", era: Era.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +5 Knowledge. Destroys adjacent Plague or Disease symbols and gives +50 Gold.", sprite: "106.png", tags: ["medical", "knowledge"] },
    107: { id: 107, name: "Crossbowman", era: Era.MEDIEVAL, symbol_type: SymbolType.COMBAT, description: "Ranged combat unit. Attacks before melee units.", base_attack: 20, base_hp: 15, sprite: "107.png", tags: ["unit", "military"] },
    108: { id: 108, name: "Guild Hall", era: Era.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: +5 Gold for every unique profession symbol on the board.", sprite: "108.png", tags: ["building", "economy"] },
    109: { id: 109, name: "Jester", era: Era.MEDIEVAL, symbol_type: SymbolType.FRIENDLY, description: "Every spin: acts as a copy of a random adjacent symbol.", sprite: "109.png", tags: ["entertainer"] },
    110: { id: 110, name: "Trebuchet", era: Era.MEDIEVAL, symbol_type: SymbolType.COMBAT, description: "Massive siege weapon. High attack against buildings, slow to fire.", base_attack: 40, base_hp: 20, sprite: "110.png", tags: ["unit", "military", "siege"] },
};
export const SYMBOL_CANDIDATE_LIST = Object.values(SYMBOL_CANDIDATES);
