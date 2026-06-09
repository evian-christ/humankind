import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore } from '../game/state/settingsStore';
import { getSymbolColorHex, SYMBOLS_BY_KEY, SymbolType, type SymbolDefinition, type SymbolKey } from '../game/data/symbolDefinitions';
import {
    getKnowledgeUpgradePrerequisiteClosure,
    type KnowledgeUpgradeDescRelic,
    type KnowledgeUpgradeDescSymbol,
    type KnowledgeUpgradeDescSymbolKey,
    type KnowledgeUpgradeSymbolRelation,
} from '../game/data/knowledgeUpgrades';
import { useGameStore } from '../game/state/gameStore';
import { getBoardSymbolTooltipDesc, t } from '../i18n';
import { EffectText } from './EffectText';
import { getSymbolSpriteUrl } from '../game/data/symbolSpritePaths';
import { getRelicRarityColorHex, RELICS } from '../game/data/relicDefinitions';

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
    [SymbolType.DISASTER]: 'era.disaster',
    [SymbolType.SPECIAL]: 'era.specialSymbol',
};

const UPGRADE_DESC_SYMBOL_TIP_W = 280;
const UPGRADE_DESC_SYMBOL_COMPARE_TIP_W = 300;
const ASSET_BASE_URL = import.meta.env.BASE_URL;

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
    Record<KnowledgeUpgradeDescSymbolKey, Pick<SymbolDefinition, 'key' | 'sprite' | 'type'> & { spriteUrl?: string }>
> = {
    aqueduct: { key: 'aqueduct', sprite: '-', type: SymbolType.NORMAL },
    rye: { key: 'rye', sprite: '-', type: SymbolType.NORMAL },
    hay: { key: 'hay', sprite: '-', type: SymbolType.NORMAL },
};

function resolveUpgradeDescSymbolVisual(
    symbolKey: KnowledgeUpgradeDescSymbolKey,
): (Pick<SymbolDefinition, 'key' | 'sprite' | 'type'> & { spriteUrl?: string }) | SymbolDefinition | null {
    const live = SYMBOLS_BY_KEY[symbolKey as SymbolKey];
    if (live) return live;
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
        anchorLeft: number;
        anchorRight: number;
        anchorTop: number;
        anchorBottom: number;
    } | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number } | null>(null);

    useLayoutEffect(() => {
        if (!hover) return;

        const updateTooltipSize = () => {
            const el = tooltipRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            setTooltipSize((prev) => {
                const next = { width: Math.ceil(r.width), height: Math.ceil(r.height) };
                if (prev && prev.width === next.width && prev.height === next.height) return prev;
                return next;
            });
        };

        updateTooltipSize();
        window.addEventListener('resize', updateTooltipSize);
        return () => window.removeEventListener('resize', updateTooltipSize);
    }, [hover]);

    if (entries.length === 0) return null;

    const isPanel = layoutSize === 'panel';
    const symbolsColGap = isPanel ? '18px' : '16px';
    const groupRowGap = isPanel ? '10px' : '8px';
    const relLabelFontPx = isPanel ? '18px' : '16px';
    const relPrefixFontPx = isPanel ? '20px' : '18px';

    const showTooltip = (symbolKey: KnowledgeUpgradeDescSymbolKey, relation: KnowledgeUpgradeSymbolRelation, el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        setTooltipSize(null);
        setHover({
            symbolKey,
            relation,
            anchorLeft: r.left,
            anchorRight: r.right,
            anchorTop: r.top,
            anchorBottom: r.bottom,
        });
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
        const margin = 10;
        const minInset = 8;
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
        const measuredWidth = tooltipSize?.width ?? tipW;
        const measuredHeight = tooltipSize?.height ?? 0;
        let left = hover.anchorRight + margin;
        if (left + measuredWidth > viewportWidth - minInset) {
            left = hover.anchorLeft - measuredWidth - margin;
        }
        left = Math.min(
            Math.max(minInset, left),
            Math.max(minInset, viewportWidth - measuredWidth - minInset),
        );
        const anchorCenterY = (hover.anchorTop + hover.anchorBottom) / 2;
        const alignTopToAnchor = anchorCenterY <= viewportHeight / 2;
        const preferredTop = alignTopToAnchor || measuredHeight <= 0
            ? hover.anchorTop
            : hover.anchorBottom - measuredHeight;
        const top = measuredHeight > 0
            ? Math.min(
                Math.max(minInset, preferredTop),
                Math.max(minInset, viewportHeight - measuredHeight - minInset),
            )
            : Math.max(minInset, preferredTop);
        const maxHeight = Math.max(120, viewportHeight - minInset * 2);
        return (
            <div
                ref={tooltipRef}
                className="symbol-tooltip"
                style={{
                    position: 'fixed',
                    left,
                    top,
                    zIndex: 600,
                    maxWidth: tipW,
                    maxHeight,
                    overflowY: 'auto',
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
                        ? { prefix: '+', color: '#4ade80', text: t('knowledgeUpgrade.symbolRelation.pool_add', language) }
                        : rel === 'effect_modify'
                        ? { prefix: '~', color: '#facc15', text: t('knowledgeUpgrade.symbolRelation.effect_modify', language) }
                        : { prefix: '-', color: '#f87171', text: t('knowledgeUpgrade.symbolRelation.pool_remove', language) };
                    return (
                        <div key={rel} style={{ display: 'flex', flexDirection: 'column', gap: groupRowGap }}>
                            <div style={{ fontSize: relLabelFontPx, color: '#94a3b8', fontFamily: 'var(--game-font-family), sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: relInfo.color, fontWeight: '900', fontSize: relPrefixFontPx }}>{relInfo.prefix}</span>
                                {relInfo.text}
                            </div>
                            <div className="upgrade-card-desc-symbol-chips">
                                {group.map(({ symbolKey, relation }) => {
                                    const def = resolveUpgradeDescSymbolVisual(symbolKey);
                                    if (!def) return null;
                                    const src = 'id' in def ? getSymbolSpriteUrl(def) : def.spriteUrl;
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

export const UpgradeCardDescRelics = ({
    entries,
    layoutSize = 'default',
}: {
    entries: KnowledgeUpgradeDescRelic[];
    layoutSize?: 'default' | 'panel';
}) => {
    const language = useSettingsStore((s) => s.language);
    const [hover, setHover] = useState<{
        relicId: number;
        anchorLeft: number;
        anchorRight: number;
        anchorTop: number;
        anchorBottom: number;
    } | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number } | null>(null);

    useLayoutEffect(() => {
        if (!hover) return;

        const updateTooltipSize = () => {
            const el = tooltipRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            setTooltipSize((prev) => {
                const next = { width: Math.ceil(r.width), height: Math.ceil(r.height) };
                if (prev && prev.width === next.width && prev.height === next.height) return prev;
                return next;
            });
        };

        updateTooltipSize();
        window.addEventListener('resize', updateTooltipSize);
        return () => window.removeEventListener('resize', updateTooltipSize);
    }, [hover]);

    if (entries.length === 0) return null;

    const isPanel = layoutSize === 'panel';
    const symbolsColGap = isPanel ? '18px' : '16px';
    const groupRowGap = isPanel ? '10px' : '8px';
    const relLabelFontPx = isPanel ? '18px' : '16px';
    const relPrefixFontPx = isPanel ? '20px' : '18px';

    const showTooltip = (relicId: number, el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        setTooltipSize(null);
        setHover({
            relicId,
            anchorLeft: r.left,
            anchorRight: r.right,
            anchorTop: r.top,
            anchorBottom: r.bottom,
        });
    };

    const tooltipContent = hover && (() => {
        const relic = RELICS[hover.relicId];
        if (!relic) return null;
        const relicName = t(`relic.${relic.id}.name`, language);
        const rarityColor = getRelicRarityColorHex(relic.rarity);
        const rarityName = t(`rarity.${relic.rarity}`, language) || relic.rarity;
        const tipW = UPGRADE_DESC_SYMBOL_TIP_W;
        const margin = 10;
        const minInset = 8;
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
        const measuredWidth = tooltipSize?.width ?? tipW;
        const measuredHeight = tooltipSize?.height ?? 0;
        let left = hover.anchorRight + margin;
        if (left + measuredWidth > viewportWidth - minInset) {
            left = hover.anchorLeft - measuredWidth - margin;
        }
        left = Math.min(
            Math.max(minInset, left),
            Math.max(minInset, viewportWidth - measuredWidth - minInset),
        );
        const anchorCenterY = (hover.anchorTop + hover.anchorBottom) / 2;
        const alignTopToAnchor = anchorCenterY <= viewportHeight / 2;
        const preferredTop = alignTopToAnchor || measuredHeight <= 0
            ? hover.anchorTop
            : hover.anchorBottom - measuredHeight;
        const top = measuredHeight > 0
            ? Math.min(
                Math.max(minInset, preferredTop),
                Math.max(minInset, viewportHeight - measuredHeight - minInset),
            )
            : Math.max(minInset, preferredTop);
        const maxHeight = Math.max(120, viewportHeight - minInset * 2);

        return (
            <div
                ref={tooltipRef}
                className="symbol-tooltip"
                style={{
                    position: 'fixed',
                    left,
                    top,
                    zIndex: 600,
                    maxWidth: tipW,
                    maxHeight,
                    overflowY: 'auto',
                    pointerEvents: 'none',
                }}
                role="tooltip"
            >
                <div className="symbol-tooltip-name">{relicName}</div>
                <div
                    className="symbol-tooltip-rarity"
                    style={{
                        color: rarityColor,
                        fontWeight: 'bold',
                        fontSize: '16px',
                        letterSpacing: '2px',
                        textShadow: `0 0 10px ${rarityColor}80`,
                        marginTop: '4px',
                    }}
                >
                    {rarityName}
                </div>
                <div className="symbol-tooltip-desc" style={{ marginTop: '8px' }}>
                    {(t(`relic.${relic.id}.desc`, language) || relic.description)
                        .split('\n')
                        .map((line, i) => (
                            <div key={i} className="symbol-tooltip-desc-line">
                                <EffectText text={line} />
                            </div>
                        ))}
                </div>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: groupRowGap }}>
                    <div style={{ fontSize: relLabelFontPx, color: '#94a3b8', fontFamily: 'var(--game-font-family), sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#c084fc', fontWeight: '900', fontSize: relPrefixFontPx }}>+</span>
                        {t('knowledgeUpgrade.relicRelation.gain', language)}
                    </div>
                    <div className="upgrade-card-desc-symbol-chips">
                        {entries.map(({ relicId, count }) => {
                            const relic = RELICS[relicId];
                            if (!relic) return null;
                            const relicName = t(`relic.${relic.id}.name`, language);
                            return (
                                <button
                                    key={`relic-${relicId}-${count}`}
                                    type="button"
                                    className="upgrade-card-desc-symbol-chip upgrade-card-desc-symbol-chip--pool_add"
                                    aria-label={relicName}
                                    onMouseEnter={(e) => showTooltip(relicId, e.currentTarget)}
                                    onMouseLeave={() => setHover(null)}
                                    onFocus={(e) => showTooltip(relicId, e.currentTarget)}
                                    onBlur={() => setHover(null)}
                                >
                                    <span
                                        className="upgrade-card-desc-symbol-badge upgrade-card-desc-symbol-badge--pool_add"
                                        aria-hidden
                                    >
                                        {count > 1 ? `x${count}` : '+'}
                                    </span>
                                    <img
                                        src={`${ASSET_BASE_URL}assets/relics/${relic.sprite}`}
                                        alt=""
                                        className="upgrade-card-desc-symbol-img"
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            {tooltipContent && typeof document !== 'undefined'
                ? createPortal(tooltipContent, document.body)
                : null}
        </>
    );
};
