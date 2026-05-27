import { useEffect, useMemo, useState } from 'react';
import { useGameStore, getSymbolPoolProbabilities } from '../game/state/gameStore';
import { SymbolType, SYMBOLS } from '../game/data/symbolDefinitions';
import { t } from '../i18n';
import { useSettingsStore } from '../game/state/settingsStore';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';

const TYPE_META: Record<number, { labelKey: string; color: string }> = {
    [SymbolType.RELIGION]: { labelKey: 'era.special', color: '#c084fc' },
    [SymbolType.NORMAL]: { labelKey: 'era.normal', color: '#e5e7eb' },
    [SymbolType.MEDIEVAL]: { labelKey: 'era.medieval', color: '#fb923c' },
    [SymbolType.MODERN]: { labelKey: 'era.modern', color: '#60a5fa' },
    [SymbolType.TERRAIN]: { labelKey: 'era.terrain', color: '#4ade80' },
    [SymbolType.ANCIENT]: { labelKey: 'era.ancient', color: '#fbbf24' },
    [SymbolType.UNIT]: { labelKey: 'era.unit', color: '#38bdf8' },
    [SymbolType.SPECIAL]: { labelKey: 'era.specialSymbol', color: '#c084fc' },
    [SymbolType.ENEMY]: { labelKey: 'era.enemy', color: '#ef4444' },
    [SymbolType.DISASTER]: { labelKey: 'era.disaster', color: '#a855f7' },
};

const typeOrder = [
    SymbolType.RELIGION,
    SymbolType.NORMAL,
    SymbolType.ANCIENT,
    SymbolType.UNIT,
    SymbolType.SPECIAL,
    SymbolType.MEDIEVAL,
    SymbolType.MODERN,
    SymbolType.TERRAIN,
    SymbolType.ENEMY,
    SymbolType.DISASTER,
];

const replaceParams = (template: string, params: Record<string, string | number>): string => {
    return Object.entries(params).reduce(
        (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
        template,
    );
};

const SymbolPoolModal = () => {
    const [open, setOpen] = useState(false);
    const { era, religionUnlocked } = useGameStore();
    const language = useSettingsStore((s) => s.language);
    const developerMode = useSettingsStore((s) => s.developerMode);

    useRegisterBoardTooltipBlock('symbol-pool-modal', open);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code !== 'F3') return;
            if (!useSettingsStore.getState().developerMode) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            e.preventDefault();
            setOpen((value) => !value);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        if (!developerMode) setOpen(false);
    }, [developerMode]);

    const probabilities = useMemo(() => {
        if (!open) return [];
        return getSymbolPoolProbabilities(era, religionUnlocked);
    }, [open, era, religionUnlocked]);

    const totalPool = probabilities.length;
    const probPerSymbol = totalPool > 0 ? (100 / totalPool).toFixed(2) : '0.00';

    const grouped = useMemo(() => {
        const map: Record<number, typeof probabilities> = {};
        for (const row of probabilities) {
            if (!map[row.symbolType]) map[row.symbolType] = [];
            map[row.symbolType].push(row);
        }
        return map;
    }, [probabilities]);

    if (!open) return null;

    const subtitle = replaceParams(t('symbolPool.subtitle', language), {
        era,
        religion: t(religionUnlocked ? 'symbolPool.religionUnlocked' : 'symbolPool.religionLocked', language),
        total: totalPool,
    });
    const probabilityLabel = replaceParams(t('symbolPool.probPerSymbol', language), {
        probability: probPerSymbol,
    });

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
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '580px',
                    maxHeight: '82vh',
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'var(--game-font-family), monospace',
                    overflow: 'hidden',
                    boxShadow: '0 0 40px rgba(0,0,0,0.8)',
                }}
            >
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
                            {t('symbolPool.title', language)}
                        </span>
                        <span style={{ marginLeft: '12px', fontSize: '12px', color: '#9ca3af' }}>
                            {subtitle}
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
                            {probabilityLabel}
                        </span>
                        <button
                            onClick={() => setOpen(false)}
                            style={{
                                background: 'none',
                                border: '1px solid #4b5563',
                                color: '#9ca3af',
                                padding: '2px 8px',
                                fontSize: '14px',
                                borderRadius: '4px',
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div style={{ overflowY: 'auto', flex: 1 }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '13px',
                        color: '#e5e7eb',
                    }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#1f2937', zIndex: 1 }}>
                            <tr>
                                <th style={thStyle}>{t('symbolPool.id', language)}</th>
                                <th style={thStyle}>{t('symbolPool.name', language)}</th>
                                <th style={thStyle}>{t('symbolPool.type', language)}</th>
                                <th style={{ ...thStyle, textAlign: 'right', width: '120px' }}>
                                    {t('symbolPool.probability', language)}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {totalPool === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                                        {t('symbolPool.empty', language)}
                                    </td>
                                </tr>
                            )}
                            {typeOrder.map((typeId) => {
                                const rows = grouped[typeId];
                                if (!rows || rows.length === 0) return null;
                                const meta = TYPE_META[typeId] ?? { labelKey: 'symbolPool.type', color: '#9ca3af' };
                                const typeLabel = t(meta.labelKey, language);
                                return (
                                    <>
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
                                                {replaceParams(t('symbolPool.sectionSummary', language), {
                                                    type: typeLabel,
                                                    count: rows.length,
                                                })}
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
                                                    <div style={{ color: '#f3f4f6' }}>{t(`symbol.${SYMBOLS[row.id]?.key ?? row.id}.name`, language)}</div>
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
                                                        {typeLabel}
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

                <div style={{
                    padding: '8px 18px',
                    borderTop: '1px solid #374151',
                    fontSize: '11px',
                    color: '#4b5563',
                    background: '#1f2937',
                    flexShrink: 0,
                }}>
                    {t('symbolPool.footer', language)}
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
