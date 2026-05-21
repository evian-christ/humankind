import { S, SYMBOLS, type SymbolDefinition } from './symbolDefinitions';

type EnemySpawnEntry = {
    id: number;
    base_attack: number;
    base_hp: number;
};

type EnemySpawnProfile = {
    minLevel: number;
    enemies: readonly EnemySpawnEntry[];
};

const LEVEL_ENEMY_SPAWN_PROFILES: readonly EnemySpawnProfile[] = [
    {
        minLevel: 25,
        enemies: [
            { id: S.enemy_infantry, base_attack: 9, base_hp: 20 },
            { id: S.enemy_cannon, base_attack: 5, base_hp: 10 },
        ],
    },
    {
        minLevel: 15,
        enemies: [
            { id: S.enemy_cavalry, base_attack: 7, base_hp: 16 },
            { id: S.enemy_crossbowman, base_attack: 4, base_hp: 8 },
        ],
    },
    {
        minLevel: 5,
        enemies: [
            { id: S.enemy_warrior, base_attack: 5, base_hp: 12 },
            { id: S.enemy_archer, base_attack: 3, base_hp: 6 },
        ],
    },
    {
        minLevel: 0,
        enemies: [
            { id: S.enemy_warrior, base_attack: 3, base_hp: 8 },
            { id: S.enemy_archer, base_attack: 2, base_hp: 4 },
        ],
    },
];

const getEnemySpawnProfileForLevel = (level: number): EnemySpawnProfile =>
    LEVEL_ENEMY_SPAWN_PROFILES.find((profile) => level >= profile.minLevel)
    ?? LEVEL_ENEMY_SPAWN_PROFILES[LEVEL_ENEMY_SPAWN_PROFILES.length - 1]!;

export function getEnemyPoolForLevel(level: number): readonly number[] {
    return getEnemySpawnProfileForLevel(level).enemies.map((enemy) => enemy.id);
}

export function getEnemyDefinitionForLevel(enemyId: number, level: number): SymbolDefinition | undefined {
    const definition = SYMBOLS[enemyId];
    const entry = getEnemySpawnProfileForLevel(level).enemies.find((enemy) => enemy.id === enemyId);
    if (!definition || !entry) return definition;
    return {
        ...definition,
        base_attack: entry.base_attack,
        base_hp: entry.base_hp,
    };
}

// Keep era-based callers pinned to their era floor until they can provide player level.
export const ERA_ENEMY_POOL: Record<number, readonly number[]> = {
    1: getEnemyPoolForLevel(0),
    2: getEnemyPoolForLevel(15),
    3: getEnemyPoolForLevel(25),
};

export function getEnemyPoolForEra(era: number): readonly number[] {
    return ERA_ENEMY_POOL[era] ?? ERA_ENEMY_POOL[1]!;
}
