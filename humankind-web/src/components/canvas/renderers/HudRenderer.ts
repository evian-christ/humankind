import * as PIXI from 'pixi.js';
import { useGameStore } from '../../../game/state/gameStore';
import { clearPixiContainer } from './rendererShared';

export class HudRenderer {
    private container: PIXI.Container;
    private foodDemandLabel: PIXI.Text | null = null;
    private foodDemandCenter: { x: number; y: number } = { x: 0, y: 0 };

    constructor(container: PIXI.Container) {
        this.container = container;
    }

    public render(scale: number, width: number) {
        // UI rendering is now handled by React (App.tsx / .hud-top).
        clearPixiContainer(this.container);
        this.foodDemandLabel = null;
        this.foodDemandCenter = { x: width / 2, y: 44 * scale };
    }

    public tickFoodDemandShake() {
        if (!this.foodDemandLabel?.parent) return;

        const state = useGameStore.getState();
        const turnsUntilPayment = state.turn % 10 === 0 ? 10 : 10 - (state.turn % 10);
        if (turnsUntilPayment <= 2) {
            const shake = 2;
            this.foodDemandLabel.x = this.foodDemandCenter.x + (Math.random() - 0.5) * 2 * shake;
            this.foodDemandLabel.y = this.foodDemandCenter.y + (Math.random() - 0.5) * 2 * shake;
        } else {
            this.foodDemandLabel.x = this.foodDemandCenter.x;
            this.foodDemandLabel.y = this.foodDemandCenter.y;
        }
    }
}
