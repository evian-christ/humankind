import { useState } from 'react';
import { useGameStore, getRerollCost, getBronzeWorkingHpBonus } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { SymbolType, getSymbolColorHex, type SymbolDefinition } from '../game/data/symbolDefinitions';
import { useRelicStore } from '../game/state/relicStore';
import { getBoardSymbolTooltipDesc, t } from '../i18n';
import { EffectText } from './EffectText';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';

const ERA_NAME_KEYS: Record<number, string> = {
    [SymbolType.RELIGION]: 'era.special',
    [SymbolType.NORMAL]: 'era.normal',
    [SymbolType.ANCIENT]: 'era.ancient',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
};

const ASSET_BASE_URL = import.meta.env.BASE_URL;

/** gameStore RELIC_ID: 고대 유물 잔해 / 고대 부족 합류 — 심볼 선택 UI 전용 표시·리롤 숨김 */
const RELIC_ANCIENT_DEBRIS = 13;
const RELIC_ANCIENT_TRIBE_JOIN = 19;

const SymbolCard = ({
    symbol,
    hasBronzeWorking,
    unlockedKnowledgeUpgrades,
    onClick,
}: {
    symbol: SymbolDefinition;
    hasBronzeWorking: boolean;
    unlockedKnowledgeUpgrades: number[];
    onClick: () => void;
}) => {
    const language = useSettingsStore((s) => s.language);
    const eraColor = getSymbolColorHex(symbol.type);
    const eraName = t(ERA_NAME_KEYS[symbol.type] ?? 'era.ancient', language);
    const symName = t(`symbol.${symbol.key}.name`, language);
    const symDesc = getBoardSymbolTooltipDesc(symbol.key, language, unlockedKnowledgeUpgrades);
    const displayHp =
        symbol.base_hp !== undefined
            ? symbol.base_hp + (hasBronzeWorking ? getBronzeWorkingHpBonus(symbol) : 0)
            : undefined;

    return (
        <button
            className="selection-card"
            onClick={onClick}
            style={{ '--card-glow': `${eraColor}cc`, background: `url("${ASSET_BASE_URL}assets/ui/cards_ancient_300x500.png") no-repeat center / 400px 667px` } as React.CSSProperties}
        >
            {/* 시대 — 스프라이트 위 */}
            <div className="selection-card-rarity" style={{
                color: eraColor,
                fontSize: '20px',
                fontWeight: '900',
                letterSpacing: '3px',
                textShadow: `-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 12px ${eraColor}b3`,
                marginBottom: '8px',
                display: 'inline-block',
                transform: 'scaleX(1.4)',
                transformOrigin: 'center'
            }}>
                {eraName}
            </div>

            {/* 스프라이트 */}
            {symbol.sprite && symbol.sprite !== '-' && symbol.sprite !== '-.png' ? (
                <img
                    src={`${ASSET_BASE_URL}assets/symbols/${symbol.sprite}`}
                    alt={symName}
                    className="selection-card-sprite"
                    style={{ imageRendering: 'pixelated' }}
                />
            ) : (
                <div className="selection-card-sprite-placeholder">
                    {symName}
                </div>
            )}

            {/* 이름 */}
            <div className="selection-card-name">{symName}</div>
            {(symbol.base_attack !== undefined || displayHp !== undefined) && (
                <div className="selection-card-stats" style={{ display: 'flex', gap: '16px', fontSize: '24px', margin: '8px 0', fontWeight: 'bold', color: '#1a1a1a' }}>
                    {symbol.base_attack !== undefined && <span>⚔ {symbol.base_attack}</span>}
                    {displayHp !== undefined && <span>♥ {displayHp}</span>}
                </div>
            )}
            <div className="selection-card-desc">
                {symDesc.split('\n').map((line, i) => (
                    <div key={i} className="selection-card-desc-line"><EffectText text={line} /></div>
                ))}
            </div>
        </button>
    );
};

const SymbolSelection = () => {
    const {
        phase,
        symbolChoices,
        gold,
        rerollsThisTurn,
        level,
        selectSymbol,
        skipSelection,
        rerollSymbols,
        symbolSelectionRelicSourceId,
    } = useGameStore();
    const language = useSettingsStore((s) => s.language);
    const relics = useRelicStore((s) => s.relics);
    const unlockedKnowledgeUpgrades = useGameStore((s) => s.unlockedKnowledgeUpgrades ?? []);
    const hasBronzeWorking = unlockedKnowledgeUpgrades.includes(2);
    const [isPeeked, setIsPeeked] = useState(false);

    /** 선택 패널이 보드를 가릴 때만 툴팁 억제; 본게임 ▼ 보드 보기(peek) 중에는 보드 전면으로 간주 */
    const blockBoardTooltipsForSelectionUi = phase === 'selection' && !isPeeked;
    useRegisterBoardTooltipBlock('symbol-selection-overlay', blockBoardTooltipsForSelectionUi);

    if (phase !== 'selection') return null;

    // ID 2: 리디아의 호박금 주화 — 리롤 비용 50% 할인, 턴당 최대 3회
    const hasLydia = relics.some(r => r.definition.id === 2);
    const baseRerollCost = getRerollCost(level);
    const rerollCostUnscaled = hasLydia ? Math.floor(baseRerollCost * 0.5) : baseRerollCost;
    const rerollCost = rerollCostUnscaled;
    const maxRerolls = hasLydia ? 3 : Infinity;
    const rerollsLeft = hasLydia ? maxRerolls - rerollsThisTurn : null;
    const canReroll = gold >= rerollCost && (rerollsLeft === null || rerollsLeft > 0);

    const hideRerollFromRelicSource =
        symbolSelectionRelicSourceId === RELIC_ANCIENT_DEBRIS ||
        symbolSelectionRelicSourceId === RELIC_ANCIENT_TRIBE_JOIN;
    const relicSourceLabelKey =
        hideRerollFromRelicSource && symbolSelectionRelicSourceId != null
            ? (`relic.${symbolSelectionRelicSourceId}.name` as const)
            : null;

    const handleCardClick = (symbolId: number) => {
        selectSymbol(symbolId);
    };

    return (
        <div
            className={`selection-overlay${isPeeked ? ' selection-overlay--peeked' : ''}`}
        >
            <button
                className="selection-peek-handle"
                onClick={() => setIsPeeked((v) => !v)}
                title={isPeeked ? 'Show selection panel' : 'Peek at board'}
            >
                {isPeeked ? '▲ 돌아오기' : '▼ 보드 보기'}
            </button>

            <div className="selection-panel-wrapper">
                <div className="selection-panel">
                    {relicSourceLabelKey && (
                        <div className="selection-relic-source-banner">{t(relicSourceLabelKey, language)}</div>
                    )}
                    <div className="selection-title">
                        {t('game.chooseSymbol', language)}
                    </div>
                    <div className="selection-cards">
                        {symbolChoices.map((sym, i) => (
                            <SymbolCard
                                key={`${sym.id}-${i}`}
                                symbol={sym}
                                hasBronzeWorking={hasBronzeWorking}
                                unlockedKnowledgeUpgrades={unlockedKnowledgeUpgrades}
                                onClick={() => handleCardClick(sym.id)}
                            />
                        ))}
                    </div>
                    <div className="selection-actions">
                        {!hideRerollFromRelicSource && (
                            <button
                                className="selection-reroll-btn"
                                onClick={rerollSymbols}
                                disabled={!canReroll}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <span>{t('game.reroll', language)}</span>
                                <span style={{ color: '#fbbf24', fontSize: '20px', lineHeight: 1, transform: 'translateY(1px)' }}>&#9679;</span>
                                <span style={{ color: '#fbbf24', fontWeight: '900' }}>{rerollCost}</span>
                                {rerollsLeft !== null && (
                                    <span style={{ marginLeft: '4px', opacity: 0.75, fontSize: '0.75em' }}>
                                        {rerollsLeft}/{maxRerolls}
                                    </span>
                                )}
                            </button>
                        )}
                        <button className="selection-skip-btn" onClick={skipSelection}>
                            {t('game.skip', language)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SymbolSelection;
