/**
 * 심볼 숫자 ID의 단일 출처입니다.
 * ID를 바꿀 때는 이 파일의 값만 수정하면 되며,
 * 게임 로직에서는 `SYMBOL_NUMERIC_ID`(숫자 비교) 또는 `definition.key`(문자 식별)를 사용합니다.
 *
 * 배치 규칙: 지형(1–8) → 일반(9–40, 41–42 비움) → 고대(43–50) → 중세(51–58) → 종교(59–62) → 현대 특수(63–66) → 재해(67–69) → 특수 보상(77–79) → 전투 전용(80+)
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

    // ── Normal (9–40): 메인 덱 축 + 공통 운영층 기준 ──
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
    copper: 30,

    // 브릿지 / 하이브리드
    wild_berries: 31,
    honey: 32,
    spices: 33,
    salt: 34,

    // 공통 운영층
    merchant: 35,
    monument: 36,
    library: 37,
    stone_tablet: 38,
    university: 39,
    relic_caravan: 40,

    // ── Ancient (43–50) ──
    oral_tradition: 43,
    totem: 44,
    omen: 45,
    campfire: 46,
    pottery: 47,
    tribal_village: 48,
    stargazer: 49,
    wild_seeds: 50,

    // ── Medieval (51–58) ──
    tax: 51,
    scholar: 52,
    holy_relic: 53,
    telescope: 54,
    scales: 55,
    pioneer: 56,
    edict: 57,
    embassy: 58,

    // ── Religion (59–62) ──
    christianity: 59,
    islam: 60,
    buddhism: 61,
    hinduism: 62,

    // ── Modern special (63–66) ──
    agi_core: 63,

    // ── Disaster (67–69) ──
    flood: 67,
    earthquake: 68,
    drought: 69,

    // ── Special reward (77–79) ──
    loot: 77,
    greater_loot: 78,
    radiant_loot: 79,

    // ── Combat-only dev range (80+) ──
    // melee by era -> ranged by era -> enemies
    warrior: 80,
    cavalry: 81,
    knight: 82,
    musketman: 83,
    infantry: 84,
    archer: 85,
    tracker_archer: 86,
    crossbowman: 87,
    cannon: 88,
    barbarian_camp: 89,
    enemy_warrior: 90,
} as const;

export type SymbolKey = keyof typeof SYMBOL_NUMERIC_ID;

/** 짧은 별칭 — 효과 스위치 등에서 `S.flood` 형태로 사용 */
export const S = SYMBOL_NUMERIC_ID;
