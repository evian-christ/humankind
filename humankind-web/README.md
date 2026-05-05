# humankind-web

React + PixiJS + Zustand + TypeScript 기반의 `Humankind` 웹/데스크톱(Tauri) 클라이언트입니다.

## 실행

### 웹(개발)

```bash
npm install
npm run dev
```

- 기본 포트: `5173` (strict port)

### 웹(빌드/프리뷰)

```bash
npm run build
npm run preview
```

### 데스크톱(Tauri)

```bash
npm run tauri:dev
```

```bash
npm run tauri:build
```

## 프로젝트 구조(요약)

- `src/game/`: 게임 데이터/로직/상태(Zustand)
- `src/game/state/actions/`: 턴 진행, 선택, 유물 상점, 보드 상호작용 등 store 액션
- `src/game/logic/turn/`: 턴 준비, 계산 파이프라인, 전투, 후처리, 턴 종료 판정
- `src/game/logic/symbolEffects/handlers/`: 심볼 효과 handler
- `src/game/simulation/`: 게임 내 밸런스 시뮬레이터 계산 로직
- `src/components/`: UI 컴포넌트
- `src/components/canvas/PixiGameApp.ts`: Pixi 앱 생명주기와 렌더 순서 조율
- `src/components/canvas/renderers/`: 보드/HUD/유물/업그레이드/플로팅/전투 렌더러
- `src/i18n/`: 다국어 문자열(심볼/유물/태그 포함)
- `public/assets/`: 스프라이트 및 UI 에셋

## 턴/렌더링 구조

- 턴 계산 결과와 연출 타임라인은 분리되어 있습니다.
- `turnPipeline.ts`는 슬롯 효과 계산과 누적 결과를 담당합니다.
- `turnPresentationTimeline.ts`는 효과 속도별 연출 지연 계획을 담당합니다.
- `turnRunScheduler.ts`는 `setTimeout` 콜백에 run id/cancel token을 붙여 이전 턴 run의 콜백이 실행되지 않도록 합니다.
- Pixi 렌더링은 `renderers/` 클래스 단위로 분할되어 있고, `PixiGameApp`는 조율자 역할을 합니다.

## 데이터 브라우저

- 인게임 단축키 **F3**로 심볼/유물/업그레이드 데이터를 조회할 수 있습니다.

## 밸런스 시뮬레이터

- 게임 안에서 **F6**을 누르면 전용 밸런스 시뮬레이터 창을 열 수 있습니다.
- `RUN`을 누를 때마다 새 seed로 다시 실행되며, 마지막 실행 번호와 seed가 결과와 함께 표시됩니다.
- 자동 플레이어는 초원/평원/바다/숲/열대우림/사막/산 축 중 하나를 목표로 삼아 해당 지형, 핵심 파츠, 브릿지 파츠, 관련 업그레이드를 우선 선택합니다.
- 현재 시뮬레이터는 유물 구매와 수동 파괴 선택을 단순화한 기준선 분석 도구입니다. 핵심 턴 준비, 슬롯 효과, 전투, 식량 납부, 심볼 선택, 지식 업그레이드 로직은 기존 게임 로직을 재사용합니다.
