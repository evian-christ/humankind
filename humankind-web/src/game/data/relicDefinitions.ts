/**
 * gameData.yaml에서 자동 생성된 파일입니다.
 * 직접 수정하지 마세요. gameData.yaml을 수정한 뒤
 * npx tsx scripts/generate-from-yaml.ts 를 실행하세요.
 */

import { SymbolType } from './symbolDefinitions';

export type RelicRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RelicDefinition {
    id: number;
    name: string;
    description: string;
    cost: number;
    rarity: RelicRarity;
    type: SymbolType;
    sprite: string; // assets/relics/ 폴더 기준 파일명
}

export const getRelicRarityByBaseCost = (cost: number): RelicRarity => {
    if (cost >= 50) return 'legendary';
    if (cost >= 40) return 'epic';
    if (cost >= 30) return 'rare';
    if (cost >= 20) return 'uncommon';
    return 'common';
};

export const getRelicRarityColorHex = (rarity: RelicRarity): string => {
    switch (rarity) {
        case 'common': return '#ffffff';
        case 'uncommon': return '#34d399';
        case 'rare': return '#60a5fa';
        case 'epic': return '#c084fc';
        case 'legendary': return '#f59e0b';
        default: return '#9ca3af';
    }
};

export const RELICS: Record<number, RelicDefinition> = {
    1: {
        id: 1,
        name: "클로비스 투창촉",
        description: "매 턴 무작위 적 유닛의 체력을 1 깎습니다.",
        cost: 18,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "001.png",
    },
    2: {
        id: 2,
        name: "리디아의 호박금 주화",
        description: "리롤 비용이 50% 할인됩니다. 턴당 리롤은 최대 3회로 제한됩니다.",
        cost: 32,
        rarity: "rare",
        type: SymbolType.NORMAL,
        sprite: "002.png",
    },
    3: {
        id: 3,
        name: "우르의 전차 바퀴",
        description: "3턴 동안 매 턴 식량 생산량이 가장 낮은 심볼을 파괴하고, 파괴한 심볼 하나당 골드 10을 생산합니다.",
        cost: 22,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "003.png",
    },
    4: {
        id: 4,
        name: "조몬 토기 조각",
        description: "매 턴 식량 1을 저장합니다. 발동 시 저장된 식량의 2배만큼 식량을 생산한 뒤 파괴됩니다.",
        cost: 14,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "004.png",
    },
    5: {
        id: 5,
        name: "이집트 구리 톱",
        description: "채석장이 인접한 빈 슬롯마다 골드 +1",
        cost: 22,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "005.png",
    },
    6: {
        id: 6,
        name: "바빌로니아 세계 지도",
        description: "매 턴 식량 +1 생산. 보드 마지막 (20) 자리에 배치된 심볼의 생산량이 0 이하일 경우, 이 유물의 식량 생산량이 영구적으로 1 증가.",
        cost: 28,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "006.png",
    },
    7: {
        id: 7,
        name: "쿠크 늪지대 바나나 화석",
        description: "열대 과수원이 매 턴 인접한 바나나 당 식량 +2 생산.",
        cost: 12,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "007.png",
    },
    8: {
        id: 8,
        name: "십계명 석판",
        description: "'석판' 심볼을 심볼 풀에 추가합니다.",
        cost: 30,
        rarity: "rare",
        type: SymbolType.NORMAL,
        sprite: "008.png",
    },
    9: {
        id: 9,
        name: "나일 강 비옥한 흑니",
        description: "획득 후 3턴 동안 이번 턴 보드에서 생산된 식량만큼 식량을 추가로 생산한 뒤 파괴됩니다.",
        cost: 40,
        rarity: "epic",
        type: SymbolType.NORMAL,
        sprite: "009.png",
    },
    10: {
        id: 10,
        name: "괴베클리 테페 신전 석주",
        description: "빈 슬롯 하나당 매 턴 식량 1을 생산합니다.",
        cost: 28,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "010.png",
    },
    11: {
        id: 11,
        name: "차탈회위크 여신상",
        description: "보드에 심볼이 15개 이상이면 매 턴 식량 5를 생산합니다.",
        cost: 30,
        rarity: "rare",
        type: SymbolType.NORMAL,
        sprite: "011.png",
    },
    12: {
        id: 12,
        name: "고대 이집트 쇠똥구리 부적",
        description: "이번 턴에 파괴된 심볼 하나당, 턴 종료 시 골드 3을 생산합니다.",
        cost: 22,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "012.png",
    },
    13: {
        id: 13,
        name: "고대 유물 잔해",
        description: "심볼 선택을 1회 할 수 있습니다. 클릭하여 발동합니다.",
        cost: 10,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "013.png",
    },
    14: {
        id: 14,
        name: "에피쿠로스의 원자론 명판",
        description: "보드에 종교 심볼이 없으면 매 턴 지식 +3.",
        cost: 28,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "014.png",
    },
    15: {
        id: 15,
        name: "망각의 화로",
        description: "소모하여 보드 위에 있는 심볼 1개 파괴.",
        cost: 12,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "015.png",
    },
    16: {
        id: 16,
        name: "테라의 화석 포도",
        description: "자연재해 심볼이 식량 +2를 추가로 생산합니다.",
        cost: 10,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "016.png",
    },
    17: {
        id: 17,
        name: "안토니니아누스 은화",
        description: "심볼 선택을 건너뛰면 골드 +2.",
        cost: 15,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "017.png",
    },
    18: {
        id: 18,
        name: "안데스의 추뇨",
        description: "매 턴 식량 +2.",
        cost: 15,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "018.png",
    },
    19: {
        id: 19,
        name: "고대 부족 합류",
        description: "지형 선택을 1회 합니다. 클릭하여 사용.",
        cost: 15,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "019.png",
    },
    20: {
        id: 20,
        name: "라스코 동굴 안료",
        description: "매 5턴마다 식량/골드/지식 중 무작위 1종 +5.",
        cost: 12,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    21: {
        id: 21,
        name: "빌렌도르프 비너스",
        description: "매 10턴 식량 납부 직후 다음 턴 식량 +10.",
        cost: 14,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    22: {
        id: 22,
        name: "외치의 구리 도끼",
        description: "보드에 숲이 있을 때 매 턴 골드 +1.",
        cost: 16,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    23: {
        id: 23,
        name: "세스테르티우스 동전",
        description: "골드 50 이상일 때 매 턴 지식 +1.",
        cost: 16,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    24: {
        id: 24,
        name: "트로이 황금 노획품",
        description: "1회용: 즉시 골드 +25.",
        cost: 16,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    25: {
        id: 25,
        name: "글라디우스",
        description: "적 처치 시 골드 +3.",
        cost: 18,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    26: {
        id: 26,
        name: "이슈타르 문 황소 부조",
        description: "매 턴 소/양/말 하나당 골드 +1.",
        cost: 20,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    27: {
        id: 27,
        name: "백제 금동대향로",
        description: "보드에 종교 심볼이 있을 때 매 턴 지식 +2.",
        cost: 22,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    28: {
        id: 28,
        name: "진시황 병마용",
        description: "매 턴 보유 전투 심볼 수당 골드 +2.",
        cost: 24,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    29: {
        id: 29,
        name: "사양방존 청동기",
        description: "구석 4칸 모두에 심볼 배치 시, 식량, 골드 및 지식 +1.",
        cost: 24,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    30: {
        id: 30,
        name: "모아이 석상",
        description: "매 턴 빈 슬롯 3개당 골드 +1.",
        cost: 26,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    31: {
        id: 31,
        name: "니네베의 사자 부조",
        description: "적 처치 시 골드 +8, 적이 보드에 있을 때 매 턴 지식 +2.",
        cost: 35,
        rarity: "rare",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    32: {
        id: 32,
        name: "솔로몬의 인장 반지",
        description: "1번 슬롯에 배치된 심볼의 효과 두 번 발동.",
        cost: 60,
        rarity: "legendary",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    33: {
        id: 33,
        name: "구데아의 정초 못",
        description: "모든 심볼을 구석에 있는 것으로 취급합니다.",
        cost: 24,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    34: {
        id: 34,
        name: "헤레포드 마파문디",
        description: "보드 위에 모든 유형의 지형을 보유 시 매 턴 식량 +10, 골드 +10, 지식 +10.",
        cost: 55,
        rarity: "legendary",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    35: {
        id: 35,
        name: "수메르 왕명표",
        description: "보드에 배치된 시대 심볼 1개당 매 턴 식량 +1.",
        cost: 24,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    36: {
        id: 36,
        name: "알렉산드리아 무세이온 명문",
        description: "지식 업그레이드를 연구할 때마다 골드 +3.",
        cost: 16,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    37: {
        id: 37,
        name: "이집트 곡창 모형",
        description: "1회용: 즉시 식량 +30.",
        cost: 14,
        rarity: "common",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
    38: {
        id: 38,
        name: "아슈르바니팔 색인 점토판",
        description: "보드 위에 같은 심볼이 하나도 없을 때 매 턴 식량 +5, 골드 +5.",
        cost: 26,
        rarity: "uncommon",
        type: SymbolType.NORMAL,
        sprite: "-",
    },
};

export const RELIC_LIST = Object.values(RELICS);
