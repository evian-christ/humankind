import { useRelicStore } from '../game/state/relicStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

/** 유물 ID별 카운터 표시 설정 */
const RELIC_COUNTER_CONFIG: Record<number, { max: number; showProgress: boolean }> = {
    3: { max: 5, showProgress: true },   // 우르 전차 바퀴
    9: { max: 5, showProgress: true },   // 나일 강 흑니
};

const RelicBar = () => {
    const relics = useRelicStore(state => state.relics);
    const language = useSettingsStore(state => state.language);

    if (relics.length === 0) return null;

    return (
        <div className="relics-bar">
            {relics.map((relic, i) => {
                const counterCfg = RELIC_COUNTER_CONFIG[relic.definition.id];
                const progressPct = counterCfg
                    ? Math.min(100, (relic.effect_counter / counterCfg.max) * 100)
                    : null;

                const relicName = t(`relic.${relic.definition.id}.name`, language);
                const relicDesc = t(`relic.${relic.definition.id}.desc`, language);

                return (
                    <div key={`${relic.instanceId}-${i}`} className="relic-icon-wrapper">
                        {relic.definition.sprite && relic.definition.sprite !== '-' && relic.definition.sprite !== '-.png' ? (
                            <img src={`/assets/relics/${relic.definition.sprite}`} alt={relicName} />
                        ) : (
                            <div className="relic-icon-wrapper-placeholder">🏺</div>
                        )}

                        {/* 카운터 진행도 */}
                        {counterCfg?.showProgress && progressPct !== null && (
                            <div className="relic-progress-bar">
                                <div
                                    className="relic-progress-fill"
                                    style={{ width: `${progressPct}%` }}
                                />
                                <span className="relic-progress-text">
                                    {relic.effect_counter}/{counterCfg.max}
                                </span>
                            </div>
                        )}

                        {/* 보너스 스택 표시 (바빌로니아 지도 등) */}
                        {relic.bonus_stacks > 0 && (
                            <div className="relic-bonus-badge">+{relic.bonus_stacks}</div>
                        )}

                        {/* Tooltip */}
                        <div className="relic-icon-tooltip">
                            <div className="relic-icon-tooltip-name">{relicName}</div>
                            <div className="relic-icon-tooltip-desc">
                                {relicDesc}
                            </div>
                            {counterCfg && (
                                <div className="relic-icon-tooltip-counter">
                                    {relic.effect_counter} / {counterCfg.max}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default RelicBar;
