class_name Symbol
extends Resource

enum SymbolType {
	NONE = 0,
	TERRAIN = 1,
	FOOD = 2,
	RESOURCE = 4,
	EVENT = 8,
}

@export var id: int
@export var symbol_name: String
@export var level: int
@export_flags("Terrain", "Food", "Resource", "Event") var type_flags: int
@export var effects: Array[Resource]
@export var effect_text: String
