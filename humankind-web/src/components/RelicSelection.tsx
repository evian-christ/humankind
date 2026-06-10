import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { getInflatedGoldCost, getTrojanGoldLootReward } from '../game/state/gameCalculations';
import { RELIC_ID } from '../game/logic/relics/relicIds';
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

const getDisplayedRelicDesc = (relicId: number, desc: string, level: number) => {
    if (relicId !== RELIC_ID.TROY_GOLD_LOOT) return desc;
    return desc.replace('{gold}', String(getTrojanGoldLootReward(level)));
};

const RelicSelection = () => {
    const isRelicShopOpen = useGameStore((s) => s.isRelicShopOpen);
    const toggleRelicShop = useGameStore((s) => s.toggleRelicShop);
    const relicChoices = useGameStore((s) => s.relicChoices);
    const buyRelic = useGameStore((s) => s.buyRelic);
    const refreshRelicShop = useGameStore((s) => s.refreshRelicShop);
    const gold = useGameStore((s) => s.gold);
    const level = useGameStore((s) => s.level);
    const turn = useGameStore((s) => s.turn);
    const leaderId = useGameStore((s) => s.leaderId);
    const relicHalfPriceRelicId = useGameStore((s) => s.relicHalfPriceRelicId);
    const phase = useGameStore((s) => s.phase);
    const language = useSettingsStore((s) => s.language);
    const developerMode = useSettingsStore((s) => s.developerMode);
    const [purchaseDeniedHint, setPurchaseDeniedHint] = useState<{ key: number; slotIndex: number } | null>(null);
    const purchaseInputLockedRef = useRef(true);

    useEffect(() => {
        if (isRelicShopOpen) {
            purchaseInputLockedRef.current = true;
            const unlockTimer = window.setTimeout(() => {
                purchaseInputLockedRef.current = false;
            }, 200);
            return () => window.clearTimeout(unlockTimer);
        }
        purchaseInputLockedRef.current = true;
        setPurchaseDeniedHint(null);
    }, [isRelicShopOpen]);

    useEffect(() => {
        if (!isRelicShopOpen || !developerMode) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
            if (event.key !== '+' && event.code !== 'NumpadAdd') return;

            event.preventDefault();
            refreshRelicShop(true);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [developerMode, isRelicShopOpen, refreshRelicShop]);

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

    const handleBuyRelic = (relic: { id: number; cost: number }, slotIndex: number) => {
        if (purchaseInputLockedRef.current) return;

        if (phase === 'selection') {
            void audioManager.play('denied');
            setPurchaseDeniedHint((current) => ({
                key: (current?.key ?? 0) + 1,
                slotIndex,
            }));
            return;
        }
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
                                                {renderRelicDesc(getDisplayedRelicDesc(
                                                    relic.id,
                                                    t(`relic.${relic.id}.desc`, language),
                                                    level,
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relic-sold-out">{t('game.relicShopSoldOut', language)}</div>
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
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <button
                                        type="button"
                                        className="relic-card-buy-btn"
                                        data-audio-click="relic_buy"
                                        onClick={() => handleBuyRelic(relic, i)}
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
                                    {purchaseDeniedHint?.slotIndex === i && (
                                        <span
                                            key={purchaseDeniedHint.key}
                                            className="spin-research-hint-float"
                                            aria-hidden="true"
                                        >
                                            {t('game.chooseSymbolBeforeRelicPurchase', language)}
                                        </span>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RelicSelection;
