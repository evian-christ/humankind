import { useGameStore } from '../game/state/gameStore';
import { getInflatedGoldCost } from '../game/state/gameCalculations';
import { useSettingsStore } from '../game/state/settingsStore';
import { getRelicRarityColorHex, type RelicRarity } from '../game/data/relicDefinitions';
import { t } from '../i18n';
import { EffectText } from './EffectText';
import { audioManager } from '../audio/audioManager';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

const RELIC_RARITY_NAME_KEYS: Record<RelicRarity, string> = {
    common: 'rarity.common',
    uncommon: 'rarity.uncommon',
    rare: 'rarity.rare',
    epic: 'rarity.epic',
    legendary: 'rarity.legendary',
};

// Helper function inside component to render effect text
const renderRelicDesc = (desc: string) => {
    return desc.split('\n').map((line, i) => (
        <div key={i} className="relic-card-desc-line" style={{ color: '#e5e7eb', textShadow: '0 1px 3px #000' }}>
            <EffectText text={line} />
        </div>
    ));
};

const RelicSelection = () => {
    const isRelicShopOpen = useGameStore((s) => s.isRelicShopOpen);
    const toggleRelicShop = useGameStore((s) => s.toggleRelicShop);
    const relicChoices = useGameStore((s) => s.relicChoices);
    const buyRelic = useGameStore((s) => s.buyRelic);
    const gold = useGameStore((s) => s.gold);
    const level = useGameStore((s) => s.level);
    const turn = useGameStore((s) => s.turn);
    const leaderId = useGameStore((s) => s.leaderId);
    const relicHalfPriceRelicId = useGameStore((s) => s.relicHalfPriceRelicId);
    const language = useSettingsStore((s) => s.language);

    if (!isRelicShopOpen) return null;

    const turnsUntilRefresh = 10 - (turn % 10);
    const relicShopTitle = t('game.relicShopTitle', language).replace('{turns}', String(turnsUntilRefresh));
    const hasGoldenTrade = leaderId === 'ramesses';

    const getEffectiveRelicCost = (relic: { id: number; cost: number }) => {
        const isHalfPrice = relicHalfPriceRelicId === relic.id;
        return getInflatedGoldCost(relic.cost, level, hasGoldenTrade && isHalfPrice ? 0.5 : 1);
    };

    const isGoldenTradeDiscount = (relic: { id: number; cost: number }) =>
        hasGoldenTrade && relicHalfPriceRelicId === relic.id;

    const handleBuyRelic = (relic: { id: number; cost: number }) => {
        if (gold < getEffectiveRelicCost(relic)) {
            void audioManager.play('denied');
            return;
        }
        void audioManager.play('relic_buy');
        buyRelic(relic.id);
    };

    return (
        <div className="selection-overlay selection-overlay--relic">
            <header className="relic-shop-header">
                <div className="relic-shop-header-main">
                    <div className="relic-shop-header-start">
                        <button
                            type="button"
                            className="relic-shop-back-btn"
                            onClick={toggleRelicShop}
                            aria-label={t('game.back', language)}
                        >
                            <span className="relic-shop-back-icon" aria-hidden>
                                ←
                            </span>
                            <span className="relic-shop-back-label">{t('game.back', language)}</span>
                        </button>
                    </div>
                    <h1 className="selection-title selection-title--relic-shop">{relicShopTitle}</h1>
                    <div className="relic-shop-header-end">
                        <div className="relic-selection-gold relic-selection-gold--header">
                            <span className="relic-selection-gold-icon">&#9679;</span>
                            <span className="relic-selection-gold-val">{gold}</span>
                        </div>
                    </div>
                </div>
            </header>
            <div className="selection-panel-wrapper selection-panel-wrapper--relic-shop" style={{ position: 'relative' }}>
                <div className="selection-panel" style={{ position: 'relative', zIndex: 1 }}>
                    <div className="relic-museum-wrapper">
                        <div className="relic-museum-bg">
                            {relicChoices.map((relic, i) => (
                                <div className="relic-museum-slot" key={`slot-${i}`}>
                                    <div className="relic-spotlight" />
                                    {relic ? (
                                        <div className="relic-sprite-in-case">
                                            <span className="relic-sprite-shadow" aria-hidden="true" />
                                            {relic.sprite && relic.sprite !== '-' && relic.sprite !== '-.png' ? (
                                                <img src={`${ASSET_BASE_URL}assets/relics/${relic.sprite}`} alt={t(`relic.${relic.id}.name`, language)} />
                                            ) : (
                                                <div className="placeholder">🏺</div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                        <div className="relic-museum-info-row">
                            {relicChoices.map((relic, i) => (
                                <div className="relic-museum-info-slot" key={`info-${i}`}>
                                    {relic ? (
                                        <div className="relic-museum-details">
                                            <div
                                                className="relic-card-era"
                                                style={{
                                                    color: getRelicRarityColorHex(relic.rarity),
                                                    textShadow: `0 0 8px ${getRelicRarityColorHex(relic.rarity)}88`,
                                                }}
                                            >
                                                {t(RELIC_RARITY_NAME_KEYS[relic.rarity], language)}
                                            </div>
                                            <div className="relic-card-name" style={{ color: '#fff', textShadow: '0 2px 4px #000, 0 0 10px rgba(0,0,0,0.8)' }}>
                                                {t(`relic.${relic.id}.name`, language)}
                                            </div>
                                            <div className="relic-card-desc">
                                                {renderRelicDesc(t(`relic.${relic.id}.desc`, language))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relic-sold-out">품절</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="relic-museum-buy-bar">
                <div className="relic-museum-buy-bar-inner">
                    {relicChoices.map((relic, i) => (
                        <div className="relic-museum-buy-slot" key={`buy-${i}`}>
                            {relic ? (
                                <button
                                    type="button"
                                    className="relic-card-buy-btn"
                                    data-audio-click="relic_buy"
                                    onClick={() => handleBuyRelic(relic)}
                                    aria-label={
                                        isGoldenTradeDiscount(relic)
                                            ? t('game.relicShopBuyDiscountAria', language)
                                                .replace('{sale}', String(getEffectiveRelicCost(relic)))
                                                .replace('{original}', String(getInflatedGoldCost(relic.cost, level)))
                                            : undefined
                                    }
                                >
                                    {isGoldenTradeDiscount(relic) ? (
                                        <span className="relic-card-buy-price relic-card-buy-price--discount">
                                            <span className="relic-card-buy-price-was">
                                                <span className="relic-card-buy-price-icon relic-card-buy-price-icon--was" aria-hidden>
                                                    &#9679;
                                                </span>
                                                <span className="relic-card-buy-price-num relic-card-buy-price-num--struck">{getInflatedGoldCost(relic.cost, level)}</span>
                                            </span>
                                            <span className="relic-card-buy-price-now">
                                                <span className="relic-card-buy-price-icon" aria-hidden>
                                                    &#9679;
                                                </span>
                                                <span className="relic-card-buy-price-num">{getEffectiveRelicCost(relic)}</span>
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="relic-card-buy-price">
                                            <span className="relic-card-buy-price-icon" aria-hidden>
                                                &#9679;
                                            </span>
                                            <span className="relic-card-buy-price-num">{getEffectiveRelicCost(relic)}</span>
                                        </span>
                                    )}
                                </button>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RelicSelection;
