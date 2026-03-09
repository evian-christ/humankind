/**
 * gameData.yaml에서 자동 생성된 파일입니다.
 * 직접 수정하지 마세요. gameData.yaml을 수정한 뒤
 * npx tsx scripts/generate-from-yaml.ts 를 실행하세요.
 */

import { Era } from './symbolDefinitions';

export interface RelicDefinition {
    id: number;
    name: string;
    description: string;
    cost: number;
    era: Era;
    sprite: string; // assets/relics/ 폴더 기준 파일명
}

export const RELICS: Record<number, RelicDefinition> = {
    1: {
        id: 1,
        name: "클로비스 투창촉",
        description: "야만인 등장 시, 체력이 1 깎인 채로 추가됨.",
        cost: 300,
        era: Era.ANCIENT,
        sprite: "001.png",
    },
    2: {
        id: 2,
        name: "리디아의 호박금 주화",
        description: "리롤 비용이 50% 할인됩니다. 턴당 리롤은 최대 3회로 제한됩니다.",
        cost: 400,
        era: Era.ANCIENT,
        sprite: "002.png",
    },
    3: {
        id: 3,
        name: "우르의 전차 바퀴",
        description: "매 스핀 식량 생산량이 제일 낮은 심볼 파괴 및 골드 +50 제공. 5턴 후 제거됩니다.",
        cost: 400,
        era: Era.ANCIENT,
        sprite: "003.png",
    },
    4: {
        id: 4,
        name: "조몬 토기 조각",
        description: "'토기' 심볼은 인접한 '토기'를 파괴합니다.",
        cost: 350,
        era: Era.ANCIENT,
        sprite: "004.png",
    },
    5: {
        id: 5,
        name: "이집트 구리 톱",
        description: "채석장이 인접한 빈 슬롯마다 골드 +10",
        cost: 400,
        era: Era.ANCIENT,
        sprite: "005.png",
    },
    6: {
        id: 6,
        name: "바빌로니아 세계 지도",
        description: "매 턴 식량 +10 생산. 보드 마지막 (20) 자리에 배치된 심볼의 생산량이 0 이하일 경우, 이 유물의 식량 생산량이 영구적으로 10 증가.",
        cost: 600,
        era: Era.ANCIENT,
        sprite: "006.png",
    },
    7: {
        id: 7,
        name: "쿠크 늪지대 바나나 화석",
        description: "열대 과수원이 매 스핀 인접한 바나나 당 식량 +20 생산.",
        cost: 350,
        era: Era.ANCIENT,
        sprite: "007.png",
    },
    8: {
        id: 8,
        name: "십계명 석판",
        description: "'석판' 심볼을 심볼 풀에 추가합니다.",
        cost: 500,
        era: Era.ANCIENT,
        sprite: "008.png",
    },
    9: {
        id: 9,
        name: "나일 강 비옥한 흑니",
        description: "획득 후 다음 5스핀 동안 모든 식량 획득량 2배 (이후 소멸).",
        cost: 800,
        era: Era.ANCIENT,
        sprite: "",
    },
    10: {
        id: 10,
        name: "괴베클리 테페 신전 석주",
        description: "빈 슬롯 하나당 매 턴 식량 +5 생산.",
        cost: 450,
        era: Era.ANCIENT,
        sprite: "",
    },
    11: {
        id: 11,
        name: "차탈회위크 여신상",
        description: "보드에 심볼이 15개 이상일 때, 매 턴 식량 +80을 추가로 생산합니다.",
        cost: 480,
        era: Era.ANCIENT,
        sprite: "",
    },
    12: {
        id: 12,
        name: "고대 이집트 쇠똥구리 부적",
        description: "심볼이 파괴될 때마다 골드 +30을 획득합니다.",
        cost: 400,
        era: Era.ANCIENT,
        sprite: "",
    },
};

export const RELIC_LIST = Object.values(RELICS);
