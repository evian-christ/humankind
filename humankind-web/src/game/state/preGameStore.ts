import { create } from 'zustand';
import type { LeaderId } from '../data/leaders';
import { useGameStore } from './gameStore';
import { hasSavedGame as hasSavedGameInStorage, loadSavedGamePatch } from './saveGame';

export type PreGameScreen = 'intro' | 'leader' | null;

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

interface PreGameState {
  screen: PreGameScreen;
  selectedLeaderId: LeaderId | null;
  hasCompletedTutorial: boolean;

  proceedToLeaderSelect: () => void;
  returnToIntro: () => void;
  selectLeader: (leaderId: LeaderId) => void;
  exitPreGame: () => void;
  returnToLeaderSelect: () => void;
  skipIntroToDefaults: () => void;
  hasSavedGame: () => boolean;
  continueSavedGame: () => boolean;
  completeTutorial: () => void;
  startTutorial: () => void;
}

export const usePreGameStore = create<PreGameState>((set, get) => ({
  screen: 'intro',
  selectedLeaderId: null,
  hasCompletedTutorial: loadTutorialCompleted(),

  proceedToLeaderSelect: () => {
    if (!get().hasCompletedTutorial) return;
    set({ screen: 'leader' });
  },

  returnToIntro: () => {
    set({
      screen: 'intro',
      selectedLeaderId: null,
    });
  },

  selectLeader: (leaderId) => {
    if (!get().hasCompletedTutorial) return;
    useGameStore.getState().startGameWithDraft([], leaderId);
    get().exitPreGame();
  },

  exitPreGame: () => {
    set({
      screen: null,
      selectedLeaderId: null,
    });
  },

  returnToLeaderSelect: () => {
    set({
      screen: 'leader',
      selectedLeaderId: null,
    });
  },

  skipIntroToDefaults: () => {
    if (!get().hasCompletedTutorial) return;
    useGameStore.getState().startGameWithDraft([], 'shihuang');
    set({
      screen: null,
      selectedLeaderId: null,
    });
  },

  hasSavedGame: () => hasSavedGameInStorage(),

  continueSavedGame: () => {
    if (!get().hasCompletedTutorial) return false;
    const savedGamePatch = loadSavedGamePatch();
    if (!savedGamePatch) return false;
    useGameStore.setState(savedGamePatch);
    set({
      screen: null,
      selectedLeaderId: null,
    });
    return true;
  },

  completeTutorial: () => {
    saveTutorialCompleted();
    set({ hasCompletedTutorial: true });
  },

  startTutorial: () => {
    useGameStore.getState().startTutorialGame();
    set({
      screen: null,
      selectedLeaderId: null,
    });
  },
}));
