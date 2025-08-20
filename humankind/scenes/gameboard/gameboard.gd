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

# 심볼 선택 관련
var symbol_selection_pool: SymbolSelectionPool
var is_selection_phase: bool = false
var current_symbol_choices: Array[int] = []
@onready var symbol_selection_ui = $"../UI/SymbolSelection"
@onready var choice_buttons = [
	$"../UI/SymbolSelection/SymbolChoices/ChoiceButton1",
	$"../UI/SymbolSelection/SymbolChoices/ChoiceButton2", 
	$"../UI/SymbolSelection/SymbolChoices/ChoiceButton3"
]

# 툴팁 시스템
var tooltip: SymbolTooltip

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
	#addd(22)
	#addd(23)
	#addd(4)
	#addd(1)
	
	_place_symbols_on_board()
	
	_update_food_display()
	
	# 심볼 선택 풀 초기화
	symbol_selection_pool = SymbolSelectionPool.new()
	
	# 심볼 선택 버튼 시그널 연결
	choice_buttons[0].pressed.connect(_on_symbol_choice_selected.bind(0))
	choice_buttons[1].pressed.connect(_on_symbol_choice_selected.bind(1))
	choice_buttons[2].pressed.connect(_on_symbol_choice_selected.bind(2))
	
	# 툴팁 초기화
	tooltip = SymbolTooltip.new()
	ui_node.add_child(tooltip)

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
		var has_counter = _symbol_has_counter_effect(symbol_definition)
		if has_counter:
			var counter_value = _get_symbol_counter_value(symbol_instance, symbol_definition)
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
		var has_variable_food = _symbol_has_variable_food(symbol_definition)
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
		_setup_slot_tooltip(slot, symbol_instance, symbol_definition)


# 심볼 선택 단계 시작
func _start_selection_phase() -> void:
	if is_selection_phase:
		return
	
	is_selection_phase = true
	current_symbol_choices = symbol_selection_pool.select_three_symbols(symbol_data)
	
	# UI 업데이트
	_update_selection_ui()
	symbol_selection_ui.visible = true
	
	print("Selection phase started.")

# 심볼 선택 UI 업데이트
func _update_selection_ui() -> void:
	for i in range(3):
		if i < current_symbol_choices.size():
			var symbol_id = current_symbol_choices[i]
			var symbol_def = symbol_data.get_symbol_by_id(symbol_id)
			if symbol_def:
				var display_text = symbol_def.icon if symbol_def.icon != "" else symbol_def.symbol_name
				choice_buttons[i].text = display_text + "\n" + symbol_def.get_rarity_name()
				choice_buttons[i].disabled = false
				# 아이콘이 있을 때 선택 버튼 폰트 크기 증가
				if symbol_def.icon != "":
					choice_buttons[i].add_theme_font_size_override("font_size", 32)
				
				# Rarity에 따른 버튼 색상 설정
				choice_buttons[i].modulate = symbol_def.get_rarity_color()
				
				# 선택 버튼에 툴팁 설정
				_setup_choice_button_tooltip(choice_buttons[i], symbol_def)
		else:
			choice_buttons[i].text = "Empty"
			choice_buttons[i].disabled = true

# 심볼 선택 처리
func _on_symbol_choice_selected(choice_index: int) -> void:
	if not is_selection_phase or choice_index >= current_symbol_choices.size():
		return
	
	var selected_symbol_id = current_symbol_choices[choice_index]
	add_symbol_to_player(selected_symbol_id)
	
	# 선택 단계 종료
	_end_selection_phase()

# 심볼 선택 단계 종료
func _end_selection_phase() -> void:
	is_selection_phase = false
	current_symbol_choices.clear()
	symbol_selection_ui.visible = false
	print("Selection phase ended")

# 슬롯 툴팁 설정
func _setup_slot_tooltip(slot: Panel, symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol):
	# 슬롯을 마우스 감지 가능하게 설정
	slot.mouse_filter = Control.MOUSE_FILTER_PASS
	
	# 마우스 이벤트 연결
	if not slot.mouse_entered.is_connected(_on_slot_mouse_entered):
		slot.mouse_entered.connect(_on_slot_mouse_entered.bind(symbol_definition))
	if not slot.mouse_exited.is_connected(_on_slot_mouse_exited):
		slot.mouse_exited.connect(_on_slot_mouse_exited)

# 슬롯에 마우스 진입 시
func _on_slot_mouse_entered(symbol_definition: Symbol):
	var mouse_pos = get_global_mouse_position()
	tooltip.show_tooltip(symbol_definition.symbol_name, symbol_definition.effect_text, mouse_pos)

# 슬롯에서 마우스 나갈 시
func _on_slot_mouse_exited():
	tooltip.hide_tooltip()

# 마우스 움직임 추적 (툴팁 위치 업데이트)
func _input(event):
	if event is InputEventMouseMotion and tooltip.visible:
		tooltip.update_position(get_global_mouse_position())

# 선택 버튼 툴팁 설정
func _setup_choice_button_tooltip(button: Button, symbol_definition: Symbol):
	# 기존 연결 해제 (중복 방지)
	if button.mouse_entered.is_connected(_on_choice_button_mouse_entered):
		button.mouse_entered.disconnect(_on_choice_button_mouse_entered)
	if button.mouse_exited.is_connected(_on_choice_button_mouse_exited):
		button.mouse_exited.disconnect(_on_choice_button_mouse_exited)
	
	# 새로운 연결
	button.mouse_entered.connect(_on_choice_button_mouse_entered.bind(symbol_definition))
	button.mouse_exited.connect(_on_choice_button_mouse_exited)

# 선택 버튼에 마우스 진입 시
func _on_choice_button_mouse_entered(symbol_definition: Symbol):
	var mouse_pos = get_global_mouse_position()
	tooltip.show_tooltip(symbol_definition.symbol_name, symbol_definition.effect_text, mouse_pos)

# 선택 버튼에서 마우스 나갈 시
func _on_choice_button_mouse_exited():
	tooltip.hide_tooltip()

func _process_symbol_interactions() -> void:
	var total_food_gained = 0
	var total_exp_gained = 0
	var symbols_to_remove = []  # Track symbols that need to be removed
	
	for x in range(BOARD_WIDTH):
		for y in range(BOARD_HEIGHT):
			var current_symbol_instance = board_grid[x][y]
			if current_symbol_instance != null:
				var symbol_definition = symbol_data.get_symbol_by_id(current_symbol_instance.type_id)
				
				var effect_result = EffectProcessor.process_symbol_effects(
					current_symbol_instance,
					symbol_definition,
					x, y,
					board_grid,
					symbol_data,
					self
				)
				
				total_food_gained += effect_result.get("food", 0)
				total_exp_gained += effect_result.get("exp", 0)
				
				# Mark for removal if needed
				if effect_result.get("remove_self", false):
					symbols_to_remove.append(current_symbol_instance)
	
	# Remove symbols from player_symbols
	for symbol_to_remove in symbols_to_remove:
		remove_symbol_from_player(symbol_to_remove)
	
	food_amount += total_food_gained
	_update_food_display()
	_update_counter_displays()
				
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
	
	# 심볼 상호작용 후 선택 단계 시작
	_start_selection_phase()
	
func _update_food_display():
	if food_amount_label:
		food_amount_label.text = "Food: " + str(food_amount)

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
	for effect in symbol_definition.effects:
		var condition_dict = effect.get("condition", {})
		var condition_type = condition_dict.get("type", 0)
		
		# Check if symbol has COUNTER_TRIGGER or COMBINED_CONDITION
		if condition_type == 2 or condition_type == 3:  # COUNTER_TRIGGER or COMBINED_CONDITION
			return true
	return false

func _get_symbol_counter_value(symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol) -> int:
	for effect in symbol_definition.effects:
		var condition_dict = effect.get("condition", {})
		var condition_type = condition_dict.get("type", 0)
		
		if condition_type == 2 or condition_type == 3:  # COUNTER_TRIGGER or COMBINED_CONDITION
			var params = condition_dict.get("params", {})
			var counter_name = params.get("counter_name", "turn_count")
			return symbol_instance.state_data.get(counter_name, 0)
	
	return 0

func _symbol_has_variable_food(symbol_definition: Symbol) -> bool:
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
					
					var has_counter = _symbol_has_counter_effect(symbol_definition)
					if has_counter:
						var counter_value = _get_symbol_counter_value(symbol_instance, symbol_definition)
						counter_label.text = str(counter_value)
						counter_label.visible = true
					else:
						counter_label.visible = false
				
				# Update food production label (should be the third child)
				if slot.get_child_count() >= 3:
					var food_label = slot.get_child(2)
					
					var has_variable_food = _symbol_has_variable_food(symbol_definition)
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
	
