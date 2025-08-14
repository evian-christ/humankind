class_name EffectProcessor
extends RefCounted

const EffectTypes = preload("res://scripts/EffectTypes.gd")

static func process_symbol_effects(symbol_instance, symbol_definition, board_x: int, board_y: int, board_grid, symbol_data) -> int:
	var total_food = 0
	
	for effect in symbol_definition.effects:
		var condition_dict = effect.get("condition", {})
		var condition_result = check_condition(condition_dict, board_x, board_y, board_grid, symbol_data, symbol_instance)
		
		if condition_result > 0:
			var effect_dict = effect.get("effect", {})
			var food_gain = apply_effect(effect_dict, condition_result)
			total_food += food_gain
	return total_food
	
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
			print(symbol_instance.state_data[counter_name])
			
			if symbol_instance.state_data[counter_name] >= trigger_value:
				symbol_instance.state_data[counter_name] = 0
				return 1
			else:
				return 0
		_:
			return 0
	
static func apply_effect(effect_dict: Dictionary, condition_result: int) -> int:
	var effect_type = effect_dict.get("type", 0)
	var params = effect_dict.get("params", {})
	
	match effect_type:
		EffectTypes.EffectType.ADD_FOOD:
			var amount = params.get("amount", 0)
			return condition_result * amount
		_:
			return 0
