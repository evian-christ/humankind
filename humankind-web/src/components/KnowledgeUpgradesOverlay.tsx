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
    AGI_PROJECT_UPGRADE_ID,
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
    [SymbolType.RESOURCE]: 'era.resource',
    [SymbolType.LUXURY]: 'era.luxury',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
    [SymbolType.ANCIENT]: 'era.ancient',
    [SymbolType.UNIT]: 'era.unit',
    [SymbolType.ENEMY]: 'era.enemy',
    [SymbolType.DISASTER]: 'era.disaster',
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
type KnowledgeHorizontalNode = {
    id: number;
    level: number;
    row: number;
};

/** Chip columns: expanded to 13 columns for development. */
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

// eslint-disable-next-line react-refresh/only-export-components
export function buildBranchTierRows(): { level: number; ids: (number | null)[] }[] {
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
                    : prereqCols.length > 0
                    ? Math.round(prereqCols.reduce((sum, col) => sum + col, 0) / prereqCols.length)
                    : affinityCol != null
                    ? affinityCol
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

const KNOWLEDGE_CONNECTOR_COLOR = '#5f5143';
const KNOWLEDGE_CONNECTOR_DIM_COLOR = '#231d18';
const KNOWLEDGE_CONNECTOR_ACTIVE_COLOR = '#a48660';
const ARCHERY_BRONZE_LINE_WIDTH = 3;
const KNOWLEDGE_CONNECTOR_PORT_W = 4;
const KNOWLEDGE_CONNECTOR_PORT_H = 24;
const KNOWLEDGE_TREE_CHIP_FRAME_INSET_DEFAULT = '#070707';
const KNOWLEDGE_TREE_CHIP_FRAME_INSET_RESEARCHED = '#061008';
const KNOWLEDGE_TREE_CHIP_FRAME_INSET_LOCKED = '#050505';
const KNOWLEDGE_TREE_CHIP_INNER_FRAME_INSET = 8;
const KNOWLEDGE_TREE_CHIP_DENIED_FRAME = '#120303';
const KNOWLEDGE_HORIZONTAL_ROWS = 9;
const KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH = 142;
const KNOWLEDGE_HORIZONTAL_ROW_HEIGHT = 64;
const KNOWLEDGE_HORIZONTAL_NODE_WIDTH = 134.2;
const KNOWLEDGE_HORIZONTAL_NODE_HEIGHT = 57.2;
const KNOWLEDGE_HORIZONTAL_PAD_X = 58;
const KNOWLEDGE_HORIZONTAL_PAD_TOP = 60;
const KNOWLEDGE_HORIZONTAL_PAD_BOTTOM = 26;

export function getKnowledgeEraResearchAvailability(
    unlockedUpgradeIds: readonly number[],
    minLevel: number,
    maxLevel: number,
): { available: number; total: number } {
    return {
        available: unlockedUpgradeIds.filter((upgradeId) => {
            const unlockLevel = getTierLevelForUpgrade(upgradeId);
            return unlockLevel >= minLevel && unlockLevel <= maxLevel;
        }).length,
        total: maxLevel - minLevel + 1,
    };
}

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

function getTierLevelForUpgrade(upgradeId: number | null): number {
    if (upgradeId == null) return 1;
    return TIERS.find((tier) => tier.ids.includes(upgradeId))?.level ?? 1;
}

function getNearestOpenHorizontalRow(preferredRow: number, occupiedRows: ReadonlySet<number>): number {
    return Array.from({ length: KNOWLEDGE_HORIZONTAL_ROWS }, (_, row) => row)
        .sort((a, b) => {
            const distanceDelta = Math.abs(a - preferredRow) - Math.abs(b - preferredRow);
            return distanceDelta !== 0 ? distanceDelta : a - b;
        })
        .find((row) => !occupiedRows.has(row)) ?? preferredRow;
}

// eslint-disable-next-line react-refresh/only-export-components
export function buildHorizontalEraNodes(minLevel: number, maxLevel: number): KnowledgeHorizontalNode[] {
    return TIERS
        .filter((tier) => tier.level >= minLevel && tier.level <= maxLevel)
        .flatMap((tier) => {
            const occupiedRows = new Set<number>();
            return tier.ids.flatMap((upgradeId, originalCol) => {
                if (upgradeId == null) return [];
                const preferredRow = Math.round(
                    (originalCol / Math.max(1, KNOWLEDGE_TREE_GRID_COLS - 1)) *
                    (KNOWLEDGE_HORIZONTAL_ROWS - 1),
                );
                const row = getNearestOpenHorizontalRow(preferredRow, occupiedRows);
                occupiedRows.add(row);
                return [{ id: upgradeId, level: tier.level, row }];
            });
        });
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
    const direction = seg.x2 >= seg.x1 ? 1 : -1;
    const middleX = seg.x1 + (seg.x2 - seg.x1) / 2;
    const path = `M ${seg.x1} ${seg.y1} H ${middleX} V ${seg.y2} H ${seg.x2}`;

    return (
        <g opacity={connectorOpacity}>
            <path
                d={path}
                fill="none"
                stroke={connectorColor}
                strokeWidth={ARCHERY_BRONZE_LINE_WIDTH}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <rect
                x={seg.x1 - (direction < 0 ? 0 : KNOWLEDGE_CONNECTOR_PORT_W)}
                y={seg.y1 - KNOWLEDGE_CONNECTOR_PORT_H / 2}
                width={KNOWLEDGE_CONNECTOR_PORT_W}
                height={KNOWLEDGE_CONNECTOR_PORT_H}
                fill={connectorColor}
            />
            <rect
                x={seg.x2 - (direction > 0 ? 0 : KNOWLEDGE_CONNECTOR_PORT_W)}
                y={seg.y2 - KNOWLEDGE_CONNECTOR_PORT_H / 2}
                width={KNOWLEDGE_CONNECTOR_PORT_W}
                height={KNOWLEDGE_CONNECTOR_PORT_H}
                fill={connectorColor}
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
    const [isClosing, setIsClosing] = useState(false);
    const researchHintIdRef = useRef(0);
    const deniedChipTimeoutRef = useRef<number | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const treeScrollRef = useRef<HTMLDivElement>(null);
    const treeContentRef = useRef<HTMLDivElement>(null);
    const [connectorLines, setConnectorLines] = useState<KnowledgeConnectorLine[]>([]);

    const tutorialRestrictsHover = tutorialStep != null && tutorialStep >= 14 && tutorialStep <= 16;
    const activeFocusId = pinnedTooltipId ?? hoveredId ?? (tutorialRestrictsHover ? tutorialFocusId : null);
    const detailId = activeFocusId;
    const detailUpgrade = detailId != null ? KNOWLEDGE_UPGRADES[detailId] : null;
    const detailUnlocked = detailId != null && unlockedUpgrades.includes(detailId);
    const detailTierLevel = getTierLevelForUpgrade(detailId);
    const activeConnectionIds = collectConnectedUpgradeIds(activeFocusId);
    const detailDirectPrereqs = detailId != null ? [...getKnowledgeUpgradeDirectPrerequisites(detailId)] : [];
    const detailDirectDependents = detailId != null ? [...getKnowledgeUpgradeDirectDependents(detailId)] : [];
    const horizontalNodes = useMemo(
        () => buildHorizontalEraNodes(1, 30),
        [],
    );
    const hasResearchPoints = levelUpResearchPoints > 0;
    const researchCredits = useMemo(
        () => normalizeKnowledgeResearchCredits(currentLevel, levelUpResearchPoints, knowledgeResearchCredits),
        [currentLevel, knowledgeResearchCredits, levelUpResearchPoints],
    );
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
        const contentRect = contentEl.getBoundingClientRect();
        const scaleX = contentEl.offsetWidth > 0 ? contentRect.width / contentEl.offsetWidth : 1;
        const scaleY = contentEl.offsetHeight > 0 ? contentRect.height / contentEl.offsetHeight : 1;
        const nodeById = new Map<number, HTMLElement>();
        contentEl.querySelectorAll<HTMLElement>('[data-knowledge-upgrade-id]').forEach((node) => {
            const id = Number(node.dataset.knowledgeUpgradeId);
            if (Number.isFinite(id)) nodeById.set(id, node);
        });

        const next: KnowledgeConnectorLine[] = [];
        for (const [upgradeIdRaw] of Object.entries(KNOWLEDGE_UPGRADES)) {
            const upgradeId = Number(upgradeIdRaw);
            const targetNode = nodeById.get(upgradeId);
            if (!targetNode) continue;
            const targetRect = targetNode.getBoundingClientRect();
            const prerequisites = getKnowledgeUpgradeDirectPrerequisites(upgradeId);
            for (const prereqId of prerequisites) {
                const sourceNode = nodeById.get(prereqId);
                if (!sourceNode) continue;
                const sourceRect = sourceNode.getBoundingClientRect();
                next.push({
                    from: prereqId,
                    to: upgradeId,
                    x1: (sourceRect.right - contentRect.left) / scaleX,
                    y1: (sourceRect.top + sourceRect.height / 2 - contentRect.top) / scaleY,
                    x2: (targetRect.left - contentRect.left) / scaleX,
                    y2: (targetRect.top + targetRect.height / 2 - contentRect.top) / scaleY,
                    prerequisiteCount: prerequisites.length,
                });
            }
        }

        setConnectorLines(next);
    }, []);

    useLayoutEffect(() => {
        if (!isOpen) return;
        const raf = requestAnimationFrame(() => {
            updateKnowledgeTreeConnectors();
        });
        const contentEl = treeContentRef.current;
        if (!contentEl) return () => cancelAnimationFrame(raf);
        const ro = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(updateKnowledgeTreeConnectors)
            : null;
        ro?.observe(contentEl);
        window.addEventListener('resize', updateKnowledgeTreeConnectors);
        return () => {
            cancelAnimationFrame(raf);
            ro?.disconnect();
            window.removeEventListener('resize', updateKnowledgeTreeConnectors);
        };
    }, [activeFocusId, horizontalNodes, isOpen, language, updateKnowledgeTreeConnectors]);

    useLayoutEffect(() => {
        if (!isOpen) return;
        const scrollEl = treeScrollRef.current;
        if (!scrollEl) return;
        const raf = requestAnimationFrame(() => {
            if (tutorialStep === 30) {
                scrollEl.scrollLeft = 0;
                return;
            }
            const currentColumn = Math.max(0, currentLevel - 1);
            scrollEl.scrollLeft = Math.max(
                0,
                KNOWLEDGE_HORIZONTAL_PAD_X +
                    currentColumn * KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH -
                    scrollEl.clientWidth * 0.38,
            );
        });
        return () => cancelAnimationFrame(raf);
    }, [currentLevel, isOpen, tutorialStep]);

    const closeWithSlide = useCallback(() => {
        if (isClosing) return;
        setIsClosing(true);
        document.body.classList.add('screen-return-from-knowledge');
        window.setTimeout(() => {
            document.body.classList.remove('screen-return-from-knowledge');
            onClose();
        }, 160);
    }, [isClosing, onClose]);

    useEffect(() => () => {
        document.body.classList.remove('screen-return-from-knowledge');
    }, []);

    useEffect(() => {
        if (isOpen) setIsClosing(false);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (pendingResearchId !== null) setPendingResearchId(null);
                else closeWithSlide();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [closeWithSlide, isOpen, pendingResearchId]);

    // Reset transient selection state when the panel closes.
    useEffect(() => {
        if (!isOpen) {
            queueMicrotask(() => {
                setPendingResearchId(null);
                setTutorialFocusId(null);
                setHoveredId(null);
                setPinnedTooltipId(null);
                setDeniedChipId(null);
                setResearchPointsMouseHints([]);
            });
        }
    }, [isOpen]);

    useEffect(() => () => {
        if (deniedChipTimeoutRef.current != null) {
            window.clearTimeout(deniedChipTimeoutRef.current);
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
        if (tutorialStep === 15 && id === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID) {
            setPendingResearchId(null);
            setTutorialFocusId(null);
            onTutorialStepChange?.(16);
            return;
        }
        setPendingResearchId(null);
    };

    const requestResearch = (id: number, e: ReactMouseEvent<HTMLButtonElement>) => {
        if (!canConfirmResearch(id)) {
            showDeniedChipFeedback(id, e);
            return;
        }
        setPendingResearchId(id);
    };

    const handleChipClick = (id: number, e: ReactMouseEvent<HTMLButtonElement>) => {
        if (pinnedTooltipId === id) {
            setPinnedTooltipId(null);
            setHoveredId(id);
            return;
        }
        setPinnedTooltipId(id);
        setHoveredId(null);
        if (tutorialStep === 15 && id === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID) {
            requestResearch(id, e);
        }
    };

    const handleTreeBackgroundClick = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        setPinnedTooltipId(null);
        setHoveredId(null);
    };

    const handleChipMouseEnter = (id: number) => {
        const tutorialAllowsAncientResearchHover =
            tutorialStep === 15 && id === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID;
        if (tutorialStep === 15 && !tutorialAllowsAncientResearchHover) return;
        if (tutorialRestrictsHover && !tutorialAllowsAncientResearchHover) return;
        if (pinnedTooltipId != null) return;
        setHoveredId(id);
    };

    const handleChipMouseLeave = (id: number) => {
        setHoveredId((prev) => (prev === id ? null : prev));
    };

    const navigateToUpgrade = (upgradeId: number) => {
        setHoveredId(null);
        setPinnedTooltipId(upgradeId);
        window.requestAnimationFrame(() => {
            overlayRef.current
                ?.querySelector<HTMLElement>(`[data-knowledge-upgrade-id="${upgradeId}"]`)
                ?.scrollIntoView({ block: 'center', inline: 'center' });
        });
    };

    return (
        <div
            ref={overlayRef}
            className={`knowledge-upgrades-overlay${isClosing ? ' knowledge-upgrades-overlay--closing' : ''}`}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 200,
                background: '#070a0f',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Edge return control */}
            <button
                type="button"
                className="relic-edge-hotzone knowledge-return-hotzone"
                onClick={closeWithSlide}
                aria-label={t('knowledgeUpgrade.back', language)}
            >
                <span className="edge-hotzone-label">
                    <span className="edge-hotzone-arrow edge-hotzone-arrow--right" aria-hidden="true" />
                    <span className="edge-hotzone-text">돌아가기</span>
                </span>
            </button>
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
                    className="knowledge-upgrades-back-btn relic-shop-back-btn"
                    type="button"
                    onClick={closeWithSlide}
                    style={{
                        flexShrink: 0,
                        pointerEvents: 'auto',
                    }}
                    aria-label={t('knowledgeUpgrade.back', language)}
                >
                    <span className="relic-shop-back-icon" aria-hidden>
                        ←
                    </span>
                    <span className="relic-shop-back-label">{t('knowledgeUpgrade.back', language)}</span>
                </button>
                <div style={{ flex: 1, minWidth: 0 }} />
                <div
                    role="status"
                    aria-label={`${t('game.levelUpResearchPointsLabel', language)}: ${levelUpResearchPoints}`}
                    style={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                        fontFamily: 'var(--game-font-family), sans-serif',
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

            <div className="knowledge-upgrades-page">
                <div className="knowledge-upgrades-workspace">
                    <div
                        ref={treeScrollRef}
                        className="knowledge-upgrades-era-scroll"
                        onScroll={(event) => {
                            if (
                                tutorialStep === 30 &&
                                event.currentTarget.scrollLeft + event.currentTarget.clientWidth >=
                                    event.currentTarget.scrollWidth - 24
                            ) {
                                onTutorialStepChange?.(31);
                            }
                        }}
                        onWheel={(event) => {
                            if (event.deltaY === 0) return;
                            event.currentTarget.scrollLeft += event.deltaY;
                            event.preventDefault();
                        }}
                    >
                        <div
                            ref={treeContentRef}
                            className="knowledge-upgrades-horizontal-tree"
                            onClick={handleTreeBackgroundClick}
                            style={{
                                width:
                                    KNOWLEDGE_HORIZONTAL_PAD_X * 2 +
                                    30 * KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH,
                                height:
                                    KNOWLEDGE_HORIZONTAL_PAD_TOP +
                                    KNOWLEDGE_HORIZONTAL_ROWS * KNOWLEDGE_HORIZONTAL_ROW_HEIGHT +
                                    KNOWLEDGE_HORIZONTAL_PAD_BOTTOM,
                            }}
                        >
                            {Array.from({ length: 30 }, (_, index) => index + 1).map((level, index) => (
                                <div
                                    key={`level-${level}`}
                                    className={[
                                        'knowledge-horizontal-level-column',
                                        level === currentLevel ? 'knowledge-horizontal-level-column--current' : '',
                                        level > currentLevel ? 'knowledge-horizontal-level-column--future' : '',
                                    ].filter(Boolean).join(' ')}
                                    style={{
                                        left: KNOWLEDGE_HORIZONTAL_PAD_X + index * KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH,
                                        width: KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH,
                                    }}
                                >
                                    <span>Lv.{level}</span>
                                </div>
                            ))}

                            {Array.from({ length: Math.ceil(KNOWLEDGE_HORIZONTAL_ROWS / 2) }, (_, band) => (
                                <div
                                    key={`soft-band-${band}`}
                                    aria-hidden
                                    className={`knowledge-horizontal-soft-band knowledge-horizontal-soft-band--${band % 3}`}
                                    style={{
                                        top: KNOWLEDGE_HORIZONTAL_PAD_TOP + band * KNOWLEDGE_HORIZONTAL_ROW_HEIGHT * 2 - 8,
                                        height: Math.min(
                                            KNOWLEDGE_HORIZONTAL_ROW_HEIGHT * 2,
                                            (KNOWLEDGE_HORIZONTAL_ROWS - band * 2) * KNOWLEDGE_HORIZONTAL_ROW_HEIGHT,
                                        ),
                                    }}
                                />
                            ))}

                            {connectorLines.length > 0 && (
                                <svg aria-hidden className="knowledge-horizontal-connectors">
                                    {connectorRenderLines
                                        .filter((seg) => !seg.active && (activeFocusId != null || seg.prerequisiteCount <= 1))
                                        .map((seg, index) => (
                                            <KnowledgeConnectorSegment key={`inactive-${index}`} seg={seg} />
                                        ))}
                                    {connectorRenderLines
                                        .filter((seg) => seg.active)
                                        .map((seg, index) => (
                                            <KnowledgeConnectorSegment key={`active-${index}`} seg={seg} />
                                        ))}
                                </svg>
                            )}

                            {horizontalNodes.map(({ id, level, row }) => {
                                const upgrade = KNOWLEDGE_UPGRADES[id];
                                if (!upgrade) return null;
                                const unlocked = unlockedUpgrades.includes(id);
                                const visuallyLocked = isVisuallyLocked(id);
                                const isDenied = deniedChipId === id;
                                const canResearch = canConfirmResearch(id);
                                const name = t(`knowledgeUpgrade.${id}.name`, language) || upgrade.name;
                                const isSelectionRelated = activeFocusId == null || activeConnectionIds.has(id);
                                const chipFrameColor = knowledgeTreeChipFrameColor(unlocked, visuallyLocked, isDenied);
                                const upgradeSpriteUrl = resolveUpgradeSprite(upgrade.sprite);
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        className={[
                                            'knowledge-upgrade-chip',
                                            'knowledge-upgrade-chip--horizontal',
                                            !unlocked && canResearch ? 'knowledge-upgrade-chip--available' : '',
                                            !unlocked && !canResearch ? 'knowledge-upgrade-chip--unavailable' : '',
                                            unlocked ? 'knowledge-upgrade-chip--unlocked' : '',
                                            visuallyLocked ? 'knowledge-upgrade-chip--locked' : '',
                                            isDenied ? 'knowledge-upgrade-chip--denied' : '',
                                            pinnedTooltipId === id ? 'knowledge-upgrade-chip--selected' : '',
                                            !isSelectionRelated ? 'knowledge-upgrade-chip--unrelated' : '',
                                            id === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID ? 'knowledge-upgrade-chip--ancient-era' : '',
                                            id === AGI_PROJECT_UPGRADE_ID ? 'knowledge-upgrade-chip--agi-project' : '',
                                        ].filter(Boolean).join(' ')}
                                        data-knowledge-upgrade-id={id}
                                        aria-label={name}
                                        aria-disabled={visuallyLocked && !unlocked}
                                        onClick={(event) => handleChipClick(id, event)}
                                        onMouseEnter={() => handleChipMouseEnter(id)}
                                        onMouseLeave={() => handleChipMouseLeave(id)}
                                        style={{
                                            left:
                                                KNOWLEDGE_HORIZONTAL_PAD_X +
                                                (level - 1) * KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH +
                                                (KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH - KNOWLEDGE_HORIZONTAL_NODE_WIDTH) / 2,
                                            top: KNOWLEDGE_HORIZONTAL_PAD_TOP + row * KNOWLEDGE_HORIZONTAL_ROW_HEIGHT,
                                            width: KNOWLEDGE_HORIZONTAL_NODE_WIDTH,
                                            height: KNOWLEDGE_HORIZONTAL_NODE_HEIGHT,
                                        }}
                                    >
                                        {upgradeSpriteUrl && (
                                            <img
                                                src={upgradeSpriteUrl}
                                                alt=""
                                                draggable={false}
                                                className="knowledge-upgrade-chip-image"
                                                style={{
                                                    filter: visuallyLocked
                                                        ? 'grayscale(1) saturate(0) brightness(0.65)'
                                                        : undefined,
                                                }}
                                            />
                                        )}
                                        <span className="knowledge-upgrade-chip-name">{name}</span>
                                        <div
                                            aria-hidden
                                            className="knowledge-upgrade-chip-inner-frame"
                                            style={{ borderColor: chipFrameColor }}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <aside
                        className={[
                            'knowledge-upgrade-tooltip',
                            'knowledge-upgrade-tooltip--docked',
                            pinnedTooltipId === detailId ? 'knowledge-upgrade-tooltip--pinned' : '',
                            detailId === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID ? 'knowledge-upgrade-tooltip--ancient-era' : '',
                        ].filter(Boolean).join(' ')}
                    >
                        {detailUpgrade && detailId != null ? (
                            <>
                                <div className="knowledge-upgrade-tooltip-scroll">
                                    <div className="symbol-tooltip-name">
                                        {detailUnlocked && (
                                            <span style={{ marginRight: 6, color: '#86efac' }} aria-hidden>✓</span>
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
                                        {t('knowledgeUpgrade.detail.unlockLevel', language)
                                            .replace('{level}', String(detailTierLevel))}
                                    </div>
                                    {(detailDirectPrereqs.length > 0 || detailDirectDependents.length > 0) && (
                                        <div className="knowledge-upgrade-relations">
                                            {detailDirectPrereqs.map((prereqId) => {
                                                const prereqName =
                                                    t(`knowledgeUpgrade.${prereqId}.name`, language) ||
                                                    KNOWLEDGE_UPGRADES[prereqId]?.name ||
                                                    `#${prereqId}`;
                                                const unlocked = unlockedUpgrades.includes(prereqId);
                                                return (
                                                    <button
                                                        key={`prereq-${prereqId}`}
                                                        type="button"
                                                        className={[
                                                            'knowledge-upgrade-relation-chip',
                                                            unlocked
                                                                ? 'knowledge-upgrade-relation-chip--complete'
                                                                : 'knowledge-upgrade-relation-chip--required',
                                                        ].join(' ')}
                                                        onClick={() => navigateToUpgrade(prereqId)}
                                                    >
                                                        {unlocked
                                                            ? t('knowledgeUpgrade.detail.prereqComplete', language)
                                                            : t('knowledgeUpgrade.detail.prereqRequired', language)}: {prereqName}
                                                    </button>
                                                );
                                            })}
                                            {detailDirectDependents.map((dependentId) => (
                                                <button
                                                    key={`dependent-${dependentId}`}
                                                    type="button"
                                                    className="knowledge-upgrade-relation-chip knowledge-upgrade-relation-chip--dependent"
                                                    onClick={() => navigateToUpgrade(dependentId)}
                                                >
                                                    {t('knowledgeUpgrade.detail.dependent', language)}:{' '}
                                                    {t(`knowledgeUpgrade.${dependentId}.name`, language) ||
                                                        KNOWLEDGE_UPGRADES[dependentId]?.name ||
                                                        `#${dependentId}`}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="symbol-tooltip-desc" style={{ marginTop: '8px' }}>
                                        {(t(`knowledgeUpgrade.${detailId}.desc`, language) || detailUpgrade.description)
                                            .split('\n')
                                            .map((line, index) => (
                                                <div key={index} className="symbol-tooltip-desc-line">
                                                    <EffectText text={line} />
                                                </div>
                                            ))}
                                    </div>
                                    {((detailUpgrade.descSymbols && detailUpgrade.descSymbols.length > 0) ||
                                        (detailUpgrade.descRelics && detailUpgrade.descRelics.length > 0)) && (
                                        <div className="knowledge-upgrade-desc-symbols-area">
                                            {detailUpgrade.descSymbols && detailUpgrade.descSymbols.length > 0 && (
                                                <UpgradeCardDescSymbols
                                                    upgradeId={detailId}
                                                    entries={
                                                        detailId === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID
                                                            ? buildAncientSymbolsUnlockDescSymbols(leaderId, leaderProgressLevel)
                                                            : detailUpgrade.descSymbols
                                                    }
                                                    layoutSize="panel"
                                                />
                                            )}
                                            {detailUpgrade.descRelics && detailUpgrade.descRelics.length > 0 && (
                                                <div style={{ marginTop: detailUpgrade.descSymbols?.length ? '12px' : 0 }}>
                                                    <UpgradeCardDescRelics
                                                        entries={detailUpgrade.descRelics}
                                                        layoutSize="panel"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {!detailUnlocked && (
                                    <button
                                        type="button"
                                        className="knowledge-upgrade-docked-research-btn"
                                        disabled={!canConfirmResearch(detailId)}
                                        onClick={(event) => requestResearch(detailId, event)}
                                    >
                                        {t('knowledgeUpgrade.researchConfirm', language)}
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="knowledge-upgrade-detail-empty" aria-hidden>
                                <span>◇</span>
                                <span>{t('game.knowledgeUpgradeTreeTitle', language)}</span>
                            </div>
                        )}
                    </aside>
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
