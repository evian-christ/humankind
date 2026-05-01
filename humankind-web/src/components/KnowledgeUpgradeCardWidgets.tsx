import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore } from '../game/state/settingsStore';
import { getSymbolColorHex, SYMBOLS_BY_KEY, SymbolType, type SymbolDefinition, type SymbolKey } from '../game/data/symbolDefinitions';
import {
    getKnowledgeUpgradePrerequisiteClosure,
    type KnowledgeUpgradeDescSymbol,
    type KnowledgeUpgradeDescSymbolKey,
    type KnowledgeUpgradeSymbolRelation,
} from '../game/data/knowledgeUpgrades';
import { useGameStore } from '../game/state/gameStore';
import { getBoardSymbolTooltipDesc, t } from '../i18n';
import { EffectText } from './EffectText';

const RELATION_BADGE: Record<KnowledgeUpgradeSymbolRelation, string> = {
    pool_add: '+',
    effect_modify: '~',
    pool_remove: '−',
};

const ERA_NAME_KEYS: Record<number, string> = {
    [SymbolType.RELIGION]: 'era.special',
    [SymbolType.NORMAL]: 'era.normal',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
    [SymbolType.ANCIENT]: 'era.ancient',
    [SymbolType.UNIT]: 'era.normal',
    [SymbolType.ENEMY]: 'era.normal',
    [SymbolType.DISASTER]: 'era.normal',
};

const ASSET_BASE_URL = import.meta.env.BASE_URL;

const UPGRADE_DESC_SYMBOL_TIP_W = 280;
const UPGRADE_DESC_SYMBOL_COMPARE_TIP_W = 300;

function normalizeDescForCompare(s: string): string {
    return s.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripSymbolNamePrefix(desc: string, symbolName: string): string {
    const prefix = new RegExp(`^\\s*${escapeRegExp(symbolName)}\\s*:\\s*`, 'i');
    return desc
        .split('\n')
        .map((line) => line.replace(prefix, ''))
        .join('\n');
}

function upgradeCompareUnlocks(upgradeId: number, includeUpgrade: boolean): number[] {
    const prereqs = getKnowledgeUpgradePrerequisiteClosure(upgradeId);
    return includeUpgrade ? [...new Set([...prereqs, upgradeId])] : prereqs;
}

/** 풀에서 제거된 심볼 — 업그레이드 칩·툴팁만 (i18n symbol.* 유지) */
const DESC_ONLY_SYMBOL_VISUAL: Partial<
    Record<KnowledgeUpgradeDescSymbolKey, Pick<SymbolDefinition, 'key' | 'sprite' | 'type'>>
> = {
    aqueduct: { key: 'aqueduct', sprite: '056.png', type: SymbolType.NORMAL },
    rye: { key: 'rye', sprite: '057.png', type: SymbolType.NORMAL },
    hay: { key: 'hay', sprite: '051.png', type: SymbolType.NORMAL },
};

export function resolveUpgradeDescSymbolVisual(
    symbolKey: KnowledgeUpgradeDescSymbolKey,
): Pick<SymbolDefinition, 'key' | 'sprite' | 'type'> | null {
    const live = SYMBOLS_BY_KEY[symbolKey as SymbolKey];
    if (live) return { key: live.key, sprite: live.sprite, type: live.type };
    return DESC_ONLY_SYMBOL_VISUAL[symbolKey] ?? null;
}

export const UpgradeCardDescSymbols = ({
    upgradeId,
    entries,
    layoutSize = 'default',
}: {
    upgradeId: number;
    entries: KnowledgeUpgradeDescSymbol[];
    /** `panel`: knowledge tree right-hand detail column (larger type) */
    layoutSize?: 'default' | 'panel';
}) => {
    const language = useSettingsStore((s) => s.language);
    const unlockedKnowledgeUpgrades = useGameStore((s) => s.unlockedKnowledgeUpgrades ?? []);
    const [hover, setHover] = useState<{
        symbolKey: KnowledgeUpgradeDescSymbolKey;
        relation: KnowledgeUpgradeSymbolRelation;
        anchorRight: number;
        anchorTop: number;
    } | null>(null);

    if (entries.length === 0) return null;

    const isPanel = layoutSize === 'panel';
    const symbolsColGap = isPanel ? '18px' : '16px';
    const groupRowGap = isPanel ? '10px' : '8px';
    const relLabelFontPx = isPanel ? '18px' : '16px';
    const relPrefixFontPx = isPanel ? '20px' : '18px';

    const showTooltip = (symbolKey: KnowledgeUpgradeDescSymbolKey, relation: KnowledgeUpgradeSymbolRelation, el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        setHover({ symbolKey, relation, anchorRight: r.right, anchorTop: r.top });
    };

    const tooltipContent = hover && (() => {
        const def = resolveUpgradeDescSymbolVisual(hover.symbolKey);
        if (!def) return null;
        const symbolName = t(`symbol.${def.key}.name`, language);
        const eraColor = getSymbolColorHex(def.type);
        const eraName = t(ERA_NAME_KEYS[def.type] ?? 'era.ancient', language);
        const isModify = hover.relation === 'effect_modify';
        const beforeCanonical = isModify
            ? stripSymbolNamePrefix(
                getBoardSymbolTooltipDesc(
                    hover.symbolKey,
                    language,
                    upgradeCompareUnlocks(upgradeId, false),
                ),
                symbolName,
            )
            : '';
        const afterResolved = isModify
            ? stripSymbolNamePrefix(
                getBoardSymbolTooltipDesc(
                    hover.symbolKey,
                    language,
                    upgradeCompareUnlocks(upgradeId, true),
                ),
                symbolName,
            )
            : null;
        const hasCompare =
            isModify &&
            normalizeDescForCompare(beforeCanonical) !== normalizeDescForCompare(afterResolved ?? '');
        const tipW = isModify && hasCompare ? UPGRADE_DESC_SYMBOL_COMPARE_TIP_W : UPGRADE_DESC_SYMBOL_TIP_W;
        let left = hover.anchorRight + 10;
        const top = Math.max(8, hover.anchorTop);
        if (typeof window !== 'undefined' && left + tipW > window.innerWidth - 8) {
            left = Math.max(8, hover.anchorRight - tipW - 10);
        }
        return (
            <div
                className="symbol-tooltip"
                style={{
                    position: 'fixed',
                    left,
                    top,
                    zIndex: 600,
                    maxWidth: tipW,
                    pointerEvents: 'none',
                }}
                role="tooltip"
            >
                <div className="symbol-tooltip-name">{symbolName}</div>
                <div
                    className="symbol-tooltip-rarity"
                    style={{
                        color: eraColor,
                        fontWeight: 'bold',
                        fontSize: '16px',
                        letterSpacing: '2px',
                        textShadow: `0 0 10px ${eraColor}80`,
                        marginTop: '4px',
                    }}
                >
                    {eraName}
                </div>
                {isModify && hasCompare ? (
                    <div className="upgrade-effect-compare">
                        <div className="upgrade-effect-compare-block upgrade-effect-compare-block--before">
                            <div className="upgrade-effect-compare-label">
                                {t('knowledgeUpgrade.effectCompare.beforeLabel', language)}
                            </div>
                            <div className="upgrade-effect-compare-body symbol-tooltip-desc">
                                {beforeCanonical.split('\n').map((line, i) => (
                                    <div key={i} className="symbol-tooltip-desc-line">
                                        <EffectText text={line} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="upgrade-effect-compare-block upgrade-effect-compare-block--after">
                            <div className="upgrade-effect-compare-label">
                                {t('knowledgeUpgrade.effectCompare.afterLabel', language)}
                            </div>
                            <div className="upgrade-effect-compare-body symbol-tooltip-desc">
                                {(afterResolved ?? '').split('\n').map((line, i) => (
                                    <div key={i} className="symbol-tooltip-desc-line">
                                        <EffectText text={line} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="symbol-tooltip-desc" style={{ marginTop: '8px' }}>
                        {(isModify && afterResolved
                            ? afterResolved
                            : getBoardSymbolTooltipDesc(hover.symbolKey, language, unlockedKnowledgeUpgrades))
                            .split('\n')
                            .map((line, i) => (
                                <div key={i} className="symbol-tooltip-desc-line">
                                    <EffectText text={line} />
                                </div>
                            ))}
                    </div>
                )}
            </div>
        );
    })();

    return (
        <>
            <div
                className="upgrade-card-desc-symbols"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                style={{ display: 'flex', flexDirection: 'column', gap: symbolsColGap }}
            >
                {(['pool_add', 'effect_modify', 'pool_remove'] as KnowledgeUpgradeSymbolRelation[]).map((rel) => {
                    const group = entries.filter(e => e.relation === rel);
                    if (group.length === 0) return null;
                    const relInfo = rel === 'pool_add'
                        ? { prefix: '+', color: '#4ade80', text: '추가되는 심볼' }
                        : rel === 'effect_modify'
                        ? { prefix: '~', color: '#facc15', text: '변경되는 심볼' }
                        : { prefix: '-', color: '#f87171', text: '제거되는 심볼' };
                    return (
                        <div key={rel} style={{ display: 'flex', flexDirection: 'column', gap: groupRowGap }}>
                            <div style={{ fontSize: relLabelFontPx, color: '#94a3b8', fontFamily: 'Mulmaru, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: relInfo.color, fontWeight: '900', fontSize: relPrefixFontPx }}>{relInfo.prefix}</span>
                                {relInfo.text}
                            </div>
                            <div className="upgrade-card-desc-symbol-chips">
                                {group.map(({ symbolKey, relation }) => {
                                    const def = resolveUpgradeDescSymbolVisual(symbolKey);
                                    if (!def) return null;
                                    const src =
                                        def.sprite && def.sprite !== '-' && def.sprite !== '-.png'
                                            ? `${ASSET_BASE_URL}assets/symbols/${def.sprite}`
                                            : undefined;
                                    const symName = t(`symbol.${symbolKey}.name`, language);
                                    return (
                                        <button
                                            key={`${symbolKey}-${relation}`}
                                            type="button"
                                            className={`upgrade-card-desc-symbol-chip upgrade-card-desc-symbol-chip--${relation}`}
                                            aria-label={symName}
                                            onMouseEnter={(e) => showTooltip(symbolKey, relation, e.currentTarget)}
                                            onMouseLeave={() => setHover(null)}
                                            onFocus={(e) => showTooltip(symbolKey, relation, e.currentTarget)}
                                            onBlur={() => setHover(null)}
                                        >
                                            <span
                                                className={`upgrade-card-desc-symbol-badge upgrade-card-desc-symbol-badge--${relation}`}
                                                aria-hidden
                                            >
                                                {RELATION_BADGE[relation]}
                                            </span>
                                            {src ? (
                                                <img src={src} alt="" className="upgrade-card-desc-symbol-img" />
                                            ) : (
                                                <span className="upgrade-card-desc-symbol-fallback">{symName}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            {tooltipContent && typeof document !== 'undefined'
                ? createPortal(tooltipContent, document.body)
                : null}
        </>
    );
};
