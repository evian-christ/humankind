# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Godot 4.4.1 project implementing an arcade-style roguelike with civilization themes. The game features a turn-based system where players spin slots to randomly place owned symbols on a 5x4 grid board, with symbols interacting to generate food for survival. The focus is on simple, arcade gameplay rather than complex simulation.

## Development Commands
This project uses Godot Engine for development and does not require traditional build commands. The primary workflow involves:
- Opening the project in Godot Editor
- Running the game using F5 or the play button in Godot
- Testing specific scenes using F6

## Core Architecture

### Symbol System
The game implements a simplified symbol architecture focused on arcade gameplay:

1. **Symbol Resources (`Symbol.gd`)**: Template definitions stored as `.tres` files in `data/symbols/`
   - Contains: `id`, `symbol_name`, `icon`, `rarity` (1-5), `effects`, `effect_text`
   - Era levels: Ancient(1), Classical(2), Medieval(3), Industrial(4), Modern(5)
   - Loaded and managed by `SymbolData` singleton

2. **Player Symbol Instances (`PlayerSymbolInstance.gd`)**: Individual instances owned by player
   - Contains: `instance_id` (unique), `type_id` (references Symbol), `state_data`
   - Created via `SymbolData.create_player_symbol_instance()`

3. **Board Placement**: Instances placed on 5x4 grid with interaction logic

### Key Singletons
- **SymbolData** (`scripts/SymbolData.gd`): Autoloaded singleton managing symbol definitions and instance creation
  - Loads all symbol resources from `data/symbols/`
  - Provides `get_symbol_by_id()` and `create_player_symbol_instance()`

### Game Board System
- **GameBoard** (`scenes/gameboard/`): Main game scene with 5x4 grid layout
  - Manages `player_symbols` array of PlayerSymbolInstance objects
  - Implements random placement logic with overflow handling (>20 symbols)
  - Processes symbol interactions via proximity-based system
  - Single resource focus: Food for survival

### Effect System Design
The project implements a simplified effect system focused on food production:
- **Effects**: Primarily food generation with some special mechanics
- **Era-based Selection**: Symbols selected based on era weights (Ancient: 100, Classical: 30, Medieval: 10, Industrial: 3, Modern: 1)
- Symbols contain `effects` array; instances have `state_data` dictionary

## File Structure
```
humankind/
├── scenes/gameboard/          # Main game scene and logic
├── scripts/                   # Core game scripts
│   ├── SymbolData.gd         # Singleton for symbol management
│   ├── symbol.gd             # Symbol resource class
│   └── player_symbol_instance.gd # Player-owned symbol instances
├── data/symbols/             # Symbol definition resources (.tres)
└── addons/gdterm/           # Third-party terminal addon
```

## Development Guidelines

### Working with Symbols
- Symbol definitions are stored as Godot resources in `data/symbols/`
- Always use `SymbolData.get_symbol_by_id()` to access symbol definitions
- Create player instances via `SymbolData.create_player_symbol_instance()`
- The board works with PlayerSymbolInstance objects, not Symbol resources directly
- Focus on simple, arcade-style effects rather than complex historical simulation

### Game Logic Flow
1. Player owns symbols as PlayerSymbolInstance objects
2. Spin button triggers `_place_symbols_on_board()` 
3. Up to 20 symbols randomly placed on 5x4 grid
4. `_process_symbol_interactions()` handles proximity-based effects generating food
5. `_start_selection_phase()` presents 3 symbols based on rarity weights
6. Player selects 1 symbol to add to collection
7. Helper function `_get_nearby_coordinates()` provides 8-directional adjacency

### Design Philosophy  
- **Arcade over Simulation**: Focus on immediate fun rather than historical accuracy
- **Single Resource**: Food is the only resource - keep it simple
- **Era-based Progression**: Use civilization era system instead of complex level/tech trees
- Incremental code guidance principle: explain step-by-step rather than providing complete code blocks

### Code Creation Policy
**CRITICAL**: Claude Code must NEVER directly write, create, or modify code files. Instead:
- Provide step-by-step guidance for the user to implement in Godot Editor
- Explain what needs to be created and how to do it through the IDE
- Give specific instructions for node creation, property settings, and file creation
- The user will handle all actual coding and file creation directly

## Current Development State
Recent refactoring toward arcade-style gameplay:
- ✅ Core spin mechanism and symbol placement implemented
- ✅ PlayerSymbolInstance system with unique ID generation  
- ✅ Grid-based board with emoji icon display
- ✅ Era-based symbol selection system (Ancient to Modern)
- ✅ Symbol interaction effects for food production
- ✅ 3-choice selection phase after each spin
- ✅ Tooltip system for symbol information
- 🔄 Need new arcade-style symbol set (old symbols removed)

## Git Workflow
- Commit functional changes incrementally per feature
- Follow existing Korean commit message patterns
- User drives development direction - avoid proposing unsolicited next steps