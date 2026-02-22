import { useRelicStore } from '../game/state/relicStore';

const RelicPanel = () => {
    const { relics, panelOpen } = useRelicStore();

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
                                <div className="relic-panel-item-name" style={{ color: relic.definition.color }}>
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
