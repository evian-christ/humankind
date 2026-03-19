import { create } from 'zustand';
import type { SymbolDefinition } from '../data/symbolDefinitions';
import { STAGES } from '../data/stages';
import type { LeaderId } from '../data/leaders';
import { useGameStore } from './gameStore';
import { useRelicStore } from './relicStore';
import { getLeaderStartingRelics } from '../data/leaders';

export type PreGameScreen = 'stage' | 'leader' | 'draft' | null;

interface PreGameState {
  screen: PreGameScreen;
  selectedStageId: number | null;
  selectedLeaderId: LeaderId | null;
  /** 선택한 심볼 ID 목록 (스킵 시 추가 안 함) */
  draftPicks: number[];
  /** 총 라운드 수 (6회 = 6번 선택 or 스킵) */
  draftTotal: number;
  /** 완료한 라운드 수 (선택 or 스킵 한 횟수) */
  draftRoundsCompleted: number;

  selectStage: (stageId: number) => void;
  selectLeader: (leaderId: LeaderId) => void;
  pickDraftSymbol: (symbolId: number) => void;
  skipDraftPick: () => void;
  setDraftChoices: (choices: SymbolDefinition[]) => void;
  exitPreGame: () => void;
  /** 드래프트 완료 시 게임 시작 */
  finishDraftAndStartGame: () => void;
}

export const usePreGameStore = create<PreGameState>((set, get) => ({
  screen: 'stage',
  selectedStageId: null,
  selectedLeaderId: null,
  draftPicks: [],
  draftTotal: 0,
  draftRoundsCompleted: 0,

  selectStage: (stageId) => {
    set({ selectedStageId: stageId, screen: 'leader' });
  },

  selectLeader: (leaderId) => {
    const stageId = get().selectedStageId;
    if (stageId == null) return;
    const stage = STAGES[stageId];
    const draftTotal = stage?.draftPickCount ?? 6;
    set({
      selectedLeaderId: leaderId,
      draftPicks: [],
      draftTotal,
      draftRoundsCompleted: 0,
      screen: 'draft',
    });
    // 드래프트 첫 선택지를 게임 스토어에 세팅 (phase = draft_selection)
    useGameStore.getState().enterDraftSelection();
  },

  pickDraftSymbol: (symbolId) => {
    const { draftPicks, draftTotal, draftRoundsCompleted, selectedLeaderId } = get();
    if (selectedLeaderId == null) return;
    const nextPicks = [...draftPicks, symbolId];
    const nextRounds = draftRoundsCompleted + 1;
    set({ draftPicks: nextPicks, draftRoundsCompleted: nextRounds });

    if (nextRounds >= draftTotal) {
      get().finishDraftAndStartGame();
    } else {
      useGameStore.getState().setSymbolChoicesForDraft();
    }
  },

  skipDraftPick: () => {
    const { draftTotal, draftRoundsCompleted, selectedLeaderId } = get();
    if (selectedLeaderId == null) return;
    const nextRounds = draftRoundsCompleted + 1;
    set({ draftRoundsCompleted: nextRounds });

    if (nextRounds >= draftTotal) {
      get().finishDraftAndStartGame();
    } else {
      useGameStore.getState().setSymbolChoicesForDraft();
    }
  },

  setDraftChoices: () => {
    useGameStore.getState().setSymbolChoicesForDraft();
  },

  exitPreGame: () => {
    set({
      screen: null,
      selectedStageId: null,
      selectedLeaderId: null,
      draftPicks: [],
      draftTotal: 0,
      draftRoundsCompleted: 0,
    });
  },

  finishDraftAndStartGame: () => {
    const { draftPicks, selectedLeaderId } = get();
    if (selectedLeaderId == null) return;
    useGameStore.getState().startGameWithDraft(draftPicks, selectedLeaderId);
    usePreGameStore.getState().exitPreGame();
  },
}));
