class_name GameController
extends Node

# Main game controller that coordinates all systems

# Manager references
var game_state_manager
var board_renderer
var ui_manager
var effects_processor

# Game flow state
enum GamePhase {
	IDLE,
	PROCESSING_TURN,
	SELECTION_PHASE,
	GAME_OVER,
	VICTORY
}

var current_phase: GamePhase = GamePhase.IDLE

func _ready() -> void:
	_initialize_managers()
	_setup_signal_connections()
	_start_new_game()

func _initialize_managers() -> void:
	# Create managers
	var GameStateManagerClass = load("res://scripts/core/GameStateManager.gd")
	var BoardRendererClass = load("res://scripts/ui/BoardRenderer.gd")
	var UIManagerClass = load("res://scripts/ui/UIManager.gd")
	var SymbolEffectsProcessorClass = load("res://scripts/components/SymbolEffectsProcessor.gd")
	
	game_state_manager = GameStateManagerClass.new()
	board_renderer = BoardRendererClass.new()
	ui_manager = UIManagerClass.new()
	effects_processor = SymbolEffectsProcessorClass.new(SymbolData)
	
	# Add as children
	add_child(game_state_manager)
	add_child(board_renderer)
	add_child(ui_manager)
	add_child(effects_processor)
	
	# Get UI parent reference - GameController -> Gameboard -> Main -> UI
	var ui_parent = get_parent().get_parent().get_node("UI")
	
	# Setup managers
	board_renderer.setup(ui_parent, game_state_manager)
	ui_manager.setup(ui_parent)
	game_state_manager.set_effects_processor(effects_processor)
	
	print("GameController: All managers initialized")

func _setup_signal_connections() -> void:
	# UI signals
	ui_manager.spin_button_pressed.connect(_on_spin_button_pressed)
	
	# Game state signals
	game_state_manager.food_changed.connect(_on_food_changed)
	game_state_manager.gold_changed.connect(_on_gold_changed)
	game_state_manager.exp_changed.connect(_on_exp_changed)
	game_state_manager.level_changed.connect(_on_level_changed)
	game_state_manager.turn_changed.connect(_on_turn_changed)
	game_state_manager.game_over.connect(_on_game_over)
	game_state_manager.effects_processed.connect(_on_effects_processed)
	
	# Selection signals  
	ui_manager.selection_manager.symbol_selected.connect(_on_symbol_choice_made)
	ui_manager.selection_manager.reroll_requested.connect(_on_reroll_requested)
	
	# Effects processor signals
	effects_processor.symbol_added_to_player.connect(_on_symbol_added_to_player)
	effects_processor.symbol_evolved.connect(_on_symbol_evolved)

	print("GameController: Signal connections established")

func _start_new_game() -> void:
	game_state_manager.initialize_new_game()

	# Update UI to reflect initial state
	var stats = game_state_manager.get_player_stats()
	ui_manager.update_food_display(stats["food"])
	ui_manager.update_gold_display(stats["gold"])
	ui_manager.update_level_display(stats["level"])
	ui_manager.update_exp_display(stats["exp"], stats["exp_to_next"])

	current_phase = GamePhase.IDLE
	print("GameController: New game started")

# Main game flow
func _on_spin_button_pressed() -> void:
	if current_phase != GamePhase.IDLE:
		return
	
	current_phase = GamePhase.PROCESSING_TURN
	ui_manager.set_spin_button_enabled(false)
	
	await _process_turn()

func _process_turn() -> void:
	print("GameController: Processing turn ", game_state_manager.current_turn + 1)

	# Process game state (this handles turn increment internally)
	var success = game_state_manager.process_turn()

	if not success:
		_on_game_over()
		return

	# Clear board and render new state
	ui_manager.show_debug_phase("Rendering Board...")
	board_renderer.clear_board()
	await board_renderer.render_board()

	# Check for AGI victory condition (ID 28)
	if _check_agi_victory():
		_on_victory()
		return

	# Wait a moment to show initial state before combat
	await get_tree().create_timer(0.2).timeout

	# Combat phase - process combat before effects
	ui_manager.show_debug_phase("COMBAT PHASE")
	await _show_combat_phase()

	# Process turn will emit effects_processed signal, wait for visual effects to complete
	ui_manager.show_debug_phase("EFFECTS PHASE")
	# Trigger effects processing now (after combat)
	game_state_manager.process_all_symbol_effects()
	await _show_effects_processing()

	# Start selection phase
	ui_manager.show_debug_phase("SELECTION PHASE")
	_start_selection_phase()


var effects_display_completed: bool = false
var combat_display_completed: bool = false

func _show_combat_phase() -> void:
	print("GameController: Starting combat phase")
	combat_display_completed = false

	# Process combat
	var board_state = game_state_manager.get_board_state()
	var combat_results = effects_processor.process_combat(board_state["board_grid"])

	# Show combat animations if any attacks happened
	if combat_results["combat_results"].size() > 0:
		print("GameController: ", combat_results["combat_results"].size(), " attacks, ", combat_results["kills"], " enemies killed")

		# Show combat animations
		for result in combat_results["combat_results"]:
			var attacker_pos = result["attacker_pos"]
			var target_pos = result["target_pos"]
			var damage = result["damage"]
			var killed = result["target_killed"]
			var attacker_exhausted = result["attacker_exhausted"]

			# Highlight attacker with red color
			board_renderer.highlight_slot(attacker_pos.x, attacker_pos.y, true, Color(1.8, 0.7, 0.7))

			# Show damage on target
			var damage_text = "-" + str(damage) + " HP"
			if killed:
				damage_text += " ☠"
			board_renderer.show_floating_text(target_pos.x, target_pos.y, damage_text, Color.RED)

			# Update combat unit and enemy counters
			var board_grid = board_state["board_grid"]
			var attacker = board_grid[attacker_pos.x][attacker_pos.y]
			var target = board_grid[target_pos.x][target_pos.y]

			if attacker:
				var attacker_def = SymbolData.get_symbol_by_id(attacker.type_id)
				if attacker_def:
					board_renderer.update_symbol_counter(attacker_pos.x, attacker_pos.y, attacker, attacker_def)

			if target:
				var target_def = SymbolData.get_symbol_by_id(target.type_id)
				if target_def:
					board_renderer.update_symbol_counter(target_pos.x, target_pos.y, target, target_def)

			await get_tree().create_timer(0.2).timeout
			board_renderer.highlight_slot(attacker_pos.x, attacker_pos.y, false)
			await get_tree().create_timer(0.1).timeout

		# Remove killed enemies from board
		await _process_destroyed_enemies()

		# Remove exhausted combat units
		await _process_destroyed_combat_units()

	combat_display_completed = true

func _process_destroyed_enemies() -> void:
	var board_state = game_state_manager.get_board_state()
	var board_grid = board_state["board_grid"]

	# Find all enemies marked for destruction
	var destroyed_enemies = []
	for x in range(game_state_manager.BOARD_WIDTH):
		for y in range(game_state_manager.BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null and symbol_instance.is_marked_for_destruction:
				var symbol_definition = SymbolData.get_symbol_by_id(symbol_instance.type_id)
				if symbol_definition != null and symbol_definition.symbol_type == Symbol.SymbolType.ENEMY:
					destroyed_enemies.append({
						"position": Vector2i(x, y),
						"instance": symbol_instance,
						"definition": symbol_definition
					})

	# Process each destroyed enemy
	for enemy_data in destroyed_enemies:
		var pos = enemy_data["position"]
		var symbol_instance = enemy_data["instance"]

		# Remove from board grid
		board_grid[pos.x][pos.y] = null

		# Remove from player collection completely
		game_state_manager.remove_symbol_from_player(symbol_instance)

		# Clear visual representation
		var slot_index = pos.y * game_state_manager.BOARD_WIDTH + pos.x
		var slot = board_renderer.get_grid_container().get_child(slot_index)
		for child in slot.get_children():
			child.queue_free()

		print("Position [", pos.x, ",", pos.y, "] Enemy destroyed!")

		# Brief pause for visual feedback
		await get_tree().create_timer(0.2).timeout

func _process_destroyed_combat_units() -> void:
	var board_state = game_state_manager.get_board_state()
	var board_grid = board_state["board_grid"]

	# Find all combat units marked for destruction (exhausted attacks)
	var destroyed_units = []
	for x in range(game_state_manager.BOARD_WIDTH):
		for y in range(game_state_manager.BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null and symbol_instance.is_marked_for_destruction:
				var symbol_definition = SymbolData.get_symbol_by_id(symbol_instance.type_id)
				if symbol_definition != null and symbol_definition.symbol_type == Symbol.SymbolType.COMBAT:
					destroyed_units.append({
						"position": Vector2i(x, y),
						"instance": symbol_instance,
						"definition": symbol_definition
					})

	# Process each destroyed combat unit
	for unit_data in destroyed_units:
		var pos = unit_data["position"]
		var symbol_instance = unit_data["instance"]

		# Remove from board grid
		board_grid[pos.x][pos.y] = null

		# Remove from player collection completely
		game_state_manager.remove_symbol_from_player(symbol_instance)

		# Clear visual representation
		var slot_index = pos.y * game_state_manager.BOARD_WIDTH + pos.x
		var slot = board_renderer.get_grid_container().get_child(slot_index)
		for child in slot.get_children():
			child.queue_free()

		print("Position [", pos.x, ",", pos.y, "] Combat unit exhausted!")

		# Brief pause for visual feedback
		await get_tree().create_timer(0.2).timeout

func _show_effects_processing() -> void:
	# Effects will be shown when effects_processed signal is emitted
	effects_display_completed = false
	while not effects_display_completed:
		await get_tree().process_frame

func _on_effects_processed(effect_details: Array, total_food: int, total_exp: int) -> void:
	print("GameController: Processing effects for ", effect_details.size(), " symbols")
	
	var total_food_gained = 0
	var total_exp_gained = 0
	
	# Process each symbol individually - now with real-time counter and effects
	for effect in effect_details:
		var pos = effect["position"]
		var symbol_name = effect["symbol_name"]
		var symbol_instance = effect["symbol_instance"]
		var symbol_definition = effect["symbol_definition"]
		
		# Check if symbol still exists on board (might have been destroyed by previous effects)
		var board_state = game_state_manager.get_board_state()
		var board_grid = board_state["board_grid"]
		if board_grid[pos.x][pos.y] == null:
			# Symbol was already destroyed, skip processing
			continue
		
		# Highlight the symbol
		board_renderer.highlight_slot(pos.x, pos.y, true)
		
		# Process this symbol's effects now (increment counter + calculate effects)
		var symbol_passive_food = symbol_definition.passive_food
		var special_results = game_state_manager.effects_processor.process_single_symbol_effects(symbol_instance, symbol_definition, pos.x, pos.y, game_state_manager.get_board_state()["board_grid"])
		var symbol_special_food = special_results.get("food", 0)
		var symbol_special_exp = special_results.get("exp", 0)
		var symbol_special_gold = special_results.get("gold", 0)

		# Update counter display (shows new counter after increment)
		board_renderer.update_symbol_counter(pos.x, pos.y, symbol_instance, symbol_definition)

		# Build effect text with emojis - combine food sources
		var symbol_total_food = symbol_passive_food + symbol_special_food
		var effect_text = ""

		if symbol_total_food > 0:
			effect_text += "+" + str(symbol_total_food) + " 🍎"
		elif symbol_total_food < 0:
			effect_text += str(symbol_total_food) + " 🍎"

		if symbol_special_exp > 0:
			if effect_text != "":
				effect_text += ", "
			effect_text += "+" + str(symbol_special_exp) + " ⭐"
		elif symbol_special_exp < 0:
			if effect_text != "":
				effect_text += ", "
			effect_text += str(symbol_special_exp) + " ⭐"

		if symbol_special_gold > 0:
			if effect_text != "":
				effect_text += ", "
			effect_text += "+" + str(symbol_special_gold) + " 💰"

		# Show effects only if there are any
		if symbol_total_food != 0 or symbol_special_exp != 0 or symbol_special_gold > 0:
			# Determine text color based on effect type
			var text_color = Color.WHITE
			if symbol_special_gold > 0:
				text_color = Color.YELLOW  # Gold = Yellow
			elif symbol_special_exp > 0:
				text_color = Color.BLUE  # Experience = Blue
			elif symbol_total_food > 0:
				text_color = Color.GREEN  # Food = Green
			elif symbol_total_food < 0:
				text_color = Color.RED  # Negative food = Red

			# Show floating text and apply effects simultaneously
			board_renderer.show_floating_text(pos.x, pos.y, effect_text, text_color)
			var total_food_gain = symbol_passive_food + symbol_special_food
			var total_exp_gain = symbol_special_exp
			var total_gold_gain = symbol_special_gold
			game_state_manager.apply_symbol_effect(total_food_gain, total_exp_gain, total_gold_gain)

			total_food_gained += total_food_gain
			total_exp_gained += total_exp_gain

			print("Position [", pos.x, ",", pos.y, "] ", symbol_name, ": ", effect_text)

		# Handle symbol destruction or counter reset
		if symbol_instance.is_marked_for_destruction:
			# Fish, Sail, Compass, Coal, and Forest destruction are handled by dedicated functions, skip here
			if symbol_definition.id != 3 and symbol_definition.id != 20 and symbol_definition.id != 21 and symbol_definition.id != 8 and symbol_definition.id != 36:  # Not Fish, Sail, Compass, Coal, or Forest
				# Remove destroyed symbol from board (reuse existing board_state)
				board_grid[pos.x][pos.y] = null
				# Remove from player collection
				game_state_manager.remove_symbol_from_player(symbol_instance)
				# Clear visual representation
				var slot_index = pos.y * game_state_manager.BOARD_WIDTH + pos.x
				var slot = board_renderer.get_grid_container().get_child(slot_index)
				for child in slot.get_children():
					child.queue_free()
				print("Position [", pos.x, ",", pos.y, "] ", symbol_name, " destroyed!")
		else:
			# Reset counter if effect was triggered, then update display again
			game_state_manager.effects_processor.reset_symbol_counter_if_needed(symbol_instance, symbol_definition)
			board_renderer.update_symbol_counter(pos.x, pos.y, symbol_instance, symbol_definition)
		
		# Brief pause to show the effect
		await get_tree().create_timer(0.3).timeout
		board_renderer.highlight_slot(pos.x, pos.y, false)
		await get_tree().create_timer(0.1).timeout

	# Process all destroyed symbols after all effects are calculated
	await _process_destroyed_fish()
	await _process_destroyed_sail()
	await _process_destroyed_compass()
	await _process_destroyed_coal()
	await _process_destroyed_forest()
	await _process_destroyed_revolution()

	# Show total summary
	if total_food_gained > 0 or total_exp_gained > 0:
		var summary = "Total gained: "
		if total_food_gained > 0:
			summary += str(total_food_gained) + " Food"
		if total_exp_gained > 0:
			if total_food_gained > 0:
				summary += ", "
			summary += str(total_exp_gained) + " Exp"
		print("GameController: ", summary)
	
	effects_display_completed = true

func _process_destroyed_fish() -> void:
	var board_state = game_state_manager.get_board_state()
	var board_grid = board_state["board_grid"]
	
	# Find all Fish marked for destruction
	var destroyed_fish = []
	for x in range(game_state_manager.BOARD_WIDTH):
		for y in range(game_state_manager.BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null and symbol_instance.is_marked_for_destruction:
				var symbol_definition = SymbolData.get_symbol_by_id(symbol_instance.type_id)
				if symbol_definition != null and symbol_definition.id == 3:  # Fish
					destroyed_fish.append({
						"position": Vector2i(x, y),
						"instance": symbol_instance,
						"definition": symbol_definition
					})
	
	# Process each destroyed Fish with visual feedback
	for fish_data in destroyed_fish:
		var pos = fish_data["position"]
		var symbol_instance = fish_data["instance"]
		var symbol_definition = fish_data["definition"]
		
		# Show destruction effect with food reward (no highlight needed since Fish is already gone)
		var effect_text = "+10 🍎"
		board_renderer.show_floating_text(pos.x, pos.y, effect_text, Color.GREEN)
		
		# Apply food effect immediately (Fish destruction reward)
		game_state_manager.apply_symbol_effect(10, 0)
		
		# Remove from board grid
		board_grid[pos.x][pos.y] = null
		
		# Remove from player collection completely
		game_state_manager.remove_symbol_from_player(symbol_instance)
		
		# Clear visual representation
		var slot_index = pos.y * game_state_manager.BOARD_WIDTH + pos.x
		var slot = board_renderer.get_grid_container().get_child(slot_index)
		for child in slot.get_children():
			child.queue_free()
		
		print("Position [", pos.x, ",", pos.y, "] Fish destroyed! +10 Food")

		# Brief pause for visual feedback (no highlight needed)
		await get_tree().create_timer(0.4).timeout

func _process_destroyed_sail() -> void:
	var board_state = game_state_manager.get_board_state()
	var board_grid = board_state["board_grid"]

	# Find all Sail marked for destruction
	var destroyed_sail = []
	for x in range(game_state_manager.BOARD_WIDTH):
		for y in range(game_state_manager.BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null and symbol_instance.is_marked_for_destruction:
				var symbol_definition = SymbolData.get_symbol_by_id(symbol_instance.type_id)
				if symbol_definition != null and symbol_definition.id == 20:  # Sail
					destroyed_sail.append({
						"position": Vector2i(x, y),
						"instance": symbol_instance,
						"definition": symbol_definition
					})

	# Process each destroyed Sail with visual feedback
	for sail_data in destroyed_sail:
		var pos = sail_data["position"]
		var symbol_instance = sail_data["instance"]
		var symbol_definition = sail_data["definition"]

		# Show destruction effect with food reward
		var effect_text = "+25 🍎"
		board_renderer.show_floating_text(pos.x, pos.y, effect_text, Color.GREEN)

		# Apply food effect immediately (Sail destruction reward)
		game_state_manager.apply_symbol_effect(25, 0)

		# Remove from board grid
		board_grid[pos.x][pos.y] = null

		# Remove from player collection completely
		game_state_manager.remove_symbol_from_player(symbol_instance)

		# Clear visual representation
		var slot_index = pos.y * game_state_manager.BOARD_WIDTH + pos.x
		var slot = board_renderer.get_grid_container().get_child(slot_index)
		for child in slot.get_children():
			child.queue_free()

		print("Position [", pos.x, ",", pos.y, "] Sail destroyed! +25 Food")

		# Brief pause for visual feedback
		await get_tree().create_timer(0.4).timeout

func _process_destroyed_compass() -> void:
	var board_state = game_state_manager.get_board_state()
	var board_grid = board_state["board_grid"]

	# Find all Compass marked for destruction
	var destroyed_compass = []
	for x in range(game_state_manager.BOARD_WIDTH):
		for y in range(game_state_manager.BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null and symbol_instance.is_marked_for_destruction:
				var symbol_definition = SymbolData.get_symbol_by_id(symbol_instance.type_id)
				if symbol_definition != null and symbol_definition.id == 21:  # Compass
					destroyed_compass.append({
						"position": Vector2i(x, y),
						"instance": symbol_instance,
						"definition": symbol_definition
					})

	# Process each destroyed Compass with visual feedback
	for compass_data in destroyed_compass:
		var pos = compass_data["position"]
		var symbol_instance = compass_data["instance"]
		var symbol_definition = compass_data["definition"]

		# Show destruction effect with food reward
		var effect_text = "+25 🍎"
		board_renderer.show_floating_text(pos.x, pos.y, effect_text, Color.GREEN)

		# Apply food effect immediately (Compass destruction reward)
		game_state_manager.apply_symbol_effect(25, 0)

		# Remove from board grid
		board_grid[pos.x][pos.y] = null

		# Remove from player collection completely
		game_state_manager.remove_symbol_from_player(symbol_instance)

		# Clear visual representation
		var slot_index = pos.y * game_state_manager.BOARD_WIDTH + pos.x
		var slot = board_renderer.get_grid_container().get_child(slot_index)
		for child in slot.get_children():
			child.queue_free()

		print("Position [", pos.x, ",", pos.y, "] Compass destroyed! +25 Food")

		# Brief pause for visual feedback
		await get_tree().create_timer(0.4).timeout

func _process_destroyed_coal() -> void:
	var board_state = game_state_manager.get_board_state()
	var board_grid = board_state["board_grid"]
	
	# Find all Coal marked for destruction
	var destroyed_coal = []
	for x in range(game_state_manager.BOARD_WIDTH):
		for y in range(game_state_manager.BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null and symbol_instance.is_marked_for_destruction:
				var symbol_definition = SymbolData.get_symbol_by_id(symbol_instance.type_id)
				if symbol_definition != null and symbol_definition.id == 8:  # Coal
					destroyed_coal.append({
						"position": Vector2i(x, y),
						"instance": symbol_instance,
						"definition": symbol_definition
					})
	
	# Process each destroyed Coal (no food reward, just removal)
	for coal_data in destroyed_coal:
		var pos = coal_data["position"]
		var symbol_instance = coal_data["instance"]
		
		# Remove from board grid
		board_grid[pos.x][pos.y] = null
		
		# Remove from player collection completely
		game_state_manager.remove_symbol_from_player(symbol_instance)
		
		# Clear visual representation
		var slot_index = pos.y * game_state_manager.BOARD_WIDTH + pos.x
		var slot = board_renderer.get_grid_container().get_child(slot_index)
		for child in slot.get_children():
			child.queue_free()
		
		print("Position [", pos.x, ",", pos.y, "] Coal destroyed by Industrial Revolution!")
		
		# Brief pause for visual feedback
		await get_tree().create_timer(0.2).timeout

func _process_destroyed_forest() -> void:
	var board_state = game_state_manager.get_board_state()
	var board_grid = board_state["board_grid"]

	# Find all Forest marked for destruction
	var destroyed_forest = []
	for x in range(game_state_manager.BOARD_WIDTH):
		for y in range(game_state_manager.BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null and symbol_instance.is_marked_for_destruction:
				var symbol_definition = SymbolData.get_symbol_by_id(symbol_instance.type_id)
				if symbol_definition != null and symbol_definition.id == 36:  # Forest
					destroyed_forest.append({
						"position": Vector2i(x, y),
						"instance": symbol_instance,
						"definition": symbol_definition
					})

	# Process each destroyed Forest with food reward
	for forest_data in destroyed_forest:
		var pos = forest_data["position"]
		var symbol_instance = forest_data["instance"]

		# Show destruction effect with food reward
		var effect_text = "+30 🍎"
		board_renderer.show_floating_text(pos.x, pos.y, effect_text, Color.GREEN)

		# Apply food effect immediately (Forest destruction reward)
		game_state_manager.apply_symbol_effect(30, 0, 0)

		# Remove from board grid
		board_grid[pos.x][pos.y] = null

		# Remove from player collection completely
		game_state_manager.remove_symbol_from_player(symbol_instance)

		# Clear visual representation
		var slot_index = pos.y * game_state_manager.BOARD_WIDTH + pos.x
		var slot = board_renderer.get_grid_container().get_child(slot_index)
		for child in slot.get_children():
			child.queue_free()

		print("Position [", pos.x, ",", pos.y, "] Forest destroyed! +30 Food")

		# Brief pause for visual feedback
		await get_tree().create_timer(0.4).timeout

func _process_destroyed_revolution() -> void:
	var board_state = game_state_manager.get_board_state()
	var board_grid = board_state["board_grid"]

	# Find all Revolution symbols on the board (even if already processed)
	var revolution_list = []
	for x in range(game_state_manager.BOARD_WIDTH):
		for y in range(game_state_manager.BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null:
				var symbol_definition = SymbolData.get_symbol_by_id(symbol_instance.type_id)
				if symbol_definition != null and symbol_definition.id == 10:  # Revolution
					revolution_list.append({
						"position": Vector2i(x, y),
						"instance": symbol_instance
					})

	# Process each Revolution
	for revolution_data in revolution_list:
		var pos = revolution_data["position"]
		var symbol_instance = revolution_data["instance"]

		# Count and collect all nearby symbols that need to be destroyed
		var destroyed_symbols_positions = []
		var nearby_coords = _get_nearby_coordinates(pos.x, pos.y)

		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				destroyed_symbols_positions.append({
					"x": coord.x,
					"y": coord.y,
					"instance": nearby_symbol
				})

		var symbols_destroyed = 1 + destroyed_symbols_positions.size()  # Include Revolution itself

		# First, remove all nearby symbols
		for symbol_data in destroyed_symbols_positions:
			var sx = symbol_data["x"]
			var sy = symbol_data["y"]
			var destroyed_instance = symbol_data["instance"]

			# Remove from board grid
			board_grid[sx][sy] = null

			# Remove from player collection
			game_state_manager.remove_symbol_from_player(destroyed_instance)

			# Clear visual representation
			var slot_index = sy * game_state_manager.BOARD_WIDTH + sx
			var slot = board_renderer.get_grid_container().get_child(slot_index)
			for child in slot.get_children():
				child.queue_free()

			var destroyed_def = SymbolData.get_symbol_by_id(destroyed_instance.type_id)
			var destroyed_name = destroyed_def.symbol_name if destroyed_def else "Unknown"
			print("Revolution destroyed ", destroyed_name, " at [", sx, ",", sy, "]")

		# Show destruction effect on Revolution position
		var effect_text = "+" + str(symbols_destroyed) + " 🎲"
		board_renderer.show_floating_text(pos.x, pos.y, effect_text, Color.YELLOW)

		# Add random symbols to player collection (uniform probability, no rarity)
		var all_symbol_ids = SymbolData.symbols.keys()
		var valid_symbol_ids = []

		# Filter out ENEMY type symbols (like Barbarian)
		for symbol_id in all_symbol_ids:
			var symbol_def = SymbolData.get_symbol_by_id(symbol_id)
			if symbol_def != null and symbol_def.symbol_type != Symbol.SymbolType.ENEMY:
				valid_symbol_ids.append(symbol_id)

		# Add random symbols
		for i in range(symbols_destroyed):
			if valid_symbol_ids.size() > 0:
				var random_index = randi() % valid_symbol_ids.size()
				var random_symbol_id = valid_symbol_ids[random_index]
				game_state_manager.add_symbol_to_player(random_symbol_id)
				var symbol_name = SymbolData.get_symbol_by_id(random_symbol_id).symbol_name
				print("Revolution added: ", symbol_name, " (ID: ", random_symbol_id, ")")

		# Remove Revolution from board grid
		board_grid[pos.x][pos.y] = null

		# Remove Revolution from player collection
		game_state_manager.remove_symbol_from_player(symbol_instance)

		# Clear Revolution visual representation
		var slot_index = pos.y * game_state_manager.BOARD_WIDTH + pos.x
		var slot = board_renderer.get_grid_container().get_child(slot_index)
		for child in slot.get_children():
			child.queue_free()

		print("Position [", pos.x, ",", pos.y, "] Revolution destroyed ", symbols_destroyed, " symbol(s) total!")

		# Brief pause for visual feedback
		await get_tree().create_timer(0.4).timeout

# Helper function to get nearby coordinates (8 directions)
func _get_nearby_coordinates(x: int, y: int) -> Array:
	var nearby = []
	for dx in range(-1, 2):
		for dy in range(-1, 2):
			if dx == 0 and dy == 0:
				continue  # Skip center
			var nx = x + dx
			var ny = y + dy
			if nx >= 0 and nx < game_state_manager.BOARD_WIDTH and ny >= 0 and ny < game_state_manager.BOARD_HEIGHT:
				nearby.append(Vector2i(nx, ny))
	return nearby

func _start_selection_phase() -> void:
	current_phase = GamePhase.SELECTION_PHASE
	
	# Generate symbol choices based on current level
	var probabilities = game_state_manager.get_symbol_probabilities()
	var choices = _generate_symbol_choices(probabilities)
	
	# Show selection UI
	var ui_parent = get_parent().get_parent().get_node("UI")
	ui_manager.show_selection_ui(choices, ui_parent)
	
	# Update reroll button state
	ui_manager.selection_manager.update_reroll_button(game_state_manager.gold_amount)
	
	print("GameController: Selection phase started")

func _on_reroll_requested() -> void:
	var reroll_cost = ui_manager.selection_manager.reroll_cost
	if game_state_manager.gold_amount >= reroll_cost:
		# Deduct gold
		game_state_manager.gold_amount -= reroll_cost
		ui_manager.update_gold_display(game_state_manager.gold_amount)
		
		# Generate new choices
		var probabilities = game_state_manager.get_symbol_probabilities()
		var choices = _generate_symbol_choices(probabilities)
		
		# Update UI with new choices
		# We need to tell the manager to rebuild the cards
		ui_manager.selection_manager.current_symbol_choices = choices
		ui_manager.selection_manager.start_selection_phase()
		
		# Update reroll button again (it might be disabled now if gold is too low)
		ui_manager.selection_manager.update_reroll_button(game_state_manager.gold_amount)
		
		print("GameController: Reroll performed, cost: ", reroll_cost)
	else:
		print("GameController: Not enough gold for reroll")

func _generate_symbol_choices(probabilities: Dictionary) -> Array:
	var choices: Array = []
	var symbol_data = SymbolData

	# Get all symbols grouped by rarity (excluding AGI if level < 10)
	var symbols_by_rarity = {}
	for symbol_id in symbol_data.symbols.keys():
		var symbol = symbol_data.get_symbol_by_id(symbol_id)
		if symbol:
			# Exclude AGI (ID 28) if player level is below 10
			if symbol.id == 28 and game_state_manager.player_level < 10:
				continue

			var rarity = symbol.rarity
			if not symbols_by_rarity.has(rarity):
				symbols_by_rarity[rarity] = []
			symbols_by_rarity[rarity].append(symbol.id)

	# Generate 3 choices based on probabilities
	for i in range(3):
		var random_value = randi() % 100
		var selected_rarity = 1

		var cumulative = 0
		for rarity in probabilities.keys():
			cumulative += probabilities[rarity]
			if random_value < cumulative:
				selected_rarity = rarity
				break

		# Pick random symbol of selected rarity
		if symbols_by_rarity.has(selected_rarity):
			var available_symbols = symbols_by_rarity[selected_rarity]
			var choice = available_symbols[randi() % available_symbols.size()]
			choices.append(choice)
		else:
			choices.append(1)  # Fallback to Wheat

	return choices

func _on_symbol_choice_made(symbol_id: int) -> void:
	if current_phase != GamePhase.SELECTION_PHASE:
		return

	print("GameController: Symbol choice made: ", symbol_id)

	# Add chosen symbol to player collection (if not skipped)
	if symbol_id >= 0:
		game_state_manager.add_symbol_to_player(symbol_id)
	else:
		print("GameController: Selection skipped - no symbol added")

	# Hide selection UI
	ui_manager.hide_selection_ui()

	# Clear debug phase
	ui_manager.hide_debug_phase()

	# Return to idle phase
	current_phase = GamePhase.IDLE
	ui_manager.set_spin_button_enabled(true)

# Signal handlers
func _on_food_changed(old_value: int, new_value: int) -> void:
	ui_manager.update_food_display(new_value)

func _on_gold_changed(old_value: int, new_value: int) -> void:
	ui_manager.update_gold_display(new_value)

func _on_exp_changed(old_value: int, new_value: int) -> void:
	var stats = game_state_manager.get_player_stats()
	ui_manager.update_exp_display(stats["exp"], stats["exp_to_next"])

func _on_level_changed(old_level: int, new_level: int) -> void:
	ui_manager.update_level_display(new_level)
	var stats = game_state_manager.get_player_stats()
	ui_manager.update_exp_display(stats["exp"], stats["exp_to_next"])

func _on_turn_changed(new_turn: int) -> void:
	print("GameController: Turn ", new_turn, " completed")

func _on_game_over() -> void:
	current_phase = GamePhase.GAME_OVER
	ui_manager.show_game_over_ui()
	ui_manager.hide_selection_ui()

	print("GameController: Game Over!")

func _check_agi_victory() -> bool:
	# Check if AGI symbol (ID 28) is on the board
	var board_state = game_state_manager.get_board_state()
	var board_grid = board_state["board_grid"]

	for x in range(game_state_manager.BOARD_WIDTH):
		for y in range(game_state_manager.BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null:
				if symbol_instance.type_id == 28:  # AGI symbol
					return true
	return false

func _on_victory() -> void:
	current_phase = GamePhase.VICTORY
	ui_manager.show_victory_ui()
	ui_manager.hide_selection_ui()

	print("GameController: VICTORY! AGI has been achieved!")

func _on_symbol_added_to_player(symbol_id: int) -> void:
	game_state_manager.add_symbol_to_player(symbol_id)
	var symbol_name = SymbolData.get_symbol_by_id(symbol_id).symbol_name
	print("GameController: ", symbol_name, " added to player collection via effect!")

func _on_symbol_evolved(old_instance: PlayerSymbolInstance, new_type_id: int, pos_x: int, pos_y: int) -> void:
	# Get board state
	var board_state = game_state_manager.get_board_state()
	var board_grid = board_state["board_grid"]

	# Get symbol definitions
	var old_symbol = SymbolData.get_symbol_by_id(old_instance.type_id)
	var new_symbol = SymbolData.get_symbol_by_id(new_type_id)

	if old_symbol == null or new_symbol == null:
		print("ERROR: Failed to find symbol definitions for evolution")
		return

	print("GameController: ", old_symbol.symbol_name, " evolving to ", new_symbol.symbol_name, " at [", pos_x, ",", pos_y, "]")

	# Show evolution visual effect
	board_renderer.show_floating_text(pos_x, pos_y, "⬆ " + new_symbol.symbol_name, Color.YELLOW)

	# Create new symbol instance
	var new_instance = SymbolData.create_player_symbol_instance(new_type_id)

	# Remove old instance from player collection
	game_state_manager.remove_symbol_from_player(old_instance)

	# Add new instance to player collection
	game_state_manager.player_symbols.append(new_instance)

	# Replace on board grid
	board_grid[pos_x][pos_y] = new_instance

	# Update visual representation
	var slot_index = pos_y * game_state_manager.BOARD_WIDTH + pos_x
	var slot = board_renderer.get_grid_container().get_child(slot_index)

	# Clear old visual
	for child in slot.get_children():
		child.queue_free()

	# Render new symbol
	board_renderer.render_symbol_at_slot(slot, new_instance, new_symbol)
