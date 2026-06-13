import { describe, expect, it } from 'vitest';

import { GAME_EVENTS } from '../game/data/eventDefinitions';
import { KNOWLEDGE_UPGRADES } from '../game/data/knowledgeUpgrades';
import { RELICS } from '../game/data/relicDefinitions';
import { STATUSES } from '../game/data/statusDefinitions';
import { SYMBOLS_BY_KEY } from '../game/data/symbolDefinitions';
import { t } from './index';
import { getRussianFallback } from './ruFallback';

function mojibakeChars(value: string): string[] {
    return Array.from(value.matchAll(/[\u3400-\u9fff\uf900-\ufaff\ufffd?]/g))
        .map((match) => match[0]);
}

describe('Russian localization coverage', () => {
    it('preserves untranslated English words in automatic fallback text', () => {
        const fallback = getRussianFallback(
            'symbol.test.desc',
            'Gain 3 Gold when adjacent to a Workshop.',
        );

        expect(fallback).toContain('Workshop');
        expect(fallback).toContain('\u0437\u043e\u043b\u043e\u0442\u043e');
    });

    it('preserves placeholders while translating known fallback terms', () => {
        const fallback = getRussianFallback(
            'relic.test.desc',
            'Gain {amount} Knowledge from each Archive.',
        );

        expect(fallback).toContain('{amount}');
        expect(fallback).toContain('Archive');
        expect(fallback).toContain('\u0437\u043d\u0430\u043d\u0438\u044f');
    });

    it('describes unit pool changes without implying owned units are replaced', () => {
        const descriptions = [33, 48, 55, 62]
            .map((id) => t(`knowledgeUpgrade.${id}.desc`, 'ru'));

        descriptions.forEach((description) => {
            expect(description).toContain('\u0438\u0437 \u043f\u0443\u043b\u0430 \u0432\u044b\u0431\u043e\u0440\u0430');
            expect(description).not.toMatch(/\b(Removes|adds|Replaces)\b/);
        });
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
