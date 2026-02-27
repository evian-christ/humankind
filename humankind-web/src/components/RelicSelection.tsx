import { useState } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { type RelicDefinition } from '../game/data/relicDefinitions';
import { getSymbolColorHex, Era } from '../game/data/symbolDefinitions';
import { t } from '../i18n';

const ERA_NAMES: Record<number, string> = {
    [Era.SPECIAL]: '특수',
    [Era.ANCIENT]: '태고',
    [Era.CLASSICAL]: '고대',
    [Era.MEDIEVAL]: '고전',
    [Era.INDUSTRIAL]: '중세',
    [Era.MODERN]: '산업',
};

const RelicCard = ({ relic, onClick }: { relic: RelicDefinition; onClick: () => void }) => {
    const eraColor = getSymbolColorHex(relic.era);
    const eraName = ERA_NAMES[relic.era] || '태고';

    return (
        <button className="selection-card" onClick={onClick}>
            {relic.sprite ? (
                <img
                    src={`./assets/symbols_new/${relic.sprite}`}
                    alt={relic.name}
                    className="selection-card-sprite"
                    style={{ imageRendering: 'pixelated' }}
                />
            ) : (
                <div className="selection-card-sprite-placeholder">
                    {relic.name}
                </div>
            )}
            <div className="selection-card-name">{relic.name}</div>
            <div className="selection-card-rarity" style={{
                background: eraColor,
                color: relic.era === Era.SPECIAL ? '#1a1a1a' : '#ffffff',
                padding: '4px 16px',
                borderRadius: '16px',
                display: 'inline-block',
                fontWeight: 'bold',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                textShadow: relic.era === Era.SPECIAL ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
                marginBottom: '12px'
            }}>
                {eraName} 유물
            </div>

            <div className="selection-card-desc">
                {relic.description.split('\n').map((line, i) => (
                    <div key={i} className="selection-card-desc-line">{line}</div>
                ))}
            </div>
            <div className="selection-card-cost" style={{ marginTop: '8px', color: '#ffb74d' }}>
                가치: {relic.cost}G
            </div>
        </button>
    );
};

const RelicSelection = () => {
    const { phase, relicChoices, selectRelic, skipRelicSelection } = useGameStore();
    const language = useSettingsStore((s) => s.language);
    const [isPeeked, setIsPeeked] = useState(false);

    if (phase !== 'relic_selection') return null;

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
                    <div className="selection-title">유물 선택 (10턴 보상)</div>
                    <div className="selection-cards">
                        {relicChoices.map((relic, i) => (
                            <RelicCard
                                key={`${relic.id}-${i}`}
                                relic={relic}
                                onClick={() => selectRelic(relic.id)}
                            />
                        ))}
                    </div>
                    <div className="selection-actions">
                        <button className="selection-skip-btn" onClick={skipRelicSelection}>
                            {t('game.skip', language)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RelicSelection;
