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

const TIERS: { level: number; ids: (number | null)[] }[] = [
    { level: 1,  ids: [9, 3, 8, 5] },
    { level: 4,  ids: [1, 7, null, 2] },
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

            {/* 트리 본문 — 세로 타임라인 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                {TIERS.map((tier) => {
                    const tierUnlockable = currentLevel >= tier.level;
                    const dashColor = tierUnlockable ? '#fbbf2428' : '#1e1e1e';
                    const labelColor = tierUnlockable ? '#fbbf24cc' : '#3a3a3a';

                    return (
                        <div
                            key={tier.level}
                            style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                flex: 1,
                                minHeight: '130px',
                                padding: '0 48px',
                            }}
                        >
                            {/* 티어를 관통하는 점선 */}
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    borderTop: `2px dashed ${dashColor}`,
                                    pointerEvents: 'none',
                                    zIndex: 0,
                                }}
                            />

                            {/* Lv 레이블 — 점선 위에 배경색으로 덮어 끊기는 효과 */}
                            <div
                                style={{
                                    position: 'relative',
                                    zIndex: 1,
                                    flexShrink: 0,
                                    width: '72px',
                                    fontFamily: 'Mulmaru, sans-serif',
                                    fontSize: '20px',
                                    letterSpacing: '0.12em',
                                    color: labelColor,
                                    fontWeight: 'bold',
                                    background: '#070a0f',
                                    paddingRight: '14px',
                                }}
                            >
                                Lv.{tier.level}
                            </div>

                            {/* 업그레이드 버튼들 */}
                            <div
                                style={{
                                    position: 'relative',
                                    zIndex: 1,
                                    display: 'flex',
                                    flexDirection: 'row',
                                    gap: '16px',
                                    alignItems: 'center',
                                }}
                            >
                                {tier.ids.map((id, slotIdx) => {
                                    if (id === null) return <div key={`empty-${slotIdx}`} style={{ width: '110px' }} />;
                                    const upgrade = KNOWLEDGE_UPGRADES[id];
                                    if (!upgrade) return null;
                                    const unlocked = unlockedUpgrades.includes(id);

                                    // 의존성 체크 (UI 전용)
                                    const isLockedByDependency = id === 2 && !unlockedUpgrades.includes(5);

                                    const isSelected = selectedId === id;
                                    const name = t(`knowledgeUpgrade.${id}.name`, language) || upgrade.name;

                                    return (
                                        <button
                                            key={id}
                                            className="bottom-right-btn"
                                            onClick={() => setSelectedId(isSelected ? null : id)}
                                            style={{
                                                width: '110px',
                                                height: '110px',
                                                flex: 'none',
                                                fontSize: '16px',
                                                fontFamily: 'Mulmaru, sans-serif',
                                                padding: '8px',
                                                letterSpacing: '0.03em',
                                                wordBreak: 'keep-all',
                                                lineHeight: 1.3,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '14px',
                                                opacity: tierUnlockable && !isLockedByDependency ? 1 : 0.35,
                                                transform: isSelected ? 'scale(1.1) translateY(-4px)' : 'scale(1) translateY(0)',
                                                boxShadow: isSelected
                                                    ? (unlocked
                                                        ? 'inset 0 0 0 2px #fbbf2499, 0 0 0 2px #60a5fa88, 0 0 20px 6px #3b82f655, 0 8px 24px rgba(0,0,0,0.5)'
                                                        : 'inset 0 0 0 2px #60a5fa66, 0 0 0 2px #60a5fa88, 0 0 20px 6px #3b82f655, 0 8px 24px rgba(0,0,0,0.5)')
                                                    : (unlocked
                                                        ? 'inset 0 0 0 2px #fbbf2466, 0 5px 0 0 #92400e, 0 5px 14px rgba(251,191,36,0.2)'
                                                        : 'inset 0 0 0 4px #555, 0 6px 0 0 #444, 0 6px 10px rgba(0,0,0,0.4)'),
                                                background: isSelected
                                                    ? (unlocked ? 'rgba(140,100,30,0.9)' : 'rgba(20,40,70,0.95)')
                                                    : (unlocked ? 'rgba(120,80,20,0.75)' : 'rgba(30,30,30,0.85)'),
                                                color: unlocked ? '#fff' : 'rgba(220,220,220,0.85)',
                                                cursor: 'pointer',
                                                transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
                                            }}
                                        >
                                            {unlocked && (
                                                <div style={{ position: 'absolute', top: 6, right: 8, color: '#fbbf24', fontSize: '14px', fontWeight: 'bold', textShadow: '0 0 5px rgba(0,0,0,0.8)' }}>✓</div>
                                            )}
                                            {isLockedByDependency && (
                                                <div style={{ position: 'absolute', top: 6, right: 8, color: '#ef4444', fontSize: '14px', fontWeight: 'bold', textShadow: '0 0 5px rgba(0,0,0,0.8)' }}>🔒</div>
                                            )}
                                            {/* 궁술 -> 청동기술 연결선 (ID 5 위치에서 아래로) */}
                                            {id === 5 && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: '110px',
                                                        left: '50%',
                                                        width: '2px',
                                                        height: '40px',
                                                        background: 'linear-gradient(to bottom, #60a5fa, #60a5fa00)',
                                                        transform: 'translateX(-50%)',
                                                        zIndex: -1,
                                                        pointerEvents: 'none',
                                                    }}
                                                >
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: '50%',
                                                        transform: 'translateX(-50%) rotate(45deg)',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRight: '2px solid #60a5fa55',
                                                        borderBottom: '2px solid #60a5fa55',
                                                    }} />
                                                </div>
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
                        </div>
                    );
                })}
            </div>

            {/* 하단 패널 — floating 윈도우 */}
            {selectedUpgrade && (
                <div
                    style={{
                        position: 'fixed',
                        left: '50%',
                        bottom: '32px',
                        transform: 'translateX(-50%)',
                        width: '60%',
                        minWidth: '560px',
                        maxWidth: '860px',
                        border: '1px solid #1e2030',
                        borderRadius: '20px',
                        background: '#0b0d14',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'stretch',
                        padding: '20px 24px',
                        boxSizing: 'border-box',
                        gap: '20px',
                        boxShadow: '0 8px 48px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.05)',
                        minHeight: '150px',
                        maxHeight: '200px',
                        zIndex: 210,
                    }}
                >
                    {/* 좌측: 이름 + 설명 */}
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            overflow: 'hidden',
                        }}
                    >
                        {/* 업그레이드 이름 */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                            <div
                                style={{
                                    fontSize: '26px',
                                    fontFamily: 'Mulmaru, sans-serif',
                                    color: selectedUnlocked ? '#fbbf24' : '#e5e5e5',
                                    fontWeight: 'bold',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                {selectedUnlocked && <span style={{ marginRight: 6 }}>✓</span>}
                                {t(`knowledgeUpgrade.${selectedId}.name`, language) || selectedUpgrade.name}
                            </div>
                            <div
                                style={{
                                    fontSize: '16px',
                                    color: '#555',
                                    fontFamily: 'Mulmaru, sans-serif',
                                    letterSpacing: '0.08em',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Lv.{selectedTierLevel} 해금 · {selectedUpgrade.type === 0 ? '고대' : '중세'}
                            </div>
                        </div>

                        {/* 설명 */}
                        <div
                            style={{
                                flex: 1,
                                fontSize: '18px',
                                fontFamily: 'Mulmaru, sans-serif',
                                color: '#bbb',
                                lineHeight: 1.6,
                                letterSpacing: '0.02em',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
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
                    </div>

                    {/* 우측: 연구 버튼 */}
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <button
                            className="bottom-right-btn"
                            onClick={handleUnlock}
                            disabled={selectedUnlocked || !selectedUnlockable}
                            style={{
                                width: '160px',
                                height: '100%',
                                minHeight: '100px',
                                fontSize: '22px',
                                fontFamily: 'Mulmaru, sans-serif',
                                letterSpacing: '0.05em',
                                borderRadius: '12px',
                                opacity: selectedUnlocked ? 0.4 : !selectedUnlockable ? 0.3 : 1,
                                background: selectedUnlocked
                                    ? 'rgba(100,70,10,0.5)'
                                    : 'rgba(80,40,0,0.9)',
                                boxShadow: selectedUnlocked || !selectedUnlockable
                                    ? 'inset 0 0 0 2px #333, 0 4px 0 0 #222'
                                    : 'inset 0 0 0 2px #fbbf2455, 0 6px 0 0 #7c3100, 0 6px 16px rgba(251,191,36,0.25)',
                                color: selectedUnlocked ? '#888' : '#fbbf24',
                                cursor: selectedUnlocked || !selectedUnlockable ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {selectedUnlocked ? '이미 연구됨' : !selectedUnlockable ? `Lv.${selectedTierLevel} 필요` : '연구하기'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeUpgradesOverlay;
