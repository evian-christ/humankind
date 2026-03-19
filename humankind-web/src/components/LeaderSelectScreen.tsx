import { useEffect, useMemo, useState } from 'react';
import { usePreGameStore } from '../game/state/preGameStore';
import { LEADER_LIST, type LeaderId, type LeaderDefinition } from '../game/data/leaders';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';

export default function LeaderSelectScreen() {
  const language = useSettingsStore((s) => s.language);
  const selectLeader = usePreGameStore((s) => s.selectLeader);
  const selectedLeaderId = usePreGameStore((s) => s.selectedLeaderId);

  const initialLeaderId = useMemo(() => LEADER_LIST[0]?.id ?? null, []);
  const [hoveredLeaderId, setHoveredLeaderId] = useState<LeaderId | null>(initialLeaderId);

  useEffect(() => {
    // 화면 진입 시 기본 미리보기는 첫 리더
    setHoveredLeaderId(initialLeaderId);
  }, [initialLeaderId]);

  const getLeaderById = (id: LeaderId | null): LeaderDefinition | null => {
    if (id == null) return null;
    return LEADER_LIST.find((l) => l.id === id) ?? null;
  };

  const previewLeader = getLeaderById(hoveredLeaderId);

  return (
    <div className="pregame-overlay pregame-overlay--select">
      <div className="pregame-panel pregame-panel--leaders-v2">
        <h1 className="pregame-title">{t('pregame.leaderTitle', language)}</h1>
        <div className="leader-select-layout">
          {/* 좌측: 리더 프리뷰 */}
          <div className="leader-preview">
            <div className="leader-portrait-placeholder" aria-hidden="true">
            </div>

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

          {/* 우측: 리더 리스트 */}
          <div className="leader-list" role="listbox" aria-label="leader list">
            {LEADER_LIST.map((leader) => {
              const isSelected = selectedLeaderId === leader.id;
              const isActive = hoveredLeaderId === leader.id && !isSelected;
              return (
                <button
                  key={leader.id}
                  type="button"
                  className={[
                    'leader-list-item',
                    isSelected ? 'leader-list-item--selected' : '',
                    isActive ? 'leader-list-item--active' : '',
                  ].join(' ')}
                  onMouseEnter={() => setHoveredLeaderId(leader.id)}
                  onFocus={() => setHoveredLeaderId(leader.id)}
                  onMouseLeave={() => {
                    // 호버를 떼도 좌측 프리뷰는 마지막으로 호버링한 리더를 유지
                  }}
                  onClick={() => selectLeader(leader.id)}
                  aria-selected={isSelected}
                >
                  <div className="leader-list-item-name">{t(leader.nameKey, language)}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
