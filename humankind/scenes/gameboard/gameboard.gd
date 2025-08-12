extends Node2D

const BOARD_WIDTH = 5
const BOARD_HEIGHT = 4
const SLOT_SIZE = Vector2(100, 100)
const SLOT_GAP = 1

var grid_container

var player_symbols: Array[PlayerSymbolInstance] = []

@onready var symbol_data = get_node("/root/SymbolData")

func _ready() -> void:
	grid_container = GridContainer.new()
	grid_container.columns = BOARD_WIDTH
	
	grid_container.add_theme_constant_override("h_separation", SLOT_GAP)
	grid_container.add_theme_constant_override("v_separation", SLOT_GAP)
	
	add_child(grid_container)
	
	for i in range(BOARD_WIDTH * BOARD_HEIGHT):
		var slot = Panel.new()
		slot.custom_minimum_size = SLOT_SIZE
		grid_container.add_child(slot)
	
	var river_instance = symbol_data.create_player_symbol_instance(1)
	player_symbols.append(river_instance)
	
	print("Created instance for symbol type: ", river_instance.type_id, ". instance_id: ", river_instance.instance_id)
