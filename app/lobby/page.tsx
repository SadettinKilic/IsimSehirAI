"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { GlassPanel, Button, TextInput, Badge } from "@/components/ui";
import { ToastContainer } from "@/components/ui/Toast";
import { useGameStore } from "@/store/gameStore";
import { createRoom, joinRoom, startGame, getRoomState } from "@/lib/gameApi";
import { Home as HomeIcon, LogIn, Lock, Rocket, Plus, Copy, X } from "lucide-react";

const ParticleBackground = dynamic(
  () =>
    import("@/components/3d/ParticleBackground").then(
      (m) => m.ParticleBackground
    ),
  { ssr: false }
);

// =============================================
// PAGE TRANSITIONS
// =============================================
const pageVariants = {
  initial: { opacity: 0, y: 30, scale: 0.98, filter: "blur(5px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: -30, scale: 0.98, filter: "blur(5px)" },
};
const transition = { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const };

type LobbyView = "select" | "create" | "join";

// =============================================
// SELECT VIEW
// =============================================
function SelectView({
  nick,
  onSelect,
}: {
  nick: string;
  onSelect: (v: "create" | "join") => void;
}) {
  return (
    <motion.div
      key="select"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className="flex flex-col items-center justify-center min-h-[70dvh] gap-12 w-full max-w-sm mx-auto"
    >
      <div className="flex flex-col items-center text-center gap-4 mt-8">
        <motion.div 
          className="mx-auto bg-violet-500/10 rounded-full w-28 h-28 flex items-center justify-center border border-violet-500/20 shadow-[0_0_30px_rgba(124,58,237,0.15)]"
          whileHover={{ scale: 1.05 }}
        >
          <HomeIcon size={48} className="text-violet-400 drop-shadow-lg" />
        </motion.div>
        
        <div className="flex flex-col items-center text-center gap-2">
          <h2 className="text-4xl font-bold font-display gradient-text tracking-tight px-4 leading-tight">
            Hoş Geldiniz, {nick}
          </h2>
          <p className="text-slate-300/70 text-base">
            Lütfen bir işlem seçin.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5 w-full">
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.03 }}
          onClick={() => onSelect("create")}
          className="w-full glass border border-violet-400/40 rounded-[2rem] p-6 text-left group overflow-visible"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-violet-500/20 to-violet-600/30 flex items-center justify-center shrink-0 border border-violet-400/30 shadow-[0_0_20px_rgba(124,58,237,0.2)] group-hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] transition-all duration-300">
              <Plus size={32} className="text-violet-100 drop-shadow-md" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-white text-xl tracking-tight mb-1">Oda Kur</div>
              <div className="text-white/60 text-sm leading-snug pr-2">
                Arkadaşlarınızı davet edin, kuralları kendiniz belirleyin.
              </div>
            </div>
          </div>
        </motion.button>

        {/* Join Room */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.03 }}
          onClick={() => onSelect("join")}
          className="w-full glass border border-cyan-400/30 rounded-[2rem] p-6 text-left group overflow-visible"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-cyan-500/20 to-cyan-600/30 flex items-center justify-center shrink-0 border border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] group-hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all duration-300">
              <LogIn size={32} className="text-cyan-100 drop-shadow-md" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-white text-xl tracking-tight mb-1">Odaya Katıl</div>
              <div className="text-white/60 text-sm leading-snug pr-2">
                Mevcut bir odaya davet kodu ile giriş yapın.
              </div>
            </div>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}

// =============================================
// CREATE ROOM VIEW
// =============================================
const CATEGORY_OPTIONS = [
  "İsim", "Şehir", "Hayvan", "Bitki", "Meslek",
  "Yiyecek", "Film", "Marka", "Ülke", "Renk",
] as const;

function CreateRoomView({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (code: string) => void;
}) {
  const [duration, setDuration] = useState(60);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([
    "İsim", "Şehir", "Hayvan", "Meslek",
  ]);
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [newCatInput, setNewCatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useGameStore((s) => s.addToast);

  const toggleCat = (cat: string) => {
    setSelectedCats((prev) =>
      prev.includes(cat)
        ? prev.length > 1
          ? prev.filter((c) => c !== cat)
          : prev
        : [...prev, cat]
    );
  };

  const handleAddCustomCat = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newCatInput.trim();
    if (trimmed.length < 2) return;
    
    const exists = [...CATEGORY_OPTIONS, ...customCats].some(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    
    if (exists) {
      addToast({ type: "warning", title: "Bu kategori zaten var!" });
      setNewCatInput("");
      return;
    }

    setCustomCats((prev) => [...prev, trimmed]);
    setSelectedCats((prev) => [...prev, trimmed]);
    setNewCatInput("");
  };

  const handleRemoveCustomCat = (e: React.MouseEvent, catToRemove: string) => {
    e.stopPropagation();
    setCustomCats((prev) => prev.filter((c) => c !== catToRemove));
    setSelectedCats((prev) => prev.filter((c) => c !== catToRemove));
  };

  const allCategories = [...CATEGORY_OPTIONS, ...customCats];

  const handleCreate = async () => {
    if (selectedCats.length < 2) {
      addToast({ type: "warning", title: "En az 2 kategori seçin." });
      return;
    }
    setIsLoading(true);

    const localPlayer = useGameStore.getState().localPlayer;
    if (!localPlayer) {
      addToast({ type: "error", title: "Oturum bulunamadı. Lütfen tekrar giriş yapın." });
      setIsLoading(false);
      return;
    }

    try {
      const res = await createRoom(
        {
          id: localPlayer.id,
          nick: localPlayer.nick,
          isReady: false,
          totalScore: 0,
          roundScores: [],
        },
        {
          roundDuration: duration,
          maxPlayers,
          categories: selectedCats,
          isPrivate,
          password: isPrivate ? password : "",
        }
      );

      if (res.success && res.room) {
        useGameStore.getState().setRoom(res.room);
        addToast({ type: "success", title: "Oda oluşturuldu!", message: `Kod: ${res.room.code}` });
        onCreated(res.room.code);
      } else {
        addToast({ type: "error", title: "Oda oluşturulamadı.", message: !res.success ? res.error : undefined });
      }
    } catch {
      addToast({ type: "error", title: "Bağlantı hatası. Lütfen tekrar deneyin." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      key="create"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className="flex flex-col min-h-[90dvh] w-full max-w-[480px] mx-auto py-6"
    >
      {/* Top Nav */}
      <div className="flex items-center justify-between mb-8 px-2">
        <button
          onClick={onBack}
          className="p-3 -ml-3 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <span className="text-xl">←</span>
        </button>
        <h2 className="text-2xl font-bold font-display tracking-tight text-white/90">
          Oda Ayarları
        </h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <GlassPanel className="p-0 flex flex-col" glow="primary" animate>
          <div className="flex-1 max-h-[72vh] overflow-y-auto overflow-x-hidden rounded-[1.25rem] px-10 py-10 sm:px-12 w-full custom-scrollbar">
            <div className="flex flex-col gap-10">
              
              {/* Duration */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold tracking-wide text-white/60 uppercase">
                    Tur Süresi
                  </label>
                  <Badge variant="primary" className="px-3 py-1 font-bold">{duration}s</Badge>
                </div>
                <input
                  type="range"
                  min={30}
                  max={120}
                  step={15}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-violet-500 h-2 bg-white/10 rounded-full appearance-none outline-none focus:ring-2 focus:ring-violet-400"
                />
                <div className="flex justify-between text-xs text-white/40 font-medium px-1 mt-1">
                  <span>30</span>
                  <span>75</span>
                  <span>120</span>
                </div>
              </div>

              {/* Max Players */}
              <div className="flex flex-col gap-3 border-t border-white/5 pt-8">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold tracking-wide text-white/60 uppercase">
                    Kontenjan
                  </label>
                  <Badge variant="primary" className="px-3 py-1 font-bold">{maxPlayers} Kişi</Badge>
                </div>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={1}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full accent-violet-500 h-2 bg-white/10 rounded-full appearance-none outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* Categories */}
              <div className="flex flex-col gap-5 border-t border-white/5 pt-8">
                <label className="text-xs font-semibold tracking-wide text-white/60 uppercase flex justify-between items-end">
                  <span>Kategoriler</span>
                  <span className="text-[10px] lowercase opacity-60 normal-case">min. 2 seçenek</span>
                </label>

                {/* Custom Category Input */}
                <form onSubmit={handleAddCustomCat} className="flex gap-2 w-full">
                  <div className="flex-1">
                    <input
                      type="text"
                      className="w-full h-11 px-4 rounded-xl glass-sm text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/50 bg-white/5 placeholder:text-white/30"
                      placeholder="Yeni özel kategori (Örn: Dizi)"
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      maxLength={15}
                    />
                  </div>
                  <Button type="submit" size="sm" className="px-4 shrink-0 rounded-xl min-h-[44px]">
                    <Plus size={18} />
                  </Button>
                </form>

                <div className="flex flex-wrap gap-2.5">
                  {allCategories.map((cat) => {
                    const active = selectedCats.includes(cat);
                    const isCustom = customCats.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCat(cat)}
                        className={`group relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                          active
                            ? "bg-violet-500 text-white shadow-[0_4px_12px_rgba(124,58,237,0.4)] border border-violet-400"
                            : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {cat}
                        {isCustom && (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => handleRemoveCustomCat(e, cat)}
                            className={`ml-1 -mr-1.5 p-0.5 rounded-full transition-colors ${
                              active ? "hover:bg-violet-600 text-violet-100" : "hover:bg-white/20 text-white/50"
                            }`}
                          >
                            <X size={14} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Private Room */}
              <div className="border-t border-white/5 pt-8 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-white/80">Kilitli Oda</span>
                  <button
                    role="switch"
                    aria-checked={isPrivate}
                    onClick={() => setIsPrivate((p) => !p)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 shadow-inner ${
                      isPrivate ? "bg-violet-500" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-md ${
                        isPrivate ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <AnimatePresence>
                  {isPrivate && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <TextInput
                        placeholder="Oda şifresini girin..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        rightAddon={<Lock size={20} />}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="pt-4 pb-2 w-full">
                <Button
                  id="btn-create-confirm"
                  size="lg"
                  fullWidth
                  isLoading={isLoading}
                  onClick={handleCreate}
                  className="text-lg shadow-[0_8px_30px_rgba(124,58,237,0.3)]"
                >
                  Oyunu Başlat
                </Button>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </motion.div>
  );
}

// =============================================
// JOIN ROOM VIEW
// =============================================
function JoinRoomView({
  onBack,
  onJoined,
}: {
  onBack: () => void;
  onJoined: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useGameStore((s) => s.addToast);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      setError("Geçerli bir oda kodu girin.");
      return;
    }
    setIsLoading(true);

    const localPlayer = useGameStore.getState().localPlayer;
    if (!localPlayer) {
      setError("Oturum bulunamadı. Lütfen yeniden giriş yapın.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await joinRoom(
        trimmed,
        {
          id: localPlayer.id,
          nick: localPlayer.nick,
          isReady: false,
          totalScore: 0,
          roundScores: [],
        },
        password
      );

      if (res.success && res.room) {
        useGameStore.getState().setRoom(res.room);
        addToast({ type: "success", title: "Odaya katıldınız!" });
        onJoined(trimmed);
      } else {
        setError(!res.success ? (res.error ?? "Odaya katılınamadı.") : "Odaya katılınamadı.");
      }
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      key="join"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className="flex flex-col min-h-[70dvh] w-full max-w-[480px] mx-auto py-6"
    >
      <div className="flex items-center justify-between mb-8 px-2">
        <button
          onClick={onBack}
          className="p-3 -ml-3 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <span className="text-xl">←</span>
        </button>
      </div>

      <div className="flex flex-col items-center text-center gap-4 mb-10">
        <motion.div 
          className="mx-auto bg-cyan-500/10 rounded-full w-28 h-28 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
        >
          <Rocket size={48} className="text-cyan-400 drop-shadow-lg" />
        </motion.div>
        
        <div className="flex flex-col items-center text-center gap-2">
          <h2 className="text-4xl font-bold font-display gradient-text tracking-tight px-4 leading-tight">
            Odaya Katıl
          </h2>
          <p className="text-slate-300/70 text-base">
            6 haneli oda kodunu girin.
          </p>
        </div>
      </div>

      <GlassPanel className="p-10 sm:p-12" glow="accent" animate>
        <form onSubmit={handleJoin} className="flex flex-col gap-8">
          <TextInput
            id="input-room-code"
            label="ODA KODU"
            placeholder="AB3X9K"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError("");
            }}
            error={error}
            maxLength={8}
            autoComplete="off"
            autoCapitalize="characters"
            autoFocus
            className="text-center text-3xl tracking-[0.4em] font-display uppercase font-bold py-6 min-h-[70px] shadow-inner bg-black/20"
          />
          <TextInput
            label="ODA ŞİFRESİ (Opsiyonel)"
            placeholder="Şifreyi girin..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            rightAddon={<Lock size={20} />}
          />
          <Button
            id="btn-join-confirm"
            type="submit"
            size="lg"
            fullWidth
            isLoading={isLoading}
            variant="secondary"
            className="mt-2 border-cyan-500/30 hover:bg-cyan-500/10"
          >
            Odaya Katıl
          </Button>
        </form>
      </GlassPanel>
    </motion.div>
  );
}

// =============================================
// LOBBY WAITING VIEW — Polling ile oda güncellemesi
// =============================================
function LobbyWaitingView({
  roomCode,
  nick,
  isHost,
  onLeave,
}: {
  roomCode: string;
  nick: string;
  isHost: boolean;
  onLeave: () => void;
}) {
  const { room, addToast, setRoundData } = useGameStore();
  const router = useRouter();
  const players = room?.players ?? [];
  const maxPlayers = room?.settings?.maxPlayers ?? 8;
  const prevPhaseRef = useRef<string | null>(null);

  // Polling: her 2 saniyede oda durumunu güncelle
  useEffect(() => {
    if (!roomCode) return;

    const poll = async () => {
      try {
        const res = await getRoomState(roomCode);
        if (res.success) {
          useGameStore.getState().setIsConnected(true);
          useGameStore.getState().setRoom(res.room);

          // Oyun başladıysa game sayfasına git
          if (
            res.room.currentPhase === "playing" &&
            prevPhaseRef.current !== "playing"
          ) {
            // roundData'yı store'a yaz
            setRoundData({
              letter: res.room.currentLetter,
              round: res.room.currentRound,
              totalRounds: res.room.totalRounds,
              duration: res.room.settings.roundDuration,
              categories: res.room.settings.categories,
            });
            router.push("/game");
          }
          prevPhaseRef.current = res.room.currentPhase;
        }
      } catch {
        // sessizce devam et
      }
    };

    poll();
    const timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  }, [roomCode, router, setRoundData]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      addToast({ type: "success", title: "Kopyalandı!", message: "Kod panoya kopyalandı." });
    });
  };

  const handleStartGame = async () => {
    const localPlayer = useGameStore.getState().localPlayer;
    if (!localPlayer?.id) return;

    const res = await startGame(roomCode, localPlayer.id);
    if (!res.success) {
      addToast({ type: "error", title: "Hata", message: res.error || "Oyun başlatılamadı." });
    }
    // Başarılıysa polling otomatik olarak phase change'i yakalar
  };

  return (
    <motion.div
      key="waiting"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className="flex flex-col gap-8 w-full max-w-[400px] mx-auto py-10"
    >
      {/* High-level actions */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => {
            if (window.confirm("Odadan ayrılmak istediğinize emin misiniz?")) {
              onLeave();
            }
          }}
          className="text-white/60 hover:text-red-400 transition-colors flex items-center gap-1.5 text-sm font-semibold px-2 py-1 rounded-lg hover:bg-red-500/10"
        >
          <X size={16} />
          Odadan Ayrıl
        </button>
      </div>

      {/* Dynamic Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold font-display text-white">
          Lobi Hazır
        </h2>
        <p className="text-white/60 mt-1">Oyuncuların katılması bekleniyor.</p>
      </div>

      {/* Room Code Banner */}
      <GlassPanel className="p-6 sm:p-8 text-center cursor-pointer group" glow="primary" animate onClick={copyCode}>
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">Oda Kodu</p>
        <div
          className="text-5xl sm:text-6xl font-black font-display tracking-[0.3em] leading-none"
          style={{
            background: "linear-gradient(90deg, #e879f9 0%, #a78bfa 50%, #38bdf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {roomCode}
        </div>
        <div className="flex items-center justify-center gap-2 mt-4 text-violet-300/60 text-xs font-medium">
          <Copy size={13} />
          <span>Kodu kopyalamak için tıklayın</span>
        </div>
      </GlassPanel>

      {/* Players */}
      <GlassPanel className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-2">
          <span className="text-sm font-semibold tracking-wide text-white/80 uppercase">
            Kadro
          </span>
          <Badge variant="primary" className="py-1 px-3 text-sm">{players.length} / {maxPlayers}</Badge>
        </div>

        <div className="flex flex-col gap-3">
          {players.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 py-3 px-4 glass-sm rounded-2xl bg-white/5"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-lg"
                style={{ backgroundColor: p.color, boxShadow: `0 4px 15px ${p.color}80` }}
                aria-hidden
              >
                {p.nick[0].toUpperCase()}
              </div>
              <span className="text-white font-bold text-base flex-1">{p.nick}</span>
              {p.isHost && (
                <Badge variant="warning" className="px-2 py-0.5 text-[10px]">HOST</Badge>
              )}
            </motion.div>
          ))}

          {/* Boş slotlar */}
          {Array.from({ length: Math.max(0, Math.min(3, maxPlayers - players.length)) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="shimmer flex items-center gap-4 py-3 px-4 rounded-2xl border border-dashed border-white/8 opacity-40"
            >
              <div className="w-10 h-10 rounded-xl border border-dashed border-white/15 bg-white/3" aria-hidden />
              <span className="text-white/35 text-sm font-medium tracking-wide">Bağlantı bekleniyor…</span>
            </div>
          ))}
        </div>
      </GlassPanel>

      {isHost ? (
        <Button
          id="btn-start-game"
          size="lg"
          fullWidth
          className="shadow-[0_10px_40px_rgba(124,58,237,0.4)] text-lg py-5"
          onClick={handleStartGame}
        >
          Oyunu Başlat
        </Button>
      ) : (
        <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10 mt-2">
          <span className="animate-pulse inline-block w-2 h-2 bg-violet-400 rounded-full mr-2"></span>
          <span className="text-white/60 text-sm font-medium">
            Oda sahibinin oyunu başlatması bekleniyor...
          </span>
        </div>
      )}
    </motion.div>
  );
}

// =============================================
// MAIN LOBBY PAGE
// =============================================
export default function LobbyPage() {
  const localPlayer = useGameStore((s) => s.localPlayer);
  const router = useRouter();
  const [view, setView] = useState<LobbyView>("select");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  if (!localPlayer) {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center p-4 sm:p-6 overflow-x-hidden">
      <ParticleBackground />

      <div
        className="fixed top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 60%)",
          filter: "blur(80px)",
        }}
        aria-hidden
      />
      <div
        className="fixed bottom-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 60%)",
          filter: "blur(80px)",
        }}
        aria-hidden
      />

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center relative z-10">
        <AnimatePresence mode="wait">
          {!roomCode && view === "select" && (
            <SelectView
              key="select"
              nick={localPlayer.nick}
              onSelect={(v) => setView(v)}
            />
          )}
          {!roomCode && view === "create" && (
            <CreateRoomView
              key="create"
              onBack={() => setView("select")}
              onCreated={(code) => {
                setRoomCode(code);
                setIsHost(true);
              }}
            />
          )}
          {!roomCode && view === "join" && (
            <JoinRoomView
              key="join"
              onBack={() => setView("select")}
              onJoined={(code) => {
                setRoomCode(code);
                setIsHost(false);
              }}
            />
          )}
          {roomCode && (
            <LobbyWaitingView
              key="waiting"
              roomCode={roomCode}
              nick={localPlayer.nick}
              isHost={isHost}
              onLeave={() => {
                setRoomCode(null);
                setView("select");
                useGameStore.getState().setRoom(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <ToastContainer />
    </main>
  );
}
