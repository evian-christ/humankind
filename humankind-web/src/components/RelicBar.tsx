import { useRelicStore } from '../game/state/relicStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

const RelicBar = () => {
    const relics = useRelicStore(state => state.relics);
    const language = useSettingsStore(state => state.language);

    if (relics.length === 0) return null;

    return (
        <div className="relics-bar">
            {relics.map((relic, i) => (
                <div key={`${relic.instanceId}-${i}`} className="relic-icon-wrapper">
                    {relic.definition.sprite ? (
                        <img src={`./assets/symbols/${relic.definition.sprite}`} alt={relic.definition.name} />
                    ) : (
                        <div className="relic-icon-wrapper-placeholder">🏺</div>
                    )}

                    {/* Tooltip */}
                    <div className="relic-icon-tooltip">
                        <div className="relic-icon-tooltip-name">{relic.definition.name}</div>
                        <div className="relic-icon-tooltip-desc">
                            {relic.definition.description}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RelicBar;
