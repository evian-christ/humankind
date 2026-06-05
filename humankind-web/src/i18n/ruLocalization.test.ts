import { describe, expect, it } from 'vitest';

import { GAME_EVENTS } from '../game/data/eventDefinitions';
import { KNOWLEDGE_UPGRADES } from '../game/data/knowledgeUpgrades';
import { RELICS } from '../game/data/relicDefinitions';
import { STATUSES } from '../game/data/statusDefinitions';
import { SYMBOLS_BY_KEY } from '../game/data/symbolDefinitions';
import { t } from './index';

const allowedLatinWords = new Set([
    'AGI',
    'HP',
    'Lv',
]);

function latinWords(value: string): string[] {
    return Array.from(value.replace(/\{[A-Za-z0-9_]+\}/g, '').matchAll(/[A-Za-z][A-Za-z']*/g))
        .map((match) => match[0])
        .filter((word) => !allowedLatinWords.has(word));
}

function mojibakeChars(value: string): string[] {
    return Array.from(value.matchAll(/[\u3400-\u9fff\uf900-\ufaff\ufffd?]/g))
        .map((match) => match[0]);
}

describe('Russian localization coverage', () => {
    it('does not leave English words in gameplay names and effect text', () => {
        const keys = [
            ...Object.keys(SYMBOLS_BY_KEY).flatMap((key) => [
                `symbol.${key}.name`,
                `symbol.${key}.desc`,
            ]),
            ...Object.keys(RELICS).flatMap((id) => [
                `relic.${id}.name`,
                `relic.${id}.desc`,
            ]),
            ...Object.keys(KNOWLEDGE_UPGRADES).flatMap((id) => [
                `knowledgeUpgrade.${id}.name`,
                `knowledgeUpgrade.${id}.desc`,
            ]),
            ...Object.values(GAME_EVENTS).flatMap((event) => [
                `event.${event.key}.name`,
                `event.${event.key}.desc`,
                `event.${event.key}.availability`,
            ]),
            ...Object.values(STATUSES).flatMap((status) => [
                `status.${status.key}.name`,
                `status.${status.key}.desc`,
            ]),
        ];

        const failures = keys
            .map((key) => ({ key, value: t(key, 'ru') }))
            .map(({ key, value }) => ({ key, value, words: latinWords(value) }))
            .filter(({ words }) => words.length > 0);

        expect(failures).toEqual([]);
    });

    it('does not emit mojibake characters in Russian gameplay text', () => {
        const keys = [
            ...Object.keys(SYMBOLS_BY_KEY).flatMap((key) => [
                `symbol.${key}.name`,
                `symbol.${key}.desc`,
            ]),
            ...Object.keys(RELICS).flatMap((id) => [
                `relic.${id}.name`,
                `relic.${id}.desc`,
            ]),
            ...Object.keys(KNOWLEDGE_UPGRADES).flatMap((id) => [
                `knowledgeUpgrade.${id}.name`,
                `knowledgeUpgrade.${id}.desc`,
            ]),
            ...Object.values(GAME_EVENTS).flatMap((event) => [
                `event.${event.key}.name`,
                `event.${event.key}.desc`,
                `event.${event.key}.availability`,
            ]),
            ...Object.values(STATUSES).flatMap((status) => [
                `status.${status.key}.name`,
                `status.${status.key}.desc`,
            ]),
        ];

        const failures = keys
            .map((key) => ({ key, value: t(key, 'ru') }))
            .map(({ key, value }) => ({ key, value, chars: mojibakeChars(value) }))
            .filter(({ chars }) => chars.length > 0);

        expect(failures).toEqual([]);
    });
});
