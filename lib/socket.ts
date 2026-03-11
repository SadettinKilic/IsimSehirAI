// lib/socket.ts — Socket.io Client Singleton
// Tüm bileşenler bu modülü import ederek aynı bağlantıyı paylaşır.
// Next.js SSR ortamında güvenli çalışır (istemci tarafında başlatılır).

import { io, Socket } from "socket.io-client";
import type { Room, EvaluationResult } from "./types";

// ============================================================
// EVENT TYPES — Sunucu → İstemci
// ============================================================
export interface ServerToClientEvents {
  room_updated: (room: Room) => void;

  // Oyun olayları
  round_started: (data: {
    letter: string;
    round: number;
    totalRounds: number;
    duration: number;
    categories: string[];
  }) => void;

  round_complete: (data: {
    letter: string;
    round: number;
    kullanicilar: Array<{ nick: string; cevaplar: Record<string, string> }>;
    categories: string[];
  }) => void;

  round_results: (data: {
    evaluation: EvaluationResult;
    players: Room["players"];
    nextRound: number;
  }) => void;

  game_over: (data: {
    evaluation: EvaluationResult;
    players: Room["players"];
  }) => void;
}

// ============================================================
// EVENT TYPES — İstemci → Sunucu
// ============================================================
export interface ClientToServerEvents {
  create_room: (
    data: { player: { id: string; nick: string; isReady: boolean; totalScore: number; roundScores: number[] }; settings: Partial<Room["settings"]> },
    callback: (res: { success: boolean; room?: Room; error?: string }) => void
  ) => void;

  join_room: (
    data: { code: string; player: { id: string; nick: string; isReady: boolean; totalScore: number; roundScores: number[] }; password?: string },
    callback: (res: { success: boolean; room?: Room; error?: string }) => void
  ) => void;

  start_game: (
    data: { code: string; playerId: string },
    callback: (res: { success: boolean; letter?: string; round?: number; error?: string }) => void
  ) => void;

  submit_answers: (
    data: { code: string; playerId: string; answers: Record<string, string> },
    callback: (res: { success: boolean; error?: string }) => void
  ) => void;

  scores_updated: (data: {
    code: string;
    evaluation: EvaluationResult;
    playerScores: Array<{ nick: string; score: number }>;
  }) => void;
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(
      // Aynı origin'de çalışır (Custom Server sayesinde port çakışması yok)
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
      {
        // Önce HTTP long-polling ile bağlan, ardından WebSocket'e yükselt.
        transports: ["polling", "websocket"],
        autoConnect: false, // Manuel bağlan (useSocket hook'u kontrol eder)
      }
    );
  }
  return socket;
}
