class_name BoardRenderer
extends Node

# Handles all visual representation of the game board

const SLOT_SIZE = Vector2(120, 120)
const SLOT_GAP_HORIZONTAL = 12
const SLOT_GAP_VERTICAL = 0
const BORDER_OFFSET = 20  # 배경 이미지 테두리 두께

var grid_container: GridContainer
var background_sprite: Sprite2D
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
	_create_background_sprite(ui_parent)

	print("BoardRenderer: Setup complete")

func _create_background_sprite(parent: Control) -> void:
	background_sprite = Sprite2D.new()

	# Load the background image
	var texture = load("res://assets/sprites/slot_bg.png")
	background_sprite.texture = texture

	print("=== BACKGROUND DEBUG ===")
	print("Texture size: ", texture.get_size())
	print("Parent size: ", parent.size)

	# Sprite2D uses centered positioning by default, disable it for top-left positioning
	background_sprite.centered = false

	# Make sprite independent from parent transform
	background_sprite.top_level = true

	# Calculate grid size (5x4 slots with 100x100 size and gaps)
	var grid_width = game_state_manager.BOARD_WIDTH * SLOT_SIZE.x + (game_state_manager.BOARD_WIDTH - 1) * SLOT_GAP_HORIZONTAL
	var grid_height = game_state_manager.BOARD_HEIGHT * SLOT_SIZE.y + (game_state_manager.BOARD_HEIGHT - 1) * SLOT_GAP_VERTICAL

	# Background has 20px border, so slot area is 1100x790 (1140-40 x 830-40)
	var slot_area_width = 1100.0
	var slot_area_height = 790.0

	# Scale background so that slot area (excluding border) matches grid size
	var scale_x = grid_width / slot_area_width
	var scale_y = grid_height / slot_area_height
	background_sprite.scale = Vector2(scale_x, scale_y)

	# Calculate scaled border size
	var scaled_border = BORDER_OFFSET * scale_x

	# Wait for grid to be positioned, then use its actual position
	parent.add_child(background_sprite)
	await parent.get_tree().process_frame

	# Position: grid global position minus scaled border offset
	var grid_pos = grid_container.global_position
	background_sprite.position = Vector2(grid_pos.x - scaled_border, grid_pos.y - scaled_border)
	background_sprite.z_index = 50

	print("Grid width: ", grid_width)
	print("Grid height: ", grid_height)
	print("Slot area (excluding border): ", slot_area_width, "x", slot_area_height)
	print("BG scale: ", background_sprite.scale)
	print("Scaled border: ", scaled_border)
	print("Grid actual position: ", grid_pos)
	print("BG position: ", background_sprite.position)
	print("BG z_index: ", background_sprite.z_index)
	print("BG actual global_position: ", background_sprite.global_position)
	print("BG actual scale: ", background_sprite.scale)
	print("BG scaled size: ", Vector2(1140, 830) * background_sprite.scale)
	print("BG slot area scaled size: ", Vector2(slot_area_width, slot_area_height) * background_sprite.scale)
	print("======================")

func _create_grid_container(parent: Control) -> void:
	grid_container = GridContainer.new()
	grid_container.columns = game_state_manager.BOARD_WIDTH
	grid_container.z_index = 100
	grid_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	
	grid_container.add_theme_constant_override("h_separation", SLOT_GAP_HORIZONTAL)
	grid_container.add_theme_constant_override("v_separation", SLOT_GAP_VERTICAL)

	# Position grid at center of screen (both horizontal and vertical)
	grid_container.anchors_preset = Control.PRESET_CENTER
	grid_container.anchor_left = 0.5
	grid_container.anchor_top = 0.5
	grid_container.anchor_right = 0.5
	grid_container.anchor_bottom = 0.5

	# Calculate grid size to center it properly
	var grid_width = game_state_manager.BOARD_WIDTH * SLOT_SIZE.x + (game_state_manager.BOARD_WIDTH - 1) * SLOT_GAP_HORIZONTAL
	var grid_height = game_state_manager.BOARD_HEIGHT * SLOT_SIZE.y + (game_state_manager.BOARD_HEIGHT - 1) * SLOT_GAP_VERTICAL
	grid_container.position = Vector2(-grid_width / 2, -grid_height / 2)

	parent.add_child(grid_container)

	# Debug: check grid position after adding
	await parent.get_tree().process_frame
	print("=== GRID DEBUG ===")
	print("Grid position: ", grid_container.position)
	print("Grid global_position: ", grid_container.global_position)
	print("Grid size: ", grid_container.size)
	print("Grid anchor_left: ", grid_container.anchor_left)
	print("==================")

func _create_slots() -> void:
	for i in range(game_state_manager.BOARD_WIDTH * game_state_manager.BOARD_HEIGHT):
		var slot = Panel.new()
		slot.custom_minimum_size = SLOT_SIZE
		slot.mouse_filter = Control.MOUSE_FILTER_IGNORE

		# Make panel background transparent
		var stylebox = StyleBoxEmpty.new()
		slot.add_theme_stylebox_override("panel", stylebox)

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
				# Briefly highlight newly placed symbols
				highlight_slot(x, y, true)

	# Remove highlights after a moment
	await get_tree().create_timer(0.3).timeout
	clear_all_highlights()

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
	var counter_text = ""
	var show_counter = false

	# Combat stats display
	if symbol_definition.symbol_type == Symbol.SymbolType.ENEMY:
		# Show enemy HP
		if symbol_instance.enemy_hp > 0:
			counter_text = "HP: " + str(symbol_instance.enemy_hp)
			show_counter = true
	elif symbol_definition.symbol_type == Symbol.SymbolType.COMBAT:
		# Show remaining attacks × attack power
		if symbol_instance.remaining_attacks > 0:
			counter_text = str(symbol_instance.remaining_attacks) + "×" + str(symbol_instance.attack_power)
			show_counter = true

	# Regular counter for special symbols
	if not show_counter:
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
			counter_text = str(symbol_instance.effect_counter) + "/" + str(counter_max)
			show_counter = true

	if show_counter:
		var counter_label = Label.new()
		counter_label.text = counter_text
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
				# Update counter text based on symbol type
				var counter_text = ""

				if symbol_definition.symbol_type == Symbol.SymbolType.ENEMY:
					# Update enemy HP
					if symbol_instance.enemy_hp > 0:
						counter_text = "HP: " + str(symbol_instance.enemy_hp)
				elif symbol_definition.symbol_type == Symbol.SymbolType.COMBAT:
					# Update combat unit attacks
					if symbol_instance.remaining_attacks > 0:
						counter_text = str(symbol_instance.remaining_attacks) + "×" + str(symbol_instance.attack_power)
				else:
					# Regular counter
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
						counter_text = str(symbol_instance.effect_counter) + "/" + str(counter_max)

				if counter_text != "":
					child.text = counter_text

# Animation functions
func highlight_slot(x: int, y: int, highlighted: bool, color: Color = Color(1.5, 1.5, 1.0)) -> void:
	var slot_index = y * game_state_manager.BOARD_WIDTH + x
	var slot = grid_container.get_child(slot_index)

	if highlighted:
		slot.modulate = color
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
