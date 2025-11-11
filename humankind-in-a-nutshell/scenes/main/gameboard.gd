extends Node2D

# Simplified gameboard - now just coordinates the GameController

var game_controller: Node

func _ready() -> void:
	# Load and create the main game controller
	var GameControllerClass = load("res://scripts/core/GameController.gd")
	game_controller = GameControllerClass.new()
	add_child(game_controller)
	
	print("Gameboard: Refactored gameboard loaded with GameController")
	_debug_print_ui_boundaries()

# Legacy function for button connection - delegate to controller
func _on_spin_button_pressed() -> void:
	# This will be called by the scene connection, but GameController handles the actual logic
	pass

func _debug_print_ui_boundaries() -> void:
	var ui_root := get_parent().get_node("UI")
	if ui_root == null:
		print("Debug: UI root not found")
		return
	var top_bar: Panel = ui_root.get_node("TopBar")
	var main_frame: Panel = ui_root.get_node("MainAreaFrame")
	var bottom_bar: Panel = ui_root.get_node("BottomBar")
	for panel in [top_bar, main_frame, bottom_bar]:
		if panel:
			var style = panel.get_theme_stylebox("panel")
			print("--- Debug Panel ---")
			print("Node: ", panel.name)
			print("Style: ", style)
			if style is StyleBox:
				print("Border widths:", style.get_border_width(SIDE_LEFT), style.get_border_width(SIDE_TOP), style.get_border_width(SIDE_RIGHT), style.get_border_width(SIDE_BOTTOM))
				if style is StyleBoxFlat:
					print("Draw center:", style.draw_center)
					print("Border color:", style.border_color)
					print("BG color:", style.bg_color)
			else:
				print("Panel has no StyleBox override")
