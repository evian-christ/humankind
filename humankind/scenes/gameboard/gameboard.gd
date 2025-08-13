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
# Player stats
var food_amount: int = 0
@onready var food_amount_label = $"../UI/PlayerStats/FoodLabel"

# Board grid
var board_grid: Array = []

# Get SymbolData
@onready var symbol_data = get_node("/root/SymbolData")
@onready var ui_node = $"../UI"

func _ready() -> void:
	_initialise_board_grid()
	
	grid_container = GridContainer.new()
	grid_container.columns = BOARD_WIDTH
	
	grid_container.add_theme_constant_override("h_separation", SLOT_GAP)
	grid_container.add_theme_constant_override("v_separation", SLOT_GAP)
	
	ui_node.add_child(grid_container)
	
	for i in range(BOARD_WIDTH * BOARD_HEIGHT):
		var slot = Panel.new()
		slot.custom_minimum_size = SLOT_SIZE
		grid_container.add_child(slot)
	
	# adding initial symbols to player symbols
	var river_instance = symbol_data.create_player_symbol_instance(1)
	var mountain_instance = symbol_data.create_player_symbol_instance(2)
	var wild_berries_instance = symbol_data.create_player_symbol_instance(9)
	player_symbols.append(river_instance)
	player_symbols.append(mountain_instance)
	player_symbols.append(wild_berries_instance)
	
	_place_symbols_on_board()
	
	print("food_amount_label: ", food_amount_label)
	print("UI 노드 존재: ", get_node("../UI") if has_node("../UI") else "없음")
	print("FoodDisplay 존재: ", get_node("../UI/FoodDisplay") if has_node("../UI/FoodDisplay") else "없음")
	
	_update_food_display()

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

func _process_symbol_interactions() -> void:
	var total_food_gained = 0
	
	for x in range(BOARD_WIDTH):
		for y in range(BOARD_HEIGHT):
			var current_symbol_instance = board_grid[x][y]
			if current_symbol_instance != null:
				var symbol_definition = symbol_data.get_symbol_by_id(current_symbol_instance.type_id)
				
				var food_gained = EffectProcessor.process_symbol_effects(
					current_symbol_instance,
					symbol_definition,
					x, y,
					board_grid,
					symbol_data
				)
				
				total_food_gained += food_gained
	
	food_amount += total_food_gained
	_update_food_display()
	
	if total_food_gained > 0:
		print("총 식량 획득: ", total_food_gained)
				
func _get_nearby_coordinates(cx: int, cy: int) -> Array[Vector2i]:
	var nearby_coords: Array[Vector2i] = []
	
	for dx in range(-1, 2):
		for dy in range(-1, 2):
			if dx == 0 and dy == 0:
				continue
			
			var nx = cx + dx
			var ny = cy + dy
			
			if nx >= 0 and nx < BOARD_WIDTH and ny >= 0 and ny < BOARD_HEIGHT:
				nearby_coords.append(Vector2i(nx, ny))
	return nearby_coords

func _on_spin_button_pressed() -> void:
	# remove symbols in slots
	for slot in grid_container.get_children():
		for child in slot.get_children():
			child.queue_free()
			
	# reset board grid
	_initialise_board_grid()
	
	await get_tree().create_timer(0.3).timeout
	# place new symbols on board grid and slots
	_place_symbols_on_board()
	
	_process_symbol_interactions()
	
func _update_food_display():
	if food_amount_label:
		food_amount_label.text = "Food: " + str(food_amount)
	
