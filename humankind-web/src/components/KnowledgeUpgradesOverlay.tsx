import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
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
import { KNOWLEDGE_RESOURCE_ICON_URL } from '../uiAssetUrls';

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
};
type KnowledgeConnectorRenderLine = KnowledgeConnectorLine & { active: boolean; dimmed: boolean };
type KnowledgeHorizontalNode = {
    id: number;
    level: number;
    row: number;
};
type KnowledgeEraId = 'ancient' | 'medieval' | 'modern';
type KnowledgeEraDefinition = {
    id: KnowledgeEraId;
    nameKey: 'era.ancient' | 'era.medieval' | 'era.modern';
    minLevel: number;
    maxLevel: number;
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

const KNOWLEDGE_CONNECTOR_COLOR = '#6b7280';
const KNOWLEDGE_CONNECTOR_DIM_COLOR = '#34383f';
const KNOWLEDGE_CONNECTOR_ACTIVE_COLOR = '#d6d3c8';
const ARCHERY_BRONZE_LINE_WIDTH = 3;
const KNOWLEDGE_CONNECTOR_PORT_W = 4;
const KNOWLEDGE_CONNECTOR_PORT_H = 24;
const KNOWLEDGE_HORIZONTAL_ROWS = 9;
const KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH = 200;
const KNOWLEDGE_HORIZONTAL_ROW_HEIGHT = 78;
const KNOWLEDGE_HORIZONTAL_NODE_WIDTH = 190;
const KNOWLEDGE_HORIZONTAL_NODE_HEIGHT = 60;
const KNOWLEDGE_HORIZONTAL_PAD_X = 30;
const KNOWLEDGE_HORIZONTAL_PAD_TOP = 146;
const KNOWLEDGE_HORIZONTAL_PAD_BOTTOM = 18;
const KNOWLEDGE_TREE_MIN_LEVEL = 1;
const KNOWLEDGE_TREE_MAX_LEVEL = 30;
const KNOWLEDGE_ERAS: readonly KnowledgeEraDefinition[] = [
    { id: 'ancient', nameKey: 'era.ancient', minLevel: 1, maxLevel: 9 },
    { id: 'medieval', nameKey: 'era.medieval', minLevel: 10, maxLevel: 19 },
    { id: 'modern', nameKey: 'era.modern', minLevel: 20, maxLevel: 30 },
];

function getKnowledgeEraForLevel(level: number): KnowledgeEraDefinition {
    return KNOWLEDGE_ERAS.find((era) => level >= era.minLevel && level <= era.maxLevel)
        ?? (level < KNOWLEDGE_ERAS[0]!.minLevel ? KNOWLEDGE_ERAS[0]! : KNOWLEDGE_ERAS[2]!);
}

function getKnowledgeEraForUpgrade(upgradeId: number): KnowledgeEraDefinition {
    return getKnowledgeEraForLevel(getTierLevelForUpgrade(upgradeId));
}

// eslint-disable-next-line react-refresh/only-export-components
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

function getConnectorFanOffset(index: number, count: number, maxSpread: number): number {
    if (count <= 1) return 0;
    return ((index / (count - 1)) - 0.5) * maxSpread * 2;
}

// eslint-disable-next-line react-refresh/only-export-components
export function buildHorizontalEraNodes(minLevel: number, maxLevel: number): KnowledgeHorizontalNode[] {
    const knownRows = new Map<number, number>();
    return TIERS
        .filter((tier) => tier.level >= minLevel && tier.level <= maxLevel)
        .flatMap((tier) => {
            const occupiedRows = new Set<number>();
            return tier.ids.flatMap((upgradeId, originalCol) => {
                if (upgradeId == null) return [];
                const tierPreferredRow = Math.round(
                    (originalCol / Math.max(1, KNOWLEDGE_TREE_GRID_COLS - 1)) *
                    (KNOWLEDGE_HORIZONTAL_ROWS - 1),
                );
                const prerequisiteRows = getKnowledgeUpgradeDirectPrerequisites(upgradeId)
                    .map((prereqId) => {
                        const prerequisiteRow = knownRows.get(prereqId);
                        if (prerequisiteRow == null) return null;
                        return prerequisiteRow +
                            Math.sign(getDependentBranchOffset(prereqId, upgradeId));
                    })
                    .filter((row): row is number => row != null);
                const preferredRow = Math.max(
                    0,
                    Math.min(
                        KNOWLEDGE_HORIZONTAL_ROWS - 1,
                        prerequisiteRows.length > 0
                            ? Math.round(
                                prerequisiteRows.reduce((sum, row) => sum + row, 0) /
                                    prerequisiteRows.length,
                            )
                            : tierPreferredRow,
                    ),
                );
                const row = getNearestOpenHorizontalRow(preferredRow, occupiedRows);
                occupiedRows.add(row);
                knownRows.set(upgradeId, row);
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
    const [visibleEraId, setVisibleEraId] = useState<KnowledgeEraId>(
        () => getKnowledgeEraForLevel(currentLevel).id,
    );
    const [treeScrollMetrics, setTreeScrollMetrics] = useState({
        position: 0,
        max: 1,
    });
    const [scrollTargetId, setScrollTargetId] = useState<number | null>(null);
    const researchHintIdRef = useRef(0);
    const deniedChipTimeoutRef = useRef<number | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const treeScrollRef = useRef<HTMLDivElement>(null);
    const treeScrollMemoryRef = useRef(0);
    const treeContentRef = useRef<HTMLDivElement>(null);
    const backButtonRef = useRef<HTMLButtonElement>(null);
    const detailResearchButtonRef = useRef<HTMLButtonElement>(null);
    const confirmResearchButtonRef = useRef<HTMLButtonElement>(null);
    const wasConfirmOpenRef = useRef(false);
    const [connectorLines, setConnectorLines] = useState<KnowledgeConnectorLine[]>([]);

    const tutorialRestrictsHover = tutorialStep != null && tutorialStep >= 14 && tutorialStep <= 16;
    const activeFocusId = pinnedTooltipId ?? hoveredId ?? (tutorialRestrictsHover ? tutorialFocusId : null);
    const detailId = activeFocusId;
    const detailUpgrade = detailId != null ? KNOWLEDGE_UPGRADES[detailId] : null;
    const detailUnlocked = detailId != null && unlockedUpgrades.includes(detailId);
    const activeConnectionIds = collectConnectedUpgradeIds(activeFocusId);
    const detailDirectPrereqs = detailId != null ? [...getKnowledgeUpgradeDirectPrerequisites(detailId)] : [];
    const detailDirectDependents = detailId != null ? [...getKnowledgeUpgradeDirectDependents(detailId)] : [];
    const horizontalNodes = useMemo(
        () => buildHorizontalEraNodes(KNOWLEDGE_TREE_MIN_LEVEL, KNOWLEDGE_TREE_MAX_LEVEL),
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
    const getUpgradeStatusLabel = useCallback((id: number): string => {
        if (unlockedUpgrades.includes(id)) {
            return t('knowledgeUpgrade.status.researched', language);
        }
        if (canConfirmResearch(id)) {
            return t('knowledgeUpgrade.status.available', language);
        }
        const tierLevel = getTierLevelForUpgrade(id);
        if (currentLevel < tierLevel) {
            return t('knowledgeUpgrade.detail.unlockLevel', language)
                .replace('{level}', String(tierLevel));
        }
        const hasMissingPrerequisite = getKnowledgeUpgradeDirectPrerequisites(id)
            .some((prereqId) => !unlockedUpgrades.includes(prereqId));
        if (hasMissingPrerequisite) {
            return t('knowledgeUpgrade.detail.prereqRequired', language);
        }
        if (!hasResearchPoints) {
            return t('game.levelUpResearchPointsRequired', language);
        }
        return t('knowledgeUpgrade.status.locked', language);
    }, [canConfirmResearch, currentLevel, hasResearchPoints, language, unlockedUpgrades]);
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
            for (const [prerequisiteIndex, prereqId] of prerequisites.entries()) {
                const sourceNode = nodeById.get(prereqId);
                if (!sourceNode) continue;
                const sourceRect = sourceNode.getBoundingClientRect();
                const sourceCenterY =
                    (sourceRect.top + sourceRect.height / 2 - contentRect.top) / scaleY;
                const targetCenterY =
                    (targetRect.top + targetRect.height / 2 - contentRect.top) / scaleY;
                const targetFanOffset = getConnectorFanOffset(
                    prerequisiteIndex,
                    prerequisites.length,
                    9,
                );
                next.push({
                    from: prereqId,
                    to: upgradeId,
                    x1: (sourceRect.right - contentRect.left) / scaleX,
                    y1: sourceCenterY,
                    x2: (targetRect.left - contentRect.left) / scaleX,
                    y2: targetCenterY + targetFanOffset,
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
    }, [horizontalNodes, isOpen, language, updateKnowledgeTreeConnectors]);

    const syncTreeNavigator = useCallback((scrollEl: HTMLDivElement) => {
        const max = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
        const position = Math.max(0, Math.min(scrollEl.scrollLeft, max));
        const centerLevel = Math.max(
            KNOWLEDGE_TREE_MIN_LEVEL,
            Math.min(
                KNOWLEDGE_TREE_MAX_LEVEL,
                Math.round(
                    (position + scrollEl.clientWidth / 2 - KNOWLEDGE_HORIZONTAL_PAD_X) /
                        KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH +
                        KNOWLEDGE_TREE_MIN_LEVEL,
                ),
            ),
        );
        setVisibleEraId(getKnowledgeEraForLevel(centerLevel).id);
        setTreeScrollMetrics((previous) => (
            Math.abs(previous.position - position) < 1 && Math.abs(previous.max - Math.max(1, max)) < 1
                ? previous
                : { position, max: Math.max(1, max) }
        ));
    }, []);

    useLayoutEffect(() => {
        if (!isOpen) return;
        const scrollEl = treeScrollRef.current;
        if (!scrollEl) return;
        const raf = requestAnimationFrame(() => {
            const max = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
            scrollEl.scrollLeft = Math.min(treeScrollMemoryRef.current, max);
            syncTreeNavigator(scrollEl);
        });
        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => syncTreeNavigator(scrollEl))
            : null;
        resizeObserver?.observe(scrollEl);
        return () => {
            cancelAnimationFrame(raf);
            resizeObserver?.disconnect();
        };
    }, [isOpen, syncTreeNavigator]);

    useEffect(() => {
        if (!isOpen || tutorialStep !== 30) return;
        setHoveredId(null);
        setPinnedTooltipId(null);
    }, [isOpen, tutorialStep]);

    useLayoutEffect(() => {
        if (!isOpen || scrollTargetId == null) return;
        const raf = requestAnimationFrame(() => {
            const target = overlayRef.current
                ?.querySelector<HTMLElement>(`[data-knowledge-upgrade-id="${scrollTargetId}"]`);
            target?.scrollIntoView({ block: 'center', inline: 'center' });
            target?.focus({ preventScroll: true });
            setScrollTargetId(null);
        });
        return () => cancelAnimationFrame(raf);
    }, [horizontalNodes, isOpen, scrollTargetId]);

    useEffect(() => {
        if (!isOpen) return;
        const raf = requestAnimationFrame(() => backButtonRef.current?.focus({ preventScroll: true }));
        return () => cancelAnimationFrame(raf);
    }, [isOpen]);

    useEffect(() => {
        const shouldRestoreFocus = pendingResearchId == null && wasConfirmOpenRef.current;
        wasConfirmOpenRef.current = pendingResearchId != null;
        if (pendingResearchId == null && !shouldRestoreFocus) return;
        const raf = requestAnimationFrame(() => {
            if (pendingResearchId != null) {
                confirmResearchButtonRef.current?.focus({ preventScroll: true });
                return;
            }
            const fallbackChip = overlayRef.current
                ?.querySelector<HTMLElement>('.knowledge-upgrade-chip--selected');
            (detailResearchButtonRef.current ?? fallbackChip)?.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(raf);
    }, [pendingResearchId]);

    const closeOverlay = useCallback(() => {
        onClose();
        requestAnimationFrame(() => {
            document
                .querySelector<HTMLButtonElement>('.knowledge-upgrades-btn')
                ?.focus({ preventScroll: true });
        });
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (pendingResearchId !== null) setPendingResearchId(null);
                else closeOverlay();
                return;
            }
            if (e.key === 'Tab') {
                const focusScope = pendingResearchId != null
                    ? overlayRef.current?.querySelector<HTMLElement>('.knowledge-research-confirm-overlay')
                    : overlayRef.current;
                const focusable = Array.from(
                    focusScope?.querySelectorAll<HTMLElement>(
                        'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
                    ) ?? [],
                ).filter((element) => element.getAttribute('aria-hidden') !== 'true');
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first?.focus();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [closeOverlay, isOpen, pendingResearchId]);

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
    const inactiveConnectorRenderLines = connectorRenderLines.filter((seg) => !seg.active);
    const activeConnectorRenderLines = connectorRenderLines.filter((seg) => seg.active);
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

    const setTreeScrollPosition = (position: number) => {
        const scrollEl = treeScrollRef.current;
        if (!scrollEl) return;
        const max = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
        scrollEl.scrollLeft = Math.max(0, Math.min(position, max));
        treeScrollMemoryRef.current = scrollEl.scrollLeft;
        syncTreeNavigator(scrollEl);
    };

    const scrollTreeToLevel = (level: number) => {
        setHoveredId(null);
        setPinnedTooltipId(null);
        const anchorLevel = level > KNOWLEDGE_TREE_MIN_LEVEL ? level - 1 : level;
        setTreeScrollPosition(
            KNOWLEDGE_HORIZONTAL_PAD_X +
                (anchorLevel - KNOWLEDGE_TREE_MIN_LEVEL) * KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH,
        );
    };

    const navigateToUpgrade = (upgradeId: number) => {
        setHoveredId(null);
        setPinnedTooltipId(upgradeId);
        setScrollTargetId(upgradeId);
    };
    const currentEra = getKnowledgeEraForLevel(currentLevel);
    const detailStatusLabel = detailId != null ? getUpgradeStatusLabel(detailId) : '';
    const detailSpriteUrl = detailUpgrade ? resolveUpgradeSprite(detailUpgrade.sprite) : null;
    const reachedLevelCount = Math.max(
        0,
        Math.min(currentLevel, KNOWLEDGE_TREE_MAX_LEVEL) - KNOWLEDGE_TREE_MIN_LEVEL + 1,
    );
    const firstLevelViewportX =
        10 + KNOWLEDGE_HORIZONTAL_PAD_X - treeScrollMetrics.position;
    const reachedBackdropLeft = Math.min(0, firstLevelViewportX);
    const reachedBackdropRight =
        firstLevelViewportX + reachedLevelCount * KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH;

    return (
        <div
            ref={overlayRef}
            className="knowledge-upgrades-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="knowledge-upgrades-title"
        >
            <header className="knowledge-upgrades-header">
                <button
                    ref={backButtonRef}
                    className="knowledge-upgrades-back-btn relic-shop-back-btn knowledge-return-hotzone"
                    type="button"
                    onClick={closeOverlay}
                    aria-label={t('knowledgeUpgrade.back', language)}
                >
                    <span className="relic-shop-back-icon" aria-hidden>
                        ←
                    </span>
                    <span className="relic-shop-back-label">{t('knowledgeUpgrade.back', language)}</span>
                </button>

                <div className="knowledge-upgrades-title-block">
                    <span className="knowledge-upgrades-title-context">
                        Lv.{currentLevel} · {t(currentEra.nameKey, language)}
                    </span>
                    <h1 id="knowledge-upgrades-title">
                        {t('game.knowledgeUpgradeTreeTitle', language)}
                    </h1>
                </div>

                <div
                    className={[
                        'knowledge-upgrades-points',
                        hasResearchPoints ? 'knowledge-upgrades-points--available' : '',
                    ].filter(Boolean).join(' ')}
                    role="status"
                    aria-label={`${t('game.levelUpResearchPointsLabel', language)}: ${levelUpResearchPoints}`}
                >
                    <span className="knowledge-upgrades-points-label">
                        {t('game.levelUpResearchPointsLabel', language)}
                    </span>
                    <strong>{levelUpResearchPoints}</strong>
                </div>
            </header>

            <div className="knowledge-upgrades-page">
                {reachedLevelCount > 0 && (
                    <div
                        aria-hidden
                        className="knowledge-upgrades-reached-backdrop"
                        style={{
                            left: reachedBackdropLeft,
                            width: Math.max(0, reachedBackdropRight - reachedBackdropLeft),
                        }}
                    />
                )}
                <div className="knowledge-upgrades-workspace">
                    <section
                        className="knowledge-upgrades-tree-panel"
                        aria-labelledby="knowledge-upgrades-title"
                    >
                        <div
                            ref={treeScrollRef}
                            className="knowledge-upgrades-era-scroll knowledge-upgrades-tree-scroll"
                            tabIndex={0}
                            aria-label={t('game.knowledgeUpgradeTreeTitle', language)}
                            onScroll={(event) => {
                                treeScrollMemoryRef.current = event.currentTarget.scrollLeft;
                                syncTreeNavigator(event.currentTarget);
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
                                treeScrollMemoryRef.current = event.currentTarget.scrollLeft;
                                syncTreeNavigator(event.currentTarget);
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
                                        (KNOWLEDGE_TREE_MAX_LEVEL - KNOWLEDGE_TREE_MIN_LEVEL + 1) *
                                            KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH,
                                    height:
                                        KNOWLEDGE_HORIZONTAL_PAD_TOP +
                                        KNOWLEDGE_HORIZONTAL_ROWS * KNOWLEDGE_HORIZONTAL_ROW_HEIGHT +
                                        KNOWLEDGE_HORIZONTAL_PAD_BOTTOM,
                                }}
                            >
                                {Array.from(
                                    { length: KNOWLEDGE_TREE_MAX_LEVEL - KNOWLEDGE_TREE_MIN_LEVEL + 1 },
                                    (_, index) => KNOWLEDGE_TREE_MIN_LEVEL + index,
                                ).map((level, index) => (
                                    <div
                                        key={`level-${level}`}
                                        className={[
                                            'knowledge-horizontal-level-column',
                                            level <= currentLevel ? 'knowledge-horizontal-level-column--reached' : '',
                                            level > currentLevel ? 'knowledge-horizontal-level-column--future' : '',
                                        ].filter(Boolean).join(' ')}
                                        style={{
                                            left:
                                                KNOWLEDGE_HORIZONTAL_PAD_X +
                                                index * KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH,
                                            width: KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH,
                                        }}
                                    >
                                        <span>Lv.{level}</span>
                                    </div>
                                ))}

                                {inactiveConnectorRenderLines.length > 0 && (
                                    <svg aria-hidden className="knowledge-horizontal-connectors">
                                        {inactiveConnectorRenderLines.map((seg, index) => (
                                            <KnowledgeConnectorSegment key={`inactive-${index}`} seg={seg} />
                                        ))}
                                    </svg>
                                )}

                                {activeConnectorRenderLines.length > 0 && (
                                    <svg
                                        aria-hidden
                                        className="knowledge-horizontal-connectors knowledge-horizontal-connectors--active"
                                    >
                                        {activeConnectorRenderLines.map((seg, index) => (
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
                                    const statusLabel = getUpgradeStatusLabel(id);
                                    const isSelectionRelated =
                                        activeFocusId == null || activeConnectionIds.has(id);
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
                                                id === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID
                                                    ? 'knowledge-upgrade-chip--ancient-era'
                                                    : '',
                                                id === AGI_PROJECT_UPGRADE_ID
                                                    ? 'knowledge-upgrade-chip--agi-project'
                                                    : '',
                                            ].filter(Boolean).join(' ')}
                                            data-knowledge-upgrade-id={id}
                                            aria-label={`${name}, ${statusLabel}`}
                                            aria-pressed={pinnedTooltipId === id}
                                            onClick={(event) => handleChipClick(id, event)}
                                            onFocus={() => handleChipMouseEnter(id)}
                                            onBlur={() => handleChipMouseLeave(id)}
                                            onMouseEnter={() => handleChipMouseEnter(id)}
                                            onMouseLeave={() => handleChipMouseLeave(id)}
                                            style={{
                                                left:
                                                    KNOWLEDGE_HORIZONTAL_PAD_X +
                                                    (level - KNOWLEDGE_TREE_MIN_LEVEL) *
                                                        KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH +
                                                    (KNOWLEDGE_HORIZONTAL_LEVEL_WIDTH -
                                                        KNOWLEDGE_HORIZONTAL_NODE_WIDTH) /
                                                        2,
                                                top:
                                                    KNOWLEDGE_HORIZONTAL_PAD_TOP +
                                                    row * KNOWLEDGE_HORIZONTAL_ROW_HEIGHT,
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
                                                />
                                            )}
                                            <span className="knowledge-upgrade-chip-copy">
                                                <span className="knowledge-upgrade-chip-name">{name}</span>
                                            </span>
                                            {unlocked && (
                                                <span
                                                    aria-hidden
                                                    className="knowledge-upgrade-chip-state-mark knowledge-upgrade-chip-state-mark--researched"
                                                >
                                                    ✓
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <nav
                            className="knowledge-tree-navigator"
                            aria-label={t('game.knowledgeUpgradeTreeTitle', language)}
                        >
                            <div className="knowledge-tree-navigator-eras">
                                {KNOWLEDGE_ERAS.map((era) => (
                                    <button
                                        key={`navigator-${era.id}`}
                                        type="button"
                                        className={[
                                            'knowledge-tree-navigator-era',
                                            visibleEraId === era.id
                                                ? 'knowledge-tree-navigator-era--active'
                                                : '',
                                        ].filter(Boolean).join(' ')}
                                        onClick={() => scrollTreeToLevel(era.minLevel)}
                                    >
                                        <strong>{t(era.nameKey, language)}</strong>
                                        <span>Lv.{era.minLevel}–{era.maxLevel}</span>
                                    </button>
                                ))}
                            </div>
                            <input
                                className="knowledge-tree-navigator-range"
                                type="range"
                                min={0}
                                max={treeScrollMetrics.max}
                                step={1}
                                value={Math.min(treeScrollMetrics.position, treeScrollMetrics.max)}
                                aria-label={t('game.knowledgeUpgradeTreeTitle', language)}
                                onChange={(event) => setTreeScrollPosition(Number(event.currentTarget.value))}
                            />
                        </nav>
                    </section>

                    <aside
                        className={[
                            'knowledge-upgrade-tooltip',
                            'knowledge-upgrade-tooltip--docked',
                            pinnedTooltipId === detailId ? 'knowledge-upgrade-tooltip--pinned' : '',
                            detailId === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID ? 'knowledge-upgrade-tooltip--ancient-era' : '',
                        ].filter(Boolean).join(' ')}
                        aria-label={detailUpgrade
                            ? t(`knowledgeUpgrade.${detailId}.name`, language) || detailUpgrade.name
                            : t('game.knowledgeUpgradeTreeTitle', language)}
                    >
                        {detailUpgrade && detailId != null ? (
                            <>
                                <div className="knowledge-upgrade-tooltip-scroll">
                                    <div
                                        className="knowledge-upgrade-detail-heading"
                                        style={{ '--knowledge-detail-accent': detailEraColor } as CSSProperties}
                                    >
                                        <div className="knowledge-upgrade-detail-sprite-frame" aria-hidden>
                                            {detailSpriteUrl && (
                                                <img src={detailSpriteUrl} alt="" draggable={false} />
                                            )}
                                        </div>
                                        <div className="knowledge-upgrade-detail-heading-copy">
                                            <div className="symbol-tooltip-name">
                                                {t(`knowledgeUpgrade.${detailId}.name`, language) ||
                                                    detailUpgrade.name}
                                            </div>
                                            <div className="knowledge-upgrade-detail-meta">
                                                <span
                                                    className="symbol-tooltip-rarity"
                                                    style={{ color: detailEraColor }}
                                                >
                                                    {t(ERA_NAME_KEYS[detailUpgrade.type], language)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="symbol-tooltip-desc">
                                        {(t(`knowledgeUpgrade.${detailId}.desc`, language) ||
                                            detailUpgrade.description)
                                            .split('\n')
                                            .map((line, index) => (
                                                <div key={index} className="symbol-tooltip-desc-line">
                                                    <EffectText text={line} />
                                                </div>
                                            ))}
                                    </div>

                                    {detailDirectPrereqs.length > 0 && (
                                        <div className="knowledge-upgrade-relations">
                                            <div className="knowledge-upgrade-relation-group">
                                                <span>{t('knowledgeUpgrade.detail.prereqRequired', language)}</span>
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
                                                            <span aria-hidden>{unlocked ? '✓' : '←'}</span>
                                                            {t(
                                                                getKnowledgeEraForUpgrade(prereqId).nameKey,
                                                                language,
                                                            )} · {prereqName}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {((detailUpgrade.descSymbols && detailUpgrade.descSymbols.length > 0) ||
                                        (detailUpgrade.descRelics && detailUpgrade.descRelics.length > 0)) && (
                                        <div className="knowledge-upgrade-desc-symbols-area">
                                            {detailUpgrade.descSymbols && detailUpgrade.descSymbols.length > 0 && (
                                                <UpgradeCardDescSymbols
                                                    upgradeId={detailId}
                                                    entries={
                                                        detailId === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID
                                                            ? buildAncientSymbolsUnlockDescSymbols(
                                                                leaderId,
                                                                leaderProgressLevel,
                                                            )
                                                            : detailUpgrade.descSymbols
                                                    }
                                                    layoutSize="panel"
                                                />
                                            )}
                                            {detailUpgrade.descRelics && detailUpgrade.descRelics.length > 0 && (
                                                <div className="knowledge-upgrade-detail-relics">
                                                    <UpgradeCardDescRelics
                                                        entries={detailUpgrade.descRelics}
                                                        layoutSize="panel"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {detailDirectDependents.length > 0 && (
                                        <div className="knowledge-upgrade-relations">
                                            <div className="knowledge-upgrade-relation-group">
                                                <span>{t('knowledgeUpgrade.detail.dependent', language)}</span>
                                                {detailDirectDependents.map((dependentId) => (
                                                    <button
                                                        key={`dependent-${dependentId}`}
                                                        type="button"
                                                        className="knowledge-upgrade-relation-chip knowledge-upgrade-relation-chip--dependent"
                                                        onClick={() => navigateToUpgrade(dependentId)}
                                                    >
                                                        <span aria-hidden>→</span>
                                                        {t(`knowledgeUpgrade.${dependentId}.name`, language) ||
                                                            KNOWLEDGE_UPGRADES[dependentId]?.name ||
                                                            `#${dependentId}`}{' '}
                                                        ({t(
                                                            getKnowledgeEraForUpgrade(dependentId).nameKey,
                                                            language,
                                                        )})
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {detailUnlocked ? (
                                    <div className="knowledge-upgrade-researched-banner">
                                        <span aria-hidden>✓</span>
                                        {t('knowledgeUpgrade.status.researched', language)}
                                    </div>
                                ) : (
                                    <button
                                        ref={detailResearchButtonRef}
                                        type="button"
                                        className="knowledge-upgrade-docked-research-btn"
                                        disabled={!canConfirmResearch(detailId)}
                                        onClick={(event) => requestResearch(detailId, event)}
                                    >
                                        <span>
                                            {canConfirmResearch(detailId)
                                                ? t('knowledgeUpgrade.researchConfirm', language)
                                                : detailStatusLabel}
                                        </span>
                                        {canConfirmResearch(detailId) && (
                                            <span className="knowledge-upgrade-research-cost">
                                                {t('game.levelUpResearchPointsLabel', language)} 1
                                            </span>
                                        )}
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="knowledge-upgrade-detail-empty">
                                <img src={KNOWLEDGE_RESOURCE_ICON_URL} alt="" draggable={false} />
                                <strong>
                                    {t(
                                        KNOWLEDGE_ERAS.find((era) => era.id === visibleEraId)?.nameKey
                                            ?? currentEra.nameKey,
                                        language,
                                    )}
                                </strong>
                                <span>{t('game.knowledgeUpgradeTreeTitle', language)}</span>
                            </div>
                        )}
                    </aside>
                </div>
            </div>

            <div className="knowledge-upgrade-screenreader-status" aria-live="polite">
                {deniedChipId != null ? getUpgradeStatusLabel(deniedChipId) : ''}
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
                                ref={confirmResearchButtonRef}
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
