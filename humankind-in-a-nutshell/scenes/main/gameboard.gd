extends Node2D

# Simplified gameboard - now just coordinates the GameController

var game_controller: Node

func _ready() -> void:
	# Load and create the main game controller
	var GameControllerClass = load("res://scripts/core/GameController.gd")
	game_controller = GameControllerClass.new()
	add_child(game_controller)
	
	print("Gameboard: Refactored gameboard loaded with GameController")

# Legacy function for button connection - delegate to controller
func _on_spin_button_pressed() -> void:
	# This will be called by the scene connection, but GameController handles the actual logic
	pass
