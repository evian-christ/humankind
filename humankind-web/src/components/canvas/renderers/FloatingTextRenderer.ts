import * as PIXI from 'pixi.js';
import { audioManager } from '../../../audio/audioManager';
import { useGameStore } from '../../../game/state/gameStore';
import type { GameState } from '../../../game/state/gameStore';
import type { BoardEffectDelta } from '../../../game/logic/turn/turnTypes';
import {
    FOOD_RESOURCE_ICON_URL,
    GOLD_RESOURCE_ICON_URL,
    KNOWLEDGE_RESOURCE_ICON_URL,
} from '../../../uiAssetUrls';
import type { CellLayout, FloatingEffect } from '../types';
import { getProductionHighlightScaleForDelta } from '../productionHighlightScale';
import { destroyPixiChild } from './rendererShared';

const FLOAT_DURATION = 1100;
const FLOAT_DISTANCE = 30;
const FLOAT_FADE_START = 0.7;
const PERSIST_EXIT_DURATION = 280;
const PERSIST_EXIT_DISTANCE = 18;
const COUNTER_FLOAT_COLOR = '#8b7355';
const RESOURCE_FLOAT_GAIN_COLOR = '#4ade80';
const RESOURCE_FLOAT_LOSS_COLOR = '#ef4444';
const RESOURCE_FLOAT_ICON_VERTICAL_NUDGE = 0.08;
const RESOURCE_FLOAT_FONT_SCALE = 0.8;

type ResourceFloatKind = 'food' | 'gold' | 'knowledge';
type FloatingItem = PIXI.Container & { _baseOffsetY?: number };

const THREAT_FLOAT_DRIFT_MS = 220;
export const THREAT_FLOAT_TOTAL_MS = 1800;
const THREAT_FLOAT_DRIFT_RIGHT = 36;
const THREAT_FLOAT_UP = 85;

interface BoardFloatLayout extends CellLayout {
    scale: number;
    fontFamily: string;
}

function getResourceIconUrl(kind: ResourceFloatKind): string {
    if (kind === 'food') return FOOD_RESOURCE_ICON_URL;
    if (kind === 'gold') return GOLD_RESOURCE_ICON_URL;
    return KNOWLEDGE_RESOURCE_ICON_URL;
}

function createResourceFloatItem(args: {
    kind: ResourceFloatKind;
    value: number;
    fontSize: number;
    fontFamily: string;
}): PIXI.Container {
    const { kind, value, fontSize, fontFamily } = args;
    const color = value > 0 ? RESOURCE_FLOAT_GAIN_COLOR : RESOURCE_FLOAT_LOSS_COLOR;
    const iconSize = Math.max(16, Math.round(fontSize));
    const iconGap = Math.max(3, Math.round(fontSize * 0.12));
    const container = new PIXI.Container();
    const texture = (PIXI.Assets.get(getResourceIconUrl(kind)) as PIXI.Texture | undefined)
        ?? PIXI.Texture.from(getResourceIconUrl(kind));
    const icon = new PIXI.Sprite(texture);
    icon.width = iconSize;
    icon.height = iconSize;
    icon.x = 0;

    const txt = new PIXI.Text({
        text: `${value > 0 ? '+' : ''}${value}`,
        style: new PIXI.TextStyle({
            fill: color,
            fontSize,
            fontFamily,
            stroke: { color: '#000000', width: 3 },
        }),
    });
    txt.anchor.set(0, 0);
    txt.x = iconSize + iconGap;
    txt.y = 0;
    icon.y = Math.max(0, (txt.height - iconSize) / 2) + Math.round(fontSize * RESOURCE_FLOAT_ICON_VERTICAL_NUDGE);

    container.addChild(icon);
    container.addChild(txt);
    return container;
}

export class FloatingTextRenderer {
    private container: PIXI.Container;
    private floatingEffects: FloatingEffect[] = [];
    private threatFloatingEffects: { texts: PIXI.Container[]; startX: number; startY: number; elapsed: number }[] = [];
    private prevEffectCount = 0;
    private renderedBoardEffects = new WeakSet<BoardEffectDelta>();
    private prevCombatFloatCount = 0;
    private prevRelicFloatCount = 0;
    private prevKnowledgeUpgradeFloatCount = 0;
    private pendingNewThreatFloatsShown = false;

    constructor(container: PIXI.Container) {
        this.container = container;
    }

    public resetThreatGateIfNeeded(phase: GameState['phase']) {
        if (phase !== 'showing_new_threats') this.pendingNewThreatFloatsShown = false;
    }

    public clearThreats() {
        for (const item of this.threatFloatingEffects) {
            for (const txt of item.texts) {
                txt.parent?.removeChild(txt);
                destroyPixiChild(txt);
            }
        }
        this.threatFloatingEffects = [];
    }

    public tick(dt: number) {
        this.tickStandardFloats(dt, useGameStore.getState());
        this.tickThreatFloats(dt);
    }

    public addText(text: PIXI.Container, startY: number, persistUntilProcessingEnd = false) {
        this.container.addChild(text);
        this.floatingEffects.push({ texts: [text], startY, elapsed: 0, persistUntilProcessingEnd });
    }

    public addTextGroup(texts: PIXI.Container[], startY: number, persistUntilProcessingEnd = false) {
        if (texts.length === 0) return;
        for (const txt of texts) this.container.addChild(txt);
        this.floatingEffects.push({ texts, startY, elapsed: 0, persistUntilProcessingEnd });
    }

    public renderBoardEffectFloats(state: GameState, layout: BoardFloatLayout) {
        if (state.lastEffects.length === 0) {
            this.prevEffectCount = 0;
            this.renderedBoardEffects = new WeakSet<BoardEffectDelta>();
            return;
        }
        if (state.phase === 'processing' && state.effectPhase === null) return;
        if (state.lastEffects.length <= this.prevEffectCount) return;

        const newEffects = state.lastEffects
            .slice(this.prevEffectCount)
            .filter((effect) => !this.renderedBoardEffects.has(effect));
        this.prevEffectCount = state.lastEffects.length;

        const { startX, startY, cellWidth, cellHeight, gridOffsetX, gridOffsetY, colGap, scale } = layout;
        const rowGap = 0;
        const persistUntilProcessingEnd = state.phase === 'processing';
        for (const effect of newEffects) {
            this.renderedBoardEffects.add(effect);
            const effectFontSize = Math.max(24, cellHeight * 0.22);
            const resourceFloatScale = getProductionHighlightScaleForDelta(effect);
            const resourceFontSize = effectFontSize * RESOURCE_FLOAT_FONT_SCALE * resourceFloatScale;
            const cellX = startX + gridOffsetX + effect.x * (cellWidth + colGap);
            const cellY = startY + gridOffsetY + effect.y * (cellHeight + rowGap);
            const baseX = cellX + cellWidth / 2;
            const baseY = cellY + 8 * scale;
            const hasPositiveFoodFloat = effect.food > 0;
            const hasPositiveGoldFloat = effect.gold > 0;
            const hasPositiveKnowledgeFloat = effect.knowledge > 0;

            const lines: Array<{ kind: ResourceFloatKind; value: number }> = [];
            if (effect.food !== 0) lines.push({ kind: 'food', value: effect.food });
            if (effect.gold !== 0) lines.push({ kind: 'gold', value: effect.gold });
            if (effect.knowledge !== 0) lines.push({ kind: 'knowledge', value: effect.knowledge });

            if (lines.length > 0) {
                const gapText = 6 * scale * resourceFloatScale;
                const tempTexts = lines.map((line) => createResourceFloatItem({
                    kind: line.kind,
                    value: line.value,
                    fontSize: resourceFontSize,
                    fontFamily: layout.fontFamily,
                }));
                const totalW = tempTexts.reduce((sum, t) => sum + t.width, 0) + gapText * (tempTexts.length - 1);
                let curX = baseX - totalW / 2;

                for (const txt of tempTexts) {
                    txt.x = curX;
                    txt.y = baseY;
                    (txt as FloatingItem)._baseOffsetY = 0;
                    curX += txt.width + gapText;
                }
                this.addTextGroup(tempTexts, baseY, persistUntilProcessingEnd);
            }

            if (effect.counter) {
                const isActiveSlot =
                    state.phase === 'processing' &&
                    state.activeSlot?.x === effect.x &&
                    state.activeSlot.y === effect.y;
                const liftY = isActiveSlot ? -cellHeight * 0.14 : 0;
                const counterX = effect.counterAnchor === 'bottom-left'
                    ? cellX + 25
                    : cellX + cellWidth - 21;
                const counterY = cellY + cellHeight - 24 + liftY;
                const txt = new PIXI.Text({
                    text: `${effect.counter > 0 ? '+' : ''}${effect.counter}`,
                    style: new PIXI.TextStyle({
                        fill: COUNTER_FLOAT_COLOR,
                        fontSize: effectFontSize,
                        fontWeight: 'bold',
                        fontFamily: layout.fontFamily,
                        stroke: { color: '#000000', width: 3 },
                    }),
                });
                txt.anchor.set(0.5, 0.5);
                txt.x = counterX;
                txt.y = counterY;
                (txt as unknown as FloatingItem)._baseOffsetY = 0;
                this.addText(txt, counterY, persistUntilProcessingEnd);
            }
            if (hasPositiveFoodFloat) {
                void audioManager.play('resource_food');
            }
            if (hasPositiveGoldFloat) {
                void audioManager.play('resource_gold');
            }
            if (hasPositiveKnowledgeFloat) {
                void audioManager.play('resource_knowledge');
            }
        }
    }

    public renderCombatFloats(state: GameState, layout: BoardFloatLayout) {
        if (!state.combatFloats || state.combatFloats.length === 0) {
            this.prevCombatFloatCount = 0;
            return;
        }
        if (state.combatFloats.length <= this.prevCombatFloatCount) return;

        const newFloats = state.combatFloats.slice(this.prevCombatFloatCount);
        this.prevCombatFloatCount = state.combatFloats.length;
        const { startX, startY, cellWidth, cellHeight, gridOffsetX, gridOffsetY, colGap } = layout;
        const rowGap = 0;
        const fontSize = Math.max(28, cellHeight * 0.28);

        for (const f of newFloats) {
            const fx = startX + gridOffsetX + f.x * (cellWidth + colGap) + cellWidth / 2;
            const fy = startY + gridOffsetY + f.y * (cellHeight + rowGap) + cellHeight * 0.25;
            const txt = new PIXI.Text({
                text: f.text,
                style: new PIXI.TextStyle({
                    fill: f.color ?? '#ef4444',
                    fontSize,
                    fontWeight: 'bold',
                    fontFamily: layout.fontFamily,
                    stroke: { color: '#000000', width: 4 },
                }),
            });
            txt.anchor.set(0.5, 0);
            txt.x = fx;
            txt.y = fy;
            (txt as unknown as FloatingItem)._baseOffsetY = 0;
            this.addText(txt, fy);
        }
    }

    public renderThreatFloats(state: GameState, layout: BoardFloatLayout) {
        if (state.phase !== 'showing_new_threats' || !state.pendingNewThreatFloats?.length || this.pendingNewThreatFloatsShown) {
            return;
        }

        this.pendingNewThreatFloatsShown = true;
        const { startX, startY, cellWidth, cellHeight, gridOffsetX, gridOffsetY, colGap } = layout;
        const rowGap = 0;
        const threatFloatFontSize = Math.max(28, cellHeight * 0.24);

        const hasBarbarianInvasion = state.pendingNewThreatFloats.some((threat) => threat.key === 'threat.barbarian_invasion');
        if (hasBarbarianInvasion) {
            void audioManager.play('enemy_invade');
        }

        for (const { x, y, label } of state.pendingNewThreatFloats) {
            const cx = startX + gridOffsetX + x * (cellWidth + colGap) + cellWidth / 2;
            const baseY = startY + gridOffsetY + y * (cellHeight + rowGap) + cellHeight * 0.28;
            const txt = new PIXI.Text({
                text: label,
                style: new PIXI.TextStyle({
                    fill: '#ff3333',
                    fontSize: threatFloatFontSize,
                    fontWeight: 'bold',
                    fontFamily: layout.fontFamily,
                    stroke: { color: '#000000', width: 4 },
                }),
            });
            txt.anchor.set(0.5, 0);
            txt.x = cx;
            txt.y = baseY;
            txt.scale.set(0.35, 0.35);
            this.container.addChild(txt);
            this.threatFloatingEffects.push({ texts: [txt], startX: cx, startY: baseY, elapsed: 0 });
        }

        setTimeout(() => useGameStore.getState().continueProcessingAfterNewThreatFloats(), THREAT_FLOAT_TOTAL_MS + 200);
    }

    public renderRelicFloats(
        state: GameState,
        relicCenterByInstanceId: Map<string, { x: number; y: number }>,
        iconSize: number,
        fontFamily: string,
    ) {
        if (!state.relicFloats || state.relicFloats.length === 0) {
            this.prevRelicFloatCount = 0;
            return;
        }
        if (state.relicFloats.length <= this.prevRelicFloatCount) return;

        const newFloats = state.relicFloats.slice(this.prevRelicFloatCount);
        this.prevRelicFloatCount = state.relicFloats.length;
        const fontSize = Math.max(26, iconSize * 0.32);

        for (const f of newFloats) {
            const c = relicCenterByInstanceId.get(f.relicInstanceId);
            if (!c) continue;
            const txt = new PIXI.Text({
                text: f.text,
                style: new PIXI.TextStyle({
                    fill: f.color ?? '#ffffff',
                    fontSize,
                    fontWeight: 'bold',
                    fontFamily,
                    stroke: { color: '#000000', width: 4 },
                }),
            });
            txt.anchor.set(0.5, 0.5);
            txt.x = c.x;
            txt.y = c.y - iconSize * 0.15;
            (txt as unknown as FloatingItem)._baseOffsetY = 0;
            this.addText(txt, txt.y);
        }
    }

    public resetKnowledgeUpgradeFloatCountIfEmpty(state: GameState) {
        if (!state.knowledgeUpgradeFloats || state.knowledgeUpgradeFloats.length === 0) {
            this.prevKnowledgeUpgradeFloatCount = 0;
        }
    }

    private tickStandardFloats(dt: number, state: GameState) {
        for (let i = this.floatingEffects.length - 1; i >= 0; i--) {
            const f = this.floatingEffects[i];
            f.elapsed += dt;
            const progress = Math.min(f.elapsed / FLOAT_DURATION, 1);
            const ease = 1 - (1 - progress) * (1 - progress);
            const shouldHold = f.persistUntilProcessingEnd && state.phase === 'processing' && state.effectPhase !== null;
            const baseOffsetY = -FLOAT_DISTANCE * ease;
            let offsetY = baseOffsetY;
            let alpha = shouldHold || progress < FLOAT_FADE_START
                ? 1
                : 1 - (progress - FLOAT_FADE_START) / (1 - FLOAT_FADE_START);

            if (f.persistUntilProcessingEnd && !shouldHold) {
                f.exitStartOffsetY ??= baseOffsetY;
                f.exitElapsed = (f.exitElapsed ?? 0) + dt;
                const exitProgress = Math.min(f.exitElapsed / PERSIST_EXIT_DURATION, 1);
                const exitEase = 1 - (1 - exitProgress) * (1 - exitProgress);
                offsetY = f.exitStartOffsetY - PERSIST_EXIT_DISTANCE * exitEase;
                alpha = 1 - exitProgress;
            } else if (shouldHold) {
                f.exitElapsed = undefined;
                f.exitStartOffsetY = undefined;
            }

            for (const txt of f.texts) {
                txt.y = f.startY + ((txt as FloatingItem)._baseOffsetY ?? 0) + offsetY;
                txt.alpha = alpha;
            }

            const exitComplete = f.persistUntilProcessingEnd
                ? (f.exitElapsed ?? 0) >= PERSIST_EXIT_DURATION
                : progress >= 1;
            if (exitComplete && !shouldHold) {
                for (const txt of f.texts) {
                    txt.parent?.removeChild(txt);
                    destroyPixiChild(txt);
                }
                this.floatingEffects.splice(i, 1);
            }
        }
    }

    private tickThreatFloats(dt: number) {
        for (let i = this.threatFloatingEffects.length - 1; i >= 0; i--) {
            const t = this.threatFloatingEffects[i];
            t.elapsed += dt;
            const elapsed = t.elapsed;
            if (elapsed < THREAT_FLOAT_DRIFT_MS) {
                const p = elapsed / THREAT_FLOAT_DRIFT_MS;
                const ease = 1 - (1 - p) * (1 - p);
                const offsetX = THREAT_FLOAT_DRIFT_RIGHT * ease;
                const scale = 0.35 + 0.65 * ease;
                for (const txt of t.texts) {
                    txt.x = t.startX + offsetX;
                    txt.y = t.startY;
                    txt.alpha = 1;
                    txt.scale.set(scale, scale);
                }
                continue;
            }

            const phase2Len = THREAT_FLOAT_TOTAL_MS - THREAT_FLOAT_DRIFT_MS;
            const phase2Elapsed = elapsed - THREAT_FLOAT_DRIFT_MS;
            const p = Math.min(phase2Elapsed / phase2Len, 1);
            const ease = 1 - (1 - p) * (1 - p);
            const offsetY = -THREAT_FLOAT_UP * ease;
            const alpha = p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5;
            for (const txt of t.texts) {
                txt.x = t.startX + THREAT_FLOAT_DRIFT_RIGHT;
                txt.y = t.startY + offsetY;
                txt.alpha = alpha;
                txt.scale.set(1, 1);
            }
            if (elapsed >= THREAT_FLOAT_TOTAL_MS) {
                for (const txt of t.texts) {
                    txt.parent?.removeChild(txt);
                    destroyPixiChild(txt);
                }
                this.threatFloatingEffects.splice(i, 1);
            }
        }
    }
}
