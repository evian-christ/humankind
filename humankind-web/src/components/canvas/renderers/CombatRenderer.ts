import * as PIXI from 'pixi.js';
import { useGameStore } from '../../../game/state/gameStore';
import { COMBAT_BOUNCE_DURATION, useSettingsStore } from '../../../game/state/settingsStore';
import { getSymbolColor } from '../../../game/data/symbolDefinitions';
import { t } from '../../../i18n';
import { audioManager } from '../../../audio/audioManager';
import type { CellLayout, CombatBounce } from '../types';
import type { FloatingTextRenderer } from './FloatingTextRenderer';
import { getSymbolSpriteUrl } from '../../../game/data/symbolSpritePaths';
import {
    clearPixiContainer,
    destroyPixiChild,
    getBoardSymbolSpriteSize,
    getGameFontFamily,
} from './rendererShared';

const RANGED_ATTACKER_KEYS = new Set(['archer', 'crossbowman', 'cannon']);

export class CombatRenderer {
    private container: PIXI.Container;
    private floatingTextRenderer: FloatingTextRenderer;
    private combatBounce: CombatBounce | null = null;
    private combatShaking = false;

    constructor(container: PIXI.Container, floatingTextRenderer: FloatingTextRenderer) {
        this.container = container;
        this.floatingTextRenderer = floatingTextRenderer;
    }

    public setShaking(shaking: boolean) {
        this.combatShaking = shaking;
    }

    public clearIfNoAnimation(hasCombatAnimation: boolean) {
        if (hasCombatAnimation) return;
        clearPixiContainer(this.container);
        this.container.x = 0;
    }

    public tick(dt: number): boolean {
        const bounceFinished = this.tickBounce(dt);
        this.container.x = this.combatShaking ? Math.sin(Date.now() / 20) * 6 : 0;
        return bounceFinished;
    }

    public isAnimatingAttacker(x: number, y: number): boolean {
        return this.combatBounce?.attackerX === x && this.combatBounce?.attackerY === y;
    }

    public trigger(anim: { ax: number; ay: number; tx: number; ty: number; atkDmg: number; counterDmg: number }, cellLayout: CellLayout | null) {
        if (!cellLayout) return;

        const settings = useSettingsStore.getState();
        const effectSpeed = settings.effectSpeed;
        const fontFamily = getGameFontFamily(settings.language);
        const bounceDuration = COMBAT_BOUNCE_DURATION[effectSpeed];
        if (bounceDuration === 0) return;

        this.clearBounce();

        const { startX, startY, cellWidth, cellHeight, gridOffsetX, gridOffsetY, colGap, scale } = cellLayout;
        const { ax, ay, tx, ty, atkDmg } = anim;

        const board = useGameStore.getState().board;
        if (
            ax < 0 ||
            ax >= board.length ||
            ay < 0 ||
            ay >= (board[ax]?.length ?? 0) ||
            !Object.prototype.hasOwnProperty.call(board[ax], ay)
        ) return;

        const aCX = startX + gridOffsetX + ax * (cellWidth + colGap) + cellWidth / 2;
        const aCY = startY + gridOffsetY + ay * cellHeight + cellHeight / 2;
        const tCX = startX + gridOffsetX + tx * (cellWidth + colGap) + cellWidth / 2;
        const tCY = startY + gridOffsetY + ty * cellHeight + cellHeight / 2;

        const moveToX = aCX + (tCX - aCX) * 0.55;
        const moveToY = aCY + (tCY - aCY) * 0.55;

        const attackerDef = board[ax]?.[ay]?.definition;
        if (attackerDef?.base_attack && attackerDef.base_attack > 0) {
            const cueId = RANGED_ATTACKER_KEYS.has(attackerDef.key) ? 'attack_ranged' : 'attack_melee';
            void audioManager.play(cueId);
        }
        let bounceSprite: PIXI.Container;

        const attackerSpriteUrl = attackerDef ? getSymbolSpriteUrl(attackerDef) : null;
        if (attackerSpriteUrl) {
            const spriteSize = getBoardSymbolSpriteSize(cellWidth, cellHeight);
            const sp = PIXI.Sprite.from(attackerSpriteUrl);
            sp.anchor.set(0.5);
            sp.width = spriteSize;
            sp.height = spriteSize;
            bounceSprite = sp;
        } else {
            const lang = settings.language;
            const symName = t(`symbol.${attackerDef?.key ?? 'warrior'}.name`, lang);
            const rarityColor = attackerDef ? getSymbolColor(attackerDef.type) : 0xffffff;
            const container = new PIXI.Container();
            const txt = new PIXI.Text({
                text: symName,
                style: new PIXI.TextStyle({
                    fill: rarityColor,
                    fontSize: 32 * scale,
                    fontFamily,
                    stroke: { color: '#000000', width: 2 * scale },
                }),
            });
            txt.anchor.set(0.5);
            container.addChild(txt);
            bounceSprite = container;
        }

        bounceSprite.x = aCX;
        bounceSprite.y = aCY;
        this.container.addChild(bounceSprite);

        this.combatBounce = {
            sprite: bounceSprite,
            attackerX: ax,
            attackerY: ay,
            fromX: aCX,
            fromY: aCY,
            toX: moveToX,
            toY: moveToY,
            elapsed: 0,
            duration: bounceDuration,
            hitSpawned: false,
            atkDmg,
            targetHpX: startX + gridOffsetX + tx * (cellWidth + colGap) + cellWidth - 5,
            targetHpY: startY + gridOffsetY + ty * cellHeight + cellHeight - 5,
        };
    }

    private clearBounce() {
        if (!this.combatBounce) return;
        const prev = this.combatBounce;
        if (prev.sprite.parent) prev.sprite.parent.removeChild(prev.sprite);
        destroyPixiChild(prev.sprite);
        this.combatBounce = null;
    }

    private tickBounce(dt: number): boolean {
        if (!this.combatBounce) return false;

        const b = this.combatBounce;
        const fontFamily = getGameFontFamily(useSettingsStore.getState().language);
        b.elapsed += dt;
        const halfDur = b.duration / 2;
        const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        if (b.elapsed < halfDur) {
            const progress = b.elapsed / halfDur;
            const ease = easeInOut(Math.min(progress, 1));
            b.sprite.x = b.fromX + (b.toX - b.fromX) * ease;
            b.sprite.y = b.fromY + (b.toY - b.fromY) * ease;

            if (!b.hitSpawned && progress >= 0.7 && b.atkDmg > 0) {
                b.hitSpawned = true;
                const dmgTxt = new PIXI.Text({
                    text: `-${b.atkDmg}`,
                    style: new PIXI.TextStyle({
                        fill: '#ef4444',
                        fontSize: 34,
                        fontWeight: 'bold',
                        fontFamily,
                        stroke: { color: '#000000', width: 3 },
                    }),
                });
                dmgTxt.anchor.set(1, 1);
                dmgTxt.x = b.targetHpX;
                dmgTxt.y = b.targetHpY;
                (dmgTxt as PIXI.Text & { _baseOffsetY: number })._baseOffsetY = 0;
                this.floatingTextRenderer.addText(dmgTxt, b.targetHpY);
            }
            return false;
        }

        if (b.elapsed < b.duration) {
            const progress = (b.elapsed - halfDur) / halfDur;
            const ease = easeInOut(Math.min(progress, 1));
            b.sprite.x = b.toX + (b.fromX - b.toX) * ease;
            b.sprite.y = b.toY + (b.fromY - b.toY) * ease;
            return false;
        }

        if (b.sprite.parent) b.sprite.parent.removeChild(b.sprite);
        destroyPixiChild(b.sprite);
        this.combatBounce = null;
        return true;
    }
}
