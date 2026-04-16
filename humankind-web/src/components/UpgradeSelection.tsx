import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore, countKnowledgeUpgradeRerollAlternatives, getEraFromLevel } from '../game/state/gameStore';
import { useSettingsStore, type Language } from '../game/state/settingsStore';
import { getSymbolColorHex, SYMBOLS, SymbolType } from '../game/data/symbolDefinitions';
import type { KnowledgeUpgradeDescSymbol, KnowledgeUpgradeSymbolRelation } from '../game/data/knowledgeUpgrades';
import { t } from '../i18n';
import { EffectText } from './EffectText';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';

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

/** 기존 364×665 대비 약 1.21배 — CSS `.upgrade-card`와 동일 크기 */
const CARD_W = 440;
const CARD_H = Math.round((665 * CARD_W) / 364);

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

const UpgradeCard = ({
    upgradeId,
    name,
    description,
    sprite,
    descSymbols,
    onSelect,
}: {
    upgradeId: number;
    name: string;
    description: string;
    sprite?: string;
    descSymbols?: KnowledgeUpgradeDescSymbol[];
    onSelect: () => void;
}) => {
    const spriteUrl = resolveUpgradeSprite(sprite);

    return (
        <div
            className="upgrade-card"
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect();
            }}
            style={{
                background: `url("${ASSET_BASE_URL}assets/ui/upgradeCard_312x570.png") no-repeat center / ${CARD_W}px ${CARD_H}px`,
                width: `${CARD_W}px`,
                height: `${CARD_H}px`,
            } as React.CSSProperties}
        >
            <div className="upgrade-card-inner">
                <div className="upgrade-card-header">
                    <img
                        src={spriteUrl}
                        alt={name}
                        className="upgrade-card-sprite"
                        style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="upgrade-card-name">{name}</div>
                </div>
                <div className="upgrade-card-desc">
                    {description.split('\n').map((line, i) => (
                        <div key={i} className="upgrade-card-desc-line">
                            <EffectText text={line} />
                        </div>
                    ))}
                </div>
                {descSymbols && descSymbols.length > 0 ? (
                    <UpgradeCardDescSymbols upgradeId={upgradeId} entries={descSymbols} />
                ) : null}
            </div>
        </div>
    );
};

const SquareRefreshIcon = () => (
    <svg
        className="upgrade-card-reroll-icon"
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
    >
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 21h5v-5" />
    </svg>
);

const UpgradeSelection = () => {
    const {
        phase,
        upgradeChoices,
        selectUpgrade,
        level,
        levelBeforeUpgrade,
        unlockedKnowledgeUpgrades,
        knowledgeUpgradeGlobalRerollUsed,
        rerollUpgradeCard,
    } = useGameStore();
    const knowledgeUpgradePickQueue = useGameStore((s) => s.knowledgeUpgradePickQueue ?? []);
    const language = useSettingsStore((s) => s.language);
    const [isPeeked, setIsPeeked] = useState(false);

    /** 업그레이드 패널이 보드를 가릴 때만 툴팁 억제; ▼ 보드 보기(peek) 중에는 보드 전면으로 간주 */
    const blockBoardTooltipsForUpgradeUi = phase === 'upgrade_selection' && !isPeeked;
    useRegisterBoardTooltipBlock('upgrade-selection-overlay', blockBoardTooltipsForUpgradeUi);

    const pickLevel = knowledgeUpgradePickQueue[0] ?? level;
    const eraForPick = getEraFromLevel(pickLevel);
    const displayLevelFrom = knowledgeUpgradePickQueue.length > 0 ? pickLevel - 1 : levelBeforeUpgrade;
    const displayLevelTo = knowledgeUpgradePickQueue.length > 0 ? pickLevel : level;

    const rerollAlternatives =
        phase === 'upgrade_selection'
            ? countKnowledgeUpgradeRerollAlternatives(
                  unlockedKnowledgeUpgrades || [],
                  eraForPick,
                  pickLevel,
                  upgradeChoices.map((u) => u.id),
              )
            : 0;
    const rerollDisabled = knowledgeUpgradeGlobalRerollUsed || rerollAlternatives === 0;

    useEffect(() => {
        if (!import.meta.env.DEV) return;
        if (phase !== 'upgrade_selection') return;
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            if (e.code === 'KeyR') {
                e.preventDefault();
                useGameStore.getState().debugRerollKnowledgeUpgradeChoices();
            }
            if (e.key === 'Backspace') {
                e.preventDefault();
                useGameStore.getState().skipUpgradeSelection();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [phase]);

    if (phase !== 'upgrade_selection') return null;

    return (
        <div
            className={`selection-overlay selection-overlay--upgrade${isPeeked ? ' selection-overlay--peeked' : ''}`}
        >
            <button
                type="button"
                className="selection-peek-handle"
                onClick={() => setIsPeeked((v) => !v)}
                title={isPeeked ? 'Show upgrade panel' : 'Peek at board'}
            >
                {isPeeked ? '▲ 돌아오기' : '▼ 보드 보기'}
            </button>
            <div className="selection-panel-wrapper">
                <div className="selection-panel">
                    {/* 레벨업 정보 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        marginTop: '56px',
                    }}>
                        <span style={{
                            fontFamily: 'Mulmaru, monospace',
                            fontSize: '26px',
                            color: '#94a3b8',
                            letterSpacing: '2px',
                        }}>Lv.{displayLevelFrom}</span>
                        <span style={{ fontSize: '26px', color: '#60a5fa' }}>→</span>
                        <span style={{
                            fontFamily: 'Mulmaru, monospace',
                            fontSize: '30px',
                            fontWeight: '900',
                            color: '#93c5fd',
                            letterSpacing: '2px',
                            textShadow: '0 0 12px rgba(147, 197, 253, 0.6)',
                        }}>Lv.{displayLevelTo}</span>
                        <span style={{
                            fontFamily: 'Mulmaru, monospace',
                            fontSize: '20px',
                            color: '#bfdbfe',
                            letterSpacing: '1px',
                        }}>⬆ LEVEL UP!</span>
                    </div>
                    <div className="selection-cards upgrade-cards">
                        {upgradeChoices.map((upgrade, idx) => (
                            <div key={`${upgrade.id}-${idx}`} className="upgrade-card-with-reroll">
                                <UpgradeCard
                                    upgradeId={upgrade.id}
                                    name={t(`knowledgeUpgrade.${upgrade.id}.name`, language)}
                                    description={t(`knowledgeUpgrade.${upgrade.id}.desc`, language)}
                                    sprite={upgrade.sprite}
                                    descSymbols={upgrade.descSymbols}
                                    onSelect={() => selectUpgrade(upgrade.id)}
                                />
                                <button
                                    type="button"
                                    className="upgrade-card-reroll"
                                    disabled={rerollDisabled}
                                    title={t('game.rerollKnowledgeUpgrade', language)}
                                    aria-label={t('game.rerollKnowledgeUpgrade', language)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (rerollDisabled) return;
                                        rerollUpgradeCard(idx);
                                    }}
                                >
                                    <SquareRefreshIcon />
                                </button>
                            </div>
                        ))}
                        {upgradeChoices.length === 0 && (
                            <div style={{ color: '#aaa', fontSize: '20px', padding: '40px' }}>
                                {t('game.noUpgradesAvailable', language)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeSelection;

