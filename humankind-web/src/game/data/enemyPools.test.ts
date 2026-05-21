import { describe, expect, it } from 'vitest';
import { S } from './symbolDefinitions';
import { getEnemyDefinitionForLevel, getEnemyPoolForLevel } from './enemyPools';

describe('level enemy spawn profiles', () => {
    it.each([
        [0, [S.enemy_warrior, S.enemy_archer], [[3, 8], [2, 4]]],
        [4, [S.enemy_warrior, S.enemy_archer], [[3, 8], [2, 4]]],
        [5, [S.enemy_warrior, S.enemy_archer], [[5, 12], [3, 6]]],
        [14, [S.enemy_warrior, S.enemy_archer], [[5, 12], [3, 6]]],
        [15, [S.enemy_cavalry, S.enemy_crossbowman], [[7, 16], [4, 8]]],
        [24, [S.enemy_cavalry, S.enemy_crossbowman], [[7, 16], [4, 8]]],
        [25, [S.enemy_infantry, S.enemy_cannon], [[9, 20], [5, 10]]],
    ])('uses the level %i enemy pool and stats', (level, ids, stats) => {
        expect(getEnemyPoolForLevel(level)).toEqual(ids);
        expect(ids.map((id) => {
            const definition = getEnemyDefinitionForLevel(id, level);
            return [definition?.base_attack, definition?.base_hp];
        })).toEqual(stats);
    });
});
