"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { GlassPanel, Button, Badge } from "@/components/ui";
import { useGameStore } from "@/store/gameStore";
import { getSocket } from "@/lib/socket";
import { evaluateRound } from "@/app/actions/evaluate";
import type { CategoryAnswers, EvaluationResult, GeminiInput } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// TIMER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function CountdownTimer({
  duration,
  onTimeUp,
}: {
  duration: number;
  onTimeUp: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const cbRef = useRef(onTimeUp);
  cbRef.current = onTimeUp;

  useEffect(() => {
    if (timeLeft <= 0) {
      cbRef.current();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const pct = (timeLeft / duration) * 100;
  const isWarning = timeLeft <= 10;
  const isCritical = timeLeft <= 5;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-24 h-24">
        {/* SVG ring */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke={isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#7c3aed"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
          />
        </svg>
        {/* Number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            key={timeLeft}
            initial={{ scale: 1.3, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-3xl font-black font-display tabular-nums ${
              isCritical ? "text-red-400" : isWarning ? "text-yellow-400" : "text-white"
            }`}
          >
            {timeLeft}
          </motion.span>
        </div>
      </div>
      <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">Süre</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LETTER REVEAL ANIMATION
// ─────────────────────────────────────────────────────────────────────────────
function LetterReveal({ letter }: { letter: string }) {
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0, rotateY: 180 }}
      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
      className="flex flex-col items-center gap-2"
    >
      <span className="text-xs font-semibold tracking-widest uppercase text-white/40">Tur Harfi</span>
      <div
        className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.4) 0%, rgba(6,182,212,0.3) 100%)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 0 40px rgba(124,58,237,0.4), inset 0 1px 1px rgba(255,255,255,0.15)",
        }}
      >
        <span
          className="text-6xl font-black font-display"
          style={{
            background: "linear-gradient(135deg, #a78bfa, #67e8f9)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {letter}
        </span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANSWER FORM
// ─────────────────────────────────────────────────────────────────────────────
function AnswerForm({
  categories,
  letter,
  answers,
  onChange,
  onSubmit,
  isSubmitted,
}: {
  categories: string[];
  letter: string;
  answers: CategoryAnswers;
  onChange: (cat: string, val: string) => void;
  onSubmit: () => void;
  isSubmitted: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {categories.map((cat) => (
        <div key={cat} className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-widest uppercase text-white/50 pl-1">
            {cat}
          </label>
          <input
            type="text"
            disabled={isSubmitted}
            value={answers[cat] ?? ""}
            placeholder={`${letter} ile başlayan ${cat.toLowerCase()}...`}
            autoComplete="off"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => onChange(cat, e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl text-white placeholder-white/25 font-medium
              bg-white/5 border border-white/10 outline-none
              focus:border-violet-400/60 focus:bg-white/8 focus:ring-2 focus:ring-violet-400/20
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200"
          />
        </div>
      ))}

      {!isSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="primary"
            onClick={onSubmit}
            className="w-full py-4 mt-2"
          >
            Cevapları Gönder
          </Button>
        </motion.div>
      )}

      {isSubmitted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center text-white/60 py-4 text-sm font-medium flex items-center justify-center gap-2"
        >
          <span className="text-green-400 text-lg">✓</span>
          Cevaplar gönderildi — diğer oyuncular bekleniyor...
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function GamePage() {
  const router = useRouter();
  const { room, localPlayer, roundData } = useGameStore();
  const [gameState, setGameState] = useState<"waiting" | "playing" | "evaluating">("waiting");
  const [currentLetter, setCurrentLetter] = useState<string>("");
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(5);
  const [duration, setDuration] = useState(60);
  const [categories, setCategories] = useState<string[]>([]);
  const [answers, setAnswers] = useState<CategoryAnswers>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [waitingCount, setWaitingCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(1);

  // Eğer oda yoksa lobby'e gönder
  useEffect(() => {
    if (!room) {
      router.push("/lobby");
    }
  }, [room, router]);

  useEffect(() => {
    if (room) {
      setCategories(room.settings.categories);
      setTotalRounds(room.totalRounds);
      setTotalPlayers(room.players.length);
    }
  }, [room]);

  useEffect(() => {
    if (roundData) {
      setCurrentLetter(roundData.letter);
      setCurrentRound(roundData.round);
      setTotalRounds(roundData.totalRounds);
      setDuration(roundData.duration ?? 60);
      setCategories(roundData.categories ?? categories);
      setAnswers({});
      setIsSubmitted(false);
      setGameState("playing");
      setWaitingCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundData]);

  // Socket event'larını dinle
  useEffect(() => {
    const socket = getSocket();

    socket.on("round_started", (data) => {
      setCurrentLetter(data.letter);
      setCurrentRound(data.round);
      setTotalRounds(data.totalRounds);
      setDuration(data.duration ?? 60);
      setCategories(data.categories ?? categories);
      setAnswers({});
      setIsSubmitted(false);
      setGameState("playing");
      setWaitingCount(0);
    });

    socket.on("round_complete", async (data) => {
      setGameState("evaluating");
      setIsEvaluating(true);

      // Sadece host AI değerlendirmesini çalıştır
      if (localPlayer?.isHost) {
        const input: GeminiInput = {
          tur_harfi: data.letter,
          kategoriler: data.categories ?? categories,
          kullanicilar: data.kullanicilar,
        };

        const res = await evaluateRound(input);
        if (res.success) {
          const playerScores = res.result.degerlendirme.map((p) => ({
            nick: p.nick,
            score: p.toplam,
          }));

          socket.emit("scores_updated", {
            code: room!.code,
            evaluation: res.result,
            playerScores,
          });
        }
      }
    });

    socket.on("round_results", (data) => {
      setIsEvaluating(false);
      // Results sayfasına git
        useGameStore.getState().setEvaluationResult(data.evaluation);
        useGameStore.getState().setRoom({ ...room!, players: data.players, currentPhase: "LOBBY" });
        router.push("/game/results");
    });

    socket.on("game_over", (data) => {
      setIsEvaluating(false);
        useGameStore.getState().setEvaluationResult(data.evaluation);
        useGameStore.getState().setRoom({ ...room!, players: data.players, currentPhase: "PODIUM" });
        router.push("/game/podium");
    });

    return () => {
      socket.off("round_started");
      socket.off("round_complete");
      socket.off("round_results");
      socket.off("game_over");
    };
  }, [room, localPlayer, categories, router]);

  const handleAnswerChange = useCallback((cat: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [cat]: val }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (isSubmitted || !room || !localPlayer?.id) return;
    setIsSubmitted(true);
    const socket = getSocket();
    socket.emit("submit_answers", { code: room.code, playerId: localPlayer.id, answers }, () => {});
  }, [isSubmitted, room, answers, localPlayer]);

  const handleTimeUp = useCallback(() => {
    if (!isSubmitted) handleSubmit();
  }, [isSubmitted, handleSubmit]);

  const handleStartGame = () => {
    if (!room?.code || !localPlayer?.id) return;
    const socket = getSocket();
    socket.emit("start_game", { code: room.code, playerId: localPlayer.id }, (res: { success: boolean; error?: string }) => {
      if (!res.success) {
        alert(res.error);
      }
    });
  };

  // ── WAITING STATE (lobby'den burada bekleniyor) ──
  if (gameState === "waiting") {
    return (
      <main className="relative min-h-[100dvh] w-full flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm flex flex-col items-center gap-8"
        >
          <div className="text-center">
            <h1 className="text-3xl font-black font-display text-white mb-2">Hazır mısınız?</h1>
            <p className="text-white/50">{room?.players.length ?? 1} oyuncu bağlı</p>
          </div>

          <GlassPanel className="p-8 w-full text-center" glow="primary" animate>
            <div className="flex flex-col gap-4">
              <p className="text-white/60 text-sm">
                Oda kodu: <span className="font-bold text-white">{room?.code}</span>
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {room?.settings.categories.map((c) => (
                  <Badge key={c} variant="primary" className="text-xs">{c}</Badge>
                ))}
              </div>
              {localPlayer?.isHost ? (
                <Button variant="primary" onClick={handleStartGame} className="mt-4 w-full py-4">
                  Oyunu Başlat
                </Button>
              ) : (
                <p className="text-white/40 text-sm mt-4">Host oyunu bekliyor...</p>
              )}
            </div>
          </GlassPanel>
        </motion.div>
      </main>
    );
  }

  // ── EVALUATING STATE ──
  if (gameState === "evaluating") {
    return (
      <main className="relative min-h-[100dvh] w-full flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-violet-500/30 border-t-violet-500"
          />
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Değerlendiriliyor...</h2>
            <p className="text-white/50 text-sm">AI hakem cevaplarınızı puanlandırıyor</p>
          </div>
        </motion.div>
      </main>
    );
  }

  // ── PLAYING STATE ──
  return (
    <main className="relative min-h-[100dvh] w-full flex flex-col items-center px-4 py-6 gap-6">
      {/* Header row */}
      <div className="w-full max-w-lg flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-white/40 uppercase tracking-widest">Tur</span>
          <span className="text-lg font-bold text-white">
            {currentRound} <span className="text-white/30">/ {totalRounds}</span>
          </span>
        </div>

        <CountdownTimer duration={duration} onTimeUp={handleTimeUp} />

        <div className="flex flex-col items-end">
          <span className="text-xs text-white/40 uppercase tracking-widest">Oyuncu</span>
          <span className="text-lg font-bold text-white">{localPlayer?.nick}</span>
        </div>
      </div>

      {/* Letter */}
      <LetterReveal letter={currentLetter} />

      {/* Answer form */}
      <div className="w-full max-w-lg">
        <GlassPanel className="p-6 sm:p-8" glow="primary" animate>
          <AnswerForm
            categories={categories}
            letter={currentLetter}
            answers={answers}
            onChange={handleAnswerChange}
            onSubmit={handleSubmit}
            isSubmitted={isSubmitted}
          />
        </GlassPanel>
      </div>

      {/* Players waiting count */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-white/40 text-xs"
          >
            Diğer oyuncular gönderene kadar bekleniyor...
          </motion.p>
        )}
      </AnimatePresence>
    </main>
  );
}
