// =============================================
// GAME CONSTANTS
// =============================================

export const TURKISH_LETTERS = [
  "A", "B", "C", "Ç", "D", "E", "F", "G", "H",
  "I", "İ", "J", "K", "L", "M", "N", "O", "Ö",
  "P", "R", "S", "Ş", "T", "U", "Ü", "V", "Y", "Z",
] as const;

export type TurkishLetter = (typeof TURKISH_LETTERS)[number];

export const DEFAULT_CATEGORIES = [
  "İsim",
  "Şehir",
  "Hayvan",
  "Bitki",
  "Meslek",
  "Yiyecek",
  "Film",
  "Marka",
] as const;

export const DEFAULT_GAME_SETTINGS = {
  roundDuration: 60, // seconds
  maxPlayers: 8,
  letterPool: [...TURKISH_LETTERS],
  categories: [...DEFAULT_CATEGORIES],
  isPrivate: false,
  password: "",
} as const;

export const GAME_PHASES = {
  LOBBY: "LOBBY",
  COUNTDOWN: "COUNTDOWN",
  WRITING: "WRITING",
  EVALUATING: "EVALUATING",
  RESULTS: "RESULTS",
  PODIUM: "PODIUM",
} as const;

export type GamePhase = keyof typeof GAME_PHASES;

// Scoring rules
export const SCORES = {
  UNIQUE_CORRECT: 10,
  DUPLICATE_CORRECT: 5,
  WRONG: 0,
  EMPTY: 0,
} as const;

// Countdown warning threshold (seconds)
export const WARNING_THRESHOLD = 5;

// Socket events
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: "connect",
  DISCONNECT: "disconnect",

  // Room
  CREATE_ROOM: "create_room",
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  ROOM_CREATED: "room_created",
  ROOM_JOINED: "room_joined",
  ROOM_ERROR: "room_error",
  PLAYER_JOINED: "player_joined",
  PLAYER_LEFT: "player_left",

  // Game
  START_GAME: "start_game",
  GAME_STARTED: "game_started",
  LETTER_SELECTED: "letter_selected",
  SUBMIT_ANSWERS: "submit_answers",
  ANSWERS_SUBMITTED: "answers_submitted",
  EVALUATION_STARTED: "evaluation_started",
  EVALUATION_COMPLETE: "evaluation_complete",
  ROUND_RESULTS: "round_results",
  NEXT_ROUND: "next_round",
  END_GAME: "end_game",
  GAME_ENDED: "game_ended",
} as const;
