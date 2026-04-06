import { useMemo, useState } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';

const FOOD_SYM = '⬟';
const GOLD_SYM = '●';
const KNOW_SYM = '✦';

const C_FOOD = '#4ade80';
const C_GOLD = '#fbbf24';
const C_KNOW = '#60a5fa';

const slotToIndex = (slot?: { x: number; y: number }) => {
    if (!slot) return null;
    // 보드 순서: y(0..3) → x(0..4), 1..20
    return slot.y * 5 + slot.x + 1;
};

const slotLabel = (slot?: { x: number; y: number }) => {
    const idx = slotToIndex(slot);
    if (!idx) return '';
    return `S${String(idx).padStart(2, '0')}`;
};

const formatDeltaText = (delta?: { food: number; gold: number; knowledge: number }) => {
    if (!delta) return '';
    const parts: string[] = [];
    if (delta.food) parts.push(`${FOOD_SYM}${delta.food > 0 ? '+' : ''}${delta.food}`);
    if (delta.gold) parts.push(`${GOLD_SYM}${delta.gold > 0 ? '+' : ''}${delta.gold}`);
    if (delta.knowledge) parts.push(`${KNOW_SYM}${delta.knowledge > 0 ? '+' : ''}${delta.knowledge}`);
    return parts.join(' ');
};

const EffectLogOverlay = () => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const eventLog = useGameStore(s => s.eventLog);
    const language = useSettingsStore(s => s.language);

    useRegisterBoardTooltipBlock('effect-log-overlay', open);

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return eventLog;
        return eventLog.filter((e) => {
            const parts: string[] = [];
            parts.push(e.kind);
            parts.push(String(e.turn));
            if (e.symbolId != null) parts.push(String(e.symbolId));
            if (e.slot) parts.push(slotLabel(e.slot));
            if (e.delta) parts.push(formatDeltaText(e.delta));
            return parts.join(' ').toLowerCase().includes(q);
        });
    }, [eventLog, query]);

    if (!open) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10001,
                background: '#000000',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Menlo, Monaco, ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: '18px',
                lineHeight: 1.35,
                letterSpacing: '0.01em',
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Terminal header (plain text) */}
                <div style={{
                    padding: '12px 16px 8px 16px',
                    borderBottom: '1px solid rgba(34,197,94,0.35)',
                    color: '#86efac',
                    whiteSpace: 'pre',
                    userSelect: 'none',
                    fontSize: '16px',
                }}>
                    {`HUMANKIND EVENT LOG  |  ${rows.length.toLocaleString()}/${eventLog.length.toLocaleString()}  |  /:filter  Ctrl+L:clear  Esc:close`}
                </div>

                {/* Body */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    {/* Filter line (terminal-ish prompt) */}
                    <div style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid rgba(34,197,94,0.18)',
                        color: '#86efac',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '10px',
                        fontSize: '18px',
                    }}>
                        <span style={{ opacity: 0.95 }}>filter&gt;</span>
                        <input
                            id="effect-log-filter"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="(empty = all)"
                            style={{
                                flex: 1,
                                background: 'transparent',
                                color: '#bbf7d0',
                                border: 'none',
                                outline: 'none',
                                fontSize: '18px',
                            }}
                        />
                    </div>

                    {/* Log lines */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 18px 16px' }}>
                        {rows.length === 0 ? (
                            <div style={{ color: '#86efac', opacity: 0.85 }}>
                                (no matches)
                            </div>
                        ) : (
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                                {rows.map((e) => {
                                    const isExpanded = expandedId === e.id;
                                    const symName = e.symbolId != null ? t(`symbol.${e.symbolId}.name`, language) : '';
                                    const slot = e.slot ? slotLabel(e.slot) : '';
                                    const time = new Date(e.ts).toLocaleTimeString();

                                    const deltaSpans = e.delta ? (
                                        <span>
                                            {e.delta.food !== 0 && (
                                                <span style={{ color: e.delta.food > 0 ? C_FOOD : '#ef4444' }}>
                                                    {' '}{FOOD_SYM}{e.delta.food > 0 ? '+' : ''}{e.delta.food}
                                                </span>
                                            )}
                                            {e.delta.gold !== 0 && (
                                                <span style={{ color: e.delta.gold > 0 ? C_GOLD : '#ef4444' }}>
                                                    {' '}{GOLD_SYM}{e.delta.gold > 0 ? '+' : ''}{e.delta.gold}
                                                </span>
                                            )}
                                            {e.delta.knowledge !== 0 && (
                                                <span style={{ color: e.delta.knowledge > 0 ? C_KNOW : '#ef4444' }}>
                                                    {' '}{KNOW_SYM}{e.delta.knowledge > 0 ? '+' : ''}{e.delta.knowledge}
                                                </span>
                                            )}
                                        </span>
                                    ) : null;

                                    const mainLine = (
                                        <div
                                            key={e.id}
                                            onClick={() => setExpandedId(prev => prev === e.id ? null : e.id)}
                                            style={{
                                                color: '#bbf7d0',
                                                padding: '2px 0',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <span style={{ color: '#86efac' }}>[{time}]</span>
                                            <span style={{ color: '#86efac' }}> T{e.turn}</span>
                                            <span style={{ color: '#22c55e' }}> {e.kind}</span>
                                            {slot && <span style={{ color: '#86efac' }}> {slot}</span>}
                                            {symName && <span> {symName}</span>}
                                            {deltaSpans}
                                        </div>
                                    );

                                    const detailLines = isExpanded ? (
                                        <div style={{ padding: '2px 0 10px 18px', color: '#86efac', opacity: 0.9 }}>
                                            {e.contributors && e.contributors.length > 0 && (
                                                <div>
                                                    contributors: {e.contributors.map(c => {
                                                        const n = c.symbolId != null ? t(`symbol.${c.symbolId}.name`, language) : '?';
                                                        const s = slotLabel({ x: c.x, y: c.y });
                                                        return `${s} ${n}`;
                                                    }).join(', ')}
                                                </div>
                                            )}
                                            {e.meta && Object.keys(e.meta).length > 0 && (
                                                <div>
                                                    meta: {JSON.stringify(e.meta)}
                                                </div>
                                            )}
                                        </div>
                                    ) : null;

                                    return (
                                        <div key={e.id}>
                                            {mainLine}
                                            {detailLines}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EffectLogOverlay;

