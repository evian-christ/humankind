import { useRelicStore } from '../game/state/relicStore';
import { getSymbolColorHex, Era } from '../game/data/symbolDefinitions';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

const ERA_KEYS: Record<Era, string> = {
    [Era.RELIGION]: 'religion',
    [Era.ANCIENT]: 'ancient',
    [Era.CLASSICAL]: 'classical',
    [Era.MEDIEVAL]: 'medieval',
    [Era.INDUSTRIAL]: 'industrial',
    [Era.MODERN]: 'modern',
};

const RelicPanel = () => {
    const { relics, panelOpen } = useRelicStore();
    const { language } = useSettingsStore();

    if (!panelOpen) return null;

    return (
        <div className="relic-panel">
            <div className="relic-panel-header">
                <span className="relic-panel-title">유물</span>
                <span className="relic-panel-count">{relics.length}개</span>
            </div>
            <div className="relic-panel-list">
                {relics.length === 0 ? (
                    <div className="relic-panel-empty">보유한 유물이 없습니다</div>
                ) : (
                    relics.map((relic) => (
                        <div key={relic.instanceId} className="relic-panel-item">
                            <span className="relic-panel-item-icon">{relic.definition.sprite}</span>
                            <div className="relic-panel-item-info">
                                <div className="relic-panel-item-name">
                                    <span
                                        className="databrowser-era-badge"
                                        style={{
                                            background: getSymbolColorHex(relic.definition.era),
                                            color: relic.definition.era === 0 ? '#000' : '#fff',
                                            marginRight: '6px',
                                            padding: '2px 4px',
                                            borderRadius: '4px',
                                            fontSize: '10px'
                                        }}
                                    >
                                        {t(`era.${ERA_KEYS[relic.definition.era]}`, language)}
                                    </span>
                                    {relic.definition.name}
                                </div>
                                <div className="relic-panel-item-desc">{relic.definition.description}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RelicPanel;
