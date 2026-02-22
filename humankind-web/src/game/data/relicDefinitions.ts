export interface RelicDefinition {
    id: string;
    name: string;
    description: string;
    sprite: string;
    color: string;
}

export const RELICS: Record<string, RelicDefinition> = {
    ancient_amulet: {
        id: 'ancient_amulet',
        name: '고대 부적',
        description: '매 스핀마다 식량 +1',
        sprite: '🏺',
        color: '#c9a63c',
    },
    wisdom_stone: {
        id: 'wisdom_stone',
        name: '지혜의 돌',
        description: '매 스핀마다 지식 +1',
        sprite: '💎',
        color: '#60a5fa',
    },
    war_horn: {
        id: 'war_horn',
        name: '전쟁의 뿔피리',
        description: '전투 심볼 공격력 +1',
        sprite: '📯',
        color: '#ef4444',
    },
};

export const RELIC_LIST = Object.values(RELICS);
