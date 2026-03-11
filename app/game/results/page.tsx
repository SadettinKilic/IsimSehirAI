"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { GlassPanel, Button, Badge } from "@/components/ui";
import { useGameStore } from "@/store/gameStore";
import { startGame, getRoomState } from "@/lib/gameApi";
import type { EvaluationResult } from "@/lib/types";

// ──────────────────────────────────────────────────────────────
// SCORE CARD — Bir oyuncunun bu turdaki kategorileri ve puanları
// ──────────────────────────────────────────────────────────────
function ScoreCard({
  playerEval,
  rank,
  delay,
}: {
  playerEval: NonNullable<EvaluationResult["degerlendirme"]>[number];
  rank: number;
  delay: number;
}) {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, ease: [0.23, 1, 0.32, 1] }}
    >
      <GlassPanel className="p-5 sm:p-6" glow={rank === 0 ? "primary" : "none"}>
        {/* Player header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{medals[rank] ?? rank + 1 + "."}</span>
            <div>
              <p className={`font-bold text-lg ${rank === 0 ? "text-violet-300" : "text-white"}`}>
                {playerEval.nick}
              </p>
            </div>
          </div>
          <Badge
            variant={rank === 0 ? "primary" : "neutral"}
            className="text-lg font-black px-4 py-1.5"
          >
            {playerEval.toplam} puan
          </Badge>
        </div>

        {/* Category breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Object.entries(playerEval.puanlar).map(([cat, score]) => (
            <div
              key={cat}
              className="flex items-start justify-between gap-2 rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/40">{cat}</span>
                <span className="text-white/80 text-sm font-medium mt-0.5 truncate">{score.gerekce}</span>
              </div>
              <span
                className={`text-sm font-bold shrink-0 mt-0.5 ${
                  score.puan > 0 ? "text-green-400" : "text-red-400/70"
                }`}
              >
                {score.puan > 0 ? `+${score.puan}` : "0"}
              </span>
            </div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// RESULTS PAGE — Polling ile sonraki tur takibi
// ──────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const router = useRouter();
  const { evaluationResult, room, localPlayer, setRoundData } = useGameStore();
  const prevPhaseRef = useRef<string | null>("results");

  // Evaluation yoksa lobby'e gönder
  useEffect(() => {
    if (!evaluationResult || !room) {
      router.push("/lobby");
    }
  }, [evaluationResult, room, router]);

  // Polling: host sonraki turu başlatırsa tüm oyuncuları game sayfasına gönder
  useEffect(() => {
    if (!room?.code) return;
    const code = room.code;

    const poll = async () => {
      try {
        const res = await getRoomState(code);
        if (!res.success) return;

        const r = res.room;

        if (
          r.currentPhase === "playing" &&
          prevPhaseRef.current !== "playing"
        ) {
          prevPhaseRef.current = "playing";
          useGameStore.getState().setRoom(r);
          setRoundData({
            letter: r.currentLetter,
            round: r.currentRound,
            totalRounds: r.totalRounds,
            duration: r.settings.roundDuration,
            categories: r.settings.categories,
          });
          router.push("/game");
        }
      } catch {
        // sessizce devam et
      }
    };

    const timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  }, [room?.code, router, setRoundData]);

  if (!evaluationResult || !room) return null;

  // Toplam puana göre sırala
  const sorted = [...evaluationResult.degerlendirme].sort((a, b) => b.toplam - a.toplam);
  const isHost = localPlayer?.isHost;
  const isLastRound = room.currentRound >= room.totalRounds;

  const handleNextRound = async () => {
    if (!room?.code || !localPlayer?.id) return;
    const res = await startGame(room.code, localPlayer.id);
    if (!res.success) {
      alert(res.error || "Başlatılamadı.");
    }
    // Başarılıysa polling otomatik olarak tüm oyuncuları /game'e yönlendirir
  };

  return (
    <main className="relative min-h-[100dvh] w-full px-4 py-8 flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase text-violet-300 mb-3"
          style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
          Tur {room.currentRound} / {room.totalRounds}
        </div>
        <h1 className="text-3xl font-black font-display text-white">
          Tur Sonuçları
        </h1>
        <p className="text-white/50 mt-1">
          Harf: <span className="font-bold text-white">{room.currentLetter}</span>
        </p>
      </motion.div>

      {/* Score cards */}
      <div className="flex flex-col gap-4">
        {sorted.map((playerEval, i) => (
          <ScoreCard key={playerEval.nick} playerEval={playerEval} rank={i} delay={i * 0.1} />
        ))}
      </div>

      {/* Action button (host only) */}
      {isHost && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="primary"
            onClick={isLastRound ? () => router.push("/game/podium") : handleNextRound}
            className="w-full py-4 text-base"
          >
            {isLastRound ? "Sonuçları Gör 🏆" : "Sonraki Tur →"}
          </Button>
        </motion.div>
      )}

      {!isHost && (
        <p className="text-center text-white/40 text-sm">
          Host sonraki turu başlatmayı bekliyor...
        </p>
      )}
    </main>
  );
}
