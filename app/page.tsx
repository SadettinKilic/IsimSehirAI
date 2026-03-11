"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassPanel, Button, TextInput } from "@/components/ui";
import { ToastContainer } from "@/components/ui/Toast";
import { useGameStore } from "@/store/gameStore";
import { uid, getPlayerColor } from "@/lib/utils";
import type { Player } from "@/lib/types";
import { Target, Bot, Zap, Smartphone, User, ArrowLeft } from "lucide-react";

const ParticleBackground = dynamic(
  () =>
    import("@/components/3d/ParticleBackground").then(
      (m) => m.ParticleBackground
    ),
  { ssr: false }
);

// =============================================
// PAGE VARIANTS
// =============================================
type View = "home" | "nick";

const pageVariants = {
  initial: { opacity: 0, y: 40, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -40, filter: "blur(4px)" },
};

const transition = { duration: 0.6, ease: [0.23, 1, 0.32, 1] as const };

// =============================================
// HOME VIEW
// =============================================
function HomeView({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      key="home"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className="flex flex-col items-center justify-center gap-10 w-full max-w-md mx-auto text-center"
    >
      {/* Logo — dart hedef tahtası */}
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="select-none relative flex justify-center w-full"
        aria-hidden
      >
        {/* Outer soft glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(220,38,38,0.3) 0%, transparent 70%)", filter: "blur(40px)" }}
        />
        {/* Dart board — kırmızı beyaz konsantrik halkalar */}
        <div className="relative z-10 w-32 h-32 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle, #fff 12%, #dc2626 12%, #dc2626 28%, #fff 28%, #fff 44%, #dc2626 44%, #dc2626 60%, #fff 60%, #fff 76%, #dc2626 76%)",
            boxShadow: "0 0 0 3px rgba(255,255,255,0.15), 0 0 50px rgba(220,38,38,0.5), inset 0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          {/* Dart oku — sağ üstten merkeze */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="absolute"
              style={{
                width: "68px",
                height: "8px",
                top: "22%",
                right: "8%",
                transform: "rotate(35deg)",
                transformOrigin: "right center",
              }}
            >
              {/* Ok gövdesi */}
              <div className="absolute inset-0 rounded-full"
                style={{ background: "linear-gradient(90deg, #1e3a8a 0%, #60a5fa 60%, #93c5fd 100%)" }}
              />
              {/* Ok ucu */}
              <div className="absolute right-full top-1/2 -translate-y-1/2"
                style={{ width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderRight: "10px solid #1e3a8a" }}
              />
              {/* Ok kuyruğu */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 flex gap-[2px]">
                <div style={{ width: 6, height: 5, background: "#ef4444", clipPath: "polygon(0 50%, 100% 0, 100% 100%)" }} />
                <div style={{ width: 6, height: 5, background: "#fff", clipPath: "polygon(0 50%, 100% 0, 100% 100%)" }} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Title */}
      <div className="flex flex-col gap-3">
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight font-display gradient-text text-glow leading-none">
          İsimŞehirAI
        </h1>
        <p className="text-slate-300/80 text-base sm:text-lg leading-relaxed max-w-[300px] mx-auto">
          Yapay zekanın hakem olduğu{" "}
          <span className="text-violet-300 font-semibold">çok oyunculu</span>{" "}
          kelime oyunu
        </p>
      </div>


      <div className="w-full px-4 sm:px-0 mt-2">
        <Button
          id="btn-play-now"
          size="lg"
          fullWidth
          onClick={onStart}
          className="text-xl py-6 shadow-[0_12px_50px_rgba(124,58,237,0.45)] hover:shadow-[0_16px_60px_rgba(124,58,237,0.6)]"
        >
          Oyuna Başla
        </Button>
      </div>
    </motion.div>
  );
}

// =============================================
// NICK VIEW
// =============================================
function NickView({ onBack }: { onBack: () => void }) {
  const [nick, setNick] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { setLocalPlayer, addToast } = useGameStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nick.trim();
    if (trimmed.length < 2) {
      setError("Kullanıcı adı en az 2 karakter olmalıdır.");
      return;
    }
    if (trimmed.length > 20) {
      setError("Kullanıcı adı en fazla 20 karakter olabilir.");
      return;
    }
    setError("");
    setIsSubmitting(true);

    const player: Player = {
      id: uid(),
      nick: trimmed,
      isHost: false,
      isReady: false,
      totalScore: 0,
      roundScores: [],
      color: getPlayerColor(0),
    };
    setLocalPlayer(player);

    addToast({
      type: "success",
      title: `Hoş geldiniz, ${trimmed}.`,
      message: "Lütfen bir işlem seçin.",
    });

    router.push("/lobby");
  };

  return (
    <motion.div
      key="nick"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className="flex flex-col items-center justify-between min-h-[70dvh] py-8 w-full max-w-sm mx-auto"
    >
      <div className="w-full flex flex-col gap-10">
        {/* Top Navigation */}
        <div className="w-full px-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium p-2 -ml-2 rounded-lg hover:bg-white/5"
          >
            ←<span className="translate-y-[1px]">Ana Sayfa</span>
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-4">
          <motion.div 
            className="mx-auto bg-violet-500/10 rounded-full w-28 h-28 flex items-center justify-center border border-violet-500/20 shadow-[0_0_40px_rgba(124,58,237,0.2)]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <User size={48} className="text-violet-400 drop-shadow-lg" />
          </motion.div>
          
          <div className="flex flex-col items-center text-center gap-2">
            <h2 className="text-4xl font-bold font-display gradient-text tracking-tight">
              Kullanıcı Adı
            </h2>
            <p className="text-slate-300/70 text-base">
              Oyunda kullanılacak takma adınızı girin.
            </p>
          </div>
        </div>
      </div>

      {/* Form Area */}
      <div className="w-full mt-10">
        <GlassPanel className="w-full p-8" glow="primary" animate>
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <TextInput
              id="input-nick"
              label="KULLANICI ADI"
              placeholder="Takma adınız..."
              value={nick}
              onChange={(e) => {
                setNick(e.target.value);
                if (error) setError("");
              }}
              error={error}
              maxLength={20}
              autoComplete="off"
              autoCapitalize="off"
              autoFocus
              rightAddon={<User size={20} />}
            />

            <Button
              id="btn-nick-submit"
              type="submit"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
            >
              Devam Et
            </Button>
          </form>
        </GlassPanel>
      </div>
    </motion.div>
  );
}

// =============================================
// MAIN PAGE
// =============================================
export default function Home() {
  const [view, setView] = useState<View>("home");

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center p-4 sm:p-6 overflow-x-hidden">
      {/* 3D Background */}
      <ParticleBackground />

      {/* Ambient Orbs */}
      <div
        className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 60%)",
          filter: "blur(80px)",
        }}
        aria-hidden
      />
      <div
        className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 60%)",
          filter: "blur(80px)",
        }}
        aria-hidden
      />

      {/* Content wrapper for height management */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {view === "home" && (
            <HomeView key="home" onStart={() => setView("nick")} />
          )}
          {view === "nick" && (
            <NickView key="nick" onBack={() => setView("home")} />
          )}
        </AnimatePresence>
      </div>

      <ToastContainer />
    </main>
  );
}
