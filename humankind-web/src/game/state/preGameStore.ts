import { create } from 'zustand';
import type { LeaderId } from '../data/leaders';
import { useGameStore } from './gameStore';

export type PreGameScreen = 'stage' | 'leader' | null;

interface PreGameState {
  screen: PreGameScreen;
  selectedStageId: number | null;
  selectedLeaderId: LeaderId | null;

  selectStage: (stageId: number) => void;
  selectLeader: (leaderId: LeaderId) => void;
  exitPreGame: () => void;
  /** 게임오버/승리 후 재진입: 난이도(스테이지) 선택 화면으로 */
  returnToStageSelect: () => void;
}

export const usePreGameStore = create<PreGameState>((set, get) => ({
  screen: 'stage',
  selectedStageId: null,
  selectedLeaderId: null,

  selectStage: (stageId) => {
    set({ selectedStageId: stageId, screen: 'leader' });
  },

  selectLeader: (leaderId) => {
    if (get().selectedStageId == null) return;
    useGameStore.getState().startGameWithDraft([], leaderId);
    get().exitPreGame();
  },

  exitPreGame: () => {
    set({
      screen: null,
      selectedStageId: null,
      selectedLeaderId: null,
    });
  },

  returnToStageSelect: () => {
    set({
      screen: 'stage',
      selectedStageId: null,
      selectedLeaderId: null,
    });
  },
}));
