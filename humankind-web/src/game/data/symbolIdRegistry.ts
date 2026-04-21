/**
 * 심볼 숫자 ID의 단일 출처입니다.
 * ID를 바꿀 때는 이 파일의 값만 수정하면 되며,
 * 게임 로직에서는 `SYMBOL_NUMERIC_ID`(숫자 비교) 또는 `definition.key`(문자 식별)를 사용합니다.
 *
 * 배치 규칙: 지형(1–8) → 일반(9–39) → 고대(40–48, 43 미사용) → 중세(49–56) → 종교(57–60) → 유닛(61–64) → 적(65–66) → 재해(67–69)
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

    // ── Normal (9–39): 곡물 → 소·양·양모(13)·말(14) → … ──
    wheat: 9,
    rice: 10,
    cattle: 11,
    sheep: 12,
    wool: 13,
    horse: 14,
    corn: 15,
    wild_boar: 16,
    deer: 17,
    wild_berries: 18,
    banana: 19,
    sawmill: 20,
    fish: 21,
    crab: 22,
    pearl: 23,
    harbor: 24,
    date: 25,
    stone: 26,
    copper: 27,
    gold_vein: 28,
    merchant: 29,
    salt: 30,
    library: 31,
    university: 32,
    stargazer: 33,
    stone_tablet: 34,
    honey: 35,
    spices: 36,
    relic_caravan: 37,
    loot: 38,
    glowing_amber: 39,

    // ── Ancient (40–48) ──
    monument: 40,
    oral_tradition: 41,
    totem: 42,
    omen: 44,
    campfire: 45,
    pottery: 46,
    tribal_village: 47,
    wild_seeds: 48,

    // ── Medieval (49–56) ──
    tax: 49,
    scholar: 50,
    holy_relic: 51,
    telescope: 52,
    scales: 53,
    pioneer: 54,
    edict: 55,
    embassy: 56,

    // ── Religion (57–60) ──
    christianity: 57,
    islam: 58,
    buddhism: 59,
    hinduism: 60,

    // ── Unit (61–64) ──
    warrior: 61,
    archer: 62,
    knight: 63,
    caravel: 64,

    // ── Enemy (65–66) ──
    barbarian_camp: 65,
    enemy_warrior: 66,

    // ── Disaster (67–69) ──
    flood: 67,
    earthquake: 68,
    drought: 69,
} as const;

export type SymbolKey = keyof typeof SYMBOL_NUMERIC_ID;

/** 짧은 별칭 — 효과 스위치 등에서 `S.flood` 형태로 사용 */
export const S = SYMBOL_NUMERIC_ID;
