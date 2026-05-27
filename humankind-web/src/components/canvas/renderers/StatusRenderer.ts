import * as PIXI from 'pixi.js';
import { getActiveStatusIdsForTurn, STATUSES } from '../../../game/data/statusDefinitions';
import type { StatusDefinition } from '../../../game/data/statusDefinitions';
import type { GameState } from '../../../game/state/gameStore';
import type { HoveredStatus } from '../types';
import { ASSET_BASE_URL, GAME_CURSOR_HELP } from './rendererShared';

export class StatusRenderer {
    private bgContainer: PIXI.Container;
    private hitContainer: PIXI.Container;
    private onHoverStatus: (status: HoveredStatus | null) => void;
    private hoverSnapshot: { statusId: number; screenX: number; screenY: number } | null = null;

    constructor(args: {
        bgContainer: PIXI.Container;
        hitContainer: PIXI.Container;
        onHoverStatus: (status: HoveredStatus | null) => void;
    }) {
        this.bgContainer = args.bgContainer;
        this.hitContainer = args.hitContainer;
        this.onHoverStatus = args.onHoverStatus;
    }

    public syncHoverAfterRebuild() {
        if (!this.hoverSnapshot) return;
        const status = STATUSES[this.hoverSnapshot.statusId];
        if (status) {
            this.onHoverStatus({
                status,
                screenX: this.hoverSnapshot.screenX,
                screenY: this.hoverSnapshot.screenY,
            });
        } else {
            this.hoverSnapshot = null;
            this.onHoverStatus(null);
        }
    }

    public render(state: GameState, scale: number, boardLeft: number, boardBottom: number, screenWidth: number, fontFamily: string) {
        const activeStatuses = state.activeStatuses ?? (
            state.activeStatusIds.length > 0
                ? state.activeStatusIds.map((id) => ({
                    id,
                    remainingTurns: Math.max(1, (STATUSES[id]?.durationTurns ?? 1) - state.turn),
                }))
                : getActiveStatusIdsForTurn(state.turn).map((id) => ({
                    id,
                    remainingTurns: Math.max(1, (STATUSES[id]?.durationTurns ?? 1) - state.turn),
                }))
        );
        const statuses = activeStatuses
            .map((activeStatus) => {
                const status = STATUSES[activeStatus.id];
                return status ? { status, remainingTurns: activeStatus.remainingTurns } : null;
            })
            .filter((status): status is { status: StatusDefinition; remainingTurns: number } => status != null);
        if (statuses.length === 0) return;

        const iconSize = 64 * scale;
        const gapX = 8 * scale;
        const gapY = 8 * scale;
        const maxRight = screenWidth - 16 * scale;

        const panel = new PIXI.Container();
        panel.x = boardLeft;
        panel.y = boardBottom + 12 * scale;
        this.bgContainer.addChildAt(panel, Math.min(1, this.bgContainer.children.length));

        let iconX = 0;
        let iconY = 0;
        for (const { status, remainingTurns } of statuses) {
            if (iconX > 0 && panel.x + iconX + iconSize > maxRight) {
                iconX = 0;
                iconY += iconSize + gapY;
            }
            const worldIconX = panel.x + iconX;
            const worldIconY = panel.y + iconY;

            this.renderFrame(panel, iconX, iconY, iconSize, scale);
            this.renderIcon(panel, status, iconX, iconY, iconSize);
            this.renderCounter(panel, remainingTurns, iconX, iconY, iconSize, scale, fontFamily);
            this.renderHitArea(status, worldIconX, worldIconY, iconSize);

            iconX += iconSize + gapX;
        }
    }

    private renderFrame(panel: PIXI.Container, iconX: number, iconY: number, iconSize: number, scale: number) {
        const frame = new PIXI.Graphics();
        frame.roundRect(iconX, iconY, iconSize, iconSize, 8 * scale);
        frame.stroke({ width: Math.max(1, 2 * scale), color: 0xe5e7eb, alpha: 0.74 });
        panel.addChild(frame);
    }

    private renderIcon(panel: PIXI.Container, status: StatusDefinition, iconX: number, iconY: number, iconSize: number) {
        if (status.sprite && status.sprite !== '-' && status.sprite !== '-.png') {
            const url = `${ASSET_BASE_URL}assets/status/${status.sprite}`;
            const texture = (PIXI.Assets.get(url) as PIXI.Texture | undefined) ?? PIXI.Texture.from(url);
            const sp = new PIXI.Sprite(texture);
            const inset = iconSize * 0.08;
            sp.x = iconX + inset;
            sp.y = iconY + inset;
            sp.width = iconSize - inset * 2;
            sp.height = iconSize - inset * 2;
            panel.addChild(sp);
            return;
        }

        const placeholder = new PIXI.Text({
            text: '!',
            style: new PIXI.TextStyle({ fontSize: iconSize * 0.6, fill: '#fde68a' }),
        });
        placeholder.anchor.set(0.5);
        placeholder.x = iconX + iconSize / 2;
        placeholder.y = iconY + iconSize / 2;
        panel.addChild(placeholder);
    }

    private renderHitArea(status: StatusDefinition, worldIconX: number, worldIconY: number, iconSize: number) {
        const hitArea = new PIXI.Graphics();
        hitArea.rect(worldIconX, worldIconY, iconSize, iconSize);
        hitArea.fill({ color: 0x000000, alpha: 0 });
        hitArea.eventMode = 'static';
        hitArea.cursor = GAME_CURSOR_HELP;

        hitArea.on('pointerover', () => {
            this.hoverSnapshot = {
                statusId: status.id,
                screenX: worldIconX,
                screenY: worldIconY,
            };
            this.onHoverStatus({ status, screenX: worldIconX, screenY: worldIconY });
        });
        hitArea.on('pointerout', () => {
            this.hoverSnapshot = null;
            this.onHoverStatus(null);
        });
        this.hitContainer.addChild(hitArea);
    }

    private renderCounter(
        panel: PIXI.Container,
        remainingTurns: number,
        iconX: number,
        iconY: number,
        iconSize: number,
        scale: number,
        fontFamily: string,
    ) {
        if (remainingTurns <= 0) return;

        const counterText = new PIXI.Text({
            text: String(remainingTurns),
            style: new PIXI.TextStyle({
                fill: '#d1d5db',
                fontSize: 26 * scale,
                fontWeight: 'bold',
                fontFamily,
                stroke: { color: '#000000', width: 3 },
            }),
        });
        counterText.anchor.set(0.5, 0.5);
        counterText.x = iconX + iconSize - 12 * scale;
        counterText.y = iconY + iconSize - 14 * scale;
        panel.addChild(counterText);
    }
}
