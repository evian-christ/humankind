# Humankind in a Nutshell

문명 테마의 아케이드 로그라이크 슬롯 게임. Godot 4.5.1 기반이며, 슬롯을 돌려 플레이어가 보유한 심볼을 5x4 보드에 무작위 배치하고, 실시간 상호작용을 통해 식량·골드·경험치를 획득합니다.

## 필수 수칙
- 사용자 허락 없이 `git commit`/`git push` 금지.
- 모든 사용자 응답은 반드시 한국어로 작성.

## 빠른 시작
1. Godot 에디터로 `humankind-in-a-nutshell/project.godot` 열기.
2. F5(전체 실행) 또는 플레이 버튼으로 게임 실행.
3. 특정 씬 테스트는 F6 사용.
4. 빌드 스크립트 불필요, Godot 에디터가 단일 진입점.

## 현재 문서 구조
| 문서 | 용도 |
| --- | --- |
| `README.md` (본 문서) | 온보딩, 규칙, 디렉터리/시스템 개요 |
| `SYSTEM_OVERVIEW.md` | 구현된 시스템 상세, 자원/전투 흐름, 로드맵 |
| `DESIGN_REFERENCE.md` | 장기 디자인 방향, 시너지 아이디어, 레퍼런스 자료 |
| `EARLY_ACCESS_PLAN.md` | 얼리액세스 출시를 위한 구체적 실행 계획 |

기존 `AGENTS.md`, `CLAUDE.md`, `CoreGameplay.md`, `GAME_DESIGN_REFERENCE.md` 내용은 각각 위 구조로 통합·재배치되었습니다.

## 프로젝트 개요
- **장르**: 아케이드 로그라이크 슬롯
- **보드**: 메인 슬롯 5×4(20칸) + 서브 슬롯 1×3(3칸). 메인은 식량/전투 중심, 서브는 환경 이벤트·랜덤 트리거용.
- **자원**: 식량(생존 비용), 골드(경제·상점 예정), 경험치/레벨(심볼 언락 확률에 영향), 유물(패시브 빌드 정의).
- **심볼**: `data/symbols/*.tres` 리소스가 단일 소스. `SymbolData` 싱글톤이 로드, `PlayerSymbolInstance`로 인스턴스화.
- **핵심 싱글톤**: `GameController`(플로우), `GameStateManager`(상태/리소스/보드), `BoardRenderer`, `UIManager`, `SymbolEffectsProcessor`.
- **턴 흐름**: Spin → 메인/서브 슬롯 랜덤 배치 → 전투 → 효과 처리/파괴 → 선택 페이즈 → (레벨업 시) 유물 선택 → 생존 비용 체크.

## 디렉터리 개요
```
.
├── README.md
├── SYSTEM_OVERVIEW.md
├── DESIGN_REFERENCE.md
├── humankind-in-a-nutshell/
│   ├── project.godot
│   ├── scenes/
│   │   └── main/gameboard.tscn
│   ├── scripts/
│   │   ├── core/ (GameController, GameStateManager, SymbolData)
│   │   ├── components/ (SymbolEffectsProcessor, SymbolSelectionManager)
│   │   ├── ui/ (UIManager, BoardRenderer, DebugBorder)
│   │   └── data/ (Symbol, PlayerSymbolInstance)
│   ├── data/symbols/ (37개 tres 리소스)
│   └── assets/
│       ├── sprites/slot_bg.png
│       └── sprites/Symbols/*.png
├── AGENTS.md (요약 수칙 및 README 링크)
├── CLAUDE.md (영문 요약 및 README 링크)
└── 기타 히스토릭 문서
```

## 주요 시스템 스냅샷
- **심볼 분류**: 농업, 산업, 종교, 전투(플레이어), 적, 정착지 진화, 탐험, 경제, 숲, 환경(서브 슬롯) 시스템.
- **서브 슬롯(환경 슬롯)**: 1×3 패시브 트랙. 매 Spin 시 함께 굴러가며 카운터 기반 이벤트(예: 야만인 침략, 자연재해, 황금기)를 준비하고 0이 되면 효과를 메인 슬롯에 투입.
- **전투**: Combat 심볼이 인접 Enemy에 공격력/남은 횟수만큼 피해. Enemy는 HP가 0 되면 파괴되고 보드/컬렉션에서 제거.
- **파괴 처리**: 특정 심볼(물고기, 항해, 숲 등)은 `is_marked_for_destruction` 플래그로 표시 후 단계별 처리.
- **자원 흐름**: 매 10턴마다 식량 지불(100 → 150 → 200 …). 골드/EXP는 UI에 즉시 반영되며, EXP는 레벨업 및 희귀도 가중치에 영향.
- **심볼 선택**: 턴 종료 후 가중치 기반으로 3개 제시, 플레이어가 1개 선택해 컬렉션에 추가.
- **유물 시스템**: 레벨업할 때마다 심볼 선택 직후 유물 선택 페이즈가 열리며, 획득한 유물은 영구 패시브로 덱 방향성을 결정.

세부 구현과 남은 과제는 `SYSTEM_OVERVIEW.md`, 장기 디자인 컨셉은 `DESIGN_REFERENCE.md`를 참고하세요.
