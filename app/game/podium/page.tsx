"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { GlassPanel, Button, Badge } from "@/components/ui";
import { useGameStore } from "@/store/gameStore";

// ──────────────────────────────────────────────────────────────
// CONFETTI
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
// MEDAL CONFIGS
// ──────────────────────────────────────────────────────────────
const MEDAL_CONFIG = [
  {
    icon: "🥇",
    label: "1.",
    bg: "linear-gradient(135deg, rgba(234,179,8,0.22) 0%, rgba(161,120,3,0.12) 100%)",
    border: "rgba(234,179,8,0.45)",
    glow: "rgba(234,179,8,0.25)",
    textColor: "#fde68a",
    badgeBg: "rgba(234,179,8,0.2)",
    badgeText: "#fde68a",
  },
  {
    icon: "🥈",
    label: "2.",
    bg: "linear-gradient(135deg, rgba(148,163,184,0.2) 0%, rgba(100,116,139,0.1) 100%)",
    border: "rgba(148,163,184,0.4)",
    glow: "rgba(148,163,184,0.18)",
    textColor: "#e2e8f0",
    badgeBg: "rgba(148,163,184,0.15)",
    badgeText: "#e2e8f0",
  },
  {
    icon: "🥉",
    label: "3.",
    bg: "linear-gradient(135deg, rgba(180,83,9,0.2) 0%, rgba(120,53,15,0.1) 100%)",
    border: "rgba(180,83,9,0.4)",
    glow: "rgba(180,83,9,0.2)",
    textColor: "#fdba74",
    badgeBg: "rgba(180,83,9,0.15)",
    badgeText: "#fdba74",
  },
];

// ──────────────────────────────────────────────────────────────
// PLAYER ROW — tüm oyuncular için
// ──────────────────────────────────────────────────────────────
function PlayerRow({
  player,
  rank,
  isMe,
  delay,
}: {
  player: { nick: string; totalScore: number; color: string };
  rank: number; // 0-indexed
  isMe: boolean;
  delay: number;
}) {
  const medal = MEDAL_CONFIG[rank];
  const isTopThree = rank < 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, ease: [0.23, 1, 0.32, 1] }}
    >
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-2xl"
        style={
          isTopThree
            ? {
                background: medal.bg,
                border: `1px solid ${medal.border}`,
                boxShadow: `0 4px 24px ${medal.glow}`,
              }
            : {
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }
        }
      >
        {/* Rank / Medal */}
        <div className="w-10 flex items-center justify-center shrink-0">
          {isTopThree ? (
            <span className="text-2xl leading-none">{medal.icon}</span>
          ) : (
            <span className="text-base font-bold text-white/30 tabular-nums">{rank + 1}.</span>
          )}
        </div>

        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shrink-0"
          style={{
            backgroundColor: player.color,
            boxShadow: `0 3px 12px ${player.color}55`,
          }}
        >
          {player.nick.charAt(0).toUpperCase()}
        </div>

        {/* Nick */}
        <span
          className="flex-1 font-semibold text-base truncate"
          style={{ color: isTopThree ? medal.textColor : isMe ? "#c4b5fd" : "rgba(255,255,255,0.85)" }}
        >
          {player.nick}
          {isMe && (
            <span className="ml-2 text-xs font-medium opacity-60">(sen)</span>
          )}
        </span>

        {/* Score */}
        <div
          className="shrink-0 px-3 py-1 rounded-lg text-sm font-bold tabular-nums"
          style={
            isTopThree
              ? { background: medal.badgeBg, color: medal.badgeText }
              : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }
          }
        >
          {player.totalScore} puan
        </div>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// TOP 3 PODIUM DISPLAY (görsel podyum)
// ──────────────────────────────────────────────────────────────
function PodiumVisual({
  sorted,
}: {
  sorted: Array<{ nick: string; totalScore: number; color: string }>;
}) {
  const top3 = sorted.slice(0, 3);

  // Görsel sıralama: 2. - 1. - 3.
  const display =
    top3.length >= 2
      ? [top3[1], top3[0], top3[2]].filter(Boolean)
      : [top3[0]].filter(Boolean);

  const displayRanks = top3.length >= 2 ? [1, 0, 2] : [0];
  // 1. (rank 0) en yüksek, 2. (rank 1) orta, 3. (rank 2) en kısa
  const heights = ["h-40 sm:h-48", "h-28 sm:h-36", "h-20 sm:h-28"];

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 w-full max-w-xs mx-auto">
      {display.map((player, i) => {
        const rank = displayRanks[i];
        const medal = MEDAL_CONFIG[rank];
        return (
          <motion.div
            key={player.nick}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.15, type: "spring", stiffness: 150, damping: 20 }}
            className="flex flex-col items-center gap-2"
          >
            {/* Avatar + nick above podium */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-black border-2 text-white"
                style={{ background: `${player.color}33`, borderColor: player.color }}
              >
                {player.nick.charAt(0).toUpperCase()}
              </div>
              <span className="text-white text-xs font-bold max-w-[72px] truncate text-center">
                {player.nick}
              </span>
              <span className="text-white/40 text-[10px]">{player.totalScore} p</span>
            </div>

            {/* Podium block */}
            <div
              className={`w-[70px] sm:w-20 ${heights[rank]} rounded-t-xl flex flex-col items-center justify-start pt-3`}
              style={{
                background: medal.bg,
                border: `1px solid ${medal.border}`,
                borderBottom: "none",
                boxShadow: `0 0 20px ${medal.glow}`,
              }}
            >
              <span className="text-2xl">{medal.icon}</span>
              <span className="text-xs font-bold mt-1" style={{ color: medal.textColor }}>
                {rank + 1}.
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
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

  const sorted = [...room.players].sort((a, b) => b.totalScore - a.totalScore);

  const handlePlayAgain = () => {
    useGameStore.getState().reset();
    router.push("/");
  };

  return (
    <main className="relative min-h-[100dvh] w-full flex flex-col items-center px-4 py-8 gap-8 overflow-hidden">
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

      {/* Görsel Podyum (top 3) */}
      <div className="z-10 w-full">
        <PodiumVisual sorted={sorted} />
      </div>

      {/* Tam Sıralama */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="w-full max-w-md z-10 flex flex-col gap-2"
      >
        <p className="text-xs font-semibold tracking-widest uppercase text-white/30 mb-1 pl-1">
          Tam Sıralama
        </p>
        {sorted.map((player, i) => (
          <PlayerRow
            key={player.id}
            player={player}
            rank={i}
            isMe={player.id === localPlayer?.id}
            delay={0.8 + i * 0.06}
          />
        ))}
      </motion.div>

      {/* Action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="w-full max-w-md z-10 pb-4"
      >
        <Button variant="primary" onClick={handlePlayAgain} className="w-full py-4 text-base">
          Yeniden Oyna 🎮
        </Button>
      </motion.div>
    </main>
  );
}
