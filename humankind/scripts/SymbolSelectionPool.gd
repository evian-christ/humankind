# SymbolSelectionPool.gd
class_name SymbolSelectionPool
extends Resource

## 심볼 선택 풀의 레벨 기반 확률 시스템
## CRITICAL MECHANISM:
## - Normal Distribution 곡선으로 심볼 레벨별 출현 확률 결정
## - 플레이어 레벨이 정규분포 곡선의 중심점 (exp 100마다 레벨 1 증가)
## - 플레이어 레벨 증가시 곡선이 X축으로 1레벨씩 shift
## - 예: 플레이어 레벨 5일 때 -> 레벨5 심볼 최다, 레벨4,6 꽤많이, 레벨3,7 가끔, 레벨2,8 희귀

# 정규분포 표준편차 (곡선의 너비 조절)
var standard_deviation: float = 1.5

# 최소 가중치 (너무 작은 확률 방지)
var min_weight: float = 0.01

# 심볼 데이터 레퍼런스
var symbol_data: SymbolData

func _init():
	symbol_data = null  # Will be set when needed

## 플레이어 레벨에 따른 심볼 레벨별 가중치 계산
## symbol_level: 심볼의 레벨
## player_level: 현재 플레이어 레벨
func calculate_symbol_weight(symbol_level: int, player_level: int) -> float:
	var center = float(player_level)  # 정규분포의 중심점
	var distance = abs(float(symbol_level) - center)
	
	# 정규분포 공식: e^(-(x-μ)²/(2σ²))
	var weight = exp(-(distance * distance) / (2.0 * standard_deviation * standard_deviation))
	
	# 최소 가중치 보장
	return max(weight, min_weight)

## 모든 사용 가능한 심볼들의 가중치가 포함된 풀 생성
## player_level: 현재 플레이어 레벨
## symbol_data_ref: SymbolData 싱글톤 참조
func create_weighted_pool(player_level: int, symbol_data_ref: SymbolData) -> Array[Dictionary]:
	var weighted_pool: Array[Dictionary] = []
	
	if not symbol_data_ref:
		print("Error: SymbolData not available")
		return weighted_pool
	
	# 모든 심볼에 대해 가중치 계산
	for symbol_id in symbol_data_ref.symbols.keys():
		var symbol_resource = symbol_data_ref.symbols[symbol_id]
		if symbol_resource:
			var weight = calculate_symbol_weight(symbol_resource.level, player_level)
			
			weighted_pool.append({
				"symbol_id": symbol_id,
				"weight": weight,
				"level": symbol_resource.level,
				"name": symbol_resource.symbol_name
			})
	
	return weighted_pool

## 가중치 기반으로 심볼 3개 선택 (중복 없음)
## player_level: 현재 플레이어 레벨
## symbol_data_ref: SymbolData 싱글톤 참조
func select_three_symbols(player_level: int, symbol_data_ref: SymbolData) -> Array[int]:
	var weighted_pool = create_weighted_pool(player_level, symbol_data_ref)
	var selected_symbols: Array[int] = []
	
	if weighted_pool.is_empty():
		print("Error: Empty symbol pool")
		return selected_symbols
	
	# 3개 심볼 선택 (중복 없음)
	for i in range(3):
		if weighted_pool.is_empty():
			break
			
		var selected_entry = _select_weighted_random(weighted_pool)
		if selected_entry:
			selected_symbols.append(selected_entry["symbol_id"])
			# 선택된 심볼을 풀에서 제거 (중복 방지)
			weighted_pool.erase(selected_entry)
	
	return selected_symbols

## 가중치 기반 랜덤 선택
## pool: 가중치가 포함된 심볼 풀 배열
func _select_weighted_random(pool: Array[Dictionary]) -> Dictionary:
	if pool.is_empty():
		return {}
	
	# 전체 가중치 합계 계산
	var total_weight = 0.0
	for entry in pool:
		total_weight += entry["weight"]
	
	if total_weight <= 0:
		# 가중치가 모두 0인 경우 균등 랜덤 선택
		return pool[randi() % pool.size()]
	
	# 가중치 기반 선택
	var random_value = randf() * total_weight
	var current_weight = 0.0
	
	for entry in pool:
		current_weight += entry["weight"]
		if random_value <= current_weight:
			return entry
	
	# 예외 상황: 마지막 엔트리 반환
	return pool.back()

## 디버그용: 현재 플레이어 레벨에서의 확률 분포 출력
## player_level: 현재 플레이어 레벨
## symbol_data_ref: SymbolData 싱글톤 참조
func debug_print_distribution(player_level: int, symbol_data_ref: SymbolData) -> void:
	print("=== Symbol Distribution for Player Level ", player_level, " ===")
	var weighted_pool = create_weighted_pool(player_level, symbol_data_ref)
	
	# 레벨별로 정렬
	weighted_pool.sort_custom(func(a, b): return a["level"] < b["level"])
	
	var total_weight = 0.0
	for entry in weighted_pool:
		total_weight += entry["weight"]
	
	for entry in weighted_pool:
		var percentage = (entry["weight"] / total_weight) * 100
		print("Level ", entry["level"], " (", entry["name"], "): ", "%.1f%%" % percentage)
