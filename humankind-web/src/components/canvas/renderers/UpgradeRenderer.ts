import type { HoveredUpgrade } from '../types';

export class UpgradeRenderer {
    private onHoverUpgrade: (upgrade: HoveredUpgrade | null) => void;
    private hoverSnapshot: { id: number; screenX: number; screenY: number } | null = null;

    constructor(onHoverUpgrade: (upgrade: HoveredUpgrade | null) => void) {
        this.onHoverUpgrade = onHoverUpgrade;
    }

    public clearHover() {
        this.hoverSnapshot = null;
        this.onHoverUpgrade(null);
    }

    public syncHoverAfterRebuild() {
        if (!this.hoverSnapshot) return;
        this.onHoverUpgrade({
            upgrade: { id: this.hoverSnapshot.id },
            screenX: this.hoverSnapshot.screenX,
            screenY: this.hoverSnapshot.screenY,
        });
    }
}
