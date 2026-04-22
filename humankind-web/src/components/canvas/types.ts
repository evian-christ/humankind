import * as PIXI from 'pixi.js';
import type { SymbolDefinition } from '../../game/data/symbolDefinitions';
import type { RelicInstance } from '../../game/state/relicStore';

export interface HoveredSymbol {
    definition: SymbolDefinition;
    screenX: number;
    screenY: number;
}

export interface HoveredRelic {
    relicInfo: RelicInstance;
    screenX: number;
    screenY: number;
}

export interface HoveredUpgrade {
    upgrade: { id: number };
    screenX: number;
    screenY: number;
}

export type HoveredHudStatKind = 'knowledge' | 'food' | 'gold';

/** clientX/clientY: 브라우저 뷰포트 기준(고정 위치 툴팁용) */
export interface HoveredHudStat {
    kind: HoveredHudStatKind;
    clientX: number;
    clientY: number;
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
    boardW: number;
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
