import { Era, SymbolType, type SymbolDefinition } from './symbolDefinitions';

/**
 * 적 유닛 정의 테이블
 * 
 * 아군(COMBAT) 버전과 동일한 이름을 사용하되, symbol_type을 ENEMY로 설정합니다.
 * 이를 통해 동일한 유닛 타입에 대해 아군/적군 버전을 쉽게 관리할 수 있습니다.
 */
export const ENEMIES: Record<number, SymbolDefinition> = {
    36: {
        id: 36,
        name: "Warrior",
        era: Era.ANCIENT,
        symbol_type: SymbolType.ENEMY,
        description: "Enemy Warrior. Assigned a random penalty on spawn.",
        base_attack: 5,
        base_hp: 10,
        sprite: "036.png",
        tags: ["unit"]
    },
};

export const ENEMY_LIST = Object.values(ENEMIES);
