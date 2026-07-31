import { type CSSProperties } from 'react';
import { audioManager } from '../audio/audioManager';
import { getRelicRarityColorHex, type RelicDefinition, type RelicRarity } from '../game/data/relicDefinitions';
import { isConsumableRelicId, countNonConsumableRelics } from '../game/logic/relics/relicClassification';
import { RELIC_ID } from '../game/logic/relics/relicIds';
import { getInflatedGoldCost, getTrojanGoldLootReward } from '../game/state/gameCalculations';
import { MAX_RELICS, useRelicStore } from '../game/state/relicStore';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';
import { GOLD_RESOURCE_ICON_URL } from '../uiAssetUrls';
import { EffectText } from './EffectText';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

const RELIC_RARITY_NAME_KEYS: Record<RelicRarity, string> = {
    common: 'rarity.common',
    uncommon: 'rarity.uncommon',
    rare: 'rarity.rare',
    epic: 'rarity.epic',
    legendary: 'rarity.legendary',
};

const getDisplayedRelicDesc = (relicId: number, desc: string, level: number) =>
    relicId === RELIC_ID.TROY_GOLD_LOOT
        ? desc.replace('{gold}', String(getTrojanGoldLootReward(level)))
        : desc;

const RelicSelection = () => {
    const isRelicShopOpen = useGameStore((state) => state.isRelicShopOpen);
    const phase = useGameStore((state) => state.phase);
    const relicChoices = useGameStore((state) => state.relicChoices);
    const relicHalfPriceRelicId = useGameStore((state) => state.relicHalfPriceRelicId);
    const buyRelic = useGameStore((state) => state.buyRelic);
    const toggleRelicShop = useGameStore((state) => state.toggleRelicShop);
    const gold = useGameStore((state) => state.gold);
    const level = useGameStore((state) => state.level);
    const leaderId = useGameStore((state) => state.leaderId);
    const relicCount = useRelicStore((state) => countNonConsumableRelics(state.relics));
    const language = useSettingsStore((state) => state.language);

    if (!isRelicShopOpen) return null;

    const hasGoldenTrade = leaderId === 'ramesses';
    const getEffectiveCost = (relic: RelicDefinition) =>
        getInflatedGoldCost(
            relic.cost,
            level,
            hasGoldenTrade && relicHalfPriceRelicId === relic.id ? 0.5 : 1,
        );

    const closeSelection = () => {
        if (phase === 'relic_shop') {
            useGameStore.setState({ phase: 'idle', isRelicShopOpen: false });
            return;
        }
        toggleRelicShop();
    };

    const handlePurchase = (relic: RelicDefinition) => {
        const cost = getEffectiveCost(relic);
        const inventoryFull = !isConsumableRelicId(relic.id) && relicCount >= MAX_RELICS;
        if (gold < cost || inventoryFull) {
            void audioManager.play('denied');
            return;
        }
        void audioManager.play('relic_buy');
        buyRelic(relic.id);
    };

    return (
        <div className="selection-overlay selection-overlay--relic-choice">
            <div className="selection-panel-wrapper">
                <div className="selection-panel">
                    <div className="relic-choice-heading">
                        <div className="selection-title selection-title--plain">{t('game.chooseRelic', language)}</div>
                        <div className="relic-choice-gold" aria-label={`Gold ${gold}`}>
                            <img src={GOLD_RESOURCE_ICON_URL} alt="" draggable={false} />
                            <span>{gold}</span>
                        </div>
                    </div>

                    <div className="selection-cards relic-choice-cards">
                        {relicChoices.map((relic, index) => {
                            if (!relic) return null;
                            const rarityColor = getRelicRarityColorHex(relic.rarity);
                            const cost = getEffectiveCost(relic);
                            const originalCost = getInflatedGoldCost(relic.cost, level);
                            const discounted = hasGoldenTrade && relicHalfPriceRelicId === relic.id;
                            const unavailable = gold < cost || (!isConsumableRelicId(relic.id) && relicCount >= MAX_RELICS);
                            const name = t(`relic.${relic.id}.name`, language);
                            const description = getDisplayedRelicDesc(
                                relic.id,
                                t(`relic.${relic.id}.desc`, language),
                                level,
                            );

                            return (
                                <div
                                    key={`${relic.id}-${index}`}
                                    className="selection-card-frame selection-relic-card-frame"
                                    style={{
                                        '--card-glow': `${rarityColor}cc`,
                                        '--selection-era-color': rarityColor,
                                    } as CSSProperties}
                                >
                                    <button
                                        type="button"
                                        className={`selection-card relic-choice-card${unavailable ? ' relic-choice-card--unavailable' : ''}`}
                                        onClick={() => handlePurchase(relic)}
                                        aria-label={`${name}, ${cost}`}
                                    >
                                        <div className="selection-card-rarity relic-choice-rarity" style={{ color: rarityColor }}>
                                            {t(RELIC_RARITY_NAME_KEYS[relic.rarity], language)}
                                        </div>
                                        <div className="relic-sprite-in-case relic-choice-sprite-wrap">
                                            {relic.sprite && relic.sprite !== '-' && relic.sprite !== '-.png' ? (
                                                <img
                                                    className="selection-card-sprite relic-choice-sprite"
                                                    src={`${ASSET_BASE_URL}assets/relics/${relic.sprite}`}
                                                    alt={name}
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className="selection-card-sprite-placeholder">?</div>
                                            )}
                                        </div>
                                        <div className="selection-card-name relic-choice-name">{name}</div>
                                        <div className="selection-card-desc relic-choice-desc">
                                            {description.split('\n').map((line, lineIndex) => (
                                                <div className="selection-card-desc-line" key={`${relic.id}-${lineIndex}`}>
                                                    <EffectText text={line} />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="relic-card-buy-btn relic-choice-price" aria-hidden="true">
                                            {discounted && <span className="relic-choice-original-price">{originalCost}</span>}
                                            <img src={GOLD_RESOURCE_ICON_URL} alt="" draggable={false} />
                                            <span>{cost}</span>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="selection-actions">
                        <button type="button" className="selection-skip-btn" onClick={closeSelection}>
                            <span>{t('game.skip', language)}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RelicSelection;
