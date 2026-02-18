export interface EventSymbolDefinition {
    id: string;
    name: string;
    description: string;
    sprite: string;
    counter: number; // 기본 카운터값 (발동까지 남은 스핀 수)
}

export const EVENT_SYMBOLS: EventSymbolDefinition[] = [
    {
        id: 'flood',
        name: 'Flood',
        description: 'A devastating flood sweeps the land.',
        sprite: '',
        counter: 4,
    },
    {
        id: 'barbarian_raid',
        name: 'Barbarian Raid',
        description: 'Barbarian raiders approach your borders.',
        sprite: '',
        counter: 5,
    },
    {
        id: 'bountiful_harvest',
        name: 'Bountiful Harvest',
        description: 'The harvest is plentiful this season.',
        sprite: '',
        counter: 3,
    },
];
