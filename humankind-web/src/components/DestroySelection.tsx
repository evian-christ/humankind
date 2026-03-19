import { useState } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

const DestroySelection = () => {
    const { phase, playerSymbols, finishDestroySelection, confirmDestroySymbols } = useGameStore();
    const language = useSettingsStore((s) => s.language);
    const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);

    if (phase !== 'destroy_selection') return null;

    const toggleSymbol = (id: string) => {
        if (selectedInstanceIds.includes(id)) {
            setSelectedInstanceIds(selectedInstanceIds.filter(x => x !== id));
        } else if (selectedInstanceIds.length < 3) {
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

    return (
        <div className="selection-overlay">
            <div className="selection-panel-wrapper">
                <div className="selection-panel" style={{ width: '80vw', minWidth: '400px', maxWidth: '800px', padding: '30px', alignItems: 'center' }}>
                    <div className="selection-title">희생 제의 (파괴할 심볼 선택)</div>
                    <div style={{ color: '#aaa', fontSize: '18px', textAlign: 'center', marginBottom: '20px', fontFamily: 'Mulmaru, sans-serif' }}>
                        보유 중인 심볼을 최대 3개까지 파괴할 수 있습니다.<br />
                        선택 후 버튼을 눌러 확정하세요. (파괴한 심볼 하나당 +100 골드)
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxHeight: '50vh', overflowY: 'auto', marginBottom: '30px', padding: '10px' }}>
                        {playerSymbols.map((sym, i) => (
                            <div key={`${sym.instanceId}-${i}`} style={{
                                width: '70px', height: '70px',
                                border: selectedInstanceIds.includes(sym.instanceId) ? '3px solid #ef4444' : '2px solid #555',
                                borderRadius: '8px',
                                background: selectedInstanceIds.includes(sym.instanceId) ? 'rgba(239, 68, 68, 0.2)' : 'rgba(30, 30, 30, 0.8)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.1s ease', position: 'relative'
                            }} onClick={() => toggleSymbol(sym.instanceId)}>
                                {/* render sprite */}
                                {sym.definition.sprite && sym.definition.sprite !== '-' && sym.definition.sprite !== '-.png' ? (
                                    <img src={`${ASSET_BASE_URL}assets/symbols/${sym.definition.sprite}`} alt={t(`symbol.${sym.definition.id}.name`, language)} style={{ width: '48px', height: '48px', objectFit: 'contain', imageRendering: 'pixelated' }} />
                                ) : (
                                    <span style={{ fontSize: '24px', opacity: 0.5 }}>?</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                        <button className="selection-skip-btn" onClick={handleSkip}>건너뛰기</button>
                        <button className="selection-reroll-btn" style={{ color: selectedInstanceIds.length === 0 ? '#aaa' : '#ef4444', borderColor: selectedInstanceIds.length === 0 ? '#555' : '#ef4444' }} onClick={handleConfirm} disabled={selectedInstanceIds.length === 0}>
                            {selectedInstanceIds.length}개 파괴 및 {selectedInstanceIds.length * 100} 골드 획득
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DestroySelection;
