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
- `src/components/`: UI 컴포넌트
- `src/i18n/`: 다국어 문자열(심볼/유물/태그 포함)
- `public/assets/`: 스프라이트 및 UI 에셋

## 데이터 브라우저

- 인게임 단축키 **F3**로 심볼/유물/업그레이드 데이터를 조회할 수 있습니다.
