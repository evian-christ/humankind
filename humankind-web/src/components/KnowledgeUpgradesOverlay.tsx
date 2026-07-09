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
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    COMPASS_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FISHERY_GUILD_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    MARITIME_TRADE_UPGRADE_ID,
    MILITARY_SCIENCE_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    NOMADIC_TRADITION_UPGRADE_ID,
    OCEANIC_ROUTES_UPGRADE_ID,
    PASTURE_MANAGEMENT_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    SHIPBUILDING_UPGRADE_ID,
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
    laneColor: string;
};
type KnowledgeConnectorRenderLine = KnowledgeConnectorLine & { active: boolean; dimmed: boolean };
type KnowledgeUpgradeTooltipPosition = {
    left: number;
    top: number;
    placement: 'left' | 'right';
};

/** Tree columns are visual sub-lanes. Wide thematic lanes span multiple sub-lanes for forks. */
const KNOWLEDGE_TREE_GRID_COLS = 13;
const KNOWLEDGE_TREE_CENTER_COL = 6;
const KNOWLEDGE_TREE_ERA_SPINE_IDS = new Set([
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    AGI_PROJECT_UPGRADE_ID,
]);
const KNOWLEDGE_TREE_LANE_HEADER_H = 62;
const KNOWLEDGE_TREE_DEFAULT_LANE_COLOR = '#64748b';
const KNOWLEDGE_TREE_LANES: readonly {
    startCol: number;
    span: number;
    labelKo: string;
    labelEn: string;
    color: string;
}[] = [
    { startCol: 0, span: 1, labelKo: '수렵', labelEn: 'Hunt', color: '#84cc16' },
    { startCol: 1, span: 2, labelKo: '목축', labelEn: 'Herd', color: '#f59e0b' },
    { startCol: 3, span: 1, labelKo: '농업', labelEn: 'Farm', color: '#22c55e' },
    { startCol: 4, span: 4, labelKo: '해양', labelEn: 'Sea', color: '#38bdf8' },
    { startCol: 8, span: 1, labelKo: '사막/교역', labelEn: 'Trade', color: '#facc15' },
    { startCol: 9, span: 1, labelKo: '학문', labelEn: 'Study', color: '#60a5fa' },
    { startCol: 10, span: 1, labelKo: '종교', labelEn: 'Faith', color: '#c084fc' },
    { startCol: 11, span: 2, labelKo: '열대', labelEn: 'Tropic', color: '#f472b6' },
];
const KNOWLEDGE_STANDALONE_COLS = 3;
const KNOWLEDGE_STANDALONE_SECTION_GAP = 44;
const KNOWLEDGE_STANDALONE_SECTION_LABEL_KO = '내정/정책';
const KNOWLEDGE_STANDALONE_SECTION_LABEL_EN = 'Policy';

function getKnowledgeTreeLaneColor(col: number): string {
    return KNOWLEDGE_TREE_LANES.find((lane) => col >= lane.startCol && col < lane.startCol + lane.span)?.color ??
        KNOWLEDGE_TREE_DEFAULT_LANE_COLOR;
}

function getKnowledgeTreeLaneLabel(lane: (typeof KNOWLEDGE_TREE_LANES)[number], language: string): string {
    return language === 'ko' ? lane.labelKo : lane.labelEn;
}

function getStandaloneSectionLabel(language: string): string {
    return language === 'ko' ? KNOWLEDGE_STANDALONE_SECTION_LABEL_KO : KNOWLEDGE_STANDALONE_SECTION_LABEL_EN;
}

function isStandaloneKnowledgeUpgrade(upgradeId: number): boolean {
    return (
        getKnowledgeUpgradeDirectPrerequisites(upgradeId).length === 0 &&
        getKnowledgeUpgradeDirectDependents(upgradeId).length === 0 &&
        !KNOWLEDGE_TREE_ERA_SPINE_IDS.has(upgradeId)
    );
}

function getKnowledgeTreeVisualColumn(upgradeId: number): number {
    if (KNOWLEDGE_TREE_ERA_SPINE_IDS.has(upgradeId)) return KNOWLEDGE_TREE_CENTER_COL;

    switch (upgradeId) {
        // 목축: 기마술/군사학과 유목 전통 사슬을 밴드 안에서 분리한다.
        case HORSEMANSHIP_UPGRADE_ID:
        case MILITARY_SCIENCE_UPGRADE_ID:
            return 1;
        case NOMADIC_TRADITION_UPGRADE_ID:
        case PASTURE_MANAGEMENT_UPGRADE_ID:
            return 2;
        // 해양: 갈래를 밴드 안 서브컬럼에 고정한다.
        case SEAFARING_UPGRADE_ID:
        case FISHERY_GUILD_UPGRADE_ID:
            return 4;
        case CELESTIAL_NAVIGATION_UPGRADE_ID:
        case MARITIME_TRADE_UPGRADE_ID:
        case OCEANIC_ROUTES_UPGRADE_ID:
            return 5;
        case COMPASS_UPGRADE_ID:
            return 6;
        case SHIPBUILDING_UPGRADE_ID:
            return 7;
        default:
            break;
    }

    const preferredCol = KNOWLEDGE_UPGRADE_TREE_PREFERRED_COLUMN_BY_ID[upgradeId] ?? KNOWLEDGE_TREE_CENTER_COL;
    if (preferredCol === 2) return 1;
    if (preferredCol === 4) return 3;
    if (preferredCol === 6) return 5;
    if (preferredCol === 10) return 9;
    if (preferredCol === 12) return 11;
    return Math.min(Math.max(preferredCol, 0), KNOWLEDGE_TREE_GRID_COLS - 1);
}

// eslint-disable-next-line react-refresh/only-export-components
export function buildBranchTierRows(): { level: number; ids: (number | null)[] }[] {
    return KNOWLEDGE_UPGRADE_TIER_ROWS.filter((tier) => tier.level >= 0).map((tier) => {
        const row = Array<number | null>(KNOWLEDGE_TREE_GRID_COLS).fill(null);
        tier.ids
            .filter((upgradeId) => !isStandaloneKnowledgeUpgrade(upgradeId))
            .forEach((upgradeId) => {
                row[getKnowledgeTreeVisualColumn(upgradeId)] = upgradeId;
            });
        return { level: tier.level, ids: row };
    });
}

// eslint-disable-next-line react-refresh/only-export-components
export function buildStandaloneTierRows(): { level: number; ids: readonly number[] }[] {
    return KNOWLEDGE_UPGRADE_TIER_ROWS.filter((tier) => tier.level >= 0).map((tier) => ({
        level: tier.level,
        ids: tier.ids.filter(isStandaloneKnowledgeUpgrade),
    }));
}

const TIERS: { level: number; ids: (number | null)[] }[] = buildBranchTierRows();
const STANDALONE_TIERS: { level: number; ids: readonly number[] }[] = buildStandaloneTierRows();

const KNOWLEDGE_TREE_CHIP = 110;
const KNOWLEDGE_TREE_GAP = 16;
const KNOWLEDGE_STANDALONE_GAP = 12;
const TIER_ROW_PAD_X = 48;
const TIER_LABEL_W = 72;
/** Reserve one label band so Lv labels do not overlap the grid. */
const KNOWLEDGE_TREE_LABEL_BAND_PX = TIER_ROW_PAD_X + TIER_LABEL_W + 14;
const KNOWLEDGE_TREE_BODY_PAD_TOP = 0;
const TIER_ROW_MIN_H = 130;
const TIER_STACK_GAP = 28;
const KNOWLEDGE_CONNECTOR_COLOR = '#4b4e55';
const KNOWLEDGE_CONNECTOR_DIM_COLOR = '#202228';
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
const KNOWLEDGE_ERA_RESEARCH_SUMMARIES = {
    1: { eraKey: 'era.ancient', minLevel: 1, maxLevel: 9 },
    10: { eraKey: 'era.medieval', minLevel: 10, maxLevel: 19 },
    20: { eraKey: 'era.modern', minLevel: 20, maxLevel: 29 },
} as const;

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

/** Grid width: chip columns plus gaps. */
function knowledgeTreeGridWidthPx(): number {
    return (
        KNOWLEDGE_TREE_GRID_COLS * KNOWLEDGE_TREE_CHIP +
        (KNOWLEDGE_TREE_GRID_COLS - 1) * KNOWLEDGE_TREE_GAP
    );
}

function knowledgeStandaloneGridWidthPx(): number {
    return (
        KNOWLEDGE_STANDALONE_COLS * KNOWLEDGE_TREE_CHIP +
        (KNOWLEDGE_STANDALONE_COLS - 1) * KNOWLEDGE_STANDALONE_GAP
    );
}

function knowledgeTreeAndStandaloneWidthPx(): number {
    return knowledgeTreeGridWidthPx() + KNOWLEDGE_STANDALONE_SECTION_GAP + knowledgeStandaloneGridWidthPx();
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
    return (
        TIERS.find((tier) => tier.ids.includes(upgradeId))?.level ??
        STANDALONE_TIERS.find((tier) => tier.ids.includes(upgradeId))?.level ??
        1
    );
}

function getTierRowHeightPx(_rowIdx: number): number {
    return TIER_ROW_MIN_H;
}

function getTierRowTopPx(rowIdx: number): number {
    let top = KNOWLEDGE_TREE_LANE_HEADER_H;
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
        ? seg.laneColor
        : seg.dimmed
            ? KNOWLEDGE_CONNECTOR_DIM_COLOR
            : seg.laneColor || KNOWLEDGE_CONNECTOR_COLOR;
    const connectorOpacity = seg.active
        ? KNOWLEDGE_CONNECTOR_ACTIVE_OPACITY
        : seg.dimmed
            ? KNOWLEDGE_CONNECTOR_DIMMED_OPACITY
            : KNOWLEDGE_CONNECTOR_IDLE_OPACITY;
    const startY = seg.y1 + KNOWLEDGE_CONNECTOR_PORT_H;
    const endY = seg.y2;
    const midY = Math.round((startY + endY) / 2);
    const pathD = seg.x1 === seg.x2
        ? `M ${seg.x1} ${startY} L ${seg.x2} ${endY}`
        : `M ${seg.x1} ${startY} L ${seg.x1} ${midY} L ${seg.x2} ${midY} L ${seg.x2} ${endY}`;

    return (
        <g opacity={connectorOpacity}>
            <path
                d={pathD}
                fill="none"
                stroke={connectorColor}
                strokeWidth={ARCHERY_BRONZE_LINE_WIDTH}
                strokeLinejoin="round"
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
    const [isClosing, setIsClosing] = useState(false);
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

    const tutorialRestrictsHover = tutorialStep != null && tutorialStep >= 14 && tutorialStep <= 16;
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
        const totalWidth = knowledgeTreeAndStandaloneWidthPx();
        const centeredGridStartX =
            KNOWLEDGE_TREE_LABEL_BAND_PX +
            Math.max(0, (contentEl.clientWidth - KNOWLEDGE_TREE_LABEL_BAND_PX - totalWidth) / 2);
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
                    laneColor: getKnowledgeTreeLaneColor(targetPos.colIdx),
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

    useLayoutEffect(() => {
        if (!isOpen || tutorialStep !== 30) return;
        const scrollEl = treeScrollRef.current;
        if (!scrollEl) return;
        const raf = requestAnimationFrame(() => {
            scrollEl.scrollTop = 0;
            savedTreeScrollTopRef.current = scrollEl.scrollTop;
        });
        return () => cancelAnimationFrame(raf);
    }, [isOpen, tutorialStep]);

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
        if (tutorialStep === 15 && id === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID) {
            setPendingResearchId(null);
            setTutorialFocusId(null);
            onTutorialStepChange?.(16);
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
            tutorialStep === 15 && id === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID;
        if (tutorialStep === 15 && !tutorialAllowsAncientResearchHover) return;
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

    const renderKnowledgeUpgradeChip = (id: number) => {
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
                    id === AGI_PROJECT_UPGRADE_ID ? 'knowledge-upgrade-chip--agi-project' : '',
                ].filter(Boolean).join(' ')}
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
                        borderRadius: 0,
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                    }}
                />
            </button>
        );
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

            {/* Tree body */}
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
                        if (
                            tutorialStep === 30 &&
                            e.currentTarget.scrollTop + e.currentTarget.clientHeight >=
                                e.currentTarget.scrollHeight - 24
                        ) {
                            onTutorialStepChange?.(31);
                        }
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
                            paddingTop: KNOWLEDGE_TREE_LANE_HEADER_H,
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
                        <div
                            aria-hidden
                            style={{
                                position: 'absolute',
                                left: KNOWLEDGE_TREE_LABEL_BAND_PX,
                                right: 0,
                                top: 0,
                                height: KNOWLEDGE_TREE_LANE_HEADER_H,
                                display: 'flex',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                zIndex: 6,
                            }}
                        >
                            <div
                                style={{
                                    width: knowledgeTreeAndStandaloneWidthPx(),
                                    display: 'grid',
                                    gridTemplateColumns: `${knowledgeTreeGridWidthPx()}px ${KNOWLEDGE_STANDALONE_SECTION_GAP}px ${knowledgeStandaloneGridWidthPx()}px`,
                                    flexShrink: 0,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${KNOWLEDGE_TREE_GRID_COLS}, ${KNOWLEDGE_TREE_CHIP}px)`,
                                        gap: `${KNOWLEDGE_TREE_GAP}px`,
                                    }}
                                >
                                    {KNOWLEDGE_TREE_LANES.map((lane) => (
                                        <div
                                            key={`lane-header-${lane.startCol}`}
                                            style={{
                                                gridColumn: `${lane.startCol + 1} / span ${lane.span}`,
                                                alignSelf: 'end',
                                                marginBottom: 10,
                                                height: 28,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: lane.color,
                                                border: `1px solid ${lane.color}66`,
                                                background: `${lane.color}14`,
                                                fontFamily: 'var(--game-font-family), sans-serif',
                                                fontSize: 13,
                                                fontWeight: 'bold',
                                                letterSpacing: '0.08em',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.85)',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {getKnowledgeTreeLaneLabel(lane, language)}
                                        </div>
                                    ))}
                                </div>
                                <div />
                                <div
                                    style={{
                                        alignSelf: 'end',
                                        marginBottom: 10,
                                        height: 28,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#cbd5e1',
                                        border: '1px solid rgba(148,163,184,0.38)',
                                        background: 'rgba(30,41,59,0.42)',
                                        fontFamily: 'var(--game-font-family), sans-serif',
                                        fontSize: 13,
                                        fontWeight: 'bold',
                                        letterSpacing: '0.08em',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.85)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {getStandaloneSectionLabel(language)}
                                </div>
                            </div>
                        </div>
                        <div
                            aria-hidden
                            style={{
                                position: 'absolute',
                                left: KNOWLEDGE_TREE_LABEL_BAND_PX,
                                right: 0,
                                top: KNOWLEDGE_TREE_LANE_HEADER_H,
                                bottom: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                zIndex: 1,
                            }}
                        >
                            <div
                                style={{
                                    width: knowledgeTreeAndStandaloneWidthPx(),
                                    display: 'grid',
                                    gridTemplateColumns: `${knowledgeTreeGridWidthPx()}px ${KNOWLEDGE_STANDALONE_SECTION_GAP}px ${knowledgeStandaloneGridWidthPx()}px`,
                                    flexShrink: 0,
                                    height: '100%',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${KNOWLEDGE_TREE_GRID_COLS}, ${KNOWLEDGE_TREE_CHIP}px)`,
                                        gap: `${KNOWLEDGE_TREE_GAP}px`,
                                        height: '100%',
                                    }}
                                >
                                    {KNOWLEDGE_TREE_LANES.map((lane) => (
                                        <div
                                            key={`lane-rail-${lane.startCol}`}
                                            style={{
                                                gridColumn: `${lane.startCol + 1} / span ${lane.span}`,
                                                position: 'relative',
                                                height: '100%',
                                                background: `${lane.color}08`,
                                                borderLeft: `1px solid ${lane.color}18`,
                                                borderRight: `1px solid ${lane.color}18`,
                                            }}
                                        >
                                            {Array.from({ length: lane.span }, (_, idx) => (
                                                <div
                                                    key={`lane-subrail-${lane.startCol}-${idx}`}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${idx * (KNOWLEDGE_TREE_CHIP + KNOWLEDGE_TREE_GAP) + KNOWLEDGE_TREE_CHIP / 2}px`,
                                                        top: 0,
                                                        bottom: 0,
                                                        width: 3,
                                                        transform: 'translateX(-50%)',
                                                        background: `linear-gradient(to bottom, ${lane.color}55, ${lane.color}1a)`,
                                                        boxShadow: `0 0 12px ${lane.color}44`,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                                <div />
                                <div
                                    style={{
                                        height: '100%',
                                        background: 'rgba(15,23,42,0.45)',
                                        borderLeft: '1px solid rgba(148,163,184,0.24)',
                                        borderRight: '1px solid rgba(148,163,184,0.24)',
                                    }}
                                />
                            </div>
                        </div>
                        {TIERS.map((tier) => {
                            const tierRowHeight = getTierRowHeightPx(TIERS.indexOf(tier));
                            const tierUnlockable = currentLevel >= tier.level;
                            const dashColor = tierUnlockable ? '#fbbf2428' : '#1e1e1e';
                            const labelColor = tierUnlockable ? '#fbbf24cc' : '#3a3a3a';
                            const eraResearchSummary =
                                KNOWLEDGE_ERA_RESEARCH_SUMMARIES[
                                    tier.level as keyof typeof KNOWLEDGE_ERA_RESEARCH_SUMMARIES
                                ];
                            const eraResearchAvailability = eraResearchSummary
                                ? getKnowledgeEraResearchAvailability(
                                    unlockedUpgrades,
                                    eraResearchSummary.minLevel,
                                    eraResearchSummary.maxLevel,
                                )
                                : null;

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

                                    {eraResearchSummary && eraResearchAvailability && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: `${KNOWLEDGE_TREE_LABEL_BAND_PX + 88}px`,
                                                right: `${TIER_ROW_PAD_X + 32}px`,
                                                bottom: 'calc(50% + 10px)',
                                                zIndex: 6,
                                                display: 'flex',
                                                alignItems: 'flex-end',
                                                justifyContent: 'space-between',
                                                color: labelColor,
                                                fontFamily: 'var(--game-font-family), sans-serif',
                                                lineHeight: 0.8,
                                                fontWeight: 'bold',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                                                whiteSpace: 'nowrap',
                                                pointerEvents: 'none',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '40px',
                                                    letterSpacing: '0.04em',
                                                }}
                                            >
                                                {t('knowledgeUpgrade.eraLabel', language)
                                                    .replace('{era}', t(eraResearchSummary.eraKey, language))}
                                            </span>
                                            <span
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'baseline',
                                                    gap: '12px',
                                                    fontSize: '26px',
                                                    letterSpacing: '0.04em',
                                                }}
                                            >
                                                <span>
                                                    {t('knowledgeUpgrade.eraResearchAvailability', language)
                                                        .replace('{era}', t(eraResearchSummary.eraKey, language))
                                                        .replace('{available}/{total}', '')}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '42px',
                                                        letterSpacing: '0.02em',
                                                    }}
                                                >
                                                    {eraResearchAvailability.available}/{eraResearchAvailability.total}
                                                </span>
                                            </span>
                                        </div>
                                    )}

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
                                                width: knowledgeTreeAndStandaloneWidthPx(),
                                                display: 'grid',
                                                gridTemplateColumns: `${knowledgeTreeGridWidthPx()}px ${KNOWLEDGE_STANDALONE_SECTION_GAP}px ${knowledgeStandaloneGridWidthPx()}px`,
                                                flexShrink: 0,
                                            }}
                                            >
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: `repeat(${KNOWLEDGE_TREE_GRID_COLS}, ${KNOWLEDGE_TREE_CHIP}px)`,
                                                    gap: `${KNOWLEDGE_TREE_GAP}px`,
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
                                                    return renderKnowledgeUpgradeChip(id);
                                                })}
                                            </div>
                                            <div />
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: `repeat(${KNOWLEDGE_STANDALONE_COLS}, ${KNOWLEDGE_TREE_CHIP}px)`,
                                                    gap: `${KNOWLEDGE_STANDALONE_GAP}px`,
                                                    alignItems: 'center',
                                                    justifyItems: 'center',
                                                }}
                                            >
                                                {Array.from({ length: KNOWLEDGE_STANDALONE_COLS }, (_, slotIdx) => {
                                                    const id = STANDALONE_TIERS[TIERS.indexOf(tier)]?.ids[slotIdx] ?? null;
                                                    if (id == null) {
                                                        return (
                                                            <div
                                                                key={`standalone-empty-${tier.level}-${slotIdx}`}
                                                                style={{
                                                                    width: `${KNOWLEDGE_TREE_CHIP}px`,
                                                                    height: `${KNOWLEDGE_TREE_CHIP}px`,
                                                                }}
                                                            />
                                                        );
                                                    }
                                                    return renderKnowledgeUpgradeChip(id);
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {connectorLines.length > 0 && (
                            <>
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
                                    {hoveredId == null && connectorRenderLines
                                        .filter((seg) => seg.active)
                                        .map((seg, i) => (
                                            <KnowledgeConnectorSegment key={`focused-${i}`} seg={seg} />
                                        ))}
                                </svg>
                                {hoveredId != null && (
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
                                            zIndex: 5,
                                        }}
                                    >
                                        {connectorRenderLines
                                            .filter((seg) => seg.active)
                                            .map((seg, i) => (
                                                <KnowledgeConnectorSegment key={`active-${i}`} seg={seg} />
                                            ))}
                                    </svg>
                                )}
                            </>
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
