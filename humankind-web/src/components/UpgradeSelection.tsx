import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';
import { EffectText } from './EffectText';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

/** upgrades/ 폴더의 스프라이트를 불러옵니다. sprite가 없으면 000.png 사용 */
const resolveUpgradeSprite = (sprite: string | undefined): string => {
    if (sprite && sprite !== '-' && sprite !== '-.png') return `${ASSET_BASE_URL}assets/upgrades/${sprite}`;
    return `${ASSET_BASE_URL}assets/upgrades/000.png`;
};

const CARD_W = 364;
const CARD_H = 665;

const UpgradeCard = ({
    name,
    description,
    sprite,
    onSelect,
    onReroll,
    canReroll,
    rerollUsed,
}: {
    name: string;
    description: string;
    sprite?: string;
    onSelect: () => void;
    onReroll: () => void;
    canReroll: boolean;
    rerollUsed: boolean;
}) => {
    const spriteUrl = resolveUpgradeSprite(sprite);

    return (
        <div
            className="upgrade-card"
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect();
            }}
            style={{
                background: `url("${ASSET_BASE_URL}assets/ui/upgradeCard_312x570.png") no-repeat center / ${CARD_W}px ${CARD_H}px`,
                width: `${CARD_W}px`,
                height: `${CARD_H}px`,
            } as React.CSSProperties}
        >
            {canReroll && (
                <button
                    type="button"
                    aria-label="Reroll upgrade card"
                    onClick={(e) => {
                        e.stopPropagation();
                        onReroll();
                    }}
                    disabled={rerollUsed}
                    style={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        width: 44,
                        height: 44,
                        border: 'none',
                        borderRadius: 0,
                        cursor: rerollUsed ? 'not-allowed' : 'pointer',
                        background: rerollUsed ? 'rgba(148,163,184,0.35)' : 'rgba(0,0,0,0.35)',
                        color: '#e0f2fe',
                        fontSize: 22,
                        fontFamily: 'Mulmaru, monospace',
                        textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    }}
                >
                    ↺
                </button>
            )}
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
        </div>
    );
};

const UpgradeSelection = () => {
    const {
        phase,
        upgradeChoices,
        selectUpgrade,
        level,
        levelBeforeUpgrade,
        unlockedKnowledgeUpgrades,
        knowledgeUpgradeRerollUsed,
        rerollUpgradeCard,
    } = useGameStore();
    const language = useSettingsStore((s) => s.language);

    if (phase !== 'upgrade_selection') return null;

    const canDemocraticOrder = (unlockedKnowledgeUpgrades || []).includes(14);

    return (
        <div className="selection-overlay">
            <div className="selection-panel-wrapper">
                <div className="selection-panel">
                    <div className="selection-title">지식 업그레이드</div>
                    {/* 레벨업 정보 — 박스 없이 텍스트만 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        marginTop: '-12px',
                    }}>
                        <span style={{
                            fontFamily: 'Mulmaru, monospace',
                            fontSize: '26px',
                            color: '#94a3b8',
                            letterSpacing: '2px',
                        }}>Lv.{levelBeforeUpgrade}</span>
                        <span style={{ fontSize: '26px', color: '#60a5fa' }}>→</span>
                        <span style={{
                            fontFamily: 'Mulmaru, monospace',
                            fontSize: '30px',
                            fontWeight: '900',
                            color: '#93c5fd',
                            letterSpacing: '2px',
                            textShadow: '0 0 12px rgba(147, 197, 253, 0.6)',
                        }}>Lv.{level}</span>
                        <span style={{
                            fontFamily: 'Mulmaru, monospace',
                            fontSize: '20px',
                            color: '#bfdbfe',
                            letterSpacing: '1px',
                        }}>⬆ LEVEL UP!</span>
                    </div>
                    <div className="selection-cards upgrade-cards">
                        {upgradeChoices.map((upgrade, idx) => (
                            <UpgradeCard
                                key={`${upgrade.id}-${idx}`}
                                name={t(`knowledgeUpgrade.${upgrade.id}.name`, language)}
                                description={t(`knowledgeUpgrade.${upgrade.id}.desc`, language)}
                                sprite={upgrade.sprite}
                                onSelect={() => selectUpgrade(upgrade.id)}
                                canReroll={canDemocraticOrder}
                                rerollUsed={!!knowledgeUpgradeRerollUsed[idx]}
                                onReroll={() => rerollUpgradeCard(idx)}
                            />
                        ))}
                        {upgradeChoices.length === 0 && (
                            <div style={{ color: '#aaa', fontSize: '20px', padding: '40px' }}>
                                {t('game.noUpgradesAvailable', language)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeSelection;

