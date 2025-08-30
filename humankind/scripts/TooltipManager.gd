class_name TooltipManager
extends Node2D

# 툴팁 시스템 관리 클래스
var tooltip: SymbolTooltip
var ui_node: Node
var gameboard_ref: Node

func _init(ui_reference: Node, gameboard_reference: Node = null):
	ui_node = ui_reference
	gameboard_ref = gameboard_reference

func _ready() -> void:
	# 툴팁 초기화
	tooltip = SymbolTooltip.new()
	ui_node.add_child(tooltip)
	# 툴팁을 최상단으로 이동
	tooltip.z_index = 1000

# 슬롯 툴팁 설정
func setup_slot_tooltip(slot: Panel, symbol_instance: PlayerSymbolInstance, symbol_definition: Symbol):
	# 기존 연결 해제 (중복 방지)
	clear_slot_tooltip(slot)
	
	# 슬롯을 마우스 감지 가능하게 설정
	slot.mouse_filter = Control.MOUSE_FILTER_PASS
	
	# 마우스 이벤트 연결
	slot.mouse_entered.connect(_on_slot_mouse_entered.bind(symbol_definition, symbol_instance))
	slot.mouse_exited.connect(_on_slot_mouse_exited)

# 슬롯 툴팁 연결 해제
func clear_slot_tooltip(slot: Panel):
	# 기존 시그널 연결 해제
	if slot.mouse_entered.is_connected(_on_slot_mouse_entered):
		slot.mouse_entered.disconnect(_on_slot_mouse_entered)
	if slot.mouse_exited.is_connected(_on_slot_mouse_exited):
		slot.mouse_exited.disconnect(_on_slot_mouse_exited)

# 슬롯에 마우스 진입 시
func _on_slot_mouse_entered(symbol_definition: Symbol, symbol_instance: PlayerSymbolInstance):
	var mouse_pos = get_global_mouse_position()
	var effect_text = symbol_definition.effect_text
	
	# Barbarian의 경우 동적으로 계산된 텍스트 사용
	if symbol_definition.id == 22:  # Barbarian
		# Food drain is fixed based on when this specific symbol was added
		var base_drain = 3
		var additional_drain = (symbol_instance.added_turn / 10.0) * 0.5
		var total_drain = base_drain + additional_drain
		
		effect_text = str(-int(total_drain)) + " food per turn. HP: " + str(symbol_instance.current_hp) + "/" + str(symbol_instance.max_hp) + ". -1 HP every turn."
	
	tooltip.show_tooltip(symbol_definition.symbol_name, effect_text, mouse_pos)
	tooltip.move_to_front()

# Get current turn from the game board
func get_current_turn() -> int:
	if gameboard_ref != null and "current_turn" in gameboard_ref:
		return gameboard_ref.current_turn
	return 0  # Default to 0 if can't find gameboard

# 슬롯에서 마우스 나갈 시
func _on_slot_mouse_exited():
	tooltip.hide_tooltip()

# 마우스 움직임 추적 (툴팁 위치 업데이트)
func handle_mouse_motion(mouse_pos: Vector2):
	if tooltip.visible:
		tooltip.update_position(mouse_pos)

# 선택 버튼 툴팁 설정
func setup_choice_button_tooltip(button: Button, symbol_definition: Symbol):
	# 기존 연결 해제 (중복 방지)
	if button.mouse_entered.is_connected(_on_choice_button_mouse_entered):
		button.mouse_entered.disconnect(_on_choice_button_mouse_entered)
	if button.mouse_exited.is_connected(_on_choice_button_mouse_exited):
		button.mouse_exited.disconnect(_on_choice_button_mouse_exited)
	
	# 새로운 연결
	button.mouse_entered.connect(_on_choice_button_mouse_entered.bind(symbol_definition))
	button.mouse_exited.connect(_on_choice_button_mouse_exited)

# 선택 버튼에 마우스 진입 시
func _on_choice_button_mouse_entered(symbol_definition: Symbol):
	var mouse_pos = get_global_mouse_position()
	tooltip.show_tooltip(symbol_definition.symbol_name, symbol_definition.effect_text, mouse_pos)
	tooltip.move_to_front()

# 선택 버튼에서 마우스 나갈 시
func _on_choice_button_mouse_exited():
	tooltip.hide_tooltip()
