# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Godot 4.4.1 project implementing a civilization-themed symbol-slot resource optimization 4X deck-building roguelike. The game features a turn-based system where players spin slots to randomly place owned symbols on a 5x4 grid board, with symbols interacting based on their proximity to generate food and advance civilization.

## Development Commands
This project uses Godot Engine for development and does not require traditional build commands. The primary workflow involves:
- Opening the project in Godot Editor
- Running the game using F5 or the play button in Godot
- Testing specific scenes using F6

## Core Architecture

### Symbol System
The game implements a three-tier symbol architecture:

1. **Symbol Resources (`Symbol.gd`)**: Template definitions stored as `.tres` files in `data/symbols/`
   - Contains: `id`, `symbol_name`, `level`, `type_flags`, `effects`, `effect_text`
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

### Effect System Design
The project implements a unified trigger-effect system (partially implemented):
- **Effects**: Define what happens (food generation, resource modification)
- **Triggers**: Define when effects activate (always, nearby symbols, counters)
- Symbols contain `triggers` array; instances have `effect_counters` dictionary

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

### Game Logic Flow
1. Player owns symbols as PlayerSymbolInstance objects
2. Spin button triggers `_place_symbols_on_board()` 
3. Up to 20 symbols randomly placed on 5x4 grid
4. `_process_symbol_interactions()` handles proximity-based effects
5. Helper function `_get_nearby_coordinates()` provides 8-directional adjacency

### Language Requirements
- All Korean documentation and commit messages must be preserved as-is
- Korean development planning documents in `gemini.md` and `tasks.txt` contain critical project context
- Incremental code guidance principle: explain step-by-step rather than providing complete code blocks

### Code Creation Policy
**CRITICAL**: Claude Code must NEVER directly write, create, or modify code files. Instead:
- Provide step-by-step guidance for the user to implement in Godot Editor
- Explain what needs to be created and how to do it through the IDE
- Give specific instructions for node creation, property settings, and file creation
- The user will handle all actual coding and file creation directly

## Current Development State
Based on recent commits and task documentation:
- ✅ Core spin mechanism and symbol placement implemented
- ✅ PlayerSymbolInstance system with unique ID generation
- ✅ Grid-based board with visual symbol display
- 🔄 Effect/trigger system designed but not fully implemented
- ❌ Symbol interaction effects not yet functional

## Git Workflow
- Commit functional changes incrementally per feature
- Follow existing Korean commit message patterns
- User drives development direction - avoid proposing unsolicited next steps