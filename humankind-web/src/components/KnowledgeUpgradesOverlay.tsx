import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { isUpgradeLegalForKnowledgePick, useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { KNOWLEDGE_UPGRADES } from '../game/data/knowledgeUpgrades';
import { getSymbolColorHex, SymbolType } from '../game/data/symbolDefinitions';
import { t } from '../i18n';
import { EffectText } from './EffectText';
import { UpgradeCardDescSymbols, resolveUpgradeSprite } from './KnowledgeUpgradeCardWidgets';

const ERA_NAME_KEYS: Record<number, string> = {
    [SymbolType.RELIGION]: 'era.special',
    [SymbolType.NORMAL]: 'era.normal',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
    [SymbolType.ANCIENT]: 'era.ancient',
    [SymbolType.UNIT]: 'era.normal',
    [SymbolType.ENEMY]: 'era.normal',
    [SymbolType.DISASTER]: 'era.normal',
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type ResearchPointsMouseHint = { id: number; x: number; y: number };

const TIERS: { level: number; ids: (number | null)[] }[] = [
    { level: 1,  ids: [9, 3, 8, 5] },
    { level: 4,  ids: [1, 7, null, 2] },
    { level: 7,  ids: [6, 4, 10] },
    { level: 10, ids: [15] },
];

/* Archery (id 5) -> Bronze (id 2); column index 3 in 4-col grid */
const KNOWLEDGE_TREE_CHIP = 110;
const KNOWLEDGE_TREE_GAP = 16;
const KNOWLEDGE_TREE_COLS = 4;
const KNOWLEDGE_TREE_TABLE_W =
    KNOWLEDGE_TREE_COLS * KNOWLEDGE_TREE_CHIP + (KNOWLEDGE_TREE_COLS - 1) * KNOWLEDGE_TREE_GAP;
const TIER_ROW_PAD_X = 48;
const TIER_LABEL_W = 72;
/** Lv label band width; chips center in the area to its right (until panel / viewport edge). */
const KNOWLEDGE_TREE_LABEL_BAND_PX = TIER_ROW_PAD_X + TIER_LABEL_W + 14;
/** Offset from 4-col grid center to column 4 center. */
const KNOWLEDGE_TREE_COL4_CENTER_OFFSET_PX =
    3 * (KNOWLEDGE_TREE_CHIP + KNOWLEDGE_TREE_GAP) +
    KNOWLEDGE_TREE_CHIP / 2 -
    KNOWLEDGE_TREE_TABLE_W / 2;
/** Chip-area center + offset; % is tree column width (panel is always beside the tree). */
const ARCHERY_TO_BRONZE_COL_CENTER = `calc((100% + ${KNOWLEDGE_TREE_LABEL_BAND_PX}px) / 2 + ${KNOWLEDGE_TREE_COL4_CENTER_OFFSET_PX}px)`;
const TIER_ROW_MIN_H = 130;
const TIER_STACK_GAP = 28;
const ARCHERY_BRONZE_LINE_GRAY = '#383c43';
const ARCHERY_BRONZE_LINE_WIDTH = 3;
const KNOWLEDGE_MAIN_ROW_GAP_PX = 24;

/** Inset rim + bottom pillar; default #555/#444; researched = subdued green (clear hue, not neon; pillar darker). */
const KNOWLEDGE_TREE_CHIP_FRAME_INSET_DEFAULT = '#555';
const KNOWLEDGE_TREE_CHIP_PILLAR_DEFAULT = '#444';
const KNOWLEDGE_TREE_CHIP_FRAME_INSET_RESEARCHED = '#469068';
const KNOWLEDGE_TREE_CHIP_PILLAR_RESEARCHED = '#26503a';

function knowledgeTreeChipFrameShadow(pressed: boolean, researched: boolean): string {
    const inset = researched ? KNOWLEDGE_TREE_CHIP_FRAME_INSET_RESEARCHED : KNOWLEDGE_TREE_CHIP_FRAME_INSET_DEFAULT;
    const pillar = researched ? KNOWLEDGE_TREE_CHIP_PILLAR_RESEARCHED : KNOWLEDGE_TREE_CHIP_PILLAR_DEFAULT;
    return pressed
        ? `inset 0 0 0 4px ${inset}, 0 1px 0 0 ${pillar}, 0 1px 6px rgba(0,0,0,0.4)`
        : `inset 0 0 0 4px ${inset}, 0 8px 0 0 ${pillar}, 0 8px 12px rgba(0,0,0,0.4)`;
}

/** Idle chip fill — same before/after research (border differentiates researched) */
const KNOWLEDGE_TREE_CHIP_IDLE_BG = '#1b1b1c';

/** Selected chip: dark gray + pressed look (not hue shift) */
const KNOWLEDGE_TREE_CHIP_SELECTED_BG = '#3a3a3a';

const KnowledgeUpgradesOverlay = ({ isOpen, onClose }: Props) => {
    useRegisterBoardTooltipBlock('knowledge-upgrades-overlay', isOpen);

    const unlockedUpgrades = useGameStore((s) => s.unlockedKnowledgeUpgrades);
    const currentLevel = useGameStore((s) => s.level);
    const levelUpResearchPoints = useGameStore((s) => s.levelUpResearchPoints ?? 0);
    const phase = useGameStore((s) => s.phase);
    const language = useSettingsStore((s) => s.language);

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [researchPointsMouseHints, setResearchPointsMouseHints] = useState<ResearchPointsMouseHint[]>([]);
    const researchHintIdRef = useRef(0);

    const selectedUpgrade = selectedId != null ? KNOWLEDGE_UPGRADES[selectedId] : null;
    const selectedUnlocked = selectedId != null && unlockedUpgrades.includes(selectedId);
    const selectedTierLevel = selectedId != null
        ? (TIERS.find(tier => tier.ids.includes(selectedId!))?.level ?? 1)
        : 1;
    const archeryBlocksBronze = selectedId === 2 && !unlockedUpgrades.includes(5);
    const hasResearchPoints = levelUpResearchPoints > 0;
    const canResearchWithCurrentPick =
        currentLevel >= selectedTierLevel &&
        selectedId != null &&
        isUpgradeLegalForKnowledgePick(selectedId, unlockedUpgrades, currentLevel);
    const canResearchSelected =
        hasResearchPoints &&
        !selectedUnlocked &&
        !archeryBlocksBronze &&
        canResearchWithCurrentPick;
    const researchButtonDisabled =
        selectedUnlocked || archeryBlocksBronze || (hasResearchPoints && !canResearchWithCurrentPick);

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
        if (!isOpen) {
            setSelectedId(null);
            setResearchPointsMouseHints([]);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const detailEraColor =
        selectedUpgrade != null ? getSymbolColorHex(selectedUpgrade.type) : '#888888';

    const handleUnlock = (e: ReactMouseEvent<HTMLButtonElement>) => {
        if (!selectedId || selectedUnlocked || archeryBlocksBronze) return;
        if (!hasResearchPoints) {
            researchHintIdRef.current += 1;
            const id = researchHintIdRef.current;
            setResearchPointsMouseHints((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
            return;
        }
        if (!canResearchSelected) return;
        const st = useGameStore.getState();
        if ((st.levelUpResearchPoints ?? 0) <= 0) return;
        const choice = KNOWLEDGE_UPGRADES[selectedId];
        if (!choice) return;
        useGameStore.setState({
            returnPhaseAfterDevKnowledgeUpgrade: phase,
        });
        useGameStore.getState().selectUpgrade(selectedId);
        // Stay on tree overlay; close only if upgrade opens destroy-selection flow.
        const ph = useGameStore.getState().phase;
        if (ph === 'destroy_selection' || ph === 'oblivion_furnace_board') {
            onClose();
        }
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
            <div
                style={{
                    padding: '24px 32px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                }}
            >
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
                        flexShrink: 0,
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
                <h1
                    style={{
                        margin: 0,
                        flex: 1,
                        minWidth: 0,
                        fontFamily: 'Mulmaru, sans-serif',
                        fontSize: 'clamp(22px, 2.4vw, 30px)',
                        fontWeight: 'bold',
                        color: '#f1f5f9',
                        letterSpacing: '0.08em',
                        lineHeight: 1.2,
                    }}
                >
                    {t('game.knowledgeUpgradeTreeTitle', language)}
                </h1>
                <div
                    role="status"
                    aria-label={`${t('game.levelUpResearchPointsLabel', language)}: ${levelUpResearchPoints}`}
                    style={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                        fontFamily: 'Mulmaru, sans-serif',
                        fontSize: 'clamp(22px, 2.4vw, 30px)',
                        fontWeight: 'bold',
                        color: '#f1f5f9',
                        letterSpacing: '0.08em',
                        lineHeight: 1.2,
                    }}
                >
                    <span>{t('game.levelUpResearchPointsLabel', language)}</span>
                    <span aria-hidden>:</span>
                    <span
                        style={{
                            color: '#60a5fa',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {levelUpResearchPoints}
                    </span>
                </div>
            </div>

            {/* 트리 본문 — 세로 타임라인 */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'row',
                    minHeight: 0,
                    padding: `10px ${KNOWLEDGE_MAIN_ROW_GAP_PX + 4}px 28px 32px`,
                    gap: KNOWLEDGE_MAIN_ROW_GAP_PX,
                    boxSizing: 'border-box',
                }}
            >
            <div
                style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: TIER_STACK_GAP,
                    overflowY: 'auto',
                    paddingBottom: 8,
                    position: 'relative',
                }}
            >
                {TIERS.map((tier) => {
                    const tierUnlockable = currentLevel >= tier.level;
                    const dashColor = tierUnlockable ? '#fbbf2428' : '#1e1e1e';
                    const labelColor = tierUnlockable ? '#fbbf24cc' : '#3a3a3a';

                    return (
                        <div
                            key={tier.level}
                            style={{
                                position: 'relative',
                                flex: '0 0 auto',
                                minHeight: `${TIER_ROW_MIN_H}px`,
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


                            {/* 업그레이드 버튼들 */}
                            <div
                                style={{
                                    position: 'relative',
                                    zIndex: 1,
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    paddingLeft: KNOWLEDGE_TREE_LABEL_BAND_PX,
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    minHeight: `${TIER_ROW_MIN_H}px`,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        gap: `${KNOWLEDGE_TREE_GAP}px`,
                                        alignItems: 'center',
                                        width: `${KNOWLEDGE_TREE_TABLE_W}px`,
                                        flexShrink: 0,
                                    }}
                                >
                                {[...tier.ids, ...Array(Math.max(0, KNOWLEDGE_TREE_COLS - tier.ids.length)).fill(null)]
                                    .slice(0, KNOWLEDGE_TREE_COLS)
                                    .map((id, slotIdx) => {
                                    if (id === null) {
                                        return (
                                            <div key={`empty-${tier.level}-${slotIdx}`} style={{ width: `${KNOWLEDGE_TREE_CHIP}px`, flexShrink: 0 }} />
                                        );
                                    }
                                    const upgrade = KNOWLEDGE_UPGRADES[id];
                                    if (!upgrade) return null;
                                    const unlocked = unlockedUpgrades.includes(id);

                                    // 의존성 체크 (UI 전용)
                                    const isLockedByDependency = id === 2 && !unlockedUpgrades.includes(5);

                                    const isSelected = selectedId === id;
                                    const name = t(`knowledgeUpgrade.${id}.name`, language) || upgrade.name;
                                    const rowBright = tierUnlockable && !isLockedByDependency;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            className="knowledge-upgrade-chip"
                                            title={name}
                                            onClick={() => setSelectedId(isSelected ? null : id)}
                                            style={{
                                                width: `${KNOWLEDGE_TREE_CHIP}px`,
                                                height: `${KNOWLEDGE_TREE_CHIP}px`,
                                                flex: 'none',
                                                padding: 0,
                                                display: 'block',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                borderRadius: 0,
                                                filter: rowBright ? 'none' : 'brightness(0.5)',
                                                boxShadow: knowledgeTreeChipFrameShadow(isSelected, unlocked),
                                                background: isSelected
                                                    ? KNOWLEDGE_TREE_CHIP_SELECTED_BG
                                                    : KNOWLEDGE_TREE_CHIP_IDLE_BG,
                                                color: unlocked ? '#fff' : 'rgba(220,220,220,0.85)',
                                                cursor: 'pointer',
                                                transform: isSelected ? 'translateY(5px)' : 'none',
                                                transition:
                                                    'background 0.15s ease, filter 0.15s ease, box-shadow 0.1s ease, transform 0.1s ease',
                                            }}
                                        >
                                            <img
                                                src={resolveUpgradeSprite(upgrade.sprite)}
                                                alt={name}
                                                title={name}
                                                draggable={false}
                                                style={{
                                                    position: 'absolute',
                                                    left: '50%',
                                                    top: '50%',
                                                    width: '82%',
                                                    height: '82%',
                                                    transform: 'translate(-50%, -50%)',
                                                    objectFit: 'contain',
                                                    imageRendering: 'pixelated',
                                                    pointerEvents: 'none',
                                                }}
                                            />
                                        </button>
                                    );
                                })}
                                </div>
                            </div>

                            {/* Lv label over grid (same x as before) */}
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${TIER_ROW_PAD_X}px`,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 2,
                                    width: `${TIER_LABEL_W}px`,
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
                        </div>
                    );
                })}
                {!unlockedUpgrades.includes(2) && (
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            left: ARCHERY_TO_BRONZE_COL_CENTER,
                            top: `calc(${TIER_ROW_MIN_H}px / 2 + ${KNOWLEDGE_TREE_CHIP / 2}px)`,
                            height: `calc(${TIER_ROW_MIN_H}px / 2 + ${TIER_STACK_GAP}px + ${TIER_ROW_MIN_H}px / 2 - ${KNOWLEDGE_TREE_CHIP}px)`,
                            width: ARCHERY_BRONZE_LINE_WIDTH,
                            transform: 'translateX(-50%)',
                            background: ARCHERY_BRONZE_LINE_GRAY,
                            pointerEvents: 'none',
                            zIndex: 0,
                        }}
                    />
                )}
            </div>

            <div className="knowledge-upgrade-detail-panel">
                {selectedUpgrade ? (
                    <>
                        <div className="knowledge-upgrade-detail-panel-scroll">
                            <div className="symbol-tooltip-name">
                                {selectedUnlocked && (
                                    <span style={{ marginRight: 6, color: '#86efac' }} aria-hidden>
                                        ✓
                                    </span>
                                )}
                                {t(`knowledgeUpgrade.${selectedId}.name`, language) || selectedUpgrade.name}
                            </div>
                            <div
                                className="symbol-tooltip-rarity"
                                style={{
                                    color: detailEraColor,
                                    fontWeight: 'bold',
                                    letterSpacing: '2px',
                                    textShadow: `0 0 10px ${detailEraColor}80`,
                                    marginTop: '4px',
                                }}
                            >
                                {t(ERA_NAME_KEYS[selectedUpgrade.type], language)}
                            </div>
                            <div className="knowledge-upgrade-detail-tier">
                                Lv.{selectedTierLevel} 해금
                            </div>
                            <div className="symbol-tooltip-desc" style={{ marginTop: '8px' }}>
                                {(t(`knowledgeUpgrade.${selectedId}.desc`, language) || selectedUpgrade.description)
                                    .split('\n')
                                    .map((line, i) => (
                                        <div key={i} className="symbol-tooltip-desc-line">
                                            <EffectText text={line} />
                                        </div>
                                    ))}
                            </div>
                            {selectedUpgrade.descSymbols && selectedUpgrade.descSymbols.length > 0 && (
                                <div
                                    style={{
                                        marginTop: '6px',
                                        paddingTop: '6px',
                                        borderTop: '1px solid #444',
                                    }}
                                >
                                    <UpgradeCardDescSymbols
                                        upgradeId={selectedId!}
                                        entries={selectedUpgrade.descSymbols}
                                        layoutSize="panel"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="knowledge-upgrade-detail-panel-actions" style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                className="bottom-right-btn"
                                onClick={handleUnlock}
                                disabled={researchButtonDisabled}
                                style={{
                                    width: '100%',
                                    maxWidth: '280px',
                                    padding: '12px 16px',
                                    boxSizing: 'border-box',
                                    fontFamily: 'Mulmaru, sans-serif',
                                    letterSpacing: '0.04em',
                                    lineHeight: 1.25,
                                    borderRadius: 0,
                                    opacity: selectedUnlocked ? 0.4 : researchButtonDisabled ? 0.3 : 1,
                                    background: selectedUnlocked
                                        ? 'rgba(40,85,48,0.45)'
                                        : 'rgba(80,40,0,0.9)',
                                    boxShadow: selectedUnlocked || researchButtonDisabled
                                        ? 'inset 0 0 0 4px #333, 0 6px 0 0 #222, 0 6px 10px rgba(0,0,0,0.35)'
                                        : 'inset 0 0 0 4px #fbbf2455, 0 6px 0 0 #7c3100, 0 6px 16px rgba(251,191,36,0.25)',
                                    color: selectedUnlocked ? '#86a878' : '#fbbf24',
                                    cursor: selectedUnlocked || researchButtonDisabled ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {selectedUnlocked
                                    ? '이미 연구됨'
                                    : archeryBlocksBronze
                                        ? t('knowledgeUpgrade.requiresArcheryShort', language)
                                        : hasResearchPoints && currentLevel < selectedTierLevel
                                            ? `Lv.${selectedTierLevel} 필요`
                                            : hasResearchPoints &&
                                                selectedId != null &&
                                                !isUpgradeLegalForKnowledgePick(
                                                    selectedId,
                                                    unlockedUpgrades,
                                                    currentLevel,
                                                )
                                              ? '이번 연구로 선택 불가'
                                              : '연구하기'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div
                        className="knowledge-upgrade-detail-panel-scroll"
                        style={{ justifyContent: 'center', textAlign: 'center' }}
                    >
                        <p className="symbol-tooltip-desc-line" style={{ margin: 0, color: '#94a3b8', lineHeight: 1.65 }}>
                            트리에서 업그레이드를 선택하세요.
                            <br />
                            상세 정보와 연구하기가 여기에 표시됩니다.
                        </p>
                    </div>
                )}
            </div>
            </div>

            {typeof document !== 'undefined' &&
                researchPointsMouseHints.length > 0 &&
                createPortal(
                    researchPointsMouseHints.map((h) => (
                        <div
                            key={h.id}
                            className="knowledge-research-mouse-hint"
                            style={{ left: h.x, top: h.y }}
                            onAnimationEnd={() =>
                                setResearchPointsMouseHints((prev) => prev.filter((p) => p.id !== h.id))
                            }
                        >
                            {t('game.levelUpResearchPointsRequired', language)}
                        </div>
                    )),
                    document.body,
                )}
        </div>
    );
};

export default KnowledgeUpgradesOverlay;
