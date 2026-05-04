import { useState, useMemo, useCallback, useEffect, Fragment } from 'react';
import { SYMBOLS, SymbolType, getSymbolColorHex, isBasePool } from '../game/data/symbolDefinitions';
import { RELICS } from '../game/data/relicDefinitions';
import { ENEMIES } from '../game/data/enemyDefinitions';
import { KNOWLEDGE_UPGRADES } from '../game/data/knowledgeUpgrades';
import { LEADERS } from '../game/data/leaders';
import { useSettingsStore } from '../game/state/settingsStore';
import { useGameStore } from '../game/state/gameStore';
import { t } from '../i18n';
import { EffectText } from './EffectText';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';

type Tab = 'symbols' | 'relics' | 'knowledgeUpgrades' | 'enemies' | 'leaders';
type SortDir = 'asc' | 'desc';
interface SortState { column: string; dir: SortDir; }

const ERA_KEYS: Record<number, string> = {
    [SymbolType.RELIGION]: 'special',
    [SymbolType.NORMAL]: 'normal',
    [SymbolType.ANCIENT]: 'ancient',
    [SymbolType.MEDIEVAL]: 'medieval',
    [SymbolType.MODERN]: 'modern',
    [SymbolType.TERRAIN]: 'terrain',
    [SymbolType.UNIT]: 'unit',
    [SymbolType.ENEMY]: 'enemy',
    [SymbolType.DISASTER]: 'disaster',
    [SymbolType.SPECIAL]: 'specialSymbol',
};



const ERA_ORDER = [SymbolType.ANCIENT, SymbolType.NORMAL, SymbolType.TERRAIN, SymbolType.UNIT, SymbolType.ENEMY, SymbolType.DISASTER, SymbolType.MEDIEVAL, SymbolType.MODERN, SymbolType.RELIGION, SymbolType.SPECIAL];

const ASSET_BASE_URL = import.meta.env.BASE_URL;

/** Sortable column header */
const SortTh = ({ column, label, sort, onSort, className }: {
    column: string; label: React.ReactNode; sort: SortState | null;
    onSort: (col: string) => void; className?: string;
}) => {
    const active = sort?.column === column;
    const arrow = active ? (sort!.dir === 'asc' ? ' ▲' : ' ▼') : '';
    return (
        <th className={className} onClick={() => onSort(column)} style={{ userSelect: 'none' }}>
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


    const [search, setSearch] = useState('');
    const language = useSettingsStore((s) => s.language);
    const { devAddSymbol } = useGameStore();

    // Per-tab sort state
    const [symbolSort, setSymbolSort] = useState<SortState | null>(null);
    const [relicSort, setRelicSort] = useState<SortState | null>(null);
    const [knowledgeUpgradeSort, setKnowledgeUpgradeSort] = useState<SortState | null>(null);
    const [enemySort, setEnemySort] = useState<SortState | null>(null);
    const [leaderSort, setLeaderSort] = useState<SortState | null>(null);

    const tl = useCallback((key: string, fallback: string) => {
        const translated = t(key, language);
        return translated === key ? fallback : translated;
    }, [language]);

    const toggleSort = useCallback((setter: React.Dispatch<React.SetStateAction<SortState | null>>) =>
        (col: string) => {
            setter(prev => {
                if (prev?.column === col) {
                    return prev.dir === 'asc' ? { column: col, dir: 'desc' } : null;
                }
                return { column: col, dir: 'asc' };
            });
        }, []);

    useRegisterBoardTooltipBlock('data-browser', open);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code !== 'F2') return;
            e.preventDefault();
            setOpen((o) => !o);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    // 심볼 슬롯 뷰 모드: 필터/검색/정렬이 없을 때 현재 정의된 최대 ID까지 전체 슬롯 표시
    const SYMBOL_SLOT_MIN = 1;
    const SYMBOL_SLOT_MAX = Math.max(...Object.keys(SYMBOLS).map(Number));
    const isSymbolSlotMode = eraFilter === 'all' && !search.trim() && !symbolSort;

    // 심볼 목록 (필터 + 검색 + 정렬)
    const filteredSymbols = useMemo(() => {
        let list = Object.values(SYMBOLS);

        if (eraFilter !== 'all') {
            list = list.filter(s => s.type === eraFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s => {
                const name = t(`symbol.${s.key}.name`, language).toLowerCase();
                const desc = t(`symbol.${s.key}.desc`, language).toLowerCase();
                return name.includes(q) || desc.includes(q) || String(s.id).includes(q);
            });
        }

        if (symbolSort) {
            const { column, dir } = symbolSort;
            list = [...list].sort((a, b) => {
                let va: unknown, vb: unknown;
                switch (column) {
                    case 'id': va = a.id; vb = b.id; break;
                    case 'name': va = t(`symbol.${a.key}.name`, language); vb = t(`symbol.${b.key}.name`, language); break;
                    case 'era': va = ERA_ORDER.indexOf(a.type); vb = ERA_ORDER.indexOf(b.type); break;
                    case 'type': va = a.type; vb = b.type; break;
                    case 'desc': va = t(`symbol.${a.key}.desc`, language); vb = t(`symbol.${b.key}.desc`, language); break;
                    case 'atk': va = a.base_attack ?? -1; vb = b.base_attack ?? -1; break;
                    case 'hp': va = a.base_hp ?? -1; vb = b.base_hp ?? -1; break;
                    case 'sprite': va = a.sprite || ''; vb = b.sprite || ''; break;
                    case 'basePool': va = isBasePool(a) ? 1 : 0; vb = isBasePool(b) ? 1 : 0; break;
                    default: va = a.id; vb = b.id;
                }
                return genericCompare(va, vb, dir);
            });
        } else {
            list.sort((a, b) => a.id - b.id);
        }

        return list;
    }, [eraFilter, search, language, symbolSort]);

    // 유물 목록
    const filteredRelics = useMemo(() => {
        let list = Object.values(RELICS).filter(r => {
            const name = t(`relic.${r.id}.name`, language).toLowerCase();
            const desc = t(`relic.${r.id}.desc`, language).toLowerCase();
            const q = search.toLowerCase();
            return search === '' || name.includes(q) || desc.includes(q) || String(r.id).includes(q);
        });
        if (relicSort) {
            const { column, dir } = relicSort;
            list = [...list].sort((a, b) => {
                let va: unknown, vb: unknown;
                switch (column) {
                    case 'id': va = a.id; vb = b.id; break;
                    case 'name': va = t(`relic.${a.id}.name`, language); vb = t(`relic.${b.id}.name`, language); break;
                    case 'era': va = ERA_ORDER.indexOf(a.type); vb = ERA_ORDER.indexOf(b.type); break;
                    case 'cost': va = a.cost; vb = b.cost; break;
                    case 'desc': va = t(`relic.${a.id}.desc`, language); vb = t(`relic.${b.id}.desc`, language); break;
                    case 'sprite': va = a.sprite || ''; vb = b.sprite || ''; break;
                    default: va = a.id; vb = b.id;
                }
                return genericCompare(va, vb, dir);
            });
        } else {
            list.sort((a, b) => a.id - b.id);
        }
        return list;
    }, [search, relicSort, language]);

    // 적 유닛 목록
    const filteredEnemies = useMemo(() => {
        let list = Object.values(ENEMIES);

        if (eraFilter !== 'all') {
            list = list.filter(enemy => enemy.type === eraFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(enemy => {
                const name = enemy.name.toLowerCase();
                const desc = enemy.description.toLowerCase();
                return name.includes(q) || desc.includes(q) || String(enemy.id).includes(q);
            });
        }

        if (enemySort) {
            const { column, dir } = enemySort;
            list = [...list].sort((a, b) => {
                let va: unknown, vb: unknown;
                switch (column) {
                    case 'id': va = a.id; vb = b.id; break;
                    case 'name': va = a.name; vb = b.name; break;
                    case 'era': va = ERA_ORDER.indexOf(a.type); vb = ERA_ORDER.indexOf(b.type); break;
                    case 'atk': va = a.base_attack ?? -1; vb = b.base_attack ?? -1; break;
                    case 'hp': va = a.base_hp ?? -1; vb = b.base_hp ?? -1; break;
                    case 'desc': va = a.description; vb = b.description; break;
                    case 'sprite': va = a.sprite || ''; vb = b.sprite || ''; break;
                    default: va = a.id; vb = b.id;
                }
                return genericCompare(va, vb, dir);
            });
        } else {
            list.sort((a, b) => a.id - b.id);
        }

        return list;
    }, [eraFilter, search, enemySort]);

    // 지식 업그레이드 목록
    const filteredKnowledgeUpgrades = useMemo(() => {
        let list = Object.values(KNOWLEDGE_UPGRADES);

        if (eraFilter !== 'all') {
            list = list.filter(u => typeof u.type === 'number' && u.type === eraFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(u => {
                const name = tl(`knowledgeUpgrade.${u.id}.name`, u.name).toLowerCase();
                const desc = tl(`knowledgeUpgrade.${u.id}.desc`, u.description).toLowerCase();
                return name.includes(q) || desc.includes(q) || String(u.id).includes(q);
            });
        }

        if (knowledgeUpgradeSort) {
            const { column, dir } = knowledgeUpgradeSort;
            list = [...list].sort((a, b) => {
                let va: unknown, vb: unknown;
                switch (column) {
                    case 'id': va = a.id; vb = b.id; break;
                    case 'name': va = tl(`knowledgeUpgrade.${a.id}.name`, a.name); vb = tl(`knowledgeUpgrade.${b.id}.name`, b.name); break;
                    case 'era':
                        va = ERA_ORDER.indexOf((typeof a.type === 'number' ? a.type : -1) as SymbolType);
                        vb = ERA_ORDER.indexOf((typeof b.type === 'number' ? b.type : -1) as SymbolType);
                        break;
                    case 'desc': va = tl(`knowledgeUpgrade.${a.id}.desc`, a.description); vb = tl(`knowledgeUpgrade.${b.id}.desc`, b.description); break;
                    case 'sprite': va = a.sprite || ''; vb = b.sprite || ''; break;
                    default: va = a.id; vb = b.id;
                }
                return genericCompare(va, vb, dir);
            });
        } else {
            list.sort((a, b) => a.id - b.id);
        }

        return list;
    }, [eraFilter, search, knowledgeUpgradeSort, tl]);

    // 지도자 목록
    const filteredLeaders = useMemo(() => {
        let list = Object.values(LEADERS);

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(l => {
                const name = t(l.nameKey, language).toLowerCase();
                const desc = t(l.descriptionKey, language).toLowerCase();
                return name.includes(q) || desc.includes(q) || l.id.includes(q);
            });
        }

        if (leaderSort) {
            const { column, dir } = leaderSort;
            list = [...list].sort((a, b) => {
                let va: unknown, vb: unknown;
                const aSprite = a.id === 'ramesses' ? '001.png' : a.id === 'shihuang' ? '002.png' : '-';
                const bSprite = b.id === 'ramesses' ? '001.png' : b.id === 'shihuang' ? '002.png' : '-';

                switch (column) {
                    case 'id': va = a.id; vb = b.id; break;
                    case 'name': va = t(a.nameKey, language); vb = t(b.nameKey, language); break;
                    case 'desc': va = t(a.descriptionKey, language); vb = t(b.descriptionKey, language); break;
                    case 'sprite': va = aSprite; vb = bSprite; break;
                    default: va = a.id; vb = b.id;
                }
                return genericCompare(va, vb, dir);
            });
        }

        return list;
    }, [search, leaderSort, language]);

    // 시대별 카운트
    const eraCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        const all = Object.values(SYMBOLS);
        for (const era of ERA_ORDER) {
            counts[era] = all.filter(s => s.type === era).length;
        }
        return counts;
    }, []);



    if (!open) return null;

    const symSortHandler = toggleSort(setSymbolSort);
    const relSortHandler = toggleSort(setRelicSort);
    const kuSortHandler = toggleSort(setKnowledgeUpgradeSort);
    const enSortHandler = toggleSort(setEnemySort);
    const leaderSortHandler = toggleSort(setLeaderSort);

    return (
        <div className="databrowser">
            {/* Header */}
            <div className="databrowser-header">
                <div className="databrowser-header-left">
                    <span className="databrowser-title">📦 {t('dataBrowser.title', language)}</span>
                    <span className="databrowser-hint">F2</span>
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
                    className={`databrowser-tab ${tab === 'knowledgeUpgrades' ? 'databrowser-tab--active' : ''}`}
                    onClick={() => setTab('knowledgeUpgrades')}
                >
                    {t('dataBrowser.knowledgeUpgrades', language)} ({Object.keys(KNOWLEDGE_UPGRADES).length})
                </button>
                <button
                    className={`databrowser-tab ${tab === 'enemies' ? 'databrowser-tab--active' : ''}`}
                    onClick={() => setTab('enemies')}
                >
                    {t('dataBrowser.enemies', language)} ({Object.keys(ENEMIES).length})
                </button>
                <button
                    className={`databrowser-tab ${tab === 'leaders' ? 'databrowser-tab--active' : ''}`}
                    onClick={() => setTab('leaders')}
                >
                    지도자 ({Object.keys(LEADERS).length})
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

                    </>
                )}
                {(tab === 'enemies' || tab === 'knowledgeUpgrades') && (
                    <select
                        className="databrowser-filter"
                        value={eraFilter === 'all' ? 'all' : String(eraFilter)}
                        onChange={e => setEraFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    >
                        <option value="all">{t('dataBrowser.allEras', language)}</option>
                        {ERA_ORDER.map(era => (
                            <option key={era} value={era}>
                                {t(`era.${ERA_KEYS[era]}`, language)}
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

                                <SortTh column="desc" label={t('dataBrowser.colDesc', language)} sort={symbolSort} onSort={symSortHandler} className="databrowser-th--desc" />
                                <SortTh column="basePool" label={t('dataBrowser.colBasePool', language)} sort={symbolSort} onSort={symSortHandler} className="databrowser-th--id" />
                                <SortTh column="atk" label="ATK" sort={symbolSort} onSort={symSortHandler} className="databrowser-th--stat" />
                                <SortTh column="hp" label="HP" sort={symbolSort} onSort={symSortHandler} className="databrowser-th--stat" />
                                <SortTh column="sprite" label={t('dataBrowser.colSprite', language)} sort={symbolSort} onSort={symSortHandler} className="databrowser-th--sprite" />
                                <th className="databrowser-th--action" style={{ width: '80px', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isSymbolSlotMode
                                ? Array.from({ length: SYMBOL_SLOT_MAX - SYMBOL_SLOT_MIN + 1 }, (_, i) => i + SYMBOL_SLOT_MIN).map(slotId => {
                                    const s = SYMBOLS[slotId];
                                    if (!s) {
                                        return (
                                            <tr key={slotId} className="databrowser-row" style={{ opacity: 0.4 }}>
                                                <td className="databrowser-cell--id">{slotId}</td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        );
                                    }
                                    return (
                                        <tr key={s.id} className="databrowser-row">
                                            <td className="databrowser-cell--id">{s.id}</td>
                                            <td className="databrowser-cell--name">{t(`symbol.${s.key}.name`, language)}</td>
                                            <td>
                                                <span
                                                    style={{
                                                        color: getSymbolColorHex(s.type),
                                                        fontWeight: 'bold',
                                                        fontSize: '15px',
                                                        letterSpacing: '1px',
                                                        textShadow: `0 0 6px ${getSymbolColorHex(s.type)}80`
                                                    }}
                                                >
                                                    [{t(`era.${ERA_KEYS[s.type]}`, language)}]
                                                </span>
                                            </td>

                                            <td className="databrowser-cell--desc"><EffectText text={t(`symbol.${s.key}.desc`, language)} /></td>
                                            <td className="databrowser-cell--stat" style={{ textAlign: 'center' }}>{isBasePool(s) ? 'O' : 'X'}</td>
                                            <td className="databrowser-cell--stat">{s.base_attack ?? '-'}</td>
                                            <td className="databrowser-cell--stat">{s.base_hp ?? '-'}</td>
                                            <td className="databrowser-cell--sprite">{s.sprite || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button onClick={() => devAddSymbol(s.id)} style={{ padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px' }}>Add</button>
                                            </td>
                                        </tr>
                                    );
                                })
                                : filteredSymbols.map(s => (
                                    <tr key={s.id} className="databrowser-row">
                                        <td className="databrowser-cell--id">{s.id}</td>
                                        <td className="databrowser-cell--name">{t(`symbol.${s.key}.name`, language)}</td>
                                        <td>
                                            <span
                                                style={{
                                                    color: getSymbolColorHex(s.type),
                                                    fontWeight: 'bold',
                                                    fontSize: '15px',
                                                    letterSpacing: '1px',
                                                    textShadow: `0 0 6px ${getSymbolColorHex(s.type)}80`
                                                }}
                                            >
                                                [{t(`era.${ERA_KEYS[s.type]}`, language)}]
                                            </span>
                                        </td>

                                        <td className="databrowser-cell--desc"><EffectText text={t(`symbol.${s.key}.desc`, language)} /></td>
                                        <td className="databrowser-cell--stat" style={{ textAlign: 'center' }}>{isBasePool(s) ? 'O' : 'X'}</td>
                                        <td className="databrowser-cell--stat">{s.base_attack ?? '-'}</td>
                                        <td className="databrowser-cell--stat">{s.base_hp ?? '-'}</td>
                                        <td className="databrowser-cell--sprite">{s.sprite || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button onClick={() => devAddSymbol(s.id)} style={{ padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px' }}>Add</button>
                                        </td>
                                    </tr>
                                ))
                            }
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
                                    <td className="databrowser-cell--name">{t(`relic.${r.id}.name`, language)}</td>
                                    <td className="databrowser-cell--era">
                                        <span style={{
                                            color: getSymbolColorHex(r.type),
                                            fontWeight: 'bold',
                                            fontSize: '15px',
                                            letterSpacing: '1px',
                                            textShadow: `0 0 6px ${getSymbolColorHex(r.type)}80`
                                        }}>
                                            [{t(`era.${ERA_KEYS[r.type]}`, language)}]
                                        </span>
                                    </td>
                                    <td className="databrowser-cell--cost">{r.cost}g</td>
                                    <td className="databrowser-cell--desc"><EffectText text={t(`relic.${r.id}.desc`, language)} /></td>
                                    <td className="databrowser-cell--sprite" style={{ color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {r.sprite && r.sprite !== '-' && r.sprite !== '-.png' ? (
                                            <>
                                                <img src={`${ASSET_BASE_URL}assets/relics/${r.sprite}`} alt={t(`relic.${r.id}.name`, language)} style={{ width: '28px', height: '28px', imageRendering: 'pixelated', objectFit: 'contain' }} />
                                                <span style={{ fontSize: '11px', color: '#888' }}>{r.sprite}</span>
                                            </>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'enemies' && (
                    <table className="databrowser-table">
                        <thead>
                            <tr>
                                <SortTh column="id" label="ID" sort={enemySort} onSort={enSortHandler} className="databrowser-th--id" />
                                <SortTh column="name" label={t('dataBrowser.colName', language)} sort={enemySort} onSort={enSortHandler} className="databrowser-th--name" />
                                <SortTh column="era" label={t('dataBrowser.colEra', language)} sort={enemySort} onSort={enSortHandler} className="databrowser-th--era" />
                                <SortTh column="desc" label={t('dataBrowser.colDesc', language)} sort={enemySort} onSort={enSortHandler} className="databrowser-th--desc" />
                                <SortTh column="atk" label="ATK" sort={enemySort} onSort={enSortHandler} className="databrowser-th--stat" />
                                <SortTh column="hp" label="HP" sort={enemySort} onSort={enSortHandler} className="databrowser-th--stat" />
                                <SortTh column="sprite" label={t('dataBrowser.colSprite', language)} sort={enemySort} onSort={enSortHandler} className="databrowser-th--sprite" />
                                <th className="databrowser-th--action" style={{ width: '80px', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEnemies.map(s => (
                                <tr key={s.id} className="databrowser-row">
                                    <td className="databrowser-cell--id">{s.id}</td>
                                    <td className="databrowser-cell--name">{s.name}</td>
                                    <td>
                                        <span style={{ color: getSymbolColorHex(s.type), fontWeight: 'bold' }}>
                                            [{t(`era.${ERA_KEYS[s.type]}`, language)}]
                                        </span>
                                    </td>
                                    <td className="databrowser-cell--desc"><EffectText text={s.description} /></td>
                                    <td className="databrowser-cell--stat">{s.base_attack ?? '-'}</td>
                                    <td className="databrowser-cell--stat">{s.base_hp ?? '-'}</td>
                                    <td className="databrowser-cell--sprite">{s.sprite || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button onClick={() => devAddSymbol(s.id)} style={{ padding: '4px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px' }}>Add</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {tab === 'leaders' && (
                    <table className="databrowser-table">
                        <thead>
                            <tr>
                                <SortTh column="id" label="ID" sort={leaderSort} onSort={leaderSortHandler} className="databrowser-th--id" />
                                <SortTh column="name" label={t('dataBrowser.colName', language)} sort={leaderSort} onSort={leaderSortHandler} className="databrowser-th--name" />
                                <SortTh column="desc" label={t('dataBrowser.colDesc', language)} sort={leaderSort} onSort={leaderSortHandler} className="databrowser-th--desc" />
                                <th className="databrowser-th--stat" style={{ textAlign: 'center' }}>시작 식량</th>
                                <th className="databrowser-th--stat" style={{ textAlign: 'center' }}>시작 골드</th>
                                <SortTh column="sprite" label={t('dataBrowser.colSprite', language)} sort={leaderSort} onSort={leaderSortHandler} className="databrowser-th--sprite" />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeaders.map(l => {
                                const sprite = l.id === 'ramesses' ? '001.png' : l.id === 'shihuang' ? '002.png' : '-';
                                return (
                                <Fragment key={l.id}>
                                    <tr className="databrowser-row" style={l.enabled ? {} : { opacity: 0.4 }}>
                                        <td className="databrowser-cell--id">{l.id}</td>
                                        <td className="databrowser-cell--name">{t(l.nameKey, language)} {!l.enabled && <span style={{fontSize: '11px', color: '#999', marginLeft: '4px'}}>(Locked)</span>}</td>
                                        <td className="databrowser-cell--desc">
                                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                                                <EffectText text={t(l.descriptionKey, language)} />
                                            </span>
                                        </td>
                                        <td className="databrowser-cell--stat" style={{ textAlign: 'center' }}>{l.startingFood}</td>
                                        <td className="databrowser-cell--stat" style={{ textAlign: 'center' }}>{l.startingGold}</td>
                                        <td className="databrowser-cell--sprite" style={{ color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {sprite !== '-' ? (
                                                <>
                                                    <img src={`${ASSET_BASE_URL}assets/leaders/${sprite}`} alt={t(l.nameKey, language)} style={{ width: '28px', height: '28px', imageRendering: 'pixelated', objectFit: 'cover', borderRadius: '50%' }} />
                                                    <span style={{ fontSize: '11px', color: '#888' }}>{sprite}</span>
                                                </>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                    <tr className="databrowser-row" style={l.enabled ? {} : { opacity: 0.4 }}>
                                        <td colSpan={2} style={{ borderTop: 'none', background: 'rgba(0,0,0,0.1)' }}></td>
                                        <td colSpan={4} className="databrowser-cell--desc" style={{ borderTop: 'none', background: 'rgba(0,0,0,0.1)', paddingBottom: '12px' }}>
                                            {l.enabled ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div>
                                                        <strong style={{ color: '#6ee7b7' }}>[{t(l.mainEffectNameKey, language)}]</strong>{' '}
                                                        <EffectText text={t(l.mainEffectDescKey, language)} />
                                                    </div>
                                                    <div>
                                                        <strong style={{ color: '#93c5fd' }}>[{t(l.subEffectNameKey, language)}]</strong>{' '}
                                                        <EffectText text={t(l.subEffectDescKey, language)} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ color: '#555', fontStyle: 'italic' }}>효과 없음</div>
                                            )}
                                        </td>
                                    </tr>
                                </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {tab === 'knowledgeUpgrades' && (
                    <table className="databrowser-table">
                        <thead>
                            <tr>
                                <SortTh column="id" label="ID" sort={knowledgeUpgradeSort} onSort={kuSortHandler} className="databrowser-th--id" />
                                <SortTh column="name" label={t('dataBrowser.colName', language)} sort={knowledgeUpgradeSort} onSort={kuSortHandler} className="databrowser-th--name" />
                                <SortTh column="era" label={t('dataBrowser.colEra', language)} sort={knowledgeUpgradeSort} onSort={kuSortHandler} className="databrowser-th--era" />
                                <SortTh column="desc" label={t('dataBrowser.colDesc', language)} sort={knowledgeUpgradeSort} onSort={kuSortHandler} className="databrowser-th--desc" />
                                <SortTh column="sprite" label={t('dataBrowser.colSprite', language)} sort={knowledgeUpgradeSort} onSort={kuSortHandler} className="databrowser-th--sprite" />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredKnowledgeUpgrades.map(u => (
                                <tr key={u.id} className="databrowser-row">
                                    <td className="databrowser-cell--id">{u.id}</td>
                                    <td className="databrowser-cell--name">{tl(`knowledgeUpgrade.${u.id}.name`, u.name)}</td>
                                    <td>
                                        {(() => {
                                            if (typeof u.type === 'number') {
                                                const typeHex = getSymbolColorHex(u.type as SymbolType);
                                                const eraKey = ERA_KEYS[u.type as SymbolType];
                                                return (
                                                    <span style={{ color: typeHex, fontWeight: 'bold' }}>
                                                        [{t(`era.${eraKey}`, language)}]
                                                    </span>
                                                );
                                            }

                                            const leaderName = t(`leader.${u.type}.name`, language);
                                            const leaderColor =
                                                u.type === 'ramesses' ? '#f59e0b' : u.type === 'shihuang' ? '#dc2626' : '#60a5fa';
                                            return (
                                                <span style={{ color: leaderColor, fontWeight: 'bold' }}>
                                                    [{leaderName}]
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="databrowser-cell--desc"><EffectText text={tl(`knowledgeUpgrade.${u.id}.desc`, u.description)} /></td>
                                    <td className="databrowser-cell--sprite">{u.sprite || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}



                {((tab === 'symbols' && filteredSymbols.length === 0) ||
                    (tab === 'relics' && filteredRelics.length === 0) ||
                    (tab === 'knowledgeUpgrades' && filteredKnowledgeUpgrades.length === 0) ||
                    (tab === 'enemies' && filteredEnemies.length === 0)) && (
                        <div className="databrowser-empty">{t('dataBrowser.noResults', language)}</div>
                    )}
            </div>
        </div>
    );
};

export default DataBrowser;
