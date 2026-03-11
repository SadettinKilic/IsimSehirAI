"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { GlassPanel, Button, Badge } from "@/components/ui";
import { useGameStore } from "@/store/gameStore";
import { submitAnswers, updateScores, getRoomState, startGame } from "@/lib/gameApi";
import { evaluateRound } from "@/app/actions/evaluate";
import type { CategoryAnswers, GeminiInput } from "@/lib/types";

type GameState = "waiting" | "playing" | "evaluating" | "round_over";

// ─────────────────────────────────────────────────────────────────────────────
// TIMER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function CountdownTimer({ duration, onTimeUp }: { duration: number; onTimeUp: () => void }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const cbRef = useRef(onTimeUp);
  cbRef.current = onTimeUp;

  useEffect(() => {
    if (timeLeft <= 0) { cbRef.current(); return; }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const pct = (timeLeft / duration) * 100;
  const isWarning = timeLeft <= 10;
  const isCritical = timeLeft <= 5;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke={isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#7c3aed"}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            key={timeLeft} initial={{ scale: 1.3, opacity: 0.7 }} animate={{ scale: 1, opacity: 1 }}
            className={`text-3xl font-black font-display tabular-nums ${isCritical ? "text-red-400" : isWarning ? "text-yellow-400" : "text-white"}`}
          >{timeLeft}</motion.span>
        </div>
      </div>
      <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">Süre</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LETTER REVEAL
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
      <div className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.4) 0%, rgba(6,182,212,0.3) 100%)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 0 40px rgba(124,58,237,0.4)" }}>
        <span className="text-6xl font-black font-display"
          style={{ background: "linear-gradient(135deg, #a78bfa, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          {letter}
        </span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANSWER FORM
// ─────────────────────────────────────────────────────────────────────────────
function AnswerForm({ categories, letter, answers, onChange, onSubmit, isSubmitted }: {
  categories: string[]; letter: string; answers: CategoryAnswers;
  onChange: (cat: string, val: string) => void; onSubmit: () => void; isSubmitted: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {categories.map((cat) => (
        <div key={cat} className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-widest uppercase text-white/50 pl-1">{cat}</label>
          <input
            type="text" disabled={isSubmitted} value={answers[cat] ?? ""}
            placeholder={`${letter} ile başlayan ${cat.toLowerCase()}...`}
            autoComplete="off" autoCapitalize="words" autoCorrect="off" spellCheck={false}
            onChange={(e) => onChange(cat, e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl text-white placeholder-white/25 font-medium bg-white/5 border border-white/10 outline-none focus:border-violet-400/60 focus:bg-white/8 focus:ring-2 focus:ring-violet-400/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          />
        </div>
      ))}
      {!isSubmitted && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Button variant="primary" onClick={onSubmit} className="w-full py-4 mt-2">Cevapları Gönder</Button>
        </motion.div>
      )}
      {isSubmitted && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center text-white/60 py-4 text-sm font-medium flex items-center justify-center gap-2">
          <span className="text-green-400 text-lg">✓</span>Cevaplar gönderildi — diğer oyuncular bekleniyor...
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

  const [gameState, setGameState] = useState<GameState>("waiting");
  const [currentLetter, setCurrentLetter] = useState("");
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(5);
  const [duration, setDuration] = useState(60);
  const [categories, setCategories] = useState<string[]>([]);
  const [answers, setAnswers] = useState<CategoryAnswers>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Refs — polling closure'da stale olmadan kullanmak için
  const gameStateRef = useRef<GameState>("waiting");
  const evaluatingRef = useRef(false);
  const navigatedRef = useRef(false); // double-navigate guard
  const localPlayerRef = useRef(localPlayer);
  localPlayerRef.current = localPlayer;

  const setGameStateSync = useCallback((s: GameState) => {
    gameStateRef.current = s;
    setGameState(s);
  }, []);

  // Eğer oda yoksa lobby'e gönder
  useEffect(() => { if (!room) router.push("/lobby"); }, [room, router]);

  // roundData store'dan (lobby → game geçişi)
  useEffect(() => {
    if (roundData) {
      setCurrentLetter(roundData.letter ?? "");
      setCurrentRound(roundData.round ?? 1);
      setTotalRounds(roundData.totalRounds ?? 5);
      setDuration(roundData.duration ?? 60);
      setCategories(roundData.categories ?? []);
      setAnswers({});
      setIsSubmitted(false);
      setGameStateSync("playing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundData]);

  // ─── Tek polling döngüsü — ref kullanarak re-render'dan etkilenmez ───
  useEffect(() => {
    if (!room?.code) return;
    const code = room.code;

    const poll = async () => {
      try {
        const res = await getRoomState(code);
        if (!res.success) return;
        const r = res.room;
        useGameStore.getState().setRoom(r);

        // Host kimliği: localPlayer.isHost güvenilmez, hostId ile karşılaştır
        const isHostPlayer = localPlayerRef.current?.id === r.hostId;
        const gs = gameStateRef.current;

        // ── "evaluating": host AI değerlendirmesi ──
        if (r.currentPhase === "evaluating" && gs === "playing" && !evaluatingRef.current) {
          evaluatingRef.current = true;
          setGameStateSync("evaluating");

          if (isHostPlayer && r.answers) {
            const kullanicilar = r.players.map((p) => ({
              nick: p.nick,
              cevaplar: r.answers?.[p.id] ?? {},
            }));
            const input: GeminiInput = {
              tur_harfi: r.currentLetter ?? "",
              kategoriler: r.settings.categories,
              kullanicilar,
            };

            let evalResult = null;
            let playerScores = r.players.map((p) => ({ nick: p.nick, score: 0 }));

            try {
              const evalRes = await evaluateRound(input);
              if (evalRes.success) {
                evalResult = evalRes.result;
                playerScores = evalRes.result.degerlendirme.map((p) => ({ nick: p.nick, score: p.toplam }));
              } else {
                console.warn("[Game] AI hata:", evalRes.error);
              }
            } catch (err) {
              console.error("[Game] evaluateRound exception:", err);
            }

            // Her durumda updateScores çağır — faza geçiş garantili
            await updateScores(code, evalResult, playerScores);
          }
        }

        // ── "results" (tur arası değerlendirme ekranı) ──
        if (r.currentPhase === "results" && gs === "evaluating") {
          useGameStore.getState().setEvaluationResult(r.evaluation || null);
          navigatedRef.current = true;
          router.push("/game/results");
          return;
        }

        // ── "lobby" (oyun bitti, tur arası falan kalırsa fallback, normalde kullanılmaz) ──
        if (r.currentPhase === "lobby" && gs === "evaluating") {
          setCurrentRound(r.currentRound);
          setTotalRounds(r.totalRounds);
          setGameStateSync("round_over");
          evaluatingRef.current = false; // Sonraki tur için sıfırla
        }

        // ── "playing" (sonraki tur başladı): yeni tur başlat ──
        if (r.currentPhase === "playing" && gs === "round_over") {
          setCurrentLetter(r.currentLetter ?? "");
          setCurrentRound(r.currentRound);
          setTotalRounds(r.totalRounds);
          setDuration(r.settings.roundDuration);
          setCategories(r.settings.categories);
          setAnswers({});
          setIsSubmitted(false);
          setGameStateSync("playing");
        }

        // ── "finished": podyuma git ──
        if (r.currentPhase === "finished" && !navigatedRef.current) {
          navigatedRef.current = true;
          router.push("/game/podium");
        }
      } catch {
        // sessizce devam et
      }
    };

    const timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  // room.code değişmediği sürece effect yeniden çalışmaz — ref'ler güncel tutar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code]);

  const handleAnswerChange = useCallback((cat: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [cat]: val }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitted || !room || !localPlayer?.id) return;
    setIsSubmitted(true);
    try { await submitAnswers(room.code, localPlayer.id, answers); } catch { /* ignore */ }
  }, [isSubmitted, room, answers, localPlayer]);

  const handleTimeUp = useCallback(() => {
    if (!isSubmitted) handleSubmit();
  }, [isSubmitted, handleSubmit]);

  const handleNextRound = async () => {
    if (!room?.code || !localPlayer?.id) return;
    await startGame(room.code, localPlayer.id);
  };

  const isHostPlayer = localPlayer?.id === room?.hostId;

  // ── WAITING ──
  if (gameState === "waiting") {
    return (
      <main className="relative min-h-[100dvh] w-full flex items-center justify-center px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm flex flex-col items-center gap-8">
          <div className="text-center">
            <h1 className="text-3xl font-black font-display text-white mb-2">Hazır mısınız?</h1>
            <p className="text-white/50">{room?.players.length ?? 1} oyuncu bağlı</p>
          </div>
          <GlassPanel className="p-8 w-full text-center" glow="primary" animate>
            <div className="flex flex-col gap-4">
              <p className="text-white/60 text-sm">Oda: <span className="font-bold text-white">{room?.code}</span></p>
              <div className="flex flex-wrap gap-2 justify-center">
                {room?.settings.categories.map((c) => <Badge key={c} variant="primary" className="text-xs">{c}</Badge>)}
              </div>
              <p className="text-white/40 text-sm mt-2">Host oyunu başlatıyor, bekleniyor...</p>
            </div>
          </GlassPanel>
        </motion.div>
      </main>
    );
  }

  // ── EVALUATING ──
  if (gameState === "evaluating") {
    return (
      <main className="relative min-h-[100dvh] w-full flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center flex flex-col items-center gap-6">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-16 h-16 rounded-full border-4 border-violet-500/30 border-t-violet-500" />
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Değerlendiriliyor...</h2>
            <p className="text-white/50 text-sm">AI hakem cevaplarınızı puanlandırıyor</p>
          </div>
        </motion.div>
      </main>
    );
  }

  // ── ROUND OVER (tur arası — artık "results" sayfasına gidildiği için bu kısım pratikte çalışmayacak ancak kalsın) ──
  if (gameState === "round_over") {
    return (
      <main className="relative min-h-[100dvh] w-full flex items-center justify-center px-4 py-8">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm flex flex-col items-center gap-8 text-center">

          {/* Tur tamamlandı header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))", border: "1px solid rgba(124,58,237,0.4)" }}>
              <span className="text-4xl">✅</span>
            </div>
            <h1 className="text-3xl font-black font-display text-white">Tur {currentRound} Bitti!</h1>
            <p className="text-white/50 mt-2">
              {currentRound < totalRounds
                ? `${totalRounds - currentRound} tur kaldı`
                : "Son tur tamamlandı!"}
            </p>
          </motion.div>

          <GlassPanel className="p-8 w-full" glow="primary" animate>
            {isHostPlayer ? (
              <div className="flex flex-col gap-4">
                <p className="text-white/60 text-sm">Hazır olduğunuzda sonraki turu başlatın.</p>
                <Button variant="primary" onClick={handleNextRound} className="w-full py-4 text-base">
                  Sonraki Tur →
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="animate-pulse inline-block w-2.5 h-2.5 bg-violet-400 rounded-full" />
                <p className="text-white/60 text-sm">Host sonraki turu başlatıyor...</p>
              </div>
            )}
          </GlassPanel>
        </motion.div>
      </main>
    );
  }

  // ── PLAYING ──
  return (
    <main className="relative min-h-[100dvh] w-full flex flex-col items-center px-4 py-6 gap-6">
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

      <LetterReveal letter={currentLetter} />

      <div className="w-full max-w-lg">
        <GlassPanel className="p-6 sm:p-8" glow="primary" animate>
          <AnswerForm
            categories={categories} letter={currentLetter} answers={answers}
            onChange={handleAnswerChange} onSubmit={handleSubmit} isSubmitted={isSubmitted}
          />
        </GlassPanel>
      </div>

      <AnimatePresence>
        {isSubmitted && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-white/40 text-xs">
            Diğer oyuncular gönderene kadar bekleniyor...
          </motion.p>
        )}
      </AnimatePresence>
    </main>
  );
}
