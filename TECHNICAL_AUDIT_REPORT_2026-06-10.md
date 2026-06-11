# Humankind 기술·번역·레거시 코드 종합 감사 보고서

- 감사일: 2026-06-10
- 대상: `humankind-web/` (React 19 + PixiJS 8 + Zustand 5 + TypeScript + Tauri 2)
- 감사 방식: 정적 코드 분석, 진입점 기반 도달성 분석, 번역 사전 AST 대조, 자산 참조 검색, 테스트/빌드/린트/Rust 검증
- 주의: 감사 당시 작업 트리에 사용자 수정 사항과 `release_artifacts/`가 존재했다. 본 감사에서는 이를 되돌리거나 수정하지 않았다.

## 1. 결론 요약

프로젝트의 핵심 계산 로직은 비교적 많은 단위 테스트로 보호되고 있으며, 웹 빌드와 Rust 검증도 통과한다. 다만 현재 상태를 "출시 안정성이 충분하다"고 보기는 어렵다.

가장 우선해서 처리해야 할 문제는 다음과 같다.

1. 게임 수명주기 밖에 남는 `setTimeout` 콜백이 새 게임 상태를 오염시킬 수 있다.
2. 소모 유물 제거 타이머와 유물 ID 재사용이 결합되어 새 게임의 유물을 잘못 삭제할 수 있다.
3. 경품 응모 자격과 증명 코드가 클라이언트 로컬 데이터 및 공개된 결정론적 해시에 의존한다.
4. 영어/한국어에서 심볼 풀 창의 번역 키가 그대로 노출되며, 영어 UI 일부는 한국어로 정의되어 있다.
5. 러시아어 자동 fallback이 번역되지 않은 영단어를 삭제하여 문장의 핵심 의미를 잃는다.
6. 린트가 21개 오류로 실패하며, 출시 번들에 개발용 오버레이와 Tauri devtools가 포함된다.
7. 진입점에서 도달하지 않는 구형 모듈, 중복 데이터, 비활성 JSX, 미사용 번역과 자산이 남아 있다.

## 2. 검증 결과

| 항목 | 결과 | 비고 |
|---|---:|---|
| `npm.cmd test` | 통과 | 33개 파일, 387개 테스트 |
| `npm.cmd run build` | 통과 | 메인 JS 1,201.30 kB, gzip 348.86 kB |
| `npm.cmd run lint` | 실패 | 21개 오류 |
| `cargo check --locked` | 통과 | Windows 경로 canonicalize 경고 1건 |
| E2E/브라우저 테스트 | 없음 | Playwright/Cypress 설정 및 시나리오 없음 |

빌드가 성공한다는 사실과 실제 플레이 수명주기가 안전하다는 사실은 다르다. 현재 테스트는 순수 계산과 Zustand action 중심이며, 화면 전환 중 타이머, 번역 렌더링, Tauri 패키징 동작은 충분히 검증하지 않는다.

## 3. 위험도별 기술 문제

### [높음] T-01. 위협 표시 타이머가 새 게임 상태를 다시 처리 상태로 바꿀 수 있음

**근거**

- `src/components/canvas/renderers/FloatingTextRenderer.ts:295`
  - 2초 뒤 `continueProcessingAfterNewThreatFloats()`를 호출하는 전역 `setTimeout`을 생성한다.
- `src/game/state/actions/turnFlow.ts:1170`
  - 콜백은 현재 실행 회차나 현재 화면을 확인하지 않고 위협 표시를 비운 뒤 `startProcessing()`을 호출한다.
- `src/game/state/actions/turnFlow.ts:363`
  - `startProcessing()` 시작부에도 현재 phase가 실제 처리 가능한 상태인지 확인하는 방어 로직이 없다.
- 프로젝트에 `turnRunScheduler.ts`의 run id/cancel token 구조가 이미 있지만 이 타이머는 이를 사용하지 않는다.

**재현 가능 시나리오**

1. 새 위협 심볼 표시가 시작된다.
2. 2초가 지나기 전에 메인 메뉴로 나가거나 새 게임/튜토리얼/저장 게임을 시작한다.
3. 이전 화면에서 생성된 콜백이 새 Zustand 상태에 실행된다.
4. 새 상태의 phase와 관계없이 처리 파이프라인을 시작하거나 관련 배열을 비울 수 있다.

**영향**

- 새 게임의 phase 오염
- 중복 처리, 예상하지 않은 심볼 효과 실행
- 튜토리얼 진행 꼬임
- 드물고 재현하기 어려운 간헐적 버그

**권고**

- 타이머를 `turnRunScheduler`에 편입한다.
- `initializeGame`, 메인 메뉴 복귀, 저장 게임 로드 시 현재 run을 취소한다.
- 콜백 안에서 run id, cancel token, 예상 phase를 모두 확인한다.
- 이 전환 시나리오를 fake timer 테스트로 추가한다.

### [높음] T-02. 이전 게임의 소모 유물 제거 타이머가 새 게임 유물을 삭제할 수 있음

**근거**

- `src/game/state/actions/relicActivation.ts:65,84,103`
  - 일부 소모 유물을 260ms 뒤 `instanceId`로 제거한다.
- `src/game/state/relicStore.ts:84`
  - `resetRelics()`가 `nextId = 1`로 되돌린다.
- 새 게임 초기화에서 유물 저장소를 reset한다.

**재현 가능 시나리오**

1. `relic_1` 소모 유물을 사용한다.
2. 260ms 안에 새 게임을 시작한다.
3. 새 리더의 시작 유물이 다시 `relic_1`을 받는다.
4. 이전 게임의 타이머가 새 게임의 `relic_1`을 제거한다.

**권고**

- 게임 상태에서는 유물을 즉시 제거하고, 연출용 스냅샷만 260ms 유지하는 방식이 가장 단순하다.
- 또는 유물 ID를 세션 간 재사용하지 않는 UUID/단조 증가 ID로 바꾼다.
- 최소한 lifecycle token을 캡처하고 콜백 시 동일 세션인지 검사한다.

### [높음, 운영 조건부] T-03. 경품 응모 증명이 클라이언트에서 위조 가능

**근거**

- `src/game/data/demoAchievements.ts:41,59`
  - 업적 진행도가 `localStorage`에 평문 JSON으로 저장된다.
- `src/components/DemoStartScreen.tsx:24-30`
  - Steam 증명 코드는 코드에 공개된 고정 salt와 Steam ID를 SHA-256 한 결정론적 값이다.
- `src/components/DemoStartScreen.tsx:176`
  - 외부 Google Form으로 응모한다.

**판단**

이 코드는 Steam ID를 숨기거나 형식화하는 기능은 하지만, 업적 달성이나 정품 실행을 증명하지 않는다. salt와 알고리즘이 배포 바이너리/소스에 있으므로 누구나 동일 코드를 생성할 수 있다.

**영향**

- 운영 측에서 이 코드와 로컬 업적을 신뢰하면 경품 응모 조작이 쉽다.
- 실제 검증이 별도 서버에서 이루어진다면 위험도는 낮아지지만, 현재 저장소만으로는 그러한 검증이 확인되지 않는다.

**권고**

- 서버가 Steam 인증 결과와 달성 조건을 검증한 뒤 만료 시간이 있는 서명 토큰을 발급한다.
- 최소한 증명 코드에 서버 비밀키 기반 HMAC을 사용하고 재사용 방지 nonce를 둔다.
- 클라이언트 `localStorage` 값은 UI 편의 데이터로만 취급한다.

### [중간] T-04. Tauri 출시 설정의 공격 표면이 불필요하게 넓음

**근거**

- `src-tauri/tauri.conf.json:12`: `"withGlobalTauri": true`
- `src-tauri/tauri.conf.json:23`: `"csp": null`
- `src-tauri/Cargo.toml:12`: Tauri `devtools` feature 활성화
- `src-tauri/capabilities/default.json:9`: `opener:default`
- `src-tauri/src/main.rs`: opener plugin 초기화
- 프런트엔드에서 opener API 사용 흔적은 찾지 못했다.

**영향**

현재 앱이 로컬 번들만 로드한다면 즉시 취약점이라고 단정할 수는 없다. 그러나 XSS나 외부 콘텐츠 유입이 발생했을 때 피해를 줄이는 방어층이 약하다.

**권고**

- 출시 profile에서 devtools를 제거한다.
- `withGlobalTauri`를 실제 필요 여부에 따라 비활성화한다.
- CSP를 설정한다.
- 사용하지 않는 opener 권한과 plugin을 제거한다.

### [중간] T-05. 프로덕션 번들과 설치 자산이 큼

**측정**

- 메인 JS: 1,201.30 kB, gzip 348.86 kB
- `public/` 전체: 111,517,054 bytes, 약 106.35 MiB
- MP3: 약 72.44 MiB
- TTF: 약 26.71 MiB
- WAV: 약 4.26 MiB

**원인**

- `App.tsx`가 `DevOverlay`, `DataBrowser`, `SymbolPoolModal`, `EffectLogOverlay`, `BalanceSimulatorOverlay`를 정적 import하고 항상 마운트한다.
- 중국어 폰트 `NotoSansSC` 하나가 약 16.95 MiB다.
- 참조를 찾지 못한 폰트:
  - `PyeojinGothic-Regular.ttf`: 3.71 MiB
  - `PyeojinGothic-Bold.ttf`: 3.66 MiB
  - `Inter.ttf`: 0.83 MiB
- 참조를 찾지 못한 오디오:
  - `Ancient-Construction.mp3`: 2.16 MiB
  - `Ancient-Game-Open.mp3`: 0.89 MiB
  - `Ancient-Game-Open.ogg`: 1.36 MiB

명확하게 의심되는 미사용 자산만 약 12.6 MiB다.

**권고**

- 개발 도구는 `import.meta.env.DEV` 또는 별도 debug build에서만 동적 import한다.
- 폰트는 실제 사용 문자 subset으로 생성한다.
- 오디오 참조 목록을 manifest로 관리하고 미참조 파일을 CI에서 검출한다.
- 큰 오버레이와 데이터 브라우저는 route/상태 기반 lazy loading을 적용한다.

### [중간] T-06. 존재하지 않는 오디오 파일을 가리키는 cue가 남아 있음

`src/audio/audioCues.ts`가 다음 파일을 참조하지만 `public/audio`에서 찾지 못했다.

- `reel_stop.wav`
- `symbol_activate.wav`
- `combat_hit.wav`
- `symbol_destroy.wav`
- `era_transition.wav`
- `game_over.wav`
- `victory.wav`

이 중 `victory` cue는 등록되지만 실제 승리 화면에서는 `victory_music`만 재생된다. 현재 미사용 경로라서 오류가 숨겨져 있으나, 향후 cue를 연결하면 404/재생 실패가 발생한다.

**권고**

- cue manifest와 실제 파일의 양방향 무결성 테스트를 추가한다.
- 구현 예정이 아니라면 stale cue를 제거한다.

### [중간] T-07. 전역 `Math.random` 교체가 재진입과 병렬 실행에 취약

**근거**

- `src/game/logic/turn/turnPipeline.ts:277-293`
- `src/game/simulation/balanceSimulator.ts:304-308`

두 경로 모두 일시적으로 전역 `Math.random`을 다른 함수로 교체한 뒤 복구한다. 현재 코드가 동기적이라는 전제에서는 작동하지만, 중첩 호출, 병렬 테스트, 비동기 코드 추가 시 다른 시스템의 난수까지 오염시킬 수 있다.

**권고**

- 난수가 필요한 계산 함수에 `rng` 인터페이스를 주입한다.
- 시뮬레이터, 미리보기, 실제 플레이가 같은 계산 코어에 각자 RNG를 전달하게 한다.

### [중간] T-08. 거대 파일과 다중 책임이 회귀 위험을 높임

주요 파일 크기:

- `src/index.css`: 8,570줄
- `src/i18n/index.ts`: 2,526줄
- `src/App.tsx`: 2,078줄
- `src/components/canvas/PixiGameApp.ts`: 1,651줄
- `src/components/KnowledgeUpgradesOverlay.tsx`: 1,355줄
- `src/game/state/actions/turnFlow.ts`: 1,175줄
- `src/audio/audioManager.ts`: 977줄
- `src/components/DataBrowser.tsx`: 952줄

특히 `App.tsx`와 `PixiGameApp`는 수명주기, 오디오, 입력, 개발 도구, 종료 화면, 렌더링 조율을 동시에 가진다. 타이머 취소 누락 같은 문제가 생기기 쉬운 구조다.

**권고**

- 화면 수명주기와 게임 run 수명주기를 별도 controller/hook으로 분리한다.
- 종료 화면, 개발 도구, 오디오 등록을 독립 모듈로 이동한다.
- CSS를 화면/컴포넌트 단위로 분할한다.
- 단순 줄 수 감소가 아니라 책임과 취소 경계를 기준으로 나눈다.

### [중간] T-09. 저장소 쓰기 실패가 게임 동작으로 전파될 수 있음

다음 `localStorage.setItem` 호출은 quota 초과, 브라우저/웹뷰 정책, 손상된 저장소 환경에서 예외를 던질 수 있으나 쓰기 경로에 공통 방어가 없다.

- `src/game/state/saveGame.ts:265`
- `src/game/state/settingsStore.ts:251`
- `src/game/data/leaders.ts:464`
- `src/game/data/demoAchievements.ts:59`
- `src/game/state/preGameStore.ts:26`

**권고**

- 공통 safe storage adapter를 만들고 read/write 결과를 명시적으로 반환한다.
- 게임 턴 저장 실패가 계산 파이프라인을 중단하지 않게 한다.
- 사용자에게 저장 실패를 한 번만 알리는 상태를 둔다.

### [낮음] T-10. 린트 기준선이 깨져 있음

`npm.cmd run lint`가 21개 오류로 실패한다. 주요 유형:

- 항상 거짓인 기존 승리 UI: `App.tsx:1897`
- 미사용 import/변수
- `prefer-const`
- 테스트의 명시적 `any`
- 러시아어 fallback 정규식 경고

린트 실패를 방치하면 새 오류와 기존 오류를 구분하기 어려워지고 CI 품질 게이트로 사용할 수 없다.

## 4. 번역 및 현지화 감사

### 4.1 번역 사전 완전성

영어 키를 기준으로 AST에서 직접 비교한 결과:

| 언어 | 정의된 키 | 영어 기준 누락 키 |
|---|---:|---:|
| 영어 | 924 | 기준 |
| 한국어 | 922 | 3 |
| 중국어 | 895 | 72 |
| 러시아어 | 592 | 349 |

한국어 누락 키:

- `knowledgeUpgrade.symbolDescAfter.13.warrior`
- `knowledgeUpgrade.symbolDescAfter.35.warrior`
- `tribalVillage.aria`

언어별 사전에 영어에 없는 추가 키도 존재한다. 특히 `symbolPool.*` 12개는 중국어와 러시아어에만 있고 영어/한국어 기본 사전에 없다. 단순 키 개수만 비교해서는 발견하기 어려운 구조다.

### [높음] L-01. 영어와 한국어 심볼 풀 창에 번역 키가 그대로 노출됨

`src/components/SymbolPoolModal.tsx`는 다음 키를 fallback 없이 호출한다.

- `symbolPool.title`
- `symbolPool.subtitle`
- `symbolPool.probPerSymbol`
- `symbolPool.id`
- `symbolPool.name`
- `symbolPool.type`
- `symbolPool.probability`
- `symbolPool.empty`
- `symbolPool.sectionSummary`
- `symbolPool.footer`
- 종교 잠금/해제 관련 키

이 키들은 중국어와 러시아어에만 정의되어 있다. 따라서 영어와 한국어에서는 `symbolPool.title` 같은 원시 키가 UI에 표시된다.

**권고**

- 영어를 완전한 기준 사전으로 만들고 한국어에도 모두 추가한다.
- CI에서 "영어 기준 키 누락"뿐 아니라 "다른 언어에만 존재하는 키"도 실패 처리한다.
- `t()` 반환값이 입력 key와 동일한 경우 개발 빌드에서 경고한다.

### [높음] L-02. 영어 사전에 한국어 문자열이 들어 있음

- `src/i18n/index.ts:149`
  - `game.relicShopNewStockHint`의 영어 값이 한국어
- `src/i18n/index.ts:150`
  - `game.relicShopNewStockAria`의 영어 값이 한국어

영어 플레이에서 유물 상점 신규 입고 안내가 한국어로 노출된다.

### [높음] L-03. 러시아어 fallback이 미번역 단어를 삭제하여 의미를 훼손함

`src/i18n/ruFallback.ts:117-123`의 `sanitize()`는 치환 후 남은 모든 라틴 알파벳 단어를 정규식으로 삭제한다.

확인된 예:

- 영어의 "summon barbarian units" 같은 핵심 효과 문구가 번역되지 않으면 단어 전체가 사라지고 숫자만 남을 수 있다.
- 문장은 러시아어 문자만 포함하므로 현재 테스트를 통과하지만, 실제 의미는 불완전하다.

현재 테스트가 "라틴 문자가 남지 않음"을 품질 기준으로 사용하여 의미 손실을 오히려 정상으로 인정하는 문제가 있다.

**권고**

- 영어 문장을 정규식으로 부분 치환하는 fallback을 제거한다.
- 번역이 없으면 완전한 영어 문장을 표시하거나 명시적 미번역 상태를 사용한다.
- 게임 효과 설명은 사람이 검수한 러시아어 번역만 배포한다.
- 테스트를 문자 종류가 아니라 필수 개념/수치/placeholder 보존 중심으로 바꾼다.

### [중간] L-04. 중국어에서 턴 기록 UI가 영어로 표시됨

`src/components/EffectLogOverlay.tsx:117-118`의 텍스트 helper는 `ko`, `ru`, 그 외 `en`만 구분한다. 따라서 `zh`는 필터, 제목, 행동 설명 등에서 영어로 떨어진다.

러시아어 역시 동적으로 조합된 영어 문장이 `RU_TEXT`의 정확한 key와 다르면 영어 fallback이 발생한다.

**권고**

- EffectLog 전용 문자열도 중앙 i18n key로 이동한다.
- 동적 문장은 문장 전체를 조립하지 말고 placeholder 기반 템플릿을 사용한다.

### [중간] L-05. 시대별 설명의 시대 라벨이 모든 언어에서 한국어

- `src/i18n/index.ts:2500`: `ERA_LABELS_KO`
- `src/i18n/index.ts:2522`: 언어와 무관하게 해당 배열을 반환

Data Browser의 시대별 이벤트 설명에서 영어, 중국어, 러시아어 사용자도 `고대/중세/현대` 라벨을 보게 된다.

### [중간] L-06. 데모 업적 난이도와 Steam 찜 버튼이 하드코딩된 영어

- `src/components/DemoStartScreen.tsx:107,110`
  - `section.label`의 `very easy/easy/normal/hard`를 그대로 표시
- `src/components/DemoStartScreen.tsx:340,342`
  - `Wishlist on Steam`, `Wishlist on` 하드코딩
- 완료 체크의 aria-label도 영어 `completed`

기능상 치명적이지 않지만 메인 메뉴/업적 화면의 현지화 완성도를 낮춘다.

### [중간] L-07. 타입이 없는 문자열 키 구조가 누락을 컴파일 단계에서 막지 못함

- `src/i18n/index.ts:68`: `Record<string, string>`
- `src/i18n/index.ts:2491`: `t(key: string, lang: Language)`

오타, 기준 사전 누락, 언어별 독자 키가 모두 TypeScript를 통과한다.

**권고**

- 영어 사전의 `keyof typeof EN_TRANSLATIONS`를 `TranslationKey`로 사용한다.
- 각 언어는 `satisfies Partial<Record<TranslationKey, string>>` 또는 완전 번역 언어에는 전체 `Record`를 적용한다.
- 빌드 전 번역 parity 및 placeholder 일치 검사를 실행한다.

### 번역에서 양호한 점

- 단순 리터럴 번역 문자열의 placeholder 이름 불일치는 발견되지 않았다.
- 한국어는 영어 기준 누락이 3개로 비교적 적다.
- 중국어/러시아어 사전이 분리되어 있어 구조 개선 시 점진적 정리가 가능하다.

## 5. 미사용·구형·중복 코드

### [확정] 진입점에서 도달하지 않는 프로덕션 모듈

`src/main.tsx`에서 정적 import graph를 추적했을 때 다음 세 모듈은 도달하지 않았다.

1. `src/game/data/enemyDefinitions.ts`
   - 현재 시스템과 별개의 구형 단일 적 정의로 보인다.
2. `src/game/logic/symbolEffects/registry.ts`
   - 한 줄 re-export이며 실제 import가 없다.
3. `src/game/state/anchors_temp.ts`
   - 런타임에서 import되지 않는다.

삭제 전에는 외부 스크립트나 수동 참조 여부를 한 번 확인하되, 현재 앱 번들 관점에서는 dead module이다.

### [확정] 연도 앵커 데이터의 완전 중복

- `src/game/state/anchors_temp.ts`
- `src/game/state/gameCalculations.ts:41` 부근의 `TIMELINE_YEAR_ANCHORS`

두 배열의 101개 항목이 동일하다. 더구나 `gameCalculations.ts:40` 주석은 `anchors_temp.ts`가 source of truth라고 쓰지만 실제 런타임은 로컬 복사본을 사용한다.

**권고**

- 하나만 남기고 명확한 데이터 모듈에서 import한다.
- `anchors_temp`라는 임시 이름을 제거한다.

### [확정] 비활성화된 이전 승리 화면

- `src/App.tsx:1897`
  - `phase === 'victory' && false`로 영구 비활성화
- 바로 아래에 현재 승리 화면 구현이 별도로 존재한다.

린트 오류를 만들고 코드 독해를 방해하므로 삭제 대상이다.

### [확정] 사용되지 않는 상수와 무효 API

- `src/game/state/gameStore.ts:64`의 `_CROP_SYMBOL_IDS`
- 같은 영역의 `_ERA_PROBABILITIES_BASE`
- `_ERA_PROBABILITIES_WITH_SPECIAL`
- `src/game/logic/turn/turnPipeline.ts:257`의 `shouldDeferReligionEffect()`
  - 인자를 버리고 항상 `false`를 반환하며 호출처를 찾지 못했다.
- `src/game/logic/turn/postEffectsHooks.ts:103`의 `refreshRelicShop`
  - 해당 함수 안에서는 `false`로 초기화된 뒤 변경되지 않고 반환된다.

underscore로 린트를 피하는 미사용 상수는 의도를 보존하지 못한다. 예정 기능이면 이슈/설계 문서로 옮기고, 런타임 코드에서는 제거하는 편이 낫다.

### [확정] obsolete 번역 데이터

다음 키는 모든 언어 사전에 남아 있으나 런타임 참조를 찾지 못했다.

- `knowledgeUpgrade.obsolete.11.*`
- `knowledgeUpgrade.obsolete.12.*`
- `knowledgeUpgrade.obsolete.13.*`
- `knowledgeUpgrade.obsolete.14.*`

과거 설계를 보관할 목적이면 `DESIGN_REFERENCE.md`나 별도 archive 데이터로 옮기고 실제 번역 사전에서는 제거하는 것이 좋다.

### [확정] stale 오디오 정의와 미참조 자산

T-05, T-06에 기재한 누락 오디오 cue, 미참조 오디오, 미참조 폰트는 빌드/패키징 크기와 유지보수 비용을 동시에 늘린다.

### [정리 권장] 명명 오타가 타입과 테스트에 확산

`horsemansihpPastureBonus` 오타가 상태 타입과 사용처에 퍼져 있다. 동작 오류는 아니지만 저장 데이터나 공개 타입이 더 굳기 전에 migration을 포함해 `horsemanshipPastureBonus`로 정리하는 편이 좋다.

## 6. 테스트 공백

현재 387개 단위 테스트는 강점이지만 다음 경로가 빠져 있다.

1. 위협 표시 중 메인 메뉴/새 게임 전환
2. 소모 유물 사용 직후 reset 및 동일 instance ID 재사용
3. 저장소 쓰기 예외
4. 모든 언어에서 주요 화면 렌더링 시 raw translation key 노출 여부
5. 번역 placeholder 및 필수 개념 보존
6. 오디오 cue와 실제 파일 간 무결성
7. Tauri release profile에서 devtools/CSP/capability 검증
8. 메인 메뉴 → 리더 선택 → 여러 턴 → 식량 납부 → 시대 전환 → 게임 오버/승리의 브라우저 E2E

특히 타이머 문제는 순수 함수 테스트만으로 잡히지 않는다. fake timer를 사용하는 lifecycle 통합 테스트와 최소 1개의 실제 브라우저 smoke test가 필요하다.

## 7. 권장 수정 순서

### P0: 즉시 수정

1. 위협 표시 타이머를 run id/cancel token으로 보호
2. 소모 유물 지연 제거와 ID 재사용 충돌 해소
3. 영어/한국어 `symbolPool.*` 키 추가
4. 영어 사전의 한국어 유물 상점 문자열 수정
5. 러시아어의 파괴적 `sanitize()` fallback 중단
6. 경품 검증이 실제 운영에 쓰인다면 서버 검증 도입 전까지 신뢰하지 않도록 운영 절차 수정

### P1: 출시 전

1. 린트 21건을 0건으로 정리하고 CI gate 설정
2. Tauri release에서 devtools/global API/미사용 opener 제거, CSP 추가
3. 중국어 EffectLog와 시대 라벨, 메인 메뉴 하드코딩 문자열 번역
4. 번역 키 타입화와 parity 테스트 추가
5. 누락 오디오 cue와 미참조 대형 자산 정리
6. 핵심 lifecycle E2E/smoke test 추가

### P2: 구조 개선

1. `App.tsx`, `PixiGameApp`, `turnFlow`, `index.css` 책임 분리
2. RNG 의존성 주입
3. 공통 safe storage adapter 도입
4. 개발 오버레이 lazy loading 및 release 제외
5. dead module, 중복 연도 앵커, obsolete 번역 제거

## 8. 최종 평가

핵심 게임 계산 자체는 테스트 기반이 괜찮고 빌드도 정상이다. 그러나 출시 품질을 좌우하는 경계 영역, 즉 화면 전환과 타이머, 저장소, 번역 완전성, 데스크톱 권한, 패키지 자산 관리가 상대적으로 약하다.

현재 가장 현실적인 장애는 "이전 게임의 비동기 콜백이 다음 게임에 침범하는 문제"와 "사용자에게 원시 번역 키/잘못된 언어가 노출되는 문제"다. 이 둘은 플레이 경험을 직접 손상시키면서도 기존 단위 테스트가 잡지 못한다. P0 항목을 먼저 해결하고 lifecycle 통합 테스트를 붙인 뒤, P1의 출시 보안과 번역 품질 게이트를 적용하는 순서가 적절하다.

