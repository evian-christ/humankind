class_name SymbolEffectsProcessor
extends Node

signal symbol_added_to_player(symbol_id: int)
signal symbols_destroyed_at_positions(positions: Array)
signal symbol_removed_from_player(instance: PlayerSymbolInstance)

const BOARD_WIDTH = 5
const BOARD_HEIGHT = 4

var symbol_data: SymbolData

func _init(symbol_data_ref: SymbolData):
	symbol_data = symbol_data_ref

# Get nearby coordinates (8 directions)
func _get_nearby_coordinates(x: int, y: int) -> Array:
	var nearby = []
	for dx in range(-1, 2):
		for dy in range(-1, 2):
			if dx == 0 and dy == 0:
				continue  # Skip center
			var nx = x + dx
			var ny = y + dy
			if nx >= 0 and nx < BOARD_WIDTH and ny >= 0 and ny < BOARD_HEIGHT:
				nearby.append(Vector2i(nx, ny))
	return nearby

# Process all symbol interactions - basic version for now
func process_symbol_interactions(board_grid: Array, current_turn: int = 0) -> Dictionary:
	var total_food_gained = 0
	var total_exp_gained = 0
	
	# Process special effects for each symbol
	for x in range(BOARD_WIDTH):
		for y in range(BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null:
				var symbol_definition = symbol_data.get_symbol_by_id(symbol_instance.type_id)
				if symbol_definition != null:
					var results = process_single_symbol_effects(symbol_instance, symbol_definition, x, y, board_grid)
					total_food_gained += results.get("food", 0)
					total_exp_gained += results.get("exp", 0)
	
	return {"food": total_food_gained, "exp": total_exp_gained}

# Process effects for a single symbol
func process_single_symbol_effects(symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol, x: int, y: int, board_grid: Array) -> Dictionary:
	var food_gained = 0
	var exp_gained = 0
	
	# Wheat counter system: Every 6 turns, provides 8 food
	if symbol_definition.id == 1:  # Wheat
		# Always increment counter first
		symbol_instance.effect_counter += 1
		# Check if counter reached threshold (but don't reset yet - done in GameController)
		if symbol_instance.effect_counter >= 6:
			food_gained += 8
	
	# Rice counter system: Every 8 turns, provides 11 food
	elif symbol_definition.id == 2:  # Rice
		# Always increment counter first
		symbol_instance.effect_counter += 1
		# Check if counter reached threshold (but don't reset yet - done in GameController)
		if symbol_instance.effect_counter >= 8:
			food_gained += 11
	
	# Fish destruction system: Auto-destroy after 5 turns
	elif symbol_definition.id == 3:  # Fish
		# Always increment counter first
		symbol_instance.effect_counter += 1
		# Check if should be destroyed (5 turns or external destruction)
		if symbol_instance.effect_counter >= 5 or symbol_instance.is_marked_for_destruction:
			# Mark for removal from board (food reward handled by GameController when destroyed)
			symbol_instance.is_marked_for_destruction = true
	
	# Coal: No special effects, just exists to be destroyed by Industrial Revolution
	elif symbol_definition.id == 8:  # Coal
		# Coal has no special effects, just provides passive food
		pass
	
	# Banana placement system: After 10 placements, permanently provides 2 food total
	elif symbol_definition.id == 5:  # Banana
		if symbol_instance.effect_counter < 10:
			# Still counting placements, provide only 1 food (override passive)
			symbol_instance.effect_counter += 1
			food_gained += 1 - symbol_definition.passive_food  # Cancel passive, add 1
		else:
			# After 10 placements, provide 2 food total (override passive)
			food_gained += 2 - symbol_definition.passive_food  # Cancel passive, add 2
	
	# Fishing Boat: Destroy nearby Fish
	if symbol_definition.id == 4:  # Fishing Boat
		var nearby_coords = _get_nearby_coordinates(x, y)
		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				var nearby_def = symbol_data.get_symbol_by_id(nearby_symbol.type_id)
				if nearby_def != null and nearby_def.id == 3:  # Fish
					# Mark Fish for destruction (will trigger its food effect)
					destroy_symbol(nearby_symbol)
	
	# Example: Sugar provides 1 food for each nearby Sugar
	elif symbol_definition.id == 6:  # Sugar
		var nearby_coords = _get_nearby_coordinates(x, y)
		var nearby_sugar_count = 0
		
		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				var nearby_def = symbol_data.get_symbol_by_id(nearby_symbol.type_id)
				if nearby_def != null and nearby_def.id == 6:  # Another Sugar
					nearby_sugar_count += 1
		
		food_gained += nearby_sugar_count
	
	# Mine: 1% chance to provide Coal
	elif symbol_definition.id == 7:  # Mine
		var random_value = randi() % 100
		if random_value < 1:  # 1% chance
			# Emit signal to add Coal to player collection
			symbol_added_to_player.emit(8)  # Coal ID is 8
			print("Mine produced Coal!")
	
	# Industrial Revolution: Destroy nearby Coal, provide 1 food per Coal destroyed this game
	elif symbol_definition.id == 9:  # Industrial Revolution
		var nearby_coords = _get_nearby_coordinates(x, y)
		var coals_destroyed_this_turn = 0
		
		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				var nearby_def = symbol_data.get_symbol_by_id(nearby_symbol.type_id)
				if nearby_def != null and nearby_def.id == 8:  # Coal
					# Mark Coal for destruction
					destroy_symbol(nearby_symbol)
					coals_destroyed_this_turn += 1
		
		# Add destroyed coals to the cumulative count (stored in effect_counter)
		symbol_instance.effect_counter += coals_destroyed_this_turn
		
		# Provide food equal to total coals destroyed this game
		if symbol_instance.effect_counter > 0:
			food_gained += symbol_instance.effect_counter
		
		if coals_destroyed_this_turn > 0:
			print("Industrial Revolution destroyed ", coals_destroyed_this_turn, " coal(s). Total: ", symbol_instance.effect_counter)
	
	# Example: Cow provides 1 food if nearby Cow exists
	elif symbol_definition.id == 11:  # Cow
		var nearby_coords = _get_nearby_coordinates(x, y)
		var has_nearby_cow = false
		
		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				var nearby_def = symbol_data.get_symbol_by_id(nearby_symbol.type_id)
				if nearby_def != null and nearby_def.id == 11:  # Another Cow
					has_nearby_cow = true
					break
		
		if has_nearby_cow:
			food_gained += 1
	
	# Example: Library provides 1 exp
	elif symbol_definition.id == 13:  # Library
		exp_gained += 1
	
	# Example: Barbarian causes -3 food (already handled in passive_food)
	# But also loses 1 HP per turn
	elif symbol_definition.id == 22:  # Barbarian
		if symbol_instance.current_hp > 0:
			symbol_instance.current_hp -= 1
			if symbol_instance.current_hp <= 0:
				print("Barbarian died!")
				# Could emit signal to remove from board
	
	return {"food": food_gained, "exp": exp_gained}

# Reset counter for symbols that triggered effects
func reset_symbol_counter_if_needed(symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol) -> void:
	if symbol_definition.id == 1 and symbol_instance.effect_counter >= 6:  # Wheat
		symbol_instance.effect_counter = 0
	elif symbol_definition.id == 2 and symbol_instance.effect_counter >= 8:  # Rice
		symbol_instance.effect_counter = 0
	# Banana counter never resets - it's a permanent upgrade after 10 placements

# Destroy symbol (can be called by external effects)
func destroy_symbol(symbol_instance: PlayerSymbolInstance) -> void:
	symbol_instance.is_marked_for_destruction = true