import { SymbolType, type SymbolDefinition } from './symbolDefinitions';

/**
 * 심볼 후보 정의 (실제 게임 데이터 오염 방지용 별도 파일)
 *
 * 브레인스토밍 및 디자인된 심볼 후보들. 데이터 브라우저에서 확인하고 추후 실제 SYMBOLS에 적용하기 위한 용도.
 */
export const SYMBOL_CANDIDATES: Record<number, SymbolDefinition> = {
    // ── Natural Disaster Candidates ──
    101: { id: 101, name: "Flood",         type: SymbolType.DISASTER, description: "Destroys all adjacent terrain symbols. Adds 1 River symbol per destroyed terrain.", sprite: "-" },
    102: { id: 102, name: "Volcano",       type: SymbolType.DISASTER, description: "Destroys 2 random adjacent symbols; on destroy: permanently adds Mountain to collection.", sprite: "-" },
    103: { id: 103, name: "Earthquake",    type: SymbolType.DISASTER, description: "Every turn: -10 Food. On destroy: gives +300 Food.", sprite: "-" },
    104: { id: 104, name: "Locust Swarm",  type: SymbolType.DISASTER, description: "Every turn: adjacent crop symbols produce -50% Food. 5 turns: destroyed.", sprite: "-" },
    105: { id: 105, name: "Drought",       type: SymbolType.DISASTER, description: "Adjacent Grassland and Plains produce 0 Food. On destroy: all Grassland and Plains produce double for 3 turns.", sprite: "-" },
    106: { id: 106, name: "Blizzard",      type: SymbolType.DISASTER, description: "Every spin: -20 Food. Adjacent symbols produce half. 4 turns: destroyed.", sprite: "-" },
    107: { id: 107, name: "Wildfire",      type: SymbolType.DISASTER, description: "Every turn: destroys 1 random adjacent Forest or Rainforest; on empty: destroyed.", sprite: "-" },
    108: { id: 108, name: "Tsunami",       type: SymbolType.DISASTER, description: "Instantly destroys all adjacent symbols. On destroy: adds 1 Sea symbol.", sprite: "-" },
    109: { id: 109, name: "Famine",        type: SymbolType.DISASTER, description: "Every spin: -30 Food. Each adjacent symbol loses -5 Food production permanently. 6 turns: destroyed.", sprite: "-" },
    110: { id: 110, name: "Meteor Strike", type: SymbolType.DISASTER, description: "Instantly destroys all 8 adjacent symbols. On destroy: adds Crater terrain (produces +5 Knowledge).", sprite: "-" },
};
export const SYMBOL_CANDIDATE_LIST = Object.values(SYMBOL_CANDIDATES);
