import { useState } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore, type Language } from '../game/state/settingsStore';
import { type RelicDefinition } from '../game/data/relicDefinitions';
import { getSymbolColorHex, Era } from '../game/data/symbolDefinitions';
import { t } from '../i18n';
import { EffectText } from './EffectText';

const ERA_NAME_KEYS: Record<number, string> = {
    [Era.SPECIAL]: 'era.special',
    [Era.ANCIENT]: 'era.ancient',
    [Era.CLASSICAL]: 'era.classical',
    [Era.MEDIEVAL]: 'era.medieval',
    [Era.INDUSTRIAL]: 'era.industrial',
    [Era.MODERN]: 'era.modern',
};

const RelicCard = ({ relic, onClick, language }: { relic: RelicDefinition; onClick: () => void; language: Language }) => {
    const eraColor = getSymbolColorHex(relic.era);
    const eraName = t(ERA_NAME_KEYS[relic.era] ?? 'era.ancient', language);
    const relicName = t(`relic.${relic.id}.name`, language);
    const relicDesc = t(`relic.${relic.id}.desc`, language);

    return (
        <button className="selection-card" onClick={onClick} style={{ '--card-glow': `${eraColor}cc`, background: 'url("./assets/ui/cards_ancient_300x500.png") no-repeat center / 400px 667px' } as React.CSSProperties}>
            {relic.sprite ? (
                <img
                    src={`./assets/relics/${relic.sprite}`}
                    alt={relicName}
                    className="selection-card-sprite"
                    style={{ imageRendering: 'pixelated' }}
                />
            ) : (
                <div className="selection-card-sprite-placeholder">
                    {relicName}
                </div>
            )}
            <div className="selection-card-name">{relicName}</div>
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

            <div className="selection-card-desc">
                {relicDesc.split('\n').map((line, i) => (
                    <div key={i} className="selection-card-desc-line"><EffectText text={line} /></div>
                ))}
            </div>
            <div className="selection-card-cost" style={{ marginTop: '8px', color: '#ffb74d', fontSize: '20px', fontWeight: 'bold' }}>
                {relic.cost}G
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
                    <div className="selection-title">{t('game.chooseRelic', language)}</div>
                    <div className="selection-cards">
                        {relicChoices.map((relic, i) => (
                            <RelicCard
                                key={`${relic.id}-${i}`}
                                relic={relic}
                                language={language}
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
