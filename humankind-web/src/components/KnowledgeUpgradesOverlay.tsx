import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { useRegisterBoardTooltipBlock } from '../hooks/useRegisterBoardTooltipBlock';
import { useGameStore } from '../game/state/gameStore';
import {
    isUpgradeLegalForKnowledgePick,
    normalizeKnowledgeResearchCredits,
} from '../game/state/gameCalculations';
import { useSettingsStore } from '../game/state/settingsStore';
import {
    ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID,
    KNOWLEDGE_UPGRADES,
    buildAncientSymbolsUnlockDescSymbols,
} from '../game/data/knowledgeUpgrades';
import {
    KNOWLEDGE_UPGRADE_TRACKS,
    getNextKnowledgeUpgradeTrackStage,
    normalizeKnowledgeUpgradeLevels,
    type KnowledgeUpgradeTrack,
    type KnowledgeUpgradeTrackId,
} from '../game/data/knowledgeUpgradeTracks';
import { t } from '../i18n';
import { EffectText } from './EffectText';
import { UpgradeCardDescRelics, UpgradeCardDescSymbols } from './KnowledgeUpgradeCardWidgets';
import { resolveUpgradeSprite } from './knowledgeUpgradeSprites';
import { audioManager } from '../audio/audioManager';
import { KNOWLEDGE_RESOURCE_ICON_URL } from '../uiAssetUrls';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tutorialStep?: number;
    onTutorialStepChange?: (step: number) => void;
}

const TRACK_ACCENTS: Record<KnowledgeUpgradeTrackId, string> = {
    era: '#d6d3c8',
    hunting: '#c58b63',
    pastoralism: '#a7bc73',
    agriculture: '#dfbd58',
    fisheries: '#67a9c8',
    trade: '#d49a45',
    tropicalAgriculture: '#58ad7a',
    scholarship: '#839fd8',
    faith: '#b69bd0',
};

const getTrackName = (track: KnowledgeUpgradeTrack, language: ReturnType<typeof useSettingsStore.getState>['language']) =>
    t(`knowledgeTrack.${track.id}.name`, language) || track.name;

const toRomanNumeral = (value: number): string => {
    const numerals: Array<[number, string]> = [
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
    ];
    let remaining = Math.max(0, Math.floor(value));
    let result = '';
    for (const [amount, numeral] of numerals) {
        while (remaining >= amount) {
            result += numeral;
            remaining -= amount;
        }
    }
    return result;
};

const getUpgradeTitle = (
    track: KnowledgeUpgradeTrack,
    rank: number,
    language: ReturnType<typeof useSettingsStore.getState>['language'],
) => {
    const name = getTrackName(track, language);
    return rank > 0 ? `${name} ${toRomanNumeral(rank)}` : name;
};

const KnowledgeUpgradesOverlay = ({ isOpen, onClose, tutorialStep, onTutorialStepChange }: Props) => {
    useRegisterBoardTooltipBlock('knowledge-upgrades-overlay', isOpen);

    const unlockedUpgrades = useGameStore((state) => state.unlockedKnowledgeUpgrades);
    const storedUpgradeLevels = useGameStore((state) => state.knowledgeUpgradeLevels);
    const currentLevel = useGameStore((state) => state.level);
    const levelUpResearchPoints = useGameStore((state) => state.levelUpResearchPoints ?? 0);
    const knowledgeResearchCredits = useGameStore((state) => state.knowledgeResearchCredits ?? []);
    const leaderId = useGameStore((state) => state.leaderId);
    const leaderProgressLevel = useGameStore((state) => state.leaderProgressLevel);
    const phase = useGameStore((state) => state.phase);
    const language = useSettingsStore((state) => state.language);

    const [selectedTrackId, setSelectedTrackId] = useState<KnowledgeUpgradeTrackId>('era');
    const [pendingResearchId, setPendingResearchId] = useState<number | null>(null);
    const [deniedTrackId, setDeniedTrackId] = useState<KnowledgeUpgradeTrackId | null>(null);
    const confirmButtonRef = useRef<HTMLButtonElement>(null);
    const deniedTimeoutRef = useRef<number | null>(null);

    const upgradeLevels = useMemo(
        () => normalizeKnowledgeUpgradeLevels(unlockedUpgrades, storedUpgradeLevels),
        [storedUpgradeLevels, unlockedUpgrades],
    );
    const researchCredits = useMemo(
        () => normalizeKnowledgeResearchCredits(currentLevel, levelUpResearchPoints, knowledgeResearchCredits),
        [currentLevel, knowledgeResearchCredits, levelUpResearchPoints],
    );
    const selectedTrack = KNOWLEDGE_UPGRADE_TRACKS.find((track) => track.id === selectedTrackId)
        ?? KNOWLEDGE_UPGRADE_TRACKS[0]!;
    const selectedRank = upgradeLevels[selectedTrack.id];
    const selectedNextStage = getNextKnowledgeUpgradeTrackStage(selectedTrack.id, upgradeLevels);
    const selectedDisplayStage = selectedNextStage ?? selectedTrack.stages[selectedTrack.stages.length - 1] ?? null;
    const selectedUpgrade = selectedDisplayStage ? KNOWLEDGE_UPGRADES[selectedDisplayStage.upgradeId] : null;
    const selectedIconUpgrade = KNOWLEDGE_UPGRADES[selectedTrack.stages[0]!.upgradeId];
    const selectedSpriteUrl = resolveUpgradeSprite(selectedIconUpgrade?.sprite);

    const canResearchTrack = (track: KnowledgeUpgradeTrack): boolean => {
        const nextStage = getNextKnowledgeUpgradeTrackStage(track.id, upgradeLevels);
        return nextStage != null && isUpgradeLegalForKnowledgePick(
            nextStage.upgradeId,
            unlockedUpgrades,
            currentLevel,
            researchCredits,
        );
    };

    const getTrackStatus = (track: KnowledgeUpgradeTrack): string => {
        const nextStage = getNextKnowledgeUpgradeTrackStage(track.id, upgradeLevels);
        if (!nextStage) return t('knowledgeTrack.status.complete', language);
        if (canResearchTrack(track)) return t('knowledgeUpgrade.status.available', language);
        if (currentLevel < nextStage.requiredLevel) {
            return t('knowledgeUpgrade.detail.unlockLevel', language).replace('{level}', String(nextStage.requiredLevel));
        }
        if (levelUpResearchPoints <= 0) return t('game.levelUpResearchPointsRequired', language);
        return t('knowledgeUpgrade.status.locked', language);
    };

    const playResearchSound = () => {
        void audioManager.play('knowledge_upgraded_1');
        void audioManager.getCueDurationMs('knowledge_upgraded_1').then((durationMs) => {
            window.setTimeout(() => void audioManager.play('knowledge_upgraded_2'), Math.max(0, durationMs ?? 0));
        });
    };

    const showDeniedFeedback = (trackId: KnowledgeUpgradeTrackId) => {
        void audioManager.play('denied');
        setDeniedTrackId(null);
        window.requestAnimationFrame(() => {
            setDeniedTrackId(trackId);
            if (deniedTimeoutRef.current != null) window.clearTimeout(deniedTimeoutRef.current);
            deniedTimeoutRef.current = window.setTimeout(() => setDeniedTrackId(null), 220);
        });
    };

    const requestResearch = (track: KnowledgeUpgradeTrack) => {
        const nextStage = getNextKnowledgeUpgradeTrackStage(track.id, upgradeLevels);
        if (!nextStage || !canResearchTrack(track)) {
            showDeniedFeedback(track.id);
            return;
        }
        setPendingResearchId(nextStage.upgradeId);
    };

    const handleTrackClick = (track: KnowledgeUpgradeTrack, event: ReactMouseEvent<HTMLButtonElement>) => {
        event.currentTarget.focus();
        setSelectedTrackId(track.id);
        if (tutorialStep === 30 && track.id === 'era') onTutorialStepChange?.(31);
        if (
            tutorialStep === 15 &&
            track.id === 'era' &&
            getNextKnowledgeUpgradeTrackStage(track.id, upgradeLevels)?.upgradeId === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID
        ) {
            requestResearch(track);
        }
    };

    const confirmResearch = () => {
        if (pendingResearchId == null) return;
        const track = KNOWLEDGE_UPGRADE_TRACKS.find((candidate) =>
            candidate.stages.some((stage) => stage.upgradeId === pendingResearchId),
        );
        if (!track || !canResearchTrack(track)) {
            if (track) showDeniedFeedback(track.id);
            setPendingResearchId(null);
            return;
        }

        playResearchSound();
        useGameStore.setState({ returnPhaseAfterDevKnowledgeUpgrade: phase });
        useGameStore.getState().selectUpgrade(pendingResearchId);
        if (tutorialStep === 15 && pendingResearchId === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID) {
            onTutorialStepChange?.(16);
        }
        setPendingResearchId(null);
    };

    useEffect(() => {
        if (!isOpen) {
            setPendingResearchId(null);
            setDeniedTrackId(null);
            return;
        }
        if (tutorialStep === 15 || tutorialStep === 30 || tutorialStep === 31 || tutorialStep === 32) {
            setSelectedTrackId('era');
        }
    }, [isOpen, tutorialStep]);

    useEffect(() => {
        if (pendingResearchId != null) confirmButtonRef.current?.focus();
    }, [pendingResearchId]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (pendingResearchId != null) setPendingResearchId(null);
            else onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, pendingResearchId]);

    useEffect(() => () => {
        if (deniedTimeoutRef.current != null) window.clearTimeout(deniedTimeoutRef.current);
    }, []);

    if (!isOpen) return null;

    const detailDescSymbols = selectedDisplayStage?.upgradeId === ANCIENT_SYMBOLS_UNLOCK_UPGRADE_ID
        ? buildAncientSymbolsUnlockDescSymbols(leaderId, leaderProgressLevel)
        : selectedUpgrade?.descSymbols ?? [];
    const selectedCanResearch = canResearchTrack(selectedTrack);
    const selectedStatus = getTrackStatus(selectedTrack);
    const selectedTrackName = getTrackName(selectedTrack, language);
    const selectedUpgradeTitle = getUpgradeTitle(selectedTrack, selectedRank, language);
    const selectedDisplayTitle = getUpgradeTitle(
        selectedTrack,
        selectedNextStage ? selectedRank + 1 : selectedRank,
        language,
    );
    const pendingTrack = pendingResearchId == null
        ? null
        : KNOWLEDGE_UPGRADE_TRACKS.find((track) =>
            track.stages.some((stage) => stage.upgradeId === pendingResearchId),
        ) ?? null;
    const pendingStageIndex = pendingTrack && pendingResearchId != null
        ? pendingTrack.stages.findIndex((stage) => stage.upgradeId === pendingResearchId)
        : -1;
    const pendingUpgradeTitle = pendingTrack && pendingStageIndex >= 0
        ? getUpgradeTitle(pendingTrack, pendingStageIndex + 1, language)
        : selectedDisplayTitle;

    return (
        <div
            className="knowledge-upgrades-overlay knowledge-tracks-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="knowledge-upgrades-title"
        >
            <header className="knowledge-upgrades-header">
                <button
                    type="button"
                    className="knowledge-upgrades-back-btn relic-shop-back-btn knowledge-return-hotzone"
                    onClick={onClose}
                >
                    <span aria-hidden>‹</span>
                    {t('game.back', language)}
                </button>
                <div className="knowledge-upgrades-title-block">
                    <h1 id="knowledge-upgrades-title">{t('knowledgeTrack.title', language)}</h1>
                </div>
                <div
                    className={`knowledge-upgrades-points ${levelUpResearchPoints > 0 ? 'knowledge-upgrades-points--available' : ''}`}
                    aria-label={`${t('game.levelUpResearchPointsLabel', language)}: ${levelUpResearchPoints}`}
                >
                    <img src={KNOWLEDGE_RESOURCE_ICON_URL} alt="" draggable={false} />
                    <span className="knowledge-upgrades-points-label">{t('game.levelUpResearchPointsLabel', language)}</span>
                    <strong>{levelUpResearchPoints}</strong>
                </div>
            </header>

            <main className="knowledge-tracks-page">
                <section className="knowledge-tracks-browser" aria-label={t('knowledgeTrack.fields', language)}>
                    <div className="knowledge-upgrades-tree-scroll knowledge-track-grid">
                        {KNOWLEDGE_UPGRADE_TRACKS.map((track) => {
                            const rank = upgradeLevels[track.id];
                            const nextStage = getNextKnowledgeUpgradeTrackStage(track.id, upgradeLevels);
                            const iconUpgrade = KNOWLEDGE_UPGRADES[track.stages[0]!.upgradeId];
                            const spriteUrl = resolveUpgradeSprite(iconUpgrade?.sprite);
                            const isSelected = selectedTrack.id === track.id;
                            const isComplete = nextStage == null;
                            const upgradeTitle = getUpgradeTitle(track, rank, language);
                            return (
                                <button
                                    key={track.id}
                                    type="button"
                                    className={[
                                        'knowledge-track-card',
                                        `knowledge-upgrade-track--${track.id}`,
                                        track.id === 'era' ? 'knowledge-upgrade-chip--ancient-era' : '',
                                        isSelected ? 'knowledge-track-card--selected' : '',
                                        isComplete ? 'knowledge-track-card--complete' : '',
                                        deniedTrackId === track.id ? 'knowledge-upgrade-chip--denied' : '',
                                    ].filter(Boolean).join(' ')}
                                    style={{ '--knowledge-track-accent': TRACK_ACCENTS[track.id] } as CSSProperties}
                                    aria-pressed={isSelected}
                                    aria-label={`${upgradeTitle}, ${getTrackStatus(track)}`}
                                    onClick={(event) => handleTrackClick(track, event)}
                                >
                                    <span className="knowledge-track-card-icon" aria-hidden>
                                        {spriteUrl && <img src={spriteUrl} alt="" draggable={false} />}
                                    </span>
                                    <span className="knowledge-track-card-copy">
                                        <span className="knowledge-track-card-name">{upgradeTitle}</span>
                                    </span>
                                    <span className="knowledge-track-card-progress" aria-hidden>
                                        {track.stages.map((stage, stageIndex) => (
                                            <span
                                                key={stage.upgradeId}
                                                className={stageIndex < rank ? 'is-complete' : ''}
                                                style={stageIndex < rank ? { backgroundColor: '#91ad8b' } : undefined}
                                            />
                                        ))}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <aside
                    className="knowledge-track-detail"
                    style={{ '--knowledge-track-accent': TRACK_ACCENTS[selectedTrack.id] } as CSSProperties}
                    aria-live="polite"
                >
                    <div className="knowledge-track-detail-scroll">
                        <div className="knowledge-track-detail-heading">
                            <div className="knowledge-track-detail-icon" aria-hidden>
                                {selectedSpriteUrl && <img src={selectedSpriteUrl} alt="" draggable={false} />}
                            </div>
                            <div>
                                <h2>{selectedUpgradeTitle}</h2>
                            </div>
                        </div>

                        {selectedUpgrade && (
                            <section className="knowledge-track-next-stage">
                                <div className="knowledge-track-next-stage-heading">
                                    <span>{selectedNextStage ? t('knowledgeTrack.nextStage', language) : t('knowledgeTrack.lastStage', language)}</span>
                                    <strong>{selectedDisplayTitle}</strong>
                                    <small>Lv.{selectedDisplayStage?.requiredLevel}</small>
                                </div>
                                <div className="knowledge-track-effect-copy">
                                    {(t(`knowledgeUpgrade.${selectedUpgrade.id}.desc`, language) || selectedUpgrade.description)
                                        .split('\n')
                                        .map((line, index) => (
                                            <div key={`${selectedUpgrade.id}-${index}`}><EffectText text={line} /></div>
                                        ))}
                                </div>
                                {detailDescSymbols.length > 0 && (
                                    <div className="knowledge-upgrade-desc-symbols-area">
                                        <UpgradeCardDescSymbols
                                            upgradeId={selectedUpgrade.id}
                                            entries={detailDescSymbols}
                                            layoutSize="panel"
                                        />
                                    </div>
                                )}
                                {(selectedUpgrade.descRelics?.length ?? 0) > 0 && (
                                    <div className="knowledge-upgrade-detail-relics">
                                        <UpgradeCardDescRelics entries={selectedUpgrade.descRelics ?? []} layoutSize="panel" />
                                    </div>
                                )}
                            </section>
                        )}
                    </div>

                    {selectedNextStage ? (
                        <button
                            type="button"
                            className="knowledge-upgrade-docked-research-btn"
                            disabled={!selectedCanResearch}
                            onClick={() => requestResearch(selectedTrack)}
                        >
                            <span>{selectedStatus}</span>
                            {selectedCanResearch && (
                                <span className="knowledge-upgrade-research-cost">
                                    <img src={KNOWLEDGE_RESOURCE_ICON_URL} alt="" /> 1
                                </span>
                            )}
                        </button>
                    ) : (
                        <div className="knowledge-upgrade-researched-banner">{t('knowledgeTrack.status.complete', language)}</div>
                    )}
                </aside>
            </main>

            <div className="knowledge-upgrade-screenreader-status" aria-live="assertive">
                {deniedTrackId ? getTrackStatus(KNOWLEDGE_UPGRADE_TRACKS.find((track) => track.id === deniedTrackId)!) : ''}
            </div>

            {pendingResearchId != null && (
                <div
                    className="knowledge-research-confirm-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="knowledge-research-confirm-message"
                    onMouseDown={() => setPendingResearchId(null)}
                >
                    <div className="knowledge-research-confirm-panel" onMouseDown={(event) => event.stopPropagation()}>
                        <div id="knowledge-research-confirm-message" className="settings-confirm-message knowledge-research-confirm-message">
                            {t('knowledgeTrack.researchConfirmMessage', language)
                                .replace('{field}', selectedTrackName)
                                .replace('{stage}', pendingUpgradeTitle)}
                        </div>
                        <div className="settings-confirm-actions">
                            <button
                                ref={confirmButtonRef}
                                type="button"
                                className="settings-confirm-btn knowledge-research-confirm-btn"
                                onClick={confirmResearch}
                            >
                                {t('knowledgeUpgrade.researchConfirm', language)}
                            </button>
                            <button
                                type="button"
                                className="settings-confirm-btn settings-confirm-btn--cancel"
                                onClick={() => setPendingResearchId(null)}
                            >
                                {t('knowledgeUpgrade.researchCancel', language)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeUpgradesOverlay;
