class_name SymbolSelectionManager
extends Node

signal symbol_selected(symbol_id: int)
signal reroll_requested()

var symbol_data: SymbolData
var gameboard_ref: Node

# Selection state
var is_selection_phase: bool = false
var current_symbol_choices: Array = []
var reroll_cost: int = 5

# UI components
var selection_overlay: Control
var card_container: HBoxContainer
var choice_cards: Array = []
var reroll_button: Button

func _init(symbol_data_ref: SymbolData):
	symbol_data = symbol_data_ref

func set_gameboard_reference(gb_ref: Node):
	gameboard_ref = gb_ref

func create_selection_ui(parent: Control):
	# Create overlay that covers entire screen
	selection_overlay = Control.new()
	selection_overlay.name = "SymbolSelectionOverlay"
	selection_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	selection_overlay.visible = false
	selection_overlay.z_index = 4096  # Maximum allowed z-index
	selection_overlay.mouse_filter = Control.MOUSE_FILTER_STOP  # Block mouse events to lower layers
	
	# Semi-transparent background
	var bg = ColorRect.new()
	bg.color = Color(0, 0, 0, 0.7)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP  # Also block mouse events
	selection_overlay.add_child(bg)
	
	# Use CenterContainer to properly center everything
	var center_container = CenterContainer.new()
	center_container.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	# Main VBox to hold skip button, cards, and reroll
	var main_vbox = VBoxContainer.new()
	main_vbox.add_theme_constant_override("separation", 20)

	# Buttons container (Skip & Reroll)
	var buttons_hbox = HBoxContainer.new()
	buttons_hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	buttons_hbox.add_theme_constant_override("separation", 50)

	# Skip button (DEBUG)
	var skip_button = Button.new()
	skip_button.text = "SKIP (DEBUG)"
	skip_button.custom_minimum_size = Vector2(200, 40)
	skip_button.pressed.connect(_on_skip_button_pressed)

	# Reroll button
	reroll_button = Button.new()
	reroll_button.text = "REROLL (" + str(reroll_cost) + " Gold)"
	reroll_button.custom_minimum_size = Vector2(200, 40)
	reroll_button.pressed.connect(_on_reroll_button_pressed)

	buttons_hbox.add_child(skip_button)
	buttons_hbox.add_child(reroll_button)

	# Card container
	card_container = HBoxContainer.new()
	card_container.add_theme_constant_override("separation", 30)

	main_vbox.add_child(buttons_hbox)
	main_vbox.add_child(card_container)
	center_container.add_child(main_vbox)
	selection_overlay.add_child(center_container)
	parent.add_child(selection_overlay)

func start_selection_phase() -> void:
	if is_selection_phase:
		# If already in phase, this might be a reroll - clear existing cards
		for card in choice_cards:
			if card: card.queue_free()
		choice_cards.clear()
		# DON'T clear current_symbol_choices here, as it might have been set externally for reroll
		
	is_selection_phase = true
	# Only clear choices if they haven't been set externally
	if current_symbol_choices.is_empty():
		current_symbol_choices = []
	
	# DEBUG: Print UI structure and positions
	print("\n=== SELECTION PHASE START DEBUG ===")
	print("Selection overlay position: ", selection_overlay.position)
	print("Selection overlay size: ", selection_overlay.size)
	print("Card container position: ", card_container.position if card_container else "null")
	
	# Force set z_index again to ensure it's applied
	selection_overlay.z_index = 4096
	
	# Generate symbol choices
	if current_symbol_choices.is_empty():
		# Use specialized probability logic if GameStateManager is available, 
		# otherwise fallback to random
		_generate_random_choices()
	
	_create_choice_cards()
	selection_overlay.visible = true

func _generate_random_choices():
	current_symbol_choices = []
	var available_symbols = symbol_data.symbols.keys()
	available_symbols.shuffle()
	
	for i in range(3):
		if i < available_symbols.size():
			current_symbol_choices.append(available_symbols[i])
		else:
			current_symbol_choices.append(1)  # Default to wheat

func update_reroll_button(player_gold: int):
	if reroll_button:
		reroll_button.disabled = player_gold < reroll_cost
		reroll_button.text = "REROLL (" + str(reroll_cost) + " Gold)"

func _create_choice_cards():
	# Clear existing cards IMMEDIATELY (not queue_free)
	for card in choice_cards:
		if card and card.get_parent():
			card.get_parent().remove_child(card)
			card.queue_free()
	choice_cards.clear()
	
	# Also clear any remaining children in card_container
	for child in card_container.get_children():
		card_container.remove_child(child)
		child.queue_free()
	
	# Create 3 cards
	for i in range(3):
		var symbol_id = current_symbol_choices[i]
		var symbol_def = symbol_data.get_symbol_by_id(symbol_id)
		
		if symbol_def:
			var card = _create_symbol_card(symbol_def, i)
			choice_cards.append(card)
			card_container.add_child(card)

func _create_symbol_card(symbol: Symbol, index: int) -> Control:
	# Create button as the main card
	var card = Button.new()
	card.custom_minimum_size = Vector2(280, 350)
	card.pressed.connect(_on_symbol_choice_selected.bind(index))
	
	# Normal style - soft beige with DEBUG RED border
	var normal_style = StyleBoxFlat.new()
	normal_style.bg_color = Color(0.95, 0.93, 0.88, 1.0)
	normal_style.corner_radius_top_left = 12
	normal_style.corner_radius_top_right = 12
	normal_style.corner_radius_bottom_left = 12
	normal_style.corner_radius_bottom_right = 12
	normal_style.border_width_left = 5
	normal_style.border_width_right = 5
	normal_style.border_width_top = 5
	normal_style.border_width_bottom = 5
	normal_style.border_color = Color(1.0, 0.0, 0.0, 1.0)  # DEBUG: Bright red border
	normal_style.shadow_color = Color(0, 0, 0, 0.3)
	normal_style.shadow_size = 8
	normal_style.shadow_offset = Vector2(2, 4)
	
	# Hover style - darker beige with DEBUG GREEN border
	var hover_style = StyleBoxFlat.new()
	hover_style.bg_color = Color(0.85, 0.83, 0.78, 1.0)
	hover_style.corner_radius_top_left = 12
	hover_style.corner_radius_top_right = 12
	hover_style.corner_radius_bottom_left = 12
	hover_style.corner_radius_bottom_right = 12
	hover_style.border_width_left = 5
	hover_style.border_width_right = 5
	hover_style.border_width_top = 5
	hover_style.border_width_bottom = 5
	hover_style.border_color = Color(0.0, 1.0, 0.0, 1.0)  # DEBUG: Bright green border
	hover_style.shadow_color = Color(0, 0, 0, 0.3)
	hover_style.shadow_size = 8
	hover_style.shadow_offset = Vector2(2, 4)
	
	card.add_theme_stylebox_override("normal", normal_style)
	card.add_theme_stylebox_override("hover", hover_style)
	card.add_theme_stylebox_override("pressed", hover_style)
	
	# Create content container
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.offset_left = 10
	vbox.offset_top = 10
	vbox.offset_right = -10
	vbox.offset_bottom = -10
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	
	# Create icon display (image or text)
	var icon_container: Control
	if symbol.icon != null:
		# Use TextureRect for image icons
		var texture_rect = TextureRect.new()
		texture_rect.texture = symbol.icon
		texture_rect.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
		texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		texture_rect.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST  # Sharp, no blur
		texture_rect.custom_minimum_size = Vector2(100, 100)
		icon_container = texture_rect
	else:
		# Use Label for text fallback
		var icon_label = Label.new()
		icon_label.text = symbol.symbol_name
		icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		icon_label.add_theme_font_size_override("font_size", 64)
		icon_label.add_theme_color_override("font_color", Color.BLACK)
		icon_container = icon_label
	
	var name_label = Label.new()
	name_label.text = symbol.symbol_name
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", 18)
	name_label.add_theme_color_override("font_color", Color.BLACK)
	
	var rarity_label = Label.new()
	rarity_label.text = symbol.get_rarity_name()
	rarity_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rarity_label.add_theme_font_size_override("font_size", 14)
	rarity_label.add_theme_color_override("font_color", _get_rarity_color(symbol.rarity))
	
	var passive_label = Label.new()
	if symbol.passive_food > 0:
		passive_label.text = "🍎 +" + str(symbol.passive_food) + " Food/turn"
	elif symbol.passive_food < 0:
		passive_label.text = "🍎 " + str(symbol.passive_food) + " Food/turn"
	else:
		passive_label.text = "🍎 No passive food"
	passive_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	passive_label.add_theme_font_size_override("font_size", 12)
	passive_label.add_theme_color_override("font_color", Color.BLACK)
	
	var effect_label = Label.new()
	effect_label.text = symbol.effect_text if symbol.effect_text != "" else "No special effects"
	effect_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	effect_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	effect_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	effect_label.custom_minimum_size = Vector2(0, 80)
	effect_label.add_theme_font_size_override("font_size", 11)
	effect_label.add_theme_color_override("font_color", Color.BLACK)
	
	var stats_container = HBoxContainer.new()
	stats_container.alignment = BoxContainer.ALIGNMENT_CENTER
	stats_container.add_theme_constant_override("separation", 15)
	
	if symbol.base_attack > 0:
		var atk_label = Label.new()
		atk_label.text = "⚔ " + str(symbol.base_attack)
		atk_label.add_theme_font_size_override("font_size", 16)
		atk_label.add_theme_color_override("font_color", Color.BLACK)
		stats_container.add_child(atk_label)
		
	if symbol.base_hp > 0:
		var def_label = Label.new()
		def_label.text = "♥ " + str(symbol.base_hp)
		def_label.add_theme_font_size_override("font_size", 16)
		def_label.add_theme_color_override("font_color", Color.BLACK)
		stats_container.add_child(def_label)
	
	vbox.add_child(icon_container)
	vbox.add_child(name_label)
	vbox.add_child(rarity_label)
	vbox.add_child(passive_label)
	if symbol.base_attack > 0 or symbol.base_hp > 0:
		vbox.add_child(stats_container)
	vbox.add_child(effect_label)
	
	card.add_child(vbox)
	return card

func _get_rarity_color(rarity: int) -> Color:
	match rarity:
		1: return Color(0.5, 0.5, 0.5)  # Ancient - Gray
		2: return Color(0.2, 0.8, 0.2)  # Classical - Green
		3: return Color(0.2, 0.2, 1.0)  # Medieval - Blue
		4: return Color(0.8, 0.2, 0.8)  # Industrial - Purple
		5: return Color(1.0, 0.8, 0.0)  # Modern - Gold
		_: return Color.BLACK

func _on_card_gui_input(event: InputEvent, choice_index: int):
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_on_symbol_choice_selected(choice_index)

func _on_symbol_choice_selected(choice_index: int):
	if not is_selection_phase or choice_index >= current_symbol_choices.size():
		return

	var selected_symbol_id = current_symbol_choices[choice_index]
	symbol_selected.emit(selected_symbol_id)

	# Close selection UI
	is_selection_phase = false
	selection_overlay.visible = false
	current_symbol_choices.clear()  # Clear choices for next time

func _on_reroll_button_pressed():
	reroll_requested.emit()

func _on_skip_button_pressed():
	if not is_selection_phase:
		return

	print("DEBUG: Skip button pressed - skipping selection (no symbol added)")
	# Skip without selecting - emit signal with -1 to indicate skip
	symbol_selected.emit(-1)

	# Close selection UI
	is_selection_phase = false
	selection_overlay.visible = false
	current_symbol_choices.clear()

func _on_choice_selected(symbol_id: int):
	is_selection_phase = false
	selection_overlay.visible = false
	current_symbol_choices.clear()
	symbol_selected.emit(symbol_id)
