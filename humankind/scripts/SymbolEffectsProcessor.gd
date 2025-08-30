class_name SymbolEffectsProcessor
extends Node

# 심볼 효과 처리 클래스
signal symbol_added_to_player(symbol_id: int)

const BOARD_WIDTH = 5
const BOARD_HEIGHT = 4

var symbol_data: SymbolData
var delayed_destructions: Array = []  # Array of {x, y, reason} for delayed destruction

func _init(symbol_data_ref: SymbolData):
	symbol_data = symbol_data_ref

# 보드의 모든 심볼 상호작용 처리
func process_symbol_interactions(board_grid: Array, current_turn: int = 0) -> Dictionary:
	update_all_turn_counters(board_grid)
	
	var total_food_gained = 0
	var total_exp_gained = 0
	
	for x in range(BOARD_WIDTH):
		for y in range(BOARD_HEIGHT):
			var current_symbol_instance = board_grid[x][y]
			if current_symbol_instance != null:
				var symbol_definition = symbol_data.get_symbol_by_id(current_symbol_instance.type_id)
				
				if symbol_definition != null:
					var results = process_symbol_simple_effect(current_symbol_instance, symbol_definition, x, y, board_grid, current_turn)
					total_food_gained += results.get("food", 0)
					total_exp_gained += results.get("exp", 0)
	
	return {"food": total_food_gained, "exp": total_exp_gained}

# Update turn counters for all symbols (separated for visual processing)
func update_all_turn_counters(board_grid: Array) -> void:
	for x in range(BOARD_WIDTH):
		for y in range(BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null:
				var turn_count = symbol_instance.state_data.get("turn_count", 0)
				symbol_instance.state_data["turn_count"] = turn_count + 1

# Process a single symbol's effect (for visual processing)
func process_single_symbol_effect(symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol, x: int, y: int, board_grid: Array, current_turn: int = 0) -> Dictionary:
	return process_symbol_simple_effect(symbol_instance, symbol_definition, x, y, board_grid, current_turn)

# Mark a position for delayed destruction
func mark_for_delayed_destruction(x: int, y: int, reason: String) -> void:
	delayed_destructions.append({"x": x, "y": y, "reason": reason})

# Execute all delayed destructions and return total effects with position info
func execute_delayed_destructions(board_grid: Array) -> Dictionary:
	var total_food = 0
	var total_exp = 0
	var total_destroyed = 0
	var destruction_details = []  # Array of {x, y, food, exp, symbol_name}
	
	for destruction in delayed_destructions:
		var x = destruction.x
		var y = destruction.y
		var reason = destruction.reason
		
		if board_grid[x][y] != null:
			var symbol_instance = board_grid[x][y]
			var symbol_definition = symbol_data.get_symbol_by_id(symbol_instance.type_id)
			var symbol_name = symbol_definition.symbol_name if symbol_definition else "Unknown"
			
			var destruction_result = destroy_symbol_at_position(x, y, board_grid)
			if destruction_result.get("destroyed", false):
				total_destroyed += 1
				var food_gained = destruction_result.get("food", 0)
				var exp_gained = destruction_result.get("exp", 0)
				total_food += food_gained
				total_exp += exp_gained
				
				# Store destruction details for individual display
				if food_gained > 0 or exp_gained > 0:
					destruction_details.append({
						"x": x,
						"y": y, 
						"food": food_gained,
						"exp": exp_gained,
						"symbol_name": symbol_name
					})
				
				print("Delayed destruction at [", x, ",", y, "] by ", reason, ": ", symbol_name, " provided +", food_gained, " food, +", exp_gained, " exp")
	
	delayed_destructions.clear()
	return {
		"food": total_food, 
		"exp": total_exp, 
		"destroyed": total_destroyed,
		"details": destruction_details
	}

# Simple effect processing for CSV symbols
func process_symbol_simple_effect(symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol, board_x: int, board_y: int, board_grid: Array, current_turn: int = 0) -> Dictionary:
	var food_gained = 0
	var exp_gained = 0
	
	match symbol_definition.id:
		1: # Wheat - Provide 8 food every 6 turns
			var turn_count = symbol_instance.state_data.get("turn_count", 0)
			if turn_count > 0 and turn_count % 6 == 0:
				food_gained = 8
				print("Wheat produced 8 food (turn ", turn_count, ")")
		
		2: # Rice - Provide 11 food every 8 turns
			var turn_count = symbol_instance.state_data.get("turn_count", 0)
			if turn_count > 0 and turn_count % 8 == 0:
				food_gained = 11
				print("Rice produced 11 food (turn ", turn_count, ")")
		
		3: # Fish - Destroy self after 5 turns. Provide 10 food when destroyed
			var turn_count = symbol_instance.state_data.get("turn_count", 0)
			if turn_count >= 5:
				var destruction_result = destroy_symbol_at_position(board_x, board_y, board_grid)
				food_gained = destruction_result.get("food", 0)
				exp_gained += destruction_result.get("exp", 0)
				print("Fish destroyed after 5 turns, produced ", food_gained, " food")
		
		4: # Fishing boat - Provide 1 food. Destroy nearby Fish
			food_gained = 1
			var destruction_result = destroy_nearby_symbol_by_name_with_effects(board_x, board_y, "Fish", board_grid)
			var destroyed_fish = destruction_result.count
			var destruction_food = destruction_result.food
			var destruction_exp = destruction_result.exp
			food_gained += destruction_food
			exp_gained += destruction_exp
			print("Fishing boat produced ", 1 + destruction_food, " food (", destruction_food, " from destroying ", destroyed_fish, " Fish)")
		
		5: # Banana - Provide 1 food. Provide 1 more food if placed on slot for more than 10 times
			food_gained = 1
			var placement_count = symbol_instance.state_data.get("placement_count", 0)
			if placement_count > 10:
				food_gained += 1
				print("Banana produced 2 food (placed ", placement_count, " times)")
			else:
				print("Banana produced 1 food")
		
		6: # Sugar - Provide 1 food. Provide 1 food for each nearby Sugar
			food_gained = 1
			var nearby_sugar_count = count_nearby_symbol_by_name(board_x, board_y, "Sugar", board_grid)
			food_gained += nearby_sugar_count
			if nearby_sugar_count > 0:
				print("Sugar produced ", food_gained, " food (", nearby_sugar_count, " nearby Sugar)")
			else:
				print("Sugar produced 1 food")
		
		7: # Mine - Provide 1 food. Provide Coal by 1%
			food_gained = 1
			print("Mine produced 1 food")
			# 1% chance to spawn Coal
			if randf() < 0.01:
				symbol_added_to_player.emit(8) # Coal ID
				print("Mine spawned Coal!")
		
		8: # Coal - Provide 3 food
			food_gained = 3
			print("Coal produced 3 food")
		
		9: # Industrial Revolution - Destroy nearby coal. Provide 1 food for every coal destroyed this game
			var destroyed_coal = destroy_nearby_symbol_by_name(board_x, board_y, "Coal", board_grid)
			var total_coal_destroyed = symbol_instance.state_data.get("total_coal_destroyed", 0)
			total_coal_destroyed += destroyed_coal
			symbol_instance.state_data["total_coal_destroyed"] = total_coal_destroyed
			food_gained = total_coal_destroyed
			if destroyed_coal > 0:
				print("Industrial Revolution destroyed ", destroyed_coal, " Coal, total destroyed: ", total_coal_destroyed, ", gained ", food_gained, " food")
		
		10: # Revolution - Mark self and nearby symbols for delayed destruction
			var nearby_coords = get_nearby_coordinates(board_x, board_y)
			var marked_count = 0
			
			# Mark nearby symbols for destruction
			for coord in nearby_coords:
				var x = coord.x
				var y = coord.y
				if board_grid[x][y] != null:
					mark_for_delayed_destruction(x, y, "Revolution")
					marked_count += 1
			
			# Mark self for destruction
			mark_for_delayed_destruction(board_x, board_y, "Revolution")
			marked_count += 1
			
			# Add random symbols to player immediately (based on expected destruction count)
			for i in range(marked_count):
				var random_symbol_id = randi() % 21 + 1 # Random symbol 1-21
				symbol_added_to_player.emit(random_symbol_id)
			
			print("Revolution marked ", marked_count, " symbols for destruction (including itself), added ", marked_count, " random symbols")
		
		11: # Cow - Provide 1 food. Provide 1 food if nearby Cow
			food_gained = 1
			var nearby_cow_count = count_nearby_symbol_by_name(board_x, board_y, "Cow", board_grid)
			food_gained += nearby_cow_count
			print("Cow produced ", food_gained, " food")
		
		12: # Sheep - Provide 1 food
			food_gained = 1
			print("Sheep produced 1 food")
		
		13: # Library - Provide 1 food & 1 exp
			food_gained = 1
			exp_gained = 1
			print("Library produced 1 food and 1 exp")
		
		14: # Ritual - Destroy self after 3 turns. Provide 3 exp when destroyed
			var turn_count = symbol_instance.state_data.get("turn_count", 0)
			if turn_count >= 3:
				var destruction_result = destroy_symbol_at_position(board_x, board_y, board_grid)
				food_gained += destruction_result.get("food", 0)
				exp_gained += destruction_result.get("exp", 0)
				print("Ritual destroyed after 3 turns, produced ", destruction_result.get("exp", 0), " exp")
		
		15: # Protestantism - Provide 2 food for every nearby symbol. Provide 1 exp. -50 food for every nearby religion symbols
			var nearby_coords = get_nearby_coordinates(board_x, board_y)
			var nearby_count = 0
			var nearby_religion_count = 0
			
			for coord in nearby_coords:
				var x = coord.x
				var y = coord.y
				var nearby_instance = board_grid[x][y]
				if nearby_instance != null:
					nearby_count += 1
					var nearby_symbol = symbol_data.get_symbol_by_id(nearby_instance.type_id)
					if nearby_symbol != null and is_religion_symbol(nearby_symbol):
						nearby_religion_count += 1
			
			food_gained = nearby_count * 2 - nearby_religion_count * 50
			exp_gained = 1
			print("Protestantism produced ", food_gained, " food and 1 exp")
		
		16: # Buddhism - Provide 3 food for every empty slots. Provide 1 exp. -50 food for every nearby religion symbols
			var empty_slots = 0
			var nearby_religion_count = 0
			
			# Count empty slots on entire board
			for x in range(BOARD_WIDTH):
				for y in range(BOARD_HEIGHT):
					if board_grid[x][y] == null:
						empty_slots += 1
			
			# Count nearby religion symbols
			var nearby_coords = get_nearby_coordinates(board_x, board_y)
			for coord in nearby_coords:
				var x = coord.x
				var y = coord.y
				var nearby_instance = board_grid[x][y]
				if nearby_instance != null:
					var nearby_symbol = symbol_data.get_symbol_by_id(nearby_instance.type_id)
					if nearby_symbol != null and is_religion_symbol(nearby_symbol):
						nearby_religion_count += 1
			
			food_gained = empty_slots * 3 - nearby_religion_count * 50
			exp_gained = 1
			print("Buddhism produced ", food_gained, " food and 1 exp")
		
		17: # Hinduism - Provide 5 food. Provide 1 exp. -50 food for every nearby religion symbols
			food_gained = 5
			exp_gained = 1
			
			var nearby_religion_count = 0
			var nearby_coords = get_nearby_coordinates(board_x, board_y)
			for coord in nearby_coords:
				var x = coord.x
				var y = coord.y
				var nearby_instance = board_grid[x][y]
				if nearby_instance != null:
					var nearby_symbol = symbol_data.get_symbol_by_id(nearby_instance.type_id)
					if nearby_symbol != null and is_religion_symbol(nearby_symbol):
						nearby_religion_count += 1
			
			food_gained -= nearby_religion_count * 50
			print("Hinduism produced ", food_gained, " food and 1 exp")
		
		18: # Islam - Provide 2 exp. -50 food for every nearby religion symbols
			exp_gained = 2
			
			var nearby_religion_count = 0
			var nearby_coords = get_nearby_coordinates(board_x, board_y)
			for coord in nearby_coords:
				var x = coord.x
				var y = coord.y
				var nearby_instance = board_grid[x][y]
				if nearby_instance != null:
					var nearby_symbol = symbol_data.get_symbol_by_id(nearby_instance.type_id)
					if nearby_symbol != null and is_religion_symbol(nearby_symbol):
						nearby_religion_count += 1
			
			food_gained = -nearby_religion_count * 50
			print("Islam produced 2 exp and ", food_gained, " food")
		
		19: # Temple - Provide 1 food. Provide 5 food if no symbol is nearby. Provide 2 food if nearby any religion symbols
			food_gained = 1
			
			var nearby_coords = get_nearby_coordinates(board_x, board_y)
			var has_nearby_symbols = false
			var has_nearby_religion = false
			
			for coord in nearby_coords:
				var x = coord.x
				var y = coord.y
				var nearby_instance = board_grid[x][y]
				if nearby_instance != null:
					has_nearby_symbols = true
					var nearby_symbol = symbol_data.get_symbol_by_id(nearby_instance.type_id)
					if nearby_symbol != null and is_religion_symbol(nearby_symbol):
						has_nearby_religion = true
			
			if not has_nearby_symbols:
				food_gained += 5
			elif has_nearby_religion:
				food_gained += 2
			
			print("Temple produced ", food_gained, " food")
		
		20, 21: # Sail & Compass - Destroyed after being nearby each other 5 times
			var interaction_result = handle_sail_compass_interaction(symbol_instance, symbol_definition, board_x, board_y, board_grid)
			food_gained += interaction_result.get("food", 0)
			exp_gained += interaction_result.get("exp", 0)
		
		22: # Barbarian - Food drain and HP system
			# Food drain: -3(+0.5 * every 10 turns) food - fixed based on when added
			var base_drain = 3
			var additional_drain = (symbol_instance.added_turn / 10.0) * 0.5
			var total_drain = base_drain + additional_drain
			food_gained = -int(total_drain)
			
			# Debug logging
			print("DEBUG Barbarian: added_turn=", symbol_instance.added_turn, " additional_drain=", additional_drain, " total_drain=", total_drain, " (fixed drain for this symbol)")
			
			# Update HP: Base 12 + 2 * (every 10 turns when added) - fixed max HP
			var base_hp = 12
			var bonus_hp = int(symbol_instance.added_turn / 10) * 2
			var expected_max_hp = base_hp + bonus_hp
			
			# Update max HP if needed (should be fixed based on added_turn)
			if symbol_instance.max_hp != expected_max_hp:
				symbol_instance.max_hp = expected_max_hp
				# If this is the first time setting HP properly, set current HP to max
				if symbol_instance.current_hp == 12 and expected_max_hp > 12:
					symbol_instance.current_hp = expected_max_hp
			
			# -1 HP every turn
			symbol_instance.current_hp -= 1
			
			# Check if Barbarian dies (HP <= 0)
			if symbol_instance.current_hp <= 0:
				mark_for_delayed_destruction(board_x, board_y, "Barbarian died (HP <= 0)")
				print("Barbarian died from HP loss")
			else:
				print("Barbarian: -", int(total_drain), " food, HP: ", symbol_instance.current_hp, "/", symbol_instance.max_hp)
		
		23: # Warrior - Damage nearby Barbarians (-2 HP)
			food_gained = 0  # No food production
			damage_nearby_barbarians(board_x, board_y, 2, board_grid)
			print("Warrior dealt 2 damage to nearby Barbarians")
		
		24: # Swordsman - Damage nearby Barbarians (-4 HP)
			food_gained = 0
			damage_nearby_barbarians(board_x, board_y, 4, board_grid)
			print("Swordsman dealt 4 damage to nearby Barbarians")
		
		25: # Knight - Damage nearby Barbarians (-7 HP)
			food_gained = 0
			damage_nearby_barbarians(board_x, board_y, 7, board_grid)
			print("Knight dealt 7 damage to nearby Barbarians")
		
		26: # Cavalry - Damage nearby Barbarians (-11 HP)
			food_gained = 0
			damage_nearby_barbarians(board_x, board_y, 11, board_grid)
			print("Cavalry dealt 11 damage to nearby Barbarians")
		
		27: # Infantry - Damage nearby Barbarians (-16 HP)
			food_gained = 0
			damage_nearby_barbarians(board_x, board_y, 16, board_grid)
			print("Infantry dealt 16 damage to nearby Barbarians")
	
	return {"food": food_gained, "exp": exp_gained}

func is_religion_symbol(symbol: Symbol) -> bool:
	return symbol.id >= 15 and symbol.id <= 18  # Protestantism, Buddhism, Hinduism, Islam

func handle_sail_compass_interaction(symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol, board_x: int, board_y: int, board_grid: Array):
	var target_name = "Compass" if symbol_definition.id == 20 else "Sail"  # Sail looks for Compass, Compass looks for Sail
	var interaction_count = symbol_instance.state_data.get("interaction_count", 0)
	
	# Check if target is nearby
	var nearby_coords = get_nearby_coordinates(board_x, board_y)
	for coord in nearby_coords:
		var x = coord.x
		var y = coord.y
		var nearby_instance = board_grid[x][y]
		if nearby_instance != null:
			var nearby_symbol = symbol_data.get_symbol_by_id(nearby_instance.type_id)
			if nearby_symbol != null and nearby_symbol.symbol_name == target_name:
				# Increment interaction count for THIS symbol only
				interaction_count += 1
				symbol_instance.state_data["interaction_count"] = interaction_count
				
				print(symbol_definition.symbol_name, " interacted with ", target_name, " (", interaction_count, "/5)")
				
				# Only THIS symbol is destroyed if it reaches 5
				if interaction_count >= 5:
					# Destroy only this symbol and provide 25 food
					var destruction_result = destroy_symbol_at_position(board_x, board_y, board_grid)
					print(symbol_definition.symbol_name, " destroyed after 5 interactions, provided 25 food")
					return {"food": 25, "exp": 0}
				break
	
	return {"food": 0, "exp": 0}

func count_nearby_symbol_by_name(board_x: int, board_y: int, symbol_name: String, board_grid: Array) -> int:
	var count = 0
	var nearby_coords = get_nearby_coordinates(board_x, board_y)
	
	for coord in nearby_coords:
		var x = coord.x
		var y = coord.y
		var nearby_instance = board_grid[x][y]
		if nearby_instance != null:
			var nearby_symbol = symbol_data.get_symbol_by_id(nearby_instance.type_id)
			if nearby_symbol != null and nearby_symbol.symbol_name == symbol_name:
				count += 1
	return count

func destroy_nearby_symbol_by_name(board_x: int, board_y: int, symbol_name: String, board_grid: Array) -> int:
	var destroyed = 0
	var nearby_coords = get_nearby_coordinates(board_x, board_y)
	
	for coord in nearby_coords:
		var x = coord.x
		var y = coord.y
		var nearby_instance = board_grid[x][y]
		if nearby_instance != null:
			var nearby_symbol = symbol_data.get_symbol_by_id(nearby_instance.type_id)
			if nearby_symbol != null and nearby_symbol.symbol_name == symbol_name:
				var destruction_result = destroy_symbol_at_position(x, y, board_grid)
				if destruction_result.get("destroyed", false):
					destroyed += 1
	
	return destroyed

# Enhanced version that returns both count and food from destruction effects
func destroy_nearby_symbol_by_name_with_effects(board_x: int, board_y: int, symbol_name: String, board_grid: Array) -> Dictionary:
	var destroyed = 0
	var total_food_from_destruction = 0
	var total_exp_from_destruction = 0
	var nearby_coords = get_nearby_coordinates(board_x, board_y)
	
	for coord in nearby_coords:
		var x = coord.x
		var y = coord.y
		var nearby_instance = board_grid[x][y]
		if nearby_instance != null:
			var nearby_symbol = symbol_data.get_symbol_by_id(nearby_instance.type_id)
			if nearby_symbol != null and nearby_symbol.symbol_name == symbol_name:
				var destruction_result = destroy_symbol_at_position(x, y, board_grid)
				if destruction_result.get("destroyed", false):
					destroyed += 1
					total_food_from_destruction += destruction_result.get("food", 0)
					total_exp_from_destruction += destruction_result.get("exp", 0)
	
	return {"count": destroyed, "food": total_food_from_destruction, "exp": total_exp_from_destruction}

# Centralized destruction system - handles all symbol destruction with effects
func destroy_symbol_at_position(board_x: int, board_y: int, board_grid: Array) -> Dictionary:
	var symbol_instance = board_grid[board_x][board_y]
	if symbol_instance == null:
		return {"destroyed": false, "food": 0, "exp": 0}
	
	var symbol_definition = symbol_data.get_symbol_by_id(symbol_instance.type_id)
	var destruction_food = 0
	var destruction_exp = 0
	
	# Handle destruction effects before removing the symbol
	if symbol_definition != null:
		var destruction_effects = handle_symbol_destruction_effects(symbol_instance, symbol_definition)
		destruction_food = destruction_effects.get("food", 0)
		destruction_exp = destruction_effects.get("exp", 0)
	
	# Remove symbol from board
	board_grid[board_x][board_y] = null
	
	# Emit signals for UI updates and player symbol removal
	symbols_destroyed_at_positions.emit([Vector2i(board_x, board_y)])
	symbol_removed_from_player.emit(symbol_instance)
	
	return {"destroyed": true, "food": destruction_food, "exp": destruction_exp, "instance": symbol_instance}

# Handle effects that trigger when a symbol is destroyed
func handle_symbol_destruction_effects(symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol) -> Dictionary:
	var food_gained = 0
	var exp_gained = 0
	
	match symbol_definition.id:
		3: # Fish - Provide 10 food when destroyed (by any means)
			food_gained = 10
			print("Fish destroyed by external force, produced 10 food")
		
		14: # Ritual - Provide 3 exp when destroyed
			exp_gained = 3
			print("Ritual destroyed by external force, produced 3 exp")
		
		20, 21: # Sail & Compass - Provide 25 food when destroyed (by any means)
			food_gained = 25
			print(symbol_definition.symbol_name, " destroyed, provided 25 food")
	
	return {"food": food_gained, "exp": exp_gained}

# Signal for UI updates needed after symbol destruction
signal symbols_destroyed_at_positions(positions: Array)
signal symbol_removed_from_player(instance: PlayerSymbolInstance)

func get_nearby_coordinates(board_x: int, board_y: int) -> Array:
	var nearby = []
	for dx in range(-1, 2):
		for dy in range(-1, 2):
			if dx == 0 and dy == 0:
				continue
			var nx = board_x + dx
			var ny = board_y + dy
			if nx >= 0 and nx < BOARD_WIDTH and ny >= 0 and ny < BOARD_HEIGHT:
				nearby.append(Vector2i(nx, ny))
	return nearby

# Damage all nearby Barbarian symbols
func damage_nearby_barbarians(board_x: int, board_y: int, damage: int, board_grid: Array) -> void:
	var nearby_coords = get_nearby_coordinates(board_x, board_y)
	
	for coord in nearby_coords:
		var x = coord.x
		var y = coord.y
		var symbol_instance = board_grid[x][y]
		
		if symbol_instance != null:
			var symbol_definition = symbol_data.get_symbol_by_id(symbol_instance.type_id)
			if symbol_definition != null and symbol_definition.id == 22:  # Barbarian
				symbol_instance.current_hp -= damage
				print("Barbarian at (", x, ",", y, ") took ", damage, " damage, HP: ", symbol_instance.current_hp, "/", symbol_instance.max_hp)
				
				# Check if Barbarian dies
				if symbol_instance.current_hp <= 0:
					mark_for_delayed_destruction(x, y, "Barbarian killed by combat unit")
					print("Barbarian at (", x, ",", y, ") killed by combat damage")

# 심볼에 카운터 효과가 있는지 확인
func symbol_has_counter_effect(symbol_definition: Symbol) -> bool:
	if symbol_definition == null:
		return false
	
	# Symbols with turn_count counters: Wheat(1), Rice(2), Fish(3), Ritual(14)
	if symbol_definition.id == 1 or symbol_definition.id == 2 or symbol_definition.id == 3 or symbol_definition.id == 14:
		return true
	
	# Industrial Revolution (ID 9) has total_coal_destroyed counter
	if symbol_definition.id == 9:
		return true
	
	# Banana (ID 5) has placement_count counter
	if symbol_definition.id == 5:
		return true
	
	# Sail (20) and Compass (21) have interaction_count counter
	if symbol_definition.id == 20 or symbol_definition.id == 21:
		return true
	
	for effect in symbol_definition.effects:
		var condition_dict = effect.get("condition", {})
		var condition_type = condition_dict.get("type", 0)
		
		# Check if symbol has COUNTER_TRIGGER or COMBINED_CONDITION
		if condition_type == 2 or condition_type == 3:  # COUNTER_TRIGGER or COMBINED_CONDITION
			return true
	return false

# 심볼의 카운터 값 가져오기
func get_symbol_counter_value(symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol) -> int:
	if symbol_definition == null:
		return 0
	
	# Wheat (ID 1) uses turn_count % 6 to show cycle progress
	if symbol_definition.id == 1:
		var turn_count = symbol_instance.state_data.get("turn_count", 0)
		return turn_count % 6
	
	# Rice (ID 2) uses turn_count % 8 to show cycle progress
	if symbol_definition.id == 2:
		var turn_count = symbol_instance.state_data.get("turn_count", 0)
		return turn_count % 8
	
	# Fish (ID 3) shows turn_count up to 5
	if symbol_definition.id == 3:
		var turn_count = symbol_instance.state_data.get("turn_count", 0)
		return min(turn_count, 5)
	
	# Banana (ID 5) shows placement_count, capped at 10
	if symbol_definition.id == 5:
		var placement_count = symbol_instance.state_data.get("placement_count", 0)
		return min(placement_count, 10)
	
	# Industrial Revolution (ID 9) shows total_coal_destroyed
	if symbol_definition.id == 9:
		var total_coal_destroyed = symbol_instance.state_data.get("total_coal_destroyed", 0)
		return total_coal_destroyed
	
	# Ritual (ID 14) shows turn_count up to 3
	if symbol_definition.id == 14:
		var turn_count = symbol_instance.state_data.get("turn_count", 0)
		return min(turn_count, 3)
	
	# Sail (20) and Compass (21) show interaction_count up to 5
	if symbol_definition.id == 20 or symbol_definition.id == 21:
		var interaction_count = symbol_instance.state_data.get("interaction_count", 0)
		return min(interaction_count, 5)
	
	for effect in symbol_definition.effects:
		var condition_dict = effect.get("condition", {})
		var condition_type = condition_dict.get("type", 0)
		
		if condition_type == 2 or condition_type == 3:  # COUNTER_TRIGGER or COMBINED_CONDITION
			var params = condition_dict.get("params", {})
			var counter_name = params.get("counter_name", "turn_count")
			return symbol_instance.state_data.get(counter_name, 0)
	
	return 0

# 심볼에 가변 음식 생산이 있는지 확인
func symbol_has_variable_food(symbol_definition: Symbol) -> bool:
	if symbol_definition == null:
		return false
	for effect in symbol_definition.effects:
		var effect_dict = effect.get("effect", {})
		var params = effect_dict.get("params", {})
		var variable_name = params.get("variable_name", "")
		
		if variable_name == "base_food_per_turn":
			return true
	return false