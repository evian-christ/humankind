/** 심볼 시대·분류 — `symbolDefinitions`와 후보 데이터 간 순환 참조를 피하기 위해 분리 */
export enum SymbolType {
    RELIGION = 0,
    NORMAL = 1,
    MEDIEVAL = 2,
    MODERN = 3,
    TERRAIN = 4,
    ANCIENT = 5,
    UNIT = 6,
    ENEMY = 7,
    DISASTER = 8,
    SPECIAL = 9
}
