import { useEffect } from 'react';
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

/** 기존 364×665 대비 약 1.21배 — CSS `.upgrade-card`와 동일 크기 */
const CARD_W = 440;
const CARD_H = Math.round((665 * CARD_W) / 364);

const UpgradeCard = ({
    name,
    description,
    sprite,
    onSelect,
}: {
    name: string;
    description: string;
    sprite?: string;
    onSelect: () => void;
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
            <div className="upgrade-card-inner">
                <div className="upgrade-card-header">
                    <img
                        src={spriteUrl}
                        alt={name}
                        className="upgrade-card-sprite"
                        style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="upgrade-card-name">{name}</div>
                </div>
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
    } = useGameStore();
    const language = useSettingsStore((s) => s.language);

    useEffect(() => {
        if (!import.meta.env.DEV) return;
        if (phase !== 'upgrade_selection') return;
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            if (e.code === 'KeyR') {
                e.preventDefault();
                useGameStore.getState().debugRerollKnowledgeUpgradeChoices();
            }
            if (e.key === 'Backspace') {
                e.preventDefault();
                useGameStore.getState().skipUpgradeSelection();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [phase]);

    if (phase !== 'upgrade_selection') return null;

    return (
        <div className="selection-overlay selection-overlay--upgrade">
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

