import { create } from 'zustand';
import type { LeaderId } from '../data/leaders';
import { useGameStore } from './gameStore';

export type PreGameScreen = 'intro' | 'stage' | 'leader' | null;

interface PreGameState {
  screen: PreGameScreen;
  selectedStageId: number | null;
  selectedLeaderId: LeaderId | null;

  proceedToStageSelect: () => void;
  selectStage: (stageId: number) => void;
  selectLeader: (leaderId: LeaderId) => void;
  exitPreGame: () => void;
  /** 게임오버/승리 후 재진입: 난이도(스테이지) 선택 화면으로 */
  returnToStageSelect: () => void;
}

export const usePreGameStore = create<PreGameState>((set, get) => ({
  screen: 'intro',
  selectedStageId: null,
  selectedLeaderId: null,

  proceedToStageSelect: () => {
    set({ screen: 'stage' });
  },

  selectStage: (stageId) => {
    set({ selectedStageId: stageId, screen: 'leader' });
  },

  selectLeader: (leaderId) => {
    const stageId = get().selectedStageId;
    if (stageId == null) return;
    useGameStore.getState().startGameWithDraft([], leaderId, stageId);
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
