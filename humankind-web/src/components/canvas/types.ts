import * as PIXI from 'pixi.js';
import type { SymbolDefinition } from '../../game/data/symbolDefinitions';

export interface HoveredSymbol {
    definition: SymbolDefinition;
    screenX: number;
    screenY: number;
}

export interface FloatingEffect {
    texts: PIXI.Text[];
    startY: number;
    elapsed: number; // ms
}

export interface CombatBounce {
    sprite: PIXI.Container;
    fromX: number; fromY: number;
    toX: number; toY: number;
    elapsed: number;
    duration: number;
    hitSpawned: boolean;
    atkDmg: number;
    targetHpX: number; targetHpY: number;
}

export interface CellLayout {
    startX: number; startY: number;
    cellWidth: number; cellHeight: number;
    gridOffsetX: number; gridOffsetY: number;
    colGap: number;
}

export interface ReelState {
    container: PIXI.Container;
    mask: PIXI.Graphics;
    scrollY: number;
    speed: number;
    started: boolean;
    stopped: boolean;
    decelerating: boolean;
    startDelay: number;
    targetScrollY: number;
    cellHeight: number;
    stripInitialY: number;
    reelContainer: PIXI.Container;
}
