import { useState, useEffect, useMemo, useCallback } from 'react';
import { SYMBOLS, Era, SymbolType, getSymbolColorHex } from '../game/data/symbolDefinitions';
import { RELICS } from '../game/data/relicDefinitions';
import { RELIC_CANDIDATES } from '../game/data/relicCandidates';
import { ENEMY_EFFECTS } from '../game/data/enemyEffectDefinitions';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

type Tab = 'symbols' | 'relics' | 'relicCandidates' | 'enemyEffects';
type SortDir = 'asc' | 'desc';
interface SortState { column: string; dir: SortDir; }

const ERA_KEYS: Record<number, string> = {
    [Era.RELIGION]: 'religion',
    [Era.ANCIENT]: 'ancient',
    [Era.CLASSICAL]: 'classical',
    [Era.MEDIEVAL]: 'medieval',
    [Era.INDUSTRIAL]: 'industrial',
    [Era.MODERN]: 'modern',
};

const EFFECT_TYPE_EMOJI: Record<string, string> = {
    food_loss: '🍖',
    gold_loss: '💰',
    mixed_loss: '💀',
    destruction: '💥',
    debuff: '⬇️',
};

const ERA_ORDER = [Era.ANCIENT, Era.CLASSICAL, Era.MEDIEVAL, Era.INDUSTRIAL, Era.MODERN, Era.RELIGION];

/** Sortable column header */
const SortTh = ({ column, label, sort, onSort, className }: {
    column: string; label: React.ReactNode; sort: SortState | null;
    onSort: (col: string) => void; className?: string;
}) => {
    const active = sort?.column === column;
    const arrow = active ? (sort!.dir === 'asc' ? ' ▲' : ' ▼') : '';
    return (
        <th className={className} onClick={() => onSort(column)} style={{ cursor: 'pointer', userSelect: 'none' }}>
            {label}{arrow}
        </th>
    );
};

function genericCompare(a: unknown, b: unknown, dir: SortDir): number {
    const mul = dir === 'asc' ? 1 : -1;
    if (a == null && b == null) return 0;
    if (a == null) return mul;
    if (b == null) return -mul;
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * mul;
    return String(a).localeCompare(String(b)) * mul;
}

const DataBrowser = () => {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<Tab>('symbols');
    const [eraFilter, setEraFilter] = useState<number | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<number | 'all'>('all');
    const [intensityFilter, setIntensityFilter] = useState<number | 'all'>('all');
    const [search, setSearch] = useState('');
    const language = useSettingsStore((s) => s.language);

    // Per-tab sort state
    const [symbolSort, setSymbolSort] = useState<SortState | null>(null);
    const [relicSort, setRelicSort] = useState<SortState | null>(null);
    const [relicCandSort, setRelicCandSort] = useState<SortState | null>(null);
    const [enemySort, setEnemySort] = useState<SortState | null>(null);

    const toggleSort = useCallback((setter: React.Dispatch<React.SetStateAction<SortState | null>>) =>
        (col: string) => {
            setter(prev => {
                if (prev?.column === col) {
                    return prev.dir === 'asc' ? { column: col, dir: 'desc' } : null;
                }
                return { column: col, dir: 'asc' };
            });
        }, []);

    // F3 키 바인딩
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'F3') {
                e.preventDefault();
                setOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // 심볼 목록 (필터 + 검색 + 정렬)
    const filteredSymbols = useMemo(() => {
        let list = Object.values(SYMBOLS);

        if (eraFilter !== 'all') {
            list = list.filter(s => s.era === eraFilter);
        }
        if (typeFilter !== 'all') {
            list = list.filter(s => s.symbol_type === typeFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s => {
                const name = t(`symbol.${s.id}.name`, language).toLowerCase();
                const desc = t(`symbol.${s.id}.desc`, language).toLowerCase();
                return name.includes(q) || desc.includes(q) || String(s.id).includes(q);
            });
        }

        if (symbolSort) {
            const { column, dir } = symbolSort;
            list = [...list].sort((a, b) => {
                let va: unknown, vb: unknown;
                switch (column) {
                    case 'id': va = a.id; vb = b.id; break;
                    case 'name': va = t(`symbol.${a.id}.name`, language); vb = t(`symbol.${b.id}.name`, language); break;
                    case 'era': va = ERA_ORDER.indexOf(a.era); vb = ERA_ORDER.indexOf(b.era); break;
                    case 'type': va = a.symbol_type; vb = b.symbol_type; break;
                    case 'desc': va = t(`symbol.${a.id}.desc`, language); vb = t(`symbol.${b.id}.desc`, language); break;
                    case 'atk': va = a.base_attack ?? -1; vb = b.base_attack ?? -1; break;
                    case 'hp': va = a.base_hp ?? -1; vb = b.base_hp ?? -1; break;
                    case 'sprite': va = a.sprite || ''; vb = b.sprite || ''; break;
                    default: va = a.id; vb = b.id;
                }
                return genericCompare(va, vb, dir);
            });
        } else {
            list.sort((a, b) => {
                const aIdx = ERA_ORDER.indexOf(a.era);
                const bIdx = ERA_ORDER.indexOf(b.era);
                if (aIdx !== bIdx) return aIdx - bIdx;
                return a.id - b.id;
            });
        }

        return list;
    }, [eraFilter, typeFilter, search, language, symbolSort]);

    // 유물 목록
    const filteredRelics = useMemo(() => {
        let list = Object.values(RELICS).filter(r =>
            search === '' ||
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.description.toLowerCase().includes(search.toLowerCase()) ||
            String(r.id).includes(search)
        );
        if (relicSort) {
            const { column, dir } = relicSort;
            list = [...list].sort((a, b) => {
                let va: unknown, vb: unknown;
                switch (column) {
                    case 'id': va = a.id; vb = b.id; break;
                    case 'name': va = a.name; vb = b.name; break;
                    case 'era': va = ERA_ORDER.indexOf(a.era); vb = ERA_ORDER.indexOf(b.era); break;
                    case 'cost': va = a.cost; vb = b.cost; break;
                    case 'desc': va = a.description; vb = b.description; break;
                    case 'sprite': va = a.sprite || ''; vb = b.sprite || ''; break;
                    default: va = a.id; vb = b.id;
                }
                return genericCompare(va, vb, dir);
            });
        }
        return list;
    }, [search, relicSort]);

    const filteredRelicCandidates = useMemo(() => {
        let list = Object.values(RELIC_CANDIDATES).filter(r =>
            search === '' ||
            t(`relic.${r.id}.name`, language).toLowerCase().includes(search.toLowerCase()) ||
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.description.toLowerCase().includes(search.toLowerCase()) ||
            String(r.id).includes(search)
        );
        if (relicCandSort) {
            const { column, dir } = relicCandSort;
            list = [...list].sort((a, b) => {
                let va: unknown, vb: unknown;
                switch (column) {
                    case 'id': va = a.id; vb = b.id; break;
                    case 'name': va = a.name; vb = b.name; break;
                    case 'era': va = ERA_ORDER.indexOf(a.era); vb = ERA_ORDER.indexOf(b.era); break;
                    case 'cost': va = a.cost; vb = b.cost; break;
                    case 'desc': va = a.description; vb = b.description; break;
                    case 'sprite': va = a.sprite || ''; vb = b.sprite || ''; break;
                    default: va = a.id; vb = b.id;
                }
                return genericCompare(va, vb, dir);
            });
        }
        return list;
    }, [search, language, relicCandSort]);

    // 적 효과 목록
    const filteredEnemyEffects = useMemo(() => {
        let list = Object.values(ENEMY_EFFECTS);

        if (intensityFilter !== 'all') {
            list = list.filter(e => e.intensity === intensityFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(e => {
                const desc = t(`enemyEffect.${e.id}.desc`, language).toLowerCase();
                return desc.includes(q) ||
                    String(e.id).includes(q) ||
                    e.effect_type.toLowerCase().includes(q);
            });
        }

        if (enemySort) {
            const { column, dir } = enemySort;
            list = [...list].sort((a, b) => {
                let va: unknown, vb: unknown;
                switch (column) {
                    case 'id': va = a.id; vb = b.id; break;
                    case 'intensity': va = a.intensity; vb = b.intensity; break;
                    case 'type': va = a.effect_type; vb = b.effect_type; break;
                    case 'food': va = a.food_penalty; vb = b.food_penalty; break;
                    case 'gold': va = a.gold_penalty; vb = b.gold_penalty; break;
                    case 'desc': va = t(`enemyEffect.${a.id}.desc`, language); vb = t(`enemyEffect.${b.id}.desc`, language); break;
                    default: va = a.id; vb = b.id;
                }
                return genericCompare(va, vb, dir);
            });
        } else {
            list.sort((a, b) => a.intensity - b.intensity || a.id - b.id);
        }

        return list;
    }, [intensityFilter, search, language, enemySort]);

    // 시대별 카운트
    const eraCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        const all = Object.values(SYMBOLS);
        for (const era of ERA_ORDER) {
            counts[era] = all.filter(s => s.era === era).length;
        }
        return counts;
    }, []);

    // 강도별 카운트
    const intensityCounts = useMemo(() => {
        const counts: Record<number, number> = {};
        for (const e of Object.values(ENEMY_EFFECTS)) {
            counts[e.intensity] = (counts[e.intensity] || 0) + 1;
        }
        return counts;
    }, []);

    const intensityLevels = useMemo(() => {
        return [...new Set(Object.values(ENEMY_EFFECTS).map(e => e.intensity))].sort((a, b) => a - b);
    }, []);

    if (!open) return null;

    const symSortHandler = toggleSort(setSymbolSort);
    const relSortHandler = toggleSort(setRelicSort);
    const rcSortHandler = toggleSort(setRelicCandSort);
    const enSortHandler = toggleSort(setEnemySort);

    return (
        <div className="databrowser">
            {/* Header */}
            <div className="databrowser-header">
                <div className="databrowser-header-left">
                    <span className="databrowser-title">📦 {t('dataBrowser.title', language)}</span>
                    <span className="databrowser-hint">F3</span>
                </div>
                <button className="databrowser-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* Tabs */}
            <div className="databrowser-tabs">
                <button
                    className={`databrowser-tab ${tab === 'symbols' ? 'databrowser-tab--active' : ''}`}
                    onClick={() => setTab('symbols')}
                >
                    {t('dataBrowser.symbols', language)} ({Object.keys(SYMBOLS).length})
                </button>
                <button
                    className={`databrowser-tab ${tab === 'relics' ? 'databrowser-tab--active' : ''}`}
                    onClick={() => setTab('relics')}
                >
                    {t('dataBrowser.relics', language)} ({Object.keys(RELICS).length})
                </button>
                <button
                    className={`databrowser-tab ${tab === 'relicCandidates' ? 'databrowser-tab--active' : ''}`}
                    onClick={() => setTab('relicCandidates')}
                >
                    {t('dataBrowser.relicCandidates', language)} ({Object.keys(RELIC_CANDIDATES).length})
                </button>
                <button
                    className={`databrowser-tab ${tab === 'enemyEffects' ? 'databrowser-tab--active' : ''}`}
                    onClick={() => setTab('enemyEffects')}
                >
                    {t('dataBrowser.enemyEffects', language)} ({Object.keys(ENEMY_EFFECTS).length})
                </button>
            </div>

            {/* Toolbar */}
            <div className="databrowser-toolbar">
                <input
                    className="databrowser-search"
                    type="text"
                    placeholder={t('dataBrowser.searchPlaceholder', language)}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                {tab === 'symbols' && (
                    <>
                        <select
                            className="databrowser-filter"
                            value={eraFilter === 'all' ? 'all' : String(eraFilter)}
                            onChange={e => setEraFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        >
                            <option value="all">{t('dataBrowser.allEras', language)}</option>
                            {ERA_ORDER.map(era => (
                                <option key={era} value={era}>
                                    {t(`era.${ERA_KEYS[era]}`, language)} ({eraCounts[era] || 0})
                                </option>
                            ))}
                        </select>
                        <select
                            className="databrowser-filter"
                            value={typeFilter === 'all' ? 'all' : String(typeFilter)}
                            onChange={e => setTypeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        >
                            <option value="all">{t('dataBrowser.allTypes', language)}</option>
                            <option value={SymbolType.FRIENDLY}>🟢 {t('dataBrowser.friendly', language)}</option>
                            <option value={SymbolType.ENEMY}>🔴 {t('dataBrowser.enemy', language)}</option>
                            <option value={SymbolType.COMBAT}>⚔️ {t('dataBrowser.combat', language)}</option>
                        </select>
                    </>
                )}
                {tab === 'enemyEffects' && (
                    <select
                        className="databrowser-filter"
                        value={intensityFilter === 'all' ? 'all' : String(intensityFilter)}
                        onChange={e => setIntensityFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    >
                        <option value="all">{t('dataBrowser.allIntensities', language)}</option>
                        {intensityLevels.map(lvl => (
                            <option key={lvl} value={lvl}>
                                {t('dataBrowser.intensity', language)} {lvl} ({intensityCounts[lvl] || 0})
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Content */}
            <div className="databrowser-content">
                {tab === 'symbols' && (
                    <table className="databrowser-table">
                        <thead>
                            <tr>
                                <SortTh column="id" label="ID" sort={symbolSort} onSort={symSortHandler} className="databrowser-th--id" />
                                <SortTh column="name" label={t('dataBrowser.colName', language)} sort={symbolSort} onSort={symSortHandler} className="databrowser-th--name" />
                                <SortTh column="era" label={t('dataBrowser.colEra', language)} sort={symbolSort} onSort={symSortHandler} className="databrowser-th--era" />
                                <SortTh column="type" label={t('dataBrowser.colType', language)} sort={symbolSort} onSort={symSortHandler} className="databrowser-th--type" />
                                <SortTh column="desc" label={t('dataBrowser.colPlayerDesc', language)} sort={symbolSort} onSort={symSortHandler} className="databrowser-th--desc" />
                                <th className="databrowser-th--desc">{t('dataBrowser.colDesc', language)}</th>
                                <SortTh column="atk" label="ATK" sort={symbolSort} onSort={symSortHandler} className="databrowser-th--stat" />
                                <SortTh column="hp" label="HP" sort={symbolSort} onSort={symSortHandler} className="databrowser-th--stat" />
                                <SortTh column="sprite" label={t('dataBrowser.colSprite', language)} sort={symbolSort} onSort={symSortHandler} className="databrowser-th--sprite" />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSymbols.map(s => (
                                <tr key={s.id} className="databrowser-row">
                                    <td className="databrowser-cell--id">{s.id}</td>
                                    <td className="databrowser-cell--name">{t(`symbol.${s.id}.name`, language)}</td>
                                    <td>
                                        <span
                                            className="databrowser-era-badge"
                                            style={{ borderColor: getSymbolColorHex(s.era), color: getSymbolColorHex(s.era) }}
                                        >
                                            {t(`era.${ERA_KEYS[s.era]}`, language)}
                                        </span>
                                    </td>
                                    <td className="databrowser-cell--type">
                                        {s.symbol_type === SymbolType.FRIENDLY && '🟢'}
                                        {s.symbol_type === SymbolType.ENEMY && '🔴'}
                                        {s.symbol_type === SymbolType.COMBAT && '⚔️'}
                                        {' '}{t(`dataBrowser.${s.symbol_type === SymbolType.FRIENDLY ? 'friendly' : s.symbol_type === SymbolType.ENEMY ? 'enemy' : 'combat'}`, language)}
                                    </td>
                                    <td className="databrowser-cell--desc">{t(`symbol.${s.id}.desc`, language)}</td>
                                    <td className="databrowser-cell--desc databrowser-cell--internal">{
                                        (() => {
                                            const dev = t(`symbol.${s.id}.devDesc`, language);
                                            return dev.startsWith('symbol.') ? t(`symbol.${s.id}.desc`, language) : dev;
                                        })()
                                    }</td>
                                    <td className="databrowser-cell--stat">{s.base_attack ?? '-'}</td>
                                    <td className="databrowser-cell--stat">{s.base_hp ?? '-'}</td>
                                    <td className="databrowser-cell--sprite">{s.sprite || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'relics' && (
                    <table className="databrowser-table">
                        <thead>
                            <tr>
                                <SortTh column="id" label="ID" sort={relicSort} onSort={relSortHandler} className="databrowser-th--id" />
                                <SortTh column="name" label={t('dataBrowser.colName', language)} sort={relicSort} onSort={relSortHandler} className="databrowser-th--name" />
                                <SortTh column="era" label={t('dataBrowser.colEra', language)} sort={relicSort} onSort={relSortHandler} className="databrowser-th--era" />
                                <SortTh column="cost" label={t('dataBrowser.colCost', language)} sort={relicSort} onSort={relSortHandler} className="databrowser-th--cost" />
                                <SortTh column="desc" label={t('dataBrowser.colDesc', language)} sort={relicSort} onSort={relSortHandler} className="databrowser-th--desc" />
                                <SortTh column="sprite" label={t('dataBrowser.colSprite', language)} sort={relicSort} onSort={relSortHandler} className="databrowser-th--sprite" />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRelics.map(r => (
                                <tr key={r.id} className="databrowser-row">
                                    <td className="databrowser-cell--id">{r.id}</td>
                                    <td className="databrowser-cell--name">{r.name}</td>
                                    <td className="databrowser-cell--era">
                                        <span className="databrowser-era-badge" style={{ background: getSymbolColorHex(r.era), color: r.era === Era.RELIGION ? '#000' : '#fff' }}>
                                            {t(`era.${ERA_KEYS[r.era]}`, language)}
                                        </span>
                                    </td>
                                    <td className="databrowser-cell--cost">{r.cost}g</td>
                                    <td className="databrowser-cell--desc">{r.description}</td>
                                    <td className="databrowser-cell--sprite" style={{ color: '#555' }}>
                                        {r.sprite || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'relicCandidates' && (
                    <table className="databrowser-table">
                        <thead>
                            <tr>
                                <SortTh column="id" label="ID" sort={relicCandSort} onSort={rcSortHandler} className="databrowser-th--id" />
                                <SortTh column="name" label={t('dataBrowser.colName', language)} sort={relicCandSort} onSort={rcSortHandler} className="databrowser-th--name" />
                                <SortTh column="era" label={t('dataBrowser.colEra', language)} sort={relicCandSort} onSort={rcSortHandler} className="databrowser-th--era" />
                                <SortTh column="cost" label={t('dataBrowser.colCost', language)} sort={relicCandSort} onSort={rcSortHandler} className="databrowser-th--cost" />
                                <SortTh column="desc" label={t('dataBrowser.colDesc', language)} sort={relicCandSort} onSort={rcSortHandler} className="databrowser-th--desc" />
                                <SortTh column="sprite" label={t('dataBrowser.colSprite', language)} sort={relicCandSort} onSort={rcSortHandler} className="databrowser-th--sprite" />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRelicCandidates.map(r => (
                                <tr key={r.id} className="databrowser-row">
                                    <td className="databrowser-cell--id">{r.id}</td>
                                    <td className="databrowser-cell--name">{r.name}</td>
                                    <td className="databrowser-cell--era">
                                        <span className="databrowser-era-badge" style={{ background: getSymbolColorHex(r.era), color: r.era === Era.RELIGION ? '#000' : '#fff' }}>
                                            {t(`era.${ERA_KEYS[r.era]}`, language)}
                                        </span>
                                    </td>
                                    <td className="databrowser-cell--cost">{r.cost}g</td>
                                    <td className="databrowser-cell--desc">{r.description}</td>
                                    <td className="databrowser-cell--sprite" style={{ color: '#555' }}>
                                        {r.sprite || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'enemyEffects' && (
                    <table className="databrowser-table">
                        <thead>
                            <tr>
                                <SortTh column="id" label="ID" sort={enemySort} onSort={enSortHandler} className="databrowser-th--id" />
                                <SortTh column="intensity" label={t('dataBrowser.colIntensity', language)} sort={enemySort} onSort={enSortHandler} className="databrowser-th--stat" />
                                <SortTh column="type" label={t('dataBrowser.colEffectType', language)} sort={enemySort} onSort={enSortHandler} className="databrowser-th--type" />
                                <SortTh column="food" label="🍖" sort={enemySort} onSort={enSortHandler} className="databrowser-th--stat" />
                                <SortTh column="gold" label="💰" sort={enemySort} onSort={enSortHandler} className="databrowser-th--stat" />
                                <SortTh column="desc" label={t('dataBrowser.colDesc', language)} sort={enemySort} onSort={enSortHandler} className="databrowser-th--desc" />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEnemyEffects.map(e => (
                                <tr key={e.id} className="databrowser-row">
                                    <td className="databrowser-cell--id">{e.id}</td>
                                    <td className="databrowser-cell--stat">
                                        <span className="databrowser-intensity-badge" data-intensity={e.intensity}>
                                            {e.intensity}
                                        </span>
                                    </td>
                                    <td className="databrowser-cell--type">
                                        {EFFECT_TYPE_EMOJI[e.effect_type] || '❓'}{' '}
                                        {t(`dataBrowser.effectType.${e.effect_type}`, language)}
                                    </td>
                                    <td className="databrowser-cell--stat" style={{ color: e.food_penalty > 0 ? '#ef4444' : '#555' }}>
                                        {e.food_penalty > 0 ? `-${e.food_penalty}` : '-'}
                                    </td>
                                    <td className="databrowser-cell--stat" style={{ color: e.gold_penalty > 0 ? '#fbbf24' : '#555' }}>
                                        {e.gold_penalty > 0 ? `-${e.gold_penalty}` : '-'}
                                    </td>
                                    <td className="databrowser-cell--desc">{t(`enemyEffect.${e.id}.desc`, language)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {((tab === 'symbols' && filteredSymbols.length === 0) ||
                    (tab === 'relics' && filteredRelics.length === 0) ||
                    (tab === 'enemyEffects' && filteredEnemyEffects.length === 0)) && (
                        <div className="databrowser-empty">{t('dataBrowser.noResults', language)}</div>
                    )}
            </div>
        </div>
    );
};

export default DataBrowser;
