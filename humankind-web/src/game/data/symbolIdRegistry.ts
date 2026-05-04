/**
 * 심볼 숫자 ID의 단일 출처입니다.
 * ID를 바꿀 때는 이 파일의 값만 수정하면 되며,
 * 게임 로직에서는 `SYMBOL_NUMERIC_ID`(숫자 비교) 또는 `definition.key`(문자 식별)를 사용합니다.
 *
 * 배치 규칙: 지형(1–8) → 일반(9–38) → 고대(39–46) → 중세(47–54) → 종교(55–58) → 현대 특수(59) → 특수 보상(60–62) → 전투 전용(63–72) → 적(73–74) → 재해(75–77)
 */
export const SYMBOL_NUMERIC_ID = {
    // ── Terrain (1–8): 초원→평원→바다→숲→열대우림→사막→오아시스→산 ──
    grassland: 1,
    plains: 2,
    sea: 3,
    forest: 4,
    rainforest: 5,
    desert: 6,
    oasis: 7,
    mountain: 8,

    // ── Normal (9–38): 메인 덱 축 + 공통 운영층 기준 ──
    // 초원축
    wheat: 9,
    rice: 10,
    corn: 11,

    // 평원축
    cattle: 12,
    sheep: 13,
    wool: 14,
    horse: 15,

    // 바다축
    fish: 16,
    crab: 17,
    pearl: 18,
    compass: 19,

    // 숲축
    deer: 20,
    mushroom: 21,
    fur: 22,

    // 열대우림축
    banana: 23,
    expedition: 24,

    // 사막축
    date: 25,
    dye: 26,
    papyrus: 27,
    caravanserai: 28,

    // 산/특수 포지션
    stone: 29,

    // 브릿지 / 하이브리드
    wild_berries: 30,
    honey: 31,
    spices: 32,
    salt: 33,

    // 공통 운영층
    merchant: 34,
    monument: 35,
    library: 36,
    stone_tablet: 37,
    relic_caravan: 38,

    // ── Ancient (39–46) ──
    oral_tradition: 39,
    totem: 40,
    omen: 41,
    campfire: 42,
    pottery: 43,
    tribal_village: 44,
    stargazer: 45,
    wild_seeds: 46,

    // ── Medieval (47–54) ──
    tax: 47,
    scholar: 48,
    holy_relic: 49,
    telescope: 50,
    scales: 51,
    pioneer: 52,
    edict: 53,
    embassy: 54,

    // ── Religion (55–58) ──
    christianity: 55,
    islam: 56,
    buddhism: 57,
    hinduism: 58,

    // ── Modern special (59) ──
    agi_core: 59,

    // ── Special reward (60–62) ──
    loot: 60,
    greater_loot: 61,
    radiant_loot: 62,

    // ── Combat-only dev range (63–72) ──
    // melee by era -> ranged by era
    warrior: 63,
    cavalry: 64,
    knight: 65,
    cavalry_corps: 66,
    musketman: 67,
    infantry: 68,
    archer: 69,
    tracker_archer: 70,
    crossbowman: 71,
    cannon: 72,

    // ── Enemy (73–74) ──
    barbarian_camp: 73,
    enemy_warrior: 74,

    // ── Disaster (75–77) ──
    flood: 75,
    earthquake: 76,
    drought: 77,
} as const;

export type SymbolKey = keyof typeof SYMBOL_NUMERIC_ID;

/** 짧은 별칭 — 효과 스위치 등에서 `S.flood` 형태로 사용 */
export const S = SYMBOL_NUMERIC_ID;
