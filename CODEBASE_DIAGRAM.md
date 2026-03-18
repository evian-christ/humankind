# HUMANKIND 코드베이스 비주얼 다이어그램

문명 테마 아케이드 로그라이크 슬롯 게임 코드베이스의 구조와 데이터 흐름을 다이어그램으로 정리했습니다.

---

## 1. 프로젝트 구조 (폴더/모듈)

```mermaid
flowchart TB
    subgraph root["humankind (루트)"]
        CLAUDE["CLAUDE.md"]
        DESIGN["DESIGN_REFERENCE.md"]
        HOW["How_to_add_symbols.md"]
    end

    subgraph web["humankind-web/"]
        subgraph entry["진입점"]
            main["main.tsx"]
            index["index.html"]
        end
        subgraph src["src/"]
            App["App.tsx"]
            i18n["i18n/"]
            subgraph components["components/"]
                GameCanvas["GameCanvas.tsx"]
                PixiGameApp["canvas/PixiGameApp.ts"]
                AssetLoader["canvas/AssetLoader.ts"]
                SymbolSelection["SymbolSelection.tsx"]
                RelicSelection["RelicSelection.tsx"]
                UpgradeSelection["UpgradeSelection.tsx"]
                DestroySelection["DestroySelection.tsx"]
                PauseMenu["PauseMenu.tsx"]
                DevOverlay["DevOverlay.tsx"]
                DataBrowser["DataBrowser.tsx"]
                SymbolPoolModal["SymbolPoolModal.tsx"]
                EffectLogOverlay["EffectLogOverlay.tsx"]
                EffectText["EffectText.tsx"]
                NotificationPanel["NotificationPanel.tsx"]
                RelicBar["RelicBar.tsx"]
            end
            subgraph game["game/"]
                subgraph state["state/"]
                    gameStore["gameStore.ts"]
                    relicStore["relicStore.ts"]
                    settingsStore["settingsStore.ts"]
                    notificationStore["notificationStore.ts"]
                end
                subgraph data["data/"]
                    symbolDefinitions["symbolDefinitions.ts"]
                    symbolCandidates["symbolCandidates.ts"]
                    relicDefinitions["relicDefinitions.ts"]
                    relicCandidates["relicCandidates.ts"]
                    knowledgeUpgrades["knowledgeUpgrades.ts"]
                    knowledgeUpgradeCandidates["knowledgeUpgradeCandidates.ts"]
                    enemyDefinitions["enemyDefinitions.ts"]
                end
                subgraph logic["logic/"]
                    symbolEffects["symbolEffects.ts"]
                end
                types["types/index.ts"]
            end
        end
        public["public/assets/"]
    end

    main --> App
    App --> GameCanvas
    App --> components
    GameCanvas --> PixiGameApp
    PixiGameApp --> gameStore
    PixiGameApp --> AssetLoader
```

---

## 2. 아키텍처 개요 (레이어 관계)

```mermaid
flowchart LR
    subgraph UI["UI 레이어"]
        App["App.tsx"]
        GameCanvas["GameCanvas"]
        Overlays["Overlays\n(Symbol/Relic/Upgrade/Destroy)"]
        Menus["Menus\n(Pause, DataBrowser, Dev)"]
    end

    subgraph Rendering["렌더링"]
        PixiGameApp["PixiGameApp\n(PixiJS)"]
        AssetLoader["AssetLoader"]
    end

    subgraph State["상태 (Zustand)"]
        gameStore["gameStore"]
        relicStore["relicStore"]
        settingsStore["settingsStore"]
        notificationStore["notificationStore"]
    end

    subgraph GameLogic["게임 로직"]
        symbolEffects["symbolEffects.ts"]
    end

    subgraph Data["정적 데이터"]
        symbolDef["symbolDefinitions"]
        relicDef["relicDefinitions"]
        knowledgeUpgrades["knowledgeUpgrades"]
    end

    App --> GameCanvas
    App --> Overlays
    App --> Menus
    GameCanvas --> PixiGameApp
    PixiGameApp --> gameStore
    PixiGameApp --> settingsStore
    Overlays --> gameStore
    Overlays --> relicStore
    gameStore --> symbolEffects
    gameStore --> symbolDef
    gameStore --> relicDef
    gameStore --> knowledgeUpgrades
    symbolEffects --> symbolDef
```

---

## 3. 게임 페이즈 흐름 (Core Loop)

```mermaid
stateDiagram-v2
    [*] --> idle: 초기화

    idle --> spinning: 턴 버튼 (spinBoard)

    spinning --> processing: 릴 정지 후 보드 확정

    processing --> processing: 심볼별 효과 순차 처리\n(phase1→phase2→phase3)

    processing --> game_over: 식량 부족
    processing --> victory: 승리 조건
    processing --> upgrade_selection: 지식 레벨업
    processing --> selection: 턴 종료 (선택 단계)

    upgrade_selection --> selection: 업그레이드 선택 완료

    selection --> destroy_selection: 파괴 트리거 시
    selection --> idle: 심볼 선택 완료

    destroy_selection --> selection: 파괴 선택 완료

    game_over --> [*]: 재시작
    victory --> [*]: 재시작
```

---

## 4. 스토어와 컴포넌트 데이터 흐름

```mermaid
flowchart TB
    subgraph Stores["Zustand 스토어"]
        GS["gameStore\n(food, gold, knowledge,\nboard, phase, turn,\nspinBoard, selectSymbol...)"]
        RS["relicStore\n(유물 인스턴스, 상점)"]
        SS["settingsStore\n(언어, 효과속도, 해상도)"]
        NS["notificationStore\n(알림 큐)"]
    end

    subgraph ReadWrite["읽기/쓰기"]
        GameCanvas["GameCanvas"]
        SymbolSel["SymbolSelection"]
        RelicSel["RelicSelection"]
        UpgradeSel["UpgradeSelection"]
        DestroySel["DestroySelection"]
        SpinBtn["턴 버튼"]
    end

    GameCanvas --> GS
    GameCanvas --> RS
    GameCanvas --> SS
    SymbolSel --> GS
    RelicSel --> GS
    RelicSel --> RS
    UpgradeSel --> GS
    DestroySel --> GS
    SpinBtn --> GS
```

---

## 5. 게임 로직 파이프라인 (processing 단계)

```mermaid
flowchart LR
    subgraph Input["입력"]
        Board["보드 5×4\nPlayerSymbolInstance[][]"]
        Relics["보유 유물\nActiveRelicEffects"]
    end

    subgraph Logic["symbolEffects.ts"]
        processSingle["processSingleSymbolEffects()"]
        EffectResult["EffectResult\n(food, gold, knowledge,\nspawn, destroy...)"]
    end

    subgraph Data["데이터 참조"]
        SymbolDef["symbolDefinitions"]
    end

    subgraph Output["gameStore 반영"]
        Apply["자원 누적\n보드 변경\n파괴/스폰"]
    end

    Board --> processSingle
    Relics --> processSingle
    processSingle --> SymbolDef
    processSingle --> EffectResult
    EffectResult --> Apply
```

---

## 6. 핵심 타입/엔티티 관계

```mermaid
erDiagram
    GameState ||--o{ PlayerSymbolInstance : "board"
    GameState ||--o{ GameEventLogEntry : "eventLog"
    GameState }o-- KnowledgeUpgrade : "선택된 업그레이드"
    SymbolDefinition ||--o{ PlayerSymbolInstance : "definition"
    RelicDefinition ||--o{ RelicInstance : "relicStore"
    processSingleSymbolEffects ||.. SymbolDefinition : "참조"
    processSingleSymbolEffects ||.. ActiveRelicEffects : "참조"

    GameState {
        number food
        number gold
        number knowledge
        number turn
        string phase
        array board
    }

    PlayerSymbolInstance {
        SymbolDefinition definition
        string instanceId
        number effect_counter
        boolean is_marked_for_destruction
    }

    SymbolDefinition {
        number id
        string name
        number symbolType
        number food
        number gold
        number knowledge
    }
```

---

## 7. 파일별 역할 요약

| 영역 | 파일 | 역할 |
|------|------|------|
| **진입** | `main.tsx`, `App.tsx` | React 루트, 레이아웃, 오버레이 조합 |
| **렌더** | `GameCanvas.tsx`, `PixiGameApp.ts`, `AssetLoader.ts` | PixiJS 보드·릴·이펙트·애니메이션 |
| **상태** | `gameStore.ts` | 게임 상태, 턴/페이즈, spinBoard·선택 로직 |
| **상태** | `relicStore.ts` | 유물 인스턴스, 상점 열기/새로고침 |
| **상태** | `settingsStore.ts` | 언어, 효과/스핀 속도, 해상도 |
| **상태** | `notificationStore.ts` | 인게임 알림 |
| **로직** | `symbolEffects.ts` | 심볼별 효과 계산 (인접, 유물 연동) |
| **데이터** | `symbolDefinitions.ts`, `symbolCandidates.ts` | 심볼 정의·후보 |
| **데이터** | `relicDefinitions.ts`, `relicCandidates.ts` | 유물 정의·후보 |
| **데이터** | `knowledgeUpgrades.ts`, `knowledgeUpgradeCandidates.ts` | 지식 업그레이드 |
| **타입** | `types/index.ts` | PlayerSymbolInstance 등 공용 타입 |

---

*이 문서는 코드베이스 탐색 결과를 바탕으로 생성되었습니다. 실제 코드와 차이가 있으면 소스为准로 하세요.*
