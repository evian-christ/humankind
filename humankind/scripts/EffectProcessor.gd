class_name EffectProcessor
extends RefCounted

const EffectTypes = preload("res://scripts/EffectTypes.gd")

static func process_symbol_effects(symbol_instance, symbol_definition, board_x: int, board_y: int, board_grid, symbol_data) -> int:
	var total_food = 0
	
	for effect in symbol_definition.effects:
		var condition_dict = effect.get("condition", {})
		var condition_result = check_condition(condition_dict, board_x, board_y, board_grid, symbol_data)
		
		if condition_result > 0:
			var effect_dict = effect.get("effect", {})
			var food_gain = apply_effect(effect_dict, condition_result)
			total_food += food_gain
	return total_food
	
static func check_condition(condition_dict: Dictionary, board_x: int, board_y: int, board_grid, symbol_data) -> int:
	var condition_type = condition_dict.get("type", 0)
	var params = condition_dict.get("params", {})
	
	match condition_type:
		EffectTypes.ConditionType.NONE:
			return 1
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
