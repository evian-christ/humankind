import { useMemo, useEffect } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { SymbolType, BARBARIAN_CAMP_SPAWN_INTERVAL } from '../game/data/symbolDefinitions';
import { t } from '../i18n';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

type Props = {
    open: boolean;
    onClose: () => void;
};

const BASE_W = 1920;
const BASE_H = 1080;
const BOARD_SCALE = 0.8;
const SPRITE_PX = 32;

function computeBoardMetrics(resW: number, resH: number) {
    // PixiGameApp.ts 의 메트릭을 React에서도 동일하게 근사하기 위한 복제 로직
    const scale = Math.min(resW / BASE_W, resH / BASE_H);
    const cellWidth = 213 * scale * BOARD_SCALE;
    const cellHeight = 204 * scale * BOARD_SCALE;

    const rawSize = Math.min(cellWidth - 6, cellHeight) * 0.85;
    const spriteSize = SPRITE_PX * Math.max(1, Math.floor(rawSize / SPRITE_PX));

    return {
        scale,
        cellWidth,
        cellHeight,
        spriteSize,
    };
}

const OwnedSymbolsModal = ({ open, onClose }: Props) => {
    const playerSymbols = useGameStore((s) => s.playerSymbols);
    const resolutionWidth = useSettingsStore((s) => s.resolutionWidth);
    const resolutionHeight = useSettingsStore((s) => s.resolutionHeight);
    const language = useSettingsStore((s) => s.language);

    const metrics = useMemo(
        () => computeBoardMetrics(resolutionWidth, resolutionHeight),
        [resolutionWidth, resolutionHeight]
    );

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    const halfCellW = metrics.cellWidth / 2;
    const halfCellH = metrics.cellHeight / 2;
    const halfSpriteSize = metrics.spriteSize / 2;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10001,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.7)',
                padding: 12,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: 'min(860px, 94vw)',
                    maxHeight: '88vh',
                    background: '#0b0f14',
                    border: '1px solid #222',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #222',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                        gap: 10,
                    }}
                >
                    <div style={{ color: '#e5e7eb', fontWeight: 700, letterSpacing: '0.5px' }}>
                        Owned Symbols ({playerSymbols.length})
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: '1px solid #333',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            padding: '2px 10px',
                            fontSize: 14,
                            borderRadius: 2,
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div
                    style={{
                        padding: 12,
                        overflowY: 'auto'
                    }}
                >
                    {playerSymbols.length === 0 ? (
                        <div style={{ color: '#6b7280', textAlign: 'center', padding: 28 }}>
                            (none)
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 10,
                                justifyContent: 'flex-start',
                            }}
                        >
                            {playerSymbols.map((sym, idx) => {
                                const def = sym.definition;
                                const symName = t(`symbol.${def.id}.name`, language);

                                const showCounter =
                                    sym.effect_counter > 0 && def.type !== SymbolType.ENEMY && def.base_hp === undefined;
                                const showAtk = def.base_attack !== undefined && def.base_attack > 0;
                                const showHp = def.base_hp !== undefined && def.base_hp > 0;
                                const hpValue = sym.enemy_hp ?? def.base_hp;
                                const showCampCounter = def.id === 40;

                                return (
                                    <div
                                        key={`${sym.instanceId}-${idx}`}
                                        title={symName}
                                        style={{
                                            width: halfCellW,
                                            height: halfCellH,
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            background: 'transparent',
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {def.sprite && def.sprite !== '-' && def.sprite !== '-.png' ? (
                                            <img
                                                src={`${ASSET_BASE_URL}assets/symbols/${def.sprite}`}
                                                alt={symName}
                                                style={{
                                                    width: halfSpriteSize,
                                                    height: halfSpriteSize,
                                                    objectFit: 'contain',
                                                    imageRendering: 'pixelated',
                                                }}
                                            />
                                        ) : (
                                            <div style={{ fontSize: 18, opacity: 0.6, fontFamily: 'Mulmaru, sans-serif' }}>
                                                ?
                                            </div>
                                        )}

                                        {/* Counter (effect_counter) */}
                                        {showCounter && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    right: 2,
                                                    bottom: 4,
                                                    fontSize: 14,
                                                    fontFamily: 'Mulmaru, sans-serif',
                                                    lineHeight: 1,
                                                    color: '#8b7355',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {sym.effect_counter}
                                            </div>
                                        )}

                                        {/* Attack (⚔ + base_attack) */}
                                        {showAtk && (
                                            <>
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        left: 8,
                                                        bottom: 6,
                                                        fontSize: 18,
                                                        fontFamily: 'Mulmaru, sans-serif',
                                                        color: '#ff8c42',
                                                        opacity: 0.55,
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    ⚔
                                                </div>
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        left: 28,
                                                        bottom: 6,
                                                        fontSize: 14,
                                                        fontFamily: 'Mulmaru, sans-serif',
                                                        lineHeight: 1,
                                                        color: '#ffffff',
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    {def.base_attack}
                                                </div>
                                            </>
                                        )}

                                        {/* HP (♥ + enemy_hp) */}
                                        {showHp && (
                                            <>
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        right: 6,
                                                        bottom: 6,
                                                        fontSize: 18,
                                                        fontFamily: 'Mulmaru, sans-serif',
                                                        color: '#4ade80',
                                                        opacity: 0.55,
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    ♥
                                                </div>
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        right: 24,
                                                        bottom: 6,
                                                        fontSize: 14,
                                                        fontFamily: 'Mulmaru, sans-serif',
                                                        lineHeight: 1,
                                                        color: '#ffffff',
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    {hpValue}
                                                </div>
                                            </>
                                        )}

                                        {/* Barbarian Camp: spawn interval - effect_counter */}
                                        {showCampCounter && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: 28,
                                                    bottom: 6,
                                                    fontSize: 14,
                                                    fontFamily: 'Mulmaru, sans-serif',
                                                    lineHeight: 1,
                                                    color: '#8b7355',
                                                    fontWeight: 800,
                                                }}
                                            >
                                                {BARBARIAN_CAMP_SPAWN_INTERVAL - sym.effect_counter}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OwnedSymbolsModal;

