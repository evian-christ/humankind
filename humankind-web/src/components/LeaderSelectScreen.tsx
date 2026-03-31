import { useEffect, useMemo, useState } from 'react';
import { usePreGameStore } from '../game/state/preGameStore';
import { isLeaderPlayable, LEADER_LIST, type LeaderId, type LeaderDefinition } from '../game/data/leaders';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

const ASSET_BASE_URL = import.meta.env.BASE_URL;
const LEADER_PORTRAIT_FALLBACK = `${ASSET_BASE_URL}assets/leaders/000.png`;

function leaderPortraitUrl(id: LeaderId): string {
  // leaders 폴더는 현재 숫자 파일명(000, 001, ...) 기반
  if (id === 'ramesses') return `${ASSET_BASE_URL}assets/leaders/001.png`;
  return LEADER_PORTRAIT_FALLBACK;
}

export default function LeaderSelectScreen() {
  const language = useSettingsStore((s) => s.language);
  const startWithLeader = usePreGameStore((s) => s.selectLeader);

  const defaultLeaderId = useMemo(
    () => LEADER_LIST.find((l) => l.enabled)?.id ?? null,
    [],
  );
  const [chosenLeaderId, setChosenLeaderId] = useState<LeaderId | null>(defaultLeaderId);

  useEffect(() => {
    if (defaultLeaderId != null) setChosenLeaderId(defaultLeaderId);
  }, [defaultLeaderId]);

  const getLeaderById = (id: LeaderId | null): LeaderDefinition | null => {
    if (id == null) return null;
    return LEADER_LIST.find((l) => l.id === id) ?? null;
  };

  const previewLeader = getLeaderById(chosenLeaderId);

  const handlePlay = () => {
    if (chosenLeaderId == null || !isLeaderPlayable(chosenLeaderId)) return;
    startWithLeader(chosenLeaderId);
  };

  return (
    <div className="leader-select-root">
      <header className="leader-select-header">
        <h1 className="pregame-title leader-select-title">{t('pregame.leaderTitle', language)}</h1>
      </header>

      <div className="leader-select-body">
        <div className="leader-select-portrait-grid" aria-label={t('pregame.leaderTitle', language)}>
          {LEADER_LIST.map((leader) => {
            const selected = leader.enabled && chosenLeaderId === leader.id;
            return (
              <button
                key={leader.id}
                type="button"
                disabled={!leader.enabled}
                aria-pressed={selected}
                aria-disabled={!leader.enabled}
                className={[
                  'leader-portrait-btn',
                  selected ? 'leader-portrait-btn--selected' : '',
                  !leader.enabled ? 'leader-portrait-btn--locked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  if (!leader.enabled) return;
                  setChosenLeaderId(leader.id);
                }}
              >
                <img
                  src={leader.enabled ? leaderPortraitUrl(leader.id) : LEADER_PORTRAIT_FALLBACK}
                  alt={t(leader.nameKey, language)}
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.src = LEADER_PORTRAIT_FALLBACK;
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="leader-select-detail-col">
          <div className="leader-select-preview">
            <div className="leader-preview-name">
              {previewLeader ? t(previewLeader.nameKey, language) : '-'}
            </div>

            {previewLeader && (
              <div className="leader-preview-effects">
                <div className="leader-preview-effect">
                  <div className="leader-preview-effect-title">
                    {t(previewLeader.mainEffectNameKey, language)}
                  </div>
                  <div className="leader-preview-effect-desc">
                    {t(previewLeader.mainEffectDescKey, language)}
                  </div>
                </div>

                <div className="leader-preview-effect">
                  <div className="leader-preview-effect-title">
                    {t(previewLeader.subEffectNameKey, language)}
                  </div>
                  <div className="leader-preview-effect-desc">
                    {t(previewLeader.subEffectDescKey, language)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="leader-select-detail-footer">
            <button
              type="button"
              className="leader-select-play"
              onClick={handlePlay}
              disabled={chosenLeaderId == null || !isLeaderPlayable(chosenLeaderId)}
            >
              {t('pregame.leaderPlay', language)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
