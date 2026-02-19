import { useGameStore, REROLL_COST } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { Era, getSymbolColorHex, type SymbolDefinition } from '../game/data/symbolDefinitions';
import { t } from '../i18n';

const ERA_NAME_KEYS: Record<number, string> = {
    [Era.RELIGION]: 'era.religion',
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
                    src={`/assets/sprites/${symbol.sprite}`}
                    alt={symName}
                    className="selection-card-sprite"
                />
            ) : (
                <div className="selection-card-sprite-placeholder">
                    {symName}
                </div>
            )}
            <div className="selection-card-name">{symName}</div>
            <div className="selection-card-rarity" style={{ color: eraColor }}>
                ── {eraName} ──
            </div>
            <div className="selection-card-desc">
                {symDesc.split('\n').map((line, i) => (
                    <div key={i} className="selection-card-desc-line">{line}</div>
                ))}
            </div>
        </button>
    );
};

const SymbolSelection = () => {
    const { phase, symbolChoices, gold, selectSymbol, skipSelection, rerollSymbols } = useGameStore();
    const language = useSettingsStore((s) => s.language);

    if (phase !== 'selection') return null;

    return (
        <div className="selection-overlay">
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
    );
};

export default SymbolSelection;
