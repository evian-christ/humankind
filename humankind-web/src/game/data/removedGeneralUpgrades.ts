/**
 * 지식 트리에서 제거된 공통층(비지형축) 업그레이드 보관소.
 *
 * 지형축 정리([[removedTerrainAxisUpgrades]])에 이어 행정·기반생산 계열까지
 * 트리에서 걷어냈다. 이름(컨셉)은 그대로 다시 쓸 확률이 높아 재도입 순서를 잡을 수
 * 있도록 남겨둔다. 레벨·선행조건·효과는 재도입 시점에 새로 정한다.
 *
 * 재도입 절차:
 *  1. `knowledgeUpgrades.ts`의 `KNOWLEDGE_UPGRADES`에 카드 정의를 다시 넣는다.
 *  2. `knowledgeUpgradeTiers.ts`의 `KNOWLEDGE_UPGRADE_TIER_ROWS`에 레벨을 배정한다.
 *  3. 필요하면 `KNOWLEDGE_UPGRADE_PREREQUISITES`, `KNOWLEDGE_UPGRADE_TREE_PREFERRED_COLUMN_BY_ID`를 채운다.
 *
 * ID 상수 자체는 `knowledgeUpgrades.ts`에 그대로 남아 있다.
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
    /** 기반 생산량 계열 — 식량·골드·지식 기본값을 올리던 카드 */
    baseProduction: [
        { constantName: 'LAW_CODE_UPGRADE_ID', id: 10, name: 'Law Code', nameKo: '법전', formerDescription: 'Permanently increases base Knowledge generation by +2.', sprite: '010.png' },
        { constantName: 'MATHEMATICS_UPGRADE_ID', id: 23, name: 'Mathematics', nameKo: '수학', formerDescription: 'Base Food +1, Base Knowledge +1.', sprite: '023.png' },
        { constantName: 'STATE_LABOR_UPGRADE_ID', id: 25, name: 'State Labor', nameKo: '국가노동력', formerDescription: 'Base Food production +1. Base Gold production +1.', sprite: '025.png' },
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
