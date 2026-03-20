import { useState } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore, type Language } from '../game/state/settingsStore';
import { type RelicDefinition } from '../game/data/relicDefinitions';
import { getSymbolColorHex, SymbolType } from '../game/data/symbolDefinitions';
import { t } from '../i18n';
import { EffectText } from './EffectText';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

const ERA_NAME_KEYS: Record<number, string> = {
    [SymbolType.RELIGION]: 'era.special',
    [SymbolType.NORMAL]: 'era.normal',
    [SymbolType.ANCIENT]: 'era.ancient',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
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
    const { isRelicShopOpen, toggleRelicShop, relicChoices, buyRelic, refreshRelicShop, gold, turn, unlockedKnowledgeUpgrades, relicHalfPriceRelicId } = useGameStore();
    const language = useSettingsStore((s) => s.language);

    if (!isRelicShopOpen) return null;

    return (
        <div className="selection-overlay selection-overlay--relic">
            <div className="selection-panel-wrapper" style={{ position: 'relative' }}>
                <div className="selection-panel" style={{ position: 'relative', zIndex: 1 }}>
                    <div className="selection-title" style={{ marginBottom: '40px' }}>
                        {t('game.chooseRelic', language)} <span style={{ fontSize: '18px', color: '#999' }}>(상점)</span>
                    </div>

                    {/* 골드 표시 및 새로고침 */}
                    <div className="relic-shop-action-bar">
                        <div className="relic-selection-gold">
                            <span className="relic-selection-gold-icon">&#9679;</span>
                            <span className="relic-selection-gold-val">{gold}</span>
                        </div>
                        <button
                            className={`relic-shop-refresh-btn ${gold < 5 ? 'disabled' : ''}`}
                            onClick={() => refreshRelicShop(false)}
                            disabled={gold < 5}
                        >
                            <span className="refresh-icon">↺</span> 5G
                        </button>
                    </div>
                    {(() => {
                        const turnsUntilRefresh = 10 - (turn % 10);
                        return (
                            <div className="relic-shop-refresh-timer">
                                {language === 'ko'
                                    ? `새로운 유물 입고까지 ${turnsUntilRefresh}턴 남음`
                                    : `${turnsUntilRefresh} turns until new relics arrive`}
                            </div>
                        );
                    })()}

                    <div className="relic-museum-wrapper">
                        <div className="relic-museum-bg">
                            {relicChoices.map((relic, i) => (
                                <div className="relic-museum-slot" key={`slot-${i}`}>
                                    <div className="relic-spotlight" />
                                    {relic ? (
                                        <div className="relic-sprite-in-case">
                                            {relic.sprite && relic.sprite !== '-' && relic.sprite !== '-.png' ? (
                                                        <img src={`${ASSET_BASE_URL}assets/relics/${relic.sprite}`} alt={t(`relic.${relic.id}.name`, language)} />
                                            ) : (
                                                <div className="placeholder">🏺</div>
                                            )}
                                            <div className="relic-sprite-price">
                                                <span style={{ color: '#f59e0b', fontSize: '20px' }}>&#9679;</span>{' '}
                                                {(() => {
                                                    const hasGoldenTrade = (unlockedKnowledgeUpgrades || []).includes(11);
                                                    const isHalfPrice = relicHalfPriceRelicId === relic.id;
                                                    const effectiveCostUnscaled = !hasGoldenTrade
                                                        ? relic.cost
                                                        : isHalfPrice
                                                            ? Math.floor(relic.cost * 0.5)
                                                            : Math.floor(relic.cost * 0.8);
                                                    return effectiveCostUnscaled;
                                                })()}
                                            </div>
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
                                            <div className="relic-card-era" style={{ color: getSymbolColorHex(relic.type), textShadow: `0 0 8px ${getSymbolColorHex(relic.type)}88` }}>
                                                {t(ERA_NAME_KEYS[relic.type] ?? 'era.ancient', language)}
                                            </div>
                                            <div className="relic-card-name" style={{ color: '#fff', textShadow: '0 2px 4px #000, 0 0 10px rgba(0,0,0,0.8)' }}>
                                                {t(`relic.${relic.id}.name`, language)}
                                            </div>
                                            <div className="relic-card-desc">
                                                {renderRelicDesc(t(`relic.${relic.id}.desc`, language))}
                                            </div>
                                            <button className="relic-card-buy-btn" onClick={() => buyRelic(relic.id)}>
                                                {language === 'ko' ? '구매' : 'Buy'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relic-sold-out">품절</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relic-shop-back-row">
                        <button className="relic-shop-back-btn" onClick={toggleRelicShop}>
                            {t('game.back', language)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RelicSelection;
