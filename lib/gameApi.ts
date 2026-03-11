// lib/gameApi.ts — REST API client fonksiyonları
// Socket.io'nun yerini alır: tüm sunucu iletişimi fetch() üzerinden yapılır.

import type { Room } from "./types";

const base = "/api/room";

export interface PlayerData {
  id: string;
  nick: string;
  isReady: boolean;
  totalScore: number;
  roundScores: number[];
}

// ─────────────────────────────────────────────────────────────
// ODA OLUŞTUR
// ─────────────────────────────────────────────────────────────
export async function createRoom(
  player: PlayerData,
  settings: Partial<Room["settings"]>
): Promise<{ success: true; room: Room } | { success: false; error: string }> {
  const res = await fetch(`${base}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player, settings }),
  });
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// ODAYA KATIL
// ─────────────────────────────────────────────────────────────
export async function joinRoom(
  code: string,
  player: PlayerData,
  password?: string
): Promise<{ success: true; room: Room } | { success: false; error: string }> {
  const res = await fetch(`${base}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, player, password }),
  });
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// OYUNU BAŞLAT
// ─────────────────────────────────────────────────────────────
export async function startGame(
  code: string,
  playerId: string
): Promise<{ success: true; letter: string; round: number; room: Room } | { success: false; error: string }> {
  const res = await fetch(`${base}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, playerId }),
  });
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// CEVAP GÖNDER
// ─────────────────────────────────────────────────────────────
export async function submitAnswers(
  code: string,
  playerId: string,
  answers: Record<string, string>
): Promise<{
  success: boolean;
  phase: string;
  kullanicilar?: Array<{ nick: string; cevaplar: Record<string, string> }>;
  categories?: string[];
  letter?: string;
  error?: string;
}> {
  const res = await fetch(`${base}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, playerId, answers }),
  });
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// SKORLARI GÜNCELLE
// ─────────────────────────────────────────────────────────────
export async function updateScores(
  code: string,
  evaluation: unknown,
  playerScores: Array<{ nick: string; score: number }>
): Promise<{ success: boolean; phase: string; error?: string }> {
  const res = await fetch(`${base}/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, evaluation, playerScores }),
  });
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// ODA DURUMUNU AL (polling)
// ─────────────────────────────────────────────────────────────
export async function getRoomState(
  code: string
): Promise<{ success: true; room: Room } | { success: false; error: string }> {
  const res = await fetch(`${base}/${code}`, {
    cache: "no-store",
  });
  return res.json();
}
