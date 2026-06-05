import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore, type GameEventLogEntry, type GameEventLogKind } from '../game/state/gameStore';
import { useSettingsStore, type Language } from '../game/state/settingsStore';
import { SYMBOLS } from '../game/data/symbolDefinitions';
import { RELICS } from '../game/data/relicDefinitions';
import { GAME_EVENTS } from '../game/data/eventDefinitions';
import { KNOWLEDGE_UPGRADES } from '../game/data/knowledgeUpgrades';
import { getSymbolSpriteUrl } from '../game/data/symbolSpritePaths';
import { t } from '../i18n';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { FOOD_RESOURCE_ICON_URL, GOLD_RESOURCE_ICON_URL, KNOWLEDGE_RESOURCE_ICON_URL } from '../uiAssetUrls';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

const C_FOOD = '#4ade80';
const C_GOLD = '#fbbf24';
const C_KNOW = '#60a5fa';
const C_BAD = '#fb7185';

type HistoryFilter = 'all' | 'resources' | 'choices' | 'symbol' | 'relic' | 'combat' | 'threat' | 'growth' | 'shop' | 'board';

const FILTERS: Array<{ id: HistoryFilter; ko: string; en: string }> = [
    { id: 'all', ko: '전체', en: 'All' },
    { id: 'resources', ko: '자원 변화', en: 'Resources' },
    { id: 'choices', ko: '내 선택', en: 'Choices' },
    { id: 'symbol', ko: '심볼', en: 'Symbols' },
    { id: 'relic', ko: '유물', en: 'Relics' },
    { id: 'combat', ko: '전투', en: 'Combat' },
    { id: 'threat', ko: '위협', en: 'Threats' },
    { id: 'growth', ko: '연구', en: 'Research' },
    { id: 'shop', ko: '상점', en: 'Shop' },
    { id: 'board', ko: '보드 변화', en: 'Board' },
];

const KIND_COLORS: Record<GameEventLogKind, string> = {
    turn_start: '#8fb4d9',
    processing_start: '#7fb8a1',
    symbol_effect: '#9ca3af',
    processing_end: '#8aa78f',
    turn_end: '#7894bd',
    combat: '#ff4b4b',
    relic: '#a855f7',
    selection: '#4b5563',
    research: '#3b82f6',
    shop: '#ffd400',
    threat: '#9f4a3a',
    board_action: '#82b994',
    system: '#aeb6bf',
};

const KIND_LABELS: Record<GameEventLogKind, { ko: string; en: string }> = {
    turn_start: { ko: '턴 시작', en: 'Turn' },
    processing_start: { ko: '처리 시작', en: 'Start' },
    symbol_effect: { ko: '심볼 효과', en: 'Symbol' },
    processing_end: { ko: '처리 완료', en: 'Finish' },
    turn_end: { ko: '턴 종료', en: 'End' },
    combat: { ko: '전투', en: 'Combat' },
    relic: { ko: '유물', en: 'Relic' },
    selection: { ko: '선택', en: 'Choice' },
    research: { ko: '연구', en: 'Research' },
    shop: { ko: '상점', en: 'Shop' },
    threat: { ko: '위협', en: 'Threat' },
    board_action: { ko: '보드', en: 'Board' },
    system: { ko: '시스템', en: 'System' },
};

const slotToIndex = (slot?: { x: number; y: number }) => {
    if (!slot) return null;
    return slot.y * 5 + slot.x + 1;
};

const slotLabel = (slot?: { x: number; y: number }, language?: Language) => {
    const idx = slotToIndex(slot);
    if (!idx) return '';
    return language === 'ko' ? `${idx}번 칸` : `S${String(idx).padStart(2, '0')}`;
};

const RU_TEXT: Record<string, string> = {
    All: 'Все',
    Resources: 'Ресурсы',
    Choices: 'Выбор',
    Symbols: 'Символы',
    Relics: 'Реликвии',
    Combat: 'Бой',
    Threats: 'Угрозы',
    Research: 'Исследования',
    Shop: 'Лавка',
    Board: 'Поле',
    Turn: 'Ход',
    Start: 'Старт',
    Symbol: 'Символ',
    Finish: 'Финиш',
    End: 'Конец',
    Relic: 'Реликвия',
    Choice: 'Выбор',
    Threat: 'Угроза',
    System: 'Система',
    'Destroyed symbols': 'Уничтоженные символы',
    'Spawned threats': 'Появившиеся угрозы',
    'Added symbols': 'Добавленные символы',
    'Threat appeared': 'Появилась угроза',
    'Rerolled choices': 'Варианты переброшены',
    'Skipped symbol choice': 'Выбор символа пропущен',
    'Player action': 'Действие игрока',
    'Shop action': 'Действие лавки',
    'Relic event': 'Событие реликвии',
    'Symbols destroyed': 'Символы уничтожены',
    'Opened loot': 'Добыча открыта',
    'Loot reward': 'Награда добычи',
    'System event': 'Системное событие',
    'No extra change': 'Нет дополнительных изменений',
    'Turn history': 'История ходов',
    'No history matches the current view.': 'Нет записей для текущего вида.',
    Close: 'Закрыть',
};

const text = (language: Language, ko: string, en: string, ru?: string) =>
    language === 'ko' ? ko : language === 'ru' ? (ru ?? RU_TEXT[en] ?? en) : en;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value != null && !Array.isArray(value);

const asNumber = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

const asString = (value: unknown): string | null =>
    typeof value === 'string' ? value : null;

const symbolName = (symbolId: number | null | undefined, language: Language) => {
    if (symbolId == null) return '';
    const key = SYMBOLS[symbolId]?.key;
    return key ? t(`symbol.${key}.name`, language) : `Symbol ${symbolId}`;
};

const relicName = (relicId: number | null | undefined, language: Language) => {
    if (relicId == null) return '';
    const translated = t(`relic.${relicId}.name`, language);
    if (translated !== `relic.${relicId}.name`) return translated;
    return RELICS[relicId]?.name ?? `Relic ${relicId}`;
};

const eventName = (eventId: number | null | undefined, language: Language) => {
    if (eventId == null) return '';
    const event = GAME_EVENTS[eventId];
    if (!event) return `Event ${eventId}`;
    return t(`event.${event.key}.name`, language);
};

const upgradeName = (upgradeId: number | null | undefined, language: Language) => {
    if (upgradeId == null) return '';
    return t(`knowledgeUpgrade.${upgradeId}.name`, language) || KNOWLEDGE_UPGRADES[upgradeId]?.name || `Upgrade ${upgradeId}`;
};

const formatAction = (action: string | null) =>
    (action ?? '')
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

const summarizeGenerated = (ids: unknown, language: Language) => {
    if (!Array.isArray(ids) || ids.length === 0) return '';
    return ids
        .map((id) => symbolName(asNumber(id), language))
        .filter(Boolean)
        .join(', ');
};

type DestroyedSymbolSnapshot = { id: number; x?: number; y?: number };

const getDestroyedSymbols = (entry: GameEventLogEntry): DestroyedSymbolSnapshot[] => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    const raw = meta.destroyedSymbols;
    if (!Array.isArray(raw)) return [];

    return raw.flatMap((item) => {
        if (!isRecord(item)) return [];
        const id = asNumber(item.id);
        if (id == null) return [];
        const x = asNumber(item.x);
        const y = asNumber(item.y);
        return [{ id, ...(x == null ? {} : { x }), ...(y == null ? {} : { y }) }];
    });
};

const getThreatSymbols = (entry: GameEventLogEntry): DestroyedSymbolSnapshot[] => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    const raw = meta.threatSymbols;
    if (!Array.isArray(raw)) return [];

    return raw.flatMap((item) => {
        if (!isRecord(item)) return [];
        const id = asNumber(item.id);
        if (id == null) return [];
        const x = asNumber(item.x);
        const y = asNumber(item.y);
        return [{ id, ...(x == null ? {} : { x }), ...(y == null ? {} : { y }) }];
    });
};

const getAddedSymbolIds = (entry: GameEventLogEntry): number[] => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    const ids = [
        ...(Array.isArray(meta.addSymbolIds) ? meta.addSymbolIds : []),
        ...(Array.isArray(meta.spawnOnBoard) ? meta.spawnOnBoard : []),
    ];
    return ids.flatMap((id) => {
        const value = asNumber(id);
        return value == null ? [] : [value];
    });
};

const hasDelta = (entry: GameEventLogEntry) =>
    Boolean(entry.delta && (entry.delta.food !== 0 || entry.delta.gold !== 0 || entry.delta.knowledge !== 0));

const matchesFilter = (entry: GameEventLogEntry, filter: HistoryFilter) => {
    if (filter === 'all') return true;
    if (filter === 'resources') return hasDelta(entry);
    if (filter === 'choices') return entry.kind === 'selection';
    if (filter === 'symbol') return entry.kind === 'symbol_effect';
    if (filter === 'relic') return entry.kind === 'relic';
    if (filter === 'combat') return entry.kind === 'combat';
    if (filter === 'threat') return entry.kind === 'threat';
    if (filter === 'growth') return entry.kind === 'research';
    if (filter === 'shop') return entry.kind === 'shop';
    if (filter === 'board') return entry.kind === 'board_action' || entry.kind === 'turn_start' || entry.kind === 'turn_end';
    return true;
};

const getKindLabel = (kind: GameEventLogKind, language: Language) =>
    text(language, KIND_LABELS[kind].ko, KIND_LABELS[kind].en);

const getEntryRelicId = (entry: GameEventLogEntry) => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    return asNumber(meta.relicId) ?? asNumber(meta.sourceRelicId);
};

const getEntryFallbackMark = (entry: GameEventLogEntry) => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    if (entry.kind === 'selection' && asString(meta.action) === 'select_event') return '!';
    if (entry.kind === 'combat') return '!';
    if (entry.kind === 'threat') return '!';
    if (entry.kind === 'relic' || entry.kind === 'shop') return '*';
    if (entry.kind === 'research') return '+';
    if (entry.kind === 'selection') return '?';
    if (entry.kind === 'board_action') return '#';
    if (entry.kind === 'turn_start' || entry.kind === 'turn_end') return 'T';
    return '.';
};

const EntryVisual = ({ entry, language }: { entry: GameEventLogEntry; language: Language }) => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    if (entry.kind === 'selection' && asString(meta.action) === 'select_event') {
        return (
            <span className="effect-history-entry-visual effect-history-entry-visual--fallback" aria-hidden="true">
                !
            </span>
        );
    }

    const relicId = getEntryRelicId(entry);
    const relic = relicId == null ? null : RELICS[relicId];
    if (relic?.sprite && relic.sprite !== '-' && relic.sprite !== '-.png') {
        return (
            <span className="effect-history-entry-visual effect-history-entry-visual--relic" aria-label={relicName(relicId, language)}>
                <img src={`${ASSET_BASE_URL}assets/relics/${relic.sprite}`} alt="" draggable={false} />
            </span>
        );
    }

    const symbol = entry.symbolId == null ? null : SYMBOLS[entry.symbolId];
    const spriteUrl = symbol ? getSymbolSpriteUrl(symbol) : '';

    if (spriteUrl) {
        return (
            <span className="effect-history-entry-visual" aria-label={symbolName(entry.symbolId, language)}>
                <img src={spriteUrl} alt="" draggable={false} />
            </span>
        );
    }

    return (
        <span className="effect-history-entry-visual effect-history-entry-visual--fallback" aria-hidden="true">
            {getEntryFallbackMark(entry)}
        </span>
    );
};

const DestroyedSymbolSprites = ({ entry, language }: { entry: GameEventLogEntry; language: Language }) => {
    const destroyed = getDestroyedSymbols(entry);
    if (destroyed.length === 0) return null;

    return (
        <span
            className="effect-history-destroyed-symbols"
            aria-label={text(language, '파괴된 심볼', 'Destroyed symbols')}
        >
            {destroyed.map((symbol, index) => {
                const definition = SYMBOLS[symbol.id];
                const spriteUrl = definition ? getSymbolSpriteUrl(definition) : '';
                const name = symbolName(symbol.id, language);
                const key = `${symbol.id}-${symbol.x ?? 'x'}-${symbol.y ?? 'y'}-${index}`;
                return (
                    <span className="effect-history-destroyed-symbol" key={key} title={name}>
                        {spriteUrl ? <img src={spriteUrl} alt="" draggable={false} /> : <span>{symbol.id}</span>}
                    </span>
                );
            })}
        </span>
    );
};

const ThreatSymbolSprites = ({ entry, language }: { entry: GameEventLogEntry; language: Language }) => {
    const threats = getThreatSymbols(entry);
    if (threats.length === 0) return null;

    return (
        <span
            className="effect-history-threat-symbols"
            aria-label={text(language, '발생한 위협', 'Spawned threats')}
        >
            {threats.map((symbol, index) => {
                const definition = SYMBOLS[symbol.id];
                const spriteUrl = definition ? getSymbolSpriteUrl(definition) : '';
                const name = symbolName(symbol.id, language);
                const key = `${symbol.id}-${symbol.x ?? 'x'}-${symbol.y ?? 'y'}-${index}`;
                return (
                    <span className="effect-history-threat-symbol" key={key} title={name}>
                        {spriteUrl ? <img src={spriteUrl} alt="" draggable={false} /> : <span>{symbol.id}</span>}
                    </span>
                );
            })}
        </span>
    );
};

const AddedSymbolSprites = ({ entry, language }: { entry: GameEventLogEntry; language: Language }) => {
    const added = getAddedSymbolIds(entry);
    if (added.length === 0) return null;

    return (
        <span
            className="effect-history-added-symbols"
            aria-label={text(language, '추가된 심볼', 'Added symbols')}
        >
            {added.map((id, index) => {
                const definition = SYMBOLS[id];
                const spriteUrl = definition ? getSymbolSpriteUrl(definition) : '';
                const name = symbolName(id, language);
                return (
                    <span className="effect-history-added-symbol" key={`${id}-${index}`} title={name}>
                        {spriteUrl ? <img src={spriteUrl} alt="" draggable={false} /> : <span>{id}</span>}
                    </span>
                );
            })}
        </span>
    );
};

const shouldShowKindBar = (entry: GameEventLogEntry) =>
    entry.kind !== 'turn_start' &&
    entry.kind !== 'processing_start' &&
    entry.kind !== 'processing_end' &&
    entry.kind !== 'turn_end';

const isProcessEntry = (entry: GameEventLogEntry) => !shouldShowKindBar(entry);

const getEntryTitle = (entry: GameEventLogEntry, language: Language) => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    const action = asString(meta.action);
    const subject = symbolName(entry.symbolId, language);

    if (entry.kind === 'threat') {
        const threatNames = getThreatSymbols(entry)
            .map((symbol) => symbolName(symbol.id, language))
            .filter(Boolean);
        const uniqueNames = [...new Set(threatNames)];
        if (uniqueNames.length === 1 && threatNames.length > 1) {
            return text(language, `${uniqueNames[0]} ${threatNames.length}개 발생`, `${uniqueNames[0]} x${threatNames.length} appeared`);
        }
        return subject
            ? text(language, `${subject} 발생`, `${subject} appeared`)
            : text(language, '위협 발생', 'Threat appeared');
    }

    if (entry.kind === 'selection') {
        if (action === 'select_symbol') return text(language, `${subject} 선택`, `Picked ${subject}`);
        if (action === 'select_event') return text(language, `${eventName(asNumber(meta.eventId), language)} 선택`, `Picked ${eventName(asNumber(meta.eventId), language)}`);
        if (action === 'reroll') {
            const cost = asNumber(meta.cost);
            return cost
                ? text(language, `선택지를 다시 굴림 (${cost} 골드)`, `Rerolled choices for ${cost} Gold`)
                : text(language, '선택지를 다시 굴림', 'Rerolled choices');
        }
        if (action === 'skip_selection') return text(language, '심볼 선택을 건너뜀', 'Skipped symbol choice');
        return formatAction(action) || text(language, '플레이어 선택', 'Player action');
    }

    if (entry.kind === 'shop') {
        if (action === 'buy_relic') {
            const name = relicName(asNumber(meta.relicId), language);
            return text(language, `${name} 구매`, `Bought ${name}`);
        }
        return formatAction(action) || text(language, '상점 이용', 'Shop action');
    }

    if (entry.kind === 'research') {
        const name = upgradeName(asNumber(meta.upgradeId), language);
        return text(language, `${name} 연구 완료`, `Researched ${name}`);
    }

    if (entry.kind === 'symbol_effect') {
        return text(language, `${subject} 효과 발동`, `${slotLabel(entry.slot, language)} ${subject} resolved`);
    }

    if (entry.kind === 'combat') {
        const targetSlot = isRecord(meta.targetSlot) ? meta.targetSlot as { x: number; y: number } : undefined;
        return text(language, `${subject} 공격`, `${slotLabel(entry.slot, language)} ${subject} attacked ${slotLabel(targetSlot, language)}`);
    }

    if (entry.kind === 'relic') {
        const name = relicName(asNumber(meta.relicId), language);
        return name
            ? text(language, `${name} 유물 효과`, `${name}: ${formatAction(action) || 'activated'}`)
            : formatAction(action) || text(language, '유물 효과', 'Relic event');
    }

    if (entry.kind === 'board_action') {
        if (action === 'destroyed_symbols') {
            return subject
                ? text(language, `${subject}로 인한 파괴`, `Destroyed by ${subject}`)
                : text(language, '심볼 파괴', 'Symbols destroyed');
        }
        if (action === 'loot_reward_open') return text(language, '전리품 개봉', 'Opened loot');
        if (action === 'loot_reward_select') return text(language, '전리품 보상', 'Loot reward');
        return text(language, `${subject || '보드'} 변화`, `${formatAction(action) || 'Board action'} ${subject}`.trim());
    }

    if (entry.kind === 'turn_start') return text(language, `턴 ${entry.turn} 시작`, `Turn ${entry.turn} started`);
    if (entry.kind === 'processing_start') return text(language, '심볼 효과 처리 시작', 'Board processing started');
    if (entry.kind === 'processing_end') return text(language, '심볼 효과 처리 완료', 'Board processing finished');
    if (entry.kind === 'turn_end') return text(language, `턴 ${entry.turn} 종료`, `Turn ${entry.turn} ended`);
    return formatAction(action) || text(language, '게임 진행', 'System event');
};

const getEntrySubtitle = (entry: GameEventLogEntry, language: Language) => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    const action = asString(meta.action);
    const parts: string[] = [];

    if (entry.slot) parts.push(slotLabel(entry.slot, language));

    if (entry.kind === 'symbol_effect' && entry.contributors?.length) {
        const names = entry.contributors.map((c) => `${slotLabel(c, language)} ${symbolName(c.symbolId, language)}`).join(', ');
        parts.push(text(language, `상호작용: ${names}`, `Interacts with ${names}`));
    }

    if (entry.kind === 'combat') {
        const targetSlot = isRecord(meta.targetSlot) ? meta.targetSlot as { x: number; y: number } : undefined;
        const targetSymbolId = asNumber(meta.targetSymbolId);
        const damage = asNumber(meta.damage);
        const target = `${slotLabel(targetSlot, language)} ${symbolName(targetSymbolId, language)}`.trim();
        if (target) parts.push(text(language, `대상: ${target}`, `Target: ${target}`));
        if (damage) parts.push(text(language, `피해 ${damage}`, `${damage} damage`));
    }

    const addSymbols = summarizeGenerated(meta.addSymbolIds, language);
    if (addSymbols) parts.push(text(language, `획득: ${addSymbols}`, `Adds ${addSymbols}`));

    const spawnSymbols = summarizeGenerated(meta.spawnOnBoard, language);
    if (spawnSymbols) parts.push(text(language, `보드에 등장: ${spawnSymbols}`, `Spawns ${spawnSymbols}`));

    const threatLabels = Array.isArray(meta.threatLabels)
        ? meta.threatLabels.map(asString).filter((label): label is string => !!label)
        : [];
    if (entry.kind === 'threat' && threatLabels.length > 0) parts.push([...new Set(threatLabels)].join(', '));

    const threatSymbols = getThreatSymbols(entry)
        .map((symbol) => symbolName(symbol.id, language))
        .filter(Boolean);
    if (threatSymbols.length > 0) parts.push(text(language, `발생: ${threatSymbols.join(', ')}`, `Appeared: ${threatSymbols.join(', ')}`));

    const destroyedSymbols = getDestroyedSymbols(entry)
        .map((symbol) => symbolName(symbol.id, language))
        .filter(Boolean)
        .join(', ');
    if (destroyedSymbols) parts.push(text(language, `파괴: ${destroyedSymbols}`, `Destroyed: ${destroyedSymbols}`));

    const sourceRelicId = asNumber(meta.sourceRelicId);
    if (sourceRelicId) parts.push(text(language, `출처: ${relicName(sourceRelicId, language)}`, `From ${relicName(sourceRelicId, language)}`));

    const sourceSymbolId = asNumber(meta.sourceSymbolId);
    if (sourceSymbolId) parts.push(text(language, `출처: ${symbolName(sourceSymbolId, language)}`, `From ${symbolName(sourceSymbolId, language)}`));

    const remainingResearch = asNumber(meta.remainingResearchPoints);
    if (remainingResearch != null) {
        parts.push(text(language, `남은 연구 선택 ${remainingResearch}개`, `${remainingResearch} research pick(s) left`));
    }

    const cost = asNumber(meta.cost);
    if (cost) parts.push(text(language, `비용: 골드 ${cost}`, `Cost ${cost} Gold`));

    return parts.join(' · ');
};

const getEntryDetailLines = (entry: GameEventLogEntry, language: Language) => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    const lines: string[] = [];
    const action = asString(meta.action);

    if (action) lines.push(text(language, `처리: ${formatAction(action)}`, `Action: ${formatAction(action)}`));
    if (entry.slot) lines.push(text(language, `위치: ${slotLabel(entry.slot, language)}`, `Position: ${slotLabel(entry.slot, language)}`));
    if (entry.contributors?.length) {
        lines.push(text(
            language,
            `영향을 준 심볼: ${entry.contributors.map((c) => `${slotLabel(c, language)} ${symbolName(c.symbolId, language)}`).join(', ')}`,
            `Contributors: ${entry.contributors.map((c) => `${slotLabel(c, language)} ${symbolName(c.symbolId, language)}`).join(', ')}`,
        ));
    }

    const subtitle = getEntrySubtitle(entry, language);
    if (subtitle) lines.push(subtitle);
    return [...new Set(lines)];
};

const formatDeltaText = (delta?: { food: number; gold: number; knowledge: number }) => {
    if (!delta) return '';
    const parts: string[] = [];
    if (delta.food) parts.push(`food ${delta.food > 0 ? '+' : ''}${delta.food}`);
    if (delta.gold) parts.push(`gold ${delta.gold > 0 ? '+' : ''}${delta.gold}`);
    if (delta.knowledge) parts.push(`knowledge ${delta.knowledge > 0 ? '+' : ''}${delta.knowledge}`);
    return parts.join(' ');
};

const getSearchText = (entry: GameEventLogEntry, language: Language) => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    const chunks = [
        getKindLabel(entry.kind, language),
        entry.kind,
        String(entry.turn),
        slotLabel(entry.slot, language),
        symbolName(entry.symbolId, language),
        getEntryTitle(entry, language),
        getEntrySubtitle(entry, language),
        formatDeltaText(entry.delta),
        JSON.stringify(meta),
    ];
    return chunks.join(' ').toLowerCase();
};

const addDelta = (
    total: { food: number; gold: number; knowledge: number },
    delta?: { food: number; gold: number; knowledge: number },
) => {
    if (!delta) return total;
    return {
        food: total.food + delta.food,
        gold: total.gold + delta.gold,
        knowledge: total.knowledge + delta.knowledge,
    };
};

const DeltaBadges = ({ delta, compact = false }: { delta?: { food: number; gold: number; knowledge: number }; compact?: boolean }) => {
    if (!delta || (delta.food === 0 && delta.gold === 0 && delta.knowledge === 0)) return null;

    const badge = (value: number, icon: string, color: string, label: string) => {
        if (value === 0) return null;
        return (
            <span className={compact ? 'history-delta-badge history-delta-badge--compact' : 'history-delta-badge'}>
                <img src={icon} alt="" width={16} height={16} style={{ imageRendering: 'pixelated', flexShrink: 0 }} />
                {!compact && <span>{label}</span>}
                <strong style={{ color: value > 0 ? color : C_BAD }}>{value > 0 ? '+' : ''}{value}</strong>
            </span>
        );
    };

    return (
        <div className="history-delta-row">
            {badge(delta.food, FOOD_RESOURCE_ICON_URL, C_FOOD, 'Food')}
            {badge(delta.gold, GOLD_RESOURCE_ICON_URL, C_GOLD, 'Gold')}
            {badge(delta.knowledge, KNOWLEDGE_RESOURCE_ICON_URL, C_KNOW, 'Knowledge')}
        </div>
    );
};

type TurnGroup = {
    turn: number;
    entries: GameEventLogEntry[];
    totals: { food: number; gold: number; knowledge: number };
};

const buildTurnGroups = (entries: GameEventLogEntry[], newestFirst: boolean): TurnGroup[] => {
    const map = new Map<number, TurnGroup>();

    for (const entry of entries) {
        const group = map.get(entry.turn) ?? {
            turn: entry.turn,
            entries: [],
            totals: { food: 0, gold: 0, knowledge: 0 },
        };
        group.entries.push(entry);
        group.totals = addDelta(group.totals, entry.delta);
        map.set(entry.turn, group);
    }

    return [...map.values()].sort((a, b) => newestFirst ? b.turn - a.turn : a.turn - b.turn);
};

const EffectLogOverlay = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<HistoryFilter>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const timelineRef = useRef<HTMLElement | null>(null);
    const [scrollInfo, setScrollInfo] = useState({ visible: false, top: 0, size: 1 });
    const newestFirst = true;
    const eventLog = useGameStore(s => s.eventLog);
    const currentTurn = useGameStore(s => s.turn);
    const language = useSettingsStore(s => s.language);
    const logTitle = language === 'ru'
        ? `История - ход ${currentTurn}`
        : text(language, `히스토리 - 턴 ${currentTurn}`, `History - Turn ${currentTurn}`);
    const closeLabel = text(language, '닫기', 'Close');

    useRegisterBoardTooltipBlock('effect-log-overlay', isOpen);

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = eventLog.filter((entry) => {
            if (!matchesFilter(entry, filter)) return false;
            if (!q) return true;
            return getSearchText(entry, language).includes(q);
        });
        return [...filtered].sort((a, b) => newestFirst ? b.ts - a.ts : a.ts - b.ts);
    }, [eventLog, filter, language, newestFirst, query]);

    const groups = useMemo(() => buildTurnGroups(rows, newestFirst), [newestFirst, rows]);

    const updateScrollInfo = useCallback(() => {
        const el = timelineRef.current;
        if (!el) return;

        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll <= 1) {
            setScrollInfo({ visible: false, top: 0, size: 1 });
            return;
        }

        const size = Math.max(0.08, el.clientHeight / el.scrollHeight);
        const top = (el.scrollTop / maxScroll) * (1 - size);
        setScrollInfo({ visible: true, top, size });
    }, []);

    const handleScrollbarPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const el = timelineRef.current;
        if (!el) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const maxScroll = el.scrollHeight - el.clientHeight;
        const thumbHeight = rect.height * scrollInfo.size;
        const trackTravel = Math.max(1, rect.height - thumbHeight);
        const nextRatio = Math.min(1, Math.max(0, (y - thumbHeight / 2) / trackTravel));

        el.scrollTop = nextRatio * maxScroll;
        updateScrollInfo();
    }, [scrollInfo.size, updateScrollInfo]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

            if (e.key === 'Escape') onClose();
            if (!isTyping && e.key === '/') {
                e.preventDefault();
                document.getElementById('history-search')?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const id = window.requestAnimationFrame(updateScrollInfo);
        window.addEventListener('resize', updateScrollInfo);
        return () => {
            window.cancelAnimationFrame(id);
            window.removeEventListener('resize', updateScrollInfo);
        };
    }, [groups, isOpen, updateScrollInfo]);

    if (!isOpen) return null;

    return (
        <div className="effect-history-modal">
            <div className="effect-history-screen">
                <header className="effect-history-header">
                    <div>
                        <div className="effect-history-title">{logTitle}</div>
                    </div>
                    <div className="effect-history-header-actions">
                        <button className="owned-symbols-close-btn effect-history-close-btn" onClick={onClose} aria-label="Close history">
                            {closeLabel}
                        </button>
                    </div>
                </header>

                <section className="effect-history-toolbar">
                    <input
                        id="history-search"
                        className="effect-history-search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={text(
                            language,
                            '심볼, 유물, 자원, 턴 번호로 찾기...',
                            'Search symbol, relic, resource, or turn...',
                            'Поиск по символу, реликвии, ресурсу или номеру хода...',
                        )}
                    />
                    <div className="effect-history-filter-row">
                        {FILTERS.map((item) => {
                            const selected = filter === item.id;
                            const count = eventLog.filter((entry) => matchesFilter(entry, item.id)).length;
                            return (
                                <button
                                    key={item.id}
                                    className={selected ? 'effect-history-filter-btn effect-history-filter-btn--selected' : 'effect-history-filter-btn'}
                                    onClick={() => setFilter(item.id)}
                                >
                                    {text(language, item.ko, item.en)}
                                    <strong>{count}</strong>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <main className="effect-history-body">
                    <div className="effect-history-timeline-shell">
                        <section
                            ref={timelineRef}
                            className="effect-history-timeline"
                            aria-label={text(language, '턴별 히스토리', 'Turn history')}
                            onScroll={updateScrollInfo}
                        >
                            {groups.length === 0 ? (
                                <div className="effect-history-empty">
                                    {text(language, '조건에 맞는 히스토리가 없습니다.', 'No history matches the current view.')}
                                </div>
                            ) : (
                                groups.map((group) => (
                                    <section className="effect-history-turn" key={group.turn}>
                                        <div className="effect-history-turn-header">
                                            <div>
                                                <span>{text(language, '턴', 'Turn')}</span>
                                                <strong>{group.turn}</strong>
                                            </div>
                                            <DeltaBadges delta={group.totals} compact />
                                        </div>
                                        <div className="effect-history-turn-list">
                                            {group.entries.map((entry) => {
                                                const isExpanded = expandedId === entry.id;
                                                const kindColor = KIND_COLORS[entry.kind];
                                                const detailLines = getEntryDetailLines(entry, language);
                                                return (
                                                <article
                                                    className={[
                                                        'effect-history-entry',
                                                        isExpanded ? 'effect-history-entry--expanded' : '',
                                                        shouldShowKindBar(entry) ? '' : 'effect-history-entry--no-kind-bar',
                                                        isProcessEntry(entry) ? 'effect-history-entry--process' : '',
                                                    ].filter(Boolean).join(' ')}
                                                    key={entry.id}
                                                    style={{ '--history-kind-color': kindColor } as React.CSSProperties}
                                                >
                                                        <button
                                                            className="effect-history-entry-main"
                                                            onClick={() => setExpandedId((prev) => prev === entry.id ? null : entry.id)}
                                                        >
                                                            {!isProcessEntry(entry) && <EntryVisual entry={entry} language={language} />}
                                                            <span className="effect-history-entry-copy">
                                                                <strong>{getEntryTitle(entry, language)}</strong>
                                                                <span>
                                                                    {getKindLabel(entry.kind, language)}
                                                                    {' · '}
                                                                    {getEntrySubtitle(entry, language) || text(language, '추가 변화 없음', 'No extra change')}
                                                                </span>
                                                            </span>
                                                            <span className="effect-history-entry-side">
                                                                <DestroyedSymbolSprites entry={entry} language={language} />
                                                                <ThreatSymbolSprites entry={entry} language={language} />
                                                                <AddedSymbolSprites entry={entry} language={language} />
                                                                <DeltaBadges delta={entry.delta} compact />
                                                            </span>
                                                        </button>
                                                        {isExpanded && detailLines.length > 0 && (
                                                            <div className="effect-history-entry-detail">
                                                                {detailLines.map((line) => <div key={line}>{line}</div>)}
                                                            </div>
                                                        )}
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))
                            )}
                        </section>
                        {scrollInfo.visible && (
                            <div className="effect-history-scrollbar" onPointerDown={handleScrollbarPointerDown} aria-hidden="true">
                                <div
                                    className="effect-history-scrollbar-thumb"
                                    style={{
                                        top: `${scrollInfo.top * 100}%`,
                                        height: `${scrollInfo.size * 100}%`,
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default EffectLogOverlay;
