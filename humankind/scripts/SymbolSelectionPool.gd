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

## Rarity에 따른 심볼 가중치 계산 (로그라이크 스타일)
## rarity: 심볼의 희귀도 (1=common, 5=historical)
func calculate_symbol_weight(rarity: int) -> float:
	# 희귀도가 높을수록 낮은 확률
	match rarity:
		1: return 100.0  # Common - 매우 높은 확률
		2: return 30.0   # Uncommon - 높은 확률
		3: return 10.0   # Rare - 보통 확률
		4: return 3.0    # Special - 낮은 확률
		5: return 1.0    # Historical - 매우 낮은 확률
		_: return min_weight

## 모든 사용 가능한 심볼들의 가중치가 포함된 풀 생성
## symbol_data_ref: SymbolData 싱글톤 참조
func create_weighted_pool(symbol_data_ref: SymbolData) -> Array[Dictionary]:
	var weighted_pool: Array[Dictionary] = []
	
	if not symbol_data_ref:
		print("Error: SymbolData not available")
		return weighted_pool
	
	# 모든 심볼에 대해 가중치 계산
	for symbol_id in symbol_data_ref.symbols.keys():
		var symbol_resource = symbol_data_ref.symbols[symbol_id]
		if symbol_resource:
			var weight = calculate_symbol_weight(symbol_resource.rarity)
			
			weighted_pool.append({
				"symbol_id": symbol_id,
				"weight": weight,
				"rarity": symbol_resource.rarity,
				"name": symbol_resource.symbol_name
			})
	
	return weighted_pool

## 가중치 기반으로 심볼 3개 선택 (중복 없음)
## symbol_data_ref: SymbolData 싱글톤 참조
func select_three_symbols(symbol_data_ref: SymbolData) -> Array[int]:
	var weighted_pool = create_weighted_pool(symbol_data_ref)
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

## 디버그용: 현재 확률 분포 출력
## symbol_data_ref: SymbolData 싱글톤 참조
func debug_print_distribution(symbol_data_ref: SymbolData) -> void:
	print("=== Symbol Rarity Distribution ===")
	var weighted_pool = create_weighted_pool(symbol_data_ref)
	
	# Rarity별로 정렬
	weighted_pool.sort_custom(func(a, b): return a["rarity"] < b["rarity"])
	
	var total_weight = 0.0
	for entry in weighted_pool:
		total_weight += entry["weight"]
	
	for entry in weighted_pool:
		var percentage = (entry["weight"] / total_weight) * 100
		var rarity_name = Symbol.Rarity.keys()[entry["rarity"] - 1]
		print(rarity_name, " (", entry["name"], "): ", "%.1f%%" % percentage)
