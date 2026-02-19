# CLAUDE.md

## 필수 수칙
- `git commit`/`git push`는 사용자 명시적 승인 없이 절대 실행하지 않는다.
- 모든 사용자 응답은 반드시 **한국어**로 작성한다.

## 문서 구조
- `DESIGN_REFERENCE.md` — 디자인 기둥, 장기 아이디어, 이벤트/시대 전환 설계안, 심볼 아이디어 보관소.

## 프로젝트 개요
- **장르**: 문명 테마 아케이드 로그라이크 슬롯 게임
- **구현**: `humankind-web/` (React + PixiJS + Zustand + TypeScript)
- **보드**: 5×4, 플레이어 보유 심볼을 매 스핀마다 랜덤 배치
- **자원**: 식량(생존 비용), 골드, 지식(시대 전환)
- **시대**: Ancient → Classical → Medieval → Industrial → Modern (지식 누적으로 전환)
- **핵심 루프**: Spin → 심볼 효과 순차 처리 → 심볼 선택 → 10턴마다 식량 납부
