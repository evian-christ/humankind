import { type CSSProperties, useRef, useState } from 'react';
import { SYMBOLS_BY_KEY } from '../game/data/symbolDefinitions';
import { getSymbolSpriteUrl } from '../game/data/symbolSpritePaths';
import {
  DEFAULT_SYMBOL_SET_DECK_IDS,
  OWNED_SYMBOL_SET_IDS,
  SYMBOL_SET_BY_ID,
  SYMBOL_SET_DECK_SIZE,
  SYMBOL_SETS,
  type SymbolSetDefinition,
  type SymbolSetId,
} from '../game/data/symbolSets';
import { usePreGameStore } from '../game/state/preGameStore';
import { useSettingsStore } from '../game/state/settingsStore';
import { t } from '../i18n';
import './difficultySelectScreen.css';

const DIFFICULTY_OPTIONS = ['NORMAL', 'HARD', 'PRO'] as const;
type DifficultyOption = (typeof DIFFICULTY_OPTIONS)[number];

const DIFFICULTY_LABEL_KEYS: Record<DifficultyOption, string> = {
  NORMAL: 'pregame.difficulty.normal',
  HARD: 'pregame.difficulty.hard',
  PRO: 'pregame.difficulty.pro',
};

const DIFFICULTY_COLOR_CLASSES: Record<DifficultyOption, string> = {
  NORMAL: 'difficulty-buttons--normal',
  HARD: 'difficulty-buttons--hard',
  PRO: 'difficulty-buttons--pro',
};

const ENABLED_DIFFICULTIES: ReadonlySet<DifficultyOption> = new Set(['NORMAL']);
const OWNED_SET_IDS = new Set(OWNED_SYMBOL_SET_IDS);

const setAccent = (set: SymbolSetDefinition): CSSProperties => ({ '--symbol-set-color': set.color } as CSSProperties);

function SetArtwork({ set }: { set: SymbolSetDefinition }) {
  if (!set.symbolKeys.length) {
    return <span className="symbol-set-card-back" aria-hidden="true"><span>?</span></span>;
  }

  return (
    <span className="symbol-set-artwork" aria-hidden="true">
      {set.symbolKeys.slice(0, 3).map((key, index) => {
        const symbol = SYMBOLS_BY_KEY[key];
        const spriteUrl = symbol ? getSymbolSpriteUrl(symbol) : null;
        return spriteUrl && <img
          key={key}
          src={spriteUrl}
          alt=""
          className={`symbol-set-art-symbol symbol-set-art-symbol--${index}`}
          draggable={false}
        />;
      })}
    </span>
  );
}

export default function DifficultySelectScreen() {
  const language = useSettingsStore((s) => s.language);
  const startGame = usePreGameStore((s) => s.startGame);
  const returnToIntro = usePreGameStore((s) => s.returnToIntro);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyOption>('NORMAL');
  const [equippedSetIds, setEquippedSetIds] = useState<Array<SymbolSetId | null>>([...DEFAULT_SYMBOL_SET_DECK_IDS]);
  const [previewSetId, setPreviewSetId] = useState<SymbolSetId>(DEFAULT_SYMBOL_SET_DECK_IDS[0]);
  const collectionRef = useRef<HTMLDivElement>(null);
  const selectedDifficultyIndex = DIFFICULTY_OPTIONS.indexOf(selectedDifficulty);
  const equippedCount = equippedSetIds.filter((id) => id != null).length;
  const isDeckComplete = equippedCount === SYMBOL_SET_DECK_SIZE;
  const previewSet = SYMBOL_SET_BY_ID.get(previewSetId) ?? SYMBOL_SETS[0];

  const toggleSet = (id: SymbolSetId) => {
    if (!OWNED_SET_IDS.has(id)) return;
    setPreviewSetId(id);
    setEquippedSetIds((current) => {
      const index = current.indexOf(id);
      if (index >= 0) return current.map((entry, slot) => slot === index ? null : entry);
      const emptyIndex = current.indexOf(null);
      return emptyIndex >= 0 ? current.map((entry, slot) => slot === emptyIndex ? id : entry) : current;
    });
  };

  const scrollCollection = (direction: -1 | 1) => {
    collectionRef.current?.scrollBy({ left: direction * 536, behavior: 'smooth' });
  };

  return (
    <div className="difficulty-select-root">
      <button type="button" className="menu-back-button" onClick={returnToIntro} aria-label={t('game.back', language)}>
        <span aria-hidden="true">←</span>
      </button>

      <main className="difficulty-select-shell" aria-labelledby="difficulty-select-title">
        <h1 id="difficulty-select-title" className="main-menu-title difficulty-select-title">
          <span className="main-menu-title-main difficulty-select-title-main">{t('pregame.setupTitle', language)}</span>
        </h1>

        <div className="difficulty-select-panel">
          <section className="difficulty-selector" aria-label={t('pregame.difficultySelect', language)}>
            <div
              className={['difficulty-buttons', DIFFICULTY_COLOR_CLASSES[selectedDifficulty]].join(' ')}
              style={{ '--difficulty-index': selectedDifficultyIndex } as CSSProperties}
            >
              <span className="difficulty-thumb" aria-hidden="true" />
              {DIFFICULTY_OPTIONS.map((difficulty) => {
                const selected = selectedDifficulty === difficulty;
                const enabled = ENABLED_DIFFICULTIES.has(difficulty);
                return (
                  <button
                    key={difficulty}
                    type="button"
                    disabled={!enabled}
                    className={[
                      'difficulty-button',
                      selected ? 'difficulty-button--selected' : '',
                      !enabled ? 'difficulty-button--disabled' : '',
                    ].filter(Boolean).join(' ')}
                    aria-pressed={selected}
                    onClick={() => setSelectedDifficulty(difficulty)}
                  >
                    {t(DIFFICULTY_LABEL_KEYS[difficulty], language)}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="symbol-set-picker" aria-labelledby="symbol-set-heading">
            <div className="symbol-set-heading-row">
              <div>
                <h2 id="symbol-set-heading" className="symbol-set-heading">{t('pregame.symbolSet.title', language)}</h2>
                <p className="symbol-set-hint">{t('pregame.symbolSet.hint', language)}</p>
              </div>
              <span className={`symbol-set-count${isDeckComplete ? ' symbol-set-count--complete' : ''}`} aria-live="polite">
                <strong>{equippedCount}</strong><span> / {SYMBOL_SET_DECK_SIZE}</span>
              </span>
            </div>

            <div className="symbol-set-deck" aria-label={t('pregame.symbolSet.title', language)}>
              {Array.from({ length: SYMBOL_SET_DECK_SIZE }, (_, index) => {
                const id = equippedSetIds[index];
                const set = id ? SYMBOL_SET_BY_ID.get(id) : null;
                return set ? (
                  <button
                    key={index}
                    type="button"
                    className="symbol-set-card symbol-set-card--deck"
                    style={setAccent(set)}
                    onMouseEnter={() => setPreviewSetId(set.id)}
                    onFocus={() => setPreviewSetId(set.id)}
                    onClick={() => toggleSet(set.id)}
                    aria-label={`${index + 1}. ${t(`symbolSet.${set.id}.name`, language)} · ${t('pregame.symbolSet.remove', language)}`}
                  >
                    <span className="symbol-set-card-number">{String(index + 1).padStart(2, '0')}</span>
                    <SetArtwork set={set} />
                    <span className="symbol-set-card-name">{t(`symbolSet.${set.id}.name`, language)}</span>
                    <span className="symbol-set-card-remove" aria-hidden="true">×</span>
                  </button>
                ) : (
                  <div key={index} className="symbol-set-card symbol-set-card--empty">
                    <span className="symbol-set-card-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="symbol-set-empty-mark" aria-hidden="true">+</span>
                    <span className="symbol-set-empty-label">{t('pregame.symbolSet.emptySlot', language)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="symbol-set-collection" aria-labelledby="symbol-set-collection-heading">
            <div className="symbol-set-collection-heading-row">
              <div>
                <h3 id="symbol-set-collection-heading">{t('pregame.symbolSet.collection', language)}</h3>
                <span className="symbol-set-collection-total">{OWNED_SYMBOL_SET_IDS.length} / {SYMBOL_SETS.length}</span>
              </div>
              <div className="symbol-set-rail-controls">
                <button type="button" onClick={() => scrollCollection(-1)} aria-label={t('pregame.symbolSet.previous', language)}>‹</button>
                <button type="button" onClick={() => scrollCollection(1)} aria-label={t('pregame.symbolSet.next', language)}>›</button>
              </div>
            </div>
            <div className="symbol-set-collection-rail" ref={collectionRef}>
              {SYMBOL_SETS.map((set) => {
                const owned = OWNED_SET_IDS.has(set.id);
                const equipped = equippedSetIds.includes(set.id);
                const name = t(`symbolSet.${set.id}.name`, language);
                const cardContent = <>
                  <span className="symbol-set-collection-state">{t(owned
                    ? equipped ? 'pregame.symbolSet.equipped' : 'pregame.symbolSet.equip'
                    : 'pregame.symbolSet.unowned', language)}</span>
                  <SetArtwork set={set} />
                  <span className="symbol-set-card-name">{name}</span>
                </>;
                return owned ? (
                  <button
                    key={set.id}
                    type="button"
                    className={`symbol-set-card symbol-set-card--collection${equipped ? ' symbol-set-card--equipped' : ''}`}
                    style={setAccent(set)}
                    aria-pressed={equipped}
                    aria-label={`${name} · ${t(equipped ? 'pregame.symbolSet.remove' : 'pregame.symbolSet.equip', language)}`}
                    onMouseEnter={() => setPreviewSetId(set.id)}
                    onFocus={() => setPreviewSetId(set.id)}
                    onClick={() => toggleSet(set.id)}
                  >
                    {cardContent}
                  </button>
                ) : (
                  <div
                    key={set.id}
                    className="symbol-set-card symbol-set-card--collection symbol-set-card--locked"
                    style={setAccent(set)}
                    tabIndex={0}
                    onMouseEnter={() => setPreviewSetId(set.id)}
                    onFocus={() => setPreviewSetId(set.id)}
                    aria-label={`${name} · ${t('pregame.symbolSet.unowned', language)}`}
                  >
                    {cardContent}
                  </div>
                );
              })}
            </div>
            <div className="symbol-set-preview" style={setAccent(previewSet)} aria-live="polite">
              <strong>{t(`symbolSet.${previewSet.id}.name`, language)}</strong>
              <span className="symbol-set-preview-divider" aria-hidden="true" />
              {previewSet.symbolKeys.length ? (
                <div className="symbol-set-preview-members">
                  {previewSet.symbolKeys.map((key) => {
                    const symbol = SYMBOLS_BY_KEY[key];
                    const spriteUrl = symbol ? getSymbolSpriteUrl(symbol) : null;
                    return <span key={key} className="symbol-set-preview-member">
                      {spriteUrl && <img src={spriteUrl} alt="" draggable={false} />}
                      {t(`symbol.${key}.name`, language)}
                    </span>;
                  })}
                </div>
              ) : <span className="symbol-set-preview-unknown">{t('pregame.symbolSet.noSymbols', language)}</span>}
            </div>
            <p className="symbol-set-note">{t('pregame.symbolSet.commonNote', language)}</p>
          </section>

          <div className="difficulty-select-actions">
            <button
              type="button"
              className="main-menu-button difficulty-select-play"
              onClick={() => startGame(equippedSetIds.filter((id): id is SymbolSetId => id != null))}
              disabled={!ENABLED_DIFFICULTIES.has(selectedDifficulty) || !isDeckComplete}
            >
              {t('pregame.startGame', language)}
            </button>
            {!isDeckComplete && <p className="symbol-set-start-warning" role="status">
              {t('pregame.symbolSet.startRequired', language)}
            </p>}
          </div>
        </div>
      </main>
    </div>
  );
}
