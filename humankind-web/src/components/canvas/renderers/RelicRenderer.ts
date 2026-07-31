import * as PIXI from 'pixi.js';
import { useGameStore } from '../../../game/state/gameStore';
import type { GameState } from '../../../game/state/gameStore';
import { RELICS } from '../../../game/data/relicDefinitions';
import { MAX_RELICS, useRelicStore } from '../../../game/state/relicStore';
import { useSettingsStore } from '../../../game/state/settingsStore';
import type { RelicInstance } from '../../../game/state/relicStore';
import {
    SEAL_RELIC_IDS,
    isSealRelicId,
    type RelicDisplayStack,
} from '../../../game/logic/relics/relicClassification';
import { audioManager } from '../../../audio/audioManager';
import { t } from '../../../i18n';
import type { HoveredRelic } from '../types';
import type { FloatingTextRenderer } from './FloatingTextRenderer';
import {
    ASSET_BASE_URL,
    CLICKABLE_RELIC_IDS,
    GAME_CURSOR_HELP,
    GAME_CURSOR_POINTER,
    getSealSpriteSize,
} from './rendererShared';
import { RELIC_ID } from '../../../game/logic/relics/relicIds';

export class RelicRenderer {
    private displayContainer: PIXI.Container;
    private floatContainer: PIXI.Container;
    private hitContainer: PIXI.Container;
    private floatingTextRenderer: FloatingTextRenderer;
    private onHoverRelic: (relic: HoveredRelic | null) => void;
    private screenHitBounds: PIXI.Rectangle[] = [];
    private screenHitBoundsByInstanceId = new Map<string, PIXI.Rectangle>();
    private hoverSnapshot: {
        instanceId: string;
        relicId: number;
        screenX: number;
        screenY: number;
        placement: 'left' | 'side' | 'above';
    } | null = null;

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

    public clearHover() {
        if (!this.hoverSnapshot) return;
        this.hoverSnapshot = null;
        this.onHoverRelic(null);
    }

    public validateHover(pointer: { x: number; y: number } | null) {
        if (!this.hoverSnapshot) return;
        const bounds = this.screenHitBoundsByInstanceId.get(this.hoverSnapshot.instanceId);
        if (!pointer || !bounds?.contains(pointer.x, pointer.y)) {
            this.clearHover();
        }
    }

    public syncHoverAfterRebuild(pointer: { x: number; y: number } | null) {
        this.validateHover(pointer);
        if (!this.hoverSnapshot) return;
        const relic = useRelicStore.getState().relics.find((r) => r.instanceId === this.hoverSnapshot!.instanceId)
            ?? this.createEmptySeal(this.hoverSnapshot.relicId);
        if (relic) {
            this.onHoverRelic({
                relicInfo: relic,
                screenX: this.hoverSnapshot.screenX,
                screenY: this.hoverSnapshot.screenY,
                placement: this.hoverSnapshot.placement,
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
        screenHeight: number,
        fontFamily: string,
    ) {
        const relics = useRelicStore.getState().relics;
        const permanentRelics = relics.filter((relic) => !isSealRelicId(relic.definition.id));
        this.screenHitBounds = [];
        this.screenHitBoundsByInstanceId.clear();

        const shakeRelicDefId = useGameStore.getState().preCombatShakeRelicDefId;
        const columnCount = 2;
        const rowCount = MAX_RELICS / columnCount;
        const gapX = 8 * scale;
        const gapY = 4 * scale;
        const minimumSideMargin = 16 * scale;
        const iconSize = 64 * scale;
        const panelPadding = 8 * scale;
        const panelWidth = iconSize * columnCount + gapX + panelPadding * 2;
        const panelHeight = iconSize * rowCount + gapY * (rowCount - 1) + panelPadding * 2;

        const relicPanel = new PIXI.Container();
        relicPanel.x = Math.round(screenWidth - panelWidth - minimumSideMargin);
        relicPanel.y = Math.round((screenHeight - panelHeight) / 2);
        this.displayContainer.addChild(relicPanel);

        this.renderPanelBackground(relicPanel, panelWidth, panelHeight, scale);
        this.renderEmptySlots(
            relicPanel,
            permanentRelics.length,
            iconSize,
            gapX,
            gapY,
            panelPadding,
        );
        const layout = this.buildLayout(
            permanentRelics,
            iconSize,
            gapX,
            gapY,
            panelPadding,
        );
        const relicCenterByInstanceId = new Map<string, { x: number; y: number }>();

        for (const { stack, iconX, iconY } of layout) {
            const { relic } = stack;
            const isShakingThisRelic = shakeRelicDefId === relic.definition.id;
            const shakeX = isShakingThisRelic ? Math.sin(Date.now() / 20) * (5 * scale) : 0;
            const shakeY = isShakingThisRelic ? Math.cos(Date.now() / 17) * (4 * scale) : 0;
            const worldIconX = relicPanel.x + iconX + shakeX;
            const worldIconY = relicPanel.y + iconY + shakeY;
            for (const stackedRelic of stack.relics) {
                relicCenterByInstanceId.set(stackedRelic.instanceId, {
                    x: worldIconX + iconSize / 2,
                    y: worldIconY + iconSize / 2,
                });
            }

            this.renderIcon(relicPanel, relic, iconX, iconY, iconSize, shakeX, shakeY);
            this.renderSealBadge(relicPanel, relic, iconX, iconY, iconSize, scale, shakeX, shakeY, fontFamily);
            this.renderHitArea(stack, worldIconX, worldIconY, iconSize, fontFamily);
            this.renderCounter(relicPanel, relic, iconX, iconY, iconSize, scale, fontFamily);
        }

        this.renderSealPanel(
            relics,
            relicCenterByInstanceId,
            scale,
            screenWidth,
            screenHeight,
            fontFamily,
        );

        this.floatingTextRenderer.renderRelicFloats(
            state,
            relicCenterByInstanceId,
            iconSize,
            fontFamily,
            this.floatContainer,
        );
    }

    private renderSealPanel(
        relics: RelicInstance[],
        relicCenterByInstanceId: Map<string, { x: number; y: number }>,
        scale: number,
        screenWidth: number,
        screenHeight: number,
        fontFamily: string,
    ) {
        const sealIconSize = getSealSpriteSize(scale);
        const gapX = 8 * scale;
        const edgeOffset = 24 * scale;
        const panelWidth = sealIconSize * SEAL_RELIC_IDS.length
            + gapX * (SEAL_RELIC_IDS.length - 1);
        const panel = new PIXI.Container();
        panel.x = screenWidth - panelWidth - edgeOffset;
        panel.y = screenHeight - sealIconSize - edgeOffset;
        this.displayContainer.addChild(panel);

        for (const [index, relicId] of SEAL_RELIC_IDS.entries()) {
            const matchingRelics = relics.filter((relic) => relic.definition.id === relicId);
            const relic = matchingRelics[0] ?? this.createEmptySeal(relicId);
            const iconX = index * (sealIconSize + gapX);
            const iconY = 0;
            const worldIconX = panel.x + iconX;
            const worldIconY = panel.y + iconY;

            this.renderIcon(panel, relic, iconX, iconY, sealIconSize, 0, 0);
            this.renderSealCount(
                panel,
                matchingRelics.length,
                iconX,
                iconY,
                sealIconSize,
                scale,
                fontFamily,
            );

            const stack: RelicDisplayStack<RelicInstance> = {
                relic,
                relics: matchingRelics.length > 0 ? matchingRelics : [relic],
                count: matchingRelics.length,
            };
            for (const stackedRelic of matchingRelics) {
                relicCenterByInstanceId.set(stackedRelic.instanceId, {
                    x: worldIconX + sealIconSize / 2,
                    y: worldIconY + sealIconSize / 2,
                });
            }
            this.renderHitArea(
                stack,
                worldIconX,
                worldIconY,
                sealIconSize,
                fontFamily,
                {
                    placement: 'above',
                    clickable: matchingRelics.length > 0,
                },
            );
        }
    }

    private renderSealCount(
        panel: PIXI.Container,
        count: number,
        iconX: number,
        iconY: number,
        iconSize: number,
        scale: number,
        fontFamily: string,
    ) {
        const counterText = new PIXI.Text({
            text: String(count),
            style: new PIXI.TextStyle({
                fill: count > 0 ? '#ffffff' : '#9ca3af',
                fontSize: Math.max(22, 26 * scale),
                fontWeight: 'bold',
                fontFamily,
                stroke: { color: '#000000', width: Math.max(3, 3 * scale) },
            }),
        });
        counterText.anchor.set(0.5);
        counterText.x = iconX + iconSize - Math.max(14, 14 * scale);
        counterText.y = iconY + iconSize - Math.max(16, 16 * scale);
        panel.addChild(counterText);
    }

    private createEmptySeal(relicId: number): RelicInstance {
        return {
            instanceId: `empty_consumable_${relicId}`,
            definition: RELICS[relicId],
            effect_counter: 0,
            bonus_stacks: 0,
        };
    }

    private renderPanelBackground(
        panel: PIXI.Container,
        panelWidth: number,
        panelHeight: number,
        scale: number,
    ) {
        const borderWidth = Math.max(1, 2 * scale);
        const innerInset = 4 * scale;
        const background = new PIXI.Graphics();

        background.rect(0, 0, panelWidth, panelHeight);
        background.fill({ color: 0x1c1c1c, alpha: 1 });

        background.rect(0, 0, panelWidth, panelHeight);
        background.fill({ color: 0x000000, alpha: 0.09 });

        background.rect(0, 0, panelWidth, panelHeight);
        background.stroke({ color: 0x0e0e0e, width: borderWidth, alpha: 1 });

        background.rect(
            innerInset,
            innerInset,
            panelWidth - innerInset * 2,
            panelHeight - innerInset * 2,
        );
        background.stroke({ color: 0x0e0e0e, width: borderWidth, alpha: 1 });

        panel.addChild(background);
    }

    private renderEmptySlots(
        panel: PIXI.Container,
        occupiedSlotCount: number,
        iconSize: number,
        gapX: number,
        gapY: number,
        panelPadding: number,
    ) {
        const rowCount = MAX_RELICS / 2;
        const dots = new PIXI.Graphics();
        const dotRadius = 3;

        for (let index = Math.min(occupiedSlotCount, MAX_RELICS); index < MAX_RELICS; index += 1) {
            const column = Math.floor(index / rowCount);
            const row = index % rowCount;
            const centerX = Math.round(panelPadding + column * (iconSize + gapX) + iconSize / 2);
            const centerY = Math.round(panelPadding + row * (iconSize + gapY) + iconSize / 2);
            dots.circle(centerX, centerY, dotRadius);
            dots.fill({ color: 0x777777, alpha: 0.5 });
        }

        panel.addChild(dots);
    }

    private buildLayout(
        relics: RelicInstance[],
        iconSize: number,
        gapX: number,
        gapY: number,
        panelPadding: number,
    ) {
        const rowCount = MAX_RELICS / 2;
        return relics.slice(0, MAX_RELICS).map((relic, index) => {
            const column = Math.floor(index / rowCount);
            const row = index % rowCount;
            return {
                stack: { relic, relics: [relic], count: 1 },
                iconX: panelPadding + column * (iconSize + gapX),
                iconY: panelPadding + row * (iconSize + gapY),
            } satisfies {
                stack: RelicDisplayStack<RelicInstance>;
                iconX: number;
                iconY: number;
            };
        });
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

    private renderSealBadge(
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
        if (!isSealRelicId(relic.definition.id)) return;

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

    private renderHitArea(
        stack: RelicDisplayStack<RelicInstance>,
        worldIconX: number,
        worldIconY: number,
        iconSize: number,
        fontFamily: string,
        options: {
            placement?: 'left' | 'side' | 'above';
            clickable?: boolean;
        } = {},
    ) {
        const { relic } = stack;
        const hitArea = new PIXI.Graphics();
        const hitPadding = Math.max(3, iconSize * 0.05);
        const bounds = new PIXI.Rectangle(
            worldIconX - hitPadding,
            worldIconY - hitPadding,
            iconSize + hitPadding * 2,
            iconSize + hitPadding * 2,
        );
        this.screenHitBounds.push(bounds);
        for (const stackedRelic of stack.relics) {
            this.screenHitBoundsByInstanceId.set(stackedRelic.instanceId, bounds);
        }
        hitArea.rect(bounds.x, bounds.y, bounds.width, bounds.height);
        hitArea.fill({ color: 0x000000, alpha: 0 });
        hitArea.eventMode = 'static';
        const placement = options.placement ?? 'left';
        const relicClickable = (options.clickable ?? true) && CLICKABLE_RELIC_IDS.has(relic.definition.id);
        hitArea.cursor = relicClickable ? GAME_CURSOR_POINTER : GAME_CURSOR_HELP;

        hitArea.on('pointerover', () => {
            const tooltipAnchorX = placement === 'above'
                ? worldIconX + iconSize / 2
                : placement === 'left'
                    ? worldIconX
                    : worldIconX + iconSize;
            this.hoverSnapshot = {
                instanceId: relic.instanceId,
                relicId: relic.definition.id,
                screenX: tooltipAnchorX,
                screenY: worldIconY,
                placement,
            };
            this.onHoverRelic({
                relicInfo: relic,
                screenX: tooltipAnchorX,
                screenY: worldIconY,
                placement,
            });
        });
        hitArea.on('pointerout', () => {
            this.hoverSnapshot = null;
            this.onHoverRelic(null);
        });
        if (relicClickable) {
            hitArea.on('pointertap', () => {
                const state = useGameStore.getState();
                if (state.phase === 'selection' && isSealRelicId(relic.definition.id)) {
                    void audioManager.play('denied');
                    const message = new PIXI.Text({
                        text: t(
                            'game.chooseSymbolBeforeRelicPurchase',
                            useSettingsStore.getState().language,
                        ),
                        style: new PIXI.TextStyle({
                            fill: '#f87171',
                            fontSize: Math.max(24, iconSize * 0.32),
                            fontWeight: 'bold',
                            fontFamily,
                            stroke: { color: '#000000', width: 4 },
                        }),
                    });
                    message.anchor.set(0.5, 0.5);
                    message.x = worldIconX + iconSize / 2;
                    message.y = worldIconY + iconSize * 0.35;
                    this.floatingTextRenderer.addText(
                        message,
                        message.y,
                        false,
                        this.floatContainer,
                    );
                    return;
                }
                useGameStore.getState().activateClickableRelic(relic.instanceId);
            });
        }
        this.hitContainer.addChild(hitArea);
    }

    private renderCounter(panel: PIXI.Container, relic: RelicInstance, iconX: number, iconY: number, iconSize: number, scale: number, fontFamily: string) {
        const rid = relic.definition.id;
        let counterStr: string | null = null;
        if (rid === RELIC_ID.UR_WHEEL || rid === RELIC_ID.NILE_SILT) counterStr = String(relic.effect_counter);
        else if (rid === RELIC_ID.JOMON_POTTERY) counterStr = String(relic.bonus_stacks);
        else if (rid === RELIC_ID.BABYLON_MAP) counterStr = String(1 + (relic.bonus_stacks ?? 0));
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
