/**
 * 유물 후보 정의 (실제 게임 데이터 오염 방지용 별도 파일)
 *
 * 역사적 유물들 — 게임 내에서 특수 효과를 가진 아이템으로 등장.
 * 효과는 게임 밸런스 기준이며 실제 역사적 고증과는 무관합니다.
 */

import { Era } from './symbolDefinitions';

export interface RelicCandidate {
    id: number;
    name: string;
    description: string;
    cost: number; // 골드 기준 구입/획득 비용
    era: Era;
    /** 효과 유형: passive(매 스핀), on_acquire(획득 시 1회), conditional(조건부) */
    effect_type: 'passive' | 'on_acquire' | 'conditional';
    sprite: string;
}

export const RELIC_CANDIDATES: Record<number, RelicCandidate> = {

    102: {
        id: 102,
        name: "수메르 점토 낫",
        description: "'밀', '쌀' 파괴 시 해당 스핀에 골드 +3 추가 제공.",
        cost: 150,
        era: Era.ANCIENT,
        effect_type: 'conditional',
        sprite: "relic_102.png",
    },
    103: {
        id: 103,
        name: "가나안의 번제물",
        description: "획득 시 즉시 식량 +50. 매 스핀 빈 슬롯마다 식량 -1.",
        cost: 120,
        era: Era.ANCIENT,
        effect_type: 'passive',
        sprite: "relic_103.png",
    },

    105: {
        id: 105,
        name: "페트라의 저수조",
        description: "10스핀마다 보드 내 임의의 빈 공간에 '오아시스' 심볼 1개 생성.",
        cost: 250,
        era: Era.ANCIENT,
        effect_type: 'conditional',
        sprite: "relic_105.png",
    },

    107: {
        id: 107,
        name: "예리코의 점토 두개골",
        description: "'제단', '기념비' 심볼이 매 스핀 지식 +2 추가 생산.",
        cost: 200,
        era: Era.ANCIENT,
        effect_type: 'passive',
        sprite: "relic_107.png",
    },



    111: {
        id: 111,
        name: "괴베클리 테페의 짐승 뼈",
        description: "'목장' 근처에 있는 동물 심볼이 5% 확률로 잭팟(식량 +15) 터뜨림.",
        cost: 210,
        era: Era.ANCIENT,
        effect_type: 'conditional',
        sprite: "relic_111.png",
    },
    112: {
        id: 112,
        name: "길가메시 서사시 토판",
        description: "종교 심볼 계열로 인한 '식량 페널티(-)'를 0으로 무효화.",
        cost: 300,
        era: Era.ANCIENT,
        effect_type: 'passive',
        sprite: "relic_112.png",
    },

    114: {
        id: 114,
        name: "나투프의 야생밀 씨앗",
        description: "매 스핀 1% 확률로 아주 희귀한 심볼 무료 획득 (20스핀 후에는 확정 생성 및 유물 소멸).",
        cost: 280,
        era: Era.ANCIENT,
        effect_type: 'conditional',
        sprite: "relic_114.png",
    },
    115: {
        id: 115,
        name: "막달레니안 뼈 낚싯바늘",
        description: "매 스핀마다 '물고기' 심볼이 골드 +1 생산 기능을 얻음.",
        cost: 140,
        era: Era.ANCIENT,
        effect_type: 'passive',
        sprite: "relic_115.png",
    },
    116: {
        id: 116,
        name: "카르멜 산의 화덕 재",
        description: "'모닥불' 파괴 시 그 자리에 항상 무작위 작물 심볼(밀, 쌀 등)이 보강됨.",
        cost: 90,
        era: Era.ANCIENT,
        effect_type: 'conditional',
        sprite: "relic_116.png",
    },
    117: {
        id: 117,
        name: "시기르 목조상 부분",
        description: "'부족 마을' 파괴 시 등장하는 보상 심볼 갯수가 2개에서 4개로 2배 증가.",
        cost: 190,
        era: Era.ANCIENT,
        effect_type: 'conditional',
        sprite: "relic_117.png",
    },
    118: {
        id: 118,
        name: "틴타젤의 수정 조약돌",
        description: "아무 효과가 없음. 단, 100스핀을 보유하면 '찬란한 보석'으로 변환됨.",
        cost: 10,
        era: Era.ANCIENT,
        effect_type: 'passive',
        sprite: "relic_118.png",
    },
    119: {
        id: 119,
        name: "가라만테스 안뜰 수로",
        description: "'오아시스' 인접 빈 칸당 보너스가 1로 감소하지만, 오아시스 자체 식량 생산량은 +5 증가.",
        cost: 130,
        era: Era.ANCIENT,
        effect_type: 'passive',
        sprite: "relic_119.png",
    },
    120: {
        id: 120,
        name: "나일 강 비옥한 흑니",
        description: "획득 후 다음 5스핀 동안 모든 식량 획득량 2배 (이후 소멸).",
        cost: 350,
        era: Era.ANCIENT,
        effect_type: 'on_acquire',
        sprite: "relic_120.png",
    },
};

export const RELIC_CANDIDATE_LIST = Object.values(RELIC_CANDIDATES);
