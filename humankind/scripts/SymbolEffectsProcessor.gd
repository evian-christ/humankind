class_name SymbolEffectsProcessor
extends Node

# 심볼 효과 처리 클래스
signal symbol_added_to_player(symbol_id: int)

const BOARD_WIDTH = 5
const BOARD_HEIGHT = 4

var symbol_data: SymbolData

func _init(symbol_data_ref: SymbolData):
	symbol_data = symbol_data_ref

# 보드의 모든 심볼 상호작용 처리
func process_symbol_interactions(board_grid: Array) -> Dictionary:
	# Update turn counters for all symbols (for Rice effect)
	for x in range(BOARD_WIDTH):
		for y in range(BOARD_HEIGHT):
			var symbol_instance = board_grid[x][y]
			if symbol_instance != null:
				var turn_count = symbol_instance.state_data.get("turn_count", 0)
				symbol_instance.state_data["turn_count"] = turn_count + 1
	
	var total_food_gained = 0
	var total_exp_gained = 0
	
	for x in range(BOARD_WIDTH):
		for y in range(BOARD_HEIGHT):
			var current_symbol_instance = board_grid[x][y]
			if current_symbol_instance != null:
				var symbol_definition = symbol_data.get_symbol_by_id(current_symbol_instance.type_id)
				
				if symbol_definition != null:
					var results = process_symbol_simple_effect(current_symbol_instance, symbol_definition, x, y, board_grid)
					total_food_gained += results.get("food", 0)
					total_exp_gained += results.get("exp", 0)
	
	return {"food": total_food_gained, "exp": total_exp_gained}

# Simple effect processing for CSV symbols
func process_symbol_simple_effect(symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol, board_x: int, board_y: int, board_grid: Array) -> Dictionary:
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
				food_gained = 10
				# Mark for destruction - will be handled by effects processor
				board_grid[board_x][board_y] = null
				symbols_destroyed_at_positions.emit([Vector2i(board_x, board_y)])
				symbol_removed_from_player.emit(symbol_instance)
				print("Fish destroyed after 5 turns, produced 10 food")
		
		4: # Fishing boat - Provide 1 food. Destroy nearby Fish
			food_gained = 1
			var destroyed_fish = destroy_nearby_symbol_by_name(board_x, board_y, "Fish", board_grid)
			print("Fishing boat produced 1 food, destroyed ", destroyed_fish, " Fish")
		
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
		
		10: # Revolution - Destroy nearby symbols and provide random symbols as much as destroyed
			var destroyed_positions = []
			var nearby_coords = get_nearby_coordinates(board_x, board_y)
			var destroyed_count = 0
			
			for coord in nearby_coords:
				var x = coord.x
				var y = coord.y
				var nearby_instance = board_grid[x][y]
				if nearby_instance != null:
					board_grid[x][y] = null
					destroyed_count += 1
					destroyed_positions.append(Vector2i(x, y))
					symbol_removed_from_player.emit(nearby_instance)
			
			if destroyed_positions.size() > 0:
				symbols_destroyed_at_positions.emit(destroyed_positions)
				# Add random symbols to player
				for i in range(destroyed_count):
					var random_symbol_id = randi() % 21 + 1 # Random symbol 1-21
					symbol_added_to_player.emit(random_symbol_id)
				print("Revolution destroyed ", destroyed_count, " symbols, added ", destroyed_count, " random symbols")
		
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
				exp_gained = 3
				board_grid[board_x][board_y] = null
				symbols_destroyed_at_positions.emit([Vector2i(board_x, board_y)])
				symbol_removed_from_player.emit(symbol_instance)
				print("Ritual destroyed after 3 turns, produced 3 exp")
		
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
				interaction_count += 1
				symbol_instance.state_data["interaction_count"] = interaction_count
				print(symbol_definition.symbol_name, " interacted with ", target_name, " (", interaction_count, "/5)")
				
				if interaction_count >= 5:
					# Destroy both symbols and provide 25 food each
					board_grid[board_x][board_y] = null
					board_grid[x][y] = null
					symbols_destroyed_at_positions.emit([Vector2i(board_x, board_y), Vector2i(x, y)])
					symbol_removed_from_player.emit(symbol_instance)
					symbol_removed_from_player.emit(nearby_instance)
					print(symbol_definition.symbol_name, " and ", target_name, " destroyed after 5 interactions, each provided 25 food")
					return {"food": 50, "exp": 0}  # Both symbols provide 25 food each
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
	var destroyed_positions = []
	var destroyed_instances = []
	var nearby_coords = get_nearby_coordinates(board_x, board_y)
	
	for coord in nearby_coords:
		var x = coord.x
		var y = coord.y
		var nearby_instance = board_grid[x][y]
		if nearby_instance != null:
			var nearby_symbol = symbol_data.get_symbol_by_id(nearby_instance.type_id)
			if nearby_symbol != null and nearby_symbol.symbol_name == symbol_name:
				board_grid[x][y] = null
				destroyed += 1
				destroyed_positions.append(Vector2i(x, y))
				destroyed_instances.append(nearby_instance)
	
	if destroyed_positions.size() > 0:
		symbols_destroyed_at_positions.emit(destroyed_positions)
		# Also emit signal to remove from player_symbols array
		for instance in destroyed_instances:
			symbol_removed_from_player.emit(instance)
	
	return destroyed

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

# 심볼에 카운터 효과가 있는지 확인
func symbol_has_counter_effect(symbol_definition: Symbol) -> bool:
	if symbol_definition == null:
		return false
	
	# Symbols with turn_count counters: Wheat(1), Rice(2), Fish(3), Ritual(14)
	if symbol_definition.id == 1 or symbol_definition.id == 2 or symbol_definition.id == 3 or symbol_definition.id == 14:
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