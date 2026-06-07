import * as PIXI from 'pixi.js';
import { useGameStore } from '../../../game/state/gameStore';
import type { GameState } from '../../../game/state/gameStore';
import { useRelicStore } from '../../../game/state/relicStore';
import type { RelicInstance } from '../../../game/state/relicStore';
import { isConsumableRelicId } from '../../../game/logic/relics/relicClassification';
import type { HoveredRelic } from '../types';
import type { FloatingTextRenderer } from './FloatingTextRenderer';
import { ASSET_BASE_URL, CLICKABLE_RELIC_IDS, GAME_CURSOR_HELP, GAME_CURSOR_POINTER } from './rendererShared';

export class RelicRenderer {
    private displayContainer: PIXI.Container;
    private floatContainer: PIXI.Container;
    private hitContainer: PIXI.Container;
    private floatingTextRenderer: FloatingTextRenderer;
    private onHoverRelic: (relic: HoveredRelic | null) => void;
    private screenHitBounds: PIXI.Rectangle[] = [];
    private hoverSnapshot: { instanceId: string; screenX: number; screenY: number } | null = null;

    constructor(args: {
        displayContainer: PIXI.Container;
        floatContainer: PIXI.Container;
        hitContainer: PIXI.Container;
        floatingTextRenderer: FloatingTextRenderer;
        onHoverRelic: (relic: HoveredRelic | null) => void;
    }) {
        this.displayContainer = args.displayContainer;
        this.floatContainer = args.floatContainer;
        this.hitContainer = args.hitContainer;
        this.floatingTextRenderer = args.floatingTextRenderer;
        this.onHoverRelic = args.onHoverRelic;
    }

    public containsScreenPoint(x: number, y: number) {
        return this.screenHitBounds.some((bounds) => bounds.contains(x, y));
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

    public render(
        state: GameState,
        scale: number,
        screenWidth: number,
        boardLeft: number,
        boardRight: number,
        fontFamily: string,
    ) {
        const relics = useRelicStore.getState().relics;
        this.screenHitBounds = [];
        if (relics.length === 0) return;

        const shakeRelicDefId = useGameStore.getState().preCombatShakeRelicDefId;
        const iconSize = 64 * scale;
        const gapX = 8 * scale;
        const gapY = 8 * scale;
        const minimumSideMargin = 16 * scale;
        const marginTop = 80 * scale + 8 * scale;
        const boardSideGap = 16 * scale;
        const columnStep = iconSize + gapX;
        const fullIconsPerRow = Math.max(
            1,
            Math.floor((screenWidth - minimumSideMargin * 2) / columnStep),
        );
        const fullRowWidth = (fullIconsPerRow - 1) * columnStep + iconSize;
        const gridStartX = (screenWidth - fullRowWidth) / 2;
        const rightStartColumn = Math.ceil((boardRight + boardSideGap - gridStartX) / columnStep);
        const rightStartX = gridStartX + rightStartColumn * columnStep;
        const leftIconsPerSplitRow = Math.min(
            7,
            Math.max(
                1,
                Math.floor((boardLeft - boardSideGap - gridStartX + gapX) / columnStep),
            ),
        );
        const rightIconsPerRow = Math.max(
            1,
            Math.floor((screenWidth - gridStartX - rightStartX + gapX) / columnStep),
        );

        const relicPanel = new PIXI.Container();
        relicPanel.x = 0;
        relicPanel.y = marginTop;
        this.displayContainer.addChild(relicPanel);

        const layout = this.buildLayout(
            relics,
            iconSize,
            gapX,
            gapY,
            gridStartX,
            rightStartX,
            fullIconsPerRow,
            leftIconsPerSplitRow,
            rightIconsPerRow,
        );
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
            this.renderConsumableBadge(relicPanel, relic, iconX, iconY, iconSize, scale, shakeX, shakeY, fontFamily);
            this.renderHitArea(relic, worldIconX, worldIconY, iconSize);
            this.renderCounter(relicPanel, relic, iconX, iconY, iconSize, scale, fontFamily);
        }

        this.floatingTextRenderer.renderRelicFloats(
            state,
            relicCenterByInstanceId,
            iconSize,
            fontFamily,
            this.floatContainer,
        );
    }

    private buildLayout(
        relics: RelicInstance[],
        iconSize: number,
        gapX: number,
        gapY: number,
        leftStartX: number,
        rightStartX: number,
        fullIconsPerRow: number,
        leftIconsPerSplitRow: number,
        rightIconsPerRow: number,
    ) {
        const layout: { relic: RelicInstance; iconX: number; iconY: number }[] = [];
        const fullRowRelicCount = Math.min(fullIconsPerRow * 2, relics.length);
        const rowStep = iconSize + gapY;
        const columnStep = iconSize + gapX;

        for (let index = 0; index < fullRowRelicCount; index += 1) {
            layout.push({
                relic: relics[index],
                iconX: leftStartX + (index % fullIconsPerRow) * columnStep,
                iconY: Math.floor(index / fullIconsPerRow) * rowStep,
            });
        }

        const splitRowCapacity = leftIconsPerSplitRow + rightIconsPerRow;
        for (let index = fullRowRelicCount; index < relics.length; index += 1) {
            const splitIndex = index - fullRowRelicCount;
            const splitRow = Math.floor(splitIndex / splitRowCapacity);
            const splitColumn = splitIndex % splitRowCapacity;
            const isLeftOfBoard = splitColumn < leftIconsPerSplitRow;
            layout.push({
                relic: relics[index],
                iconX: isLeftOfBoard
                    ? leftStartX + splitColumn * columnStep
                    : rightStartX + (splitColumn - leftIconsPerSplitRow) * columnStep,
                iconY: (2 + splitRow) * rowStep,
            });
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

    private renderConsumableBadge(
        panel: PIXI.Container,
        relic: RelicInstance,
        iconX: number,
        iconY: number,
        iconSize: number,
        scale: number,
        shakeX: number,
        shakeY: number,
        fontFamily: string,
    ) {
        if (!isConsumableRelicId(relic.definition.id)) return;

        const badgeSize = 24 * scale;
        const badgeX = iconX + iconSize + shakeX;
        const badgeY = iconY + shakeY;
        const badge = new PIXI.Graphics();
        badge.poly([
            badgeX - badgeSize,
            badgeY,
            badgeX,
            badgeY,
            badgeX,
            badgeY + badgeSize,
        ]);
        badge.fill({ color: 0xf97316 });
        badge.stroke({ color: 0xffedd5, width: Math.max(1, 1.5 * scale), alpha: 0.9 });
        panel.addChild(badge);

        const mark = new PIXI.Text({
            text: '!',
            style: new PIXI.TextStyle({
                fill: '#ffffff',
                fontSize: 14 * scale,
                fontWeight: 'bold',
                fontFamily,
                stroke: { color: '#7c2d12', width: Math.max(1, 2 * scale) },
            }),
        });
        mark.anchor.set(0.5);
        mark.x = badgeX - badgeSize * 0.28;
        mark.y = badgeY + badgeSize * 0.28;
        panel.addChild(mark);
    }

    private renderHitArea(relic: RelicInstance, worldIconX: number, worldIconY: number, iconSize: number) {
        const hitArea = new PIXI.Graphics();
        const hitPadding = Math.max(3, iconSize * 0.05);
        const bounds = new PIXI.Rectangle(
            worldIconX - hitPadding,
            worldIconY - hitPadding,
            iconSize + hitPadding * 2,
            iconSize + hitPadding * 2,
        );
        this.screenHitBounds.push(bounds);
        hitArea.rect(bounds.x, bounds.y, bounds.width, bounds.height);
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
