import { useGameStore, REROLL_COST } from '../game/state/gameStore';
import { Rarity, getSymbolColorHex, type SymbolDefinition } from '../game/data/symbolDefinitions';

const RARITY_NAMES: Record<number, string> = {
    [Rarity.ANCIENT]: 'Ancient',
    [Rarity.CLASSICAL]: 'Classical',
    [Rarity.MEDIEVAL]: 'Medieval',
    [Rarity.INDUSTRIAL]: 'Industrial',
    [Rarity.MODERN]: 'Modern',
};

const SymbolCard = ({ symbol, onClick }: { symbol: SymbolDefinition; onClick: () => void }) => {
    const rarityColor = getSymbolColorHex(symbol.rarity);
    const rarityName = RARITY_NAMES[symbol.rarity] ?? 'Unknown';

    return (
        <button className="selection-card" onClick={onClick}>
            {symbol.sprite ? (
                <img
                    src={`/assets/sprites/${symbol.sprite}`}
                    alt={symbol.name}
                    className="selection-card-sprite"
                />
            ) : (
                <div className="selection-card-sprite-placeholder">
                    {symbol.name}
                </div>
            )}
            <div className="selection-card-name">{symbol.name}</div>
            <div className="selection-card-rarity" style={{ color: rarityColor }}>
                ── {rarityName} ──
            </div>
            <div className="selection-card-desc">
                {symbol.description.split('\n').map((line, i) => (
                    <div key={i} className="selection-card-desc-line">{line}</div>
                ))}
            </div>
        </button>
    );
};

const SymbolSelection = () => {
    const { phase, symbolChoices, gold, selectSymbol, skipSelection, rerollSymbols } = useGameStore();

    if (phase !== 'selection') return null;

    return (
        <div className="selection-overlay">
            <div className="selection-panel">
                <div className="selection-title">Choose a Symbol</div>
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
                        Reroll ({REROLL_COST}G)
                    </button>
                    <button className="selection-skip-btn" onClick={skipSelection}>
                        Skip
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SymbolSelection;
