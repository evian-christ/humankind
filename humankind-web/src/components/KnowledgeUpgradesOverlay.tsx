import { useEffect, useState } from 'react';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { KNOWLEDGE_UPGRADES } from '../game/data/knowledgeUpgrades';
import { t } from '../i18n';
import { UpgradeCardDescSymbols, resolveUpgradeSprite } from './UpgradeSelection';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const TIERS: { level: number; ids: number[] }[] = [
    { level: 1,  ids: [5, 9, 3, 8] },
    { level: 4,  ids: [1, 7, 2] },
    { level: 7,  ids: [6, 4, 10] },
    { level: 10, ids: [15] },
];

const KnowledgeUpgradesOverlay = ({ isOpen, onClose }: Props) => {
    useRegisterBoardTooltipBlock('knowledge-upgrades-overlay', isOpen);

    const unlockedUpgrades = useGameStore((s) => s.unlockedKnowledgeUpgrades);
    const currentLevel = useGameStore((s) => s.level);
    const phase = useGameStore((s) => s.phase);
    const language = useSettingsStore((s) => s.language);

    const [selectedId, setSelectedId] = useState<number | null>(null);

    const selectedUpgrade = selectedId != null ? KNOWLEDGE_UPGRADES[selectedId] : null;
    const selectedUnlocked = selectedId != null && unlockedUpgrades.includes(selectedId);
    const selectedTierLevel = selectedId != null
        ? (TIERS.find(tier => tier.ids.includes(selectedId!))?.level ?? 1)
        : 1;
    const selectedUnlockable = currentLevel >= selectedTierLevel;

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (selectedId !== null) setSelectedId(null);
                else onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose, selectedId]);

    // 패널 닫기 (오버레이 닫힐 때 선택 초기화)
    useEffect(() => {
        if (!isOpen) setSelectedId(null);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleUnlock = () => {
        if (!selectedId || selectedUnlocked) return;
        // phase를 upgrade_selection으로 임시 전환 후 selectUpgrade 호출
        useGameStore.setState((s) => ({
            phase: 'upgrade_selection',
            upgradeChoices: [selectedId],
            knowledgeUpgradePickQueue: [s.level],
            levelBeforeUpgrade: s.level - 1,
            knowledgeUpgradeGlobalRerollUsed: false,
            returnPhaseAfterDevKnowledgeUpgrade: phase,
        }));
        useGameStore.getState().selectUpgrade(selectedId);
        setSelectedId(null);
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 200,
                background: '#070a0f',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* 상단 헤더 */}
            <div style={{ padding: '24px 32px', flexShrink: 0 }}>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '40px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '48px',
                        height: '48px',
                        padding: 0,
                        transition: 'color 0.2s, transform 0.2s',
                        borderRadius: '50%',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#f8fafc'; e.currentTarget.style.transform = 'translateX(-4px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.transform = 'translateX(0)'; }}
                    title="돌아가기"
                    aria-label="돌아가기"
                >
                    ←
                </button>
            </div>

            {/* 레벨 레이블 행 */}
            <div style={{ display: 'flex', flexShrink: 0, paddingBottom: '8px' }}>
                {TIERS.map((tier) => {
                    const tierUnlockable = currentLevel >= tier.level;
                    return (
                        <div
                            key={tier.level}
                            style={{
                                flex: 1,
                                textAlign: 'center',
                                fontFamily: 'Mulmaru, sans-serif',
                                fontSize: '28px',
                                letterSpacing: '0.12em',
                                color: tierUnlockable ? '#fbbf24cc' : '#444',
                                fontWeight: 'bold',
                            }}
                        >
                            Lv.{tier.level}
                        </div>
                    );
                })}
            </div>

            {/* 트리 본문 */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', borderTop: '1px solid #1a1a22' }}>
                    {TIERS.map((tier, colIdx) => {
                        const tierUnlockable = currentLevel >= tier.level;
                        return (
                            <div
                                key={tier.level}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'space-evenly',
                                    padding: '24px 16px',
                                    borderLeft: colIdx > 0 ? '1px solid #ffffff0d' : 'none',
                                    boxSizing: 'border-box',
                                    gap: '16px',
                                }}
                            >
                                {tier.ids.map((id) => {
                                    const upgrade = KNOWLEDGE_UPGRADES[id];
                                    if (!upgrade) return null;
                                    const unlocked = unlockedUpgrades.includes(id);
                                    const isSelected = selectedId === id;
                                    const name = t(`knowledgeUpgrade.${id}.name`, language) || upgrade.name;
                                    const isSpecial = id === 15;

                                    return (
                                        <button
                                            key={id}
                                            className="bottom-right-btn"
                                            onClick={() => setSelectedId(isSelected ? null : id)}
                                            style={{
                                                width: '120px',
                                                height: '120px',
                                                flex: 'none',
                                                fontSize: '18px',
                                                fontFamily: 'Mulmaru, sans-serif',
                                                padding: '8px',
                                                letterSpacing: '0.03em',
                                                wordBreak: 'keep-all',
                                                lineHeight: 1.3,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '16px',
                                                opacity: tierUnlockable ? 1 : 0.35,
                                                outline: isSelected ? '3px solid #60a5fa' : 'none',
                                                outlineOffset: '4px',
                                                boxShadow: unlocked
                                                    ? 'inset 0 0 0 2px #fbbf2466, 0 5px 0 0 #92400e, 0 5px 14px rgba(251,191,36,0.2)'
                                                    : 'inset 0 0 0 4px #555, 0 6px 0 0 #444, 0 6px 10px rgba(0,0,0,0.4)',
                                                background: unlocked
                                                    ? 'rgba(120,80,20,0.75)'
                                                    : 'rgba(30,30,30,0.85)',
                                                color: unlocked ? '#fff' : 'rgba(220,220,220,0.85)',
                                                cursor: 'pointer',
                                                transition: 'outline 0.1s, transform 0.1s',
                                            }}
                                        >
                                            {unlocked && (
                                                <div style={{ position: 'absolute', top: 6, right: 8, color: '#fbbf24', fontSize: '16px', fontWeight: 'bold', textShadow: '0 0 5px rgba(0,0,0,0.8)' }}>✓</div>
                                            )}
                                            <img
                                                src={resolveUpgradeSprite(upgrade.sprite)}
                                                alt={name}
                                                title={name}
                                                style={{ width: '80%', height: '80%', objectFit: 'contain', imageRendering: 'pixelated' }}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

            {/* 우측 사이드 패널 — fixed 오버레이 */}
            {selectedUpgrade && (
                    <div
                        style={{
                            position: 'fixed',
                            top: '32px',
                            right: '32px',
                            bottom: '32px',
                            width: '32%',
                            minWidth: '400px',
                            border: '2px solid #1a1a2a',
                            borderRadius: '24px',
                            background: '#0b0d14',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '32px 28px 24px',
                            boxSizing: 'border-box',
                            gap: '20px',
                            zIndex: 210,
                            overflow: 'hidden',
                            boxShadow: '-10px 10px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)',
                        }}
                    >
                        {/* 업그레이드 이름 */}
                        <div>
                            <div
                                style={{
                                    fontSize: '32px',
                                    fontFamily: 'Mulmaru, sans-serif',
                                    color: selectedUnlocked ? '#fbbf24' : '#e5e5e5',
                                    fontWeight: 'bold',
                                    letterSpacing: '0.04em',
                                    marginBottom: 8,
                                }}
                            >
                                {selectedUnlocked && <span style={{ marginRight: 8 }}>✓</span>}
                                {t(`knowledgeUpgrade.${selectedId}.name`, language) || selectedUpgrade.name}
                            </div>
                            <div
                                style={{
                                    fontSize: '18px',
                                    color: '#555',
                                    fontFamily: 'Mulmaru, sans-serif',
                                    letterSpacing: '0.08em',
                                }}
                            >
                                Lv.{selectedTierLevel} 해금 · {selectedUpgrade.type === 0 ? '고대' : '중세'}
                            </div>
                        </div>

                        {/* 구분선 */}
                        <div style={{ height: 1, background: '#1c1c28' }} />

                        {/* 설명 */}
                        <div
                            style={{
                                flex: 1,
                                fontSize: '22px',
                                fontFamily: 'Mulmaru, sans-serif',
                                color: '#bbb',
                                lineHeight: 1.7,
                                letterSpacing: '0.02em',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px',
                                overflowY: 'auto',
                            }}
                        >
                            <div>
                                {t(`knowledgeUpgrade.${selectedId}.desc`, language) || selectedUpgrade.description}
                            </div>
                            {selectedUpgrade.descSymbols && selectedUpgrade.descSymbols.length > 0 && (
                                <div>
                                    <UpgradeCardDescSymbols upgradeId={selectedId} entries={selectedUpgrade.descSymbols} />
                                </div>
                            )}
                        </div>

                        {/* 구분선 */}
                        <div style={{ height: 1, background: '#1c1c28' }} />

                        {/* 하단 해금 버튼 */}
                        <button
                            className="bottom-right-btn"
                            onClick={handleUnlock}
                            disabled={selectedUnlocked || !selectedUnlockable}
                            style={{
                                width: '100%',
                                height: 80,
                                fontSize: '24px',
                                fontFamily: 'Mulmaru, sans-serif',
                                letterSpacing: '0.05em',
                                borderRadius: 0,
                                opacity: selectedUnlocked ? 0.4 : !selectedUnlockable ? 0.3 : 1,
                                background: selectedUnlocked
                                    ? 'rgba(100,70,10,0.5)'
                                    : 'rgba(80,40,0,0.9)',
                                boxShadow: selectedUnlocked || !selectedUnlockable
                                    ? 'inset 0 0 0 2px #333, 0 4px 0 0 #222'
                                    : 'inset 0 0 0 2px #fbbf2455, 0 6px 0 0 #7c3100, 0 6px 16px rgba(251,191,36,0.25)',
                                color: selectedUnlocked ? '#888' : '#fbbf24',
                                cursor: selectedUnlocked || !selectedUnlockable ? 'not-allowed' : 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            {selectedUnlocked ? '이미 연구됨' : !selectedUnlockable ? `Lv.${selectedTierLevel} 필요` : '연구하기'}
                        </button>
                    </div>
                )}
        </div>
    );
};

export default KnowledgeUpgradesOverlay;
