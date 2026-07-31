/**
 * 지식 트리에서 제거된 공통층(비지형축) 업그레이드 보관소.
 *
 * 지형축 정리([[removedTerrainAxisUpgrades]])에 이어 군사·행정·기반생산 계열까지
 * 트리에서 걷어냈다. 이름(컨셉)은 그대로 다시 쓸 확률이 높아 재도입 순서를 잡을 수
 * 있도록 남겨둔다. 레벨·선행조건·효과는 재도입 시점에 새로 정한다.
 *
 * 재도입 절차:
 *  1. `knowledgeUpgrades.ts`의 `KNOWLEDGE_UPGRADES`에 카드 정의를 다시 넣는다.
 *  2. `knowledgeUpgradeTiers.ts`의 `KNOWLEDGE_UPGRADE_TIER_ROWS`에 레벨을 배정한다.
 *  3. 필요하면 `KNOWLEDGE_UPGRADE_PREREQUISITES`, `KNOWLEDGE_UPGRADE_TREE_PREFERRED_COLUMN_BY_ID`를 채운다.
 *  4. 유물 지급 카드라면 `descRelics`와 지급 로직(`selectionFlow.ts`)을 함께 확인한다.
 *
 * ID 상수 자체는 `knowledgeUpgrades.ts`에 그대로 남아 있다. 기반 생산량 계산과
 * 유물 지급 로직이 `upgrades.includes(...)`로 참조하고 있어, 재도입 시 효과 로직을
 * 다시 쓸 필요가 없다.
 */
export interface RemovedGeneralUpgrade {
    /** `knowledgeUpgrades.ts`에 남아 있는 ID 상수 이름 */
    constantName: string;
    /** 제거 시점의 숫자 ID */
    id: number;
    /** 유지하려는 컨셉 이름 */
    name: string;
    /** 참고용 한국어 이름 */
    nameKo: string;
    /** 제거 시점의 효과 요약 — 재도입 시 참고용이며 그대로 복원할 필요는 없다 */
    formerDescription: string;
    /** 제거 시점의 스프라이트 */
    sprite: string;
}

export const REMOVED_GENERAL_UPGRADES: Readonly<
    Record<string, readonly RemovedGeneralUpgrade[]>
> = {
    /** 군사 계열 — 대부분 효과가 비어 있던 레거시 카드 */
    military: [
        { constantName: 'ARCHERY_UPGRADE_ID', id: 9, name: 'Archery', nameKo: '궁술', formerDescription: 'Legacy military upgrade. No current effect.', sprite: '009.png' },
        { constantName: 'IRON_WORKING_UPGRADE_ID', id: 22, name: 'Iron Working', nameKo: '철제기술', formerDescription: 'Legacy military upgrade. No current effect.', sprite: '022.png' },
        { constantName: 'MECHANICS_UPGRADE_ID', id: 33, name: 'Mechanics', nameKo: '기계장치', formerDescription: 'Legacy military upgrade. No current effect.', sprite: '033.png' },
        { constantName: 'GUNPOWDER_UPGRADE_ID', id: 48, name: 'Stirrups', nameKo: '등자', formerDescription: 'Legacy military upgrade. No current effect.', sprite: '048.png' },
        { constantName: 'BALLISTICS_UPGRADE_ID', id: 55, name: 'Ballistics', nameKo: '탄도학', formerDescription: 'Legacy military upgrade. No current effect.', sprite: '055.png' },
        { constantName: 'INTERCHANGEABLE_PARTS_UPGRADE_ID', id: 62, name: 'Interchangeable Parts', nameKo: '교체식 부품', formerDescription: 'Legacy military upgrade. No current effect.', sprite: '062.png' },
        { constantName: 'CASTLE_UPGRADE_ID', id: 71, name: 'Castle', nameKo: '성', formerDescription: 'Enemy units spawned by barbarian invasion do not plunder Food for 3 turns.', sprite: '071.png' },
    ],

    /** 유물 지급 계열 — 국가 재편성·개척자·군사 징집을 뿌리던 카드 */
    relicGrant: [
        { constantName: 'SACRIFICIAL_RITE_UPGRADE_ID', id: 12, name: 'Sacrificial Rite', nameKo: '희생 제의', formerDescription: 'Gain 3 State Reorganizations.', sprite: '012.png' },
        { constantName: 'INQUISITION_UPGRADE_ID', id: 64, name: 'Inquisition', nameKo: '이단심문', formerDescription: 'Gain 3 State Reorganizations.', sprite: '064.png' },
        { constantName: 'RESTRUCTURING_UPGRADE_ID', id: 65, name: 'Restructuring', nameKo: '구조조정', formerDescription: 'Gain 3 State Reorganizations.', sprite: '065.png' },
        { constantName: 'COLONIALISM_UPGRADE_ID', id: 72, name: 'Colonialism', nameKo: '식민주의', formerDescription: 'Gain 3 Ancient Tribe Joins.', sprite: '072.png' },
        { constantName: 'GREAT_MIGRATION_UPGRADE_ID', id: 78, name: 'Great Migration', nameKo: '대이주', formerDescription: 'Gain 2 Pioneers and 1 State Reorganization.', sprite: '072.png' },
        { constantName: 'LAND_ALLOTMENT_UPGRADE_ID', id: 79, name: 'Land Allotment', nameKo: '토지분배', formerDescription: 'Base Food production +1. Gain 3 Pioneers.', sprite: '072.png' },
        { constantName: 'TRIBAL_FEDERATION_UPGRADE_ID', id: 73, name: 'Tribal Federation', nameKo: '부족 연맹', formerDescription: 'Base Food production +1. Gain 2 Military Levies.', sprite: '073.png' },
        { constantName: 'MERCENARIES_UPGRADE_ID', id: 74, name: 'Mercenaries', nameKo: '용병', formerDescription: 'Base Gold production +2. Gain 2 Military Levies.', sprite: '074.png' },
        { constantName: 'TOTAL_MOBILIZATION_UPGRADE_ID', id: 75, name: 'Total Mobilization', nameKo: '총동원령', formerDescription: 'Gain 4 Military Levies.', sprite: '075.png' },
    ],

    /** 기반 생산량 계열 — 식량·골드·지식 기본값을 올리던 카드 */
    baseProduction: [
        { constantName: 'LAW_CODE_UPGRADE_ID', id: 10, name: 'Law Code', nameKo: '법전', formerDescription: 'Permanently increases base Knowledge generation by +2.', sprite: '010.png' },
        { constantName: 'MATHEMATICS_UPGRADE_ID', id: 23, name: 'Mathematics', nameKo: '수학', formerDescription: 'Base Food +1, Base Knowledge +1.', sprite: '023.png' },
        { constantName: 'STATE_LABOR_UPGRADE_ID', id: 25, name: 'State Labor', nameKo: '국가노동력', formerDescription: 'Base Food production +1. Base Gold production +1. Gain 1 State Reorganization.', sprite: '025.png' },
        { constantName: 'PRINTING_PRESS_UPGRADE_ID', id: 44, name: 'Printing Press', nameKo: '인쇄술', formerDescription: 'Base Gold +2, Base Knowledge +2.', sprite: '044.png' },
        { constantName: 'STEAM_POWER_UPGRADE_ID', id: 53, name: 'Steam Power', nameKo: '증기력', formerDescription: 'Base Gold production +4. Base Knowledge production +2.', sprite: '053.png' },
        { constantName: 'URBANIZATION_UPGRADE_ID', id: 58, name: 'Urbanization', nameKo: '도시화', formerDescription: 'Base Food production +4. Base Gold production +4.', sprite: '058.png' },
        { constantName: 'ELECTRICITY_UPGRADE_ID', id: 61, name: 'Electricity', nameKo: '전기', formerDescription: 'Base Food production +3. Base Gold production +3. Base Knowledge production +3.', sprite: '061.png' },
        { constantName: 'BUTTRESS_UPGRADE_ID', id: 70, name: 'Buttress', nameKo: '지지대', formerDescription: 'Base Food production +2.', sprite: '070.png' },
    ],

    /** 선택 단계 계열 — 이벤트 등장률·리롤을 바꾸던 카드 */
    selection: [
        { constantName: 'ELECTION_SYSTEM_UPGRADE_ID', id: 68, name: 'Election System', nameKo: '선거제도', formerDescription: 'The first reroll in each selection phase is free.', sprite: '068.png' },
    ],
};

/** 제거된 공통층 업그레이드 ID 전체 — 트리 재도입 여부 점검용 */
export const REMOVED_GENERAL_UPGRADE_IDS: readonly number[] = Object.values(
    REMOVED_GENERAL_UPGRADES,
).flatMap((group) => group.map((entry) => entry.id));
