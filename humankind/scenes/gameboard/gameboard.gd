extends Node2D

# Board properties
const BOARD_WIDTH = 5
const BOARD_HEIGHT = 4
const SLOT_SIZE = Vector2(100, 100)
const SLOT_GAP = 1

# For slot placement
var grid_container

# Player owned symbols
var player_symbols: Array[PlayerSymbolInstance] = []

# Board grid
var board_grid: Array = []

# Get SymbolData
@onready var symbol_data = get_node("/root/SymbolData")

func _ready() -> void:
	_initialise_board_grid()
	
	grid_container = GridContainer.new()
	grid_container.columns = BOARD_WIDTH
	
	grid_container.add_theme_constant_override("h_separation", SLOT_GAP)
	grid_container.add_theme_constant_override("v_separation", SLOT_GAP)
	
	add_child(grid_container)
	
	for i in range(BOARD_WIDTH * BOARD_HEIGHT):
		var slot = Panel.new()
		slot.custom_minimum_size = SLOT_SIZE
		grid_container.add_child(slot)
	
	# adding initial symbols to player symbols
	var river_instance = symbol_data.create_player_symbol_instance(1)
	var mountain_instance = symbol_data.create_player_symbol_instance(2)
	player_symbols.append(river_instance)
	player_symbols.append(mountain_instance)
	
	#print("Created instance for symbol type: ", river_instance.type_id, ". instance_id: ", river_instance.instance_id)
	
	_place_symbols_on_board()

# Initialise board grid	
func _initialise_board_grid() -> void:
	board_grid.resize(BOARD_WIDTH)
	for x in range(BOARD_WIDTH):
		board_grid[x] = []
		board_grid[x].resize(BOARD_HEIGHT)
		for y in range(BOARD_HEIGHT):
			board_grid[x][y] = null
			
func _place_symbols_on_board() -> void:
	var available_slots = []
	for i in range(BOARD_WIDTH * BOARD_HEIGHT):
		available_slots.append(i)
	available_slots.shuffle()
	
	var symbols_to_place: Array[PlayerSymbolInstance]
	
	if player_symbols.size() > BOARD_WIDTH * BOARD_HEIGHT:
		var shuffled_player_symbols = player_symbols.duplicate()
		shuffled_player_symbols.shuffle()
		symbols_to_place = shuffled_player_symbols.slice(0, BOARD_WIDTH * BOARD_HEIGHT)
	else:
		symbols_to_place = player_symbols
	
	for i in range(symbols_to_place.size()):
		var symbol_instance: PlayerSymbolInstance = symbols_to_place[i]
		var symbol_definition: Symbol = symbol_data.get_symbol_by_id(symbol_instance.type_id)
		
		var current_slot_index = available_slots[i]
		
		var x = current_slot_index % BOARD_WIDTH
		var y = current_slot_index / BOARD_WIDTH
		
		board_grid[x][y] = symbol_instance
		
		var slot = grid_container.get_child(current_slot_index)
		
		var label = Label.new()
		label.text = symbol_definition.symbol_name
		label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		
		slot.add_child(label)
