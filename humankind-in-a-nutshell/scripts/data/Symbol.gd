class_name Symbol
extends Resource

enum Rarity {
	ANCIENT = 1,
	CLASSICAL = 2,
	MEDIEVAL = 3,
	INDUSTRIAL = 4,
	MODERN = 5
}

@export var id: int
@export var symbol_name: String
@export var icon: String  # 이모지나 간단한 아이콘
@export var rarity: int  # 1=ancient, 2=classical, 3=medieval, 4=industrial, 5=modern
@export var passive_food: int  # 매턴 기본 식량 생산량
@export var effects: Array  # 특수 효과들 (인접 보너스, 특수 능력 등)
@export var effect_text: String

# Rarity를 문자열로 변환하는 헬퍼 함수
func get_rarity_name() -> String:
	match rarity:
		1: return "Ancient"
		2: return "Classical"  
		3: return "Medieval"
		4: return "Industrial"
		5: return "Modern"
		_: return "Unknown"

# Rarity에 따른 색상 반환 (UI용)
func get_rarity_color() -> Color:
	match rarity:
		1: return Color.WHITE  # Ancient
		2: return Color.GREEN  # Classical
		3: return Color.BLUE   # Medieval
		4: return Color.PURPLE # Industrial
		5: return Color.GOLD   # Modern
		_: return Color.GRAY