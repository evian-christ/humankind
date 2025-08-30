class_name SymbolSelectionManager
extends Node

# 심볼 선택 관련 관리 클래스
signal symbol_selected(symbol_id: int)

var symbol_data: SymbolData
var tooltip_manager: TooltipManager
var gameboard_ref: Node

# UI 노드들
var symbol_selection_ui: Control
var choice_buttons: Array

# 선택 상태
var is_selection_phase: bool = false
var current_symbol_choices: Array[int] = []

func _init(symbol_data_ref: SymbolData, tooltip_ref: TooltipManager):
	symbol_data = symbol_data_ref
	tooltip_manager = tooltip_ref

func set_gameboard_reference(gb_ref: Node):
	gameboard_ref = gb_ref

func setup_ui(selection_ui: Control, buttons: Array):
	symbol_selection_ui = selection_ui
	choice_buttons = buttons
	
	# 심볼 선택 버튼 시그널 연결
	if choice_buttons.size() >= 3:
		choice_buttons[0].pressed.connect(_on_symbol_choice_selected.bind(0))
		choice_buttons[1].pressed.connect(_on_symbol_choice_selected.bind(1))
		choice_buttons[2].pressed.connect(_on_symbol_choice_selected.bind(2))

# 심볼 선택 단계 시작
func start_selection_phase() -> void:
	# Remove the early return so we can refresh during selection phase
	
	is_selection_phase = true
	current_symbol_choices = []
	
	# 확률 기반 심볼 선택 (3개)
	for i in range(3):
		var selected_symbol = _select_symbol_by_probability()
		current_symbol_choices.append(selected_symbol.id)
	
	# UI 업데이트
	_update_selection_ui()
	symbol_selection_ui.visible = true
	
	print("Selection phase started.")

# 심볼 선택지 새로고침 (디버그용)
func refresh_symbol_choices() -> void:
	if not is_selection_phase:
		start_selection_phase()
		return
	
	# 이미 선택 단계인 경우 선택지만 새로고침
	current_symbol_choices = []
	
	# 확률 기반 심볼 선택 (3개)
	for i in range(3):
		var selected_symbol = _select_symbol_by_probability()
		current_symbol_choices.append(selected_symbol.id)
	
	# UI 업데이트
	_update_selection_ui()
	print("Symbol choices refreshed.")

# 확률 기반 심볼 선택
func _select_symbol_by_probability() -> Symbol:
	var probabilities = {}
	if gameboard_ref and gameboard_ref.has_method("get_symbol_probabilities"):
		probabilities = gameboard_ref.get_symbol_probabilities()
	else:
		# 기본값: 레벨 1 확률
		probabilities = {1: 100, 2: 0, 3: 0, 4: 0, 5: 0}
	
	# 각 시대별 심볼들 수집
	var era_symbols = {1: [], 2: [], 3: [], 4: [], 5: []}
	for symbol_id in symbol_data.symbols.keys():
		var symbol = symbol_data.get_symbol_by_id(symbol_id)
		if symbol and symbol.rarity > 0:  # rarity 0인 심볼은 선택 풀에서 제외
			era_symbols[symbol.rarity].append(symbol)
	
	# 확률에 따라 시대 선택
	var random_value = randi() % 100
	var cumulative_prob = 0
	var selected_era = 1
	
	for era in [1, 2, 3, 4, 5]:
		cumulative_prob += probabilities.get(era, 0)
		if random_value < cumulative_prob:
			selected_era = era
			break
	
	# 선택된 시대에서 랜덤 심볼 선택
	var available_symbols = era_symbols[selected_era]
	if available_symbols.size() > 0:
		return available_symbols[randi() % available_symbols.size()]
	else:
		# 해당 시대에 심볼이 없으면 Ancient 시대에서 선택
		return era_symbols[1][randi() % era_symbols[1].size()]

# 심볼 선택 UI 업데이트
func _update_selection_ui() -> void:
	for i in range(3):
		if i < current_symbol_choices.size():
			var symbol_id = current_symbol_choices[i]
			var symbol_def = symbol_data.get_symbol_by_id(symbol_id)
			if symbol_def:
				var display_text = symbol_def.icon if symbol_def.icon != "" else symbol_def.symbol_name
				choice_buttons[i].text = display_text + "\n" + symbol_def.get_rarity_name()
				choice_buttons[i].disabled = false
				# 아이콘이 있을 때 선택 버튼 폰트 크기 증가
				if symbol_def.icon != "":
					choice_buttons[i].add_theme_font_size_override("font_size", 32)
				
				# Rarity에 따른 버튼 색상 설정
				choice_buttons[i].modulate = symbol_def.get_rarity_color()
				
				# 선택 버튼에 툴팁 설정
				tooltip_manager.setup_choice_button_tooltip(choice_buttons[i], symbol_def)
		else:
			choice_buttons[i].text = "Empty"
			choice_buttons[i].disabled = true

# 심볼 선택 처리
func _on_symbol_choice_selected(choice_index: int) -> void:
	if not is_selection_phase or choice_index >= current_symbol_choices.size():
		return
	
	var selected_symbol_id = current_symbol_choices[choice_index]
	symbol_selected.emit(selected_symbol_id)
	
	# 선택 단계 종료
	end_selection_phase()

# 심볼 선택 단계 종료
func end_selection_phase() -> void:
	is_selection_phase = false
	current_symbol_choices.clear()
	symbol_selection_ui.visible = false
	print("Selection phase ended")
