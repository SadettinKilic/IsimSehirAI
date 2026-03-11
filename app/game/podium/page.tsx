"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { GlassPanel, Button, Badge } from "@/components/ui";
import { useGameStore } from "@/store/gameStore";

// ──────────────────────────────────────────────────────────────
// CONFETTI — hafif CSS animasyon
// ──────────────────────────────────────────────────────────────
function ConfettiParticle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      style={{
        position: "fixed",
        top: -20,
        left: `${x}%`,
        width: 8,
        height: 8,
        borderRadius: 2,
        background: color,
        zIndex: 0,
        pointerEvents: "none",
      }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{ y: "110vh", opacity: [1, 1, 0], rotate: 360 * 3 }}
      transition={{ delay, duration: 3.5, ease: "easeIn" }}
    />
  );
}

const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  delay: Math.random() * 1.5,
  x: Math.random() * 100,
  color: ["#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#60a5fa"][i % 6],
}));

// ──────────────────────────────────────────────────────────────
// PODIUM STEP
// ──────────────────────────────────────────────────────────────
function PodiumStep({
  nick,
  score,
  rank,
  color,
  delay,
}: {
  nick: string;
  score: number;
  rank: number;
  color: string;
  delay: number;
}) {
  const heights = ["h-36 sm:h-44", "h-24 sm:h-32", "h-16 sm:h-24"];
  const medals = ["🥇", "🥈", "🥉"];
  const podiumOrder = [1, 0, 2]; // Ortada 1., solda 2., sağda 3.

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 150, damping: 20 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Avatar + nick */}
      <div className="flex flex-col items-center gap-1 mb-2">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black border-2"
          style={{ background: `${color}22`, borderColor: color, color }}
        >
          {nick.charAt(0).toUpperCase()}
        </div>
        <span className="text-white font-bold text-sm max-w-[80px] truncate text-center">{nick}</span>
        <span className="text-white/50 text-xs font-medium">{score} puan</span>
      </div>

      {/* Podium block */}
      <div
        className={`w-20 sm:w-24 ${heights[rank]} rounded-t-xl flex flex-col items-center justify-start pt-3 relative`}
        style={{
          background: `linear-gradient(180deg, ${color}44 0%, ${color}22 100%)`,
          border: `1px solid ${color}55`,
          borderBottom: "none",
        }}
      >
        <span className="text-3xl">{medals[rank]}</span>
        <span className="text-xs text-white/60 font-bold mt-1">{rank + 1}.</span>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// PODIUM PAGE
// ──────────────────────────────────────────────────────────────
export default function PodiumPage() {
  const router = useRouter();
  const { room, localPlayer } = useGameStore();

  useEffect(() => {
    if (!room) router.push("/");
  }, [room, router]);

  if (!room) return null;

  // Toplam puana göre sırala
  const sorted = [...room.players].sort((a, b) => b.totalScore - a.totalScore);
  const top3 = sorted.slice(0, 3);

  // Podyum sıralama: [2. yer, 1. yer, 3. yer]
  const podiumDisplay =
    top3.length >= 2
      ? [top3[1], top3[0], top3[2]].filter(Boolean)
      : [top3[0]].filter(Boolean);

  const playerColors = ["#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

  const handlePlayAgain = () => {
    useGameStore.getState().reset();
    router.push("/");
  };

  return (
    <main className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between px-4 py-8 gap-8 overflow-hidden">
      {/* Confetti */}
      {CONFETTI.map((c) => (
        <ConfettiParticle key={c.id} delay={c.delay} x={c.x} color={c.color} />
      ))}

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10"
      >
        <h1
          className="text-4xl sm:text-5xl font-black font-display"
          style={{
            background: "linear-gradient(135deg, #a78bfa, #67e8f9, #fbbf24)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Oyun Bitti!
        </h1>
        <p className="text-white/50 mt-2 text-base">
          {sorted[0]?.nick} kazandı 🎉
        </p>
      </motion.div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-2 sm:gap-4 z-10 w-full max-w-sm">
        {podiumDisplay.map((player, i) => {
          const rankIndex =
            top3.length >= 2
              ? [1, 0, 2][i] // geri-çevir: display 0 → rank 1, display 1 → rank 0
              : 0;
          return (
            <PodiumStep
              key={player.id}
              nick={player.nick}
              score={player.totalScore}
              rank={rankIndex}
              color={player.color ?? playerColors[rankIndex]}
              delay={0.3 + i * 0.15}
            />
          );
        })}
      </div>

      {/* Scoreboard */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="w-full max-w-md z-10"
      >
        <GlassPanel className="p-5 sm:p-6" glow="primary">
          <h2 className="text-sm font-semibold tracking-widest uppercase text-white/40 mb-4">Skor Tablosu</h2>
          <div className="flex flex-col gap-2.5">
            {sorted.map((player, i) => (
              <div key={player.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-white/30 w-5 text-sm text-right">{i + 1}.</span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: `${player.color ?? playerColors[i]}22`, color: player.color ?? playerColors[i] }}
                  >
                    {player.nick.charAt(0).toUpperCase()}
                  </div>
                  <span className={`font-semibold ${player.id === localPlayer?.id ? "text-violet-300" : "text-white"}`}>
                    {player.nick}
                    {player.id === localPlayer?.id && (
                      <span className="text-white/30 text-xs ml-1">(sen)</span>
                    )}
                  </span>
                </div>
                <Badge variant={i === 0 ? "primary" : "neutral"} className="font-bold">
                  {player.totalScore} puan
                </Badge>
              </div>
            ))}
          </div>
        </GlassPanel>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="flex flex-col gap-3 w-full max-w-md z-10"
      >
        <Button variant="primary" onClick={handlePlayAgain} className="w-full py-4">
          Yeniden Oyna
        </Button>
      </motion.div>
    </main>
  );
}
