import type { SymbolDefinition } from '../../data/symbolDefinitions';
import type { PlayerSymbolInstance } from '../../types';
import type { GameRng } from './rng';

export type BoardGrid = (PlayerSymbolInstance | null)[][];

export interface BoardCoord {
    x: number;
    y: number;
}

export interface ResourceDelta {
    food: number;
    gold: number;
    knowledge: number;
}

export type BoardCounterFloatAnchor = 'bottom-right' | 'bottom-left';

export interface BoardEffectDelta extends BoardCoord, ResourceDelta {
    counter?: number;
    counterAnchor?: BoardCounterFloatAnchor;
    counterDisplayTextBefore?: string | null;
}

export interface TurnThreatState {
    barbarianSymbolThreat: number;
    barbarianCampThreat: number;
    naturalDisasterThreat: number;
}

export type ThreatLabelKey = 'threat.barbarian_invasion' | 'threat.flood' | 'threat.earthquake' | 'threat.drought';

export interface PendingThreatFloat extends BoardCoord {
    label: string;
    key?: ThreatLabelKey;
}

export type CreateSymbolInstance = (
    definition: SymbolDefinition,
    unlockedUpgrades?: readonly number[],
) => PlayerSymbolInstance;

export type ThreatLabelResolver = (
    key: ThreatLabelKey,
) => string;

export interface TurnPreparationInput {
    board: BoardGrid;
    playerSymbols: PlayerSymbolInstance[];
    turn: number;
    level: number;
    era: number;
    boardWidth: number;
    boardHeight: number;
    unlockedKnowledgeUpgrades: readonly number[];
    threatState: TurnThreatState;
    rng: GameRng;
    createSymbolInstance: CreateSymbolInstance;
    getThreatLabel: ThreatLabelResolver;
}

export interface TurnPreparationOutput {
    board: BoardGrid;
    prevBoard: BoardGrid;
    playerSymbols: PlayerSymbolInstance[];
    turn: number;
    threatState: TurnThreatState;
    pendingNewThreatFloats: PendingThreatFloat[];
}

export interface PhaseResolutionInput {
    board: BoardGrid;
    playerSymbols: PlayerSymbolInstance[];
    turn: number;
    runningTotals: ResourceDelta;
    symbolChoices: readonly SymbolDefinition[];
}

export interface PhaseResolutionOutput {
    board: BoardGrid;
    playerSymbols: PlayerSymbolInstance[];
    runningTotals: ResourceDelta;
    lastEffects: BoardEffectDelta[];
    symbolChoices?: SymbolDefinition[];
}
