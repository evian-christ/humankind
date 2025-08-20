class_name Symbol
extends Resource

enum Rarity {
	COMMON = 1,
	UNCOMMON = 2,
	RARE = 3,
	SPECIAL = 4,
	HISTORICAL = 5
}

@export var id: int
@export var symbol_name: String
@export var icon: String  # 이모지나 간단한 아이콘
@export var rarity: int  # 1=common, 2=uncommon, 3=rare, 4=special, 5=historical
@export var effects: Array[Dictionary]
@export var effect_text: String

# Rarity를 문자열로 변환하는 헬퍼 함수
func get_rarity_name() -> String:
	match rarity:
		1: return "Common"
		2: return "Uncommon"  
		3: return "Rare"
		4: return "Special"
		5: return "Historical"
		_: return "Unknown"

# Rarity에 따른 색상 반환 (UI용)
func get_rarity_color() -> Color:
	match rarity:
		1: return Color.WHITE  # Common
		2: return Color.GREEN  # Uncommon
		3: return Color.BLUE   # Rare
		4: return Color.PURPLE # Special
		5: return Color.GOLD   # Historical
		_: return Color.GRAY
