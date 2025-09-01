class_name BoardRenderer
extends Node

# Handles all visual representation of the game board

const SLOT_SIZE = Vector2(100, 100)
const SLOT_GAP = 1

var grid_container: GridContainer
var game_state_manager: GameStateManager
var symbol_data: SymbolData

# Animation state
var highlighted_slots: Dictionary = {}  # slot_index -> bool

func _init():
	symbol_data = SymbolData

func setup(ui_parent: Control, state_manager: GameStateManager) -> void:
	game_state_manager = state_manager
	_create_grid_container(ui_parent)
	_create_slots()
	
	print("BoardRenderer: Setup complete")

func _create_grid_container(parent: Control) -> void:
	grid_container = GridContainer.new()
	grid_container.columns = game_state_manager.BOARD_WIDTH
	grid_container.z_index = 100
	grid_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	
	grid_container.add_theme_constant_override("h_separation", SLOT_GAP)
	grid_container.add_theme_constant_override("v_separation", SLOT_GAP)
	
	# Position grid at top center
	grid_container.anchors_preset = Control.PRESET_TOP_WIDE
	grid_container.anchor_left = 0.5
	grid_container.anchor_right = 0.5
	grid_container.position = Vector2(-250, 50)  # Center horizontally, top margin
	
	parent.add_child(grid_container)

func _create_slots() -> void:
	for i in range(game_state_manager.BOARD_WIDTH * game_state_manager.BOARD_HEIGHT):
		var slot = Panel.new()
		slot.custom_minimum_size = SLOT_SIZE
		slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		grid_container.add_child(slot)

func render_board() -> void:
	_clear_all_slots()
	
	var board_state = game_state_manager.get_board_state()
	var board_grid = board_state["board_grid"]
	
	for x in range(board_state["width"]):
		for y in range(board_state["height"]):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null:
				_render_symbol_at_position(x, y, symbol_instance)

func _clear_all_slots() -> void:
	for slot in grid_container.get_children():
		for child in slot.get_children():
			child.queue_free()

func _render_symbol_at_position(x: int, y: int, symbol_instance: PlayerSymbolInstance) -> void:
	var slot_index = y * game_state_manager.BOARD_WIDTH + x
	var slot = grid_container.get_child(slot_index)
	
	var symbol_definition = symbol_data.get_symbol_by_id(symbol_instance.type_id)
	if symbol_definition == null:
		print("BoardRenderer: Warning - Symbol definition not found for ID: ", symbol_instance.type_id)
		return
	
	# Create symbol display
	var symbol_label = _create_symbol_label(symbol_definition)
	slot.add_child(symbol_label)
	
	# Add counter display if needed
	_add_counter_display(slot, symbol_instance, symbol_definition)

func _create_symbol_label(symbol_definition: Symbol) -> Label:
	var label = Label.new()
	var display_text = symbol_definition.icon if symbol_definition.icon != "" else symbol_definition.symbol_name
	label.text = display_text
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	
	# Center the label in the slot
	label.anchors_preset = Control.PRESET_FULL_RECT
	label.anchor_left = 0
	label.anchor_top = 0
	label.anchor_right = 1
	label.anchor_bottom = 1
	label.offset_left = 0
	label.offset_top = 0
	label.offset_right = 0
	label.offset_bottom = 0
	
	# Make emoji larger
	label.add_theme_font_size_override("font_size", 48)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	
	return label

func _add_counter_display(slot: Panel, symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol) -> void:
	# Only show counter for symbols that need it
	var needs_counter = false
	var counter_max = 0
	
	match symbol_definition.id:
		1:  # Wheat
			needs_counter = true
			counter_max = 6
		2:  # Rice
			needs_counter = true
			counter_max = 8
		3:  # Fish
			needs_counter = true
			counter_max = 5
		5:  # Banana
			needs_counter = true
			counter_max = 10
	
	if needs_counter:
		var counter_label = Label.new()
		counter_label.text = str(symbol_instance.effect_counter) + "/" + str(counter_max)
		counter_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		counter_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		
		# Position in bottom-right corner
		counter_label.anchors_preset = Control.PRESET_BOTTOM_RIGHT
		counter_label.anchor_left = 0.6
		counter_label.anchor_top = 0.6
		counter_label.anchor_right = 1.0
		counter_label.anchor_bottom = 1.0
		counter_label.offset_left = 0
		counter_label.offset_top = 0
		counter_label.offset_right = 0
		counter_label.offset_bottom = 0
		
		# Style the counter
		counter_label.add_theme_font_size_override("font_size", 12)
		counter_label.add_theme_color_override("font_color", Color.WHITE)
		counter_label.add_theme_color_override("font_shadow_color", Color.BLACK)
		counter_label.add_theme_constant_override("shadow_offset_x", 1)
		counter_label.add_theme_constant_override("shadow_offset_y", 1)
		counter_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		
		slot.add_child(counter_label)

func update_symbol_counter(x: int, y: int, symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol) -> void:
	var slot_index = y * game_state_manager.BOARD_WIDTH + x
	var slot = grid_container.get_child(slot_index)
	
	# Find the counter label (should be the second child after symbol label)
	if slot.get_child_count() > 1:
		for child in slot.get_children():
			if child is Label and child != slot.get_child(0):  # Not the main symbol label
				# Update counter text
				var counter_max = 0
				match symbol_definition.id:
					1:  # Wheat
						counter_max = 6
					2:  # Rice
						counter_max = 8
					3:  # Fish
						counter_max = 5
					5:  # Banana
						counter_max = 10
				
				if counter_max > 0:
					child.text = str(symbol_instance.effect_counter) + "/" + str(counter_max)

# Animation functions
func highlight_slot(x: int, y: int, highlighted: bool) -> void:
	var slot_index = y * game_state_manager.BOARD_WIDTH + x
	var slot = grid_container.get_child(slot_index)
	
	if highlighted:
		slot.modulate = Color(1.5, 1.5, 1.0)  # Yellow tint
		highlighted_slots[slot_index] = true
	else:
		slot.modulate = Color.WHITE
		highlighted_slots.erase(slot_index)

func clear_all_highlights() -> void:
	for slot_index in highlighted_slots.keys():
		var slot = grid_container.get_child(slot_index)
		slot.modulate = Color.WHITE
	highlighted_slots.clear()

# Visual effects for gameplay
func show_processing_effect(x: int, y: int, duration: float = 0.15) -> void:
	# No visual effects - minimal approach
	pass

func clear_board() -> void:
	_clear_all_slots()

func animate_board_clear() -> void:
	clear_board()

func animate_symbol_placement() -> void:
	# No animation - immediate placement
	pass

# Utility functions
func get_slot_global_position(x: int, y: int) -> Vector2:
	var slot_index = y * game_state_manager.BOARD_WIDTH + x
	var slot = grid_container.get_child(slot_index)
	return slot.global_position + SLOT_SIZE / 2

func get_grid_container() -> GridContainer:
	return grid_container

func is_valid_position(x: int, y: int) -> bool:
	return x >= 0 and x < game_state_manager.BOARD_WIDTH and y >= 0 and y < game_state_manager.BOARD_HEIGHT

# Floating text system
func show_floating_text(x: int, y: int, text: String, color: Color = Color.YELLOW) -> void:
	var slot_position = get_slot_global_position(x, y)
	
	# Create floating text label
	var floating_label = Label.new()
	floating_label.text = text
	floating_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	floating_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	floating_label.position = slot_position - Vector2(50, 25)  # Center above slot
	floating_label.size = Vector2(100, 50)
	floating_label.z_index = 1000  # Above everything else
	
	# Style the text
	floating_label.add_theme_font_size_override("font_size", 20)
	floating_label.add_theme_color_override("font_color", color)
	floating_label.add_theme_color_override("font_shadow_color", Color.BLACK)
	floating_label.add_theme_constant_override("shadow_offset_x", 1)
	floating_label.add_theme_constant_override("shadow_offset_y", 1)
	
	# Add to UI parent (not grid_container to avoid layout issues)
	var ui_parent = grid_container.get_parent()
	ui_parent.add_child(floating_label)
	
	# Animate the floating text
	var tween = create_tween()
	tween.set_parallel(true)
	
	# Float upward
	tween.tween_property(floating_label, "position:y", floating_label.position.y - 30, 1.0)
	# Fade out
	tween.tween_property(floating_label, "modulate:a", 0.0, 1.0)
	
	# Remove after animation
	await tween.finished
	floating_label.queue_free()
