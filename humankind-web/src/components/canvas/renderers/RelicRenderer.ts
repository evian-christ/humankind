import * as PIXI from 'pixi.js';
import { useGameStore } from '../../../game/state/gameStore';
import type { GameState } from '../../../game/state/gameStore';
import { useRelicStore } from '../../../game/state/relicStore';
import type { RelicInstance } from '../../../game/state/relicStore';
import type { HoveredRelic } from '../types';
import type { FloatingTextRenderer } from './FloatingTextRenderer';
import { ASSET_BASE_URL, CLICKABLE_RELIC_IDS, GAME_CURSOR_HELP, GAME_CURSOR_POINTER } from './rendererShared';

export class RelicRenderer {
    private bgContainer: PIXI.Container;
    private hitContainer: PIXI.Container;
    private floatingTextRenderer: FloatingTextRenderer;
    private onHoverRelic: (relic: HoveredRelic | null) => void;
    private hoverSnapshot: { instanceId: string; screenX: number; screenY: number } | null = null;

    constructor(args: {
        bgContainer: PIXI.Container;
        hitContainer: PIXI.Container;
        floatingTextRenderer: FloatingTextRenderer;
        onHoverRelic: (relic: HoveredRelic | null) => void;
    }) {
        this.bgContainer = args.bgContainer;
        this.hitContainer = args.hitContainer;
        this.floatingTextRenderer = args.floatingTextRenderer;
        this.onHoverRelic = args.onHoverRelic;
    }

    public syncHoverAfterRebuild() {
        if (!this.hoverSnapshot) return;
        const relic = useRelicStore.getState().relics.find((r) => r.instanceId === this.hoverSnapshot!.instanceId);
        if (relic) {
            this.onHoverRelic({
                relicInfo: relic,
                screenX: this.hoverSnapshot.screenX,
                screenY: this.hoverSnapshot.screenY,
            });
        } else {
            this.hoverSnapshot = null;
            this.onHoverRelic(null);
        }
    }

    public render(state: GameState, scale: number, screenWidth: number, fontFamily: string) {
        const relics = useRelicStore.getState().relics;
        if (relics.length === 0) return;

        const shakeRelicDefId = useGameStore.getState().preCombatShakeRelicDefId;
        const iconSize = 64 * scale;
        const gapX = 8 * scale;
        const gapY = 8 * scale;
        const marginLeft = 16 * scale;
        const marginTop = 80 * scale + 8 * scale;
        const iconsPerRow = Math.max(1, Math.floor((screenWidth - marginLeft * 2) / (iconSize + gapX)));

        const relicPanel = new PIXI.Container();
        relicPanel.x = marginLeft;
        relicPanel.y = marginTop;
        this.bgContainer.addChildAt(relicPanel, 1);

        const layout = this.buildLayout(relics, iconSize, gapX, gapY, iconsPerRow);
        const relicCenterByInstanceId = new Map<string, { x: number; y: number }>();

        for (const { relic, iconX, iconY } of layout) {
            const isShakingThisRelic = shakeRelicDefId === relic.definition.id;
            const shakeX = isShakingThisRelic ? Math.sin(Date.now() / 20) * (5 * scale) : 0;
            const shakeY = isShakingThisRelic ? Math.cos(Date.now() / 17) * (4 * scale) : 0;
            const worldIconX = relicPanel.x + iconX + shakeX;
            const worldIconY = relicPanel.y + iconY + shakeY;
            relicCenterByInstanceId.set(relic.instanceId, {
                x: worldIconX + iconSize / 2,
                y: worldIconY + iconSize / 2,
            });

            this.renderIcon(relicPanel, relic, iconX, iconY, iconSize, shakeX, shakeY);
            this.renderHitArea(relic, worldIconX, worldIconY, iconSize);
            this.renderCounter(relicPanel, relic, iconX, iconY, iconSize, scale, fontFamily);
        }

        this.floatingTextRenderer.renderRelicFloats(state, relicCenterByInstanceId, iconSize, fontFamily);
    }

    private buildLayout(relics: RelicInstance[], iconSize: number, gapX: number, gapY: number, iconsPerRow: number) {
        const layout: { relic: RelicInstance; iconX: number; iconY: number }[] = [];
        let curX = 0;
        let curY = 0;
        for (const relic of relics) {
            if (curX > 0 && curX + iconSize > iconsPerRow * (iconSize + gapX)) {
                curX = 0;
                curY += iconSize + gapY;
            }
            layout.push({ relic, iconX: curX, iconY: curY });
            curX += iconSize + gapX;
        }
        return layout;
    }

    private renderIcon(panel: PIXI.Container, relic: RelicInstance, iconX: number, iconY: number, iconSize: number, shakeX: number, shakeY: number) {
        if (relic.definition.sprite && relic.definition.sprite !== '-' && relic.definition.sprite !== '-.png') {
            const texture =
                (PIXI.Assets.get(`${ASSET_BASE_URL}assets/relics/${relic.definition.sprite}`) as PIXI.Texture | undefined)
                ?? PIXI.Texture.from(`${ASSET_BASE_URL}assets/relics/${relic.definition.sprite}`);
            const sp = new PIXI.Sprite(texture);
            sp.x = iconX + shakeX;
            sp.y = iconY + shakeY;
            sp.width = iconSize;
            sp.height = iconSize;
            panel.addChild(sp);
            return;
        }

        const placeholder = new PIXI.Text({
            text: '🏺',
            style: new PIXI.TextStyle({ fontSize: iconSize * 0.6 }),
        });
        placeholder.anchor.set(0.5);
        placeholder.x = iconX + iconSize / 2 + shakeX;
        placeholder.y = iconY + iconSize / 2 + shakeY;
        panel.addChild(placeholder);
    }

    private renderHitArea(relic: RelicInstance, worldIconX: number, worldIconY: number, iconSize: number) {
        const hitArea = new PIXI.Graphics();
        hitArea.rect(worldIconX, worldIconY, iconSize, iconSize);
        hitArea.fill({ color: 0x000000, alpha: 0 });
        hitArea.eventMode = 'static';
        const relicClickable = CLICKABLE_RELIC_IDS.has(relic.definition.id);
        hitArea.cursor = relicClickable ? GAME_CURSOR_POINTER : GAME_CURSOR_HELP;

        hitArea.on('pointerover', () => {
            this.hoverSnapshot = {
                instanceId: relic.instanceId,
                screenX: worldIconX + iconSize,
                screenY: worldIconY,
            };
            this.onHoverRelic({ relicInfo: relic, screenX: worldIconX + iconSize, screenY: worldIconY });
        });
        hitArea.on('pointerout', () => {
            this.hoverSnapshot = null;
            this.onHoverRelic(null);
        });
        if (relicClickable) {
            hitArea.on('pointertap', () => {
                useGameStore.getState().activateClickableRelic(relic.instanceId);
            });
        }
        this.hitContainer.addChild(hitArea);
    }

    private renderCounter(panel: PIXI.Container, relic: RelicInstance, iconX: number, iconY: number, iconSize: number, scale: number, fontFamily: string) {
        const rid = relic.definition.id;
        let counterStr: string | null = null;
        if (rid === 3 || rid === 9) counterStr = String(relic.effect_counter);
        else if (rid === 4) counterStr = String(relic.bonus_stacks);
        else if (rid === 6) counterStr = String(1 + (relic.bonus_stacks ?? 0));
        if (counterStr === null) return;

        const counterText = new PIXI.Text({
            text: counterStr,
            style: new PIXI.TextStyle({
                fill: '#d1d5db',
                fontSize: 26 * scale,
                fontWeight: 'bold',
                fontFamily,
                stroke: { color: '#000000', width: 3 },
            }),
        });
        counterText.anchor.set(0.5, 0.5);
        counterText.x = iconX + iconSize - 14 * scale;
        counterText.y = iconY + iconSize - 16 * scale;
        panel.addChild(counterText);
    }
}
