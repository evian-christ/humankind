import { useState } from 'react';
import { useGameStore, getRerollCost } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { SymbolType, getSymbolColorHex, type SymbolDefinition } from '../game/data/symbolDefinitions';
import { useRelicStore } from '../game/state/relicStore';
import { t } from '../i18n';
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

const SymbolCard = ({ symbol, onClick }: { symbol: SymbolDefinition; onClick: () => void }) => {
    const language = useSettingsStore((s) => s.language);
    const eraColor = getSymbolColorHex(symbol.type);
    const eraName = t(ERA_NAME_KEYS[symbol.type] ?? 'era.ancient', language);
    const symName = t(`symbol.${symbol.id}.name`, language);
    const symDesc = t(`symbol.${symbol.id}.desc`, language);

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
            {(symbol.base_attack !== undefined || symbol.base_hp !== undefined) && (
                <div className="selection-card-stats" style={{ display: 'flex', gap: '16px', fontSize: '24px', margin: '8px 0', fontWeight: 'bold', color: '#1a1a1a' }}>
                    {symbol.base_attack !== undefined && <span>⚔ {symbol.base_attack}</span>}
                    {symbol.base_hp !== undefined && <span>♥ {symbol.base_hp}</span>}
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
    const { phase, symbolChoices, gold, rerollsThisTurn, level, selectSymbol, skipSelection, rerollSymbols } = useGameStore();
    const language = useSettingsStore((s) => s.language);
    const relics = useRelicStore((s) => s.relics);
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
                    <div className="selection-title">
                        {t('game.chooseSymbol', language)}
                    </div>
                    <div className="selection-cards">
                        {symbolChoices.map((sym, i) => (
                            <SymbolCard
                                key={`${sym.id}-${i}`}
                                symbol={sym}
                                onClick={() => handleCardClick(sym.id)}
                            />
                        ))}
                    </div>
                    <div className="selection-actions">
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
