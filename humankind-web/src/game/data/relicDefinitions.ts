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
    sprite: string;
}

export const RELICS: Record<number, RelicDefinition> = {
    1: {
        id: 1,
        name: "클로비스 투창촉",
        description: "야만인 등장 시, 체력이 1 깎인 채로 추가됨.",
        cost: 90,
        era: Era.ANCIENT,
        sprite: "relic_001.png",
    },
    2: {
        id: 2,
        name: "리디아의 호박금 주화",
        description: "매 스핀 리롤 비용 1골드 증가. 이 유물 획득 시 즉시 골드 +100.",
        cost: 50,
        era: Era.ANCIENT,
        sprite: "relic_002.png",
    },
    3: {
        id: 3,
        name: "우르의 전차 바퀴",
        description: "매 스핀 식량 생산량이 제일 낮은 심볼 파괴 및 골드 +5 제공. 5턴 후 제거됩니다.",
        cost: 160,
        era: Era.ANCIENT,
        sprite: "relic_003.png",
    },
    4: {
        id: 4,
        name: "조몬 토기 조각",
        description: "'토기' 심볼은 '토기' 심볼에 의해 파괴됩니다.",
        cost: 80,
        era: Era.ANCIENT,
        sprite: "relic_101.png",
    },
    5: {
        id: 5,
        name: "이집트 구리 톱",
        description: "채석장이 인접한 빈 슬롯마다 골드 +1",
        cost: 180,
        era: Era.ANCIENT,
        sprite: "relic_104.png",
    },
    6: {
        id: 6,
        name: "바빌로니아 세계 지도",
        description: "매 턴 식량 +1 생산. 보드 마지막 (20) 자리에 배치된 심볼의 생산량이 0 이하일 경우, 이 유물의 식량 생산량이 영구적으로 1 증가.",
        cost: 170,
        era: Era.ANCIENT,
        sprite: "relic_109.png",
    },
    7: {
        id: 7,
        name: "쿠크 늪지대 바나나 화석",
        description: "바나나는 한 스핀 후에 파괴됨.",
        cost: 100,
        era: Era.ANCIENT,
        sprite: "relic_106.png",
    },
};

export const RELIC_LIST = Object.values(RELICS);
