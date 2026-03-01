import { useState, useEffect } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useRelicStore } from '../game/state/relicStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { SYMBOLS } from '../game/data/symbolDefinitions';
import { RELIC_LIST } from '../game/data/relicDefinitions';
import { t } from '../i18n';

const allSymbolsList = Object.values(SYMBOLS).sort((a, b) => a.era - b.era || a.id - b.id);

const btnStyle = (color: string): React.CSSProperties => ({
    background: color,
    color: '#fff',
    border: 'none',
    padding: '2px 7px',
    cursor: 'pointer',
    fontSize: '12px',
    borderRadius: '2px',
});

const StatRow = ({
    label,
    value,
    onAdjust,
    onSet,
}: {
    label: string;
    value: number;
    onAdjust: (delta: number) => void;
    onSet: (v: number) => void;
}) => {
    const [inputVal, setInputVal] = useState(String(value));

    useEffect(() => {
        setInputVal(String(value));
    }, [value]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 0' }}>
            <span style={{ width: '70px', color: '#aaa', fontSize: '12px' }}>{label}</span>
            <input
                type="number"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        const n = parseInt(inputVal, 10);
                        if (!isNaN(n)) onSet(n);
                    }
                }}
                style={{
                    width: '64px',
                    background: '#1a1a1a',
                    color: '#e0e0e0',
                    border: '1px solid #444',
                    padding: '2px 4px',
                    fontSize: '12px',
                    textAlign: 'right',
                }}
            />
            <button style={btnStyle('#374151')} onClick={() => onAdjust(-100)}>-100</button>
            <button style={btnStyle('#374151')} onClick={() => onAdjust(-10)}>-10</button>
            <button style={btnStyle('#166534')} onClick={() => onAdjust(10)}>+10</button>
            <button style={btnStyle('#166534')} onClick={() => onAdjust(100)}>+100</button>
        </div>
    );
};

const DevOverlay = () => {
    const [open, setOpen] = useState(false);
    const [selectedSymbolId, setSelectedSymbolId] = useState(allSymbolsList[0]?.id ?? 1);
    const [selectedRelicId, setSelectedRelicId] = useState<number>(RELIC_LIST[0]?.id ?? 0);
    const { food, gold, knowledge, playerSymbols, devAddSymbol, devRemoveSymbol, devSetStat } = useGameStore();
    const { relics, addRelic, removeRelic } = useRelicStore();
    const language = useSettingsStore(s => s.language);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                setOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    if (!open) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '380px',
            height: '100%',
            background: 'rgba(0,0,0,0.92)',
            color: '#e0e0e0',
            fontFamily: 'Mulmaru, monospace',
            fontSize: '14px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '2px solid #444',
        }}>
            {/* Header */}
            <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid #444',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>DEV TOOLS (F2)</span>
                <button
                    onClick={() => setOpen(false)}
                    style={{
                        background: 'none',
                        border: '1px solid #666',
                        color: '#aaa',
                        cursor: 'pointer',
                        padding: '2px 8px',
                        fontSize: '14px',
                    }}
                >X</button>
            </div>

            {/* Stats */}
            <div style={{
                padding: '8px 14px',
                borderBottom: '1px solid #333',
            }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px', letterSpacing: '1px' }}>STATS</div>
                <StatRow
                    label={t('game.food', language)}
                    value={food}
                    onAdjust={d => devSetStat('food', food + d)}
                    onSet={v => devSetStat('food', v)}
                />
                <StatRow
                    label={t('game.gold', language)}
                    value={gold}
                    onAdjust={d => devSetStat('gold', gold + d)}
                    onSet={v => devSetStat('gold', v)}
                />
                <StatRow
                    label={t('game.knowledge', language)}
                    value={knowledge}
                    onAdjust={d => devSetStat('knowledge', knowledge + d)}
                    onSet={v => devSetStat('knowledge', v)}
                />
            </div>

            {/* Add Symbol */}
            <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid #333',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
            }}>
                <select
                    value={selectedSymbolId}
                    onChange={e => setSelectedSymbolId(Number(e.target.value))}
                    style={{
                        flex: 1,
                        background: '#222',
                        color: '#e0e0e0',
                        border: '1px solid #555',
                        padding: '4px 6px',
                        fontSize: '13px',
                    }}
                >
                    {allSymbolsList.map(sym => (
                        <option key={sym.id} value={sym.id}>
                            [E{sym.era}] {t(`symbol.${sym.id}.name`, language)} (#{sym.id})
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => devAddSymbol(selectedSymbolId)}
                    style={{
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        padding: '4px 12px',
                        cursor: 'pointer',
                        fontSize: '13px',
                    }}
                >+</button>
            </div>

            {/* Relic Section */}
            <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid #333',
            }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px', letterSpacing: '1px' }}>
                    {t('dataBrowser.relics', language).toUpperCase()}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <select
                        value={selectedRelicId}
                        onChange={e => setSelectedRelicId(Number(e.target.value))}
                        style={{
                            flex: 1,
                            background: '#222',
                            color: '#e0e0e0',
                            border: '1px solid #555',
                            padding: '4px 6px',
                            fontSize: '13px',
                        }}
                    >
                        {RELIC_LIST.map(r => (
                            <option key={r.id} value={r.id}>
                                #{r.id} {t(`relic.${r.id}.name`, language)}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => {
                            const def = RELIC_LIST.find(r => r.id === selectedRelicId);
                            if (def) addRelic(def);
                        }}
                        style={{
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                        }}
                    >+</button>
                </div>
                {relics.map(r => (
                    <div
                        key={r.instanceId}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '3px 6px',
                            borderBottom: '1px solid #2a2a2a',
                        }}
                    >
                        <span style={{ fontSize: '13px' }}>
                            #{r.definition.id} {t(`relic.${r.definition.id}.name`, language)}
                        </span>
                        <button
                            onClick={() => removeRelic(r.instanceId)}
                            style={{
                                background: '#7f1d1d',
                                color: '#fca5a5',
                                border: 'none',
                                padding: '2px 8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                            }}
                        >-</button>
                    </div>
                ))}
            </div>

            {/* Symbol Count */}
            <div style={{ padding: '6px 14px', color: '#888', fontSize: '12px' }}>
                {t('dataBrowser.symbols', language)}: {playerSymbols.length}
            </div>

            {/* Player Symbols List */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '4px 10px',
            }}>
                {playerSymbols.map(sym => (
                    <div
                        key={sym.instanceId}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 6px',
                            borderBottom: '1px solid #2a2a2a',
                        }}
                    >
                        <span>
                            <span style={{ color: '#888', marginRight: '6px' }}>[E{sym.definition.era}]</span>
                            {t(`symbol.${sym.definition.id}.name`, language)}
                            {sym.effect_counter > 0 && (
                                <span style={{ color: '#fbbf24', marginLeft: '6px' }}>({sym.effect_counter})</span>
                            )}
                        </span>
                        <button
                            onClick={() => devRemoveSymbol(sym.instanceId)}
                            style={{
                                background: '#7f1d1d',
                                color: '#fca5a5',
                                border: 'none',
                                padding: '2px 8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                            }}
                        >-</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DevOverlay;
