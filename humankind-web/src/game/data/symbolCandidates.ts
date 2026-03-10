import { SymbolType, type SymbolDefinition } from './symbolDefinitions';

/**
 * 심볼 후보 정의 (실제 게임 데이터 오염 방지용 별도 파일)
 *
 * 브레인스토밍 및 디자인된 심볼 후보들. 데이터 브라우저에서 확인하고 추후 실제 SYMBOLS에 적용하기 위한 용도.
 */
export const SYMBOL_CANDIDATES: Record<number, SymbolDefinition> = {
    // ── Medieval Candidates ──
    101: { id: 101, name: "Knight", type: SymbolType.MEDIEVAL, description: "A heavily armored combat unit. High HP and attack.", base_attack: 15, base_hp: 40, sprite: "-", tags: ["unit", "military", "melee"] },
    102: { id: 102, name: "Castle", type: SymbolType.MEDIEVAL, description: "Every spin: +20 Food, +10 Gold. Adjacent combat units gain +10 HP.", sprite: "-", tags: ["building", "military"] },
    103: { id: 103, name: "Blacksmith", type: SymbolType.MEDIEVAL, description: "Every spin: +10 Gold. Adjacent combat units gain +5 Attack.", sprite: "-", tags: ["building"] },
    104: { id: 104, name: "Monastery", type: SymbolType.MEDIEVAL, description: "Every spin: +15 Knowledge. Adjacent Religion symbols produce double.", sprite: "-", tags: ["building", "religion"] },
    105: { id: 105, name: "Windmill", type: SymbolType.MEDIEVAL, description: "Every spin: +30 Food. Adjacent Wheat and Grassland produce double.", sprite: "-", tags: ["building"] },
    106: { id: 106, name: "Plague Doctor", type: SymbolType.MEDIEVAL, description: "Every spin: +5 Knowledge. Destroys adjacent Plague or Disease symbols and gives +50 Gold.", sprite: "-", tags: ["medical", "knowledge"] },
    107: { id: 107, name: "Crossbowman", type: SymbolType.MEDIEVAL, description: "Ranged combat unit. Attacks before melee units.", base_attack: 20, base_hp: 15, sprite: "-", tags: ["unit", "military", "ranged"] },
    108: { id: 108, name: "Guild Hall", type: SymbolType.MEDIEVAL, description: "Every spin: +5 Gold for every unique profession symbol on the board.", sprite: "-", tags: ["building", "economy"] },
    109: { id: 109, name: "Jester", type: SymbolType.MEDIEVAL, description: "Every spin: acts as a copy of a random adjacent symbol.", sprite: "-", tags: ["entertainer"] },
    110: { id: 110, name: "Trebuchet", type: SymbolType.MEDIEVAL, description: "Massive siege weapon. High attack against buildings, slow to fire.", base_attack: 40, base_hp: 20, sprite: "-", tags: ["unit", "military", "siege", "ranged"] },
};
export const SYMBOL_CANDIDATE_LIST = Object.values(SYMBOL_CANDIDATES);
