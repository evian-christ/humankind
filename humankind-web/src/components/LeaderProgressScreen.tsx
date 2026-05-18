import { useState } from 'react';
import { usePreGameStore } from '../game/state/preGameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import {
  LEADERS,
  leaderHasPortraitSprite,
  LEADER_LIST,
  type LeaderId,
} from '../game/data/leaders';
import { t } from '../i18n';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

type LeaderPortraitVariant = 'full' | 'mini';

function leaderPortraitSrc(id: LeaderId, variant: LeaderPortraitVariant = 'full'): string | null {
  if (id === 'ramesses') return `${ASSET_BASE_URL}assets/leaders/001_${variant}.png`;
  if (id === 'shihuang') return `${ASSET_BASE_URL}assets/leaders/002_${variant}.png`;
  return null;
}

type LeaderUnlock = {
  level: number;
  nameKey?: string;
  descKey?: string;
  unlockedByDefault?: boolean;
};

const MAX_LEADER_LEVEL = 10;
const DEFAULT_LEADER_LEVEL = 1;
const DEFAULT_LEADER_XP = 0;
const DEFAULT_LEADER_XP_REQUIRED = 100;

const LEADER_UNLOCKS: Partial<Record<LeaderId, LeaderUnlock[]>> = {
  ramesses: [
    {
      level: 1,
      nameKey: 'leader.ramesses.main.name',
      descKey: 'leader.ramesses.main.desc',
      unlockedByDefault: true,
    },
    {
      level: 3,
      nameKey: 'leader.ramesses.sub.name',
      descKey: 'leader.ramesses.sub.desc',
    },
  ],
};

function getLeaderUnlockForLevel(leaderId: LeaderId, level: number): LeaderUnlock {
  return LEADER_UNLOCKS[leaderId]?.find((unlock) => unlock.level === level) ?? { level };
}

function LeaderProgressPortrait({
  leaderId,
  alt,
  noPortraitLabel,
  variant = 'full',
}: {
  leaderId: LeaderId;
  alt: string;
  noPortraitLabel: string;
  variant?: LeaderPortraitVariant;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = leaderPortraitSrc(leaderId, variant);
  const showImg = leaderHasPortraitSprite(leaderId) && src && !imgFailed;

  if (!showImg) {
    return (
      <span className="leader-progress-placeholder" role="img" aria-label={noPortraitLabel}>
        ?
      </span>
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

export default function LeaderProgressScreen() {
  const language = useSettingsStore((s) => s.language);
  const returnToIntro = usePreGameStore((s) => s.returnToIntro);
  const [selectedLeaderId, setSelectedLeaderId] = useState<LeaderId | null>(null);

  const selectedLeader = selectedLeaderId ? LEADERS[selectedLeaderId] : null;
  const selectedLeaderName = selectedLeader ? t(selectedLeader.nameKey, language) : '';
  const currentLevel = DEFAULT_LEADER_LEVEL;
  const currentXp = DEFAULT_LEADER_XP;
  const xpRequired = DEFAULT_LEADER_XP_REQUIRED;
  const xpRatio = Math.min(1, currentXp / xpRequired);

  const handleBack = () => {
    if (selectedLeaderId) {
      setSelectedLeaderId(null);
      return;
    }
    returnToIntro();
  };

  return (
    <div className="leader-progress-root">
      <button
        type="button"
        className="leader-select-back"
        onClick={handleBack}
        aria-label={t('game.back', language)}
      >
        <span aria-hidden="true">{'<'}</span>
      </button>

      {selectedLeader ? (
        <main className="leader-progress-shell leader-detail-shell" aria-label={selectedLeaderName}>
          <section className="leader-detail-hero">
            <div className="leader-detail-status">
              <div className="leader-detail-portrait" aria-hidden="true">
                <span className="leader-progress-portrait">
                  <LeaderProgressPortrait
                    leaderId={selectedLeader.id}
                    alt={selectedLeaderName}
                    noPortraitLabel={t('pregame.leaderPortraitPlaceholder', language)}
                    variant="mini"
                  />
                </span>
                <span className="leader-progress-card-shade" aria-hidden="true" />
              </div>
              <div className="leader-detail-topline">
                <div className="leader-detail-heading">
                  <h1 className="main-menu-title leader-detail-title">
                    <span className="main-menu-title-main leader-detail-title-main">
                      {selectedLeaderName}
                    </span>
                  </h1>
                </div>
                <div className="leader-detail-level">
                  {t('leaderProgress.currentLevel', language).replace('{level}', String(currentLevel))}
                </div>
              </div>
              <div className="leader-detail-xp">
                <div className="leader-detail-xp-head">
                  <span>{t('leaderProgress.xp', language)}</span>
                  <span>{currentXp} / {xpRequired}</span>
                </div>
                <div className="leader-detail-xpbar" aria-hidden="true">
                  <span style={{ width: `${xpRatio * 100}%` }} />
                </div>
              </div>
            </div>
          </section>

          <section className="leader-detail-unlocks-panel" aria-label={t('leaderProgress.unlocksLabel', language)}>
            <div className="leader-detail-unlocks-scroll">
              <div className="leader-detail-unlocks">
                {Array.from({ length: MAX_LEADER_LEVEL }, (_, index) => {
                  const level = index + 1;
                  const unlock = getLeaderUnlockForLevel(selectedLeader.id, level);
                  const unlockNameKey = unlock.nameKey;
                  const unlockDescKey = unlock.descKey;
                  const hasUnlock = unlockNameKey != null && unlockDescKey != null;
                  const unlocked = unlock.unlockedByDefault || currentLevel >= level;
                  return (
                    <article
                      key={level}
                      className={[
                        'leader-unlock-step',
                        hasUnlock ? 'leader-unlock-step--filled' : '',
                        unlocked ? 'leader-unlock-step--unlocked' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="leader-unlock-rail">
                        <div className="leader-unlock-level">
                          {t('leaderProgress.levelShort', language).replace('{level}', String(level))}
                        </div>
                        {hasUnlock ? (
                          <span
                            className="leader-unlock-point"
                            aria-label={unlocked ? t('leaderProgress.unlocked', language) : undefined}
                          >
                            {unlocked ? '\u2713' : ''}
                          </span>
                        ) : null}
                      </div>
                      {hasUnlock ? (
                        <div className="leader-unlock-body">
                          <div className="leader-unlock-name">
                            {t(unlockNameKey!, language)}
                          </div>
                          <div className="leader-unlock-desc">
                            {t(unlockDescKey!, language)}
                          </div>
                        </div>
                      ) : (
                        <div className="leader-unlock-body leader-unlock-body--empty" aria-hidden="true" />
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="leader-progress-shell" aria-label={t('leaderProgress.title', language)}>
          <h1 className="main-menu-title leader-progress-title">
            <span className="main-menu-title-main leader-progress-title-main">
              {t('leaderProgress.title', language)}
            </span>
          </h1>

          <section className="leader-progress-grid" aria-label={t('leaderProgress.rosterLabel', language)}>
            {LEADER_LIST.map((leader) => {
              const enabled = leader.enabled;
              const label = t(leader.nameKey, language);
              return (
                <button
                  key={leader.id}
                  type="button"
                  className={[
                    'leader-progress-card',
                    !enabled ? 'leader-progress-card--locked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={label}
                  onClick={() => setSelectedLeaderId(leader.id)}
                >
                  <span className="leader-progress-portrait" aria-hidden="true">
                    <LeaderProgressPortrait
                      leaderId={leader.id}
                      alt={label}
                      noPortraitLabel={t('pregame.leaderPortraitPlaceholder', language)}
                    />
                  </span>
                  <span className="leader-progress-card-shade" aria-hidden="true" />
                  <span className="leader-progress-info">
                    <span className="leader-progress-name">
                      {label}
                    </span>
                  </span>
                </button>
              );
            })}
          </section>
        </main>
      )}
    </div>
  );
}
