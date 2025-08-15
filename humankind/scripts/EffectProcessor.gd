class_name EffectProcessor
extends RefCounted

const EffectTypes = preload("res://scripts/EffectTypes.gd")

static func process_symbol_effects(symbol_instance, symbol_definition, board_x: int, board_y: int, board_grid, symbol_data, gameboard = null) -> Dictionary:
	var total_food = 0
	var total_exp = 0
	var should_remove_self = false
	
	for effect in symbol_definition.effects:
		var condition_dict = effect.get("condition", {})
		var condition_result = check_condition(condition_dict, board_x, board_y, board_grid, symbol_data, symbol_instance)
		
		if condition_result > 0:
			var effect_dict = effect.get("effect", {})
			var effect_result = apply_effect(effect_dict, condition_result, symbol_instance, gameboard)
			total_food += effect_result.get("food", 0)
			total_exp += effect_result.get("exp", 0)
			if effect_result.get("remove_self", false):
				should_remove_self = true
	
	return {"food": total_food, "exp": total_exp, "remove_self": should_remove_self}

static func has_nearby_symbol(board_x: int, board_y: int, board_grid, target_symbol_ids: Array) -> bool:
	for target_id in target_symbol_ids:
		for dx in range(-1, 2):
			for dy in range(-1, 2):
				if dx == 0 and dy == 0:
					continue
				var nx = board_x + dx
				var ny = board_y + dy
				
				if nx >= 0 and nx < 5 and ny >= 0 and ny < 4:
					var nearby_symbol = board_grid[nx][ny]
					if nearby_symbol != null and nearby_symbol.type_id == target_id:
						return true
	return false

static func count_nearby_symbols(board_x: int, board_y: int, board_grid, target_symbol_ids: Array) -> int:
	var count = 0
	for target_id in target_symbol_ids:
		for dx in range(-1, 2):
			for dy in range(-1, 2):
				if dx == 0 and dy == 0:
					continue
				var nx = board_x + dx
				var ny = board_y + dy
				
				if nx >= 0 and nx < 5 and ny >= 0 and ny < 4:
					var nearby_symbol = board_grid[nx][ny]
					if nearby_symbol != null and nearby_symbol.type_id == target_id:
						count += 1
	return count
	
static func check_condition(condition_dict: Dictionary, board_x: int, board_y: int, board_grid, symbol_data, symbol_instance) -> int:
	var condition_type = condition_dict.get("type", 0)
	var params = condition_dict.get("params", {})
	
	match condition_type:
		EffectTypes.ConditionType.NONE:
			return 1
		EffectTypes.ConditionType.ADJACENT_SYMBOL_COUNT:
			var target_symbol_id = params.get("target_symbol_id", 0)
			var count = 0
			
			for dx in range(-1, 2):
				for dy in range(-1, 2):
					if dx == 0 and dy == 0:
						continue
					var nx = board_x + dx
					var ny = board_y + dy
					
					if nx >= 0 and nx < 5 and ny >= 0 and ny < 4:
						var nearby_symbol = board_grid[nx][ny]
						if nearby_symbol != null:
							if nearby_symbol.type_id == target_symbol_id:
								count += 1
			return count
		EffectTypes.ConditionType.COUNTER_TRIGGER:
			var counter_name = params.get("counter_name", "turn_count")
			var trigger_value = params.get("trigger_value", 1)
			
			var current_count = symbol_instance.state_data.get(counter_name, 0)
			
			symbol_instance.state_data[counter_name] = current_count + 1
			
			if symbol_instance.state_data[counter_name] >= trigger_value:
				symbol_instance.state_data[counter_name] = 0
				return 1
			else:
				return 0
		EffectTypes.ConditionType.COMBINED_CONDITION:
			var nearby_symbols = params.get("nearby_symbols", [])
			var counter_name = params.get("counter_name", "activation_count") 
			var trigger_value = params.get("trigger_value", 1)
			
			var nearby_count = count_nearby_symbols(board_x, board_y, board_grid, nearby_symbols)
			if nearby_count > 0:
				var current_count = symbol_instance.state_data.get(counter_name, 0)
				symbol_instance.state_data[counter_name] = current_count + nearby_count
				print(symbol_instance.state_data[counter_name])
				
				if symbol_instance.state_data[counter_name] >= trigger_value:
					symbol_instance.state_data[counter_name] -= trigger_value
					return 1
			
			return 0
		EffectTypes.ConditionType.PROBABILITY_CONDITION:
			var chance = params.get("chance", 100)  # Percentage
			var target_symbol_id = params.get("target_symbol_id", 0)
			
			# First check if required nearby symbol exists
			if target_symbol_id > 0:
				var has_nearby = has_nearby_symbol(board_x, board_y, board_grid, [target_symbol_id])
				if not has_nearby:
					return 0  # No nearby symbol, no chance to trigger
			
			# Then check probability
			var random_value = randi() % 100
			return 1 if random_value < chance else 0
		EffectTypes.ConditionType.ANY_TERRAIN_CONDITION:
			var terrain_types = [1, 2, 3, 4, 5, 6, 7, 8]  # All terrain IDs
			return count_nearby_symbols(board_x, board_y, board_grid, terrain_types)
		EffectTypes.ConditionType.MULTIPLE_SYMBOL_CONDITION:
			var required_symbols = params.get("required_symbols", [])
			var total_count = 0
			for symbol_id in required_symbols:
				total_count += count_nearby_symbols(board_x, board_y, board_grid, [symbol_id])
			return total_count
		_:
			return 0
	
static func apply_effect(effect_dict: Dictionary, condition_result: int, symbol_instance, gameboard = null) -> Dictionary:
	var effect_type = effect_dict.get("type", 0)
	var params = effect_dict.get("params", {})
	
	match effect_type:
		EffectTypes.EffectType.ADD_FOOD:
			var variable_name = params.get("variable_name", "")
			if variable_name != "":
				# Use variable amount from symbol instance
				# Different default values for different symbols
				var default_value = 1
				if symbol_instance.type_id == 16:  # Sheep ID
					default_value = 0
				var base_amount = symbol_instance.state_data.get(variable_name, default_value)
				return {"food": condition_result * base_amount, "exp": 0, "remove_self": false}
			else:
				# Use fixed amount
				var amount = params.get("amount", 0)
				return {"food": condition_result * amount, "exp": 0, "remove_self": false}
		EffectTypes.EffectType.ADD_EXPERIENCE:
			var amount = params.get("amount", 0)
			var exp_gained = condition_result * amount
			print("Experience gained: ", exp_gained)
			return {"food": 0, "exp": exp_gained, "remove_self": false}
		EffectTypes.EffectType.SPAWN_SYMBOL:
			var symbol_id = params.get("symbol_id", 0)
			var chance = params.get("chance", 100)
			if gameboard != null and symbol_id > 0:
				# The condition already checked the probability, so we spawn the symbol
				gameboard.add_symbol_to_player(symbol_id)
				print("Successfully spawned symbol ", symbol_id)
			else:
				print("Cannot spawn symbol - missing gameboard reference or invalid symbol_id")
			return {"food": 0, "exp": 0, "remove_self": false}  # No food from spawning
		EffectTypes.EffectType.REMOVE_SELF:
			print("Symbol removes itself")
			return {"food": 0, "exp": 0, "remove_self": true}  # Flag for removal
		EffectTypes.EffectType.INCREASE_VARIABLE:
			var variable_name = params.get("variable_name", "")
			var amount = params.get("amount", 1)
			if variable_name != "":
				# Different default values for different symbols
				var default_value = 1
				if symbol_instance.type_id == 16:  # Sheep ID
					default_value = 0
				var current_value = symbol_instance.state_data.get(variable_name, default_value)
				symbol_instance.state_data[variable_name] = current_value + amount
				print("Increased ", variable_name, " by ", amount, " to ", symbol_instance.state_data[variable_name])
			return {"food": 0, "exp": 0, "remove_self": false}  # No immediate food from variable increase
		_:
			return {"food": 0, "exp": 0, "remove_self": false}
