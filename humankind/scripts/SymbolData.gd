extends Node

var symbols: Dictionary = {}

const SYMBOL_RESOURCES_PATH = "res://data/symbols/"

func _ready() -> void:
	load_symbols()
	
	print("Loaded " + str(symbols.size()) + " symbols.")
	
	if symbols.has(1):
		print("Symbol ID 1 Name: " + symbols[1].symbol_name)

func load_symbols():
	var dir = DirAccess.open(SYMBOL_RESOURCES_PATH)
	
	# Error handling when no files
	if dir == null:
		print("Error: Could not open directory at " + SYMBOL_RESOURCES_PATH)
		return
	
	dir.list_dir_begin()
	var file_name = dir.get_next()
	
	while file_name != "":
		if not dir.current_is_dir():
			if file_name.ends_with(".tres"):
				var file_path = SYMBOL_RESOURCES_PATH + file_name
				
				var loaded_resource = load(file_path)
				
				if loaded_resource is Symbol:
					var symbol_data: Symbol = loaded_resource
					
					symbols[symbol_data.id] = symbol_data
					
					print("Loaded symbol: " + symbol_data.symbol_name + " (ID: " + str(symbol_data.id) + ")")
				else:
					print("Warning: " + file_name + " is not a Symbol resource.")
		
		file_name = dir.get_next()
	
	dir.list_dir_end()

# find and return symbol by type id
func get_symbol_by_id(id: int) -> Symbol:
	return symbols.get(id)

# Instance creation management
var next_instance_id: int = 1

func create_player_symbol_instance(type_id: int) -> PlayerSymbolInstance:
	var new_instance = PlayerSymbolInstance.new()
	new_instance.instance_id = next_instance_id
	new_instance.type_id = type_id
	next_instance_id += 1
	return new_instance
