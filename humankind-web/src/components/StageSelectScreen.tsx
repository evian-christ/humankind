import { usePreGameStore } from '../game/state/preGameStore';
import { STAGE_LIST } from '../game/data/stages';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

export default function StageSelectScreen() {
  const language = useSettingsStore((s) => s.language);
  const selectStage = usePreGameStore((s) => s.selectStage);

  return (
    <div className="stage-select-root">
      <div className="stage-select-panel">
        <div className="stage-select-header">
          <h1 className="pregame-title stage-select-title">{t('pregame.stageTitle', language)}</h1>
        </div>
        <div className="stage-select-list">
          {STAGE_LIST.slice()
            .sort((a, b) => a.id - b.id)
            .map((stage) => (
              <button
                key={stage.id}
                type="button"
                className="pregame-card stage-select-card"
                disabled={stage.id < 1 || stage.id > 4}
                onClick={() => {
                  if (stage.id >= 1 && stage.id <= 4) selectStage(stage.id);
                }}
              >
                <span className="stage-select-card-label">{t(stage.nameKey, language)}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
