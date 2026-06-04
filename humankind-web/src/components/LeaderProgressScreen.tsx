import { type CSSProperties, useState } from 'react';
import { usePreGameStore } from '../game/state/preGameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import {
  LEADERS,
  DEFAULT_LEADER_PROGRESS,
  getLeaderProgressState,
  getLeaderUnlockForLevel,
  leaderHasPortraitSprite,
  LEADER_LIST,
  MAX_LEADER_LEVEL,
  type LeaderId,
} from '../game/data/leaders';
import { Sym } from '../game/data/symbolDefinitions';
import { getSymbolSpriteUrl } from '../game/data/symbolSpritePaths';
import { t } from '../i18n';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

type LeaderPortraitVariant = 'full' | 'mini';

function leaderPortraitSrc(id: LeaderId, variant: LeaderPortraitVariant = 'full'): string | null {
  if (id === 'ramesses') return `${ASSET_BASE_URL}assets/leaders/001_${variant}.png`;
  if (id === 'shihuang') return `${ASSET_BASE_URL}assets/leaders/002_${variant}.png`;
  return null;
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
  const returnToLeaderSelect = usePreGameStore((s) => s.returnToLeaderSelect);
  const initialLeaderId = usePreGameStore((s) => s.leaderProgressInitialLeaderId);
  const backTarget = usePreGameStore((s) => s.leaderProgressBackTarget);
  const [selectedLeaderId, setSelectedLeaderId] = useState<LeaderId | null>(initialLeaderId);

  const selectedLeader = selectedLeaderId ? LEADERS[selectedLeaderId] : null;
  const selectedLeaderName = selectedLeader ? t(selectedLeader.nameKey, language) : '';
  const progress = selectedLeader ? getLeaderProgressState(selectedLeader.id) : DEFAULT_LEADER_PROGRESS;
  const currentLevel = progress.level;
  const currentXp = progress.xp;
  const xpRequired = progress.xpRequired;
  const xpRatio = Math.min(1, currentXp / xpRequired);
  const nextUnlockLevel = selectedLeader
    ? Array.from({ length: MAX_LEADER_LEVEL }, (_, index) => {
        const level = index + 1;
        const unlock = getLeaderUnlockForLevel(selectedLeader.id, level);
        const hasUnlock = unlock?.nameKey != null && unlock?.descKey != null;
        const unlocked = unlock?.unlockedByDefault || currentLevel >= level;
        return hasUnlock && !unlocked ? level : null;
      }).find((level) => level != null) ?? null
    : null;

  const handleBack = () => {
    if (selectedLeaderId) {
      if (backTarget === 'leader') {
        returnToLeaderSelect();
        return;
      }
      setSelectedLeaderId(null);
      return;
    }
    if (backTarget === 'leader') {
      returnToLeaderSelect();
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
        <span aria-hidden="true">←</span>
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
                  Lv. {currentLevel}
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
                <div className="leader-unlock-progress-track" aria-hidden="true">
                  <span style={{ height: `${(currentLevel / MAX_LEADER_LEVEL) * 100}%` }} />
                </div>
                {Array.from({ length: MAX_LEADER_LEVEL }, (_, index) => {
                  const level = index + 1;
                  const unlock = getLeaderUnlockForLevel(selectedLeader.id, level);
                  const unlockNameKey = unlock?.nameKey;
                  const unlockDescKey = unlock?.descKey;
                  const hasUnlock = unlockNameKey != null && unlockDescKey != null;
                  const unlocked = unlock?.unlockedByDefault || currentLevel >= level;
                  const isEventUnlock = unlock?.kind === 'kadesh_battle_escape' || unlock?.kind === 'currency_standardization';
                  const symbolUnlockSpriteUrl =
                    unlock?.kind === 'heqet'
                      ? getSymbolSpriteUrl(Sym.heqet)
                      : unlock?.kind === 'foxtail_millet'
                        ? getSymbolSpriteUrl(Sym.foxtail_millet)
                        : null;
                  return (
                    <article
                      key={level}
                      className={[
                        'leader-unlock-step',
                        hasUnlock ? 'leader-unlock-step--filled' : '',
                        unlocked ? 'leader-unlock-step--unlocked' : '',
                        level === nextUnlockLevel ? 'leader-unlock-step--next' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="leader-unlock-rail">
                        <div className="leader-unlock-level">
                          {t('leaderProgress.levelShort', language).replace('{level}', String(level))}
                        </div>
                      </div>
                      {hasUnlock ? (
                        <div className={[
                          'leader-unlock-body',
                          isEventUnlock ? 'leader-unlock-body--event' : '',
                          symbolUnlockSpriteUrl ? 'leader-unlock-body--symbol' : '',
                          !unlocked ? 'leader-unlock-body--locked' : '',
                        ].filter(Boolean).join(' ')}>
                          {isEventUnlock ? (
                            <span className="leader-unlock-event-mark" aria-hidden="true">
                              <span>!</span>
                            </span>
                          ) : null}
                          {symbolUnlockSpriteUrl ? (
                            <span className="leader-unlock-symbol-mark" aria-hidden="true">
                              <img src={symbolUnlockSpriteUrl} alt="" draggable={false} />
                            </span>
                          ) : null}
                          <div className="leader-unlock-copy">
                            <div className="leader-unlock-name">
                              {t(unlockNameKey!, language)}
                            </div>
                            <div className="leader-unlock-desc">
                              {t(unlockDescKey!, language)}
                            </div>
                          </div>
                          {!unlocked ? (
                            <span className="leader-unlock-lock-mark">
                              {t('leaderProgress.lockedUntil', language).replace('{level}', String(level))}
                            </span>
                          ) : null}
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
            {LEADER_LIST.filter((leader) => leader.enabled && leaderHasPortraitSprite(leader.id)).map((leader, index, visibleLeaders) => {
              const enabled = leader.enabled;
              const label = t(leader.nameKey, language);
              const cardLabel = enabled ? label : t('leader.locked.desc', language);
              const portraitMaskSrc = leaderPortraitSrc(leader.id);
              const portraitStyle = portraitMaskSrc
                ? ({ '--leader-progress-portrait-mask': `url("${portraitMaskSrc}")` } as CSSProperties)
                : undefined;
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
                  style={{ zIndex: visibleLeaders.length - index, ...portraitStyle }}
                  aria-label={cardLabel}
                  aria-disabled={!enabled}
                  onClick={() => {
                    if (!enabled) return;
                    setSelectedLeaderId(leader.id);
                  }}
                >
                  <span className="leader-progress-portrait" aria-hidden="true">
                    <LeaderProgressPortrait
                      leaderId={leader.id}
                      alt={label}
                      noPortraitLabel={t('pregame.leaderPortraitPlaceholder', language)}
                    />
                  </span>
                  <span className="leader-progress-card-shade" aria-hidden="true" />
                  {enabled ? (
                    <span className="leader-progress-info">
                      <span className="leader-progress-name">
                        {label}
                      </span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </section>
        </main>
      )}
    </div>
  );
}
