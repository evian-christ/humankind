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
    [Era.MEDIEVAL]: 'era.medieval',
    [Era.MODERN]: 'era.modern',
};

const RelicCard = ({ relic, onBuy, language }: { relic: RelicDefinition; onBuy: () => void; language: Language }) => {
    const eraColor = getSymbolColorHex(relic.era);
    const eraName = t(ERA_NAME_KEYS[relic.era] ?? 'era.ancient', language);
    const relicName = t(`relic.${relic.id}.name`, language);
    const relicDesc = t(`relic.${relic.id}.desc`, language);

    return (
        <div className="relic-card-wrapper">
            {/* 카드 본체 — 원래 크기 유지, 내용만 축소 */}
            <div
                className="relic-card"
                style={{
                    '--card-glow': `${eraColor}cc`,
                    background: 'url("./assets/ui/cards_ancient_300x500.png") no-repeat center / 400px 667px',
                } as React.CSSProperties}
            >
                <div className="relic-card-inner">
                    {/* 시대 — 스프라이트 위 */}
                    <div className="relic-card-era" style={{ color: eraColor, textShadow: `0 0 8px ${eraColor}88` }}>
                        {eraName}
                    </div>

                    {/* 스프라이트 (좌하단 유물바 스타일의 테두리 박스) */}
                    <div className="relic-card-sprite-wrapper">
                        {relic.sprite ? (
                            <img
                                src={`./assets/relics/${relic.sprite}`}
                                alt={relicName}
                                className="relic-card-sprite"
                            />
                        ) : (
                            <div className="relic-card-sprite-placeholder">🏺</div>
                        )}
                    </div>

                    {/* 이름 */}
                    <div className="relic-card-name">{relicName}</div>

                    {/* 설명 */}
                    <div className="relic-card-desc">
                        {relicDesc.split('\n').map((line, i) => (
                            <div key={i} className="relic-card-desc-line">
                                <EffectText text={line} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 구매 버튼 — 카드 밖 아래 */}
            <button className="relic-card-buy-btn" onClick={onBuy}>
                <span className="relic-card-buy-gold">&#9679;</span>
                <span className="relic-card-buy-cost">{relic.cost}</span>
            </button>
        </div>
    );
};

const RelicSelection = () => {
    const { phase, relicChoices, selectRelic, gold } = useGameStore();
    const language = useSettingsStore((s) => s.language);
    const [isPeeked, setIsPeeked] = useState(false);

    if (phase !== 'relic_selection') return null;

    return (
        <div
            className={`selection-overlay selection-overlay--relic${isPeeked ? ' selection-overlay--peeked' : ''}`}
        >
            {/* Peek toggle handle */}
            <button
                className="selection-peek-handle"
                onClick={() => setIsPeeked((v) => !v)}
                title={isPeeked ? 'Show selection panel' : 'Peek at board'}
            >
                {isPeeked ? '▲ 돌아오기' : '▼ 보드 보기'}
            </button>

            <div className="selection-panel-wrapper" style={{ position: 'relative' }}>
                {/* 신비한 보라색 배경 펄스 */}
                <div className="relic-bg-glow" />
                <div className="selection-panel" style={{ position: 'relative', zIndex: 1 }}>
                    <div className="selection-title" style={{ marginBottom: '8px' }}>{t('game.chooseRelic', language)}</div>

                    {/* 보유 골드 표시 */}
                    <div className="relic-selection-gold">
                        <span className="relic-selection-gold-icon">&#9679;</span>
                        <span className="relic-selection-gold-val">{gold}</span>
                    </div>

                    <div className="relic-cards">
                        {relicChoices.map((relic, i) => (
                            <RelicCard
                                key={`${relic.id}-${i}`}
                                relic={relic}
                                language={language}
                                onBuy={() => selectRelic(relic.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RelicSelection;
