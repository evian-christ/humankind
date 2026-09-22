import { create } from 'zustand';
import { useGameStore } from './gameStore';
import { isCompleteSymbolSetDeck, OWNED_SYMBOL_SET_IDS, type SymbolSetId } from '../data/symbolSets';
import { hasSavedGame as hasSavedGameInStorage, loadSavedGamePatch } from './saveGame';
import { beginGameLifecycle } from './gameLifecycleRun';

export type PreGameScreen = 'intro' | 'difficulty' | null;

const TUTORIAL_COMPLETED_KEY = 'humankind.tutorial.completed.v1';

const storage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const loadTutorialCompleted = (): boolean => {
  const store = storage();
  if (!store) return hasSavedGameInStorage();
  return store.getItem(TUTORIAL_COMPLETED_KEY) === 'true' || hasSavedGameInStorage();
};

const saveTutorialCompleted = (): void => {
  storage()?.setItem(TUTORIAL_COMPLETED_KEY, 'true');
};

export const clearTutorialCompleted = (): void => {
  storage()?.removeItem(TUTORIAL_COMPLETED_KEY);
};

interface PreGameState {
  screen: PreGameScreen;
  hasCompletedTutorial: boolean;

  proceedToDifficultySelect: () => void;
  returnToIntro: () => void;
  startGame: (symbolSetIds: readonly SymbolSetId[]) => void;
  exitPreGame: () => void;
  skipIntroToDefaults: () => void;
  hasSavedGame: () => boolean;
  continueSavedGame: () => boolean;
  completeTutorial: () => void;
  startTutorial: () => void;
  resetPreGameProgress: () => void;
}

export const usePreGameStore = create<PreGameState>((set, get) => ({
  screen: 'intro',
  hasCompletedTutorial: loadTutorialCompleted(),

  proceedToDifficultySelect: () => {
    if (!get().hasCompletedTutorial) return;
    set({ screen: 'difficulty' });
  },

  returnToIntro: () => {
    set({ screen: 'intro' });
  },

  startGame: (symbolSetIds) => {
    if (!get().hasCompletedTutorial) return;
    if (!isCompleteSymbolSetDeck(symbolSetIds)) return;
    if (symbolSetIds.some((id) => !OWNED_SYMBOL_SET_IDS.includes(id))) return;
    useGameStore.getState().startGameWithDraft([], symbolSetIds);
    get().exitPreGame();
  },

  exitPreGame: () => {
    set({ screen: null });
  },

  skipIntroToDefaults: () => {
    if (!get().hasCompletedTutorial) return;
    set({ screen: 'difficulty' });
  },

  hasSavedGame: () => hasSavedGameInStorage(),

  continueSavedGame: () => {
    if (!get().hasCompletedTutorial) return false;
    const savedGamePatch = loadSavedGamePatch();
    if (!savedGamePatch) return false;
    beginGameLifecycle();
    useGameStore.setState(savedGamePatch);
    set({ screen: null });
    return true;
  },

  completeTutorial: () => {
    saveTutorialCompleted();
    set({ hasCompletedTutorial: true });
  },

  startTutorial: () => {
    saveTutorialCompleted();
    useGameStore.getState().startTutorialGame();
    set({ screen: null, hasCompletedTutorial: true });
  },

  resetPreGameProgress: () => {
    clearTutorialCompleted();
    set({ screen: 'intro', hasCompletedTutorial: false });
  },
}));
