import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore, OBLIVION_FURNACE_PENDING } from '../game/state/gameStore';
import { TERRITORIAL_REORG_UPGRADE_ID } from '../game/data/knowledgeUpgrades';
import { EDICT_SYMBOL_ID, getSymbolColorHex, SymbolType, type SymbolDefinition } from '../game/data/symbolDefinitions';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';
import { EffectText } from './EffectText';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

const SYMBOL_TYPE_ERA_KEY: Record<number, string> = {
    [SymbolType.RELIGION]: 'era.special',
    [SymbolType.NORMAL]: 'era.normal',
    [SymbolType.ANCIENT]: 'era.ancient',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
    [SymbolType.UNIT]: 'era.unit',
    [SymbolType.ENEMY]: 'era.enemy',
    [SymbolType.DISASTER]: 'era.disaster',
};

const CELL_PX = Math.round(70 * 1.5);
const IMG_PX = Math.round(48 * 1.5);
const TOOLTIP_W = 280;
const TOOLTIP_H = 180;
const TOOLTIP_GAP = 4;

const DestroySelection = () => {
    const {
        phase,
        playerSymbols,
        finishDestroySelection,
        confirmDestroySymbols,
        pendingDestroySource,
        destroySelectionMaxSymbols,
    } = useGameStore();
    const language = useSettingsStore((s) => s.language);
    const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);
    const [hoverTip, setHoverTip] = useState<{
        instanceId: string;
        def: SymbolDefinition;
        left: number;
        top: number;
    } | null>(null);

    useRegisterBoardTooltipBlock('destroy-selection', phase === 'destroy_selection');

    const updateTipPos = useCallback((e: React.MouseEvent<HTMLDivElement>, instanceId: string, def: SymbolDefinition) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const placeLeft = rect.right + TOOLTIP_GAP + TOOLTIP_W > window.innerWidth;
        setHoverTip({
            instanceId,
            def,
            left: placeLeft ? rect.left - TOOLTIP_GAP - TOOLTIP_W : rect.right + TOOLTIP_GAP,
            top: Math.max(0, Math.min(rect.top + (rect.height - TOOLTIP_H) / 2, window.innerHeight - TOOLTIP_H - TOOLTIP_GAP)),
        });
    }, []);

    const clearTip = useCallback(() => setHoverTip(null), []);

    if (phase !== 'destroy_selection') return null;

    const toggleSymbol = (id: string) => {
        if (selectedInstanceIds.includes(id)) {
            setSelectedInstanceIds(selectedInstanceIds.filter(x => x !== id));
        } else if (selectedInstanceIds.length < (destroySelectionMaxSymbols ?? 3)) {
            setSelectedInstanceIds([...selectedInstanceIds, id]);
        }
    };

    const handleConfirm = () => {
        confirmDestroySymbols(selectedInstanceIds);
        setSelectedInstanceIds([]);
    };

    const handleSkip = () => {
        finishDestroySelection();
        setSelectedInstanceIds([]);
    };

    const isTerritory = pendingDestroySource === TERRITORIAL_REORG_UPGRADE_ID;
    const isEdict = pendingDestroySource === EDICT_SYMBOL_ID;
    const isOblivion = pendingDestroySource === OBLIVION_FURNACE_PENDING;
    const titleKey = isOblivion
        ? 'destroySelection.oblivionTitle'
        : isEdict
          ? 'destroySelection.edictTitle'
          : isTerritory
            ? 'destroySelection.territoryTitle'
            : 'destroySelection.riteTitle';
    const n = selectedInstanceIds.length;
    const confirmLabel = isOblivion
        ? t('destroySelection.oblivionConfirm', language)
        : isEdict && n === 1
          ? t('destroySelection.edictConfirm', language)
          : t('destroySelection.confirmSacrifice', language)
                .replace('{n}', String(n))
                .replace('{gold}', String(n * 10));

    return (
        <div className="selection-overlay">
            {hoverTip && createPortal(
                <div
                    className="symbol-tooltip"
                    style={{
                        position: 'fixed',
                        left: `${hoverTip.left}px`,
                        top: `${hoverTip.top}px`,
                        zIndex: 10052,
                        pointerEvents: 'none',
                    }}
                >
                    <div className="symbol-tooltip-name">{t(`symbol.${hoverTip.def.id}.name`, language)}</div>
                    <div
                        className="symbol-tooltip-rarity"
                        style={{
                            color: getSymbolColorHex(hoverTip.def.type),
                            fontWeight: 'bold',
                            fontSize: '18px',
                            letterSpacing: '2px',
                            textShadow: `0 0 10px ${getSymbolColorHex(hoverTip.def.type)}80`,
                        }}
                    >
                        {t(SYMBOL_TYPE_ERA_KEY[hoverTip.def.type] ?? 'era.ancient', language)}
                    </div>
                    <div className="symbol-tooltip-desc">
                        {t(`symbol.${hoverTip.def.id}.desc`, language).split('\n').map((line, j) => (
                            <div key={j} className="symbol-tooltip-desc-line"><EffectText text={line} /></div>
                        ))}
                    </div>
                </div>,
                document.body,
            )}
            <div className="selection-panel-wrapper">
                <div className="selection-panel" style={{ width: '80vw', minWidth: '400px', maxWidth: '800px', padding: '30px', alignItems: 'center' }}>
                    <div className="selection-title">{t(titleKey, language)}</div>
                    <div style={{ color: '#aaa', fontSize: '18px', textAlign: 'center', marginBottom: '20px', fontFamily: 'Mulmaru, sans-serif' }}>
                        {t('destroySelection.shortDesc', language)}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', maxHeight: '50vh', overflowY: 'auto', overflowX: 'visible', marginBottom: '30px', padding: '10px' }}>
                        {playerSymbols.map((sym, i) => (
                            <div
                                key={`${sym.instanceId}-${i}`}
                                role="button"
                                tabIndex={0}
                                style={{
                                    width: `${CELL_PX}px`,
                                    height: `${CELL_PX}px`,
                                    border: selectedInstanceIds.includes(sym.instanceId) ? '3px solid #ef4444' : '2px solid #555',
                                    borderRadius: '8px',
                                    background: selectedInstanceIds.includes(sym.instanceId) ? 'rgba(239, 68, 68, 0.2)' : 'rgba(30, 30, 30, 0.8)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.1s ease',
                                    position: 'relative',
                                    zIndex: hoverTip?.instanceId === sym.instanceId ? 10051 : 'auto',
                                }}
                                onClick={() => toggleSymbol(sym.instanceId)}
                                onMouseEnter={(e) => updateTipPos(e, sym.instanceId, sym.definition)}
                                onMouseLeave={clearTip}
                            >
                                {sym.definition.sprite && sym.definition.sprite !== '-' && sym.definition.sprite !== '-.png' ? (
                                    <img
                                        src={`${ASSET_BASE_URL}assets/symbols/${sym.definition.sprite}`}
                                        alt={t(`symbol.${sym.definition.id}.name`, language)}
                                        style={{ width: `${IMG_PX}px`, height: `${IMG_PX}px`, objectFit: 'contain', imageRendering: 'pixelated' }}
                                        draggable={false}
                                    />
                                ) : (
                                    <span style={{ fontSize: '24px', opacity: 0.5 }}>?</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                        <button className="selection-skip-btn" onClick={handleSkip}>건너뛰기</button>
                        <button className="selection-reroll-btn" style={{ color: selectedInstanceIds.length === 0 ? '#aaa' : '#ef4444', borderColor: selectedInstanceIds.length === 0 ? '#555' : '#ef4444' }} onClick={handleConfirm} disabled={selectedInstanceIds.length === 0}>
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DestroySelection;
