import * as PIXI from 'pixi.js';
import { getActiveStatusIdsForTurn, STATUSES } from '../../../game/data/statusDefinitions';
import type { StatusDefinition } from '../../../game/data/statusDefinitions';
import type { GameState } from '../../../game/state/gameStore';
import type { HoveredStatus } from '../types';
import { ASSET_BASE_URL } from './rendererShared';

export class StatusRenderer {
    private static readonly BOTTOM_ACTION_BAR_WIDTH = 1003;
    private static readonly BOTTOM_ACTION_BUTTON_SIZE = 97;
    private static readonly BOTTOM_ACTION_OFFSET = 24;

    private bgContainer: PIXI.Container;
    private onHoverStatus: (status: HoveredStatus | null) => void;
    private hitTargets: Array<{ status: StatusDefinition; bounds: PIXI.Rectangle }> = [];
    private hoverSnapshot: { statusId: number; screenX: number; screenY: number } | null = null;

    constructor(args: {
        bgContainer: PIXI.Container;
        onHoverStatus: (status: HoveredStatus | null) => void;
    }) {
        this.bgContainer = args.bgContainer;
        this.onHoverStatus = args.onHoverStatus;
    }

    public clearHover() {
        if (!this.hoverSnapshot) return;
        this.hoverSnapshot = null;
        this.onHoverStatus(null);
    }

    public containsScreenPoint(x: number, y: number) {
        return this.hitTargets.some(({ bounds }) => bounds.contains(x, y));
    }

    public syncHover(pointer: { x: number; y: number } | null) {
        const target = pointer
            ? this.hitTargets.find(({ bounds }) => bounds.contains(pointer.x, pointer.y))
            : undefined;
        if (!target) {
            this.clearHover();
            return;
        }
        if (
            this.hoverSnapshot?.statusId === target.status.id
            && this.hoverSnapshot.screenX === target.bounds.x
            && this.hoverSnapshot.screenY === target.bounds.y
        ) return;

        this.hoverSnapshot = {
            statusId: target.status.id,
            screenX: target.bounds.x,
            screenY: target.bounds.y,
        };
        this.onHoverStatus({
            status: target.status,
            screenX: target.bounds.x,
            screenY: target.bounds.y,
        });
    }

    public render(
        state: GameState,
        scale: number,
        screenWidth: number,
        screenHeight: number,
        fontFamily: string,
    ) {
        this.hitTargets = [];
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
        const buttonTop =
            screenHeight
            - StatusRenderer.BOTTOM_ACTION_OFFSET
            - StatusRenderer.BOTTOM_ACTION_BUTTON_SIZE;
        const actionBarWidth = Math.min(
            StatusRenderer.BOTTOM_ACTION_BAR_WIDTH,
            screenWidth - 32 * scale,
        );

        const panel = new PIXI.Container();
        panel.x = (screenWidth - actionBarWidth) / 2 + 8 * scale;
        panel.y = buttonTop - iconSize - 24 * scale;
        this.bgContainer.addChildAt(panel, Math.min(1, this.bgContainer.children.length));

        let iconX = 0;
        for (const { status, remainingTurns } of statuses) {
            const worldIconX = panel.x + iconX;
            const worldIconY = panel.y;

            this.renderFrame(panel, iconX, 0, iconSize, scale);
            this.renderIcon(panel, status, iconX, 0, iconSize);
            this.renderCounter(panel, remainingTurns, iconX, 0, iconSize, scale, fontFamily);
            this.hitTargets.push({
                status,
                bounds: new PIXI.Rectangle(worldIconX, worldIconY, iconSize, iconSize),
            });

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
