import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';
import { EffectText } from './EffectText';

/** upgrades/ 폴더의 스프라이트를 불러옵니다. sprite가 없으면 000.png 사용 */
const resolveUpgradeSprite = (sprite: string | undefined): string => {
    if (sprite) return `./assets/upgrades/${sprite}`;
    return './assets/upgrades/000.png';
};

const CARD_W = 420;
const CARD_H = 768;

const UpgradeCard = ({
    name,
    description,
    sprite,
    onClick,
}: {
    name: string;
    description: string;
    sprite?: string;
    onClick: () => void;
}) => {
    const spriteUrl = resolveUpgradeSprite(sprite);

    return (
        <button
            className="upgrade-card"
            onClick={onClick}
            style={{
                background: `url("./assets/ui/upgradeCard_312x570.png") no-repeat center / ${CARD_W}px ${CARD_H}px`,
                width: `${CARD_W}px`,
                height: `${CARD_H}px`,
            } as React.CSSProperties}
        >
            <div className="upgrade-card-inner">
                {/* 스프라이트 아이콘 */}
                <img
                    src={spriteUrl}
                    alt={name}
                    className="upgrade-card-sprite"
                    style={{ imageRendering: 'pixelated' }}
                />
                <div className="upgrade-card-name">{name}</div>
                <div className="upgrade-card-desc">
                    {description.split('\n').map((line, i) => (
                        <div key={i} className="upgrade-card-desc-line">
                            <EffectText text={line} />
                        </div>
                    ))}
                </div>
            </div>
        </button>
    );
};

const UpgradeSelection = () => {
    const { phase, upgradeChoices, selectUpgrade, skipUpgradeSelection } = useGameStore();
    const language = useSettingsStore((s) => s.language);

    if (phase !== 'upgrade_selection') return null;

    return (
        <div className="selection-overlay">
            <div className="selection-panel-wrapper">
                <div className="selection-panel">
                    <div className="selection-title">{t('game.chooseUpgrade', language)}</div>
                    <div className="selection-cards upgrade-cards">
                        {upgradeChoices.map((upgrade) => (
                            <UpgradeCard
                                key={upgrade.id}
                                name={t(`knowledgeUpgrade.${upgrade.id}.name`, language)}
                                description={t(`knowledgeUpgrade.${upgrade.id}.desc`, language)}
                                sprite={upgrade.sprite}
                                onClick={() => selectUpgrade(upgrade.id)}
                            />
                        ))}
                        {upgradeChoices.length === 0 && (
                            <div style={{ color: '#aaa', fontSize: '20px', padding: '40px' }}>
                                {t('game.noUpgradesAvailable', language)}
                            </div>
                        )}
                    </div>
                    <div className="selection-actions">
                        <button className="selection-skip-btn" onClick={skipUpgradeSelection}>
                            {t('game.skip', language)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeSelection;

