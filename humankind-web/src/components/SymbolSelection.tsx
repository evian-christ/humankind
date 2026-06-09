import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../game/state/gameStore';
import { getRerollCost } from '../game/state/gameCalculations';
import { isPlagueBlockingSelection } from '../game/state/actions/selectionFlow';
import { useSettingsStore } from '../game/state/settingsStore';
import { SYMBOLS, S, SymbolType, getSymbolColorHex, type SymbolDefinition } from '../game/data/symbolDefinitions';
import { isGameEventDefinition, type GameEventDefinition } from '../game/data/eventDefinitions';
import { useRelicStore } from '../game/state/relicStore';
import { getBoardSymbolTooltipDesc, getEventDescription, t } from '../i18n';
import { EffectText } from './EffectText';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { audioManager } from '../audio/audioManager';
import { getSymbolSpriteUrl } from '../game/data/symbolSpritePaths';
import { getActionForKeyCode } from '../game/input/keyBindings';

const ERA_NAME_KEYS: Record<number, string> = {
    [SymbolType.RELIGION]: 'era.special',
    [SymbolType.NORMAL]: 'era.normal',
    [SymbolType.ANCIENT]: 'era.ancient',
    [SymbolType.MEDIEVAL]: 'era.medieval',
    [SymbolType.MODERN]: 'era.modern',
    [SymbolType.TERRAIN]: 'era.terrain',
    [SymbolType.SPECIAL]: 'era.specialSymbol',
    [SymbolType.UNIT]: 'era.unit',
    [SymbolType.ENEMY]: 'era.enemy',
    [SymbolType.DISASTER]: 'era.disaster',
};

/** gameStore RELIC_ID: 고대 유물 잔해 / 고대 부족 합류 — 심볼 선택 UI 전용 표시·리롤 숨김 */
const RELIC_ANCIENT_DEBRIS = 13;
const RELIC_ANCIENT_TRIBE_JOIN = 19;
const RELIC_MILITARY_LEVY = 39;
const RELIC_PROPHECY_DIE = 40;

const SymbolCard = ({
    symbol,
    unlockedKnowledgeUpgrades,
    onClick,
}: {
    symbol: SymbolDefinition;
    unlockedKnowledgeUpgrades: number[];
    onClick: () => void;
}) => {
    const language = useSettingsStore((s) => s.language);
    const eraColor = getSymbolColorHex(symbol.type);
    const eraName = t(ERA_NAME_KEYS[symbol.type] ?? 'era.ancient', language);
    const symName = t(`symbol.${symbol.key}.name`, language);
    const symDesc = getBoardSymbolTooltipDesc(symbol.key, language, unlockedKnowledgeUpgrades);
    const displayHp = symbol.base_hp;
    const spriteUrl = getSymbolSpriteUrl(symbol);

    return (
        <div
            className="selection-card-frame"
            style={{
                '--card-glow': `${eraColor}cc`,
                '--selection-era-color': eraColor,
            } as CSSProperties}
        >
            <button
                type="button"
                className="selection-card"
                data-audio-click="symbol_choice"
                onClick={onClick}
            >
                {/* 시대 — 스프라이트 위 */}
                <div className="selection-card-rarity" style={{
                    color: eraColor,
                    fontSize: '20px',
                    fontWeight: '900',
                    letterSpacing: '3px',
                    textShadow: `-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 12px ${eraColor}b3`,
                    marginBottom: '8px',
                    display: 'inline-block',
                }}>
                    {eraName}
                </div>

                {/* 스프라이트 */}
                {spriteUrl ? (
                    <img
                        src={spriteUrl}
                        alt={symName}
                        className="selection-card-sprite"
                        style={{ imageRendering: 'pixelated' }}
                    />
                ) : (
                    <div className="selection-card-sprite-placeholder">
                        {symName}
                    </div>
                )}

                {/* 이름 */}
                <div className="selection-card-name">{symName}</div>
                {(symbol.base_attack !== undefined || displayHp !== undefined) && (
                    <div className="selection-card-stats">
                        {symbol.base_attack !== undefined && <span>ATK {symbol.base_attack}</span>}
                        {displayHp !== undefined && <span>HP {displayHp}</span>}
                    </div>
                )}
                <div className="selection-card-desc">
                    {symDesc.split('\n').map((line, i) => (
                        <div key={i} className="selection-card-desc-line"><EffectText text={line} /></div>
                    ))}
                </div>
            </button>
        </div>
    );
};

const EventCard = ({
    event,
    onClick,
}: {
    event: GameEventDefinition;
    onClick: () => void;
}) => {
    const language = useSettingsStore((s) => s.language);
    const era = useGameStore((s) => s.era);
    const eventColor = '#fbbf24';
    const eventName = t(`event.${event.key}.name`, language);
    const eventDesc = getEventDescription(event.key, era, language);
    const eventCondition = t(`event.${event.key}.availability`, language);

    return (
        <div
            className="selection-card-frame selection-event-card-frame"
            style={{
                '--card-glow': `${eventColor}cc`,
                '--selection-era-color': eventColor,
            } as CSSProperties}
        >
            <button
                type="button"
                className="selection-card selection-event-card"
                data-audio-click="symbol_choice"
                onClick={onClick}
            >
                <div className="selection-card-rarity selection-event-card-label">
                    {t('game.event', language)}
                </div>
                <div className="selection-event-card-mark" aria-hidden="true">
                    <span>!</span>
                </div>
                <div className="selection-card-name">{eventName}</div>
                <div className="selection-card-desc">
                    {eventDesc.split('\n').map((line, i) => (
                        <div key={i} className="selection-card-desc-line"><EffectText text={line} /></div>
                    ))}
                </div>
                {event.category === 'conditional' && eventCondition !== '-' && (
                    <div className="selection-event-card-condition">
                        <span>{t('game.condition', language)}:</span> {eventCondition}
                    </div>
                )}
            </button>
        </div>
    );
};

const SymbolSelection = () => {
    const {
        phase,
        symbolChoices,
        gold,
        rerollsThisTurn,
        freeSelectionRerolls,
        level,
        selectSymbol,
        selectEvent,
        skipSelection,
        rerollSymbols,
        symbolSelectionRelicSourceId,
        symbolSelectionSymbolSourceId,
        isTurnSymbolSelection,
        board,
    } = useGameStore();
    const language = useSettingsStore((s) => s.language);
    const relics = useRelicStore((s) => s.relics);
    const unlockedKnowledgeUpgrades = useGameStore((s) => s.unlockedKnowledgeUpgrades ?? []);
    const [isPeeked, setIsPeeked] = useState(false);
    const prevPhaseRef = useRef(phase);

    /** 선택 패널이 보드를 가릴 때만 툴팁 억제; 본게임 ▼ 보드 보기(peek) 중에는 보드 전면으로 간주 */
    const blockBoardTooltipsForSelectionUi = phase === 'selection' && !isPeeked;
    useRegisterBoardTooltipBlock('symbol-selection-overlay', blockBoardTooltipsForSelectionUi);

    useEffect(() => {
        if (phase === 'selection' && prevPhaseRef.current !== 'selection') {
            void audioManager.play('selection_open');
        }
        prevPhaseRef.current = phase;
    }, [phase]);

    // ID 2: 리디아의 호박금 주화 — 리롤 비용 50% 할인, 턴당 최대 3회
    const hasLydia = relics.some(r => r.definition.id === 2);
    const rerollCost = getRerollCost(level, hasLydia ? 0.5 : 1, rerollsThisTurn);
    const maxRerolls = hasLydia ? 3 : Infinity;
    const rerollsLeft = hasLydia ? maxRerolls - rerollsThisTurn : null;
    const hasFreeReroll = (freeSelectionRerolls ?? 0) > 0;
    const visibleRerollCost = hasFreeReroll ? 0 : rerollCost;
    const isSelectionBlockedByPlague = isPlagueBlockingSelection({ board, isTurnSymbolSelection });
    const canReroll = !isSelectionBlockedByPlague && (hasFreeReroll || gold >= rerollCost) && (rerollsLeft === null || rerollsLeft > 0);

    const hideRerollFromRelicSource =
        symbolSelectionRelicSourceId === RELIC_ANCIENT_DEBRIS ||
        symbolSelectionRelicSourceId === RELIC_ANCIENT_TRIBE_JOIN ||
        symbolSelectionRelicSourceId === RELIC_MILITARY_LEVY ||
        symbolSelectionRelicSourceId === RELIC_PROPHECY_DIE;
    const hideRerollFromSymbolSource = symbolSelectionSymbolSourceId === S.tribal_village;
    const canUseReroll = canReroll && !hideRerollFromRelicSource && !hideRerollFromSymbolSource;
    const symbolSource = symbolSelectionSymbolSourceId == null ? null : SYMBOLS[symbolSelectionSymbolSourceId] ?? null;
    const relicSourceLabelKey =
        hideRerollFromRelicSource && symbolSelectionRelicSourceId != null
            ? (`relic.${symbolSelectionRelicSourceId}.name` as const)
            : null;
    const sourceLabelKey =
        symbolSource != null
            ? (`symbol.${symbolSource.key}.name` as const)
            : relicSourceLabelKey;

    const handleCardClick = useCallback((symbolId: number) => {
        void audioManager.play('symbol_choice_chose');
        selectSymbol(symbolId);
    }, [selectSymbol]);

    const handleEventCardClick = useCallback((eventId: number) => {
        void audioManager.play('symbol_choice_chose');
        selectEvent(eventId);
    }, [selectEvent]);

    const handleRerollClick = useCallback(() => {
        if (!canUseReroll) {
            void audioManager.play('denied');
            return;
        }
        void audioManager.play('symbol_choice_reroll');
        rerollSymbols();
    }, [canUseReroll, rerollSymbols]);

    useEffect(() => {
        if (phase !== 'selection' || isPeeked) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
            if (event.repeat) return;

            const action = getActionForKeyCode(useSettingsStore.getState().keyBindings, event.code);
            if (action === 'reroll') {
                event.preventDefault();
                handleRerollClick();
                return;
            }
            if (action === 'skip') {
                event.preventDefault();
                skipSelection();
                return;
            }

            const choiceIndex =
                action === 'selectFirst' ? 0
                    : action === 'selectSecond' ? 1
                        : action === 'selectThird' ? 2
                            : -1;
            if (choiceIndex < 0 || isSelectionBlockedByPlague) return;

            const choice = symbolChoices[choiceIndex];
            if (!choice) return;

            event.preventDefault();
            if (isGameEventDefinition(choice)) handleEventCardClick(choice.id);
            else handleCardClick(choice.id);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        canUseReroll,
        handleCardClick,
        handleEventCardClick,
        handleRerollClick,
        isPeeked,
        isSelectionBlockedByPlague,
        phase,
        skipSelection,
        symbolChoices,
    ]);

    if (phase !== 'selection') return null;

    return (
        <div
            className={`selection-overlay selection-overlay--symbol${isPeeked ? ' selection-overlay--peeked' : ''}`}
        >
            <button
                className="selection-peek-handle"
                type="button"
                onClick={() => setIsPeeked((v) => !v)}
                aria-expanded={!isPeeked}
            >
                <span className="selection-peek-handle-label">
                    {isPeeked ? t('game.returnToSelection', language) : t('game.peekBoard', language)}
                </span>
                <span
                    className={`selection-peek-handle-chevron${isPeeked ? ' selection-peek-handle-chevron--up' : ''}`}
                    aria-hidden="true"
                />
            </button>

            <div className="selection-panel-wrapper">
                <div className="selection-panel">
                    {sourceLabelKey && (
                        <div className="selection-relic-source-banner">{t(sourceLabelKey, language)}</div>
                    )}
                    <div className="selection-title selection-title--plain">
                        {t(isSelectionBlockedByPlague ? 'game.plagueOutbreak' : 'game.chooseSymbol', language)}
                    </div>
                    <div className="selection-cards">
                        {isSelectionBlockedByPlague ? (
                            [0, 1, 2].map((cardIndex) => (
                                <div
                                    key={`plague-blocked-${cardIndex}`}
                                    className="selection-card-frame selection-plague-card-frame"
                                >
                                    <div className="selection-plague-blocked">
                                        {cardIndex === 1 && t('game.plagueSelectionBlocked', language)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            symbolChoices.map((choice, i) => (
                                isGameEventDefinition(choice) ? (
                                    <EventCard
                                        key={`event-${choice.id}-${i}`}
                                        event={choice}
                                        onClick={() => handleEventCardClick(choice.id)}
                                    />
                                ) : (
                                    <SymbolCard
                                        key={`${choice.id}-${i}`}
                                        symbol={choice}
                                        unlockedKnowledgeUpgrades={unlockedKnowledgeUpgrades}
                                        onClick={() => handleCardClick(choice.id)}
                                    />
                                )
                            ))
                        )}
                    </div>
                    <div className="selection-actions">
                        {!hideRerollFromRelicSource && !hideRerollFromSymbolSource && (
                            <button
                                className="selection-reroll-btn"
                                data-audio-click="symbol_choice_reroll"
                                onClick={handleRerollClick}
                                aria-disabled={!canReroll}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    opacity: canReroll ? 1 : 0.55,
                                    cursor: canReroll ? 'pointer' : 'not-allowed',
                                }}
                            >
                                <span>{t('game.reroll', language)}</span>
                                <span style={{ color: '#fbbf24', fontSize: '20px', lineHeight: 1, transform: 'translateY(1px)' }}>&#9679;</span>
                                <span style={{ color: '#fbbf24', fontWeight: '900' }}>{visibleRerollCost}</span>
                                {rerollsLeft !== null && (
                                    <span style={{ marginLeft: '4px', opacity: 0.75, fontSize: '0.75em' }}>
                                        {rerollsLeft}/{maxRerolls}
                                    </span>
                                )}
                            </button>
                        )}
                        <button className="selection-skip-btn" onClick={skipSelection}>
                            {t('game.skip', language)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SymbolSelection;
