extends RefCounted

enum ConditionType {
	NONE = 0,
	ADJACENT_SYMBOL_COUNT = 1,
	COUNTER_TRIGGER = 2,
	COMBINED_CONDITION = 3,
}

enum EffectType {
	ADD_FOOD = 1,
}
