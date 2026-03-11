import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Room, Player, CategoryAnswers, RoundResult, Toast, EvaluationResult } from "@/lib/types";
import { uid } from "@/lib/utils";

// =============================================
// GAME STORE
// =============================================
interface GameStore {
  // State
  room: Room | null;
  localPlayer: Player | null;
  answers: CategoryAnswers;
  roundResults: RoundResult[];
  evaluationResult: EvaluationResult | null;
  roundData: any | null;
  timeLeft: number;
  isConnected: boolean;
  isEvaluating: boolean;

  // Toast notifications
  toasts: Toast[];

  // Actions
  setRoom: (room: Room | null) => void;
  updateRoom: (partial: Partial<Room>) => void;
  setLocalPlayer: (player: Player | null) => void;
  setAnswer: (category: string, value: string) => void;
  clearAnswers: () => void;
  addRoundResult: (result: RoundResult) => void;
  setEvaluationResult: (result: EvaluationResult | null) => void;
  setRoundData: (data: any | null) => void;
  setTimeLeft: (time: number) => void;
  setIsConnected: (connected: boolean) => void;
  setIsEvaluating: (evaluating: boolean) => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  reset: () => void;
}

const initialState = {
  room: null,
  localPlayer: null,
  answers: {},
  roundResults: [],
  evaluationResult: null,
  roundData: null,
  timeLeft: 0,
  isConnected: false,
  isEvaluating: false,
  toasts: [],
};

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setRoom: (room) => set({ room }),

    updateRoom: (partial) =>
      set((state) => ({
        room: state.room ? { ...state.room, ...partial } : null,
      })),

    setLocalPlayer: (localPlayer) => set({ localPlayer }),

    setAnswer: (category, value) =>
      set((state) => ({
        answers: { ...state.answers, [category]: value },
      })),

    clearAnswers: () => set({ answers: {} }),

    addRoundResult: (result) =>
      set((state) => ({
        roundResults: [...state.roundResults, result],
      })),

    setEvaluationResult: (evaluationResult) => set({ evaluationResult }),

    setRoundData: (roundData) => set({ roundData }),

    setTimeLeft: (timeLeft) => set({ timeLeft }),

    setIsConnected: (isConnected) => set({ isConnected }),

    setIsEvaluating: (isEvaluating) => set({ isEvaluating }),

    addToast: (toast) => {
      const id = uid();
      set((state) => ({
        toasts: [...state.toasts, { ...toast, id }],
      }));
      // Auto-remove after duration
      const duration = toast.duration ?? 4000;
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    },

    removeToast: (id) =>
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      })),

    reset: () => set(initialState),
  }))
);

// Convenience selectors
export const selectRoom = (s: GameStore) => s.room;
export const selectLocalPlayer = (s: GameStore) => s.localPlayer;
export const selectAnswers = (s: GameStore) => s.answers;
export const selectTimeLeft = (s: GameStore) => s.timeLeft;
export const selectIsEvaluating = (s: GameStore) => s.isEvaluating;
export const selectToasts = (s: GameStore) => s.toasts;
