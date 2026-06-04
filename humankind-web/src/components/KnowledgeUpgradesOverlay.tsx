import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { useGameStore } from '../game/state/gameStore';
import {
    isKnowledgeUpgradeCoveredByResearchCredits,
    isUpgradeLegalForKnowledgePick,
    normalizeKnowledgeResearchCredits,
} from '../game/state/gameCalculations';
import { useSettingsStore } from '../game/state/settingsStore';
import {
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    MODERN_AGE_UPGRADE_ID,
    buildAncientSymbolsUnlockDescSymbols,
    getKnowledgeUpgradeDirectDependents,
    getKnowledgeUpgradeDirectPrerequisites,
} from '../game/data/knowledgeUpgrades';
import {
    KNOWLEDGE_UPGRADE_TREE_PREFERRED_COLUMN_BY_ID,
    KNOWLEDGE_UPGRADE_TIER_ROWS,
} from '../game/data/knowledgeUpgradeTiers';
import { getSymbolColorHex, SymbolType } from '../game/data/symbolDefinitions';
import { t } from '../i18n';
import { EffectText } from './EffectText';
import { UpgradeCardDescRelics, UpgradeCardDescSymbols } from './KnowledgeUpgradeCardWidgets';
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
const KNOWLEDGE_TREE_MIN_BRANCH_GAP = 2;
const KNOWLEDGE_TREE_CENTER_COL = Math.floor(KNOWLEDGE_TREE_GRID_COLS / 2);
const KNOWLEDGE_TREE_ERA_SPINE_IDS = new Set([
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
]);

function getEvenTierColumn(idx: number, count: number): number {
    if (count <= 1) return KNOWLEDGE_TREE_CENTER_COL;
    return Math.round(((idx + 1) * (KNOWLEDGE_TREE_GRID_COLS - 1)) / (count + 1));
}

function getDependentBranchOffset(prereqId: number, upgradeId: number): number {
    const siblings = getKnowledgeUpgradeDirectDependents(prereqId);
    if (siblings.length <= 1) return 0;

    const siblingIdx = siblings.indexOf(upgradeId);
    if (siblingIdx < 0) return 0;

    return Math.round((siblingIdx - (siblings.length - 1) / 2) * 2);
}

function getNearestOpenTierColumn(
    preferredCol: number,
    occupiedCols: readonly number[],
    minGap: number,
    blockedCols: readonly number[] = [],
): number | null {
    const countSideOccupancy = (side: 'left' | 'right') =>
        occupiedCols.filter((col) => side === 'left' ? col < KNOWLEDGE_TREE_CENTER_COL : col > KNOWLEDGE_TREE_CENTER_COL).length;
    const candidateCols = Array.from({ length: KNOWLEDGE_TREE_GRID_COLS }, (_, col) => col)
        .sort((a, b) => {
            const distanceDelta = Math.abs(a - preferredCol) - Math.abs(b - preferredCol);
            if (distanceDelta !== 0) return distanceDelta;

            const aSideLoad = a === KNOWLEDGE_TREE_CENTER_COL
                ? 0
                : countSideOccupancy(a < KNOWLEDGE_TREE_CENTER_COL ? 'left' : 'right');
            const bSideLoad = b === KNOWLEDGE_TREE_CENTER_COL
                ? 0
                : countSideOccupancy(b < KNOWLEDGE_TREE_CENTER_COL ? 'left' : 'right');
            if (aSideLoad !== bSideLoad) return aSideLoad - bSideLoad;

            const centerDelta = Math.abs(b - KNOWLEDGE_TREE_CENTER_COL) - Math.abs(a - KNOWLEDGE_TREE_CENTER_COL);
            return centerDelta !== 0 ? centerDelta : a - b;
        });

    return candidateCols.find((col) =>
        !blockedCols.includes(col) &&
        occupiedCols.every((occupiedCol) => Math.abs(occupiedCol - col) >= minGap),
    ) ?? null;
}

function buildBranchTierRows(): { level: number; ids: (number | null)[] }[] {
    const knownCols = new Map<number, number>();
    let previousTierCols: number[] = [];

    return KNOWLEDGE_UPGRADE_TIER_ROWS.filter((tier) => tier.level >= 0).map((tier) => {
        const row = Array<number | null>(KNOWLEDGE_TREE_GRID_COLS).fill(null);
        const preferredCols = tier.ids.map((upgradeId, order) => {
            const affinityCol = KNOWLEDGE_UPGRADE_TREE_PREFERRED_COLUMN_BY_ID[upgradeId];
            const prereqCols = getKnowledgeUpgradeDirectPrerequisites(upgradeId)
                .map((prereqId) => {
                    const prereqCol = knownCols.get(prereqId);
                    return prereqCol == null
                        ? null
                        : prereqCol + getDependentBranchOffset(prereqId, upgradeId);
                })
                .filter((col): col is number => col != null);
            return {
                upgradeId,
                order,
                hasAffinityCol: affinityCol != null,
                hasPrereq: prereqCols.length > 0,
                col: KNOWLEDGE_TREE_ERA_SPINE_IDS.has(upgradeId)
                    ? KNOWLEDGE_TREE_CENTER_COL
                    : affinityCol != null
                    ? affinityCol
                    : prereqCols.length > 0
                    ? Math.round(prereqCols.reduce((sum, col) => sum + col, 0) / prereqCols.length)
                    : getEvenTierColumn(order, tier.ids.length),
            };
        });
        const occupiedCols: number[] = [];

        preferredCols
            .sort((a, b) => {
                if (a.hasPrereq !== b.hasPrereq) return a.hasPrereq ? -1 : 1;
                if (a.hasAffinityCol !== b.hasAffinityCol) return a.hasAffinityCol ? -1 : 1;
                return a.col !== b.col ? a.col - b.col : a.order - b.order;
            })
            .forEach((item) => {
                const blockedCols = item.hasPrereq || item.hasAffinityCol ? [] : previousTierCols;
                const col = KNOWLEDGE_TREE_ERA_SPINE_IDS.has(item.upgradeId)
                    ? getNearestOpenTierColumn(KNOWLEDGE_TREE_CENTER_COL, occupiedCols, 1)
                    :
                    getNearestOpenTierColumn(item.col, occupiedCols, KNOWLEDGE_TREE_MIN_BRANCH_GAP, blockedCols) ??
                    getNearestOpenTierColumn(item.col, occupiedCols, 1, blockedCols) ??
                    getNearestOpenTierColumn(item.col, occupiedCols, KNOWLEDGE_TREE_MIN_BRANCH_GAP) ??
                    getNearestOpenTierColumn(item.col, occupiedCols, 1);
                if (col == null) return;
                row[col] = item.upgradeId;
                knownCols.set(item.upgradeId, col);
                occupiedCols.push(col);
            });

        previousTierCols = occupiedCols;
        return { level: tier.level, ids: row };
    });
}

const TIERS: { level: number; ids: (number | null)[] }[] = buildBranchTierRows();

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
const KNOWLEDGE_TREE_CHIP_FRAME_INSET_DEFAULT = '#070707';
const KNOWLEDGE_TREE_CHIP_FRAME_INSET_RESEARCHED = '#061008';
const KNOWLEDGE_TREE_CHIP_FRAME_INSET_LOCKED = '#050505';
const KNOWLEDGE_TREE_CHIP_PRESSED_TRANSLATE_Y = 5;
const KNOWLEDGE_TREE_CHIP_INNER_FRAME_INSET = 8;
const KNOWLEDGE_TREE_CHIP_DENIED_FRAME = '#120303';
const KNOWLEDGE_TOOLTIP_PIN_DELAY_MS = 1000;
const KNOWLEDGE_TOOLTIP_ENTER_GRACE_MS = 180;

function knowledgeTreeChipFrameColor(researched: boolean, locked: boolean, denied: boolean): string {
    return denied
        ? KNOWLEDGE_TREE_CHIP_DENIED_FRAME
        : researched
            ? KNOWLEDGE_TREE_CHIP_FRAME_INSET_RESEARCHED
            : locked
                ? KNOWLEDGE_TREE_CHIP_FRAME_INSET_LOCKED
                : KNOWLEDGE_TREE_CHIP_FRAME_INSET_DEFAULT;
}

const KNOWLEDGE_CONNECTOR_IDLE_OPACITY = 0.16;
const KNOWLEDGE_CONNECTOR_DIMMED_OPACITY = 0.08;
const KNOWLEDGE_CONNECTOR_ACTIVE_OPACITY = 0.95;
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
    const leaderId = useGameStore((s) => s.leaderId);
    const leaderProgressLevel = useGameStore((s) => s.leaderProgressLevel);
    const currentLevel = useGameStore((s) => s.level);
    const levelUpResearchPoints = useGameStore((s) => s.levelUpResearchPoints ?? 0);
    const knowledgeResearchCredits = useGameStore((s) => s.knowledgeResearchCredits ?? []);
    const phase = useGameStore((s) => s.phase);
    const language = useSettingsStore((s) => s.language);

    const [pendingResearchId, setPendingResearchId] = useState<number | null>(null);
    const [tutorialFocusId, setTutorialFocusId] = useState<number | null>(null);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [pinnedTooltipId, setPinnedTooltipId] = useState<number | null>(null);
    const [deniedChipId, setDeniedChipId] = useState<number | null>(null);
    const [researchPointsMouseHints, setResearchPointsMouseHints] = useState<ResearchPointsMouseHint[]>([]);
    const researchHintIdRef = useRef(0);
    const deniedChipTimeoutRef = useRef<number | null>(null);
    const tooltipPinTimeoutRef = useRef<number | null>(null);
    const tooltipReleaseTimeoutRef = useRef<number | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const treeScrollRef = useRef<HTMLDivElement>(null);
    const treeContentRef = useRef<HTMLDivElement>(null);
    const savedTreeScrollTopRef = useRef(0);
    const [connectorLines, setConnectorLines] = useState<KnowledgeConnectorLine[]>([]);
    const [tooltipPosition, setTooltipPosition] = useState<KnowledgeUpgradeTooltipPosition | null>(null);

    const tutorialRestrictsHover = tutorialStep != null && tutorialStep >= 17 && tutorialStep <= 19;
    const activeFocusId = pinnedTooltipId ?? hoveredId ?? (tutorialRestrictsHover ? tutorialFocusId : null);
    const detailId = activeFocusId;
    const detailUpgrade = detailId != null ? KNOWLEDGE_UPGRADES[detailId] : null;
    const detailUnlocked = detailId != null && unlockedUpgrades.includes(detailId);
    const detailTierLevel = getTierLevelForUpgrade(detailId);
    const activeConnectionIds = collectConnectedUpgradeIds(activeFocusId);
    const detailDirectPrereqs = detailId != null ? [...getKnowledgeUpgradeDirectPrerequisites(detailId)] : [];
    const detailDirectDependents = detailId != null ? [...getKnowledgeUpgradeDirectDependents(detailId)] : [];
    const hasResearchPoints = levelUpResearchPoints > 0;
    const researchCredits = useMemo(
        () => normalizeKnowledgeResearchCredits(currentLevel, levelUpResearchPoints, knowledgeResearchCredits),
        [currentLevel, knowledgeResearchCredits, levelUpResearchPoints],
    );
    const availableBackgroundHeightPx = getKnowledgeAvailableBackgroundHeightPx(currentLevel);
    const isPermanentlyLocked = useCallback((id: number): boolean => {
        const check = (currentId: number, memo: Map<number, boolean>): boolean => {
            if (memo.has(currentId)) return memo.get(currentId)!;
            
            if (unlockedUpgrades.includes(currentId)) {
                memo.set(currentId, false);
                return false;
            }

            if (
                hasResearchPoints &&
                !isKnowledgeUpgradeCoveredByResearchCredits(currentId, researchCredits)
            ) {
                memo.set(currentId, true);
                return true;
            }

            const prereqs = getKnowledgeUpgradeDirectPrerequisites(currentId);
            for (const p of prereqs) {
                if (check(p, memo)) {
                    memo.set(currentId, true);
                    return true;
                }
            }

            memo.set(currentId, false);
            return false;
        };
        
        return check(id, new Map<number, boolean>());
    }, [hasResearchPoints, researchCredits, unlockedUpgrades]);
    const isLockedByCurrentLevel = useCallback((id: number): boolean => (
        !unlockedUpgrades.includes(id) && getTierLevelForUpgrade(id) > currentLevel
    ), [currentLevel, unlockedUpgrades]);
    const isVisuallyLocked = useCallback((id: number): boolean => (
        isPermanentlyLocked(id) || isLockedByCurrentLevel(id)
    ), [isLockedByCurrentLevel, isPermanentlyLocked]);

    const canConfirmResearch = useCallback((id: number): boolean => (
        hasResearchPoints &&
        currentLevel >= getTierLevelForUpgrade(id) &&
        !unlockedUpgrades.includes(id) &&
        !isPermanentlyLocked(id) &&
        isUpgradeLegalForKnowledgePick(id, unlockedUpgrades, currentLevel, researchCredits)
    ), [
        currentLevel,
        hasResearchPoints,
        isPermanentlyLocked,
        researchCredits,
        unlockedUpgrades,
    ]);

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
                    y1: bottomAnchorY(sourcePos.rowIdx, activeFocusId === prereqId || isVisuallyLocked(prereqId)),
                    x2: xForCol(targetPos.colIdx),
                    y2: topAnchorY(targetPos.rowIdx, activeFocusId === upgradeId || isVisuallyLocked(upgradeId)),
                    prerequisiteCount: prerequisites.length,
                });
            }
        }

        setConnectorLines(next);
    }, [activeFocusId, isVisuallyLocked]);

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
        const anchorBottom = (anchorRect.bottom - rootRect.top) / scaleY;
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
        const anchorCenterY = (anchorTop + anchorBottom) / 2;
        const alignTopToAnchor = anchorCenterY <= viewportHeight / 2;
        const preferredTop = alignTopToAnchor
            ? anchorTop
            : anchorBottom - tooltipHeight;
        const top = Math.min(
            Math.max(minInset, preferredTop),
            Math.max(minInset, viewportHeight - tooltipHeight - minInset),
        );

        setTooltipPosition((prev) => {
            if (
                prev != null &&
                prev.left === left &&
                prev.top === top &&
                prev.placement === placement
            ) {
                return prev;
            }
            return { left, top, placement };
        });
    }, [detailId]);

    useLayoutEffect(() => {
        if (!isOpen || detailId == null || tooltipPosition == null || tooltipRef.current == null) return;

        const raf = requestAnimationFrame(() => {
            updateDetailTooltipPosition();
        });

        return () => cancelAnimationFrame(raf);
    }, [detailId, isOpen, tooltipPosition, updateDetailTooltipPosition]);

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
                if (pendingResearchId !== null) setPendingResearchId(null);
                else onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose, pendingResearchId]);

    // 패널 닫기 (오버레이 닫힐 때 선택 초기화)
    useEffect(() => {
        if (!isOpen) {
            if (tooltipPinTimeoutRef.current != null) {
                window.clearTimeout(tooltipPinTimeoutRef.current);
                tooltipPinTimeoutRef.current = null;
            }
            if (tooltipReleaseTimeoutRef.current != null) {
                window.clearTimeout(tooltipReleaseTimeoutRef.current);
                tooltipReleaseTimeoutRef.current = null;
            }
            queueMicrotask(() => {
                setPendingResearchId(null);
                setTutorialFocusId(null);
                setHoveredId(null);
                setPinnedTooltipId(null);
                setDeniedChipId(null);
                setTooltipPosition(null);
                setResearchPointsMouseHints([]);
            });
        }
    }, [isOpen]);

    useEffect(() => () => {
        if (deniedChipTimeoutRef.current != null) {
            window.clearTimeout(deniedChipTimeoutRef.current);
        }
        if (tooltipPinTimeoutRef.current != null) {
            window.clearTimeout(tooltipPinTimeoutRef.current);
        }
        if (tooltipReleaseTimeoutRef.current != null) {
            window.clearTimeout(tooltipReleaseTimeoutRef.current);
        }
    }, []);

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

    const showDeniedChipFeedback = (id: number, e: ReactMouseEvent<HTMLButtonElement>) => {
        void audioManager.play('denied');
        setDeniedChipId(null);
        window.requestAnimationFrame(() => {
            setDeniedChipId(id);
            if (deniedChipTimeoutRef.current != null) {
                window.clearTimeout(deniedChipTimeoutRef.current);
            }
            deniedChipTimeoutRef.current = window.setTimeout(() => {
                setDeniedChipId((prev) => (prev === id ? null : prev));
            }, 220);
        });
        if (!hasResearchPoints) {
            researchHintIdRef.current += 1;
            const hintId = researchHintIdRef.current;
            setResearchPointsMouseHints((prev) => [...prev, { id: hintId, x: e.clientX, y: e.clientY }]);
        }
    };

    const unlockConfirmedUpgrade = (id: number, e: ReactMouseEvent<HTMLButtonElement>) => {
        if (!canConfirmResearch(id)) {
            showDeniedChipFeedback(id, e);
            return;
        }
        const st = useGameStore.getState();
        if ((st.levelUpResearchPoints ?? 0) <= 0) {
            showDeniedChipFeedback(id, e);
            return;
        }
        const choice = KNOWLEDGE_UPGRADES[id];
        if (!choice) {
            showDeniedChipFeedback(id, e);
            return;
        }
        playKnowledgeUpgradeSound();
        useGameStore.setState({
            returnPhaseAfterDevKnowledgeUpgrade: phase,
        });
        useGameStore.getState().selectUpgrade(id);
        if (tutorialStep === 18 && id === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID) {
            setPendingResearchId(null);
            setTutorialFocusId(null);
            onTutorialStepChange?.(19);
            return;
        }
        setPendingResearchId(null);
    };

    const handleChipClick = (id: number, e: ReactMouseEvent<HTMLButtonElement>) => {
        if (!canConfirmResearch(id)) {
            showDeniedChipFeedback(id, e);
            return;
        }
        setPendingResearchId(id);
    };

    const clearTooltipPinTimer = () => {
        if (tooltipPinTimeoutRef.current != null) {
            window.clearTimeout(tooltipPinTimeoutRef.current);
            tooltipPinTimeoutRef.current = null;
        }
    };

    const clearTooltipReleaseTimer = () => {
        if (tooltipReleaseTimeoutRef.current != null) {
            window.clearTimeout(tooltipReleaseTimeoutRef.current);
            tooltipReleaseTimeoutRef.current = null;
        }
    };

    const handleChipMouseEnter = (id: number) => {
        const tutorialAllowsAncientResearchHover =
            tutorialStep === 18 && id === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID;
        if (tutorialStep === 18 && !tutorialAllowsAncientResearchHover) return;
        if (tutorialRestrictsHover && !tutorialAllowsAncientResearchHover) return;
        if (pinnedTooltipId === id) {
            clearTooltipReleaseTimer();
            setHoveredId(id);
            return;
        }
        if (pinnedTooltipId != null) return;
        clearTooltipPinTimer();
        clearTooltipReleaseTimer();
        setHoveredId(id);
        tooltipPinTimeoutRef.current = window.setTimeout(() => {
            setPinnedTooltipId(id);
            tooltipPinTimeoutRef.current = null;
        }, KNOWLEDGE_TOOLTIP_PIN_DELAY_MS);
    };

    const handleChipMouseLeave = (id: number) => {
        setHoveredId((prev) => (prev === id ? null : prev));
        if (pinnedTooltipId === id) {
            clearTooltipReleaseTimer();
            tooltipReleaseTimeoutRef.current = window.setTimeout(() => {
                setPinnedTooltipId((prev) => (prev === id ? null : prev));
                tooltipReleaseTimeoutRef.current = null;
            }, KNOWLEDGE_TOOLTIP_ENTER_GRACE_MS);
        } else {
            clearTooltipPinTimer();
        }
    };

    const handleTooltipMouseEnter = () => {
        clearTooltipReleaseTimer();
    };

    const handleTooltipMouseLeave = () => {
        clearTooltipPinTimer();
        clearTooltipReleaseTimer();
        setPinnedTooltipId(null);
        setHoveredId(null);
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
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 5,
                    padding: '24px 32px',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    pointerEvents: 'none',
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
                        pointerEvents: 'auto',
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
                                            fontFamily: 'var(--game-font-family), sans-serif',
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
                                                const visuallyLocked = isVisuallyLocked(id);
                                                const isDenied = deniedChipId === id;
                                                const canResearch = canConfirmResearch(id);
                                                const name = t(`knowledgeUpgrade.${id}.name`, language) || upgrade.name;
                                                const isSelectionRelated =
                                                    activeFocusId == null ||
                                                    activeConnectionIds.has(id);
                                                const chipFilter = activeFocusId != null && !isSelectionRelated
                                                    ? 'brightness(0.28) saturate(0.8)'
                                                    : 'none';
                                                const chipFrameColor = knowledgeTreeChipFrameColor(unlocked, visuallyLocked, isDenied);
                                                const upgradeSpriteUrl = resolveUpgradeSprite(upgrade.sprite);
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        className={[
                                                            'knowledge-upgrade-chip',
                                                            !unlocked && canResearch ? 'knowledge-upgrade-chip--available' : '',
                                                            unlocked ? 'knowledge-upgrade-chip--unlocked' : '',
                                                            visuallyLocked ? 'knowledge-upgrade-chip--locked' : '',
                                                            isDenied ? 'knowledge-upgrade-chip--denied' : '',
                                                            id === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID ? 'knowledge-upgrade-chip--ancient-era' : '',
                                                        ].filter(Boolean).join(' ')}
                                                        title={name}
                                                        data-knowledge-upgrade-id={id}
                                                        aria-disabled={visuallyLocked && !unlocked}
                                                        onClick={(e) => handleChipClick(id, e)}
                                                        onMouseEnter={() => handleChipMouseEnter(id)}
                                                        onMouseLeave={() => handleChipMouseLeave(id)}
                                                        style={{
                                                            width: `${KNOWLEDGE_TREE_CHIP}px`,
                                                            height: `${KNOWLEDGE_TREE_CHIP}px`,
                                                            padding: 0,
                                                            display: 'block',
                                                            position: 'relative',
                                                            overflow: unlocked || canResearch ? 'visible' : 'hidden',
                                                            filter: chipFilter,
                                                            color: unlocked ? '#fff' : 'rgba(220,220,220,0.85)',
                                                            cursor: visuallyLocked && !unlocked ? 'not-allowed' : 'pointer',
                                                            transition:
                                                                'background 140ms ease, border-color 140ms ease, filter 0.15s ease, box-shadow 140ms ease, transform 140ms ease',
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
                                                                    filter: visuallyLocked
                                                                        ? 'grayscale(1) saturate(0) brightness(0.65)'
                                                                        : undefined,
                                                                    pointerEvents: 'none',
                                                                }}
                                                            />
                                                        )}
                                                        <div
                                                            aria-hidden
                                                            style={{
                                                                position: 'absolute',
                                                                inset: `${KNOWLEDGE_TREE_CHIP_INNER_FRAME_INSET}px`,
                                                                border: `2px solid ${chipFrameColor}`,
                                                                borderRadius: 6,
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
                            pinnedTooltipId === detailId ? 'knowledge-upgrade-tooltip--pinned' : '',
                            `knowledge-upgrade-tooltip--${tooltipPosition.placement}`,
                            detailId === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID ? 'knowledge-upgrade-tooltip--ancient-era' : '',
                        ].filter(Boolean).join(' ')}
                        style={{
                            left: tooltipPosition.left,
                            top: tooltipPosition.top,
                        }}
                        onMouseEnter={pinnedTooltipId === detailId ? handleTooltipMouseEnter : undefined}
                        onMouseLeave={pinnedTooltipId === detailId ? handleTooltipMouseLeave : undefined}
                    >
                        {(hoveredId === detailId || pinnedTooltipId === detailId) && (
                            <div
                                key={`pin-progress-${detailId}`}
                                aria-hidden
                                className={[
                                    'knowledge-upgrade-tooltip-pin-progress',
                                    pinnedTooltipId === detailId ? 'knowledge-upgrade-tooltip-pin-progress--full' : '',
                                ].filter(Boolean).join(' ')}
                            />
                        )}
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
                                                            fontFamily: 'var(--game-font-family), sans-serif',
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
                                                        fontFamily: 'var(--game-font-family), sans-serif',
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
                            {((detailUpgrade.descSymbols && detailUpgrade.descSymbols.length > 0) ||
                                (detailUpgrade.descRelics && detailUpgrade.descRelics.length > 0)) && (
                                <div
                                    className="knowledge-upgrade-desc-symbols-area"
                                    style={{
                                        marginTop: '6px',
                                        paddingTop: '6px',
                                        borderTop: '1px solid #444',
                                    }}
                                >
                                    {detailUpgrade.descSymbols && detailUpgrade.descSymbols.length > 0 && (
                                        <UpgradeCardDescSymbols
                                            upgradeId={detailId!}
                                            entries={
                                                detailId === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID
                                                    ? buildAncientSymbolsUnlockDescSymbols(leaderId, leaderProgressLevel)
                                                    : detailUpgrade.descSymbols
                                            }
                                            layoutSize="panel"
                                        />
                                    )}
                                    {detailUpgrade.descRelics && detailUpgrade.descRelics.length > 0 && (
                                        <div style={{ marginTop: detailUpgrade.descSymbols && detailUpgrade.descSymbols.length > 0 ? '12px' : 0 }}>
                                            <UpgradeCardDescRelics
                                                entries={detailUpgrade.descRelics}
                                                layoutSize="panel"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

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
            {pendingResearchId != null && (
                <div
                    className="knowledge-research-confirm-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-describedby="knowledge-research-confirm-message"
                    onMouseDown={() => setPendingResearchId(null)}
                >
                    <div
                        className="knowledge-research-confirm-panel"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div
                            id="knowledge-research-confirm-message"
                            className="settings-confirm-message knowledge-research-confirm-message"
                        >
                            {t('knowledgeUpgrade.researchConfirmMessage', language).replace(
                                '{name}',
                                t(`knowledgeUpgrade.${pendingResearchId}.name`, language)
                                || KNOWLEDGE_UPGRADES[pendingResearchId]?.name
                                || `#${pendingResearchId}`,
                            )}
                        </div>
                        <div className="settings-confirm-actions">
                            <button
                                type="button"
                                className="settings-confirm-btn knowledge-research-confirm-btn"
                                onClick={(event) => unlockConfirmedUpgrade(pendingResearchId, event)}
                            >
                                {t('knowledgeUpgrade.researchConfirm', language)}
                            </button>
                            <button
                                type="button"
                                className="settings-confirm-btn settings-confirm-btn--cancel"
                                onClick={() => setPendingResearchId(null)}
                            >
                                {t('knowledgeUpgrade.researchCancel', language)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeUpgradesOverlay;
