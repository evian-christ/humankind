# SymbolTooltip.gd
class_name SymbolTooltip
extends Control

# 툴팁 컴포넌트들
var background: Panel
var name_label: Label
var effect_label: Label
var container: VBoxContainer

# 툴팁 설정
var margin_from_cursor: Vector2 = Vector2(15, 15)
var max_width: float = 300.0

func _init():
	# 툴팁이 다른 UI를 가리지 않도록 설정
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	
	# 배경 설정 - Panel로 변경 (NinePatchRect에는 color 속성이 없음)
	background = Panel.new()
	# 둥근 모서리 효과를 위한 스타일박스 생성
	var style_box = StyleBoxFlat.new()
	style_box.bg_color = Color(0.08, 0.08, 0.12, 0.95)
	style_box.corner_radius_top_left = 8
	style_box.corner_radius_top_right = 8
	style_box.corner_radius_bottom_left = 8
	style_box.corner_radius_bottom_right = 8
	style_box.border_width_left = 2
	style_box.border_width_right = 2
	style_box.border_width_top = 2
	style_box.border_width_bottom = 2
	style_box.border_color = Color(0.3, 0.3, 0.4, 0.8)
	background.add_theme_stylebox_override("panel", style_box)
	add_child(background)
	
	# 컨테이너 설정
	container = VBoxContainer.new()
	container.add_theme_constant_override("separation", 5)
	background.add_child(container)
	
	# 심볼 이름 라벨
	name_label = Label.new()
	name_label.add_theme_font_size_override("font_size", 16)
	name_label.add_theme_color_override("font_color", Color(1.0, 0.9, 0.6))  # 따뜻한 금색
	name_label.add_theme_stylebox_override("normal", StyleBoxEmpty.new())
	container.add_child(name_label)
	
	# 구분선 추가
	var separator = HSeparator.new()
	separator.add_theme_color_override("separator", Color(0.5, 0.5, 0.6, 0.6))
	separator.add_theme_constant_override("separation", 1)
	container.add_child(separator)
	
	# 효과 텍스트 라벨
	effect_label = Label.new()
	effect_label.add_theme_font_size_override("font_size", 12)
	effect_label.add_theme_color_override("font_color", Color(0.9, 0.9, 0.95))  # 밝은 회색
	effect_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	effect_label.add_theme_stylebox_override("normal", StyleBoxEmpty.new())
	container.add_child(effect_label)
	
	# 기본적으로 숨김
	visible = false

# 툴팁 표시
func show_tooltip(symbol_name: String, effect_text: String, mouse_position: Vector2):
	name_label.text = symbol_name
	effect_label.text = effect_text
	
	# 텍스트 크기에 따라 툴팁 크기 조정
	effect_label.custom_minimum_size.x = min(max_width, 200)
	
	# 크기 업데이트를 위해 한 프레임 기다림
	await get_tree().process_frame
	
	# 툴팁 크기 설정
	var content_size = container.get_combined_minimum_size()
	var padding = Vector2(12, 10)  # 패딩 증가
	var tooltip_size = content_size + padding * 2
	
	# 배경 크기 설정
	background.size = tooltip_size
	container.position = padding
	container.size = content_size
	
	# 화면 경계를 고려한 위치 조정
	var screen_size = get_viewport().get_visible_rect().size
	var final_position = mouse_position + margin_from_cursor
	
	# 오른쪽 경계 체크
	if final_position.x + tooltip_size.x > screen_size.x:
		final_position.x = mouse_position.x - tooltip_size.x - margin_from_cursor.x
	
	# 아래쪽 경계 체크
	if final_position.y + tooltip_size.y > screen_size.y:
		final_position.y = mouse_position.y - tooltip_size.y - margin_from_cursor.y
	
	position = final_position
	size = tooltip_size
	visible = true

# 툴팁 숨김
func hide_tooltip():
	visible = false

# 툴팁 위치 업데이트 (마우스 따라다니도록)
func update_position(mouse_position: Vector2):
	if not visible:
		return
		
	var screen_size = get_viewport().get_visible_rect().size
	var final_position = mouse_position + margin_from_cursor
	
	# 화면 경계 체크
	if final_position.x + size.x > screen_size.x:
		final_position.x = mouse_position.x - size.x - margin_from_cursor.x
	
	if final_position.y + size.y > screen_size.y:
		final_position.y = mouse_position.y - size.y - margin_from_cursor.y
	
	position = final_position
