import { useMemo, useState, useEffect } from 'react';
import { useGameStore, type GameEventLogEntry, type GameEventLogKind } from '../game/state/gameStore';
import { useSettingsStore, type Language } from '../game/state/settingsStore';
import { SYMBOLS } from '../game/data/symbolDefinitions';
import { RELICS } from '../game/data/relicDefinitions';
import { GAME_EVENTS } from '../game/data/eventDefinitions';
import { KNOWLEDGE_UPGRADES } from '../game/data/knowledgeUpgrades';
import { t } from '../i18n';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { FOOD_RESOURCE_ICON_URL, GOLD_RESOURCE_ICON_URL, KNOWLEDGE_RESOURCE_ICON_URL } from '../uiAssetUrls';

const C_FOOD = '#4ade80';
const C_GOLD = '#fbbf24';
const C_KNOW = '#60a5fa';
const C_BAD = '#fb7185';

type LogFilter = 'all' | GameEventLogKind;

const FILTERS: Array<{ id: LogFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'selection', label: 'Player' },
    { id: 'symbol_effect', label: 'Effects' },
    { id: 'combat', label: 'Combat' },
    { id: 'relic', label: 'Relics' },
    { id: 'shop', label: 'Shop' },
    { id: 'research', label: 'Research' },
    { id: 'board_action', label: 'Board' },
    { id: 'system', label: 'System' },
];

const KIND_LABELS: Record<GameEventLogKind, string> = {
    turn_start: 'Turn',
    processing_start: 'Start',
    symbol_effect: 'Effect',
    processing_end: 'Finish',
    turn_end: 'End',
    combat: 'Combat',
    relic: 'Relic',
    selection: 'Player',
    research: 'Research',
    shop: 'Shop',
    board_action: 'Board',
    system: 'System',
};

const KIND_COLORS: Record<GameEventLogKind, string> = {
    turn_start: '#93c5fd',
    processing_start: '#a7f3d0',
    symbol_effect: '#fcd34d',
    processing_end: '#a7f3d0',
    turn_end: '#93c5fd',
    combat: '#fb7185',
    relic: '#c084fc',
    selection: '#38bdf8',
    research: '#818cf8',
    shop: '#f59e0b',
    board_action: '#34d399',
    system: '#cbd5e1',
};

const slotToIndex = (slot?: { x: number; y: number }) => {
    if (!slot) return null;
    return slot.y * 5 + slot.x + 1;
};

const slotLabel = (slot?: { x: number; y: number }) => {
    const idx = slotToIndex(slot);
    if (!idx) return '';
    return `S${String(idx).padStart(2, '0')}`;
};

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

const formatDeltaText = (delta?: { food: number; gold: number; knowledge: number }) => {
    if (!delta) return '';
    const parts: string[] = [];
    if (delta.food) parts.push(`food ${delta.food > 0 ? '+' : ''}${delta.food}`);
    if (delta.gold) parts.push(`gold ${delta.gold > 0 ? '+' : ''}${delta.gold}`);
    if (delta.knowledge) parts.push(`knowledge ${delta.knowledge > 0 ? '+' : ''}${delta.knowledge}`);
    return parts.join(' ');
};

const summarizeGenerated = (ids: unknown, language: Language) => {
    if (!Array.isArray(ids) || ids.length === 0) return '';
    return ids
        .map((id) => symbolName(asNumber(id), language))
        .filter(Boolean)
        .join(', ');
};

const getEntryTitle = (entry: GameEventLogEntry, language: Language) => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    const action = asString(meta.action);

    if (entry.kind === 'selection') {
        if (action === 'select_symbol') return `Picked ${symbolName(entry.symbolId, language)}`;
        if (action === 'select_event') return `Picked ${eventName(asNumber(meta.eventId), language)}`;
        if (action === 'reroll') return asNumber(meta.cost) ? `Rerolled choices for ${meta.cost} Gold` : 'Rerolled choices';
        if (action === 'skip_selection') return 'Skipped symbol choice';
        return formatAction(action) || 'Player action';
    }

    if (entry.kind === 'shop') {
        if (action === 'buy_relic') return `Bought ${relicName(asNumber(meta.relicId), language)}`;
        return formatAction(action) || 'Shop action';
    }

    if (entry.kind === 'research') {
        return `Researched ${upgradeName(asNumber(meta.upgradeId), language)}`;
    }

    if (entry.kind === 'symbol_effect') {
        return `${slotLabel(entry.slot)} ${symbolName(entry.symbolId, language)} resolved`;
    }

    if (entry.kind === 'combat') {
        return `${slotLabel(entry.slot)} ${symbolName(entry.symbolId, language)} attacked ${slotLabel(meta.targetSlot as { x: number; y: number } | undefined)}`;
    }

    if (entry.kind === 'relic') {
        const name = relicName(asNumber(meta.relicId), language);
        return name ? `${name}: ${formatAction(action) || 'activated'}` : formatAction(action) || 'Relic event';
    }

    if (entry.kind === 'board_action') {
        return `${formatAction(action) || 'Board action'} ${symbolName(entry.symbolId, language)}`.trim();
    }

    if (entry.kind === 'turn_start') return `Turn ${entry.turn} started`;
    if (entry.kind === 'processing_start') return 'Board processing started';
    if (entry.kind === 'processing_end') return 'Board processing finished';
    if (entry.kind === 'turn_end') return `Turn ${entry.turn} ended`;
    return formatAction(action) || 'System event';
};

const getEntrySubtitle = (entry: GameEventLogEntry, language: Language) => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    const parts: string[] = [];

    if (entry.slot) parts.push(slotLabel(entry.slot));

    if (entry.kind === 'symbol_effect' && entry.contributors?.length) {
        parts.push(`interacts with ${entry.contributors.map((c) => `${slotLabel(c)} ${symbolName(c.symbolId, language)}`).join(', ')}`);
    }

    if (entry.kind === 'combat') {
        const targetSlot = isRecord(meta.targetSlot) ? meta.targetSlot as { x: number; y: number } : undefined;
        const targetSymbolId = asNumber(meta.targetSymbolId);
        const damage = asNumber(meta.damage);
        parts.push(`target ${slotLabel(targetSlot)} ${symbolName(targetSymbolId, language)}`.trim());
        if (damage) parts.push(`${damage} damage`);
    }

    const addSymbols = summarizeGenerated(meta.addSymbolIds, language);
    if (addSymbols) parts.push(`adds ${addSymbols}`);

    const spawnSymbols = summarizeGenerated(meta.spawnOnBoard, language);
    if (spawnSymbols) parts.push(`spawns ${spawnSymbols}`);

    const sourceRelicId = asNumber(meta.sourceRelicId);
    if (sourceRelicId) parts.push(`from ${relicName(sourceRelicId, language)}`);

    const sourceSymbolId = asNumber(meta.sourceSymbolId);
    if (sourceSymbolId) parts.push(`from ${symbolName(sourceSymbolId, language)}`);

    const remainingResearch = asNumber(meta.remainingResearchPoints);
    if (remainingResearch != null) parts.push(`${remainingResearch} research pick(s) left`);

    const cost = asNumber(meta.cost);
    if (cost) parts.push(`cost ${cost} Gold`);

    return parts.join(' | ');
};

const getSearchText = (entry: GameEventLogEntry, language: Language) => {
    const meta = isRecord(entry.meta) ? entry.meta : {};
    const chunks = [
        KIND_LABELS[entry.kind],
        entry.kind,
        String(entry.turn),
        slotLabel(entry.slot),
        symbolName(entry.symbolId, language),
        getEntryTitle(entry, language),
        getEntrySubtitle(entry, language),
        formatDeltaText(entry.delta),
        JSON.stringify(meta),
    ];
    return chunks.join(' ').toLowerCase();
};

const DeltaBadges = ({ delta }: { delta?: { food: number; gold: number; knowledge: number } }) => {
    if (!delta || (delta.food === 0 && delta.gold === 0 && delta.knowledge === 0)) return null;

    const badge = (value: number, icon: string, color: string) => {
        if (value === 0) return null;
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    minHeight: 24,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(15, 23, 42, 0.92)',
                    color: value > 0 ? color : C_BAD,
                    border: `1px solid ${value > 0 ? `${color}66` : '#fb718566'}`,
                    fontWeight: 700,
                }}
            >
                <img src={icon} alt="" width={16} height={16} style={{ imageRendering: 'pixelated', flexShrink: 0 }} />
                {value > 0 ? '+' : ''}{value}
            </span>
        );
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {badge(delta.food, FOOD_RESOURCE_ICON_URL, C_FOOD)}
            {badge(delta.gold, GOLD_RESOURCE_ICON_URL, C_GOLD)}
            {badge(delta.knowledge, KNOWLEDGE_RESOURCE_ICON_URL, C_KNOW)}
        </div>
    );
};

const EffectLogOverlay = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<LogFilter>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [newestFirst, setNewestFirst] = useState(true);
    const eventLog = useGameStore(s => s.eventLog);
    const clearEventLog = useGameStore(s => s.clearEventLog);
    const language = useSettingsStore(s => s.language);

    useRegisterBoardTooltipBlock('effect-log-overlay', isOpen);

    const stats = useMemo(() => {
        const next = new Map<GameEventLogKind, number>();
        for (const entry of eventLog) next.set(entry.kind, (next.get(entry.kind) ?? 0) + 1);
        return next;
    }, [eventLog]);

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = eventLog.filter((entry) => {
            if (filter !== 'all' && entry.kind !== filter) return false;
            if (!q) return true;
            return getSearchText(entry, language).includes(q);
        });
        return newestFirst ? [...filtered].reverse() : filtered;
    }, [eventLog, filter, language, newestFirst, query]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

            if (e.key === 'Escape') onClose();
            if (e.ctrlKey && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                clearEventLog();
                setExpandedId(null);
            }
            if (!isTyping && e.key === '/') {
                e.preventDefault();
                document.getElementById('effect-log-filter')?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [clearEventLog, isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10001,
                background: '#05070b',
                color: '#e5edf8',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: 15,
                lineHeight: 1.4,
            }}
        >
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
                    background: '#0b1020',
                }}
            >
                <div>
                    <div style={{ color: '#f8fafc', fontSize: 22, fontWeight: 800 }}>Event Log</div>
                    <div style={{ color: '#94a3b8', marginTop: 2 }}>
                        {rows.length.toLocaleString()} shown / {eventLog.length.toLocaleString()} total - / filter, Ctrl+L clear, Esc close
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={() => setNewestFirst((value) => !value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            background: '#111827',
                            color: '#dbeafe',
                            cursor: 'pointer',
                            fontWeight: 700,
                        }}
                    >
                        {newestFirst ? 'Newest first' : 'Oldest first'}
                    </button>
                    <button
                        onClick={() => {
                            clearEventLog();
                            setExpandedId(null);
                        }}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid rgba(251, 113, 133, 0.45)',
                            background: 'rgba(127, 29, 29, 0.32)',
                            color: '#fecdd3',
                            cursor: 'pointer',
                            fontWeight: 700,
                        }}
                    >
                        Clear
                    </button>
                    <button
                        onClick={onClose}
                        aria-label="Close event log"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 6,
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            background: '#111827',
                            color: '#f8fafc',
                            cursor: 'pointer',
                            fontSize: 22,
                            lineHeight: 1,
                        }}
                    >
                        x
                    </button>
                </div>
            </header>

            <section
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 20px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
                    background: '#080d18',
                }}
            >
                <input
                    id="effect-log-filter"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search symbol, relic, action, slot, resource..."
                    style={{
                        flex: '1 1 320px',
                        minWidth: 240,
                        height: 40,
                        padding: '0 12px',
                        borderRadius: 6,
                        border: '1px solid rgba(148, 163, 184, 0.28)',
                        background: '#0f172a',
                        color: '#f8fafc',
                        outline: 'none',
                        fontSize: 15,
                    }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {FILTERS.map((item) => {
                        const selected = filter === item.id;
                        const count = item.id === 'all' ? eventLog.length : stats.get(item.id) ?? 0;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setFilter(item.id)}
                                style={{
                                    minHeight: 34,
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: selected ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.26)',
                                    background: selected ? 'rgba(14, 165, 233, 0.18)' : '#111827',
                                    color: selected ? '#e0f2fe' : '#cbd5e1',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                }}
                            >
                                {item.label} {count}
                            </button>
                        );
                    })}
                </div>
            </section>

            <main style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 20px 22px' }}>
                {rows.length === 0 ? (
                    <div style={{ color: '#94a3b8', padding: '36px 0', textAlign: 'center' }}>
                        No log entries match the current filter.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                        {rows.map((entry) => {
                            const meta = isRecord(entry.meta) ? entry.meta : {};
                            const isExpanded = expandedId === entry.id;
                            const time = new Date(entry.ts).toLocaleTimeString();
                            const title = getEntryTitle(entry, language);
                            const subtitle = getEntrySubtitle(entry, language);
                            const kindColor = KIND_COLORS[entry.kind];
                            const rawMeta = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';

                            return (
                                <article
                                    key={entry.id}
                                    style={{
                                        borderRadius: 8,
                                        border: `1px solid ${isExpanded ? `${kindColor}88` : 'rgba(148, 163, 184, 0.18)'}`,
                                        background: isExpanded ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.72)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <button
                                        onClick={() => setExpandedId((prev) => prev === entry.id ? null : entry.id)}
                                        style={{
                                            width: '100%',
                                            minHeight: 62,
                                            padding: '10px 12px',
                                            display: 'grid',
                                            gridTemplateColumns: '86px 86px minmax(0, 1fr) auto',
                                            gap: 12,
                                            alignItems: 'center',
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'inherit',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <span style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>T{entry.turn}</span>
                                        <span
                                            style={{
                                                justifySelf: 'start',
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                background: `${kindColor}22`,
                                                color: kindColor,
                                                border: `1px solid ${kindColor}55`,
                                                fontSize: 12,
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {KIND_LABELS[entry.kind]}
                                        </span>
                                        <span style={{ minWidth: 0 }}>
                                            <span style={{ display: 'block', color: '#f8fafc', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {title}
                                            </span>
                                            {subtitle && (
                                                <span style={{ display: 'block', color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {subtitle}
                                                </span>
                                            )}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <DeltaBadges delta={entry.delta} />
                                            <span style={{ color: '#64748b', minWidth: 74, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{time}</span>
                                        </span>
                                    </button>

                                    {isExpanded && (
                                        <div
                                            style={{
                                                borderTop: '1px solid rgba(148, 163, 184, 0.16)',
                                                padding: '12px 14px 14px 184px',
                                                color: '#cbd5e1',
                                                background: 'rgba(2, 6, 23, 0.32)',
                                            }}
                                        >
                                            {entry.contributors && entry.contributors.length > 0 && (
                                                <div style={{ marginBottom: 8 }}>
                                                    <strong style={{ color: '#f8fafc' }}>Interaction:</strong>{' '}
                                                    {slotLabel(entry.slot)} {symbolName(entry.symbolId, language)} -{'>'}{' '}
                                                    {entry.contributors.map((c) => `${slotLabel(c)} ${symbolName(c.symbolId, language)}`).join(', ')}
                                                </div>
                                            )}
                                            {entry.delta && (
                                                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <strong style={{ color: '#f8fafc' }}>Resources:</strong>
                                                    <DeltaBadges delta={entry.delta} />
                                                </div>
                                            )}
                                            {rawMeta && (
                                                <pre
                                                    style={{
                                                        margin: 0,
                                                        padding: 10,
                                                        borderRadius: 6,
                                                        background: '#020617',
                                                        color: '#dbeafe',
                                                        overflow: 'auto',
                                                        fontSize: 13,
                                                        lineHeight: 1.45,
                                                    }}
                                                >
                                                    {rawMeta}
                                                </pre>
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default EffectLogOverlay;
