/**
 * 지식 트리에서 제거된 메인 지형 축 업그레이드 보관소.
 *
 * 6개 지형축(숲/평원/초원/바다/사막/열대우림)의 업그레이드를 트리에서 전부 걷어냈지만,
 * 이름(컨셉)은 그대로 다시 쓸 확률이 높아 재도입 순서를 잡을 수 있도록 남겨둔다.
 * 레벨·선행조건·효과는 재도입 시점에 새로 정한다.
 *
 * 재도입 절차:
 *  1. `knowledgeUpgrades.ts`의 `KNOWLEDGE_UPGRADES`에 카드 정의를 다시 넣는다.
 *  2. `knowledgeUpgradeTiers.ts`의 `KNOWLEDGE_UPGRADE_TIER_ROWS`에 레벨을 배정한다.
 *  3. 필요하면 `KNOWLEDGE_UPGRADE_PREREQUISITES`, `KNOWLEDGE_UPGRADE_TREE_PREFERRED_COLUMN_BY_ID`를 채운다.
 *  4. 심볼 해금 카드라면 `selectionLogic.ts`의 해금 분기와 `EXCLUDED_POOL_KEYS`를 함께 확인한다.
 *
 * ID 상수 자체는 `knowledgeUpgrades.ts`에 그대로 남아 있다. 심볼 효과 핸들러가
 * `upgrades.includes(...)`로 참조하고 있어, 재도입 시 효과 로직을 다시 쓸 필요가 없다.
 */
export interface RemovedTerrainAxisUpgrade {
    /** `knowledgeUpgrades.ts`에 남아 있는 ID 상수 이름 */
    constantName: string;
    /** 제거 시점의 숫자 ID */
    id: number;
    /** 유지하려는 컨셉 이름 */
    name: string;
    /** 제거 시점의 효과 요약 — 재도입 시 참고용이며 그대로 복원할 필요는 없다 */
    formerDescription: string;
    /** 제거 시점의 스프라이트 */
    sprite: string;
}

export const REMOVED_TERRAIN_AXIS_UPGRADES: Readonly<
    Record<string, readonly RemovedTerrainAxisUpgrade[]>
> = {
    /**
     * 숲축 — 모피·사슴 가공으로 이어지던 라인.
     * 수렵(Hunting, id 2)은 Lv.2로 재도입되어 사슴을 해금한다.
     * 예전에는 수렵이 모피를 해금했으므로, 모피(Fur)는 현재 해금 경로가 없다.
     */
    forest: [
        { constantName: 'TRACKING_UPGRADE_ID', id: 20, name: 'Tracking', formerDescription: 'Upgrades Forest.', sprite: '020.png' },
        { constantName: 'TANNING_UPGRADE_ID', id: 30, name: 'Tanning', formerDescription: 'Upgrades Fur and Deer.', sprite: '030.png' },
        { constantName: 'FORESTRY_UPGRADE_ID', id: 46, name: 'Forestry', formerDescription: 'Upgrades Forest.', sprite: '046.png' },
        { constantName: 'PRESERVATION_UPGRADE_ID', id: 57, name: 'Preservation', formerDescription: 'Upgrades Deer.', sprite: '057.png' },
    ],

    /** 평원축 — 소·양·말로 이어지던 라인 */
    plains: [
        { constantName: 'HORSEMANSHIP_UPGRADE_ID', id: 13, name: 'Horsemanship', formerDescription: 'Adds Horse to the selection pool.', sprite: '013.png' },
        { constantName: 'NOMADIC_TRADITION_UPGRADE_ID', id: 24, name: 'Nomadic Tradition', formerDescription: 'Upgrades Cattle and Sheep.', sprite: '024.png' },
        { constantName: 'PASTURE_MANAGEMENT_UPGRADE_ID', id: 47, name: 'Pasture Management', formerDescription: 'Upgrades Plains.', sprite: '047.png' },
    ],

    /** 초원축 — 밀·옥수수·초원을 강화하던 라인 */
    grassland: [
        { constantName: 'IRRIGATION_UPGRADE_ID', id: 16, name: 'Irrigation', formerDescription: 'Upgrades Wheat, Corn, and Grassland.', sprite: '016.png' },
        { constantName: 'THREE_FIELD_SYSTEM_UPGRADE_ID', id: 28, name: 'Three-field System', formerDescription: 'Upgrades Wheat, Corn, and Grassland.', sprite: '028.png' },
        { constantName: 'AGRICULTURAL_SURPLUS_UPGRADE_ID', id: 43, name: 'Agricultural Surplus', formerDescription: 'Upgrades Wheat and Corn.', sprite: '043.png' },
        { constantName: 'MODERN_AGRICULTURE_UPGRADE_ID', id: 56, name: 'Modern Agriculture', formerDescription: 'Upgrades Wheat and Corn.', sprite: '056.png' },
    ],

    /**
     * 바다축 — 물고기·게·진주·바다로 이어지던 라인.
     * 게(Crab)는 현재 해금 경로가 없다.
     */
    sea: [
        { constantName: 'SEAFARING_UPGRADE_ID', id: 14, name: 'Navigation', formerDescription: 'Upgrades Fish and Crab.', sprite: '014.png' },
        { constantName: 'CELESTIAL_NAVIGATION_UPGRADE_ID', id: 15, name: 'Celestial Navigation', formerDescription: 'Upgrades Pearl and Sea.', sprite: '015.png' },
        { constantName: 'FISHERY_GUILD_UPGRADE_ID', id: 27, name: 'Fishery Guild', formerDescription: 'Upgrades Fish and Crab.', sprite: '027.png' },
        { constantName: 'COMPASS_UPGRADE_ID', id: 31, name: 'Compass', formerDescription: 'Compass is added to the symbol selection pool.', sprite: '031.png' },
        { constantName: 'MARITIME_TRADE_UPGRADE_ID', id: 34, name: 'Maritime Trade', formerDescription: 'Upgrades Pearl and Sea.', sprite: '034.png' },
        { constantName: 'SHIPBUILDING_UPGRADE_ID', id: 39, name: 'Shipbuilding', formerDescription: 'Upgrades Sea.', sprite: '039.png' },
        { constantName: 'OCEANIC_ROUTES_UPGRADE_ID', id: 52, name: 'Oceanic Routes', formerDescription: 'Upgrades Fish, Crab, Pearl, and Sea.', sprite: '052.png' },
    ],

    /** 사막축 — 대외무역은 대추 해금 카드로 재도입했고, 나머지는 보관 중 */
    desert: [
        { constantName: 'DRY_STORAGE_UPGRADE_ID', id: 19, name: 'Trade Goods Exchange', formerDescription: 'Dye and Papyrus are added to the symbol selection pool.', sprite: '019.png' },
        { constantName: 'DESERT_STORAGE_UPGRADE_ID', id: 32, name: 'Dry Storage', formerDescription: 'Upgrades Desert, Oasis, and Date.', sprite: '032.png' },
        { constantName: 'CARAVANSERAI_UPGRADE_ID', id: 45, name: 'Caravanserai', formerDescription: 'Unlocks Caravanserai. Upgrades Dye and Papyrus.', sprite: '045.png' },
        { constantName: 'OASIS_RECOVERY_UPGRADE_ID', id: 54, name: 'Oasis Recovery Network', formerDescription: 'Upgrades Desert and Oasis.', sprite: '054.png' },
    ],

    /**
     * 열대우림축 — 바나나·탐험대로 이어지던 라인.
     * 열대 농경(Tropical Agriculture, id 76)은 Lv.2로 재도입되어 카사바를 해금한다.
     */
    rainforest: [
        { constantName: 'PLANTATION_UPGRADE_ID', id: 29, name: 'Plantation', formerDescription: 'Upgrades Banana.', sprite: '029.png' },
        { constantName: 'JUNGLE_EXPEDITION_UPGRADE_ID', id: 42, name: 'Jungle Expedition', formerDescription: 'Expedition is added to the symbol selection pool.', sprite: '042.png' },
        { constantName: 'TROPICAL_DEVELOPMENT_UPGRADE_ID', id: 60, name: 'Tropical Development', formerDescription: 'Upgrades Rainforest and Expedition.', sprite: '060.png' },
    ],
};

/** 제거된 업그레이드 ID 전체 — 트리 재도입 여부 점검용 */
export const REMOVED_TERRAIN_AXIS_UPGRADE_IDS: readonly number[] = Object.values(
    REMOVED_TERRAIN_AXIS_UPGRADES,
).flatMap((axis) => axis.map((entry) => entry.id));
