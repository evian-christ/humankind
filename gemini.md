## Godot 프로젝트 개발 계획

**Godot Version:** 4.4.1.stable

**게임 장르:** 문명 테마의 심볼-슬롯 기반 자원 최적화 4x 덱 빌딩 로그라이크
**핵심 시스템:** 슬롯 기반 심볼 무작위 배치 + 심볼 조합으로 자원(식량) 생산
**게임 목적:** 매 턴 슬롯에 무작위 배치되는 보유 슬롯들을 전략적으로 추가해 덱을 만들어나가며 식량을 쌓으며 문명을 발전 및 최종 게임 승리 목표에 도달.
**테마:** 문명 시리즈  기반. 테마적 연상은 있으나 심볼과 구조는 창의적이고 추상적인 방식으로 설계.

- 본 게임은 턴제이고, 매턴 기본적인 흐름이 정해져있음. 플레이어 턴 -> 플레이어가 슬롯을 스핀 -> 플레이어 소유 심볼들이 무작위로 슬롯에 배치됨 -> 각 배치된 심볼들의 각 규칙에 따라 서로 상호작용하고 심볼 효과들 발생 -> 플레이어는 심볼 풀에서 3개 중 하나 선택하여 소유 심볼에 추가 -> 반복
- 슬롯 보드는 가로 5칸, 세로 4칸으로 총 20개의 심볼이 배치될 수 있음. 플레이어 소유 심볼이 20개 보다 낮을 경우, 심볼이 배치되고 남은 슬롯은 빈 슬롯이 됨. 플레이어 소유 심볼이 20개 보다 많은 경우, 소유 심볼 중 무작위로 선정된 20개만 무작위로 배치가 됨. 이 경우 배치 되지 않은 심볼들은 효과 등 발동하지 않고 변화 없음.
- 각 심볼은 정해진 효과에 따라 다른 심볼과 상호작용함. 일반적으로 상호작용은 해당 심볼의 주변 심볼(nearby)(인접한 8개의 슬롯에 위치한 심볼)과 하게 됨.

**CRITICAL INSTRUCTION: INCREMENTAL CODE GUIDANCE AND EXPLANATION**
- **Incremental Code Guidance:** Do not provide full code blocks directly. Instead, guide the user step-by-step, explaining the purpose and contribution of each part.
- **Code Construction (Incremental Learning):** When providing code, especially for new features or complex logic, build it incrementally. Start with the basic structure, explain each part, and add functionality step-by-step, rather than providing a complete block of code for the user to copy-paste. Focus on explaining *why* each part is needed and *how* it contributes to the overall solution.
- **Language:** All responses must be in Korean.

### Instructions

사용자 요청 시, Git 변경점 파악 후, 기능/작업 별로 커밋 및 푸시.

사용자가 개발을 이끌어나가는 것이 원칙. 사용자가 질문하지 않는 이상 새로운 방향을 제시하거나 다음 스텝을 미리 제시하지 않을것.

