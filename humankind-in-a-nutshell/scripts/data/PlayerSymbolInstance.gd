class_name PlayerSymbolInstance
extends Resource

@export var instance_id: int
@export var type_id: int
@export var state_data: Dictionary

# Track when this symbol was added to player collection
@export var added_turn: int = 0

# Counter system for timed effects (e.g., Wheat every 6 turns)
@export var effect_counter: int = 0

# Destruction system (e.g., Fish destroyed after 5 turns)
@export var is_marked_for_destruction: bool = false

# Combat system - Enemy stats
@export var enemy_hp: int = 0  # Current HP for enemy symbols (0 = not an enemy)

# Combat system - Combat unit stats
@export var attack_power: int = 0      # Attack damage per hit
@export var remaining_attacks: int = 0  # Number of attacks left (0 = exhausted)