class_name PlayerSymbolInstance
extends Resource

@export var instance_id: int
@export var type_id: int
@export var state_data: Dictionary

# HP system for combat units
@export var current_hp: int = -1  # -1 means no HP (not a combat unit)
@export var max_hp: int = -1

# Track when this symbol was added to player collection
@export var added_turn: int = 0

# Counter system for timed effects (e.g., Wheat every 6 turns)
@export var effect_counter: int = 0

# Destruction system (e.g., Fish destroyed after 5 turns)
@export var is_marked_for_destruction: bool = false