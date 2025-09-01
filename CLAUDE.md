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

### Critical Development Guidelines
- **No Animation Policy**: Use minimal approach - no animations, immediate visual feedback only
- **Unified Food Display**: Never separate passive food and effect food in floating text - always show combined total
- **Real-time Effect Processing**: Apply effects during visual processing, not before - each symbol shows effects as it's highlighted
- **Counter Systems**: Use `effect_counter` in PlayerSymbolInstance for turn-based mechanics
- **Symbol Destruction**: Mark symbols with `is_marked_for_destruction`, handle in dedicated functions
- **Type Hint Compatibility**: Avoid `Array[Type]` syntax - use plain `Array` for Godot 4 compatibility
- **Runtime Loading**: Load classes with `load()` instead of direct class references to avoid parser errors

## Implemented Symbol Effects System

### Current Symbol Mechanics
1. **Wheat (ID 1)**: Counter system - 6 turns → +8 food total, resets
2. **Rice (ID 2)**: Counter system - 8 turns → +11 food total, resets  
3. **Fish (ID 3)**: Counter system - 5 turns → destroyed + 10 food, removed from game
4. **Fishing Boat (ID 4)**: Destroys nearby Fish (triggers Fish food effect)
5. **Banana (ID 5)**: Placement counter - after 10 placements → permanent +2 food total
6. **Sugar (ID 6)**: Provides +1 food per adjacent Sugar (synergy effect)
7. **Mine (ID 7)**: 1% chance per turn to add Coal to player collection
8. **Coal (ID 8)**: Passive food only, exists to be destroyed by Industrial Revolution
9. **Industrial Revolution (ID 9)**: Destroys nearby Coal, +1 food per Coal destroyed (cumulative)

### Effect Processing Flow
1. Increment counters for applicable symbols
2. Process special effects (mark symbols for destruction, calculate bonuses)
3. Handle Fish destruction (show +10 food, remove from game)
4. Handle Coal destruction (remove from game, no food reward)
5. Apply all effects and show unified floating text
6. Reset counters for triggered effects (except Banana - permanent upgrade)

## Current Architecture (Post-Refactoring)

### Refactored Component System
- **GameController.gd**: Main orchestrator, coordinates all systems, handles game phases
- **GameStateManager.gd**: Manages player stats, board state, turn progression, food payments
- **BoardRenderer.gd**: Visual board representation, floating text, counter displays
- **UIManager.gd**: UI interactions, selection system, stat displays
- **SymbolEffectsProcessor.gd**: Individual symbol effect processing, destruction mechanics

### Game Flow Architecture
1. **Spin Phase**: GameController → GameStateManager processes turn
2. **Visual Effects**: Real-time symbol processing with highlighting and floating text
3. **Selection Phase**: Present 3 symbol choices based on rarity weights
4. **Food Payment**: Deduct survival costs (100, 150, 200, 250... every 10 turns)

## Current Development State
Recent complete refactoring and effect implementations:
- ✅ Complete gameboard.gd refactoring with component separation
- ✅ Real-time visual feedback system with floating text
- ✅ Counter-based symbol mechanics (Wheat, Rice, Fish, Banana)
- ✅ Symbol destruction system (Fish, Coal)
- ✅ Symbol synergy effects (Sugar, Industrial Revolution)
- ✅ Probability-based symbol generation (Mine → Coal)
- ✅ Unified food display system (no separate passive/effect text)
- ✅ Parser error resolution (removed type hints, runtime class loading)
- 🔄 Testing and balancing symbol interactions

## Git Workflow
- Commit functional changes incrementally per feature
- Follow existing Korean commit message patterns
- User drives development direction - avoid proposing unsolicited next steps