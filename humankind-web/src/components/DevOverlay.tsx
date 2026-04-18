import { useState, useEffect } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useRelicStore } from '../game/state/relicStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { SYMBOLS } from '../game/data/symbolDefinitions';
import { RELIC_LIST } from '../game/data/relicDefinitions';
import { t } from '../i18n';

const allSymbolsList = Object.values(SYMBOLS).sort((a, b) => a.type - b.type || a.id - b.id);

const btnStyle = (color: string): React.CSSProperties => ({
    background: color,
    color: '#fff',
    border: 'none',
    padding: '2px 7px',
    fontSize: '12px',
    borderRadius: '2px',
});

const StatRow = ({
    label,
    value,
    onAdjust,
    onSet,
    deltas = [-100, -10, 10, 100],
}: {
    label: string;
    value: number;
    onAdjust: (delta: number) => void;
    onSet: (v: number) => void;
    deltas?: number[];
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
            {deltas.map((d) => (
                <button
                    key={d}
                    style={btnStyle(d < 0 ? '#374151' : '#166534')}
                    onClick={() => onAdjust(d)}
                >
                    {d > 0 ? `+${d}` : `${d}`}
                </button>
            ))}
        </div>
    );
};

const DevOverlay = () => {
    const [open, setOpen] = useState(false);
    const [selectedSymbolId, setSelectedSymbolId] = useState(allSymbolsList[0]?.id ?? 1);
    const [selectedRelicId, setSelectedRelicId] = useState<number>(RELIC_LIST[0]?.id ?? 0);
    const { food, gold, knowledge, level, turn, playerSymbols, devAddSymbol, devRemoveSymbol, devSetStat, devForceScreen, barbarianSymbolThreat, barbarianCampThreat, naturalDisasterThreat } = useGameStore();
    const { relics, addRelic, removeRelic } = useRelicStore();
    const language = useSettingsStore(s => s.language);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code !== 'F1') return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            e.preventDefault();
            setOpen((o) => !o);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
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
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>DEV TOOLS (F1)</span>
                <button
                    onClick={() => setOpen(false)}
                    style={{
                        background: 'none',
                        border: '1px solid #666',
                        color: '#aaa',
                        padding: '2px 8px',
                        fontSize: '14px',
                    }}
                >X</button>
            </div>

            {/* Open Screen */}
            <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid #333',
            }}>
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px', letterSpacing: '1px' }}>OPEN SCREEN</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => devForceScreen('symbol')}
                        style={{
                            flex: '1',
                            minWidth: '140px',
                            background: '#1d4ed8',
                            color: '#fff',
                            border: 'none',
                            padding: '7px 4px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '3px',
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>🃏</span>
                        <span>심볼 선택</span>
                    </button>
                    <button
                        onClick={() => devForceScreen('upgrade')}
                        style={{
                            flex: '1',
                            minWidth: '140px',
                            background: '#065f46',
                            color: '#fff',
                            border: 'none',
                            padding: '7px 4px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '3px',
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>📚</span>
                        <span>연구 포인트 +1</span>
                    </button>
                </div>
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
                    label="Knowledge"
                    value={knowledge}
                    onAdjust={d => devSetStat('knowledge', knowledge + d)}
                    onSet={v => devSetStat('knowledge', v)}
                />
                <StatRow
                    label="Level"
                    value={level}
                    onAdjust={d => devSetStat('level', level + d)}
                    onSet={v => devSetStat('level', v)}
                    deltas={[-5, -1, 1, 5]}
                />

                <StatRow
                    label={t('game.turn', language)}
                    value={turn}
                    onAdjust={d => devSetStat('turn', turn + d)}
                    onSet={v => devSetStat('turn', v)}
                    deltas={[-10, -1, 1, 10]}
                />

                {/* 하단에 현재 위협 게이지 확률 표시 */}
                <div style={{ marginTop: '10px' }}>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px', letterSpacing: '1px' }}>THREAT LEVELS</div>
                    <div style={{ fontSize: '12px', color: '#e0e0e0', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>야만인 유닛</span>
                        <span>{barbarianSymbolThreat}%</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#e0e0e0', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>야만인 주둔지</span>
                        <span>{barbarianCampThreat}%</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#e0e0e0', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>자연재해</span>
                        <span>{naturalDisasterThreat}%</span>
                    </div>
                </div>
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
                            [E{sym.type}] {t(`symbol.${sym.id}.name`, language)} (#{sym.id})
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
                            <span style={{ color: '#888', marginRight: '6px' }}>[E{sym.definition.type}]</span>
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
