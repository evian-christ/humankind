import { useMemo, useState } from 'react';
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
  const returnToStageSelect = usePreGameStore((s) => s.returnToStageSelect);

  const defaultLeaderId = useMemo(
    () => LEADER_LIST.find((l) => l.enabled)?.id ?? null,
    [],
  );
  const [chosenLeaderId, setChosenLeaderId] = useState<LeaderId | null>(defaultLeaderId);

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
      <button
        type="button"
        className="main-menu-button leader-select-back"
        onClick={returnToStageSelect}
      >
        {t('game.back', language)}
      </button>

      <main className="leader-select-shell" aria-label={t('pregame.leaderTitle', language)}>
        <h1 className="main-menu-title leader-select-title">
          <span className="main-menu-title-main leader-select-title-main">
            {t('pregame.leaderTitle', language)}
          </span>
        </h1>

        <div className="leader-select-content">
          <section className="leader-select-roster" aria-label={t('pregame.leaderTitle', language)}>
            {LEADER_LIST.map((leader) => {
              const selected = leader.enabled && chosenLeaderId === leader.id;
              return (
                <button
                  key={leader.id}
                  type="button"
                  disabled={!leader.enabled}
                  aria-pressed={selected}
                  aria-disabled={!leader.enabled}
                  aria-label={t(leader.nameKey, language)}
                  className={[
                    'main-menu-button',
                    'leader-card',
                    selected ? 'leader-card--selected' : '',
                    !leader.enabled ? 'leader-card--locked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    if (!leader.enabled) return;
                    setChosenLeaderId(leader.id);
                  }}
                >
                  <span className="leader-card-portrait" aria-hidden="true">
                    <LeaderPortrait
                      leaderId={leader.id}
                      alt={t(leader.nameKey, language)}
                      enabled={leader.enabled}
                      noPortraitLabel={t('pregame.leaderPortraitPlaceholder', language)}
                    />
                  </span>
                </button>
              );
            })}
          </section>

          {previewLeader ? (
            <section className="leader-select-profile" aria-live="polite">
              <div className="leader-profile-hero">
                <div className="leader-profile-portrait" aria-hidden="true">
                  <LeaderPortrait
                    leaderId={previewLeader.id}
                    alt={t(previewLeader.nameKey, language)}
                    enabled={previewLeader.enabled}
                    noPortraitLabel={t('pregame.leaderPortraitPlaceholder', language)}
                  />
                </div>
                <div className="leader-profile-heading">
                  <div className="leader-profile-name">{t(previewLeader.nameKey, language)}</div>
                  {previewLeader.nameSubtitleKey ? (
                    <div className="leader-profile-subtitle">{t(previewLeader.nameSubtitleKey, language)}</div>
                  ) : null}
                </div>
              </div>

              <div className="leader-profile-effects">
                <div className="leader-profile-effect">
                  <div className="leader-profile-effect-title">
                    {t(previewLeader.mainEffectNameKey, language)}
                  </div>
                  <div className="leader-profile-effect-desc">
                    {t(previewLeader.mainEffectDescKey, language)}
                  </div>
                </div>

                <div className="leader-profile-effect">
                  <div className="leader-profile-effect-title">
                    {t(previewLeader.subEffectNameKey, language)}
                  </div>
                  <div className="leader-profile-effect-desc">
                    {t(previewLeader.subEffectDescKey, language)}
                  </div>
                </div>
              </div>

              <div className="leader-select-actions">
                <button
                  type="button"
                  className="main-menu-button leader-select-play"
                  onClick={handlePlay}
                  disabled={chosenLeaderId == null || !isLeaderPlayable(chosenLeaderId)}
                >
                  {t('pregame.leaderPlay', language)}
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
