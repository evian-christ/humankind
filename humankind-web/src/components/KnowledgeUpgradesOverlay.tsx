import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { useGameStore } from '../game/state/gameStore';
import { isUpgradeLegalForKnowledgePick } from '../game/state/gameCalculations';
import { useSettingsStore } from '../game/state/settingsStore';
import {
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    getKnowledgeUpgradeDirectDependents,
    getKnowledgeUpgradeDirectPrerequisites,
} from '../game/data/knowledgeUpgrades';
import {
    isKnowledgeUpgradeLockedByResearchCutoff,
    KNOWLEDGE_UPGRADE_TIER_ROWS,
} from '../game/data/knowledgeUpgradeTiers';
import { getSymbolColorHex, SymbolType } from '../game/data/symbolDefinitions';
import { t } from '../i18n';
import { EffectText } from './EffectText';
import { UpgradeCardDescSymbols } from './KnowledgeUpgradeCardWidgets';
import { resolveUpgradeSprite } from './knowledgeUpgradeSprites';
import { audioManager } from '../audio/audioManager';

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
    [SymbolType.SPECIAL]: 'era.specialSymbol',
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tutorialStep?: number;
    onTutorialStepChange?: (step: number) => void;
}

type ResearchPointsMouseHint = { id: number; x: number; y: number };
type KnowledgeConnectorLine = {
    from: number;
    to: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    prerequisiteCount: number;
};
type KnowledgeConnectorRenderLine = KnowledgeConnectorLine & { active: boolean; dimmed: boolean };
type KnowledgeUpgradeTooltipPosition = {
    left: number;
    top: number;
    placement: 'left' | 'right';
};

/** 칩 열 수 — 개발용 확장 13열 */
const KNOWLEDGE_TREE_GRID_COLS = 13;

function buildCenteredTierRow(...upgradeIds: number[]): (number | null)[] {
    const row = Array<number | null>(KNOWLEDGE_TREE_GRID_COLS).fill(null);
    if (upgradeIds.length === 0) return row;

    const minWidth = upgradeIds.length * 2 - 1;
    const startCol = Math.max(0, Math.floor((KNOWLEDGE_TREE_GRID_COLS - minWidth) / 2));

    for (let i = 0; i < upgradeIds.length; i += 1) {
        const colIdx = startCol + i * 2;
        if (colIdx >= 0 && colIdx < KNOWLEDGE_TREE_GRID_COLS) row[colIdx] = upgradeIds[i]!;
    }

    return row;
}

const TIERS: { level: number; ids: (number | null)[] }[] = [
    ...KNOWLEDGE_UPGRADE_TIER_ROWS.filter((tier) => tier.level >= 1).map((tier) => ({
        level: tier.level,
        ids: buildCenteredTierRow(...tier.ids),
    })),
];

const KNOWLEDGE_TREE_CHIP = 110;
const KNOWLEDGE_TREE_GAP = 16;
const TIER_ROW_PAD_X = 48;
const TIER_LABEL_W = 72;
/** Lv 라벨이 들어가는 첫 열 너비(단일 그리드의 1열). */
const KNOWLEDGE_TREE_LABEL_BAND_PX = TIER_ROW_PAD_X + TIER_LABEL_W + 14;
const KNOWLEDGE_TREE_BODY_PAD_TOP = 0;
const TIER_ROW_MIN_H = 130;
const TIER_STACK_GAP = 28;
const KNOWLEDGE_CONNECTOR_COLOR = '#4b4e55';
const KNOWLEDGE_CONNECTOR_DIM_COLOR = '#202228';
const KNOWLEDGE_CONNECTOR_ACTIVE_COLOR = '#6b7280';
const ARCHERY_BRONZE_LINE_WIDTH = 3;
const KNOWLEDGE_CONNECTOR_PORT_W = 28;
const KNOWLEDGE_CONNECTOR_PORT_H = 4;
const KNOWLEDGE_CONNECTOR_PORT_SHADOW = '#24262b';
/** Inset rim + bottom pillar; default #555/#444; researched = subdued green (clear hue, not neon; pillar darker). */
const KNOWLEDGE_TREE_CHIP_FRAME_INSET_DEFAULT = '#555';
const KNOWLEDGE_TREE_CHIP_PILLAR_DEFAULT = '#444';
const KNOWLEDGE_TREE_CHIP_FRAME_INSET_RESEARCHED = '#469068';
const KNOWLEDGE_TREE_CHIP_PILLAR_RESEARCHED = '#26503a';
const KNOWLEDGE_TREE_CHIP_PILLAR_IDLE_OFFSET = 8;
const KNOWLEDGE_TREE_CHIP_PILLAR_PRESSED_OFFSET = 1;
const KNOWLEDGE_TREE_CHIP_PRESSED_TRANSLATE_Y = 5;
const KNOWLEDGE_TREE_CHIP_INNER_FRAME_INSET = 8;

function knowledgeTreeChipFrameShadow(pressed: boolean, researched: boolean): string {
    const inset = researched ? KNOWLEDGE_TREE_CHIP_FRAME_INSET_RESEARCHED : KNOWLEDGE_TREE_CHIP_FRAME_INSET_DEFAULT;
    const pillar = researched ? KNOWLEDGE_TREE_CHIP_PILLAR_RESEARCHED : KNOWLEDGE_TREE_CHIP_PILLAR_DEFAULT;
    return pressed
        ? `inset 0 0 0 4px ${inset}, 0 ${KNOWLEDGE_TREE_CHIP_PILLAR_PRESSED_OFFSET}px 0 0 ${pillar}, 0 ${KNOWLEDGE_TREE_CHIP_PILLAR_PRESSED_OFFSET}px 6px rgba(0,0,0,0.4)`
        : `inset 0 0 0 4px ${inset}, 0 ${KNOWLEDGE_TREE_CHIP_PILLAR_IDLE_OFFSET}px 0 0 ${pillar}, 0 ${KNOWLEDGE_TREE_CHIP_PILLAR_IDLE_OFFSET}px 12px rgba(0,0,0,0.4)`;
}

function knowledgeTreeChipFrameColor(researched: boolean): string {
    return researched ? KNOWLEDGE_TREE_CHIP_FRAME_INSET_RESEARCHED : KNOWLEDGE_TREE_CHIP_FRAME_INSET_DEFAULT;
}

/** Idle chip fill — same before/after research (border differentiates researched) */
const KNOWLEDGE_TREE_CHIP_IDLE_BG = '#1b1b1c';

/** Selected chip: dark gray + pressed look (not hue shift) */
const KNOWLEDGE_TREE_CHIP_SELECTED_BG = '#3a3a3a';
const KNOWLEDGE_TREE_CHIP_HOVER_BG = '#24262b';
const KNOWLEDGE_CONNECTOR_IDLE_OPACITY = 0.16;
const KNOWLEDGE_CONNECTOR_DIMMED_OPACITY = 0.08;
const KNOWLEDGE_CONNECTOR_ACTIVE_OPACITY = 0.95;
const KNOWLEDGE_HEADER_BG = '#0e1722';
const KNOWLEDGE_TIER_AVAILABLE_BG = 'rgba(96,165,250,0.08)';

/** 칩 6열 + 열 사이 간격 */
function knowledgeTreeGridWidthPx(): number {
    return (
        KNOWLEDGE_TREE_GRID_COLS * KNOWLEDGE_TREE_CHIP +
        (KNOWLEDGE_TREE_GRID_COLS - 1) * KNOWLEDGE_TREE_GAP
    );
}

function findTierGridSlot(upgradeId: number): { rowIdx: number; colIdx: number } | null {
    for (let rowIdx = 0; rowIdx < TIERS.length; rowIdx += 1) {
        const colIdx = TIERS[rowIdx]!.ids.indexOf(upgradeId);
        if (colIdx >= 0) return { rowIdx, colIdx };
    }
    return null;
}

function getTierLevelForUpgrade(upgradeId: number | null): number {
    if (upgradeId == null) return 1;
    return TIERS.find((tier) => tier.ids.includes(upgradeId))?.level ?? 1;
}

function getTierRowHeightPx(_rowIdx: number): number {
    return TIER_ROW_MIN_H;
}

function getTierRowTopPx(rowIdx: number): number {
    let top = 0;
    for (let i = 0; i < rowIdx; i += 1) {
        top += getTierRowHeightPx(i) + TIER_STACK_GAP;
    }
    return top;
}

function getKnowledgeAvailableBackgroundHeightPx(currentLevel: number): number {
    for (let tierIdx = TIERS.length - 1; tierIdx >= 0; tierIdx -= 1) {
        if (TIERS[tierIdx]!.level <= currentLevel) {
            return getTierRowTopPx(tierIdx) + getTierRowHeightPx(tierIdx) / 2;
        }
    }

    return 0;
}

function collectConnectedUpgradeIds(upgradeId: number | null): Set<number> {
    if (upgradeId == null) return new Set<number>();

    const visited = new Set<number>();
    const stack = [upgradeId];

    while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;
        visited.add(current);

        for (const prereqId of getKnowledgeUpgradeDirectPrerequisites(current)) {
            if (!visited.has(prereqId)) stack.push(prereqId);
        }
        for (const dependentId of getKnowledgeUpgradeDirectDependents(current)) {
            if (!visited.has(dependentId)) stack.push(dependentId);
        }
    }

    return visited;
}

function KnowledgeConnectorSegment({ seg }: { seg: KnowledgeConnectorRenderLine }) {
    const connectorColor = seg.active
        ? KNOWLEDGE_CONNECTOR_ACTIVE_COLOR
        : seg.dimmed
            ? KNOWLEDGE_CONNECTOR_DIM_COLOR
            : KNOWLEDGE_CONNECTOR_COLOR;
    const connectorOpacity = seg.active
        ? KNOWLEDGE_CONNECTOR_ACTIVE_OPACITY
        : seg.dimmed
            ? KNOWLEDGE_CONNECTOR_DIMMED_OPACITY
            : KNOWLEDGE_CONNECTOR_IDLE_OPACITY;

    return (
        <g opacity={connectorOpacity}>
            <line
                x1={seg.x1}
                y1={seg.y1 + KNOWLEDGE_CONNECTOR_PORT_H}
                x2={seg.x2}
                y2={seg.y2}
                stroke={connectorColor}
                strokeWidth={ARCHERY_BRONZE_LINE_WIDTH}
                strokeLinecap="round"
            />
            <rect
                x={seg.x1 - KNOWLEDGE_CONNECTOR_PORT_W / 2}
                y={seg.y1}
                width={KNOWLEDGE_CONNECTOR_PORT_W}
                height={KNOWLEDGE_CONNECTOR_PORT_H}
                fill={connectorColor}
            />
            <rect
                x={seg.x1 - KNOWLEDGE_CONNECTOR_PORT_W / 2}
                y={seg.y1 + KNOWLEDGE_CONNECTOR_PORT_H}
                width={KNOWLEDGE_CONNECTOR_PORT_W}
                height={2}
                fill={KNOWLEDGE_CONNECTOR_PORT_SHADOW}
            />
            <rect
                x={seg.x2 - KNOWLEDGE_CONNECTOR_PORT_W / 2}
                y={seg.y2 - KNOWLEDGE_CONNECTOR_PORT_H}
                width={KNOWLEDGE_CONNECTOR_PORT_W}
                height={KNOWLEDGE_CONNECTOR_PORT_H}
                fill={connectorColor}
            />
            <rect
                x={seg.x2 - KNOWLEDGE_CONNECTOR_PORT_W / 2}
                y={seg.y2 - KNOWLEDGE_CONNECTOR_PORT_H - 2}
                width={KNOWLEDGE_CONNECTOR_PORT_W}
                height={2}
                fill={KNOWLEDGE_CONNECTOR_PORT_SHADOW}
            />
        </g>
    );
}

const KnowledgeUpgradesOverlay = ({ isOpen, onClose, tutorialStep, onTutorialStepChange }: Props) => {
    useRegisterBoardTooltipBlock('knowledge-upgrades-overlay', isOpen);

    const unlockedUpgrades = useGameStore((s) => s.unlockedKnowledgeUpgrades);
    const currentLevel = useGameStore((s) => s.level);
    const levelUpResearchPoints = useGameStore((s) => s.levelUpResearchPoints ?? 0);
    const phase = useGameStore((s) => s.phase);
    const language = useSettingsStore((s) => s.language);

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [researchPointsMouseHints, setResearchPointsMouseHints] = useState<ResearchPointsMouseHint[]>([]);
    const researchHintIdRef = useRef(0);
    const overlayRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const treeScrollRef = useRef<HTMLDivElement>(null);
    const treeContentRef = useRef<HTMLDivElement>(null);
    const savedTreeScrollTopRef = useRef(0);
    const [connectorLines, setConnectorLines] = useState<KnowledgeConnectorLine[]>([]);
    const [tooltipPosition, setTooltipPosition] = useState<KnowledgeUpgradeTooltipPosition | null>(null);

    const tutorialRestrictsHover = tutorialStep != null && tutorialStep >= 17 && tutorialStep <= 21;
    const activeFocusId = tutorialRestrictsHover
        ? selectedId
        : hoveredId ?? selectedId;
    const detailId = activeFocusId;
    const detailUpgrade = detailId != null ? KNOWLEDGE_UPGRADES[detailId] : null;
    const detailUnlocked = detailId != null && unlockedUpgrades.includes(detailId);
    const detailTierLevel = getTierLevelForUpgrade(detailId);
    const selectedUnlocked = selectedId != null && unlockedUpgrades.includes(selectedId);
    const selectedTierLevel = getTierLevelForUpgrade(selectedId);
    const activeConnectionIds = collectConnectedUpgradeIds(activeFocusId);
    const detailDirectPrereqs = detailId != null ? [...getKnowledgeUpgradeDirectPrerequisites(detailId)] : [];
    const detailDirectDependents = detailId != null ? [...getKnowledgeUpgradeDirectDependents(detailId)] : [];
    const selectedDirectPrereqs = selectedId != null ? [...getKnowledgeUpgradeDirectPrerequisites(selectedId)] : [];
    const unmetSelectedPrereqs = selectedDirectPrereqs.filter((prereqId) => !unlockedUpgrades.includes(prereqId));
    const unmetSelectedPrereqNames = unmetSelectedPrereqs.map((prereqId) =>
        t(`knowledgeUpgrade.${prereqId}.name`, language) || KNOWLEDGE_UPGRADES[prereqId]?.name || `#${prereqId}`,
    );
    const hasResearchPoints = levelUpResearchPoints > 0;
    const availableBackgroundHeightPx = getKnowledgeAvailableBackgroundHeightPx(currentLevel);
    const selectedLockedByResearchCutoff =
        selectedId != null && isKnowledgeUpgradeLockedByResearchCutoff(selectedId, currentLevel);
    const canResearchWithCurrentPick =
        currentLevel >= selectedTierLevel &&
        selectedId != null &&
        isUpgradeLegalForKnowledgePick(selectedId, unlockedUpgrades, currentLevel);
    const canResearchSelected = hasResearchPoints && !selectedUnlocked && unmetSelectedPrereqs.length === 0 && canResearchWithCurrentPick;
    const needsHigherLevel = selectedId != null && currentLevel < selectedTierLevel;
    const tutorialResearchLocked = tutorialStep === 19;
    const researchButtonDisabled =
        selectedId == null ||
        selectedUnlocked ||
        unmetSelectedPrereqs.length > 0 ||
        needsHigherLevel ||
        selectedLockedByResearchCutoff ||
        tutorialResearchLocked ||
        (hasResearchPoints && !canResearchWithCurrentPick);

    const updateKnowledgeTreeConnectors = useCallback(() => {
        const contentEl = treeContentRef.current;
        if (!contentEl) {
            setConnectorLines([]);
            return;
        }
        const gridWidth = knowledgeTreeGridWidthPx();
        const centeredGridStartX =
            KNOWLEDGE_TREE_LABEL_BAND_PX +
            Math.max(0, (contentEl.clientWidth - KNOWLEDGE_TREE_LABEL_BAND_PX - gridWidth) / 2);
        const xForCol = (colIdx: number) =>
            centeredGridStartX + colIdx * (KNOWLEDGE_TREE_CHIP + KNOWLEDGE_TREE_GAP) + KNOWLEDGE_TREE_CHIP / 2;
        const bottomAnchorY = (rowIdx: number, pressed: boolean) =>
            getTierRowTopPx(rowIdx) +
            (getTierRowHeightPx(rowIdx) + KNOWLEDGE_TREE_CHIP) / 2 +
            (pressed ? KNOWLEDGE_TREE_CHIP_PRESSED_TRANSLATE_Y : 0);
        const topAnchorY = (rowIdx: number, pressed: boolean) =>
            getTierRowTopPx(rowIdx) +
            (getTierRowHeightPx(rowIdx) - KNOWLEDGE_TREE_CHIP) / 2 +
            (pressed ? KNOWLEDGE_TREE_CHIP_PRESSED_TRANSLATE_Y : 0);

        const next: KnowledgeConnectorLine[] = [];
        for (const [upgradeIdRaw] of Object.entries(KNOWLEDGE_UPGRADES)) {
            const upgradeId = Number(upgradeIdRaw);
            const targetPos = findTierGridSlot(upgradeId);
            if (!targetPos) continue;
            const prerequisites = getKnowledgeUpgradeDirectPrerequisites(upgradeId);
            for (const prereqId of prerequisites) {
                const sourcePos = findTierGridSlot(prereqId);
                if (!sourcePos) continue;
                next.push({
                    from: prereqId,
                    to: upgradeId,
                    x1: xForCol(sourcePos.colIdx),
                    y1: bottomAnchorY(sourcePos.rowIdx, activeFocusId === prereqId),
                    x2: xForCol(targetPos.colIdx),
                    y2: topAnchorY(targetPos.rowIdx, activeFocusId === upgradeId),
                    prerequisiteCount: prerequisites.length,
                });
            }
        }

        setConnectorLines(next);
    }, [activeFocusId]);

    const updateDetailTooltipPosition = useCallback(() => {
        if (detailId == null) {
            setTooltipPosition(null);
            return;
        }

        const overlayEl = overlayRef.current;
        if (!overlayEl) return;

        const anchorEl = overlayEl.querySelector<HTMLElement>(
            `[data-knowledge-upgrade-id="${detailId}"]`,
        );
        if (!anchorEl) {
            setTooltipPosition(null);
            return;
        }

        const rootEl = document.getElementById('root');
        if (!rootEl) return;

        const anchorRect = anchorEl.getBoundingClientRect();
        const rootRect = rootEl.getBoundingClientRect();
        const scaleX = rootRect.width / rootEl.clientWidth;
        const scaleY = rootRect.height / rootEl.clientHeight;
        const anchorLeft = (anchorRect.left - rootRect.left) / scaleX;
        const anchorRight = (anchorRect.right - rootRect.left) / scaleX;
        const anchorTop = (anchorRect.top - rootRect.top) / scaleY;
        const tooltipEl = tooltipRef.current;
        const tooltipWidth = tooltipEl?.offsetWidth ?? 520;
        const tooltipHeight = tooltipEl?.offsetHeight ?? 640;
        const margin = 12;
        const minInset = 20;
        const viewportWidth = rootEl.clientWidth;
        const viewportHeight = rootEl.clientHeight;
        const preferredLeft = anchorRight + margin;
        const canPlaceRight = preferredLeft + tooltipWidth <= viewportWidth - minInset;
        const placement: 'left' | 'right' = canPlaceRight ? 'right' : 'left';
        const unclampedLeft = placement === 'right'
            ? preferredLeft
            : anchorLeft - tooltipWidth - margin;
        const left = Math.min(
            Math.max(minInset, unclampedLeft),
            Math.max(minInset, viewportWidth - tooltipWidth - minInset),
        );
        const top = Math.min(
            Math.max(minInset, anchorTop),
            Math.max(minInset, viewportHeight - tooltipHeight - minInset),
        );

        setTooltipPosition({ left, top, placement });
    }, [detailId]);

    useLayoutEffect(() => {
        if (!isOpen) return;
        const raf = requestAnimationFrame(() => {
            if (scrollEl) scrollEl.scrollTop = savedTreeScrollTopRef.current;
            updateKnowledgeTreeConnectors();
            updateDetailTooltipPosition();
        });
        const contentEl = treeContentRef.current;
        const tooltipEl = tooltipRef.current;
        const scrollEl = treeScrollRef.current;
        if (!contentEl) return () => cancelAnimationFrame(raf);
        const ro = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => {
                updateKnowledgeTreeConnectors();
                updateDetailTooltipPosition();
            })
            : null;
        ro?.observe(contentEl);
        if (tooltipEl) ro?.observe(tooltipEl);
        scrollEl?.addEventListener('scroll', updateKnowledgeTreeConnectors, { passive: true });
        scrollEl?.addEventListener('scroll', updateDetailTooltipPosition, { passive: true });
        window.addEventListener('resize', updateKnowledgeTreeConnectors);
        window.addEventListener('resize', updateDetailTooltipPosition);
        return () => {
            cancelAnimationFrame(raf);
            ro?.disconnect();
            scrollEl?.removeEventListener('scroll', updateKnowledgeTreeConnectors);
            scrollEl?.removeEventListener('scroll', updateDetailTooltipPosition);
            window.removeEventListener('resize', updateKnowledgeTreeConnectors);
            window.removeEventListener('resize', updateDetailTooltipPosition);
        };
    }, [isOpen, updateKnowledgeTreeConnectors, updateDetailTooltipPosition, language, detailId]);

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
            queueMicrotask(() => {
                setSelectedId(null);
                setHoveredId(null);
                setTooltipPosition(null);
                setResearchPointsMouseHints([]);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const detailEraColor =
        detailUpgrade != null ? getSymbolColorHex(detailUpgrade.type) : '#888888';
    const connectorRenderLines: KnowledgeConnectorRenderLine[] = connectorLines.map((line) => ({
        ...line,
        active:
            activeFocusId != null &&
            activeConnectionIds.has(line.from) &&
            activeConnectionIds.has(line.to),
        dimmed:
            activeFocusId != null &&
            !(activeConnectionIds.has(line.from) && activeConnectionIds.has(line.to)),
    }));
    const playKnowledgeUpgradeSound = () => {
        void audioManager.play('knowledge_upgraded_1');
        void audioManager.getCueDurationMs('knowledge_upgraded_1')
            .then((durationMs) => {
                window.setTimeout(() => {
                    void audioManager.play('knowledge_upgraded_2');
                }, Math.max(0, durationMs ?? 0));
            });
    };

    const handleUnlock = (e: ReactMouseEvent<HTMLButtonElement>) => {
        if (tutorialResearchLocked) {
            void audioManager.play('denied');
            return;
        }
        if (!selectedId || selectedUnlocked || unmetSelectedPrereqs.length > 0 || needsHigherLevel) {
            void audioManager.play('denied');
            return;
        }
        if (!hasResearchPoints) {
            void audioManager.play('denied');
            researchHintIdRef.current += 1;
            const id = researchHintIdRef.current;
            setResearchPointsMouseHints((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
            return;
        }
        if (!canResearchSelected) {
            void audioManager.play('denied');
            return;
        }
        const st = useGameStore.getState();
        if ((st.levelUpResearchPoints ?? 0) <= 0) {
            void audioManager.play('denied');
            return;
        }
        const choice = KNOWLEDGE_UPGRADES[selectedId];
        if (!choice) {
            void audioManager.play('denied');
            return;
        }
        playKnowledgeUpgradeSound();
        useGameStore.setState({
            returnPhaseAfterDevKnowledgeUpgrade: phase,
        });
        useGameStore.getState().selectUpgrade(selectedId);
        if (tutorialStep === 20 && selectedId === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID) {
            setSelectedId(null);
            onTutorialStepChange?.(21);
            return;
        }
        setSelectedId(null);
    };

    return (
        <div
            ref={overlayRef}
            className="knowledge-upgrades-overlay"
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
                    position: 'relative',
                    zIndex: 2,
                    padding: '24px 32px',
                    background: KNOWLEDGE_HEADER_BG,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                }}
            >
                <button
                    className="knowledge-upgrades-back-btn"
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
                    minHeight: 0,
                    padding: `${KNOWLEDGE_TREE_BODY_PAD_TOP}px 0 28px`,
                    boxSizing: 'border-box',
                    position: 'relative',
                    zIndex: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    ref={treeScrollRef}
                    className="knowledge-upgrades-tree-scroll"
                    onScroll={(e) => {
                        savedTreeScrollTopRef.current = e.currentTarget.scrollTop;
                    }}
                    style={{
                        flex: 1,
                        width: '100%',
                        minHeight: 0,
                        boxSizing: 'border-box',
                        overflowY: 'auto',
                        paddingBottom: 8,
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <div
                        ref={treeContentRef}
                        style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: TIER_STACK_GAP,
                        }}
                    >
                        {availableBackgroundHeightPx > 0 && (
                            <div
                                aria-hidden
                                data-knowledge-available-background
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    top: 0,
                                    height: `${availableBackgroundHeightPx}px`,
                                    background: KNOWLEDGE_TIER_AVAILABLE_BG,
                                    pointerEvents: 'none',
                                    zIndex: 0,
                                }}
                            />
                        )}
                        {TIERS.map((tier) => {
                            const tierRowHeight = getTierRowHeightPx(TIERS.indexOf(tier));
                            const tierUnlockable = currentLevel >= tier.level;
                            const dashColor = tierUnlockable ? '#fbbf2428' : '#1e1e1e';
                            const labelColor = tierUnlockable ? '#fbbf24cc' : '#3a3a3a';

                            return (
                                <div
                                    key={tier.level}
                                    style={{
                                        position: 'relative',
                                        flex: '0 0 auto',
                                        minHeight: `${tierRowHeight}px`,
                                    }}
                                >
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
                                            paddingRight: '14px',
                                            textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                                        }}
                                    >
                                        Lv.{tier.level}
                                    </div>

                                    <div
                                        style={{
                                            position: 'relative',
                                            zIndex: 4,
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            paddingLeft: KNOWLEDGE_TREE_LABEL_BAND_PX,
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            minHeight: `${TIER_ROW_MIN_H}px`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: `repeat(${KNOWLEDGE_TREE_GRID_COLS}, ${KNOWLEDGE_TREE_CHIP}px)`,
                                                gap: `${KNOWLEDGE_TREE_GAP}px`,
                                                flexShrink: 0,
                                            }}
                                            >
                                            {tier.ids.map((id, slotIdx) => {
                                                if (id === null) {
                                                    return (
                                                        <div
                                                            key={`empty-${tier.level}-${slotIdx}`}
                                                            style={{
                                                                width: `${KNOWLEDGE_TREE_CHIP}px`,
                                                                height: `${KNOWLEDGE_TREE_CHIP}px`,
                                                            }}
                                                        />
                                                    );
                                                }
                                                const upgrade = KNOWLEDGE_UPGRADES[id];
                                                if (!upgrade) return null;
                                                const unlocked = unlockedUpgrades.includes(id);
                                                const lockedByResearchCutoff = isKnowledgeUpgradeLockedByResearchCutoff(id, currentLevel);
                                                const isSelected = selectedId === id;
                                                const isHovered = hoveredId === id;
                                                const name = t(`knowledgeUpgrade.${id}.name`, language) || upgrade.name;
                                                const isSelectionRelated =
                                                    activeFocusId == null ||
                                                    activeConnectionIds.has(id);
                                                const chipFilter = activeFocusId != null && !isSelectionRelated
                                                    ? 'brightness(0.28) saturate(0.8)'
                                                    : 'none';
                                                const chipFrameColor = knowledgeTreeChipFrameColor(unlocked);
                                                const upgradeSpriteUrl = resolveUpgradeSprite(upgrade.sprite);
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        className={[
                                                            'knowledge-upgrade-chip',
                                                            id === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID ? 'knowledge-upgrade-chip--ancient-era' : '',
                                                        ].filter(Boolean).join(' ')}
                                                        title={name}
                                                        data-knowledge-upgrade-id={id}
                                                        onClick={() => {
                                                            setSelectedId(isSelected ? null : id);
                                                            if (tutorialStep === 18 && id === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID) {
                                                                onTutorialStepChange?.(19);
                                                            }
                                                        }}
                                                        onMouseEnter={() => {
                                                            if (tutorialRestrictsHover) return;
                                                            setHoveredId(id);
                                                        }}
                                                        onMouseLeave={() => setHoveredId((prev) => (prev === id ? null : prev))}
                                                        style={{
                                                            width: `${KNOWLEDGE_TREE_CHIP}px`,
                                                            height: `${KNOWLEDGE_TREE_CHIP}px`,
                                                            padding: 0,
                                                            display: 'block',
                                                            position: 'relative',
                                                            overflow: 'hidden',
                                                            borderRadius: 0,
                                                            filter: chipFilter,
                                                            boxShadow: knowledgeTreeChipFrameShadow(isSelected, unlocked),
                                                            background: isSelected
                                                                ? KNOWLEDGE_TREE_CHIP_SELECTED_BG
                                                                : isHovered
                                                                    ? KNOWLEDGE_TREE_CHIP_HOVER_BG
                                                                : KNOWLEDGE_TREE_CHIP_IDLE_BG,
                                                            color: unlocked ? '#fff' : 'rgba(220,220,220,0.85)',
                                                            cursor: 'pointer',
                                                            transform: isSelected ? 'translateY(5px)' : 'none',
                                                            transition:
                                                                'background 0.15s ease, filter 0.15s ease, box-shadow 0.1s ease, transform 0.1s ease',
                                                        }}
                                                    >
                                                        {upgradeSpriteUrl && (
                                                            <img
                                                                src={upgradeSpriteUrl}
                                                                alt={name}
                                                                title={name}
                                                                draggable={false}
                                                                style={{
                                                                    position: 'absolute',
                                                                    inset: '12px',
                                                                    width: 'calc(100% - 24px)',
                                                                    height: 'calc(100% - 24px)',
                                                                    objectFit: 'contain',
                                                                    imageRendering: 'pixelated',
                                                                    filter: lockedByResearchCutoff
                                                                        ? 'grayscale(1) saturate(0) brightness(0.65)'
                                                                        : undefined,
                                                                    pointerEvents: 'none',
                                                                }}
                                                            />
                                                        )}
                                                        {unlocked && (
                                                            <div
                                                                aria-hidden
                                                                style={{
                                                                    position: 'absolute',
                                                                    inset: 0,
                                                                    background: 'rgba(70,144,104,0.18)',
                                                                    pointerEvents: 'none',
                                                                }}
                                                            />
                                                        )}
                                                        <div
                                                            aria-hidden
                                                            style={{
                                                                position: 'absolute',
                                                                inset: `${KNOWLEDGE_TREE_CHIP_INNER_FRAME_INSET}px`,
                                                                border: `1px solid ${chipFrameColor}`,
                                                                boxSizing: 'border-box',
                                                                pointerEvents: 'none',
                                                            }}
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {connectorLines.length > 0 && (
                            <svg
                                aria-hidden
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: '100%',
                                    height: '100%',
                                    overflow: 'visible',
                                    pointerEvents: 'none',
                                    zIndex: 3,
                                }}
                            >
                                {connectorRenderLines
                                    .filter((seg) => !seg.active && (activeFocusId != null || seg.prerequisiteCount <= 1))
                                    .map((seg, i) => (
                                        <KnowledgeConnectorSegment key={`inactive-${i}`} seg={seg} />
                                    ))}
                                {connectorRenderLines
                                    .filter((seg) => seg.active)
                                    .map((seg, i) => (
                                        <KnowledgeConnectorSegment key={`active-${i}`} seg={seg} />
                                    ))}
                            </svg>
                        )}
                    </div>
                </div>

                {detailUpgrade && tooltipPosition && (
                    <div
                        ref={tooltipRef}
                        className={[
                            'knowledge-upgrade-tooltip',
                            `knowledge-upgrade-tooltip--${tooltipPosition.placement}`,
                            detailId === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID ? 'knowledge-upgrade-tooltip--ancient-era' : '',
                        ].filter(Boolean).join(' ')}
                        style={{
                            left: tooltipPosition.left,
                            top: tooltipPosition.top,
                        }}
                    >
                        <div className="knowledge-upgrade-tooltip-scroll">
                            <div className="symbol-tooltip-name">
                                {detailUnlocked && (
                                    <span style={{ marginRight: 6, color: '#86efac' }} aria-hidden>
                                        ✓
                                    </span>
                                )}
                                {t(`knowledgeUpgrade.${detailId}.name`, language) || detailUpgrade.name}
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
                                {t(ERA_NAME_KEYS[detailUpgrade.type], language)}
                            </div>
                            <div className="knowledge-upgrade-detail-tier">
                                {t('knowledgeUpgrade.detail.unlockLevel', language).replace('{level}', String(detailTierLevel))}
                            </div>
                            {(detailDirectPrereqs.length > 0 || detailDirectDependents.length > 0) && (
                                <div
                                    style={{
                                        marginTop: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                    }}
                                >
                                    {detailDirectPrereqs.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {detailDirectPrereqs.map((prereqId) => {
                                                const prereqName =
                                                    t(`knowledgeUpgrade.${prereqId}.name`, language) ||
                                                    KNOWLEDGE_UPGRADES[prereqId]?.name ||
                                                    `#${prereqId}`;
                                                const unlocked = unlockedUpgrades.includes(prereqId);
                                                return (
                                                    <span
                                                        key={`prereq-${prereqId}`}
                                                        style={{
                                                            padding: '4px 8px',
                                                            background: unlocked ? 'rgba(22,101,52,0.55)' : 'rgba(127,29,29,0.6)',
                                                            color: unlocked ? '#bbf7d0' : '#fecaca',
                                                            fontFamily: 'Mulmaru, sans-serif',
                                                            fontSize: '12px',
                                                        }}
                                                    >
                                                        {unlocked
                                                            ? t('knowledgeUpgrade.detail.prereqComplete', language)
                                                            : t('knowledgeUpgrade.detail.prereqRequired', language)}: {prereqName}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {detailDirectDependents.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {detailDirectDependents.map((dependentId) => (
                                                <span
                                                    key={`dependent-${dependentId}`}
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: 'rgba(30,41,59,0.7)',
                                                        color: '#cbd5e1',
                                                        fontFamily: 'Mulmaru, sans-serif',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    {t('knowledgeUpgrade.detail.dependent', language)}: {t(`knowledgeUpgrade.${dependentId}.name`, language) || KNOWLEDGE_UPGRADES[dependentId]?.name || `#${dependentId}`}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="symbol-tooltip-desc" style={{ marginTop: '8px' }}>
                                {(t(`knowledgeUpgrade.${detailId}.desc`, language) || detailUpgrade.description)
                                    .split('\n')
                                    .map((line, i) => (
                                        <div key={i} className="symbol-tooltip-desc-line">
                                            <EffectText text={line} />
                                        </div>
                                    ))}
                            </div>
                            {detailUpgrade.descSymbols && detailUpgrade.descSymbols.length > 0 && (
                                <div
                                    className="knowledge-upgrade-desc-symbols-area"
                                    style={{
                                        marginTop: '6px',
                                        paddingTop: '6px',
                                        borderTop: '1px solid #444',
                                    }}
                                >
                                    <UpgradeCardDescSymbols
                                        upgradeId={detailId!}
                                        entries={detailUpgrade.descSymbols}
                                        layoutSize="panel"
                                    />
                                </div>
                            )}
                        </div>

                        {detailId === selectedId && (
                            <div className="knowledge-upgrade-tooltip-actions" style={{ display: 'flex', justifyContent: 'center' }}>
                                <button
                                    className="bottom-right-btn knowledge-upgrade-research-btn"
                                    onClick={handleUnlock}
                                    data-audio-click="knowledge_upgrade"
                                    aria-disabled={researchButtonDisabled}
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
                                        ? t('knowledgeUpgrade.detail.alreadyResearched', language)
                                        : unmetSelectedPrereqNames.length > 0
                                            ? t('knowledgeUpgrade.detail.prerequisiteButton', language)
                                                .replace('{names}', unmetSelectedPrereqNames.join(' / '))
                                            : needsHigherLevel
                                                ? t('knowledgeUpgrade.detail.levelRequired', language)
                                                    .replace('{level}', String(selectedTierLevel))
                                                : selectedLockedByResearchCutoff
                                                    ? t('knowledgeUpgrade.detail.previousEraResearch', language)
                                                : hasResearchPoints &&
                                                    selectedId != null &&
                                                    !isUpgradeLegalForKnowledgePick(
                                                        selectedId,
                                                        unlockedUpgrades,
                                                        currentLevel,
                                                    )
                                                  ? t('knowledgeUpgrade.detail.unavailableThisPick', language)
                                                  : t('knowledgeUpgrade.detail.research', language)}
                                </button>
                            </div>
                        )}
                    </div>
                )}
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
