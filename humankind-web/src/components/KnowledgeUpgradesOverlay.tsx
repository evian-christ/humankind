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
    KNOWLEDGE_UPGRADES,
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    AGRICULTURE_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    CHIEFDOM_UPGRADE_ID,
    FISHERIES_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    HUNTING_UPGRADE_ID,
    LAW_CODE_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    MINING_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
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
};
type KnowledgeConnectorRenderLine = KnowledgeConnectorLine & { active: boolean; dimmed: boolean };

/** 칩 열 수 — 7열 */
const KNOWLEDGE_TREE_GRID_COLS = 7;

const TIERS: { level: number; ids: (number | null)[] }[] = [
    //           col0–6 (7열)
    { level: 1,  ids: [null, null, null, 25,   null, null, null] },
    /** col0 수렵(31)–col4 궁술(5)–col5 채광(30)–col6 외국 무역(33) */
    { level: 2,  ids: [HUNTING_UPGRADE_ID, 26,   9,    27,   5,    MINING_UPGRADE_ID, FOREIGN_TRADE_UPGRADE_ID] },
    /** col5: 법전(32); col6: 희생 제의(8) */
    { level: 3,  ids: [CHIEFDOM_UPGRADE_ID, null, null, null, null, LAW_CODE_UPGRADE_ID, 8] },
    /** col2: Lv2 어업(9)과 같은 열 — 항해술(28), 천문항법(29) */
    { level: 4,  ids: [null, null, SEAFARING_UPGRADE_ID, null, null, null, null] },
    /** col1: 목축업(26)과 같은 열 — 기마술(7) */
    /** col2: 항해술(28) 선행 — 천문항법(29) */
    /** col3: Lv2 농업(27)과 같은 열 — 관개(3); col4: Lv2 궁술(5)과 같은 열 — 청동(2) */
    /** col6: 문자(1) */
    { level: 5,  ids: [null, 7,    CELESTIAL_NAVIGATION_UPGRADE_ID, IRRIGATION_UPGRADE_ID, 2,    null, 1] },
    /** col5: 신학(4) */
    { level: 7,  ids: [null, 6,    null, null, null, 4,    null] },
    /** col2: 수학(10) */
    { level: 9,  ids: [null, null, 10,   null, null, null, null] },
    { level: 10, ids: [null, null, null, 15,   null, null, null] },
    { level: 11, ids: [null, null, null, null, THREE_FIELD_SYSTEM_UPGRADE_ID, null, null] },
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
const KNOWLEDGE_MAIN_ROW_GAP_PX = 24;

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
        ? `inset 0 0 0 4px ${inset}, 0 1px 0 0 ${pillar}, 0 1px 6px rgba(0,0,0,0.4)`
        : `inset 0 0 0 4px ${inset}, 0 8px 0 0 ${pillar}, 0 8px 12px rgba(0,0,0,0.4)`;
}

/** Idle chip fill — same before/after research (border differentiates researched) */
const KNOWLEDGE_TREE_CHIP_IDLE_BG = '#1b1b1c';

/** Selected chip: dark gray + pressed look (not hue shift) */
const KNOWLEDGE_TREE_CHIP_SELECTED_BG = '#3a3a3a';

/** 칩 6열 + 열 사이 간격 */
function knowledgeTreeGridWidthPx(): number {
    return (
        KNOWLEDGE_TREE_GRID_COLS * KNOWLEDGE_TREE_CHIP +
        (KNOWLEDGE_TREE_GRID_COLS - 1) * KNOWLEDGE_TREE_GAP
    );
}

/** Lv 라벨 열 + 간격 + 칩 그리드 — 트리 전체 한 격자 너비 */
function _knowledgeTreeFullGridWidthPx(): number {
    return KNOWLEDGE_TREE_LABEL_BAND_PX + KNOWLEDGE_TREE_GAP + knowledgeTreeGridWidthPx();
}

function findTierGridSlot(upgradeId: number): { rowIdx: number; colIdx: number } | null {
    for (let rowIdx = 0; rowIdx < TIERS.length; rowIdx += 1) {
        const colIdx = TIERS[rowIdx]!.ids.indexOf(upgradeId);
        if (colIdx >= 0) return { rowIdx, colIdx };
    }
    return null;
}

function KnowledgeConnectorSegment({ seg }: { seg: KnowledgeConnectorRenderLine }) {
    const connectorColor = seg.active
        ? KNOWLEDGE_CONNECTOR_ACTIVE_COLOR
        : seg.dimmed
            ? KNOWLEDGE_CONNECTOR_DIM_COLOR
            : KNOWLEDGE_CONNECTOR_COLOR;

    return (
        <g>
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
    const [researchPointsMouseHints, setResearchPointsMouseHints] = useState<ResearchPointsMouseHint[]>([]);
    const researchHintIdRef = useRef(0);
    const treeScrollRef = useRef<HTMLDivElement>(null);
    const treeContentRef = useRef<HTMLDivElement>(null);
    const [connectorLines, setConnectorLines] = useState<KnowledgeConnectorLine[]>([]);

    const selectedUpgrade = selectedId != null ? KNOWLEDGE_UPGRADES[selectedId] : null;
    const selectedUnlocked = selectedId != null && unlockedUpgrades.includes(selectedId);
    const selectedTierLevel = selectedId != null
        ? (TIERS.find(tier => tier.ids.includes(selectedId!))?.level ?? 1)
        : 1;
    const archeryBlocksBronze = selectedId === 2 && !unlockedUpgrades.includes(5);
    const irrigationBlocksAgriculture =
        selectedId === IRRIGATION_UPGRADE_ID && !unlockedUpgrades.includes(AGRICULTURE_UPGRADE_ID);
    const horsemanshipBlocksPastoralism =
        selectedId === HORSEMANSHIP_UPGRADE_ID && !unlockedUpgrades.includes(PASTORALISM_UPGRADE_ID);
    const seafaringBlocksFisheries =
        selectedId === SEAFARING_UPGRADE_ID && !unlockedUpgrades.includes(FISHERIES_UPGRADE_ID);
    const celestialBlocksSeafaring =
        selectedId === CELESTIAL_NAVIGATION_UPGRADE_ID && !unlockedUpgrades.includes(SEAFARING_UPGRADE_ID);
    const medievalBlocksAncient =
        selectedId === FEUDALISM_UPGRADE_ID && !unlockedUpgrades.includes(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID);
    const threeFieldBlocksIrrigation =
        selectedId === THREE_FIELD_SYSTEM_UPGRADE_ID && !unlockedUpgrades.includes(IRRIGATION_UPGRADE_ID);
    const hasResearchPoints = levelUpResearchPoints > 0;
    const canResearchWithCurrentPick =
        currentLevel >= selectedTierLevel &&
        selectedId != null &&
        isUpgradeLegalForKnowledgePick(selectedId, unlockedUpgrades, currentLevel);
    const canResearchSelected =
        hasResearchPoints &&
        !selectedUnlocked &&
        !archeryBlocksBronze &&
        !irrigationBlocksAgriculture &&
        !horsemanshipBlocksPastoralism &&
        !seafaringBlocksFisheries &&
        !celestialBlocksSeafaring &&
        !medievalBlocksAncient &&
        !threeFieldBlocksIrrigation &&
        canResearchWithCurrentPick;
    const needsHigherLevel = selectedId != null && currentLevel < selectedTierLevel;
    const researchButtonDisabled =
        selectedUnlocked ||
        archeryBlocksBronze ||
        irrigationBlocksAgriculture ||
        horsemanshipBlocksPastoralism ||
        seafaringBlocksFisheries ||
        celestialBlocksSeafaring ||
        medievalBlocksAncient ||
        threeFieldBlocksIrrigation ||
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

        const ancientPos = findTierGridSlot(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID);
        const medievalPos = findTierGridSlot(FEUDALISM_UPGRADE_ID);
        if (ancientPos && medievalPos) {
            next.push({
                from: ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
                to: FEUDALISM_UPGRADE_ID,
                x1: xForCol(ancientPos.colIdx),
                y1: bottomAnchorY(ancientPos.rowIdx, selectedId === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID),
                x2: xForCol(medievalPos.colIdx),
                y2: topAnchorY(medievalPos.rowIdx, selectedId === FEUDALISM_UPGRADE_ID),
            });
        }

        const archPos = findTierGridSlot(5);
        const bronzePos = findTierGridSlot(2);
        if (archPos && bronzePos) {
            next.push({
                from: 5,
                to: 2,
                x1: xForCol(archPos.colIdx),
                y1: bottomAnchorY(archPos.rowIdx, selectedId === 5),
                x2: xForCol(bronzePos.colIdx),
                y2: topAnchorY(bronzePos.rowIdx, selectedId === 2),
            });
        }

        const agPos = findTierGridSlot(AGRICULTURE_UPGRADE_ID);
        const irrPos = findTierGridSlot(IRRIGATION_UPGRADE_ID);
        if (agPos && irrPos) {
            next.push({
                from: AGRICULTURE_UPGRADE_ID,
                to: IRRIGATION_UPGRADE_ID,
                x1: xForCol(agPos.colIdx),
                y1: bottomAnchorY(agPos.rowIdx, selectedId === AGRICULTURE_UPGRADE_ID),
                x2: xForCol(irrPos.colIdx),
                y2: topAnchorY(irrPos.rowIdx, selectedId === IRRIGATION_UPGRADE_ID),
            });
        }

        const threeFieldPos = findTierGridSlot(THREE_FIELD_SYSTEM_UPGRADE_ID);
        if (irrPos && threeFieldPos) {
            next.push({
                from: IRRIGATION_UPGRADE_ID,
                to: THREE_FIELD_SYSTEM_UPGRADE_ID,
                x1: xForCol(irrPos.colIdx),
                y1: bottomAnchorY(irrPos.rowIdx, selectedId === IRRIGATION_UPGRADE_ID),
                x2: xForCol(threeFieldPos.colIdx),
                y2: topAnchorY(threeFieldPos.rowIdx, selectedId === THREE_FIELD_SYSTEM_UPGRADE_ID),
            });
        }

        const pastPos = findTierGridSlot(PASTORALISM_UPGRADE_ID);
        const horsePos = findTierGridSlot(HORSEMANSHIP_UPGRADE_ID);
        if (pastPos && horsePos) {
            next.push({
                from: PASTORALISM_UPGRADE_ID,
                to: HORSEMANSHIP_UPGRADE_ID,
                x1: xForCol(pastPos.colIdx),
                y1: bottomAnchorY(pastPos.rowIdx, selectedId === PASTORALISM_UPGRADE_ID),
                x2: xForCol(horsePos.colIdx),
                y2: topAnchorY(horsePos.rowIdx, selectedId === HORSEMANSHIP_UPGRADE_ID),
            });
        }

        const fisheriesPos = findTierGridSlot(FISHERIES_UPGRADE_ID);
        const seafaringPos = findTierGridSlot(SEAFARING_UPGRADE_ID);
        if (fisheriesPos && seafaringPos) {
            next.push({
                from: FISHERIES_UPGRADE_ID,
                to: SEAFARING_UPGRADE_ID,
                x1: xForCol(fisheriesPos.colIdx),
                y1: bottomAnchorY(fisheriesPos.rowIdx, selectedId === FISHERIES_UPGRADE_ID),
                x2: xForCol(seafaringPos.colIdx),
                y2: topAnchorY(seafaringPos.rowIdx, selectedId === SEAFARING_UPGRADE_ID),
            });
        }

        const celestialPos = findTierGridSlot(CELESTIAL_NAVIGATION_UPGRADE_ID);
        if (seafaringPos && celestialPos) {
            next.push({
                from: SEAFARING_UPGRADE_ID,
                to: CELESTIAL_NAVIGATION_UPGRADE_ID,
                x1: xForCol(seafaringPos.colIdx),
                y1: bottomAnchorY(seafaringPos.rowIdx, selectedId === SEAFARING_UPGRADE_ID),
                x2: xForCol(celestialPos.colIdx),
                y2: topAnchorY(celestialPos.rowIdx, selectedId === CELESTIAL_NAVIGATION_UPGRADE_ID),
            });
        }

        setConnectorLines(next);
    }, [selectedId, unlockedUpgrades]);

    useLayoutEffect(() => {
        if (!isOpen) return;
        const raf = requestAnimationFrame(() => updateKnowledgeTreeConnectors());
        const contentEl = treeContentRef.current;
        const scrollEl = treeScrollRef.current;
        if (!contentEl) return () => cancelAnimationFrame(raf);
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updateKnowledgeTreeConnectors()) : null;
        ro?.observe(contentEl);
        scrollEl?.addEventListener('scroll', updateKnowledgeTreeConnectors, { passive: true });
        window.addEventListener('resize', updateKnowledgeTreeConnectors);
        return () => {
            cancelAnimationFrame(raf);
            ro?.disconnect();
            scrollEl?.removeEventListener('scroll', updateKnowledgeTreeConnectors);
            window.removeEventListener('resize', updateKnowledgeTreeConnectors);
        };
    }, [isOpen, updateKnowledgeTreeConnectors, language, selectedId]);

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
                setResearchPointsMouseHints([]);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const detailEraColor =
        selectedUpgrade != null ? getSymbolColorHex(selectedUpgrade.type) : '#888888';
    const selectedRelatedUpgradeIds = new Set<number>();
    if (selectedId != null) {
        selectedRelatedUpgradeIds.add(selectedId);
        const frontier = [selectedId];
        for (let i = 0; i < frontier.length; i += 1) {
            const current = frontier[i]!;
            for (const line of connectorLines) {
                const nextId = line.from === current
                    ? line.to
                    : line.to === current
                        ? line.from
                        : null;
                if (nextId == null || selectedRelatedUpgradeIds.has(nextId)) continue;
                selectedRelatedUpgradeIds.add(nextId);
                frontier.push(nextId);
            }
        }
    }
    const connectorRenderLines: KnowledgeConnectorRenderLine[] = connectorLines.map((line) => ({
        ...line,
        active:
            selectedId != null &&
            selectedRelatedUpgradeIds.has(line.from) &&
            selectedRelatedUpgradeIds.has(line.to),
        dimmed:
            selectedId != null &&
            (!selectedRelatedUpgradeIds.has(line.from) || !selectedRelatedUpgradeIds.has(line.to)),
    }));

    const handleUnlock = (e: ReactMouseEvent<HTMLButtonElement>) => {
        if (
            !selectedId ||
            selectedUnlocked ||
            archeryBlocksBronze ||
            irrigationBlocksAgriculture ||
            horsemanshipBlocksPastoralism ||
            seafaringBlocksFisheries ||
            celestialBlocksSeafaring ||
            medievalBlocksAncient ||
            threeFieldBlocksIrrigation
        )
            return;
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
                ref={treeScrollRef}
                style={{
                    flex: 1,
                    minWidth: 0,
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
                                {/* 점선 — 화면 전체 너비 */}
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

                                {/* Lv 라벨 — 맨 왼쪽 고정 */}
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

                                {/* 칩 그리드 — 라벨 영역 이후 중앙 정렬 */}
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
                                            const name = t(`knowledgeUpgrade.${id}.name`, language) || upgrade.name;
                                            const isSelectionRelated =
                                                selectedId == null ||
                                                selectedRelatedUpgradeIds.has(id);
                                            const chipFilter = selectedId != null && !isSelectionRelated
                                                ? 'brightness(0.25)'
                                                : 'none';
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
                                                        padding: 0,
                                                        display: 'block',
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                        borderRadius: 0,
                                                        filter: chipFilter,
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
                                .filter((seg) => !seg.active)
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
                                        : irrigationBlocksAgriculture
                                            ? t('knowledgeUpgrade.requiresAgricultureShort', language)
                                        : horsemanshipBlocksPastoralism
                                            ? t('knowledgeUpgrade.requiresPastoralismShort', language)
                                        : seafaringBlocksFisheries
                                            ? t('knowledgeUpgrade.requiresFisheriesShort', language)
                                        : celestialBlocksSeafaring
                                            ? t('knowledgeUpgrade.requiresSeafaringShort', language)
                                        : medievalBlocksAncient
                                            ? t('knowledgeUpgrade.requiresAncientShort', language)
                                        : threeFieldBlocksIrrigation
                                            ? t('knowledgeUpgrade.requiresIrrigationShort', language)
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
