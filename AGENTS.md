# AGENTS.md

## 필수 수칙
- `git commit`/`git push`는 사용자 명시적 승인 없이 절대 실행하지 않는다.
- 모든 사용자 응답은 반드시 **한국어**로 작성한다.

## 문서 구조
- `DESIGN_REFERENCE.md` — 디자인 기둥, 장기 아이디어, 이벤트/시대 전환 설계안, 심볼 아이디어 보관소.
- `DECK_ARCHITECTURE.md` — 지형 중심 덱 구조, 공통 운영층, 메인 덱 분류, 시대 확장 시 덱이 어떻게 이어지는지에 대한 작업 메모.
- `CODEBASE_DIAGRAM.md` — 현재 코드 구조, 턴 처리 파이프라인, Pixi 렌더러 분할 구조.
- `How_to_add_symbols.md` — 심볼 추가 시 데이터/번역/효과 handler/테스트 체크리스트.

## 프로젝트 개요
- **장르**: 문명 테마 아케이드 로그라이크 슬롯 게임
- **구현**: `humankind-web/` (React + PixiJS + Zustand + TypeScript)
- **보드**: 5×4, 플레이어 보유 심볼을 매 턴마다 랜덤 배치
- **자원**: 식량(생존 비용), 골드, 지식(시대 전환)
- **시대**: Ancient(Lv. 0) → Medieval(Lv. 10) → Modern(Lv. 20) (지식 누적으로 전환)
- **핵심 루프**: 턴 진행 → 심볼 효과 순차 처리 → 심볼 선택 → 10턴마다 식량 납부
- **턴 구현 기준**: 계산 파이프라인과 연출 타임라인을 분리하고, 타이머 콜백은 run id/cancel token으로 보호
- **Pixi 구현 기준**: `PixiGameApp`는 조율자, 실제 렌더링은 `components/canvas/renderers/`의 보드/HUD/유물/업그레이드/플로팅/전투 렌더러가 담당
