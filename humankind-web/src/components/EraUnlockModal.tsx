import { useGameStore } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

const EraUnlockModal = () => {
    const { phase, resolveEraUnlock } = useGameStore();
    const language = useSettingsStore((s) => s.language);

    if (phase !== 'era_unlock') return null;

    return (
        <div className="selection-overlay">
            <div className="selection-panel">
                <div className="selection-title">{t('eraUnlock.title', language)}</div>
                <div className="selection-subtitle">{t('eraUnlock.desc', language)}</div>
                <div className="selection-cards">
                    <button
                        className="selection-card era-unlock-card"
                        onClick={() => resolveEraUnlock('religion')}
                    >
                        <div className="era-unlock-icon">✝</div>
                        <div className="selection-card-name">{t('eraUnlock.religion', language)}</div>
                        <div className="selection-card-rarity" style={{ color: '#ffffff' }}>
                            ── 종교 ──
                        </div>
                        <div className="selection-card-desc">
                            <div className="selection-card-desc-line">
                                {t('eraUnlock.religion_desc', language)}
                            </div>
                        </div>
                    </button>

                    <button
                        className="selection-card era-unlock-card"
                        onClick={() => resolveEraUnlock('knowledge')}
                    >
                        <div className="era-unlock-icon">📜</div>
                        <div className="selection-card-name">{t('eraUnlock.knowledge', language)}</div>
                        <div className="selection-card-rarity" style={{ color: '#22c55e' }}>
                            ── 영구 ──
                        </div>
                        <div className="selection-card-desc">
                            <div className="selection-card-desc-line">
                                {t('eraUnlock.knowledge_desc', language)}
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EraUnlockModal;
