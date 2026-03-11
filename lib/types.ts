// lib/types.ts — Uygulama genelinde kullanılan tip tanımları

// =============================================
// PLAYER TYPES
// =============================================
export interface Player {
  id: string;
  nick: string;
  isHost: boolean;
  isReady: boolean;
  totalScore: number;
  roundScores: number[];
  color: string; // Unique avatar color
}

// =============================================
// ROOM TYPES
// =============================================
export interface RoomSettings {
  roundDuration: number;
  totalRounds: number;
  maxPlayers: number;
  letterPool: string[];
  categories: string[];
  isPrivate: boolean;
  password: string;
}

export interface Room {
  id: string;
  code: string; // 6-char join code e.g. "ABC123"
  hostId: string;
  players: Player[];
  settings: RoomSettings;
  currentPhase: "lobby" | "playing" | "evaluating" | "results" | "finished";
  currentLetter: string | null;
  currentRound: number;
  totalRounds: number;
  usedLetters: string[];
  // Redis'te saklanan geçici alanlar
  answers?: Record<string, Record<string, string>>; // playerId → CategoryAnswers
  evaluation?: EvaluationResult | null;
}

// =============================================
// ANSWERS TYPES
// =============================================
export type CategoryAnswers = Record<string, string>; // category -> answer
export type PlayerAnswers = Record<string, CategoryAnswers>; // playerId -> answers

// =============================================
// AI EVALUATION TYPES (Zod validated)
// =============================================
export interface CategoryScore {
  puan: number;
  gerekce: string;
}

export interface PlayerEvaluation {
  nick: string;
  puanlar: Record<string, CategoryScore>;
  toplam: number;
}

export interface EvaluationResult {
  degerlendirme: PlayerEvaluation[];
}

// Gemini input format
export interface GeminiInput {
  tur_harfi: string;
  kategoriler: string[];
  kullanicilar: Array<{
    nick: string;
    cevaplar: CategoryAnswers;
  }>;
}

// =============================================
// GAME STATE TYPES
// =============================================
export interface RoundResult {
  round: number;
  letter: string;
  answers: PlayerAnswers;
  evaluation: EvaluationResult;
}

export interface GameState {
  room: Room | null;
  localPlayer: Player | null;
  answers: CategoryAnswers; // local player's current round answers
  roundResults: RoundResult[];
  timeLeft: number;
  isConnected: boolean;
}

// =============================================
// UI TYPES
// =============================================
export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}
