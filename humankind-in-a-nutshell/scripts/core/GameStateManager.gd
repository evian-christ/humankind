class_name GameStateManager
extends Node

# Game state management - handles all core game logic and state

signal food_changed(old_value: int, new_value: int)
signal exp_changed(old_value: int, new_value: int)  
signal level_changed(old_level: int, new_level: int)
signal turn_changed(new_turn: int)
signal game_over
signal effects_processed(effect_details: Array, total_food: int, total_exp: int)

# Player stats
var food_amount: int = 200 : set = _set_food_amount
var gold_amount: int = 0
var player_level: int = 1 : set = _set_player_level
var current_exp: int = 0 : set = _set_current_exp
var exp_to_next_level: int = 50
var current_turn: int = 0 : set = _set_current_turn

# Player owned symbols
var player_symbols: Array = []

# Board state - 5x4 grid
const BOARD_WIDTH = 5
const BOARD_HEIGHT = 4
var board_grid: Array = []

# Component references
var symbol_data: SymbolData
var effects_processor

func _init():
	symbol_data = SymbolData
	_initialize_board_grid()

func _initialize_board_grid() -> void:
	board_grid.clear()
	board_grid.resize(BOARD_WIDTH)
	for x in range(BOARD_WIDTH):
		board_grid[x] = []
		board_grid[x].resize(BOARD_HEIGHT)
		for y in range(BOARD_HEIGHT):
			board_grid[x][y] = null

# Property setters with signal emission
func _set_food_amount(new_value: int) -> void:
	var old_value = food_amount
	food_amount = new_value
	food_changed.emit(old_value, new_value)

func _set_current_exp(new_value: int) -> void:
	var old_value = current_exp
	current_exp = new_value
	exp_changed.emit(old_value, new_value)

func _set_player_level(new_value: int) -> void:
	var old_value = player_level
	player_level = new_value
	level_changed.emit(old_value, new_value)

func _set_current_turn(new_value: int) -> void:
	current_turn = new_value
	turn_changed.emit(new_value)

# Game initialization
func initialize_new_game() -> void:
	food_amount = 200
	gold_amount = 0
	player_level = 1
	current_exp = 0
	exp_to_next_level = 50
	current_turn = 0
	player_symbols.clear()
	_initialize_board_grid()
	
	print("GameStateManager: New game initialized")

func set_effects_processor(processor) -> void:
	effects_processor = processor

# Symbol management
func add_symbol_to_player(symbol_id: int) -> bool:
	var new_symbol_instance = symbol_data.create_player_symbol_instance(symbol_id, current_turn)
	if new_symbol_instance:
		var symbol_def = symbol_data.get_symbol_by_id(symbol_id)

		# Initialize combat stats based on symbol type
		if symbol_def.symbol_type == Symbol.SymbolType.ENEMY:
			# Enemy: Initialize HP with scaling based on turn
			var turn_multiplier = current_turn / 10
			new_symbol_instance.enemy_hp = symbol_def.base_hp + (2 * turn_multiplier)
		elif symbol_def.symbol_type == Symbol.SymbolType.COMBAT:
			# Combat unit: Initialize attack power and remaining attacks
			new_symbol_instance.attack_power = symbol_def.base_attack

			# Set initial attack count based on unit type
			match symbol_id:
				23:  # Warrior
					new_symbol_instance.remaining_attacks = 5
				24:  # Swordsman
					new_symbol_instance.remaining_attacks = 4
				25:  # Knight
					new_symbol_instance.remaining_attacks = 3
				26:  # Cavalry
					new_symbol_instance.remaining_attacks = 3
				27:  # Infantry
					new_symbol_instance.remaining_attacks = 2

		player_symbols.append(new_symbol_instance)
		print("GameStateManager: Added symbol ", symbol_def.symbol_name)
		return true
	return false

func remove_symbol_from_player(symbol_instance: PlayerSymbolInstance) -> void:
	var index = player_symbols.find(symbol_instance)
	if index != -1:
		player_symbols.remove_at(index)
		print("GameStateManager: Removed symbol instance ", symbol_instance.instance_id, " from player collection")
	else:
		print("GameStateManager: Warning - Symbol instance not found in player collection")

func get_symbols_for_board() -> Array:
	if player_symbols.size() > BOARD_WIDTH * BOARD_HEIGHT:
		var shuffled_symbols = player_symbols.duplicate()
		shuffled_symbols.shuffle()
		return shuffled_symbols.slice(0, BOARD_WIDTH * BOARD_HEIGHT)
	else:
		return player_symbols

# Board management  
func clear_board() -> void:
	_initialize_board_grid()

func place_symbols_on_board() -> void:
	clear_board()

	var symbols_to_place = get_symbols_for_board()

	# TEST MODE: Fixed placement for combat testing
	if symbols_to_place.size() == 2:
		# Place Barbarian at (0, 0) and Warrior at (1, 0) - adjacent horizontally
		var barbarian_instance = null
		var warrior_instance = null

		for symbol in symbols_to_place:
			var symbol_def = symbol_data.get_symbol_by_id(symbol.type_id)
			if symbol_def.id == 22:  # Barbarian
				barbarian_instance = symbol
			elif symbol_def.id == 23:  # Warrior
				warrior_instance = symbol

		if barbarian_instance and warrior_instance:
			board_grid[0][0] = barbarian_instance
			board_grid[1][0] = warrior_instance
			print("GameStateManager: TEST MODE - Fixed placement: Barbarian at (0,0), Warrior at (1,0)")
			return

	# Normal random placement
	var available_slots = []
	for i in range(BOARD_WIDTH * BOARD_HEIGHT):
		available_slots.append(i)
	available_slots.shuffle()

	for i in range(symbols_to_place.size()):
		var symbol_instance = symbols_to_place[i]
		var slot_index = available_slots[i]
		var x = slot_index % BOARD_WIDTH
		var y = slot_index / BOARD_WIDTH
		board_grid[x][y] = symbol_instance

# Resource management
func calculate_food_cost(turn: int) -> int:
	var payment_cycle = turn / 10
	return 100 + (payment_cycle - 1) * 50  # 100, 150, 200, 250, 300...

func can_pay_food_cost(turn: int) -> bool:
	return food_amount >= calculate_food_cost(turn)

func pay_food_cost(turn: int) -> bool:
	var cost = calculate_food_cost(turn)
	if can_pay_food_cost(turn):
		food_amount = food_amount - cost  # Use assignment to trigger setter
		print("GameStateManager: Paid ", cost, " food. Remaining: ", food_amount)
		return true
	else:
		print("GameStateManager: Cannot pay food cost of ", cost, ". Current: ", food_amount)
		game_over.emit()
		return false

func process_all_symbol_effects() -> void:
	if not effects_processor:
		print("GameStateManager: Error - effects processor not set")
		return
	
	var effect_details: Array = []
	
	# Just collect symbol information for visual display - don't process effects yet
	for x in range(BOARD_WIDTH):
		for y in range(BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null:
				var symbol_definition = symbol_data.get_symbol_by_id(symbol_instance.type_id)
				if symbol_definition != null:
					# Store symbol info for GameController to process individually
					effect_details.append({
						"position": Vector2i(x, y),
						"symbol_name": symbol_definition.symbol_name,
						"symbol_instance": symbol_instance,
						"symbol_definition": symbol_definition
					})
	
	# Emit signal with symbol list for GameController to process one by one
	effects_processed.emit(effect_details, 0, 0)  # No totals since effects not processed yet

# Apply individual symbol effects (called by GameController for real-time updates)
func apply_symbol_effect(food_gain: int, exp_gain: int) -> void:
	if food_gain != 0:
		food_amount = food_amount + food_gain
	if exp_gain != 0:
		add_exp(exp_gain)

# Legacy functions for backward compatibility
func process_passive_food() -> void:
	pass  # Now handled in process_all_symbol_effects

func process_symbol_effects() -> void:
	pass  # Now handled in process_all_symbol_effects

# Experience and leveling
func add_exp(amount: int) -> void:
	current_exp += amount
	
	while current_exp >= exp_to_next_level and player_level < 10:
		current_exp -= exp_to_next_level
		player_level += 1
		exp_to_next_level = get_exp_requirement(player_level)
		print("GameStateManager: Level Up! Now level: ", player_level)

func get_exp_requirement(level: int) -> int:
	return 50 + (level - 1) * 25  # 50, 75, 100, 125, 150...

# Enemy invasion system
func spawn_enemy_symbols() -> void:
	# Chance increases with level: 20% + 5% per level
	var spawn_chance = 20 + (player_level * 5)

	# Spawn 1-2 enemies based on luck
	var spawn_count = 1
	if randi() % 100 < 30:  # 30% chance for 2 enemies
		spawn_count = 2

	for i in range(spawn_count):
		if randi() % 100 < spawn_chance:
			# For now only Barbarian (ID 22) exists
			add_symbol_to_player(22)
			print("GameStateManager: Barbarian invaded! HP: ", player_symbols[-1].enemy_hp)

# Turn processing
func process_turn() -> bool:
	current_turn += 1

	# TEST MODE: Skip enemy spawning during testing
	# spawn_enemy_symbols()

	# Process game mechanics - only place symbols, effects will be processed by GameController
	place_symbols_on_board()
	add_exp(1)  # Basic EXP per turn

	# Check for food payment every 10 turns AFTER all effects are processed
	if current_turn % 10 == 0:
		if not pay_food_cost(current_turn):
			return false  # Game over

	print("GameStateManager: Turn ", current_turn, " processed successfully")
	return true

# Probability system for symbol selection
func get_symbol_probabilities() -> Dictionary:
	var probabilities = {}
	match player_level:
		1: probabilities = {1: 100, 2: 0, 3: 0, 4: 0, 5: 0}
		2: probabilities = {1: 85, 2: 15, 3: 0, 4: 0, 5: 0}
		3: probabilities = {1: 70, 2: 30, 3: 0, 4: 0, 5: 0}
		4: probabilities = {1: 55, 2: 35, 3: 10, 4: 0, 5: 0}
		5: probabilities = {1: 45, 2: 35, 3: 20, 4: 0, 5: 0}
		6: probabilities = {1: 35, 2: 35, 3: 25, 4: 5, 5: 0}
		7: probabilities = {1: 25, 2: 35, 3: 30, 4: 10, 5: 0}
		8: probabilities = {1: 20, 2: 30, 3: 35, 4: 15, 5: 0}
		9: probabilities = {1: 15, 2: 25, 3: 35, 4: 22, 5: 3}
		10: probabilities = {1: 10, 2: 20, 3: 30, 4: 20, 5: 20}
	return probabilities

# Utility functions
func get_board_state() -> Dictionary:
	return {
		"board_grid": board_grid,
		"width": BOARD_WIDTH,
		"height": BOARD_HEIGHT
	}

func get_player_stats() -> Dictionary:
	return {
		"food": food_amount,
		"gold": gold_amount,
		"level": player_level,
		"exp": current_exp,
		"exp_to_next": exp_to_next_level,
		"turn": current_turn,
		"symbol_count": player_symbols.size()
	}

func is_game_over() -> bool:
	return current_turn > 0 and not can_pay_food_cost(current_turn + 10)
