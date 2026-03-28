import { useState, useEffect, useMemo } from 'react';
import { useGameStore, getSymbolPoolProbabilities } from '../game/state/gameStore';
import { SymbolType } from '../game/data/symbolDefinitions';
import { t } from '../i18n';
import { useSettingsStore } from '../game/state/settingsStore';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';

const TYPE_META: Record<number, { label: string; labelKo: string; color: string }> = {
    [SymbolType.RELIGION]: { label: 'Religion',  labelKo: '종교',     color: '#c084fc' },
    [SymbolType.NORMAL]:   { label: 'Normal',    labelKo: '일반',     color: '#e5e7eb' },
    [SymbolType.MEDIEVAL]: { label: 'Medieval',  labelKo: '중세',     color: '#fb923c' },
    [SymbolType.MODERN]:   { label: 'Modern',    labelKo: '현대',     color: '#60a5fa' },
    [SymbolType.TERRAIN]:  { label: 'Terrain',   labelKo: '지형',     color: '#4ade80' },
    [SymbolType.ANCIENT]:  { label: 'Ancient',   labelKo: '고대',     color: '#fbbf24' },
    [SymbolType.UNIT]:     { label: 'Unit',      labelKo: '유닛',     color: '#38bdf8' },
};

const SymbolPoolModal = () => {
    const [open, setOpen] = useState(false);
    const { era, religionUnlocked } = useGameStore();
    const language = useSettingsStore(s => s.language);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'F4') {
                e.preventDefault();
                setOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useRegisterBoardTooltipBlock('symbol-pool-modal', open);

    const probabilities = useMemo(() => {
        if (!open) return [];
        return getSymbolPoolProbabilities(era, religionUnlocked);
    }, [open, era, religionUnlocked]);

    const totalPool = probabilities.length;
    const probPerSymbol = totalPool > 0 ? (100 / totalPool).toFixed(2) : '0.00';

    // Group by symbolType for section headers
    const grouped = useMemo(() => {
        const map: Record<number, typeof probabilities> = {};
        for (const row of probabilities) {
            if (!map[row.symbolType]) map[row.symbolType] = [];
            map[row.symbolType].push(row);
        }
        return map;
    }, [probabilities]);

    const typeOrder = [
        SymbolType.RELIGION,
        SymbolType.NORMAL,
        SymbolType.ANCIENT,
        SymbolType.UNIT,
        SymbolType.MEDIEVAL,
        SymbolType.MODERN,
        SymbolType.TERRAIN,
    ];

    if (!open) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.7)',
            }}
            onClick={() => setOpen(false)}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '580px',
                    maxHeight: '82vh',
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'Mulmaru, monospace',
                    overflow: 'hidden',
                    boxShadow: '0 0 40px rgba(0,0,0,0.8)',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #374151',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#1f2937',
                    flexShrink: 0,
                }}>
                    <div>
                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#f9fafb' }}>
                            📊 심볼 풀 확률 (F4)
                        </span>
                        <span style={{ marginLeft: '12px', fontSize: '12px', color: '#9ca3af' }}>
                            시대 {era} · {religionUnlocked ? '종교 해금' : '종교 미해금'} · 총 {totalPool}개
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                            fontSize: '12px',
                            color: '#fbbf24',
                            background: '#292524',
                            border: '1px solid #57534e',
                            borderRadius: '4px',
                            padding: '2px 8px',
                        }}>
                            1픽당 각 {probPerSymbol}%
                        </span>
                        <button
                            onClick={() => setOpen(false)}
                            style={{
                                background: 'none',
                                border: '1px solid #4b5563',
                                color: '#9ca3af',
                                cursor: 'pointer',
                                padding: '2px 8px',
                                fontSize: '14px',
                                borderRadius: '4px',
                            }}
                        >✕</button>
                    </div>
                </div>

                {/* Table */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '13px',
                        color: '#e5e7eb',
                    }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#1f2937', zIndex: 1 }}>
                            <tr>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>이름</th>
                                <th style={thStyle}>타입</th>
                                <th style={{ ...thStyle, textAlign: 'right', width: '120px' }}>확률</th>
                            </tr>
                        </thead>
                        <tbody>
                            {totalPool === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                                        심볼 풀이 비어 있습니다.
                                    </td>
                                </tr>
                            )}
                            {typeOrder.map(typeId => {
                                const rows = grouped[typeId];
                                if (!rows || rows.length === 0) return null;
                                const meta = TYPE_META[typeId] ?? { label: `Type ${typeId}`, labelKo: `타입 ${typeId}`, color: '#9ca3af' };
                                return (
                                    <>
                                        {/* Section header */}
                                        <tr key={`section-${typeId}`}>
                                            <td colSpan={4} style={{
                                                padding: '6px 16px',
                                                background: '#1a2030',
                                                color: meta.color,
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                letterSpacing: '1px',
                                                borderBottom: `1px solid ${meta.color}33`,
                                                borderTop: '1px solid #2d3748',
                                            }}>
                                                ▸ {meta.labelKo} ({meta.label}) — {rows.length}개
                                            </td>
                                        </tr>
                                        {rows.map((row, idx) => (
                                            <tr
                                                key={row.id}
                                                style={{
                                                    background: idx % 2 === 0 ? '#111827' : '#141e2e',
                                                    borderBottom: '1px solid #1f2937',
                                                }}
                                            >
                                                <td style={{ padding: '6px 16px', color: '#6b7280', width: '48px', fontVariantNumeric: 'tabular-nums' }}>
                                                    {row.id}
                                                </td>
                                                <td style={{ padding: '6px 12px' }}>
                                                    <div style={{ color: '#f3f4f6' }}>{t(`symbol.${row.id}.name`, language)}</div>
                                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{row.name}</div>
                                                </td>
                                                <td style={{ padding: '6px 12px' }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        color: meta.color,
                                                        border: `1px solid ${meta.color}55`,
                                                        borderRadius: '3px',
                                                        padding: '1px 6px',
                                                    }}>
                                                        {meta.labelKo}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '6px 16px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                        <div style={{
                                                            width: '50px',
                                                            height: '4px',
                                                            background: '#374151',
                                                            borderRadius: '2px',
                                                            overflow: 'hidden',
                                                        }}>
                                                            <div style={{
                                                                width: `${Math.min(100, row.probability * 3)}%`,
                                                                height: '100%',
                                                                background: meta.color,
                                                                borderRadius: '2px',
                                                            }} />
                                                        </div>
                                                        <span style={{ fontVariantNumeric: 'tabular-nums', width: '52px', textAlign: 'right', color: '#fbbf24' }}>
                                                            {row.probability.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '8px 18px',
                    borderTop: '1px solid #374151',
                    fontSize: '11px',
                    color: '#4b5563',
                    background: '#1f2937',
                    flexShrink: 0,
                }}>
                    균등 확률 = 1 ÷ 풀 총 심볼 수 · 한 슬롯 기준 · F4로 닫기
                </div>
            </div>
        </div>
    );
};

const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    color: '#9ca3af',
    fontWeight: 'normal',
    borderBottom: '1px solid #374151',
};

export default SymbolPoolModal;
