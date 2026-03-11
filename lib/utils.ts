import { TURKISH_LETTERS } from "./constants";

// =============================================
// ROOM UTILITIES
// =============================================

/** Generate a random 6-character room code */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

/** Generate a random Turkish letter from pool */
export function randomLetter(pool: string[] = [...TURKISH_LETTERS], usedLetters: string[] = []): string {
  const available = pool.filter((l) => !usedLetters.includes(l));
  if (available.length === 0) return pool[Math.floor(Math.random() * pool.length)];
  return available[Math.floor(Math.random() * available.length)];
}

// =============================================
// TURKISH LETTER NORMALIZATION
// =============================================

/** Normalize Turkish letters for comparison (q→k, x→ks etc.) */
export function normalizeTurkish(str: string): string {
  return str
    .toUpperCase()
    .replace(/Q/g, "K")
    .replace(/X/g, "KS")
    .replace(/W/g, "V")
    .trim();
}

/** Check if answer starts with given letter (Turkish-aware) */
export function startsWithLetter(answer: string, letter: string): boolean {
  const normalized = normalizeTurkish(answer);
  const equiv: Record<string, string[]> = {
    U: ["U", "Ü"],
    I: ["I", "İ"],
    O: ["O", "Ö"],
    C: ["C", "Ç"],
    S: ["S", "Ş"],
    G: ["G", "Ğ"],
  };
  const candidates = equiv[letter] ?? [letter];
  return candidates.some((c) => normalized.startsWith(c));
}

// =============================================
// COLOR PALETTE FOR PLAYERS
// =============================================
const PLAYER_COLORS = [
  "#7c3aed", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6",
];

export function getPlayerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

// =============================================
// TIME UTILITIES
// =============================================
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}`;
}

// =============================================
// CLASSNAME UTILITY (lightweight clsx alternative)
// =============================================
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// =============================================
// UNIQUE ID
// =============================================
export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
