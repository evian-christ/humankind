import { useState } from 'react';
import { useGameStore, REROLL_COST } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { Era, getSymbolColorHex, type SymbolDefinition } from '../game/data/symbolDefinitions';
import { t } from '../i18n';

const ERA_NAME_KEYS: Record<number, string> = {
    [Era.SPECIAL]: 'era.special',
    [Era.ANCIENT]: 'era.ancient',
    [Era.CLASSICAL]: 'era.classical',
    [Era.MEDIEVAL]: 'era.medieval',
    [Era.INDUSTRIAL]: 'era.industrial',
    [Era.MODERN]: 'era.modern',
};

const SymbolCard = ({ symbol, onClick }: { symbol: SymbolDefinition; onClick: () => void }) => {
    const language = useSettingsStore((s) => s.language);
    const eraColor = getSymbolColorHex(symbol.era);
    const eraName = t(ERA_NAME_KEYS[symbol.era] ?? 'era.ancient', language);
    const symName = t(`symbol.${symbol.id}.name`, language);
    const symDesc = t(`symbol.${symbol.id}.desc`, language);

    return (
        <button className="selection-card" onClick={onClick}>
            {symbol.sprite ? (
                <img
                    src={`./assets/symbols_new/${symbol.sprite}`}
                    alt={symName}
                    className="selection-card-sprite"
                    style={{ imageRendering: 'pixelated' }}
                />
            ) : (
                <div className="selection-card-sprite-placeholder">
                    {symName}
                </div>
            )}
            <div className="selection-card-name">{symName}</div>
            <div className="selection-card-rarity" style={{
                color: eraColor,
                fontSize: '28px',
                fontWeight: '900',
                letterSpacing: '4px',
                textShadow: `0 0 15px ${eraColor}b3`,
                marginBottom: '12px'
            }}>
                {eraName}
            </div>
            {(symbol.base_attack !== undefined || symbol.base_hp !== undefined) && (
                <div className="selection-card-stats" style={{ display: 'flex', gap: '16px', fontSize: '24px', margin: '8px 0', fontWeight: 'bold', color: '#1a1a1a' }}>
                    {symbol.base_attack !== undefined && <span>⚔ {symbol.base_attack}</span>}
                    {symbol.base_hp !== undefined && <span>♥ {symbol.base_hp}</span>}
                </div>
            )}
            <div className="selection-card-desc">
                {symDesc.split('\n').map((line, i) => (
                    <div key={i} className="selection-card-desc-line">{line}</div>
                ))}
            </div>
            {symbol.tags && symbol.tags.length > 0 && (
                <div className="selection-card-tags" style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '16px 0 0 0', flexWrap: 'wrap' }}>
                    {symbol.tags.map(tag => (
                        <span key={tag} style={{ background: 'rgba(55, 65, 81, 0.9)', padding: '6px 14px', borderRadius: '8px', fontSize: '16px', color: '#e5e7eb', border: '1px solid #4b5563', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
                            {t(`tag.${tag}`, language)}
                        </span>
                    ))}
                </div>
            )}
        </button>
    );
};

const SymbolSelection = () => {
    const { phase, symbolChoices, gold, selectSymbol, skipSelection, rerollSymbols } = useGameStore();
    const language = useSettingsStore((s) => s.language);
    const [isPeeked, setIsPeeked] = useState(false);

    if (phase !== 'selection') return null;

    return (
        <div
            className={`selection-overlay${isPeeked ? ' selection-overlay--peeked' : ''}`}
        >
            {/* Peek toggle handle */}
            <button
                className="selection-peek-handle"
                onClick={() => setIsPeeked((v) => !v)}
                title={isPeeked ? 'Show selection panel' : 'Peek at board'}
            >
                {isPeeked ? '▲ 돌아오기' : '▼ 보드 보기'}
            </button>

            <div className="selection-panel-wrapper">
                <div className="selection-panel">
                    <div className="selection-title">{t('game.chooseSymbol', language)}</div>
                    <div className="selection-cards">
                        {symbolChoices.map((sym, i) => (
                            <SymbolCard
                                key={`${sym.id}-${i}`}
                                symbol={sym}
                                onClick={() => selectSymbol(sym.id)}
                            />
                        ))}
                    </div>
                    <div className="selection-actions">
                        <button
                            className="selection-reroll-btn"
                            onClick={rerollSymbols}
                            disabled={gold < REROLL_COST}
                        >
                            {t('game.reroll', language)} ({REROLL_COST}G)
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
