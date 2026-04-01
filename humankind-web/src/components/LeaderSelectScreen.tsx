import { useEffect, useMemo, useState } from 'react';
import { usePreGameStore } from '../game/state/preGameStore';
import {
  isLeaderPlayable,
  leaderHasPortraitSprite,
  LEADER_LIST,
  type LeaderId,
  type LeaderDefinition,
} from '../game/data/leaders';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

function leaderPortraitSrc(id: LeaderId): string | null {
  if (id === 'ramesses') return `${ASSET_BASE_URL}assets/leaders/001.png`;
  if (id === 'shihuang') return `${ASSET_BASE_URL}assets/leaders/002.png`;
  return null;
}

function LeaderPortrait({
  leaderId,
  alt,
  enabled,
  noPortraitLabel,
}: {
  leaderId: LeaderId;
  alt: string;
  enabled: boolean;
  noPortraitLabel: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = leaderPortraitSrc(leaderId);
  const showImg = leaderHasPortraitSprite(leaderId) && src && !imgFailed;

  if (!enabled) {
    /* 언어 설정과 무관하게 항상 영어 */
    return (
      <div className="leader-portrait-placeholder leader-portrait-placeholder--soon" role="img" aria-label="Coming soon">
        <span className="leader-portrait-placeholder__soon-line">Coming</span>
        <span className="leader-portrait-placeholder__soon-line">soon</span>
      </div>
    );
  }

  if (!showImg) {
    return (
      <div className="leader-portrait-placeholder leader-portrait-placeholder--q" role="img" aria-label={noPortraitLabel}>
        ?
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onError={() => setImgFailed(true)}
    />
  );
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
                <LeaderPortrait
                  leaderId={leader.id}
                  alt={t(leader.nameKey, language)}
                  enabled={leader.enabled}
                  noPortraitLabel={t('pregame.leaderPortraitPlaceholder', language)}
                />
              </button>
            );
          })}
        </div>

        <div className="leader-select-detail-col">
          <div className="leader-select-preview">
            <div className="leader-select-preview-scroll">
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

            <div className="leader-select-preview-footer">
              <button
                type="button"
                className="leader-select-play"
                onClick={handlePlay}
                disabled={chosenLeaderId == null || !isLeaderPlayable(chosenLeaderId)}
              >
                <span className="leader-select-play-label">{t('pregame.leaderPlay', language)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
