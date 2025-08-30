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
var food_amount: int = 200  # Start with enough food for first 2 payments
var player_level: int = 1
var current_exp: int = 0
var exp_to_next_level: int = 50
var current_turn: int = 0
@onready var food_amount_label = $"../UI/PlayerStats/FoodLabel"
@onready var exp_label = $"../UI/PlayerStats/ExpLabel"
@onready var level_label = $"../UI/PlayerStats/LevelLabel"
var turn_label: Label

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
	
	# Create TurnLabel dynamically
	turn_label = Label.new()
	turn_label.text = "Turn: 0"
	turn_label.offset_top = 75.0
	turn_label.offset_right = 100.0
	turn_label.offset_bottom = 98.0
	var player_stats = $"../UI/PlayerStats"
	if player_stats:
		player_stats.add_child(turn_label)
	
	# Initialize components
	tooltip_manager = TooltipManager.new(ui_node, self)
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
	add_symbol_to_player(22)
	
	_place_symbols_on_board()
	_update_food_display()
	_update_exp_display()
	_update_turn_display()


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
		
		# Show HP for Barbarian, counter for other symbols
		if symbol_definition.id == 22:  # Barbarian - show HP with heart
			if symbol_instance.current_hp > 0:
				counter_label.text = "❤️" + str(symbol_instance.current_hp)
				counter_label.add_theme_font_size_override("font_size", 12)
				counter_label.visible = true
			else:
				counter_label.visible = false
		else:
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


# 마우스 움직임 추적 (툴팁 위치 업데이트) 및 디버그 키보드 입력
func _input(event):
	if event is InputEventMouseMotion:
		tooltip_manager.handle_mouse_motion(get_global_mouse_position())
	elif event is InputEventKey and event.pressed:
		if event.keycode == KEY_1:
			# Debug: Add Barbarian
			add_symbol_to_player(22)
			print("Debug: Added Barbarian")
		elif event.keycode == KEY_S:
			# Debug: Refresh symbol selection (show 3 new choices)
			symbol_selection_manager.refresh_symbol_choices()
			print("Debug: Refreshed symbol selection")
		elif event.keycode == KEY_2:
			# Debug: Add Warrior
			add_symbol_to_player(23)
			print("Debug: Added Warrior")

func _process_symbol_interactions() -> void:
	await _process_symbol_interactions_visual()

# Visual feedback version of symbol interactions processing
func _process_symbol_interactions_visual() -> void:
	var total_food_gained = 0
	var total_exp_gained = 0
	
	# Update turn counters for all symbols first
	effects_processor.update_all_turn_counters(board_grid)
	
	# Process each symbol individually with visual feedback
	for x in range(5):
		for y in range(4):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null:
				# Highlight current symbol being processed
				_highlight_symbol_slot(x, y, true)
				
				# Process this symbol's effect
				var symbol_definition = SymbolData.get_symbol_by_id(symbol_instance.type_id)
				if symbol_definition != null:
					var results = effects_processor.process_single_symbol_effect(symbol_instance, symbol_definition, x, y, board_grid, current_turn)
					var food_gained = results.get("food", 0)
					var exp_gained = results.get("exp", 0)
					
					total_food_gained += food_gained
					total_exp_gained += exp_gained
					
					# Show effect feedback if there was any effect
					if food_gained > 0 or exp_gained > 0:
						_show_effect_feedback(x, y, food_gained, exp_gained)
						await get_tree().create_timer(0.15).timeout
				
				# Remove highlight
				_highlight_symbol_slot(x, y, false)
				await get_tree().create_timer(0.05).timeout
	
	# Execute any delayed destructions (e.g., from Revolution)
	var delayed_results = effects_processor.execute_delayed_destructions(board_grid)
	total_food_gained += delayed_results.get("food", 0)
	total_exp_gained += delayed_results.get("exp", 0)
	
	if delayed_results.get("destroyed", 0) > 0:
		print("Delayed destructions completed: +", delayed_results.get("food", 0), " food, +", delayed_results.get("exp", 0), " exp from ", delayed_results.get("destroyed", 0), " destroyed symbols")
		# Show floating text for each destroyed symbol at its position
		var destruction_details = delayed_results.get("details", [])
		for detail in destruction_details:
			var x = detail.x
			var y = detail.y
			var food_gained = detail.food
			var exp_gained = detail.exp
			var symbol_name = detail.symbol_name
			
			# Show floating text at the destroyed symbol's position
			if food_gained > 0 or exp_gained > 0:
				print("Showing destruction effect for ", symbol_name, " at [", x, ",", y, "]: +", food_gained, " food, +", exp_gained, " exp")
				_create_floating_text(x, y, food_gained, exp_gained)
		
		# Update visual board after destructions
		_update_board_visuals()
	
	# Apply total gains
	food_amount += total_food_gained
	if total_exp_gained > 0:
		add_exp(total_exp_gained)
	
	_update_food_display()
	_update_counter_displays()

# Highlight a symbol slot during processing
func _highlight_symbol_slot(x: int, y: int, highlight: bool) -> void:
	var slot_index = y * 5 + x
	var slot = grid_container.get_child(slot_index)
	if highlight:
		slot.modulate = Color(1.5, 1.5, 1.0)  # Yellow tint
	else:
		slot.modulate = Color.WHITE

# Show effect feedback for processed symbol
func _show_effect_feedback(x: int, y: int, food: int, exp: int) -> void:
	var feedback_text = ""
	if food != 0:
		var sign = "+" if food > 0 else ""
		feedback_text += sign + str(food) + " Food"
	if exp > 0:
		if feedback_text != "":
			feedback_text += ", "
		feedback_text += "+" + str(exp) + " Exp"
	
	if feedback_text != "":
		print("Position [", x, ",", y, "]: ", feedback_text)
		_create_floating_text(x, y, food, exp)

# Update visual board to match board_grid (remove destroyed symbols)
func _update_board_visuals() -> void:
	for x in range(5):
		for y in range(4):
			var slot_index = y * 5 + x
			var slot = grid_container.get_child(slot_index)
			
			# If board_grid position is null, clear the visual slot
			if board_grid[x][y] == null:
				for child in slot.get_children():
					child.queue_free()
				# Clear tooltip
				tooltip_manager.clear_slot_tooltip(slot)
			# If there's a symbol in board_grid but not in visual slot, add it
			elif slot.get_child_count() == 0 and board_grid[x][y] != null:
				var symbol_instance = board_grid[x][y]
				var symbol_definition = SymbolData.get_symbol_by_id(symbol_instance.type_id)
				if symbol_definition != null:
					var symbol_label = _create_symbol_label(symbol_definition)
					slot.add_child(symbol_label)
					tooltip_manager.setup_slot_tooltip(slot, symbol_instance, symbol_definition)

# Helper function to create symbol label (extracted from existing code)
func _create_symbol_label(symbol_definition: Symbol) -> Label:
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
	return label

# Create floating text effect for symbol production
func _create_floating_text(x: int, y: int, food: int, exp: int) -> void:
	var slot_index = y * 5 + x
	var slot = grid_container.get_child(slot_index)
	
	# Get slot's global position
	var slot_global_pos = slot.global_position
	var slot_center = slot_global_pos + SLOT_SIZE / 2
	
	# Create food floating text first if any
	if food != 0:
		var sign = "+" if food > 0 else ""
		var color = Color.LIGHT_GREEN if food > 0 else Color.RED
		_create_single_floating_text(slot_center, sign + str(food), color, Vector2(0, -60))
	
	# Create exp floating text with delay if any
	if exp > 0:
		var delay = 0.2 if food != 0 else 0.0  # Delay if food text is also shown
		_create_single_floating_text_delayed(slot_center, "+" + str(exp) + " EXP", Color.CYAN, Vector2(0, -60), delay)

# Create a single floating text with animation
func _create_single_floating_text(start_pos: Vector2, text: String, color: Color, move_offset: Vector2) -> void:
	var floating_label = Label.new()
	floating_label.text = text
	floating_label.position = start_pos
	floating_label.modulate = color
	floating_label.add_theme_font_size_override("font_size", 24)
	floating_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	floating_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	floating_label.size = Vector2(100, 30)
	floating_label.position.x -= floating_label.size.x / 2  # Center horizontally
	floating_label.position.y -= floating_label.size.y / 2  # Center vertically
	
	# Add to UI node so it appears on top
	ui_node.add_child(floating_label)
	
	# Create tween for animation
	var tween = create_tween()
	tween.set_parallel(true)  # Allow multiple animations simultaneously
	
	# Move upward
	var end_pos = floating_label.position + move_offset
	tween.tween_property(floating_label, "position", end_pos, 1.0).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUART)
	
	# Fade out
	tween.tween_property(floating_label, "modulate:a", 0.0, 1.0).set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_QUART).set_delay(0.3)
	
	# Scale effect (grow then shrink slightly)
	floating_label.scale = Vector2(0.8, 0.8)
	tween.tween_property(floating_label, "scale", Vector2(1.2, 1.2), 0.2).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	tween.tween_property(floating_label, "scale", Vector2(1.0, 1.0), 0.3).set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_BACK).set_delay(0.2)
	
	# Remove label after animation
	tween.tween_callback(floating_label.queue_free).set_delay(1.2)

# Create a single floating text with delay
func _create_single_floating_text_delayed(start_pos: Vector2, text: String, color: Color, move_offset: Vector2, delay: float) -> void:
	# Wait for the delay, then create the floating text
	await get_tree().create_timer(delay).timeout
	_create_single_floating_text(start_pos, text, color, move_offset)
				
func _on_spin_button_pressed() -> void:
	# Increment turn counter
	current_turn += 1
	_update_turn_display()
	
	# Check for food payment every 10 turns
	if current_turn % 10 == 0:
		var food_cost = calculate_food_cost(current_turn)
		if food_amount >= food_cost:
			food_amount -= food_cost
			_update_food_display()
			print("Turn ", current_turn, ": Paid ", food_cost, " food. Remaining: ", food_amount)
		else:
			# Game Over - not enough food
			print("GAME OVER: Not enough food to pay upkeep cost of ", food_cost, ". You had ", food_amount, " food.")
			_game_over()
			return
	
	# remove symbols in slots and clear tooltips
	for slot in grid_container.get_children():
		# 툴팁 연결 해제
		tooltip_manager.clear_slot_tooltip(slot)
		# 자식 노드들 제거
		for child in slot.get_children():
			child.queue_free()
			
	# reset board grid
	_initialise_board_grid()
	
	await get_tree().create_timer(0.15).timeout
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

func _update_turn_display():
	if turn_label:
		var next_payment_turn = ((current_turn / 10) + 1) * 10
		var turns_until_payment = next_payment_turn - current_turn
		turn_label.text = "Turn: " + str(current_turn) + " (Payment in " + str(turns_until_payment) + " turns)"

# Calculate food cost based on turn number
func calculate_food_cost(turn: int) -> int:
	var payment_cycle = turn / 10  # Which payment cycle (1st, 2nd, 3rd, etc.)
	return 100 + (payment_cycle - 1) * 50  # 100, 150, 200, 250, 300...

# Handle game over
func _game_over():
	print("Game Over! You survived ", current_turn, " turns.")
	# Disable the spin button or show game over UI
	# For now, just stop the game
	get_tree().paused = true

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
	var new_symbol_instance = symbol_data.create_player_symbol_instance(symbol_id, current_turn)
	player_symbols.append(new_symbol_instance)
	print("Added new symbol to player: ", symbol_data.get_symbol_by_id(symbol_id).symbol_name, " at turn ", current_turn)

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
					
					# Update HP for Barbarian, counter for other symbols
					if symbol_definition.id == 22:  # Barbarian - show HP with heart
						if symbol_instance.current_hp > 0:
							counter_label.text = "❤️" + str(symbol_instance.current_hp)
							counter_label.add_theme_font_size_override("font_size", 12)
							counter_label.visible = true
						else:
							counter_label.visible = false
					else:
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
