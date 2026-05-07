import { usePreGameStore } from '../game/state/preGameStore';
import { isStageUnlocked, STAGE_LIST } from '../game/data/stages';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

export default function StageSelectScreen() {
  const language = useSettingsStore((s) => s.language);
  const selectStage = usePreGameStore((s) => s.selectStage);
  const returnToIntro = usePreGameStore((s) => s.returnToIntro);

  return (
    <div className="stage-select-root">
      <button
        type="button"
        className="main-menu-button stage-select-back"
        onClick={returnToIntro}
        aria-label={t('game.back', language)}
      >
        ←
      </button>

      <div className="stage-select-panel">
        <div className="stage-select-header">
          <h1 className="pregame-title stage-select-title">{t('pregame.stageTitle', language)}</h1>
        </div>
        <div className="stage-select-list">
          {STAGE_LIST.slice()
            .sort((a, b) => a.id - b.id)
            .map((stage) => {
              const unlocked = isStageUnlocked(stage.id);
              return (
                <button
                  key={stage.id}
                  type="button"
                  className="main-menu-button stage-select-card"
                  disabled={!unlocked}
                  onClick={() => {
                    if (unlocked) selectStage(stage.id);
                  }}
                >
                  <span className="stage-select-card-label">{t(stage.nameKey, language)}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
