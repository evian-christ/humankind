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
    AGI_PROJECT_UPGRADE_ID,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    AGRICULTURAL_SURPLUS_UPGRADE_ID,
    BALLISTICS_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    CARAVANSERAI_UPGRADE_ID,
    CHIEFDOM_UPGRADE_ID,
    COMPASS_UPGRADE_ID,
    DESERT_STORAGE_UPGRADE_ID,
    DRY_STORAGE_UPGRADE_ID,
    FORESTRY_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    FISHERY_GUILD_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    GUNPOWDER_UPGRADE_ID,
    HUNTING_UPGRADE_ID,
    INTERCHANGEABLE_PARTS_UPGRADE_ID,
    IRON_WORKING_UPGRADE_ID,
    LAW_CODE_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    JUNGLE_EXPEDITION_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    MECHANICS_UPGRADE_ID,
    NOMADIC_TRADITION_UPGRADE_ID,
    OASIS_RECOVERY_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    SHIPBUILDING_UPGRADE_ID,
    TANNING_UPGRADE_ID,
    TRACKING_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    MINING_UPGRADE_ID,
    MODERN_AGRICULTURE_UPGRADE_ID,
    MARITIME_TRADE_UPGRADE_ID,
    MODERN_AGE_UPGRADE_ID,
    OCEANIC_ROUTES_UPGRADE_ID,
    PASTURE_MANAGEMENT_UPGRADE_ID,
    PLANTATION_UPGRADE_ID,
    PRESERVATION_UPGRADE_ID,
    TROPICAL_DEVELOPMENT_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
    getKnowledgeUpgradeDirectDependents,
    getKnowledgeUpgradeDirectPrerequisites,
} from '../game/data/knowledgeUpgrades';
import { getSymbolColorHex, SymbolType } from '../game/data/symbolDefinitions';
import { t } from '../i18n';
import { EffectText } from './EffectText';
import { UpgradeCardDescSymbols } from './KnowledgeUpgradeCardWidgets';
import { resolveUpgradeSprite } from './knowledgeUpgradeSprites';

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
const TIERS: { level: number; ids: (number | null)[] }[] = [
    { level: 1, ids: [null, null, null, null, null, null, ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID, null, null, null, null, null, null] },
    { level: 2, ids: [null, HUNTING_UPGRADE_ID, null, PASTORALISM_UPGRADE_ID, null, FISHERIES_UPGRADE_ID, null, 27, null, MINING_UPGRADE_ID, null, FOREIGN_TRADE_UPGRADE_ID, null] },
    { level: 3, ids: [null, CHIEFDOM_UPGRADE_ID, null, null, 5, null, LAW_CODE_UPGRADE_ID, null, 6, null, null, 8, null] },
    { level: 4, ids: [null, null, HORSEMANSHIP_UPGRADE_ID, null, null, SEAFARING_UPGRADE_ID, null, CELESTIAL_NAVIGATION_UPGRADE_ID, null, null, null, null, null] },
    { level: 5, ids: [null, null, null, null, null, null, IRRIGATION_UPGRADE_ID, null, 1, null, null, null, null] },
    { level: 6, ids: [null, null, null, null, null, null, null, null, null, null, DRY_STORAGE_UPGRADE_ID, null, null] },
    { level: 7, ids: [null, null, TRACKING_UPGRADE_ID, null, null, null, null, null, null, 4, null, null, null] },
    { level: 8, ids: [null, null, null, null, IRON_WORKING_UPGRADE_ID, null, null, null, null, null, null, null, null] },
    { level: 9, ids: [null, null, null, NOMADIC_TRADITION_UPGRADE_ID, null, null, COMPASS_UPGRADE_ID, null, 10, null, null, null, null] },
    { level: 10, ids: [null, null, null, null, null, null, FEUDALISM_UPGRADE_ID, null, null, null, null, null, null] },
    { level: 11, ids: [null, null, null, null, FISHERY_GUILD_UPGRADE_ID, null, null, THREE_FIELD_SYSTEM_UPGRADE_ID, null, PLANTATION_UPGRADE_ID, null, null, null] },
    { level: 12, ids: [null, null, TANNING_UPGRADE_ID, null, null, null, null, null, null, null, DESERT_STORAGE_UPGRADE_ID, null, null] },
    { level: 13, ids: [null, null, null, null, null, MARITIME_TRADE_UPGRADE_ID, null, null, MECHANICS_UPGRADE_ID, null, null, null, null] },
    { level: 14, ids: [null, null, null, null, null, null, null, null, null, null, null, null, null] },
    { level: 15, ids: [null, null, null, null, null, null, SHIPBUILDING_UPGRADE_ID, null, 16, null, null, null, null] },
    { level: 16, ids: [null, null, null, null, null, null, null, null, null, JUNGLE_EXPEDITION_UPGRADE_ID, null, null, null] },
    { level: 17, ids: [null, null, null, null, null, null, AGRICULTURAL_SURPLUS_UPGRADE_ID, null, null, null, CARAVANSERAI_UPGRADE_ID, null, null] },
    { level: 18, ids: [null, null, FORESTRY_UPGRADE_ID, null, PASTURE_MANAGEMENT_UPGRADE_ID, null, 24, null, GUNPOWDER_UPGRADE_ID, null, null, null, null] },
    { level: 19, ids: [null, null, null, null, null, null, null, null, null, null, null, null, null] },
    { level: 20, ids: [null, null, null, null, null, null, MODERN_AGE_UPGRADE_ID, null, null, null, null, null, null] },
    { level: 21, ids: [null, null, null, null, null, OCEANIC_ROUTES_UPGRADE_ID, null, null, null, null, null, null, null] },
    { level: 22, ids: [null, null, null, null, null, null, null, null, null, null, OASIS_RECOVERY_UPGRADE_ID, null, null] },
    { level: 23, ids: [null, null, null, null, null, null, MODERN_AGRICULTURE_UPGRADE_ID, null, BALLISTICS_UPGRADE_ID, null, null, null, null] },
    { level: 24, ids: [null, null, PRESERVATION_UPGRADE_ID, null, null, null, null, null, null, null, null, null, null] },
    { level: 25, ids: [null, null, null, null, null, null, null, null, null, TROPICAL_DEVELOPMENT_UPGRADE_ID, null, null, null] },
    { level: 26, ids: [null, null, null, null, null, null, null, null, null, null, null, null, null] },
    { level: 27, ids: [null, null, null, null, null, null, null, null, null, null, null, null, null] },
    { level: 28, ids: [null, null, null, null, null, null, null, null, INTERCHANGEABLE_PARTS_UPGRADE_ID, null, null, null, null] },
    { level: 29, ids: [null, null, null, null, null, null, null, null, null, null, null, null, null] },
    { level: 30, ids: [null, null, null, null, null, null, AGI_PROJECT_UPGRADE_ID, null, null, null, null, null, null] },
];

const KNOWLEDGE_TREE_CHIP = 110;
const KNOWLEDGE_TREE_GAP = 16;
const TIER_ROW_PAD_X = 48;
const TIER_LABEL_W = 72;
/** Lv 라벨이 들어가는 첫 열 너비(단일 그리드의 1열). */
const KNOWLEDGE_TREE_LABEL_BAND_PX = TIER_ROW_PAD_X + TIER_LABEL_W + 14;
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

function knowledgeTreeChipFrameShadow(pressed: boolean, researched: boolean): string {
    const inset = researched ? KNOWLEDGE_TREE_CHIP_FRAME_INSET_RESEARCHED : KNOWLEDGE_TREE_CHIP_FRAME_INSET_DEFAULT;
    const pillar = researched ? KNOWLEDGE_TREE_CHIP_PILLAR_RESEARCHED : KNOWLEDGE_TREE_CHIP_PILLAR_DEFAULT;
    return pressed
        ? `inset 0 0 0 4px ${inset}, 0 ${KNOWLEDGE_TREE_CHIP_PILLAR_PRESSED_OFFSET}px 0 0 ${pillar}, 0 ${KNOWLEDGE_TREE_CHIP_PILLAR_PRESSED_OFFSET}px 6px rgba(0,0,0,0.4)`
        : `inset 0 0 0 4px ${inset}, 0 ${KNOWLEDGE_TREE_CHIP_PILLAR_IDLE_OFFSET}px 0 0 ${pillar}, 0 ${KNOWLEDGE_TREE_CHIP_PILLAR_IDLE_OFFSET}px 12px rgba(0,0,0,0.4)`;
}

/** Idle chip fill — same before/after research (border differentiates researched) */
const KNOWLEDGE_TREE_CHIP_IDLE_BG = '#1b1b1c';

/** Selected chip: dark gray + pressed look (not hue shift) */
const KNOWLEDGE_TREE_CHIP_SELECTED_BG = '#3a3a3a';
const KNOWLEDGE_TREE_CHIP_HOVER_BG = '#24262b';
const KNOWLEDGE_CONNECTOR_IDLE_OPACITY = 0.16;
const KNOWLEDGE_CONNECTOR_DIMMED_OPACITY = 0.08;
const KNOWLEDGE_CONNECTOR_ACTIVE_OPACITY = 0.95;

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

const KnowledgeUpgradesOverlay = ({ isOpen, onClose }: Props) => {
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
    const [connectorLines, setConnectorLines] = useState<KnowledgeConnectorLine[]>([]);
    const [tooltipPosition, setTooltipPosition] = useState<KnowledgeUpgradeTooltipPosition | null>(null);

    const selectedUpgrade = selectedId != null ? KNOWLEDGE_UPGRADES[selectedId] : null;
    const selectedUnlocked = selectedId != null && unlockedUpgrades.includes(selectedId);
    const selectedTierLevel = getTierLevelForUpgrade(selectedId);
    const activeFocusId = hoveredId ?? selectedId;
    const activeDirectPrereqs = activeFocusId != null ? [...getKnowledgeUpgradeDirectPrerequisites(activeFocusId)] : [];
    const activeDirectDependents = activeFocusId != null ? [...getKnowledgeUpgradeDirectDependents(activeFocusId)] : [];
    const activeEmphasisIds = new Set<number>(
        activeFocusId != null ? [activeFocusId, ...activeDirectPrereqs, ...activeDirectDependents] : [],
    );
    const selectedDirectPrereqs = selectedId != null ? [...getKnowledgeUpgradeDirectPrerequisites(selectedId)] : [];
    const selectedDirectDependents = selectedId != null ? [...getKnowledgeUpgradeDirectDependents(selectedId)] : [];
    const unmetSelectedPrereqs = selectedDirectPrereqs.filter((prereqId) => !unlockedUpgrades.includes(prereqId));
    const unmetSelectedPrereqNames = unmetSelectedPrereqs.map((prereqId) =>
        t(`knowledgeUpgrade.${prereqId}.name`, language) || KNOWLEDGE_UPGRADES[prereqId]?.name || `#${prereqId}`,
    );
    const hasResearchPoints = levelUpResearchPoints > 0;
    const canResearchWithCurrentPick =
        currentLevel >= selectedTierLevel &&
        selectedId != null &&
        isUpgradeLegalForKnowledgePick(selectedId, unlockedUpgrades, currentLevel);
    const canResearchSelected = hasResearchPoints && !selectedUnlocked && unmetSelectedPrereqs.length === 0 && canResearchWithCurrentPick;
    const needsHigherLevel = selectedId != null && currentLevel < selectedTierLevel;
    const researchButtonDisabled =
        selectedId == null ||
        selectedUnlocked ||
        unmetSelectedPrereqs.length > 0 ||
        needsHigherLevel ||
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
        const rowTop = (rowIdx: number) => rowIdx * (TIER_ROW_MIN_H + TIER_STACK_GAP);
        const bottomAnchorY = (rowIdx: number, pressed: boolean) =>
            rowTop(rowIdx) +
            (TIER_ROW_MIN_H + KNOWLEDGE_TREE_CHIP) / 2 +
            (pressed ? KNOWLEDGE_TREE_CHIP_PRESSED_TRANSLATE_Y : 0);
        const topAnchorY = (rowIdx: number, pressed: boolean) =>
            rowTop(rowIdx) +
            (TIER_ROW_MIN_H - KNOWLEDGE_TREE_CHIP) / 2 +
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

    const updateSelectedTooltipPosition = useCallback(() => {
        if (selectedId == null) {
            setTooltipPosition(null);
            return;
        }

        const overlayEl = overlayRef.current;
        if (!overlayEl) return;

        const anchorEl = overlayEl.querySelector<HTMLElement>(
            `[data-knowledge-upgrade-id="${selectedId}"]`,
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
    }, [selectedId]);

    useLayoutEffect(() => {
        if (!isOpen) return;
        const raf = requestAnimationFrame(() => {
            updateKnowledgeTreeConnectors();
            updateSelectedTooltipPosition();
        });
        const contentEl = treeContentRef.current;
        const tooltipEl = tooltipRef.current;
        const scrollEl = treeScrollRef.current;
        if (!contentEl) return () => cancelAnimationFrame(raf);
        const ro = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => {
                updateKnowledgeTreeConnectors();
                updateSelectedTooltipPosition();
            })
            : null;
        ro?.observe(contentEl);
        if (tooltipEl) ro?.observe(tooltipEl);
        scrollEl?.addEventListener('scroll', updateKnowledgeTreeConnectors, { passive: true });
        scrollEl?.addEventListener('scroll', updateSelectedTooltipPosition, { passive: true });
        window.addEventListener('resize', updateKnowledgeTreeConnectors);
        window.addEventListener('resize', updateSelectedTooltipPosition);
        return () => {
            cancelAnimationFrame(raf);
            ro?.disconnect();
            scrollEl?.removeEventListener('scroll', updateKnowledgeTreeConnectors);
            scrollEl?.removeEventListener('scroll', updateSelectedTooltipPosition);
            window.removeEventListener('resize', updateKnowledgeTreeConnectors);
            window.removeEventListener('resize', updateSelectedTooltipPosition);
        };
    }, [isOpen, updateKnowledgeTreeConnectors, updateSelectedTooltipPosition, language, selectedId]);

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
        selectedUpgrade != null ? getSymbolColorHex(selectedUpgrade.type) : '#888888';
    const activeConnectionIds = new Set<number>(
        activeFocusId != null ? [activeFocusId, ...activeDirectPrereqs, ...activeDirectDependents] : [],
    );
    const connectorRenderLines: KnowledgeConnectorRenderLine[] = connectorLines.map((line) => ({
        ...line,
        active:
            activeFocusId != null &&
            (line.from === activeFocusId || line.to === activeFocusId),
        dimmed:
            activeFocusId != null &&
            line.from !== activeFocusId &&
            line.to !== activeFocusId,
    }));

    const handleUnlock = (e: ReactMouseEvent<HTMLButtonElement>) => {
        if (!selectedId || selectedUnlocked || unmetSelectedPrereqs.length > 0 || needsHigherLevel) return;
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
            ref={overlayRef}
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
                    minHeight: 0,
                    padding: '10px 32px 28px',
                    boxSizing: 'border-box',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    ref={treeScrollRef}
                    style={{
                        flex: 1,
                        width: '100%',
                        minHeight: 0,
                        overflowY: 'auto',
                        paddingBottom: 8,
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
                                            background: '#070a0f',
                                            paddingRight: '14px',
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
                                                const isSelected = selectedId === id;
                                                const isHovered = hoveredId === id;
                                                const name = t(`knowledgeUpgrade.${id}.name`, language) || upgrade.name;
                                                const directPrereqs = [...getKnowledgeUpgradeDirectPrerequisites(id)];
                                                const unmetPrereqs = directPrereqs.filter((prereqId) => !unlockedUpgrades.includes(prereqId));
                                                const prerequisiteNames = directPrereqs.map((prereqId) =>
                                                    t(`knowledgeUpgrade.${prereqId}.name`, language) || KNOWLEDGE_UPGRADES[prereqId]?.name || `#${prereqId}`,
                                                );
                                                const needsBadgeText = directPrereqs.length > 0
                                                    ? `Needs ${prerequisiteNames.join(' / ')}`
                                                    : null;
                                                const isSelectionRelated =
                                                    activeFocusId == null ||
                                                    activeConnectionIds.has(id);
                                                const chipFilter = activeFocusId != null && !isSelectionRelated
                                                    ? 'brightness(0.28) saturate(0.8)'
                                                    : 'none';
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        className="knowledge-upgrade-chip"
                                                        title={name}
                                                        data-knowledge-upgrade-id={id}
                                                        onClick={() => setSelectedId(isSelected ? null : id)}
                                                        onMouseEnter={() => setHoveredId(id)}
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
                                                        {needsBadgeText && (isSelected || isHovered || directPrereqs.length > 1) && (
                                                            <div
                                                                style={{
                                                                    position: 'absolute',
                                                                    left: 6,
                                                                    right: 6,
                                                                    top: 6,
                                                                    padding: '3px 5px',
                                                                    background: unmetPrereqs.length > 0
                                                                        ? 'rgba(127,29,29,0.92)'
                                                                        : 'rgba(30,41,59,0.92)',
                                                                    color: unmetPrereqs.length > 0 ? '#fecaca' : '#cbd5e1',
                                                                    fontFamily: 'Mulmaru, sans-serif',
                                                                    fontSize: '11px',
                                                                    lineHeight: 1.1,
                                                                    textAlign: 'center',
                                                                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                                                                    pointerEvents: 'none',
                                                                }}
                                                            >
                                                                {needsBadgeText}
                                                            </div>
                                                        )}
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

                {selectedUpgrade && tooltipPosition && (
                    <div
                        ref={tooltipRef}
                        className={`knowledge-upgrade-tooltip knowledge-upgrade-tooltip--${tooltipPosition.placement}`}
                        style={{
                            left: tooltipPosition.left,
                            top: tooltipPosition.top,
                        }}
                    >
                        <div className="knowledge-upgrade-tooltip-scroll">
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
                            {(selectedDirectPrereqs.length > 0 || selectedDirectDependents.length > 0) && (
                                <div
                                    style={{
                                        marginTop: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                    }}
                                >
                                    {selectedDirectPrereqs.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {selectedDirectPrereqs.map((prereqId) => {
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
                                                        {unlocked ? '선행 완료' : '선행 필요'}: {prereqName}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {selectedDirectDependents.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {selectedDirectDependents.map((dependentId) => (
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
                                                    후속: {t(`knowledgeUpgrade.${dependentId}.name`, language) || KNOWLEDGE_UPGRADES[dependentId]?.name || `#${dependentId}`}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
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

                        <div className="knowledge-upgrade-tooltip-actions" style={{ display: 'flex', justifyContent: 'center' }}>
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
                                    : unmetSelectedPrereqNames.length > 0
                                        ? `선행: ${unmetSelectedPrereqNames.join(' / ')}`
                                        : needsHigherLevel
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
