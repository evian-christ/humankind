class_name UIManager
extends Node

# Handles all UI interactions and display updates

signal spin_button_pressed

# UI component references
var top_bar: Panel
var bottom_bar: Panel
var turn_era_label: Label
var food_label: Label
var next_requirement_label: Label
var turns_remaining_label: Label
var gold_label: Label
var level_label: Label
var exp_bar: ProgressBar
var exp_label: Label
var spin_button: Button
var spin_status_label: Label

# Selection UI components
var selection_ui: Control
var selection_manager: SymbolSelectionManager

# Debug UI
var debug_phase_label: Label

func setup(ui_parent: Control) -> void:
	_find_ui_components(ui_parent)
	_setup_ui_connections()
	_create_debug_ui(ui_parent)

	# Initialize selection manager
	selection_manager = SymbolSelectionManager.new(SymbolData)
	selection_manager.symbol_selected.connect(_on_symbol_choice_made)

	print("UIManager: Setup complete")

func _find_ui_components(ui_parent: Control) -> void:
	top_bar = ui_parent.get_node("TopBar")
	var top_content: HBoxContainer = top_bar.get_node("TopContent")
	turn_era_label = top_content.get_node("TurnEraLabel")
	next_requirement_label = top_content.get_node("NextRequirementLabel")
	turns_remaining_label = top_content.get_node("TurnsRemainingLabel")
	
	bottom_bar = ui_parent.get_node("BottomBar")
	var bottom_content: HBoxContainer = bottom_bar.get_node("BottomContent")
	var stats_section: HBoxContainer = bottom_content.get_node("StatsSection")
	food_label = stats_section.get_node("FoodLabel")
	gold_label = stats_section.get_node("GoldLabel")
	var level_container: HBoxContainer = stats_section.get_node("LevelInfoContainer")
	level_label = level_container.get_node("LevelLabel")
	exp_bar = level_container.get_node("ExpBar")
	exp_label = level_container.get_node("ExpLabel")
	var spin_section: VBoxContainer = bottom_content.get_node("SpinSection")
	spin_button = spin_section.get_node("SpinButton")
	spin_status_label = spin_section.get_node("SpinStatusLabel")

func _setup_ui_connections() -> void:
	spin_button.pressed.connect(_on_spin_button_pressed)

func _create_debug_ui(ui_parent: Control) -> void:
	# Create debug phase label on the left side
	debug_phase_label = Label.new()
	debug_phase_label.text = ""
	debug_phase_label.position = Vector2(10, 100)
	debug_phase_label.size = Vector2(200, 100)
	debug_phase_label.add_theme_font_size_override("font_size", 20)
	debug_phase_label.add_theme_color_override("font_color", Color.YELLOW)
	debug_phase_label.add_theme_color_override("font_shadow_color", Color.BLACK)
	debug_phase_label.add_theme_constant_override("shadow_offset_x", 2)
	debug_phase_label.add_theme_constant_override("shadow_offset_y", 2)
	ui_parent.add_child(debug_phase_label)

func _on_spin_button_pressed() -> void:
	spin_button_pressed.emit()

func _on_symbol_choice_made(symbol_id: int) -> void:
	hide_selection_ui()

# Stat display updates
func update_food_display(food_amount: int) -> void:
	food_label.text = "Food: " + str(food_amount)

func update_gold_display(gold_amount: int) -> void:
	gold_label.text = "Gold: " + str(gold_amount)

func update_level_display(level: int) -> void:
	level_label.text = "LV. " + str(level)

func update_exp_display(current_exp: int, exp_to_next: int) -> void:
	exp_bar.value = current_exp
	exp_bar.max_value = exp_to_next
	exp_label.text = str(current_exp) + "/" + str(exp_to_next)

func update_turn_and_era(turn_number: int, era_name: String) -> void:
	if turn_era_label:
		turn_era_label.text = "Turn " + str(turn_number) + " / " + era_name

func update_next_requirement(required_food: int) -> void:
	if next_requirement_label:
		next_requirement_label.text = "Next Requirement: " + str(required_food)

func update_turns_until_payment(turns_remaining: int) -> void:
	if turns_remaining_label:
		turns_remaining_label.text = str(turns_remaining) + " Turns Until Payment"

# Button state management
func set_spin_button_enabled(enabled: bool) -> void:
	spin_button.disabled = not enabled

func set_spin_button_text(text: String) -> void:
	spin_button.text = text

# Selection UI management
func show_selection_ui(symbol_choices: Array, ui_parent: Control) -> void:
	if selection_ui:
		selection_ui.queue_free()
	
	# First ensure the selection manager has a UI parent
	if not selection_manager.selection_overlay:
		selection_manager.create_selection_ui(ui_parent)
	
	# Set the choices manually (we'll need to modify SymbolSelectionManager for this)
	selection_manager.current_symbol_choices = symbol_choices
	
	# Then start the selection phase
	selection_manager.start_selection_phase()

func hide_selection_ui() -> void:
	if selection_manager and selection_manager.selection_overlay:
		selection_manager.selection_overlay.visible = false
		selection_manager.is_selection_phase = false

# Game state UI updates
func show_game_over_ui() -> void:
	set_spin_button_text("Game Over")
	set_spin_button_enabled(false)

func show_victory_ui() -> void:
	set_spin_button_text("VICTORY!")
	set_spin_button_enabled(false)

func reset_ui_for_new_game() -> void:
	set_spin_button_text("Spin")
	set_spin_button_enabled(true)
	hide_selection_ui()

# Debug functions
func show_debug_phase(phase_name: String) -> void:
	if debug_phase_label:
		debug_phase_label.text = phase_name

func hide_debug_phase() -> void:
	if debug_phase_label:
		debug_phase_label.text = ""
