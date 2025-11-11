extends Control

@export var border_color: Color = Color(1, 0, 0, 1)
@export var border_width: float = 3.0

func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	_process_border_update()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_process_border_update()

func _process_border_update() -> void:
	queue_redraw()

func _draw() -> void:
	var rect := Rect2(Vector2.ZERO, size)
	draw_rect(rect, border_color, false, border_width)
