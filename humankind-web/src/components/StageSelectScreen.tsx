import { usePreGameStore } from '../game/state/preGameStore';
import { STAGE_LIST } from '../game/data/stages';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

export default function StageSelectScreen() {
  const language = useSettingsStore((s) => s.language);
  const selectStage = usePreGameStore((s) => s.selectStage);

  return (
    <div className="pregame-overlay pregame-overlay--select">
      <div className="pregame-panel">
        <h1 className="pregame-title">{t('pregame.stageTitle', language)}</h1>
        <div className="pregame-cards">
          {STAGE_LIST.slice().sort((a, b) => a.id - b.id).map((stage) => (
            <button
              key={stage.id}
              type="button"
              className="pregame-card"
              disabled={stage.id !== 1}
              onClick={() => {
                if (stage.id === 1) selectStage(stage.id);
              }}
            >
              <span className="pregame-card-name">{t(stage.nameKey, language)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
