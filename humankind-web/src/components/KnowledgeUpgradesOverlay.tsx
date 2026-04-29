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
    OCEANIC_ROUTES_UPGRADE_ID,
    PASTURE_MANAGEMENT_UPGRADE_ID,
    PLANTATION_UPGRADE_ID,
    PRESERVATION_UPGRADE_ID,
    TROPICAL_DEVELOPMENT_UPGRADE_ID,
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
type KnowledgeUpgradeTooltipPosition = {
    left: number;
    top: number;
    placement: 'left' | 'right';
};

/** 칩 열 수 — 개발용 확장 13열 */
const KNOWLEDGE_TREE_GRID_COLS = 13;
/**
 * 개발용 열 오버라이드.
 * 사용자가 보는 열 번호(1~13)를 0-based 인덱스로 옮겨 적는다.
 */
const KNOWLEDGE_TREE_COL_OVERRIDES: Partial<Record<number, number>> = {
    [HORSEMANSHIP_UPGRADE_ID]: 1, // 2열
    [CELESTIAL_NAVIGATION_UPGRADE_ID]: 3, // 4열
    [SEAFARING_UPGRADE_ID]: 4, // 5열
    [AGRICULTURE_UPGRADE_ID]: 7, // 8열
    [IRRIGATION_UPGRADE_ID]: 7, // 8열
    [THREE_FIELD_SYSTEM_UPGRADE_ID]: 7, // 8열
    [AGRICULTURAL_SURPLUS_UPGRADE_ID]: 7, // 8열
    [MODERN_AGRICULTURE_UPGRADE_ID]: 7, // 8열
    [COMPASS_UPGRADE_ID]: 5, // 6열
    [SHIPBUILDING_UPGRADE_ID]: 5, // 6열
    [MARITIME_TRADE_UPGRADE_ID]: 3, // 4열
    [CHIEFDOM_UPGRADE_ID]: 1, // 2열
    [10]: 1, // 2열, 수학
    [LAW_CODE_UPGRADE_ID]: 9, // 10열
    [1]: 9, // 10열, 문자
    [8]: 11, // 12열, 희생 제의
    [4]: 11, // 12열, 신학
};

const TIERS: { level: number; ids: (number | null)[] }[] = [
    //           col0–6 (7열)
    { level: 1,  ids: [null, null, null, 25,   null, null, null] },
    /** col0 수렵(31)–col5 채광(30)–col6 외국 무역(33) */
    { level: 2,  ids: [HUNTING_UPGRADE_ID, 26,   9,    27,   null, MINING_UPGRADE_ID, FOREIGN_TRADE_UPGRADE_ID] },
    /** col4: 궁술(5); col5: 법전(32); col6: 희생 제의(8) */
    { level: 3,  ids: [CHIEFDOM_UPGRADE_ID, null, null, null, 5,    LAW_CODE_UPGRADE_ID, 8] },
    /** col0: 족장제(34) 아래 — 기마술(7); col1: 기마술 오른쪽 — 천문항법(29); col2: Lv2 어업(9)과 같은 열 — 항해술(28) */
    { level: 4,  ids: [HORSEMANSHIP_UPGRADE_ID, CELESTIAL_NAVIGATION_UPGRADE_ID, SEAFARING_UPGRADE_ID, null, null, null, null] },
    /** col3: Lv2 농업(27)과 같은 열 — 관개(3) */
    /** col6: 문자(1) */
    { level: 5,  ids: [null, null, null, IRRIGATION_UPGRADE_ID, null, null, 1] },
    { level: 6,  ids: [null, null, null, null, null, null, DRY_STORAGE_UPGRADE_ID] },
    /** col5: 신학(4) */
    { level: 7,  ids: [TRACKING_UPGRADE_ID, 6,    null, null, null, 4,    null] },
    /** col4: 철제 기술(2) */
    { level: 8,  ids: [null, null, null, null, IRON_WORKING_UPGRADE_ID, null, null] },
    /** col1: 목축업(26) 아래 — 유목 전통(39); col3: 중세시대(15) 바로 위 — 나침반(40); col5: 신학(4) 아래 — 수학(10) */
    { level: 9,  ids: [null, NOMADIC_TRADITION_UPGRADE_ID, null, COMPASS_UPGRADE_ID, null, 10, null] },
    { level: 10, ids: [null, null, null, 15,   null, null, null] },
    { level: 11, ids: [null, null, FISHERY_GUILD_UPGRADE_ID, THREE_FIELD_SYSTEM_UPGRADE_ID, null, PLANTATION_UPGRADE_ID, null] },
    { level: 12, ids: [TANNING_UPGRADE_ID, null, null, null, null, null, DESERT_STORAGE_UPGRADE_ID] },
    { level: 13, ids: [null, MARITIME_TRADE_UPGRADE_ID, null, null, MECHANICS_UPGRADE_ID, null, null] },
    { level: 14, ids: [null, null, null, null, null, null, null] },
    { level: 15, ids: [null, null, null, SHIPBUILDING_UPGRADE_ID, null, null, null] },
    { level: 16, ids: [null, null, null, null, null, JUNGLE_EXPEDITION_UPGRADE_ID, null] },
    { level: 17, ids: [null, null, null, AGRICULTURAL_SURPLUS_UPGRADE_ID, null, null, CARAVANSERAI_UPGRADE_ID] },
    { level: 18, ids: [FORESTRY_UPGRADE_ID, PASTURE_MANAGEMENT_UPGRADE_ID, null, null, GUNPOWDER_UPGRADE_ID, null, null] },
    { level: 19, ids: [null, null, null, null, null, null, null] },
    { level: 20, ids: [null, null, null, null, null, null, null] },
    { level: 21, ids: [null, null, OCEANIC_ROUTES_UPGRADE_ID, null, null, null, null] },
    { level: 22, ids: [null, null, null, null, null, null, OASIS_RECOVERY_UPGRADE_ID] },
    { level: 23, ids: [null, null, null, MODERN_AGRICULTURE_UPGRADE_ID, BALLISTICS_UPGRADE_ID, null, null] },
    { level: 24, ids: [PRESERVATION_UPGRADE_ID, null, null, null, null, null, null] },
    { level: 25, ids: [null, null, null, null, null, TROPICAL_DEVELOPMENT_UPGRADE_ID, null] },
    { level: 26, ids: [null, null, null, null, null, null, null] },
    { level: 27, ids: [null, null, null, null, null, null, null] },
    { level: 28, ids: [null, null, null, null, INTERCHANGEABLE_PARTS_UPGRADE_ID, null, null] },
    { level: 29, ids: [null, null, null, null, null, null, null] },
    { level: 30, ids: [null, null, null, null, null, null, null] },
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

function normalizeTierIdsToGrid(ids: (number | null)[]): (number | null)[] {
    if (ids.length === KNOWLEDGE_TREE_GRID_COLS) return ids;
    const normalized = Array.from({ length: KNOWLEDGE_TREE_GRID_COLS }, () => null as number | null);
    ids.forEach((id, legacyIdx) => {
        if (id == null) return;
        const defaultColIdx = legacyIdx * 2;
        normalized[defaultColIdx] = id;
    });
    ids.forEach((id) => {
        if (id == null) return;
        const overrideColIdx = KNOWLEDGE_TREE_COL_OVERRIDES[id];
        if (overrideColIdx == null) return;
        const currentColIdx = normalized.indexOf(id);
        if (currentColIdx >= 0) normalized[currentColIdx] = null;
        normalized[overrideColIdx] = id;
    });
    return normalized;
}

function findTierGridSlot(upgradeId: number): { rowIdx: number; colIdx: number } | null {
    for (let rowIdx = 0; rowIdx < TIERS.length; rowIdx += 1) {
        const colIdx = normalizeTierIdsToGrid(TIERS[rowIdx]!.ids).indexOf(upgradeId);
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
    const overlayRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const treeScrollRef = useRef<HTMLDivElement>(null);
    const treeContentRef = useRef<HTMLDivElement>(null);
    const [connectorLines, setConnectorLines] = useState<KnowledgeConnectorLine[]>([]);
    const [tooltipPosition, setTooltipPosition] = useState<KnowledgeUpgradeTooltipPosition | null>(null);

    const selectedUpgrade = selectedId != null ? KNOWLEDGE_UPGRADES[selectedId] : null;
    const selectedUnlocked = selectedId != null && unlockedUpgrades.includes(selectedId);
    const selectedTierLevel = selectedId != null
        ? (TIERS.find(tier => tier.ids.includes(selectedId!))?.level ?? 1)
        : 1;
    const archeryBlocksIronWorking = selectedId === IRON_WORKING_UPGRADE_ID && !unlockedUpgrades.includes(5);
    const mechanicsBlocksIronWorking =
        selectedId === MECHANICS_UPGRADE_ID && !unlockedUpgrades.includes(IRON_WORKING_UPGRADE_ID);
    const gunpowderBlocksMechanics =
        selectedId === GUNPOWDER_UPGRADE_ID && !unlockedUpgrades.includes(MECHANICS_UPGRADE_ID);
    const ballisticsBlocksGunpowder =
        selectedId === BALLISTICS_UPGRADE_ID && !unlockedUpgrades.includes(GUNPOWDER_UPGRADE_ID);
    const interchangeablePartsBlocksBallistics =
        selectedId === INTERCHANGEABLE_PARTS_UPGRADE_ID && !unlockedUpgrades.includes(BALLISTICS_UPGRADE_ID);
    const irrigationBlocksAgriculture =
        selectedId === IRRIGATION_UPGRADE_ID && !unlockedUpgrades.includes(AGRICULTURE_UPGRADE_ID);
    const horsemanshipBlocksPastoralism =
        selectedId === HORSEMANSHIP_UPGRADE_ID && !unlockedUpgrades.includes(PASTORALISM_UPGRADE_ID);
    const pastureManagementBlocksPastoralism =
        selectedId === PASTURE_MANAGEMENT_UPGRADE_ID && !unlockedUpgrades.includes(NOMADIC_TRADITION_UPGRADE_ID);
    const nomadicTraditionBlocksPastoralism =
        selectedId === NOMADIC_TRADITION_UPGRADE_ID && !unlockedUpgrades.includes(PASTORALISM_UPGRADE_ID);
    const seafaringBlocksFisheries =
        selectedId === SEAFARING_UPGRADE_ID && !unlockedUpgrades.includes(FISHERIES_UPGRADE_ID);
    const compassBlocksFisheries =
        selectedId === COMPASS_UPGRADE_ID && !unlockedUpgrades.includes(FISHERIES_UPGRADE_ID);
    const celestialBlocksFisheries =
        selectedId === CELESTIAL_NAVIGATION_UPGRADE_ID && !unlockedUpgrades.includes(FISHERIES_UPGRADE_ID);
    const shipbuildingBlocksFisheries =
        selectedId === SHIPBUILDING_UPGRADE_ID && !unlockedUpgrades.includes(FISHERIES_UPGRADE_ID);
    const dryStorageBlocksForeignTrade =
        selectedId === DRY_STORAGE_UPGRADE_ID && !unlockedUpgrades.includes(FOREIGN_TRADE_UPGRADE_ID);
    const desertStorageBlocksTradeGoods =
        selectedId === DESERT_STORAGE_UPGRADE_ID && !unlockedUpgrades.includes(DRY_STORAGE_UPGRADE_ID);
    const caravanseraiBlocksDryStorage =
        selectedId === CARAVANSERAI_UPGRADE_ID && !unlockedUpgrades.includes(DESERT_STORAGE_UPGRADE_ID);
    const oasisRecoveryBlocksCaravanserai =
        selectedId === OASIS_RECOVERY_UPGRADE_ID && !unlockedUpgrades.includes(CARAVANSERAI_UPGRADE_ID);
    const fisheryGuildBlocksSeafaring =
        selectedId === FISHERY_GUILD_UPGRADE_ID && !unlockedUpgrades.includes(SEAFARING_UPGRADE_ID);
    const maritimeTradeBlocksCelestial =
        selectedId === MARITIME_TRADE_UPGRADE_ID && !unlockedUpgrades.includes(CELESTIAL_NAVIGATION_UPGRADE_ID);
    const trackingBlocksHunting =
        selectedId === TRACKING_UPGRADE_ID && !unlockedUpgrades.includes(HUNTING_UPGRADE_ID);
    const tanningBlocksTracking =
        selectedId === TANNING_UPGRADE_ID && !unlockedUpgrades.includes(TRACKING_UPGRADE_ID);
    const forestryBlocksTanning =
        selectedId === FORESTRY_UPGRADE_ID && !unlockedUpgrades.includes(TANNING_UPGRADE_ID);
    const preservationBlocksForestry =
        selectedId === PRESERVATION_UPGRADE_ID && !unlockedUpgrades.includes(FORESTRY_UPGRADE_ID);
    const plantationBlocksMining =
        selectedId === PLANTATION_UPGRADE_ID && !unlockedUpgrades.includes(MINING_UPGRADE_ID);
    const jungleExpeditionBlocksPlantation =
        selectedId === JUNGLE_EXPEDITION_UPGRADE_ID && !unlockedUpgrades.includes(PLANTATION_UPGRADE_ID);
    const tropicalDevelopmentBlocksJungleExpedition =
        selectedId === TROPICAL_DEVELOPMENT_UPGRADE_ID && !unlockedUpgrades.includes(JUNGLE_EXPEDITION_UPGRADE_ID);
    const oceanicRoutesBlocksMaritimeTrade =
        selectedId === OCEANIC_ROUTES_UPGRADE_ID && !unlockedUpgrades.includes(MARITIME_TRADE_UPGRADE_ID);
    const oceanicRoutesBlocksFisheryGuild =
        selectedId === OCEANIC_ROUTES_UPGRADE_ID && !unlockedUpgrades.includes(FISHERY_GUILD_UPGRADE_ID);
    const medievalBlocksAncient =
        selectedId === FEUDALISM_UPGRADE_ID && !unlockedUpgrades.includes(ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID);
    const threeFieldBlocksIrrigation =
        selectedId === THREE_FIELD_SYSTEM_UPGRADE_ID && !unlockedUpgrades.includes(IRRIGATION_UPGRADE_ID);
    const agriculturalSurplusBlocksThreeField =
        selectedId === AGRICULTURAL_SURPLUS_UPGRADE_ID && !unlockedUpgrades.includes(THREE_FIELD_SYSTEM_UPGRADE_ID);
    const modernAgricultureBlocksSurplus =
        selectedId === MODERN_AGRICULTURE_UPGRADE_ID && !unlockedUpgrades.includes(AGRICULTURAL_SURPLUS_UPGRADE_ID);
    const hasResearchPoints = levelUpResearchPoints > 0;
    const canResearchWithCurrentPick =
        currentLevel >= selectedTierLevel &&
        selectedId != null &&
        isUpgradeLegalForKnowledgePick(selectedId, unlockedUpgrades, currentLevel);
    const canResearchSelected =
        hasResearchPoints &&
        !selectedUnlocked &&
        !archeryBlocksIronWorking &&
        !mechanicsBlocksIronWorking &&
        !gunpowderBlocksMechanics &&
        !ballisticsBlocksGunpowder &&
        !interchangeablePartsBlocksBallistics &&
        !irrigationBlocksAgriculture &&
        !horsemanshipBlocksPastoralism &&
        !pastureManagementBlocksPastoralism &&
        !nomadicTraditionBlocksPastoralism &&
        !seafaringBlocksFisheries &&
        !compassBlocksFisheries &&
        !celestialBlocksFisheries &&
        !shipbuildingBlocksFisheries &&
        !dryStorageBlocksForeignTrade &&
        !desertStorageBlocksTradeGoods &&
        !caravanseraiBlocksDryStorage &&
        !oasisRecoveryBlocksCaravanserai &&
        !fisheryGuildBlocksSeafaring &&
        !maritimeTradeBlocksCelestial &&
        !trackingBlocksHunting &&
        !tanningBlocksTracking &&
        !forestryBlocksTanning &&
        !preservationBlocksForestry &&
        !plantationBlocksMining &&
        !jungleExpeditionBlocksPlantation &&
        !tropicalDevelopmentBlocksJungleExpedition &&
        !oceanicRoutesBlocksMaritimeTrade &&
        !oceanicRoutesBlocksFisheryGuild &&
        !medievalBlocksAncient &&
        !threeFieldBlocksIrrigation &&
        !agriculturalSurplusBlocksThreeField &&
        !modernAgricultureBlocksSurplus &&
        canResearchWithCurrentPick;
    const needsHigherLevel = selectedId != null && currentLevel < selectedTierLevel;
    const researchButtonDisabled =
        selectedUnlocked ||
        archeryBlocksIronWorking ||
        mechanicsBlocksIronWorking ||
        gunpowderBlocksMechanics ||
        ballisticsBlocksGunpowder ||
        interchangeablePartsBlocksBallistics ||
        irrigationBlocksAgriculture ||
        horsemanshipBlocksPastoralism ||
        pastureManagementBlocksPastoralism ||
        nomadicTraditionBlocksPastoralism ||
        seafaringBlocksFisheries ||
        compassBlocksFisheries ||
        celestialBlocksFisheries ||
        shipbuildingBlocksFisheries ||
        dryStorageBlocksForeignTrade ||
        desertStorageBlocksTradeGoods ||
        caravanseraiBlocksDryStorage ||
        oasisRecoveryBlocksCaravanserai ||
        fisheryGuildBlocksSeafaring ||
        maritimeTradeBlocksCelestial ||
        trackingBlocksHunting ||
        tanningBlocksTracking ||
        forestryBlocksTanning ||
        preservationBlocksForestry ||
        plantationBlocksMining ||
        jungleExpeditionBlocksPlantation ||
        tropicalDevelopmentBlocksJungleExpedition ||
        oceanicRoutesBlocksMaritimeTrade ||
        oceanicRoutesBlocksFisheryGuild ||
        medievalBlocksAncient ||
        threeFieldBlocksIrrigation ||
        agriculturalSurplusBlocksThreeField ||
        modernAgricultureBlocksSurplus ||
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

        const mechanicsPos = findTierGridSlot(MECHANICS_UPGRADE_ID);
        if (bronzePos && mechanicsPos) {
            next.push({
                from: IRON_WORKING_UPGRADE_ID,
                to: MECHANICS_UPGRADE_ID,
                x1: xForCol(bronzePos.colIdx),
                y1: bottomAnchorY(bronzePos.rowIdx, selectedId === IRON_WORKING_UPGRADE_ID),
                x2: xForCol(mechanicsPos.colIdx),
                y2: topAnchorY(mechanicsPos.rowIdx, selectedId === MECHANICS_UPGRADE_ID),
            });
        }

        const gunpowderPos = findTierGridSlot(GUNPOWDER_UPGRADE_ID);
        if (mechanicsPos && gunpowderPos) {
            next.push({
                from: MECHANICS_UPGRADE_ID,
                to: GUNPOWDER_UPGRADE_ID,
                x1: xForCol(mechanicsPos.colIdx),
                y1: bottomAnchorY(mechanicsPos.rowIdx, selectedId === MECHANICS_UPGRADE_ID),
                x2: xForCol(gunpowderPos.colIdx),
                y2: topAnchorY(gunpowderPos.rowIdx, selectedId === GUNPOWDER_UPGRADE_ID),
            });
        }

        const ballisticsPos = findTierGridSlot(BALLISTICS_UPGRADE_ID);
        if (gunpowderPos && ballisticsPos) {
            next.push({
                from: GUNPOWDER_UPGRADE_ID,
                to: BALLISTICS_UPGRADE_ID,
                x1: xForCol(gunpowderPos.colIdx),
                y1: bottomAnchorY(gunpowderPos.rowIdx, selectedId === GUNPOWDER_UPGRADE_ID),
                x2: xForCol(ballisticsPos.colIdx),
                y2: topAnchorY(ballisticsPos.rowIdx, selectedId === BALLISTICS_UPGRADE_ID),
            });
        }

        const interchangeablePartsPos = findTierGridSlot(INTERCHANGEABLE_PARTS_UPGRADE_ID);
        if (ballisticsPos && interchangeablePartsPos) {
            next.push({
                from: BALLISTICS_UPGRADE_ID,
                to: INTERCHANGEABLE_PARTS_UPGRADE_ID,
                x1: xForCol(ballisticsPos.colIdx),
                y1: bottomAnchorY(ballisticsPos.rowIdx, selectedId === BALLISTICS_UPGRADE_ID),
                x2: xForCol(interchangeablePartsPos.colIdx),
                y2: topAnchorY(interchangeablePartsPos.rowIdx, selectedId === INTERCHANGEABLE_PARTS_UPGRADE_ID),
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

        const agriculturalSurplusPos = findTierGridSlot(AGRICULTURAL_SURPLUS_UPGRADE_ID);
        if (threeFieldPos && agriculturalSurplusPos) {
            next.push({
                from: THREE_FIELD_SYSTEM_UPGRADE_ID,
                to: AGRICULTURAL_SURPLUS_UPGRADE_ID,
                x1: xForCol(threeFieldPos.colIdx),
                y1: bottomAnchorY(threeFieldPos.rowIdx, selectedId === THREE_FIELD_SYSTEM_UPGRADE_ID),
                x2: xForCol(agriculturalSurplusPos.colIdx),
                y2: topAnchorY(agriculturalSurplusPos.rowIdx, selectedId === AGRICULTURAL_SURPLUS_UPGRADE_ID),
            });
        }

        const modernAgriculturePos = findTierGridSlot(MODERN_AGRICULTURE_UPGRADE_ID);
        if (agriculturalSurplusPos && modernAgriculturePos) {
            next.push({
                from: AGRICULTURAL_SURPLUS_UPGRADE_ID,
                to: MODERN_AGRICULTURE_UPGRADE_ID,
                x1: xForCol(agriculturalSurplusPos.colIdx),
                y1: bottomAnchorY(agriculturalSurplusPos.rowIdx, selectedId === AGRICULTURAL_SURPLUS_UPGRADE_ID),
                x2: xForCol(modernAgriculturePos.colIdx),
                y2: topAnchorY(modernAgriculturePos.rowIdx, selectedId === MODERN_AGRICULTURE_UPGRADE_ID),
            });
        }

        const pastPos = findTierGridSlot(PASTORALISM_UPGRADE_ID);
        const nomadicTraditionPos = findTierGridSlot(NOMADIC_TRADITION_UPGRADE_ID);
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

        const pastureManagementPos = findTierGridSlot(PASTURE_MANAGEMENT_UPGRADE_ID);
        if (pastPos && nomadicTraditionPos) {
            next.push({
                from: PASTORALISM_UPGRADE_ID,
                to: NOMADIC_TRADITION_UPGRADE_ID,
                x1: xForCol(pastPos.colIdx),
                y1: bottomAnchorY(pastPos.rowIdx, selectedId === PASTORALISM_UPGRADE_ID),
                x2: xForCol(nomadicTraditionPos.colIdx),
                y2: topAnchorY(nomadicTraditionPos.rowIdx, selectedId === NOMADIC_TRADITION_UPGRADE_ID),
            });
        }

        if (nomadicTraditionPos && pastureManagementPos) {
            next.push({
                from: NOMADIC_TRADITION_UPGRADE_ID,
                to: PASTURE_MANAGEMENT_UPGRADE_ID,
                x1: xForCol(nomadicTraditionPos.colIdx),
                y1: bottomAnchorY(nomadicTraditionPos.rowIdx, selectedId === NOMADIC_TRADITION_UPGRADE_ID),
                x2: xForCol(pastureManagementPos.colIdx),
                y2: topAnchorY(pastureManagementPos.rowIdx, selectedId === PASTURE_MANAGEMENT_UPGRADE_ID),
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
        if (fisheriesPos && celestialPos) {
            next.push({
                from: FISHERIES_UPGRADE_ID,
                to: CELESTIAL_NAVIGATION_UPGRADE_ID,
                x1: xForCol(fisheriesPos.colIdx),
                y1: bottomAnchorY(fisheriesPos.rowIdx, selectedId === FISHERIES_UPGRADE_ID),
                x2: xForCol(celestialPos.colIdx),
                y2: topAnchorY(celestialPos.rowIdx, selectedId === CELESTIAL_NAVIGATION_UPGRADE_ID),
            });
        }

        const shipbuildingPos = findTierGridSlot(SHIPBUILDING_UPGRADE_ID);
        if (fisheriesPos && shipbuildingPos) {
            next.push({
                from: FISHERIES_UPGRADE_ID,
                to: SHIPBUILDING_UPGRADE_ID,
                x1: xForCol(fisheriesPos.colIdx),
                y1: bottomAnchorY(fisheriesPos.rowIdx, selectedId === FISHERIES_UPGRADE_ID),
                x2: xForCol(shipbuildingPos.colIdx),
                y2: topAnchorY(shipbuildingPos.rowIdx, selectedId === SHIPBUILDING_UPGRADE_ID),
            });
        }

        const foreignTradePos = findTierGridSlot(FOREIGN_TRADE_UPGRADE_ID);
        const dryStoragePos = findTierGridSlot(DRY_STORAGE_UPGRADE_ID);
        if (foreignTradePos && dryStoragePos) {
            next.push({
                from: FOREIGN_TRADE_UPGRADE_ID,
                to: DRY_STORAGE_UPGRADE_ID,
                x1: xForCol(foreignTradePos.colIdx),
                y1: bottomAnchorY(foreignTradePos.rowIdx, selectedId === FOREIGN_TRADE_UPGRADE_ID),
                x2: xForCol(dryStoragePos.colIdx),
                y2: topAnchorY(dryStoragePos.rowIdx, selectedId === DRY_STORAGE_UPGRADE_ID),
            });
        }

        const desertStoragePos = findTierGridSlot(DESERT_STORAGE_UPGRADE_ID);
        if (dryStoragePos && desertStoragePos) {
            next.push({
                from: DRY_STORAGE_UPGRADE_ID,
                to: DESERT_STORAGE_UPGRADE_ID,
                x1: xForCol(dryStoragePos.colIdx),
                y1: bottomAnchorY(dryStoragePos.rowIdx, selectedId === DRY_STORAGE_UPGRADE_ID),
                x2: xForCol(desertStoragePos.colIdx),
                y2: topAnchorY(desertStoragePos.rowIdx, selectedId === DESERT_STORAGE_UPGRADE_ID),
            });
        }

        const caravanseraiPos = findTierGridSlot(CARAVANSERAI_UPGRADE_ID);
        if (desertStoragePos && caravanseraiPos) {
            next.push({
                from: DESERT_STORAGE_UPGRADE_ID,
                to: CARAVANSERAI_UPGRADE_ID,
                x1: xForCol(desertStoragePos.colIdx),
                y1: bottomAnchorY(desertStoragePos.rowIdx, selectedId === DESERT_STORAGE_UPGRADE_ID),
                x2: xForCol(caravanseraiPos.colIdx),
                y2: topAnchorY(caravanseraiPos.rowIdx, selectedId === CARAVANSERAI_UPGRADE_ID),
            });
        }

        const oasisRecoveryPos = findTierGridSlot(OASIS_RECOVERY_UPGRADE_ID);
        if (caravanseraiPos && oasisRecoveryPos) {
            next.push({
                from: CARAVANSERAI_UPGRADE_ID,
                to: OASIS_RECOVERY_UPGRADE_ID,
                x1: xForCol(caravanseraiPos.colIdx),
                y1: bottomAnchorY(caravanseraiPos.rowIdx, selectedId === CARAVANSERAI_UPGRADE_ID),
                x2: xForCol(oasisRecoveryPos.colIdx),
                y2: topAnchorY(oasisRecoveryPos.rowIdx, selectedId === OASIS_RECOVERY_UPGRADE_ID),
            });
        }

        const maritimeTradePos = findTierGridSlot(MARITIME_TRADE_UPGRADE_ID);
        if (celestialPos && maritimeTradePos) {
            next.push({
                from: CELESTIAL_NAVIGATION_UPGRADE_ID,
                to: MARITIME_TRADE_UPGRADE_ID,
                x1: xForCol(celestialPos.colIdx),
                y1: bottomAnchorY(celestialPos.rowIdx, selectedId === CELESTIAL_NAVIGATION_UPGRADE_ID),
                x2: xForCol(maritimeTradePos.colIdx),
                y2: topAnchorY(maritimeTradePos.rowIdx, selectedId === MARITIME_TRADE_UPGRADE_ID),
            });
        }

        const huntingPos = findTierGridSlot(HUNTING_UPGRADE_ID);
        const trackingPos = findTierGridSlot(TRACKING_UPGRADE_ID);
        if (huntingPos && trackingPos) {
            next.push({
                from: HUNTING_UPGRADE_ID,
                to: TRACKING_UPGRADE_ID,
                x1: xForCol(huntingPos.colIdx),
                y1: bottomAnchorY(huntingPos.rowIdx, selectedId === HUNTING_UPGRADE_ID),
                x2: xForCol(trackingPos.colIdx),
                y2: topAnchorY(trackingPos.rowIdx, selectedId === TRACKING_UPGRADE_ID),
            });
        }

        const tanningPos = findTierGridSlot(TANNING_UPGRADE_ID);
        if (trackingPos && tanningPos) {
            next.push({
                from: TRACKING_UPGRADE_ID,
                to: TANNING_UPGRADE_ID,
                x1: xForCol(trackingPos.colIdx),
                y1: bottomAnchorY(trackingPos.rowIdx, selectedId === TRACKING_UPGRADE_ID),
                x2: xForCol(tanningPos.colIdx),
                y2: topAnchorY(tanningPos.rowIdx, selectedId === TANNING_UPGRADE_ID),
            });
        }

        const forestryPos = findTierGridSlot(FORESTRY_UPGRADE_ID);
        if (tanningPos && forestryPos) {
            next.push({
                from: TANNING_UPGRADE_ID,
                to: FORESTRY_UPGRADE_ID,
                x1: xForCol(tanningPos.colIdx),
                y1: bottomAnchorY(tanningPos.rowIdx, selectedId === TANNING_UPGRADE_ID),
                x2: xForCol(forestryPos.colIdx),
                y2: topAnchorY(forestryPos.rowIdx, selectedId === FORESTRY_UPGRADE_ID),
            });
        }

        const preservationPos = findTierGridSlot(PRESERVATION_UPGRADE_ID);
        if (forestryPos && preservationPos) {
            next.push({
                from: FORESTRY_UPGRADE_ID,
                to: PRESERVATION_UPGRADE_ID,
                x1: xForCol(forestryPos.colIdx),
                y1: bottomAnchorY(forestryPos.rowIdx, selectedId === FORESTRY_UPGRADE_ID),
                x2: xForCol(preservationPos.colIdx),
                y2: topAnchorY(preservationPos.rowIdx, selectedId === PRESERVATION_UPGRADE_ID),
            });
        }

        const miningPos = findTierGridSlot(MINING_UPGRADE_ID);
        const plantationPos = findTierGridSlot(PLANTATION_UPGRADE_ID);
        if (miningPos && plantationPos) {
            next.push({
                from: MINING_UPGRADE_ID,
                to: PLANTATION_UPGRADE_ID,
                x1: xForCol(miningPos.colIdx),
                y1: bottomAnchorY(miningPos.rowIdx, selectedId === MINING_UPGRADE_ID),
                x2: xForCol(plantationPos.colIdx),
                y2: topAnchorY(plantationPos.rowIdx, selectedId === PLANTATION_UPGRADE_ID),
            });
        }

        const jungleExpeditionPos = findTierGridSlot(JUNGLE_EXPEDITION_UPGRADE_ID);
        if (plantationPos && jungleExpeditionPos) {
            next.push({
                from: PLANTATION_UPGRADE_ID,
                to: JUNGLE_EXPEDITION_UPGRADE_ID,
                x1: xForCol(plantationPos.colIdx),
                y1: bottomAnchorY(plantationPos.rowIdx, selectedId === PLANTATION_UPGRADE_ID),
                x2: xForCol(jungleExpeditionPos.colIdx),
                y2: topAnchorY(jungleExpeditionPos.rowIdx, selectedId === JUNGLE_EXPEDITION_UPGRADE_ID),
            });
        }

        const tropicalDevelopmentPos = findTierGridSlot(TROPICAL_DEVELOPMENT_UPGRADE_ID);
        if (jungleExpeditionPos && tropicalDevelopmentPos) {
            next.push({
                from: JUNGLE_EXPEDITION_UPGRADE_ID,
                to: TROPICAL_DEVELOPMENT_UPGRADE_ID,
                x1: xForCol(jungleExpeditionPos.colIdx),
                y1: bottomAnchorY(jungleExpeditionPos.rowIdx, selectedId === JUNGLE_EXPEDITION_UPGRADE_ID),
                x2: xForCol(tropicalDevelopmentPos.colIdx),
                y2: topAnchorY(tropicalDevelopmentPos.rowIdx, selectedId === TROPICAL_DEVELOPMENT_UPGRADE_ID),
            });
        }

        const compassPos = findTierGridSlot(COMPASS_UPGRADE_ID);
        if (fisheriesPos && compassPos) {
            next.push({
                from: FISHERIES_UPGRADE_ID,
                to: COMPASS_UPGRADE_ID,
                x1: xForCol(fisheriesPos.colIdx),
                y1: bottomAnchorY(fisheriesPos.rowIdx, selectedId === FISHERIES_UPGRADE_ID),
                x2: xForCol(compassPos.colIdx),
                y2: topAnchorY(compassPos.rowIdx, selectedId === COMPASS_UPGRADE_ID),
            });
        }

        const fisheryGuildPos = findTierGridSlot(FISHERY_GUILD_UPGRADE_ID);
        if (seafaringPos && fisheryGuildPos) {
            next.push({
                from: SEAFARING_UPGRADE_ID,
                to: FISHERY_GUILD_UPGRADE_ID,
                x1: xForCol(seafaringPos.colIdx),
                y1: bottomAnchorY(seafaringPos.rowIdx, selectedId === SEAFARING_UPGRADE_ID),
                x2: xForCol(fisheryGuildPos.colIdx),
                y2: topAnchorY(fisheryGuildPos.rowIdx, selectedId === FISHERY_GUILD_UPGRADE_ID),
            });
        }

        const oceanicRoutesPos = findTierGridSlot(OCEANIC_ROUTES_UPGRADE_ID);
        if (maritimeTradePos && oceanicRoutesPos) {
            next.push({
                from: MARITIME_TRADE_UPGRADE_ID,
                to: OCEANIC_ROUTES_UPGRADE_ID,
                x1: xForCol(maritimeTradePos.colIdx),
                y1: bottomAnchorY(maritimeTradePos.rowIdx, selectedId === MARITIME_TRADE_UPGRADE_ID),
                x2: xForCol(oceanicRoutesPos.colIdx),
                y2: topAnchorY(oceanicRoutesPos.rowIdx, selectedId === OCEANIC_ROUTES_UPGRADE_ID),
            });
        }
        if (fisheryGuildPos && oceanicRoutesPos) {
            next.push({
                from: FISHERY_GUILD_UPGRADE_ID,
                to: OCEANIC_ROUTES_UPGRADE_ID,
                x1: xForCol(fisheryGuildPos.colIdx),
                y1: bottomAnchorY(fisheryGuildPos.rowIdx, selectedId === FISHERY_GUILD_UPGRADE_ID),
                x2: xForCol(oceanicRoutesPos.colIdx),
                y2: topAnchorY(oceanicRoutesPos.rowIdx, selectedId === OCEANIC_ROUTES_UPGRADE_ID),
            });
        }

        setConnectorLines(next);
    }, [selectedId]);

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
                setTooltipPosition(null);
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
            archeryBlocksIronWorking ||
            mechanicsBlocksIronWorking ||
            gunpowderBlocksMechanics ||
            ballisticsBlocksGunpowder ||
            interchangeablePartsBlocksBallistics ||
            irrigationBlocksAgriculture ||
            horsemanshipBlocksPastoralism ||
            pastureManagementBlocksPastoralism ||
            nomadicTraditionBlocksPastoralism ||
            seafaringBlocksFisheries ||
            compassBlocksFisheries ||
            celestialBlocksFisheries ||
            shipbuildingBlocksFisheries ||
            dryStorageBlocksForeignTrade ||
            desertStorageBlocksTradeGoods ||
            caravanseraiBlocksDryStorage ||
            oasisRecoveryBlocksCaravanserai ||
            fisheryGuildBlocksSeafaring ||
            maritimeTradeBlocksCelestial ||
            oceanicRoutesBlocksMaritimeTrade ||
            oceanicRoutesBlocksFisheryGuild ||
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
                    aria-hidden
                    style={{
                        flexShrink: 0,
                        paddingBottom: 14,
                        paddingLeft: KNOWLEDGE_TREE_LABEL_BAND_PX,
                        display: 'flex',
                        justifyContent: 'center',
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
                        {Array.from({ length: KNOWLEDGE_TREE_GRID_COLS }, (_, idx) => (
                            <div
                                key={`knowledge-col-${idx + 1}`}
                                style={{
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontFamily: 'Mulmaru, sans-serif',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    letterSpacing: '0.08em',
                                    color: '#64748b',
                                }}
                            >
                                {idx + 1}
                            </div>
                        ))}
                    </div>
                </div>
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
                            const normalizedTierIds = normalizeTierIdsToGrid(tier.ids);
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
                                            {normalizedTierIds.map((id, slotIdx) => {
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
                                                        data-knowledge-upgrade-id={id}
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
                                    : archeryBlocksIronWorking
                                        ? t('knowledgeUpgrade.requiresArcheryShort', language)
                                        : mechanicsBlocksIronWorking
                                            ? t('knowledgeUpgrade.requiresIronWorkingShort', language)
                                            : gunpowderBlocksMechanics
                                                ? t('knowledgeUpgrade.requiresMechanicsShort', language)
                                                : ballisticsBlocksGunpowder
                                                    ? t('knowledgeUpgrade.requiresGunpowderShort', language)
                                                    : interchangeablePartsBlocksBallistics
                                                        ? t('knowledgeUpgrade.requiresBallisticsShort', language)
                                        : irrigationBlocksAgriculture
                                            ? t('knowledgeUpgrade.requiresAgricultureShort', language)
                                            : horsemanshipBlocksPastoralism
                                                ? t('knowledgeUpgrade.requiresPastoralismShort', language)
                                                : pastureManagementBlocksPastoralism
                                                    ? t('knowledgeUpgrade.requiresNomadicTraditionShort', language)
                                                    : nomadicTraditionBlocksPastoralism
                                                        ? t('knowledgeUpgrade.requiresPastoralismShort', language)
                                                        : seafaringBlocksFisheries
                                                            ? t('knowledgeUpgrade.requiresFisheriesShort', language)
                                                            : compassBlocksFisheries
                                                                ? t('knowledgeUpgrade.requiresFisheriesShort', language)
                                                                : celestialBlocksFisheries
                                                                    ? t('knowledgeUpgrade.requiresFisheriesShort', language)
                                                                    : shipbuildingBlocksFisheries
                                                                        ? t('knowledgeUpgrade.requiresFisheriesShort', language)
                                                                        : dryStorageBlocksForeignTrade
                                                                            ? t('knowledgeUpgrade.requiresForeignTradeShort', language)
                                                                            : desertStorageBlocksTradeGoods
                                                                                ? t('knowledgeUpgrade.requiresTradeGoodsExchangeShort', language)
                                                                                : caravanseraiBlocksDryStorage
                                                                                    ? t('knowledgeUpgrade.requiresDryStorageShort', language)
                                                                                    : oasisRecoveryBlocksCaravanserai
                                                                                        ? t('knowledgeUpgrade.requiresCaravanseraiShort', language)
                                                                                        : fisheryGuildBlocksSeafaring
                                                                                            ? t('knowledgeUpgrade.requiresSeafaringShort', language)
                                                                                            : maritimeTradeBlocksCelestial
                                                                                                ? t('knowledgeUpgrade.requiresCelestialNavigationShort', language)
                                                                                                : trackingBlocksHunting
                                                                                                    ? t('knowledgeUpgrade.requiresHuntingShort', language)
                                                                                                    : tanningBlocksTracking
                                                                                                        ? t('knowledgeUpgrade.requiresTrackingShort', language)
                                                                                                        : forestryBlocksTanning
                                                                                                            ? t('knowledgeUpgrade.requiresTanningShort', language)
                                                                                                            : preservationBlocksForestry
                                                                                                                ? t('knowledgeUpgrade.requiresForestryShort', language)
                                                                                                                : plantationBlocksMining
                                                                                                                    ? t('knowledgeUpgrade.requiresMiningShort', language)
                                                                                                                    : jungleExpeditionBlocksPlantation
                                                                                                                        ? t('knowledgeUpgrade.requiresPlantationShort', language)
                                                                                                                        : tropicalDevelopmentBlocksJungleExpedition
                                                                                                                            ? t('knowledgeUpgrade.requiresJungleExpeditionShort', language)
                                                                                                                            : oceanicRoutesBlocksMaritimeTrade
                                                                                                                                ? t('knowledgeUpgrade.requiresMaritimeTradeShort', language)
                                                                                                                                : oceanicRoutesBlocksFisheryGuild
                                                                                                                                    ? t('knowledgeUpgrade.requiresFisheryGuildShort', language)
                                                                                                                                    : medievalBlocksAncient
                                                                                                                                        ? t('knowledgeUpgrade.requiresAncientShort', language)
                                                                                                                                        : threeFieldBlocksIrrigation
                                                                                                                                            ? t('knowledgeUpgrade.requiresIrrigationShort', language)
                                                                                                                                            : agriculturalSurplusBlocksThreeField
                                                                                                                                                ? t('knowledgeUpgrade.requiresThreeFieldShort', language)
                                                                                                                                                : modernAgricultureBlocksSurplus
                                                                                                                                                    ? t('knowledgeUpgrade.requiresAgriculturalSurplusShort', language)
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
