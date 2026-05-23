import { type CSSProperties } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import {
    getRewardDescription,
    getRewardName,
    getRewardRarityLabel,
    REWARD_RARITY_COLOR,
    type RewardDefinition,
} from '../game/data/rewardDefinitions';
import { SYMBOLS } from '../game/data/symbolDefinitions';
import { getSymbolSpriteUrl } from '../game/data/symbolSpritePaths';
import { RELICS } from '../game/data/relicDefinitions';
import { EffectText } from './EffectText';
import { t } from '../i18n';
import type { Language } from '../game/state/settingsStore';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

const RewardCard = ({
    reward,
    era,
    language,
    lootSymbolId,
    onClick,
}: {
    reward: RewardDefinition;
    era: number;
    language: Language;
    lootSymbolId: number | undefined;
    onClick: () => void;
}) => {
    const rarityColor = REWARD_RARITY_COLOR[reward.rarity];
    const desc = getRewardDescription(reward, era, language);
    const rewardName = getRewardName(reward, language);
    const grantedRelic = reward.grantedRelicIds?.length
        ? RELICS[reward.grantedRelicIds[0]!]
        : null;
    const lootSymbol = lootSymbolId == null ? null : SYMBOLS[lootSymbolId];
    const spriteUrl = grantedRelic?.sprite && grantedRelic.sprite !== '-' && grantedRelic.sprite !== '-.png'
        ? `${ASSET_BASE_URL}assets/relics/${grantedRelic.sprite}`
        : lootSymbol
        ? getSymbolSpriteUrl(lootSymbol)
        : null;

    return (
        <div
            className="selection-card-frame loot-reward-card-frame"
            style={{
                '--card-glow': `${rarityColor}cc`,
                '--selection-era-color': rarityColor,
            } as CSSProperties}
        >
            <button
                type="button"
                className="selection-card"
                onClick={onClick}
            >
                {/* 희귀도 */}
                <div
                    className="selection-card-rarity"
                    style={{
                        color: rarityColor,
                        fontSize: '18px',
                        fontWeight: '900',
                        letterSpacing: '2px',
                        textShadow: `-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 12px ${rarityColor}b3`,
                        marginBottom: '8px',
                        display: 'inline-block',
                    }}
                >
                    {getRewardRarityLabel(reward.rarity, language)}
                </div>

                {spriteUrl ? (
                    <img
                        className="selection-card-sprite loot-reward-card-sprite"
                        src={spriteUrl}
                        alt=""
                        aria-hidden
                    />
                ) : (
                    <div className="selection-card-sprite-placeholder" />
                )}

                {/* 이름 */}
                <div className="selection-card-name">{rewardName}</div>

                {/* 설명 */}
                <div className="selection-card-desc">
                    <div className="selection-card-desc-line">
                        <EffectText text={desc} />
                    </div>
                </div>
            </button>
        </div>
    );
};

const LootRewardSelection = () => {
    const phase = useGameStore((s) => s.phase);
    const lootRewardChoices = useGameStore((s) => s.lootRewardChoices);
    const pendingLootSlot = useGameStore((s) => s.pendingLootSlot);
    const era = useGameStore((s) => s.era);
    const selectLootReward = useGameStore((s) => s.selectLootReward);
    const language = useSettingsStore((s) => s.language);

    if (phase !== 'loot_reward_selection') return null;

    // 어느 전리품 등급인지 판별해 제목 결정
    const S_IDS = { loot: 60, greater_loot: 61, radiant_loot: 62 };
    const tierTitle =
        pendingLootSlot?.symbolId === S_IDS.radiant_loot
            ? t('lootReward.title.large', language)
            : pendingLootSlot?.symbolId === S_IDS.greater_loot
            ? t('lootReward.title.medium', language)
            : t('lootReward.title.small', language);

    return (
        <div className="selection-overlay">
            <div className="selection-panel-wrapper">
                <div className="selection-panel">
                    <div className="selection-title">{tierTitle}</div>
                    <div
                        style={{
                            color: '#9ca3af',
                            fontSize: '13px',
                            textAlign: 'center',
                            marginBottom: '12px',
                            marginTop: '-8px',
                        }}
                    >
                        {t('lootReward.choose', language)}
                    </div>
                    <div className="selection-cards">
                        {lootRewardChoices.map((reward, i) => (
                            <RewardCard
                                key={`${reward.id}-${i}`}
                                reward={reward}
                                era={era}
                                language={language}
                                lootSymbolId={pendingLootSlot?.symbolId}
                                onClick={() => selectLootReward(reward.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LootRewardSelection;
