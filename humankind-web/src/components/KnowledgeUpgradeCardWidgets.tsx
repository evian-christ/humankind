import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore, type Language } from '../game/state/settingsStore';
import { getSymbolColorHex, SYMBOLS, SymbolType } from '../game/data/symbolDefinitions';
import type { KnowledgeUpgradeDescSymbol, KnowledgeUpgradeSymbolRelation } from '../game/data/knowledgeUpgrades';
import { t } from '../i18n';
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

/** upgrades/ 폴더의 스프라이트를 불러옵니다. sprite가 없으면 000.png 사용 */
export const resolveUpgradeSprite = (sprite: string | undefined): string => {
    if (sprite && sprite !== '-' && sprite !== '-.png') return `${ASSET_BASE_URL}assets/upgrades/${sprite}`;
    return `${ASSET_BASE_URL}assets/upgrades/000.png`;
};

const UPGRADE_DESC_SYMBOL_TIP_W = 280;
const UPGRADE_DESC_SYMBOL_COMPARE_TIP_W = 300;

function normalizeDescForCompare(s: string): string {
    return s.replace(/\s+/g, ' ').trim();
}

/** 적용 전: 항상 공식 symbol.*.desc 와 동일 */
function getCanonicalSymbolDesc(symbolId: number, language: Language): string {
    return t(`symbol.${symbolId}.desc`, language);
}

/** 적용 후 효과 문구 — symbol 카드와 같은 문체·형식으로 작성된 i18n */
function resolveSymbolDescAfterUpgrade(
    upgradeId: number,
    symbolId: number,
    language: Language,
): string | null {
    const key = `knowledgeUpgrade.symbolDescAfter.${upgradeId}.${symbolId}`;
    const val = t(key, language);
    return val === key ? null : val;
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
    const [hover, setHover] = useState<{
        id: number;
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

    const showTooltip = (id: number, relation: KnowledgeUpgradeSymbolRelation, el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        setHover({ id, relation, anchorRight: r.right, anchorTop: r.top });
    };

    const tooltipContent = hover && (() => {
        const def = SYMBOLS[hover.id];
        if (!def) return null;
        const eraColor = getSymbolColorHex(def.type);
        const eraName = t(ERA_NAME_KEYS[def.type] ?? 'era.ancient', language);
        const isModify = hover.relation === 'effect_modify';
        const beforeCanonical = isModify ? getCanonicalSymbolDesc(hover.id, language) : '';
        const afterResolved = isModify ? resolveSymbolDescAfterUpgrade(upgradeId, hover.id, language) : null;
        const hasCompare =
            isModify &&
            afterResolved !== null &&
            normalizeDescForCompare(beforeCanonical) !== normalizeDescForCompare(afterResolved);
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
                <div className="symbol-tooltip-name">{t(`symbol.${def.id}.name`, language)}</div>
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
                                {afterResolved!.split('\n').map((line, i) => (
                                    <div key={i} className="symbol-tooltip-desc-line">
                                        <EffectText text={line} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="symbol-tooltip-desc" style={{ marginTop: '8px' }}>
                        {t(`symbol.${def.id}.desc`, language).split('\n').map((line, i) => (
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
                                {group.map(({ id, relation }) => {
                                    const def = SYMBOLS[id];
                                    if (!def) return null;
                                    const src =
                                        def.sprite && def.sprite !== '-' && def.sprite !== '-.png'
                                            ? `${ASSET_BASE_URL}assets/symbols/${def.sprite}`
                                            : undefined;
                                    const symName = t(`symbol.${id}.name`, language);
                                    return (
                                        <button
                                            key={`${id}-${relation}`}
                                            type="button"
                                            className={`upgrade-card-desc-symbol-chip upgrade-card-desc-symbol-chip--${relation}`}
                                            aria-label={symName}
                                            onMouseEnter={(e) => showTooltip(id, relation, e.currentTarget)}
                                            onMouseLeave={() => setHover(null)}
                                            onFocus={(e) => showTooltip(id, relation, e.currentTarget)}
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
