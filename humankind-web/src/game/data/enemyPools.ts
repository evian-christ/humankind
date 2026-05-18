import { S } from './symbolDefinitions';

export const ERA_ENEMY_POOL: Record<number, readonly number[]> = {
    1: [S.enemy_warrior, S.enemy_cavalry, S.enemy_knight, S.enemy_archer, S.enemy_tracker_archer],
    2: [S.enemy_cavalry_corps, S.enemy_musketman, S.enemy_crossbowman],
    3: [S.enemy_infantry, S.enemy_cannon],
};

export function getEnemyPoolForEra(era: number): readonly number[] {
    return ERA_ENEMY_POOL[era] ?? ERA_ENEMY_POOL[1]!;
}
