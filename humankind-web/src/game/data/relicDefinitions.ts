/**
 * gameData.yaml에서 자동 생성된 파일입니다.
 * 직접 수정하지 마세요. gameData.yaml을 수정한 뒤
 * npx tsx scripts/generate-from-yaml.ts 를 실행하세요.
 */

import { SymbolType } from './symbolDefinitions';

export interface RelicDefinition {
    id: number;
    name: string;
    description: string;
    cost: number;
    type: SymbolType;
    sprite: string; // assets/relics/ 폴더 기준 파일명
}

export const RELICS: Record<number, RelicDefinition> = {
    1: {
        id: 1,
        name: "클로비스 투창촉",
        description: "매 턴 무작위 적 유닛의 체력을 1 깎습니다.",
        cost: 30,
        type: SymbolType.NORMAL,
        sprite: "001.png",
    },
    2: {
        id: 2,
        name: "리디아의 호박금 주화",
        description: "리롤 비용이 50% 할인됩니다. 턴당 리롤은 최대 3회로 제한됩니다.",
        cost: 40,
        type: SymbolType.NORMAL,
        sprite: "002.png",
    },
    3: {
        id: 3,
        name: "우르의 전차 바퀴",
        description: "3턴 동안 매 턴 식량 생산량이 가장 낮은 심볼을 파괴하고, 파괴한 심볼 하나당 골드 10을 생산합니다.",
        cost: 40,
        type: SymbolType.NORMAL,
        sprite: "003.png",
    },
    4: {
        id: 4,
        name: "조몬 토기 조각",
        description: "매 턴 식량 1을 저장합니다. 발동 시 저장된 식량의 2배만큼 식량을 생산한 뒤 파괴됩니다.",
        cost: 35,
        type: SymbolType.NORMAL,
        sprite: "004.png",
    },
    5: {
        id: 5,
        name: "이집트 구리 톱",
        description: "채석장이 인접한 빈 슬롯마다 골드 +1",
        cost: 40,
        type: SymbolType.NORMAL,
        sprite: "005.png",
    },
    6: {
        id: 6,
        name: "바빌로니아 세계 지도",
        description: "매 턴 식량 +1 생산. 보드 마지막 (20) 자리에 배치된 심볼의 생산량이 0 이하일 경우, 이 유물의 식량 생산량이 영구적으로 1 증가.",
        cost: 60,
        type: SymbolType.NORMAL,
        sprite: "006.png",
    },
    7: {
        id: 7,
        name: "쿠크 늪지대 바나나 화석",
        description: "열대 과수원이 매 턴 인접한 바나나 당 식량 +2 생산.",
        cost: 35,
        type: SymbolType.NORMAL,
        sprite: "007.png",
    },
    8: {
        id: 8,
        name: "십계명 석판",
        description: "'석판' 심볼을 심볼 풀에 추가합니다.",
        cost: 50,
        type: SymbolType.NORMAL,
        sprite: "008.png",
    },
    9: {
        id: 9,
        name: "나일 강 비옥한 흑니",
        description: "획득 후 3턴 동안 이번 턴 보드에서 생산된 식량만큼 식량을 추가로 생산한 뒤 파괴됩니다.",
        cost: 80,
        type: SymbolType.NORMAL,
        sprite: "",
    },
    10: {
        id: 10,
        name: "괴베클리 테페 신전 석주",
        description: "빈 슬롯 하나당 매 턴 식량 1을 생산합니다.",
        cost: 45,
        type: SymbolType.NORMAL,
        sprite: "",
    },
    11: {
        id: 11,
        name: "차탈회위크 여신상",
        description: "보드에 심볼이 15개 이상이면 매 턴 식량 5를 생산합니다.",
        cost: 48,
        type: SymbolType.NORMAL,
        sprite: "",
    },
    12: {
        id: 12,
        name: "고대 이집트 쇠똥구리 부적",
        description: "심볼이 파괴될 때마다 골드 +3을 획득합니다.",
        cost: 40,
        type: SymbolType.NORMAL,
        sprite: "",
    },
    13: {
        id: 13,
        name: "고대 유물 잔해",
        description: "심볼 선택을 1회 할 수 있습니다. 클릭하여 발동합니다.",
        cost: 45,
        type: SymbolType.NORMAL,
        sprite: "",
    },
    14: {
        id: 14,
        name: "에피쿠로스의 원자론 명판",
        description: "보드에 종교 심볼이 없으면 매 턴 지식 +3.",
        cost: 50,
        type: SymbolType.NORMAL,
        sprite: "",
    },
    15: {
        id: 15,
        name: "망각의 화로",
        description: "클릭하여 발동. 보유 심볼 중 하나를 선택해 파괴합니다.",
        cost: 40,
        type: SymbolType.NORMAL,
        sprite: "",
    },
    16: {
        id: 16,
        name: "테라의 화석 포도",
        description: "자연재해 심볼이 식량 +2를 추가로 생산합니다.",
        cost: 38,
        type: SymbolType.NORMAL,
        sprite: "",
    },
    17: {
        id: 17,
        name: "안토니니아누스 은화",
        description: "심볼 선택을 건너뛰면 골드 +2.",
        cost: 42,
        type: SymbolType.NORMAL,
        sprite: "",
    },
    18: {
        id: 18,
        name: "안데스의 추뇨",
        description: "매 턴 식량 +2.",
        cost: 35,
        type: SymbolType.NORMAL,
        sprite: "",
    },
};

export const RELIC_LIST = Object.values(RELICS);
