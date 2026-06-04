import { describe, expect, it, vi } from 'vitest';
import type { BoardEffectDelta } from '../../../game/logic/turn/turnTypes';
import type { GameState } from '../../../game/state/gameStore';

const gameStoreMock = vi.hoisted(() => ({
    state: {
        phase: 'idle',
        effectPhase: null,
        lastEffects: [],
    } as Partial<GameState>,
}));

vi.mock('pixi.js', () => {
    class Container {
        public children: Container[] = [];
        public parent: Container | null = null;
        public x = 0;
        public y = 0;
        public alpha = 1;
        public width = 0;
        public height = 0;
        public scale = { set: vi.fn() };

        addChild(child: Container) {
            this.children.push(child);
            child.parent = this;
            return child;
        }

        removeChild(child: Container) {
            this.children = this.children.filter((item) => item !== child);
            child.parent = null;
            return child;
        }

        removeChildren() {
            const children = this.children;
            this.children = [];
            children.forEach((child) => {
                child.parent = null;
            });
            return children;
        }

        destroy() {}
    }

    class Text extends Container {
        public text: string;
        public anchor = { set: vi.fn() };

        constructor(options: { text: string }) {
            super();
            this.text = options.text;
            this.width = Math.max(1, this.text.length) * 10;
            this.height = 20;
        }
    }

    class TextStyle {
        constructor(options: unknown) {
            Object.assign(this, options);
        }
    }

    class Sprite extends Container {
        constructor() {
            super();
        }
    }

    return {
        Assets: { get: vi.fn(() => undefined) },
        Container,
        Sprite,
        Text,
        TextStyle,
        Texture: { from: vi.fn(() => ({})) },
    };
});

vi.mock('../../../audio/audioManager', () => ({
    audioManager: { play: vi.fn() },
}));

vi.mock('../../../game/state/gameStore', () => ({
    useGameStore: {
        getState: () => gameStoreMock.state,
    },
}));

import * as PIXI from 'pixi.js';
import { FloatingTextRenderer } from './FloatingTextRenderer';

const layout = {
    startX: 0,
    startY: 0,
    boardW: 500,
    cellWidth: 100,
    cellHeight: 100,
    gridOffsetX: 0,
    gridOffsetY: 0,
    colGap: 0,
    scale: 1,
    fontFamily: 'test',
};

const render = (renderer: FloatingTextRenderer, lastEffects: BoardEffectDelta[]) => {
    renderer.renderBoardEffectFloats(
        {
            ...gameStoreMock.state,
            lastEffects,
        } as GameState,
        layout,
    );
};

const setGameState = (patch: Partial<GameState>) => {
    gameStoreMock.state = { ...gameStoreMock.state, ...patch };
};

describe('FloatingTextRenderer', () => {
    it('does not replay the last processing effect after the effect phase has ended', () => {
        const container = new PIXI.Container();
        const renderer = new FloatingTextRenderer(container);
        const effect: BoardEffectDelta = { x: 1, y: 1, food: 0, gold: 0, knowledge: 0, counter: 1 };

        setGameState({ phase: 'processing', effectPhase: 3 });
        render(renderer, [effect]);
        expect(container.children).toHaveLength(1);

        render(renderer, [effect]);
        expect(container.children).toHaveLength(1);

        render(renderer, []);
        expect(container.children).toHaveLength(1);

        setGameState({ phase: 'processing', effectPhase: null });
        render(renderer, [effect]);
        expect(container.children).toHaveLength(1);
    });

    it('starts fading a young processing float as soon as processing ends', () => {
        const container = new PIXI.Container();
        const renderer = new FloatingTextRenderer(container);
        const effect: BoardEffectDelta = { x: 1, y: 1, food: 0, gold: 0, knowledge: 0, counter: 1 };

        setGameState({ phase: 'processing', effectPhase: 3 });
        render(renderer, [effect]);
        renderer.tick(100);
        expect(container.children[0]?.alpha).toBe(1);

        setGameState({ phase: 'processing', effectPhase: null });
        renderer.tick(16);
        expect(container.children[0]?.alpha).toBeLessThan(1);
    });

    it('removes old and last young processing floats together after processing ends', () => {
        const container = new PIXI.Container();
        const renderer = new FloatingTextRenderer(container);
        const firstEffect: BoardEffectDelta = { x: 0, y: 0, food: 0, gold: 0, knowledge: 0, counter: 1 };
        const lastEffect: BoardEffectDelta = { x: 1, y: 0, food: 0, gold: 0, knowledge: 0, counter: 1 };

        setGameState({ phase: 'processing', effectPhase: 3 });
        render(renderer, [firstEffect]);
        renderer.tick(900);
        render(renderer, [firstEffect, lastEffect]);
        renderer.tick(100);
        expect(container.children).toHaveLength(2);

        setGameState({ phase: 'processing', effectPhase: null });
        renderer.tick(280);
        expect(container.children).toHaveLength(0);
    });

    it('still renders board action floats outside the processing phase', () => {
        const container = new PIXI.Container();
        const renderer = new FloatingTextRenderer(container);
        const effect: BoardEffectDelta = { x: 2, y: 1, food: 0, gold: 0, knowledge: 0, counter: 1 };

        setGameState({ phase: 'idle', effectPhase: null });
        render(renderer, [effect]);

        expect(container.children).toHaveLength(1);
    });
});
