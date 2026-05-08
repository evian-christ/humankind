import { create } from 'zustand';
import type { LeaderId } from '../data/leaders';
import { useGameStore } from './gameStore';
import { hasSavedGame as hasSavedGameInStorage, loadSavedGamePatch } from './saveGame';

export type PreGameScreen = 'intro' | 'leader' | null;

interface PreGameState {
  screen: PreGameScreen;
  selectedLeaderId: LeaderId | null;

  proceedToLeaderSelect: () => void;
  returnToIntro: () => void;
  selectLeader: (leaderId: LeaderId) => void;
  exitPreGame: () => void;
  returnToLeaderSelect: () => void;
  skipIntroToDefaults: () => void;
  hasSavedGame: () => boolean;
  continueSavedGame: () => boolean;
}

export const usePreGameStore = create<PreGameState>((set, get) => ({
  screen: 'intro',
  selectedLeaderId: null,

  proceedToLeaderSelect: () => {
    set({ screen: 'leader' });
  },

  returnToIntro: () => {
    set({
      screen: 'intro',
      selectedLeaderId: null,
    });
  },

  selectLeader: (leaderId) => {
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
    useGameStore.getState().startGameWithDraft([], 'shihuang');
    set({
      screen: null,
      selectedLeaderId: null,
    });
  },

  hasSavedGame: () => hasSavedGameInStorage(),

  continueSavedGame: () => {
    const savedGamePatch = loadSavedGamePatch();
    if (!savedGamePatch) return false;
    useGameStore.setState(savedGamePatch);
    set({
      screen: null,
      selectedLeaderId: null,
    });
    return true;
  },
}));
