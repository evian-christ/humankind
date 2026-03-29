import { useRelicStore } from '../game/state/relicStore';
import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';
import { EffectText } from './EffectText';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

/** 우하단 숫자만 표시 (심볼 카운터와 동일한 역할) */
function getRelicCornerCounterValue(relic: { definition: { id: number }; effect_counter: number; bonus_stacks: number }): string | null {
    const id = relic.definition.id;
    if (id === 3 || id === 9) return String(relic.effect_counter);
    if (id === 4) return String(relic.bonus_stacks);
    return null;
}

const CLICKABLE_RELIC_IDS = new Set([4, 13, 15]);

const RelicBar = () => {
    const relics = useRelicStore(state => state.relics);
    const language = useSettingsStore(state => state.language);

    if (relics.length === 0) return null;

    return (
        <div className="relics-bar">
            {relics.map((relic, i) => {
                const cornerCounter = getRelicCornerCounterValue(relic);

                const relicName = t(`relic.${relic.definition.id}.name`, language);
                const relicDesc = t(`relic.${relic.definition.id}.desc`, language);

                const clickable = CLICKABLE_RELIC_IDS.has(relic.definition.id);

                return (
                    <div
                        key={`${relic.instanceId}-${i}`}
                        className={`relic-icon-wrapper${clickable ? ' relic-icon-wrapper--clickable' : ''}`}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        onClick={clickable ? () => useGameStore.getState().activateClickableRelic(relic.instanceId) : undefined}
                        onKeyDown={clickable ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                useGameStore.getState().activateClickableRelic(relic.instanceId);
                            }
                        } : undefined}
                    >
                        {relic.definition.sprite && relic.definition.sprite !== '-' && relic.definition.sprite !== '-.png' ? (
                            <img src={`${ASSET_BASE_URL}assets/relics/${relic.definition.sprite}`} alt={relicName} />
                        ) : (
                            <div className="relic-icon-wrapper-placeholder">🏺</div>
                        )}

                        {cornerCounter !== null && (
                            <span className="relic-corner-counter" aria-hidden>
                                {cornerCounter}
                            </span>
                        )}

                        {/* 보너스 스택: 조몬(4)은 우하단 숫자로만 표시, 바빌 등은 +배지 */}
                        {relic.bonus_stacks > 0 && relic.definition.id !== 4 && (
                            <div className="relic-bonus-badge">+{relic.bonus_stacks}</div>
                        )}

                        {/* Tooltip */}
                        <div className="relic-icon-tooltip">
                            <div className="relic-icon-tooltip-name">{relicName}</div>
                            <div className="relic-icon-tooltip-desc">
                                {relicDesc.split('\n').map((line, i) => (
                                    <div key={i} className="relic-icon-tooltip-desc-line"><EffectText text={line} /></div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default RelicBar;
