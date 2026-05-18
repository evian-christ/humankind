import { describe, expect, it } from 'vitest';
import { S, SYMBOLS } from './symbolDefinitions';

const enemyUnitPairs = [
    ['warrior', S.warrior, S.enemy_warrior],
    ['cavalry', S.cavalry, S.enemy_cavalry],
    ['knight', S.knight, S.enemy_knight],
    ['cavalry corps', S.cavalry_corps, S.enemy_cavalry_corps],
    ['musketman', S.musketman, S.enemy_musketman],
    ['infantry', S.infantry, S.enemy_infantry],
    ['archer', S.archer, S.enemy_archer],
    ['tracker archer', S.tracker_archer, S.enemy_tracker_archer],
    ['crossbowman', S.crossbowman, S.enemy_crossbowman],
    ['cannon', S.cannon, S.enemy_cannon],
] as const;

const enemySpritePairs = [
    [S.enemy_warrior, '074.png'],
    [S.enemy_cavalry, '078.png'],
    [S.enemy_knight, '079.png'],
    [S.enemy_cavalry_corps, '080.png'],
    [S.enemy_musketman, '081.png'],
    [S.enemy_infantry, '082.png'],
    [S.enemy_archer, '083.png'],
    [S.enemy_tracker_archer, '084.png'],
    [S.enemy_crossbowman, '085.png'],
    [S.enemy_cannon, '086.png'],
] as const;

describe('symbolDefinitions', () => {
    it('does not include the removed barbarian camp symbol', () => {
        expect(SYMBOLS[73]).toBeUndefined();
    });

    it.each(enemyUnitPairs)('keeps enemy %s combat stats equal to the matching unit', (_name, unitId, enemyId) => {
        const unit = SYMBOLS[unitId]!;
        const enemy = SYMBOLS[enemyId]!;

        expect({
            base_attack: enemy.base_attack,
            base_hp: enemy.base_hp,
        }).toEqual({
            base_attack: unit.base_attack,
            base_hp: unit.base_hp,
        });
    });

    it.each(enemySpritePairs)('uses the expected sprite for enemy symbol %i', (enemyId, sprite) => {
        expect(SYMBOLS[enemyId]?.sprite).toBe(sprite);
    });
});
