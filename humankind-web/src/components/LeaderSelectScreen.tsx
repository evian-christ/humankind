import { type CSSProperties, useMemo, useState } from 'react';
import { usePreGameStore } from '../game/state/preGameStore';
import {
  DEFAULT_LEADER_PROGRESS,
  getLeaderProgressState,
  isLeaderPlayable,
  leaderHasPortraitSprite,
  LEADER_LIST,
  type LeaderId,
  type LeaderDefinition,
} from '../game/data/leaders';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

const ASSET_BASE_URL = import.meta.env.BASE_URL;
const DIFFICULTY_OPTIONS = ['NORMAL', 'HARD', 'PRO'] as const;
type DifficultyOption = (typeof DIFFICULTY_OPTIONS)[number];

const DIFFICULTY_LABEL_KEYS: Record<DifficultyOption, string> = {
  NORMAL: 'pregame.difficulty.normal',
  HARD: 'pregame.difficulty.hard',
  PRO: 'pregame.difficulty.pro',
};

const DIFFICULTY_COLOR_CLASSES: Record<DifficultyOption, string> = {
  NORMAL: 'leader-difficulty-buttons--normal',
  HARD: 'leader-difficulty-buttons--hard',
  PRO: 'leader-difficulty-buttons--pro',
};

type LeaderPortraitVariant = 'full' | 'mini';
const ENABLED_DIFFICULTIES: ReadonlySet<DifficultyOption> = new Set(['NORMAL']);

function leaderPortraitSrc(id: LeaderId, variant: LeaderPortraitVariant = 'full'): string | null {
  if (id === 'ramesses') return `${ASSET_BASE_URL}assets/leaders/001_${variant}.png`;
  if (id === 'shihuang') return `${ASSET_BASE_URL}assets/leaders/002_${variant}.png`;
  return null;
}

function LeaderPortrait({
  leaderId,
  alt,
  enabled,
  noPortraitLabel,
  variant = 'full',
}: {
  leaderId: LeaderId;
  alt: string;
  enabled: boolean;
  noPortraitLabel: string;
  variant?: LeaderPortraitVariant;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = leaderPortraitSrc(leaderId, variant);
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
  const proceedToLeaderProgress = usePreGameStore((s) => s.proceedToLeaderProgress);
  const returnToIntro = usePreGameStore((s) => s.returnToIntro);

  const defaultLeaderId = useMemo(
    () => LEADER_LIST.find((l) => l.enabled)?.id ?? null,
    [],
  );
  const [chosenLeaderId, setChosenLeaderId] = useState<LeaderId | null>(defaultLeaderId);
  const [hoveredLeaderId, setHoveredLeaderId] = useState<LeaderId | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyOption>('NORMAL');
  const selectedDifficultyIndex = DIFFICULTY_OPTIONS.indexOf(selectedDifficulty);

  const visibleLeaders = useMemo(
    () => LEADER_LIST.filter((leader) => leader.enabled && leaderHasPortraitSprite(leader.id)),
    [],
  );

  const getLeaderById = (id: LeaderId | null): LeaderDefinition | null => {
    if (id == null) return null;
    return LEADER_LIST.find((l) => l.id === id) ?? null;
  };

  const previewLeader = getLeaderById(chosenLeaderId);
  const previewProgress = previewLeader ? getLeaderProgressState(previewLeader.id) : DEFAULT_LEADER_PROGRESS;

  const handlePlay = () => {
    if (chosenLeaderId == null || !isLeaderPlayable(chosenLeaderId)) return;
    startWithLeader(chosenLeaderId);
  };

  const handleDetails = () => {
    if (!chosenLeaderId) return;
    proceedToLeaderProgress({
      initialLeaderId: chosenLeaderId,
      backTarget: 'leader',
    });
  };

  return (
    <div className="leader-select-root">
      <button
        type="button"
        className="leader-select-back"
        onClick={returnToIntro}
        aria-label={t('game.back', language)}
      >
        <span aria-hidden="true">←</span>
      </button>

      <main className="leader-select-shell" aria-label={t('pregame.leaderTitle', language)}>
        <h1 className="main-menu-title leader-select-title">
          <span className="main-menu-title-main leader-select-title-main">
            {t('pregame.leaderTitle', language)}
          </span>
        </h1>

        <div className="leader-select-content">
          <section className="leader-select-roster" aria-label={t('pregame.leaderTitle', language)}>
            {visibleLeaders.map((leader, index) => {
              const selected = leader.enabled && chosenLeaderId === leader.id;
              const hovered = hoveredLeaderId === leader.id;
              const muted = chosenLeaderId != null && chosenLeaderId !== leader.id;
              const portraitMaskSrc = leaderPortraitSrc(leader.id);
              const portraitStyle = portraitMaskSrc
                ? ({ '--leader-portrait-mask': `url("${portraitMaskSrc}")` } as CSSProperties)
                : undefined;
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
                    hovered ? 'leader-card--hovered' : '',
                    muted ? 'leader-card--muted' : '',
                    !leader.enabled ? 'leader-card--locked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ zIndex: visibleLeaders.length - index }}
                  onMouseEnter={() => {
                    if (!leader.enabled) return;
                    setHoveredLeaderId(leader.id);
                  }}
                  onMouseLeave={() => {
                    setHoveredLeaderId(null);
                  }}
                  onFocus={() => {
                    if (!leader.enabled) return;
                    setHoveredLeaderId(leader.id);
                  }}
                  onBlur={() => {
                    setHoveredLeaderId(null);
                  }}
                  onClick={() => {
                    if (!leader.enabled) return;
                    setChosenLeaderId(leader.id);
                  }}
                >
                  <span className="leader-card-portrait" style={portraitStyle} aria-hidden="true">
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
            <section className="leader-select-summary" aria-live="polite">
              <div className="leader-select-summary-copy">
                <div className="leader-select-summary-name">{t(previewLeader.nameKey, language)}</div>
                {previewLeader.nameSubtitleKey ? (
                  <div className="leader-select-summary-subtitle">{t(previewLeader.nameSubtitleKey, language)}</div>
                ) : null}
              </div>
              <div className="leader-select-summary-level">
                Lv. {previewProgress.level}
              </div>

              <section className="leader-difficulty" aria-label={t('pregame.difficultySelect', language)}>
                <div
                  className={[
                    'leader-difficulty-buttons',
                    DIFFICULTY_COLOR_CLASSES[selectedDifficulty],
                  ].join(' ')}
                  style={{ '--leader-difficulty-index': selectedDifficultyIndex } as CSSProperties}
                >
                  <span className="leader-difficulty-thumb" aria-hidden="true" />
                  {DIFFICULTY_OPTIONS.map((difficulty) => {
                    const selected = selectedDifficulty === difficulty;
                    const enabled = ENABLED_DIFFICULTIES.has(difficulty);
                    return (
                      <button
                        key={difficulty}
                        type="button"
                        disabled={!enabled}
                        aria-disabled={!enabled}
                        className={[
                          'leader-difficulty-button',
                          selected ? 'leader-difficulty-button--selected' : '',
                          !enabled ? 'leader-difficulty-button--disabled' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-pressed={selected}
                        onClick={() => {
                          if (!enabled) return;
                          setSelectedDifficulty(difficulty);
                        }}
                      >
                        {t(DIFFICULTY_LABEL_KEYS[difficulty], language)}
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="leader-select-actions">
                <button
                  type="button"
                  className="main-menu-button leader-select-details"
                  onClick={handleDetails}
                  disabled={chosenLeaderId == null}
                >
                  {t('pregame.leaderDetails', language)}
                </button>
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
