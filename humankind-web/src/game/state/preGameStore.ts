import { create } from 'zustand';
import type { LeaderId } from '../data/leaders';
import { useGameStore } from './gameStore';
import { hasSavedGame as hasSavedGameInStorage, loadSavedGamePatch } from './saveGame';
import { beginGameLifecycle } from './gameLifecycleRun';

export type PreGameScreen = 'intro' | 'leader' | 'leaderProgress' | null;
export type LeaderProgressBackTarget = 'intro' | 'leader';

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
  selectedLeaderId: LeaderId | null;
  leaderProgressInitialLeaderId: LeaderId | null;
  leaderProgressBackTarget: LeaderProgressBackTarget;
  hasCompletedTutorial: boolean;

  proceedToLeaderSelect: () => void;
  proceedToLeaderProgress: (options?: {
    initialLeaderId?: LeaderId | null;
    backTarget?: LeaderProgressBackTarget;
  }) => void;
  returnToIntro: () => void;
  selectLeader: (leaderId: LeaderId) => void;
  exitPreGame: () => void;
  returnToLeaderSelect: () => void;
  skipIntroToDefaults: () => void;
  hasSavedGame: () => boolean;
  continueSavedGame: () => boolean;
  completeTutorial: () => void;
  startTutorial: () => void;
  resetPreGameProgress: () => void;
}

export const usePreGameStore = create<PreGameState>((set, get) => ({
  screen: 'intro',
  selectedLeaderId: null,
  leaderProgressInitialLeaderId: null,
  leaderProgressBackTarget: 'intro',
  hasCompletedTutorial: loadTutorialCompleted(),

  proceedToLeaderSelect: () => {
    if (!get().hasCompletedTutorial) return;
    set({
      screen: 'leader',
      leaderProgressInitialLeaderId: null,
      leaderProgressBackTarget: 'intro',
    });
  },

  proceedToLeaderProgress: (options) => {
    set({
      screen: 'leaderProgress',
      leaderProgressInitialLeaderId: options?.initialLeaderId ?? null,
      leaderProgressBackTarget: options?.backTarget ?? 'intro',
    });
  },

  returnToIntro: () => {
    set({
      screen: 'intro',
      selectedLeaderId: null,
      leaderProgressInitialLeaderId: null,
      leaderProgressBackTarget: 'intro',
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
      leaderProgressInitialLeaderId: null,
      leaderProgressBackTarget: 'intro',
    });
  },

  returnToLeaderSelect: () => {
    set({
      screen: 'leader',
      selectedLeaderId: null,
      leaderProgressInitialLeaderId: null,
      leaderProgressBackTarget: 'intro',
    });
  },

  skipIntroToDefaults: () => {
    if (!get().hasCompletedTutorial) return;
    useGameStore.getState().startGameWithDraft([], 'shihuang');
    set({
      screen: null,
      selectedLeaderId: null,
      leaderProgressInitialLeaderId: null,
      leaderProgressBackTarget: 'intro',
    });
  },

  hasSavedGame: () => hasSavedGameInStorage(),

  continueSavedGame: () => {
    if (!get().hasCompletedTutorial) return false;
    const savedGamePatch = loadSavedGamePatch();
    if (!savedGamePatch) return false;
    beginGameLifecycle();
    useGameStore.setState(savedGamePatch);
    set({
      screen: null,
      selectedLeaderId: null,
      leaderProgressInitialLeaderId: null,
      leaderProgressBackTarget: 'intro',
    });
    return true;
  },

  completeTutorial: () => {
    saveTutorialCompleted();
    set({ hasCompletedTutorial: true });
  },

  startTutorial: () => {
    saveTutorialCompleted();
    useGameStore.getState().startTutorialGame();
    set({
      screen: null,
      selectedLeaderId: null,
      leaderProgressInitialLeaderId: null,
      leaderProgressBackTarget: 'intro',
      hasCompletedTutorial: true,
    });
  },

  resetPreGameProgress: () => {
    clearTutorialCompleted();
    set({
      screen: 'intro',
      selectedLeaderId: null,
      leaderProgressInitialLeaderId: null,
      leaderProgressBackTarget: 'intro',
      hasCompletedTutorial: false,
    });
  },
}));
