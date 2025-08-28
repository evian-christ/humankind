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
var player_level: int = 1
var current_exp: int = 0
var exp_to_next_level: int = 50
@onready var food_amount_label = $"../UI/PlayerStats/FoodLabel"
@onready var exp_label = $"../UI/PlayerStats/ExpLabel"
@onready var level_label = $"../UI/PlayerStats/LevelLabel"

# Board grid
var board_grid: Array = []

# Get SymbolData
@onready var symbol_data = get_node("/root/SymbolData")
@onready var ui_node = $"../UI"

# Component references
var tooltip_manager: TooltipManager
var symbol_selection_manager: SymbolSelectionManager
var effects_processor: SymbolEffectsProcessor

# UI references
@onready var symbol_selection_ui = $"../UI/SymbolSelection"
@onready var choice_buttons = [
	$"../UI/SymbolSelection/SymbolChoices/ChoiceButton1",
	$"../UI/SymbolSelection/SymbolChoices/ChoiceButton2", 
	$"../UI/SymbolSelection/SymbolChoices/ChoiceButton3"
]

func _ready() -> void:
	_initialise_board_grid()
	
	# Initialize components
	tooltip_manager = TooltipManager.new(ui_node)
	add_child(tooltip_manager)
	
	effects_processor = SymbolEffectsProcessor.new(symbol_data)
	effects_processor.symbol_added_to_player.connect(add_symbol_to_player)
	effects_processor.symbols_destroyed_at_positions.connect(_on_symbols_destroyed)
	effects_processor.symbol_removed_from_player.connect(remove_symbol_from_player)
	add_child(effects_processor)
	
	symbol_selection_manager = SymbolSelectionManager.new(symbol_data, tooltip_manager)
	symbol_selection_manager.set_gameboard_reference(self)
	symbol_selection_manager.symbol_selected.connect(add_symbol_to_player)
	symbol_selection_manager.setup_ui(symbol_selection_ui, choice_buttons)
	add_child(symbol_selection_manager)
	
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
	#addd(4)
	addd(10)
	addd(3)
	addd(3)
	addd(3)
	addd(3)
	addd(3)
	addd(3)
	addd(3)
	
	_place_symbols_on_board()
	_update_food_display()
	_update_exp_display()

func addd(type_id: int) -> void:
	player_symbols.append(symbol_data.create_player_symbol_instance(type_id))

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
		# 아이콘이 있으면 아이콘 사용, 없으면 심볼 이름 사용
		var display_text = symbol_definition.icon if symbol_definition.icon != "" else symbol_definition.symbol_name
		label.text = display_text
		label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		# 아이콘이 있을 때 폰트 크기 증가
		if symbol_definition.icon != "":
			label.add_theme_font_size_override("font_size", 48)
		
		slot.add_child(label)
		
		# Add counter label for symbols with counters (bottom-right)
		var counter_label = Label.new()
		counter_label.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
		counter_label.offset_left -= 30
		counter_label.offset_top -= 20
		counter_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		counter_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		counter_label.custom_minimum_size = Vector2(20, 15)
		
		# Show counter for symbols that have counter-based effects
		var has_counter = effects_processor.symbol_has_counter_effect(symbol_definition)
		if has_counter:
			var counter_value = effects_processor.get_symbol_counter_value(symbol_instance, symbol_definition)
			counter_label.text = str(counter_value)
			counter_label.visible = true
		else:
			counter_label.visible = false
		
		slot.add_child(counter_label)
		
		# Add food production label for symbols with variable food production (bottom-left)
		var food_label = Label.new()
		food_label.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
		food_label.offset_left += 5
		food_label.offset_top -= 20
		food_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		food_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		food_label.custom_minimum_size = Vector2(25, 15)
		
		# Show food production for symbols with base_food_per_turn variable
		var has_variable_food = effects_processor.symbol_has_variable_food(symbol_definition)
		if has_variable_food:
			# Different default values for different symbols
			var default_value = 1
			if symbol_instance.type_id == 16:  # Sheep ID
				default_value = 0
			var food_per_turn = symbol_instance.state_data.get("base_food_per_turn", default_value)
			food_label.text = "+" + str(food_per_turn)
			food_label.visible = true
		else:
			food_label.visible = false
		
		slot.add_child(food_label)
		
		# 슬롯에 마우스 이벤트 추가 (툴팁용)
		tooltip_manager.setup_slot_tooltip(slot, symbol_instance, symbol_definition)


# 마우스 움직임 추적 (툴팁 위치 업데이트)
func _input(event):
	if event is InputEventMouseMotion:
		tooltip_manager.handle_mouse_motion(get_global_mouse_position())

func _process_symbol_interactions() -> void:
	var results = effects_processor.process_symbol_interactions(board_grid)
	var total_food_gained = results.get("food", 0)
	var total_exp_gained = results.get("exp", 0)
	
	food_amount += total_food_gained
	if total_exp_gained > 0:
		add_exp(total_exp_gained)
	
	_update_food_display()
	_update_counter_displays()
				
func _on_spin_button_pressed() -> void:
	# remove symbols in slots and clear tooltips
	for slot in grid_container.get_children():
		# 툴팁 연결 해제
		tooltip_manager.clear_slot_tooltip(slot)
		# 자식 노드들 제거
		for child in slot.get_children():
			child.queue_free()
			
	# reset board grid
	_initialise_board_grid()
	
	await get_tree().create_timer(0.3).timeout
	# place new symbols on board grid and slots
	_place_symbols_on_board()
	
	# Update placement counter for Banana effect (only on spin, not initial placement)
	_update_placement_counters()
	
	_process_symbol_interactions()
	
	# 매턴 기본 EXP 지급
	add_exp(1)
	
	# 심볼 상호작용 후 선택 단계 시작
	symbol_selection_manager.start_selection_phase()
	
func _update_food_display():
	if food_amount_label:
		food_amount_label.text = "Food: " + str(food_amount)

func _update_exp_display():
	if exp_label:
		exp_label.text = "EXP: " + str(current_exp) + "/" + str(exp_to_next_level)
	if level_label:
		level_label.text = "Level: " + str(player_level)

func get_exp_requirement(level: int) -> int:
	return 50 + (level - 1) * 25  # 50, 75, 100, 125, 150...

func add_exp(amount: int) -> void:
	current_exp += amount
	
	while current_exp >= exp_to_next_level and player_level < 10:
		current_exp -= exp_to_next_level
		player_level += 1
		exp_to_next_level = get_exp_requirement(player_level)
		print("Level Up! Now level: " + str(player_level))
	
	_update_exp_display()

func get_symbol_probabilities() -> Dictionary:
	var probabilities = {}
	match player_level:
		1:
			probabilities = {1: 100, 2: 0, 3: 0, 4: 0, 5: 0}
		2:
			probabilities = {1: 85, 2: 15, 3: 0, 4: 0, 5: 0}
		3:
			probabilities = {1: 70, 2: 30, 3: 0, 4: 0, 5: 0}
		4:
			probabilities = {1: 55, 2: 35, 3: 10, 4: 0, 5: 0}
		5:
			probabilities = {1: 45, 2: 35, 3: 20, 4: 0, 5: 0}
		6:
			probabilities = {1: 35, 2: 35, 3: 25, 4: 5, 5: 0}
		7:
			probabilities = {1: 25, 2: 35, 3: 30, 4: 10, 5: 0}
		8:
			probabilities = {1: 20, 2: 30, 3: 35, 4: 15, 5: 0}
		9:
			probabilities = {1: 15, 2: 25, 3: 35, 4: 22, 5: 3}
		10:
			probabilities = {1: 10, 2: 20, 3: 30, 4: 20, 5: 20}
	return probabilities

func add_symbol_to_player(symbol_id: int):
	var new_symbol_instance = symbol_data.create_player_symbol_instance(symbol_id)
	player_symbols.append(new_symbol_instance)
	print("Added new symbol to player: ", symbol_data.get_symbol_by_id(symbol_id).symbol_name)

func remove_symbol_from_player(symbol_instance: PlayerSymbolInstance):
	var symbol_name = symbol_data.get_symbol_by_id(symbol_instance.type_id).symbol_name
	var index = player_symbols.find(symbol_instance)
	if index != -1:
		player_symbols.remove_at(index)
		print("Removed symbol from player: ", symbol_name)
	else:
		print("Warning: Could not find symbol to remove: ", symbol_name)

func _symbol_has_counter_effect(symbol_definition: Symbol) -> bool:
	if symbol_definition == null:
		return false
	for effect in symbol_definition.effects:
		var condition_dict = effect.get("condition", {})
		var condition_type = condition_dict.get("type", 0)
		
		# Check if symbol has COUNTER_TRIGGER or COMBINED_CONDITION
		if condition_type == 2 or condition_type == 3:  # COUNTER_TRIGGER or COMBINED_CONDITION
			return true
	return false

func _get_symbol_counter_value(symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol) -> int:
	if symbol_definition == null:
		return 0
	for effect in symbol_definition.effects:
		var condition_dict = effect.get("condition", {})
		var condition_type = condition_dict.get("type", 0)
		
		if condition_type == 2 or condition_type == 3:  # COUNTER_TRIGGER or COMBINED_CONDITION
			var params = condition_dict.get("params", {})
			var counter_name = params.get("counter_name", "turn_count")
			return symbol_instance.state_data.get(counter_name, 0)
	
	return 0

func _symbol_has_variable_food(symbol_definition: Symbol) -> bool:
	if symbol_definition == null:
		return false
	for effect in symbol_definition.effects:
		var effect_dict = effect.get("effect", {})
		var params = effect_dict.get("params", {})
		var variable_name = params.get("variable_name", "")
		
		if variable_name == "base_food_per_turn":
			return true
	return false

func _update_counter_displays():
	for x in range(BOARD_WIDTH):
		for y in range(BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null:
				var slot_index = y * BOARD_WIDTH + x
				var slot = grid_container.get_child(slot_index)
				var symbol_definition = symbol_data.get_symbol_by_id(symbol_instance.type_id)
				
				# Update counter label (should be the second child)
				if slot.get_child_count() >= 2:
					var counter_label = slot.get_child(1)
					
					var has_counter = effects_processor.symbol_has_counter_effect(symbol_definition)
					if has_counter:
						var counter_value = effects_processor.get_symbol_counter_value(symbol_instance, symbol_definition)
						counter_label.text = str(counter_value)
						counter_label.visible = true
					else:
						counter_label.visible = false
				
				# Update food production label (should be the third child)
				if slot.get_child_count() >= 3:
					var food_label = slot.get_child(2)
					
					var has_variable_food = effects_processor.symbol_has_variable_food(symbol_definition)
					if has_variable_food:
						# Different default values for different symbols
						var default_value = 1
						if symbol_instance.type_id == 16:  # Sheep ID
							default_value = 0
						var food_per_turn = symbol_instance.state_data.get("base_food_per_turn", default_value)
						food_label.text = "+" + str(food_per_turn)
						food_label.visible = true
					else:
						food_label.visible = false

# Update placement counters for all symbols on board (called only on spin)
func _update_placement_counters():
	for x in range(BOARD_WIDTH):
		for y in range(BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null:
				var placement_count = symbol_instance.state_data.get("placement_count", 0)
				symbol_instance.state_data["placement_count"] = placement_count + 1

# UI 업데이트 시그널 핸들러
func _on_symbols_destroyed(positions: Array):
	for pos in positions:
		var slot_index = pos.y * BOARD_WIDTH + pos.x
		var slot = grid_container.get_child(slot_index)
		for child in slot.get_children():
			child.queue_free()
