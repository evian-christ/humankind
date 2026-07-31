export const RELIC_ID = {
    ANCIENT_RELIC_DEBRIS: 1,
    OBLIVION_FURNACE: 2,
    ANCIENT_TRIBE_JOIN: 3,
    MILITARY_LEVY: 4,
    PROPHECY_DIE: 5,
    CLOVIS_SPEAR: 6,
    LYDIA_COIN: 7,
    UR_WHEEL: 8,
    JOMON_POTTERY: 9,
    EGYPT_SAW: 10,
    BABYLON_MAP: 11,
    GOANNA_BANANA: 12,
    TEN_COMMANDMENTS: 13,
    NILE_SILT: 14,
    GOBEKLI_PILLAR: 15,
    CATALHOYUK: 16,
    SCARAB: 17,
    EPICURUS_PLAQUE: 18,
    TERRA_FOSSIL_GRAPE: 19,
    ANTONINIANUS: 20,
    ANDEAN_CHUNO: 21,
    LASCAUX_PIGMENT: 22,
    WILLENDORF_VENUS: 23,
    OTZI_COPPER_AXE: 24,
    SESTERTIUS_COIN: 25,
    TROY_GOLD_LOOT: 26,
    GLADIUS: 27,
    ISHTAR_BULL_RELIEF: 28,
    BAEKJE_INCENSE_BURNER: 29,
    TERRACOTTA_ARMY: 30,
    SIYANG_FANGZUN: 31,
    MOAI_STATUE: 32,
    NINEVEH_LION_RELIEF: 33,
    SOLOMON_SEAL_RING: 34,
    GUDEA_FOUNDATION_PEG: 35,
    HEREFORD_MAPPA_MUNDI: 36,
    SUMERIAN_KING_LIST: 37,
    ALEXANDRIA_MOUSEION_INSCRIPTION: 38,
    EGYPTIAN_GRANARY_MODEL: 39,
    ASHURBANIPAL_INDEX_TABLET: 40,
} as const;

/** ID 재배정 전(v1 저장 데이터 및 기존 번역 키)의 유물 ID. */
export const LEGACY_RELIC_ID_BY_ID: Readonly<Record<number, number>> = {
    1: 13, 2: 15, 3: 19, 4: 39, 5: 40,
    6: 1, 7: 2, 8: 3, 9: 4, 10: 5, 11: 6, 12: 7, 13: 8, 14: 9,
    15: 10, 16: 11, 17: 12, 18: 14, 19: 16, 20: 17, 21: 18, 22: 20,
    23: 21, 24: 22, 25: 23, 26: 24, 27: 25, 28: 26, 29: 27, 30: 28,
    31: 29, 32: 30, 33: 31, 34: 32, 35: 33, 36: 34, 37: 35, 38: 36,
    39: 37, 40: 38,
};

const RELIC_ID_BY_LEGACY_ID = new Map(
    Object.entries(LEGACY_RELIC_ID_BY_ID).map(([id, legacyId]) => [legacyId, Number(id)]),
);

export const remapLegacyRelicId = (legacyId: number): number =>
    RELIC_ID_BY_LEGACY_ID.get(legacyId) ?? legacyId;
