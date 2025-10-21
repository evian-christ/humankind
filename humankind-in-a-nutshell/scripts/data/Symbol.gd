class_name Symbol
extends Resource

enum Rarity {
	ANCIENT = 1,
	CLASSICAL = 2,
	MEDIEVAL = 3,
	INDUSTRIAL = 4,
	MODERN = 5
}

enum SymbolType {
	FRIENDLY = 0,  # Normal player symbols
	ENEMY = 1,     # Enemy symbols (forced invasion)
	COMBAT = 2     # Combat units (player choice)
}

@export var id: int
@export var symbol_name: String
@export var icon: Texture2D  # 심볼 아이콘 이미지
@export var rarity: int  # 1=ancient, 2=classical, 3=medieval, 4=industrial, 5=modern (0=enemy special)
@export var symbol_type: int = SymbolType.FRIENDLY  # Default to friendly
@export var passive_food: int  # 매턴 기본 식량 생산량
@export var effects: Array  # 특수 효과들 (인접 보너스, 특수 능력 등)
@export var effect_text: String

# Combat stats
@export var base_attack: int = 0  # Attack damage (combat units only)
@export var base_hp: int = 0      # Health points (enemies only)

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