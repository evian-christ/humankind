const R = {
    effect: '\u042d\u0444\u0444\u0435\u043a\u0442',
    relic: '\u0420\u0435\u043b\u0438\u043a\u0432\u0438\u044f',
    event: '\u0421\u043e\u0431\u044b\u0442\u0438\u0435',
    status: '\u0421\u0442\u0430\u0442\u0443\u0441',
    upgrade: '\u0423\u043b\u0443\u0447\u0448\u0435\u043d\u0438\u0435',
    symbol: '\u0441\u0438\u043c\u0432\u043e\u043b',
    symbols: '\u0441\u0438\u043c\u0432\u043e\u043b\u044b',
    food: '\u0435\u0434\u0430',
    gold: '\u0437\u043e\u043b\u043e\u0442\u043e',
    knowledge: '\u0437\u043d\u0430\u043d\u0438\u044f',
    turn: '\u0445\u043e\u0434',
    turns: '\u0445\u043e\u0434\u043e\u0432',
    board: '\u043f\u043e\u043b\u0435',
    adjacent: '\u0441\u043e\u0441\u0435\u0434\u043d\u0438\u0439',
    empty: '\u043f\u0443\u0441\u0442\u0430\u044f \u043a\u043b\u0435\u0442\u043a\u0430',
    gain: '\u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c',
    gains: '\u043f\u043e\u043b\u0443\u0447\u0430\u0435\u0442',
    produces: '\u043f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0438\u0442',
    production: '\u043f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0441\u0442\u0432\u043e',
    destroy: '\u0443\u043d\u0438\u0447\u0442\u043e\u0436\u0438\u0442\u044c',
    destroyed: '\u0443\u043d\u0438\u0447\u0442\u043e\u0436\u0435\u043d',
    ifWord: '\u0435\u0441\u043b\u0438',
    when: '\u043a\u043e\u0433\u0434\u0430',
    every: '\u043a\u0430\u0436\u0434\u044b\u0435',
    each: '\u043a\u0430\u0436\u0434\u044b\u0439',
    random: '\u0441\u043b\u0443\u0447\u0430\u0439\u043d\u044b\u0439',
    chance: '\u0448\u0430\u043d\u0441',
    enemy: '\u0432\u0440\u0430\u0433',
    enemies: '\u0432\u0440\u0430\u0433\u0438',
    terrain: '\u043b\u0430\u043d\u0434\u0448\u0430\u0444\u0442',
    religion: '\u0440\u0435\u043b\u0438\u0433\u0438\u044f',
    selection: '\u0432\u044b\u0431\u043e\u0440',
    pool: '\u043f\u0443\u043b',
    unlocks: '\u043e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u0442',
    upgrades: '\u0443\u043b\u0443\u0447\u0448\u0430\u0435\u0442',
    replaces: '\u0437\u0430\u043c\u0435\u043d\u044f\u0435\u0442',
    withWord: '\u043d\u0430',
    attack: '\u0430\u0442\u0430\u043a\u0430',
    defense: '\u0437\u0430\u0449\u0438\u0442\u0430',
    hp: '\u041e\u0417',
    clan: '\u0424\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u043a\u043b\u0430\u043d\u0430',
    clanDesc: '\u0428\u0430\u043d\u0441 \u0432\u0442\u043e\u0440\u0436\u0435\u043d\u0438\u044f \u0432\u0430\u0440\u0432\u0430\u0440\u043e\u0432 \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d \u043d\u0430 0%.',
};

const NAME_FALLBACKS: Record<string, string> = {
    Wheat: '\u043f\u0448\u0435\u043d\u0438\u0446\u0430', Rice: '\u0440\u0438\u0441', Cattle: '\u0441\u043a\u043e\u0442', Sheep: '\u043e\u0432\u0446\u0430', Horse: '\u043b\u043e\u0448\u0430\u0434\u044c',
    Fish: '\u0440\u044b\u0431\u0430', Crab: '\u043a\u0440\u0430\u0431', Pearl: '\u0436\u0435\u043c\u0447\u0443\u0433', Sea: '\u043c\u043e\u0440\u0435', Seas: '\u043c\u043e\u0440\u044f',
    Grassland: '\u043b\u0443\u0433', Grasslands: '\u043b\u0443\u0433\u0430', Plains: '\u0440\u0430\u0432\u043d\u0438\u043d\u044b', Forest: '\u043b\u0435\u0441', Forests: '\u043b\u0435\u0441\u0430',
    Rainforest: '\u0442\u0440\u043e\u043f\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043b\u0435\u0441', Mountain: '\u0433\u043e\u0440\u0430', Mountains: '\u0433\u043e\u0440\u044b', Desert: '\u043f\u0443\u0441\u0442\u044b\u043d\u044f', Oasis: '\u043e\u0430\u0437\u0438\u0441',
    Stone: '\u043a\u0430\u043c\u0435\u043d\u044c', Fur: '\u043c\u0435\u0445', Deer: '\u043e\u043b\u0435\u043d\u044c', Banana: '\u0431\u0430\u043d\u0430\u043d', Date: '\u0444\u0438\u043d\u0438\u043a', Dye: '\u043a\u0440\u0430\u0441\u0438\u0442\u0435\u043b\u044c', Papyrus: '\u043f\u0430\u043f\u0438\u0440\u0443\u0441',
    Library: '\u0431\u0438\u0431\u043b\u0438\u043e\u0442\u0435\u043a\u0430', Merchant: '\u0442\u043e\u0440\u0433\u043e\u0432\u0435\u0446', Corn: '\u043a\u0443\u043a\u0443\u0440\u0443\u0437\u0430', Salt: '\u0441\u043e\u043b\u044c', Monument: '\u043c\u043e\u043d\u0443\u043c\u0435\u043d\u0442', Honey: '\u043c\u0435\u0434', Spices: '\u043f\u0440\u044f\u043d\u043e\u0441\u0442\u0438',
    Christianity: '\u0445\u0440\u0438\u0441\u0442\u0438\u0430\u043d\u0441\u0442\u0432\u043e', Islam: '\u0438\u0441\u043b\u0430\u043c', Buddhism: '\u0431\u0443\u0434\u0434\u0438\u0437\u043c', Hinduism: '\u0438\u043d\u0434\u0443\u0438\u0437\u043c',
    Warrior: '\u0432\u043e\u0438\u043d', Archer: '\u043b\u0443\u0447\u043d\u0438\u043a', Knight: '\u0440\u044b\u0446\u0430\u0440\u044c', Crossbowman: '\u0430\u0440\u0431\u0430\u043b\u0435\u0442\u0447\u0438\u043a', Cannon: '\u043f\u0443\u0448\u043a\u0430', Infantry: '\u043f\u0435\u0445\u043e\u0442\u0430',
    'AGI Core': '\u044f\u0434\u0440\u043e AGI', Pioneers: '\u043f\u0435\u0440\u0432\u043e\u043f\u0440\u043e\u0445\u043e\u0434\u0446\u044b', 'State Reorganization': '\u0433\u043e\u0441\u0443\u0434\u0430\u0440\u0441\u0442\u0432\u0435\u043d\u043d\u0430\u044f \u0440\u0435\u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f',
    'Conscription Orders': '\u043f\u0440\u0438\u043a\u0430\u0437\u044b \u043e \u043f\u0440\u0438\u0437\u044b\u0432\u0435',
    'Ancient Era': '\u0414\u0440\u0435\u0432\u043d\u044f\u044f \u044d\u043f\u043e\u0445\u0430', 'Medieval Age': '\u0421\u0440\u0435\u0434\u043d\u0435\u0432\u0435\u043a\u043e\u0432\u044c\u0435', 'Modern Age': '\u0421\u043e\u0432\u0440\u0435\u043c\u0435\u043d\u043d\u0430\u044f \u044d\u043f\u043e\u0445\u0430',
    'Writing System': '\u041f\u0438\u0441\u044c\u043c\u0435\u043d\u043d\u043e\u0441\u0442\u044c', 'Iron Working': '\u041e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0430 \u0436\u0435\u043b\u0435\u0437\u0430', Irrigation: '\u0418\u0440\u0440\u0438\u0433\u0430\u0446\u0438\u044f', Theology: '\u0422\u0435\u043e\u043b\u043e\u0433\u0438\u044f', Archery: '\u0421\u0442\u0440\u0435\u043b\u044c\u0431\u0430 \u0438\u0437 \u043b\u0443\u043a\u0430', Currency: '\u0412\u0430\u043b\u044e\u0442\u0430', Horsemanship: '\u0412\u0435\u0440\u0445\u043e\u0432\u0430\u044f \u0435\u0437\u0434\u0430',
    'Public Administration': '\u0413\u043e\u0441\u0443\u0434\u0430\u0440\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0435 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435', 'Mass Media': '\u041c\u0430\u0441\u0441\u043e\u0432\u044b\u0435 \u043c\u0435\u0434\u0438\u0430', 'Election System': '\u0418\u0437\u0431\u0438\u0440\u0430\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u0441\u0438\u0441\u0442\u0435\u043c\u0430',
    'Steam Power': '\u041f\u0430\u0440\u043e\u0432\u0430\u044f \u044d\u043d\u0435\u0440\u0433\u0438\u044f', Urbanization: '\u0423\u0440\u0431\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f', Electricity: '\u042d\u043b\u0435\u043a\u0442\u0440\u0438\u0447\u0435\u0441\u0442\u0432\u043e', 'Tropical Agriculture': '\u0422\u0440\u043e\u043f\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u0437\u0435\u043c\u043b\u0435\u0434\u0435\u043b\u0438\u0435', 'Mason Guild': '\u0413\u0438\u043b\u044c\u0434\u0438\u044f \u043a\u0430\u043c\u0435\u043d\u0449\u0438\u043a\u043e\u0432', 'Great Migration': '\u0412\u0435\u043b\u0438\u043a\u043e\u0435 \u043f\u0435\u0440\u0435\u0441\u0435\u043b\u0435\u043d\u0438\u0435',
};

const EXACT: Record<string, string> = {
    'status.clan_formation.name': R.clan,
    'status.clan_formation.desc': R.clanDesc,
    'knowledgeUpgrade.66.desc': '\u0412 \u0444\u0430\u0437\u0435 \u0432\u044b\u0431\u043e\u0440\u0430 \u0448\u0430\u043d\u0441 \u043a\u0430\u0436\u0434\u043e\u0439 \u043a\u0430\u0440\u0442\u044b \u0441\u0442\u0430\u0442\u044c \u0441\u043e\u0431\u044b\u0442\u0438\u0435\u043c \u0443\u0434\u0432\u0430\u0438\u0432\u0430\u0435\u0442\u0441\u044f.',
    'knowledgeUpgrade.67.desc': '\u0412 \u0444\u0430\u0437\u0435 \u0432\u044b\u0431\u043e\u0440\u0430 \u0448\u0430\u043d\u0441 \u043a\u0430\u0436\u0434\u043e\u0439 \u043a\u0430\u0440\u0442\u044b \u0441\u0442\u0430\u0442\u044c \u0441\u043e\u0431\u044b\u0442\u0438\u0435\u043c \u0443\u0434\u0432\u0430\u0438\u0432\u0430\u0435\u0442\u0441\u044f.',
    'knowledgeUpgrade.68.desc': '\u041f\u0435\u0440\u0432\u044b\u0439 \u043f\u0435\u0440\u0435\u0431\u0440\u043e\u0441 \u0432 \u043a\u0430\u0436\u0434\u043e\u0439 \u0444\u0430\u0437\u0435 \u0432\u044b\u0431\u043e\u0440\u0430 \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439.',
};

function protectPlaceholders(value: string): [string, string[]] {
    const placeholders: string[] = [];
    const text = value.replace(/\{[A-Za-z0-9_]+\}/g, (match) => {
        const token = '__PLACEHOLDER_' + placeholders.length + '__';
        placeholders.push(match);
        return token;
    });
    return [text, placeholders];
}

function restorePlaceholders(value: string, placeholders: string[]): string {
    return placeholders.reduce((text, placeholder, index) => text.replace('__PLACEHOLDER_' + index + '__', placeholder), value);
}

function translateResources(value: string): string {
    return value
        .replace(/Food/g, R.food)
        .replace(/Gold/g, R.gold)
        .replace(/Knowledge/g, R.knowledge)
        .replace(/HP/g, R.hp)
        .replace(/Attack/g, R.attack)
        .replace(/Defense/g, R.defense);
}

function translateCommon(value: string): string {
    let text = translateResources(value);
    const replacements: Array<[RegExp, string]> = [
        [/Each turn/g, R.each + ' ' + R.turn], [/Every/g, R.every], [/every/g, R.every], [/turns/g, R.turns], [/turn/g, R.turn],
        [/per/g, '\u0437\u0430'], [/Adjacent to/g, R.adjacent + ' \u043a'], [/adjacent/g, R.adjacent], [/on the board/g, '\u043d\u0430 ' + R.board], [/board/g, R.board],
        [/empty slots/g, R.empty + '\u0438'], [/empty slot/g, R.empty], [/random/g, R.random], [/chance/g, R.chance], [/produces/g, R.produces], [/produce/g, R.produces], [/production/g, R.production],
        [/Gain/g, R.gain], [/gain/g, R.gain], [/gains/g, R.gains], [/Destroy/g, R.destroy], [/destroyed/g, R.destroyed], [/destroy/g, R.destroy],
        [/([0-9]+) or more/g, '$1 \u0438\u043b\u0438 \u0431\u043e\u043b\u044c\u0448\u0435'], [/or more/g, '\u0438\u043b\u0438 \u0431\u043e\u043b\u044c\u0448\u0435'], [/the only terrain/g, '\u0435\u0434\u0438\u043d\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439 ' + R.terrain], [/are placed/g, '\u0440\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u044b'], [/is placed/g, '\u0440\u0430\u0437\u043c\u0435\u0449\u0435\u043d'], [/placed/g, '\u0440\u0430\u0437\u043c\u0435\u0449\u0435\u043d'],
        [/If/g, R.ifWord], [/if/g, R.ifWord], [/When/g, R.when], [/when/g, R.when], [/Enemy/g, R.enemy], [/enemy/g, R.enemy], [/Terrain/g, R.terrain], [/terrain/g, R.terrain], [/Religion/g, R.religion],
        [/selection/g, R.selection], [/pool/g, R.pool], [/Unlocks/g, R.unlocks], [/Upgrades/g, R.upgrades], [/Replaces/g, R.replaces], [/\bwith\b/g, R.withWord], [/\band\b/g, '\u0438'], [/\bor\b/g, '\u0438\u043b\u0438'],
    ];
    replacements.forEach(([pattern, replacement]) => { text = text.replace(pattern, replacement); });
    Object.entries(NAME_FALLBACKS).sort((a, b) => b[0].length - a[0].length).forEach(([english, russian]) => {
        text = text.replace(new RegExp('\\b' + escapeRegExp(english) + '\\b', 'g'), russian);
    });
    return text;
}

function sanitize(value: string): string {
    const [protectedText, placeholders] = protectPlaceholders(value);
    let text = translateCommon(protectedText);
    text = text.replace(/\bx([0-9])\b/g, '\u00d7$1');
    text = restorePlaceholders(text, placeholders);
    return text.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fallbackName(key: string, english: string): string {
    const translated = NAME_FALLBACKS[english];
    if (translated != null) return translated;
    if (key.startsWith('relic.')) return R.relic;
    if (key.startsWith('event.')) return R.event;
    if (key.startsWith('status.')) return R.status;
    return R.upgrade;
}

function fallbackDescription(english: string): string {
    const text = sanitize(english);
    return text.length > 0 ? text : R.effect;
}

export function getRussianFallback(key: string, english?: string): string | null {
    const exact = EXACT[key];
    if (exact != null) return exact;
    if (english == null) {
        if (key.startsWith('event.') && key.endsWith('.desc')) return R.event + ': ' + R.effect;
        return null;
    }
    if (key.endsWith('.name')) return fallbackName(key, english);
    return fallbackDescription(english);
}
