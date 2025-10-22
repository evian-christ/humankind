class_name SymbolEffectsProcessor
extends Node

signal symbol_added_to_player(symbol_id: int)
signal symbols_destroyed_at_positions(positions: Array)
signal symbol_removed_from_player(instance: PlayerSymbolInstance)
signal symbol_evolved(old_instance: PlayerSymbolInstance, new_type_id: int, pos_x: int, pos_y: int)

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

# Check if a symbol is a religion symbol (IDs 15-18)
func _is_religion_symbol(symbol_id: int) -> bool:
	return symbol_id >= 15 and symbol_id <= 18

# Combat processing - happens before effects
func process_combat(board_grid: Array) -> Dictionary:
	var total_kills = 0
	var combat_results = []

	# Process all combat units attacking adjacent enemies
	for x in range(BOARD_WIDTH):
		for y in range(BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance == null:
				continue

			var symbol_def = symbol_data.get_symbol_by_id(symbol_instance.type_id)
			if symbol_def == null or symbol_def.symbol_type != Symbol.SymbolType.COMBAT:
				continue

			# Check if combat unit has attacks remaining
			if symbol_instance.remaining_attacks <= 0:
				continue

			# This is a combat unit - find adjacent enemies
			var nearby_coords = _get_nearby_coordinates(x, y)
			for coord in nearby_coords:
				var target = board_grid[coord.x][coord.y]
				if target == null:
					continue

				var target_def = symbol_data.get_symbol_by_id(target.type_id)
				if target_def == null or target_def.symbol_type != Symbol.SymbolType.ENEMY:
					continue

				# Attack the enemy
				if target.enemy_hp > 0 and symbol_instance.remaining_attacks > 0:
					var damage = symbol_instance.attack_power
					target.enemy_hp -= damage

					# Decrease remaining attacks
					symbol_instance.remaining_attacks -= 1

					combat_results.append({
						"attacker_pos": Vector2i(x, y),
						"target_pos": coord,
						"damage": damage,
						"target_killed": target.enemy_hp <= 0,
						"attacker_exhausted": symbol_instance.remaining_attacks <= 0
					})

					if target.enemy_hp <= 0:
						target.is_marked_for_destruction = true
						total_kills += 1

					# If combat unit exhausted, mark for destruction
					if symbol_instance.remaining_attacks <= 0:
						symbol_instance.is_marked_for_destruction = true
						print("Combat unit exhausted all attacks!")
						break  # Stop attacking

	return {"kills": total_kills, "combat_results": combat_results}

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
	var gold_gained = 0
	
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

	# Revolution: Will be processed in GameController._process_destroyed_revolution()
	elif symbol_definition.id == 10:  # Revolution
		# No effects during normal processing - all handled in destruction phase
		pass

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

	# Sheep: Provides 1 gold every 10 turns
	elif symbol_definition.id == 12:  # Sheep
		symbol_instance.effect_counter += 1
		# Check if counter reached 10 (reset happens in GameController)
		if symbol_instance.effect_counter >= 10:
			gold_gained += 1

	# Example: Library provides 1 exp
	elif symbol_definition.id == 13:  # Library
		exp_gained += 1

	# Ritual: Destroy self after 3 turns, provide 3 exp when destroyed
	elif symbol_definition.id == 14:  # Ritual
		symbol_instance.effect_counter += 1
		# Destroy after 3 turns (exp reward handled when destroyed)
		if symbol_instance.effect_counter >= 3:
			symbol_instance.is_marked_for_destruction = true
			exp_gained += 3

	# Protestantism: 2 food per nearby symbol, 1 exp, -50 food per nearby religion
	elif symbol_definition.id == 15:  # Protestantism
		exp_gained += 1  # Base exp
		var nearby_coords = _get_nearby_coordinates(x, y)
		var nearby_symbol_count = 0
		var nearby_religion_count = 0

		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				nearby_symbol_count += 1
				var nearby_def = symbol_data.get_symbol_by_id(nearby_symbol.type_id)
				if nearby_def != null and _is_religion_symbol(nearby_def.id):
					nearby_religion_count += 1

		food_gained += nearby_symbol_count * 2  # 2 food per nearby symbol
		food_gained -= nearby_religion_count * 50  # -50 food per nearby religion

	# Buddhism: 3 food per empty slot, 1 exp, -50 food per nearby religion
	elif symbol_definition.id == 16:  # Buddhism
		exp_gained += 1  # Base exp
		var nearby_coords = _get_nearby_coordinates(x, y)
		var empty_slot_count = 0
		var nearby_religion_count = 0

		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol == null:
				empty_slot_count += 1
			elif nearby_symbol != null:
				var nearby_def = symbol_data.get_symbol_by_id(nearby_symbol.type_id)
				if nearby_def != null and _is_religion_symbol(nearby_def.id):
					nearby_religion_count += 1

		food_gained += empty_slot_count * 3  # 3 food per empty slot
		food_gained -= nearby_religion_count * 50  # -50 food per nearby religion

	# Hinduism: 5 food (passive), 1 exp, -50 food per nearby religion
	elif symbol_definition.id == 17:  # Hinduism
		exp_gained += 1  # Base exp
		var nearby_coords = _get_nearby_coordinates(x, y)
		var nearby_religion_count = 0

		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				var nearby_def = symbol_data.get_symbol_by_id(nearby_symbol.type_id)
				if nearby_def != null and _is_religion_symbol(nearby_def.id):
					nearby_religion_count += 1

		food_gained -= nearby_religion_count * 50  # -50 food per nearby religion

	# Islam: 2 exp, -50 food per nearby religion
	elif symbol_definition.id == 18:  # Islam
		exp_gained += 2  # Base exp
		var nearby_coords = _get_nearby_coordinates(x, y)
		var nearby_religion_count = 0

		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				var nearby_def = symbol_data.get_symbol_by_id(nearby_symbol.type_id)
				if nearby_def != null and _is_religion_symbol(nearby_def.id):
					nearby_religion_count += 1

		food_gained -= nearby_religion_count * 50  # -50 food per nearby religion

	# Temple: 1 food, +5 food if no nearby symbols, +2 food if nearby any religion
	elif symbol_definition.id == 19:  # Temple
		var nearby_coords = _get_nearby_coordinates(x, y)
		var has_nearby_symbol = false
		var has_nearby_religion = false

		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				has_nearby_symbol = true
				var nearby_def = symbol_data.get_symbol_by_id(nearby_symbol.type_id)
				if nearby_def != null and _is_religion_symbol(nearby_def.id):
					has_nearby_religion = true

		# Passive 1 food already counted
		if not has_nearby_symbol:
			food_gained += 5  # +5 food if isolated
		if has_nearby_religion:
			food_gained += 2  # +2 food if near religion

	# Sail: Destroyed after being nearby Compass 5 times (food reward handled when destroyed)
	elif symbol_definition.id == 20:  # Sail
		# Initialize counter if needed
		if not symbol_instance.state_data.has("compass_nearby_count"):
			symbol_instance.state_data["compass_nearby_count"] = 0

		# Check if Compass is nearby
		var nearby_coords = _get_nearby_coordinates(x, y)
		var has_nearby_compass = false

		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				var nearby_def = symbol_data.get_symbol_by_id(nearby_symbol.type_id)
				if nearby_def != null and nearby_def.id == 21:  # Compass
					has_nearby_compass = true
					break

		# Increment counter if Compass is nearby
		if has_nearby_compass:
			symbol_instance.state_data["compass_nearby_count"] += 1
			print("Sail: Compass nearby count: ", symbol_instance.state_data["compass_nearby_count"])

		# Mark for destruction if counter reached 5 (food reward happens in destruction handler)
		if symbol_instance.state_data["compass_nearby_count"] >= 5:
			symbol_instance.is_marked_for_destruction = true

	# Compass: Destroyed after being nearby Sail 5 times (food reward handled when destroyed)
	elif symbol_definition.id == 21:  # Compass
		# Initialize counter if needed
		if not symbol_instance.state_data.has("sail_nearby_count"):
			symbol_instance.state_data["sail_nearby_count"] = 0

		# Check if Sail is nearby
		var nearby_coords = _get_nearby_coordinates(x, y)
		var has_nearby_sail = false

		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				var nearby_def = symbol_data.get_symbol_by_id(nearby_symbol.type_id)
				if nearby_def != null and nearby_def.id == 20:  # Sail
					has_nearby_sail = true
					break

		# Increment counter if Sail is nearby
		if has_nearby_sail:
			symbol_instance.state_data["sail_nearby_count"] += 1
			print("Compass: Sail nearby count: ", symbol_instance.state_data["sail_nearby_count"])

		# Mark for destruction if counter reached 5 (food reward happens in destruction handler)
		if symbol_instance.state_data["sail_nearby_count"] >= 5:
			symbol_instance.is_marked_for_destruction = true

	# Campfire: +5 food every 5 turns, evolves to Town after 25 turns
	elif symbol_definition.id == 29:  # Campfire
		symbol_instance.effect_counter += 1

		# Provide food every 5 turns
		if symbol_instance.effect_counter % 5 == 0:
			food_gained += 5

		# Evolve to Town after 25 turns
		if symbol_instance.effect_counter >= 25:
			symbol_evolved.emit(symbol_instance, 30, x, y)  # 30 = Town ID

	# Town: +5 food every 3 turns, evolves to City after 25 turns
	elif symbol_definition.id == 30:  # Town
		symbol_instance.effect_counter += 1

		# Provide food every 3 turns
		if symbol_instance.effect_counter % 3 == 0:
			food_gained += 5

		# Evolve to City after 25 turns
		if symbol_instance.effect_counter >= 25:
			symbol_evolved.emit(symbol_instance, 31, x, y)  # 31 = City ID

	# City: Passive +5 food per turn (no counter needed)
	elif symbol_definition.id == 31:  # City
		# City provides passive food only (already handled by passive_food = 5)
		pass

	# Wine: Destroy self after 3 turns, provide 5 food and -1 exp every turn
	elif symbol_definition.id == 32:  # Wine
		symbol_instance.effect_counter += 1
		# Provide -1 exp every turn (food is passive +5)
		exp_gained -= 1
		# Destroy after 3 turns
		if symbol_instance.effect_counter >= 3:
			symbol_instance.is_marked_for_destruction = true

	# Taxation: +2 gold for 3 turns and destroy self
	elif symbol_definition.id == 33:  # Taxation
		symbol_instance.effect_counter += 1
		# Provide gold while counter < 3
		if symbol_instance.effect_counter <= 3:
			gold_gained += 2
		# Destroy after 3 turns
		if symbol_instance.effect_counter >= 3:
			symbol_instance.is_marked_for_destruction = true

	# Merchant: -3 food (passive), +1 gold for every nearby symbol
	elif symbol_definition.id == 34:  # Merchant
		var nearby_coords = _get_nearby_coordinates(x, y)
		var nearby_symbol_count = 0
		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				nearby_symbol_count += 1
		gold_gained += nearby_symbol_count

	# Guild: -5 food (passive), +5 gold for every nearby empty slot
	elif symbol_definition.id == 35:  # Guild
		var nearby_coords = _get_nearby_coordinates(x, y)
		var empty_slot_count = 0
		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol == null:
				empty_slot_count += 1
		gold_gained += empty_slot_count * 5

	# Forest: +1 food (passive), +30 food when destroyed
	elif symbol_definition.id == 36:  # Forest
		# Passive food only, destruction reward handled in GameController
		pass

	# Forest Clearing: +1 food (passive), destroy nearby Forest
	elif symbol_definition.id == 37:  # Forest Clearing
		var nearby_coords = _get_nearby_coordinates(x, y)
		for coord in nearby_coords:
			var nearby_symbol = board_grid[coord.x][coord.y]
			if nearby_symbol != null:
				var nearby_def = symbol_data.get_symbol_by_id(nearby_symbol.type_id)
				if nearby_def != null and nearby_def.id == 36:  # Forest
					# Mark Forest for destruction (will trigger its food effect)
					destroy_symbol(nearby_symbol)

	return {"food": food_gained, "exp": exp_gained, "gold": gold_gained}

# Reset counter for symbols that triggered effects
func reset_symbol_counter_if_needed(symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol) -> void:
	if symbol_definition.id == 1 and symbol_instance.effect_counter >= 6:  # Wheat
		symbol_instance.effect_counter = 0
	elif symbol_definition.id == 2 and symbol_instance.effect_counter >= 8:  # Rice
		symbol_instance.effect_counter = 0
	elif symbol_definition.id == 12 and symbol_instance.effect_counter >= 10:  # Sheep
		symbol_instance.effect_counter = 0
	# Banana counter never resets - it's a permanent upgrade after 10 placements

# Destroy symbol (can be called by external effects)
func destroy_symbol(symbol_instance: PlayerSymbolInstance) -> void:
	symbol_instance.is_marked_for_destruction = true
