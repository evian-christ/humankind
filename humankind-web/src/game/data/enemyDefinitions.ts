import { SymbolType, Sym, type SymbolDefinition } from './symbolDefinitions';

/**
 * 적 유닛 정의 테이블
 *
 * 아군(COMBAT) 버전과 동일한 이름을 사용해 설정합니다.
 */
export const ENEMIES: Record<number, SymbolDefinition> = {
    [Sym.warrior.id]: {
        ...Sym.warrior,
        name: Sym.warrior.name,
        type: SymbolType.ENEMY,
        description: "Enemy Warrior. Assigned a random penalty on spawn.",
        sprite: "036.png",
    },
};

export const ENEMY_LIST = Object.values(ENEMIES);
