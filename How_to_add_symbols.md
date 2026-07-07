# How to Add Symbols

심볼을 추가하거나 기존 심볼을 바꿀 때 확인해야 할 현재 코드 기준 체크리스트입니다.

---

## 핵심 원칙

### 1. 숫자 ID와 key는 `symbolIdRegistry.ts`가 기준이다

- 새 정식 심볼은 `humankind-web/src/game/data/symbolIdRegistry.ts`의 `SYMBOL_NUMERIC_ID`에 먼저 key와 숫자 ID를 추가합니다.
- `symbolDefinitions.ts`에서는 `def('key', ...)` 형태로 정의합니다. 숫자 ID를 직접 중복 작성하지 않습니다.
- 로직에서는 가능한 경우 `S.some_key` 또는 `definition.key`를 사용하고, 숫자 literal 비교를 새로 늘리지 않습니다.
- 기존 숫자 ID를 바꾸는 작업은 저장 데이터, 테스트, 스프라이트 파일명, 밸런스 로그에 영향을 줄 수 있으므로 별도 작업으로 취급합니다.

현재 대략적인 ID 구간:

| 구간 | 용도 |
|---|---|
| 1-8 | 지형 |
| 9-38 | 자원/사치품/특수 |
| 39-46, 86-88 | 고대 및 리더 해금 고대 |
| 47-54 | 중세 |
| 55-58 | 종교 |
| 59 | 현대 특수 |
| 60-62 | 전리품 |
| 63-68 | 유닛 |
| 69-74 | 적 |
| 75-79 | 재해 |

### 2. `SymbolDefinition`에 없는 필드는 추가하지 않는다

현재 심볼 정의 타입은 아래 필드만 사용합니다.

```ts
interface SymbolDefinition {
  id: number;
  key: string;
  name: string;
  type: SymbolType;
  description: string;
  base_attack?: number;
  base_hp?: number;
  sprite: string;
}
```

- 위 타입에 없는 임의 메타데이터를 심볼 정의에 추가하지 않습니다.
- 새 메타데이터가 필요하면 타입, 데이터 브라우저 표시, 선택/필터 로직, i18n, 테스트까지 포함한 별도 변경으로 설계합니다.

### 3. 스프라이트 파일은 실제 존재 여부를 확인한다

심볼에 `sprite` 필드를 채울 때, 해당 PNG 파일이 `humankind-web/public/assets/symbols/`에 실존하는지 확인합니다.

- 파일이 있으면 정확한 파일명: `sprite: "088.png"`
- 파일이 없으면 명시적으로 비움: `sprite: "-"`

잘못된 예:

```ts
sprite: "089.png" // 실제 파일 없음
```

올바른 예:

```ts
sprite: "-"
```

현재 `AssetLoader`는 일부 에셋 로드 실패를 허용하지만, 없는 경로는 콘솔 경고와 빈 스프라이트/플레이스홀더를 만들고 디버깅 비용을 키웁니다.

### 4. 이름/설명은 i18n을 같이 갱신한다

`symbolDefinitions.ts`의 `name`/`description`은 기본 데이터입니다. 실제 UI와 데이터 브라우저는 i18n 키와 동적 tooltip 함수를 함께 사용합니다.

필수 확인 위치:

- `humankind-web/src/i18n/index.ts`
  - `symbol.<key>.name`
  - `symbol.<key>.desc`
- 업그레이드나 보드 상태에 따라 설명이 달라지는 심볼이면 `getBoardSymbolTooltipDesc(...)`도 확인합니다.
- 영어와 한국어는 반드시 함께 추가합니다. 중국어/러시아어 파일은 별도 번역 정책에 따라 유지하되, fallback 동작을 깨지 않아야 합니다.

---

## 효과 텍스트 규칙

### 용어

| 개념 | 사용할 용어 | 피할 표현 |
|---|---|---|
| 보드를 한 번 돌리는 행위/주기 | 턴 | 스핀 |
| 심볼이 보드/보유 목록에서 사라짐 | 파괴 | 소멸, 삭제, 제거 |
| 식량/골드/지식 생산 | `식량 +N`, `골드 +N`, `지식 +N` 또는 생산 | 획득, 올리기, 추가 |
| 상하좌우+대각선 8방향 이웃 | 인접 | 옆, 주변 |
| 효과 발생 누적값 | 카운터 | 스택, 횟수 |
| 현재 활성 보드 모양의 귀퉁이 | 구석 | 모서리, 코너 |
| 배수 | `x2`, `x3` | 두 배, 2배, ×, * |

### 문장 형식

- 기본 생산량은 바로 씁니다: `식량 +2.`
- 조건은 앞에 콜론을 둡니다: `초원 인접 시: 식량 +2.`
- 서로 다른 조건은 세미콜론으로 나눕니다: `식량 +1; 파괴 시: 식량 +10.`
- 같은 조건의 여러 결과는 쉼표로 묶습니다: `지식 +7, 골드 +7.`
- 기본 전제가 매 턴 발동이므로 `매 턴:`은 쓰지 않습니다.
- 업그레이드 가능성은 기본 description에 괄호로 암시하지 않습니다. 업그레이드 적용 후 현재 수치가 달라지는 구조라면 i18n 동적 tooltip에서 처리합니다.

---

## 선택 풀 기준

새 심볼이 정의됐다고 항상 선택지에 등장하는 것은 아닙니다. `selectionLogic.ts`와 `symbolDefinitions.ts`의 풀 규칙을 확인해야 합니다.

기본 흐름:

1. `EXCLUDED_FROM_BASE_POOL`에 없고 기본 타입 조건을 만족하면 기본 풀에 들어갑니다.
2. 고대 타입은 `Ancient Era` 업그레이드 전에는 제외됩니다.
3. 봉건제 이후 고대 심볼은 일반 풀에서 빠집니다.
4. 봉건제 이후 중세 심볼이 열립니다.
5. 현대 이후 일반 선택 풀에서 지형은 제외됩니다. 단, 지형 전용 선택은 `includeModernTerrain` 경로로 별도 동작할 수 있습니다.
6. 종교 심볼은 `Theology`로 `religionUnlocked`가 켜져야 등장합니다.
7. 적 심볼은 일반 선택 풀에서 제외되고, 위협/이벤트/전투 시스템을 통해 등장합니다.

업그레이드로 해금되는 심볼이면 다음도 갱신합니다.

- `humankind-web/src/game/data/knowledgeUpgrades.ts`
- `humankind-web/src/game/data/knowledgeUpgradeTiers.ts`
- `humankind-web/src/game/logic/selection/selectionLogic.ts`
- 관련 테스트: `knowledgeUpgrades.test.ts`, `selectionLogic.test.ts`, 필요 시 `gameCalculations.test.ts`

---

## 효과 구현 위치

효과는 `humankind-web/src/game/logic/symbolEffects.ts`를 엔트리로 하며, 실제 처리는 성격별 handler에 둡니다.

| 심볼 성격 | 우선 확인 파일 |
|---|---|
| 지형 | `logic/symbolEffects/handlers/terrainEffects.ts` |
| 고대 | `logic/symbolEffects/handlers/ancientEffects.ts` |
| 중세 | `logic/symbolEffects/handlers/medievalEffects.ts` |
| 종교 | `logic/symbolEffects/handlers/religionEffects.ts` |
| 적 | `logic/symbolEffects/handlers/enemyEffects.ts` |
| 재해 | `logic/symbolEffects/handlers/disasterEffects.ts` |
| 일반/자원/특수 | `logic/symbolEffects/handlers/normalEffects.ts` |

여러 슬롯 결과를 모아서 나중에 처리해야 하는 효과는 handler만으로 끝내지 않습니다.

- 턴 누적/생성/파괴: `logic/turn/turnPipeline.ts`
- 여러 심볼 생산 결과 참조: `logic/turn/symbolEffectResolution.ts`
- 턴 전체 후처리, 유물/리더/AGI 등: `logic/turn/postEffectsHooks.ts`
- 턴 종료 페이즈, 식량 납부, 선택 페이즈: `logic/turn/phaseResolution.ts`, `state/actions/turnFlow.ts`

전투/재해/전리품/이벤트와 연결되면 추가로 확인합니다.

- 유닛/적 전투: `logic/combat/*`, `logic/turn/combatResolution.ts`, `data/unitUpgrades.ts`, `data/enemyPools.ts`
- 상태/재해 확률: `data/statusDefinitions.ts`, `logic/turn/turnPreparation.ts`
- 전리품 보상: `data/rewardDefinitions.ts`, `state/actions/boardInteraction.ts`
- 이벤트 선택지: `data/eventDefinitions.ts`, `state/actions/selectionFlow.ts`

---

## 연출과 UI

- 심볼 효과 handler에서 `setTimeout`이나 Pixi 객체를 직접 다루지 않습니다.
- 계산 결과를 먼저 확정하고, 연출은 `state/actions/turnPresentationTimeline.ts`, `turnRunScheduler.ts`, `components/canvas/renderers/*`, React 오버레이에서 표시합니다.
- 새 hover/hit area나 보드 위 상호작용이 필요하면 `components/canvas/PixiGameApp.ts`와 `components/canvas/renderers/rendererShared.ts`의 판정 헬퍼를 확인합니다.
- 새 보드 대상 선택 UI가 필요하면 기존 `OblivionFurnaceBoardOverlay.tsx`, `SymbolCellBoardOverlays.tsx`, `boardInteraction.ts` 패턴을 먼저 따릅니다.

---

## 테스트 기준

변경 범위에 따라 최소한 아래 테스트 중 관련된 것을 추가/갱신합니다.

| 변경 종류 | 우선 테스트 |
|---|---|
| 심볼 ID/정의/스프라이트 | `data/symbolDefinitions.test.ts` |
| 선택 풀/해금/제외 | `logic/selection/selectionLogic.test.ts`, `data/knowledgeUpgrades.test.ts` |
| 효과 계산 | `logic/turn/symbolEffectResolution.test.ts`, handler 관련 테스트 |
| 턴 흐름/식량 납부/페이즈 | `state/actions/turnFlow.test.ts`, `logic/turn/phaseResolution.test.ts` |
| 전투/유닛/적 | `logic/turn/combatResolution.test.ts`, `data/unitUpgrades.test.ts`, `data/enemyPools.test.ts` |
| 재해 | `state/actions/disasterPlague.test.ts`, `logic/turn/turnPreparation.test.ts` |
| 저장/복원 영향 | `state/saveGame.test.ts` |
| 시뮬레이션 영향 | `simulation/balanceSimulator.test.ts` |

---

## 추가 체크리스트

1. [ ] `symbolIdRegistry.ts`에 key/ID 추가
2. [ ] `symbolDefinitions.ts`에 `def('key', ...)` 추가
3. [ ] `SymbolType`이 현재 분류와 맞는지 확인
4. [ ] 스프라이트 파일 존재 확인, 없으면 `sprite: "-"`
5. [ ] `i18n/index.ts`에 영어/한국어 `symbol.<key>.name`, `symbol.<key>.desc` 추가
6. [ ] 보드 상태/업그레이드에 따라 설명이 변하면 `getBoardSymbolTooltipDesc(...)` 갱신
7. [ ] 효과 handler 또는 `logic/turn/*`에 실제 계산 추가
8. [ ] 선택 풀 등장 조건이 필요하면 `EXCLUDED_FROM_BASE_POOL`, `selectionLogic.ts`, 업그레이드 데이터를 갱신
9. [ ] 전투/재해/전리품/이벤트/리더와 엮이면 관련 데이터와 액션 파일을 같이 갱신
10. [ ] 필요한 React/Pixi 표시, hover, 보드 상호작용을 추가
11. [ ] 관련 테스트 추가/갱신
12. [ ] `npm run test` 또는 범위 테스트로 검증
