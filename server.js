// server.js — Next.js + Socket.io Custom Server
// Hem Next.js sayfa isteklerini, hem de WebSocket bağlantılarını
// aynı port (3000) üzerinden yönetir.

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ============================================================
// ROOM STORE (In-Memory)
// Bu basit store, Socket.io sunucusunun belleğinde odaları tutar.
// Adım 3 için yeterlidir; ileride Redis veya DB'ye taşınabilir.
// ============================================================
/** @type {Map<string, import('./lib/types').Room>} */
const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Çakışma önlemi
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

function getPlayerColor(index) {
  const colors = [
    "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b",
    "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4",
    "#84cc16", "#f97316", "#e11d48", "#6366f1",
  ];
  return colors[index % colors.length];
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // ============================================================
  // SOCKET.IO SERVER
  // ============================================================
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Bağlantı kuruldu: ${socket.id}`);

    // ──────────────────────────────────────────────
    // CREATE ROOM
    // ──────────────────────────────────────────────
    socket.on("create_room", ({ player, settings }, callback) => {
      try {
        const code = generateRoomCode();
        const roomId = `room_${code}`;
        const host = { ...player, isHost: true, color: getPlayerColor(0) };

        /** @type {import('./lib/types').Room} */
        const room = {
          id: roomId,
          code,
          hostId: host.id,
          players: [host],
          settings: {
            roundDuration: settings?.roundDuration ?? 60,
            maxPlayers: settings?.maxPlayers ?? 8,
            letterPool: [],
            categories: settings?.categories ?? ["İsim", "Şehir", "Hayvan", "Meslek"],
            isPrivate: settings?.isPrivate ?? false,
            password: settings?.password ?? "",
          },
          currentPhase: "lobby",
          currentLetter: null,
          currentRound: 0,
          totalRounds: 5,
          usedLetters: [],
        };

        rooms.set(code, room);
        socket.join(roomId);

        console.log(`[Room] Oluşturuldu: ${code} | Host: ${host.nick}`);
        callback({ success: true, room });
      } catch (err) {
        console.error("[create_room] Hata:", err);
        callback({ success: false, error: "Oda oluşturulamadı." });
      }
    });

    // ──────────────────────────────────────────────
    // JOIN ROOM
    // ──────────────────────────────────────────────
    socket.on("join_room", ({ code, player, password }, callback) => {
      try {
        const room = rooms.get(code.toUpperCase());

        if (!room) {
          return callback({ success: false, error: "Bu oda kodu bulunamadı." });
        }
        if (room.currentPhase !== "lobby") {
          return callback({ success: false, error: "Oyun zaten başladı." });
        }
        if (room.players.length >= room.settings.maxPlayers) {
          return callback({ success: false, error: "Oda dolu." });
        }
        if (room.settings.isPrivate && room.settings.password !== password) {
          return callback({ success: false, error: "Şifre yanlış." });
        }

        const colorIndex = room.players.length;
        const newPlayer = { ...player, isHost: false, color: getPlayerColor(colorIndex) };
        room.players.push(newPlayer);

        const roomId = `room_${code.toUpperCase()}`;
        socket.join(roomId);

        // Odadaki herkese güncel oyuncu listesini gönder
        io.to(roomId).emit("room_updated", room);

        console.log(`[Room] Katılım: ${code} | Oyuncu: ${newPlayer.nick}`);
        callback({ success: true, room });
      } catch (err) {
        console.error("[join_room] Hata:", err);
        callback({ success: false, error: "Odaya katılınamadı." });
      }
    });

    // ──────────────────────────────────────────────
    // START GAME (Host)
    // ──────────────────────────────────────────────
    socket.on("start_game", ({ code, playerId }, callback) => {
      try {
        const room = rooms.get(code?.toUpperCase());
        if (!room) return callback?.({ success: false, error: "Oda bulunamadı." });

        const host = room.players.find((p) => p.id === playerId);
        if (!host?.isHost) return callback?.({ success: false, error: "Yalnızca host oyunu başlatabilir." });
        if (room.players.length < 1) return callback?.({ success: false, error: "En az 1 oyuncu gerekli." });

        // Harf seçimi
        const LETTERS = "ABCDEFGHİJKLMNOPRSTUYZ".split("");
        const available = LETTERS.filter((l) => !room.usedLetters.includes(l));
        const letter = available[Math.floor(Math.random() * available.length)];
        room.usedLetters.push(letter);
        room.currentLetter = letter;
        room.currentRound += 1;
        room.currentPhase = "playing";
        room.answers = {}; // { playerId: { category: answer } }

        const roomId = `room_${room.code}`;
        io.to(roomId).emit("round_started", {
          letter,
          round: room.currentRound,
          totalRounds: room.totalRounds,
          duration: room.settings.roundDuration,
          categories: room.settings.categories,
        });

        console.log(`[Game] Tur ${room.currentRound} başladı: ${code} | Harf: ${letter}`);
        callback?.({ success: true, letter, round: room.currentRound });
      } catch (err) {
        console.error("[start_game] Hata:", err);
        callback?.({ success: false, error: "Oyun başlatılamadı." });
      }
    });

    // ──────────────────────────────────────────────
    // SUBMIT ANSWERS
    // ──────────────────────────────────────────────
    socket.on("submit_answers", ({ code, playerId, answers }, callback) => {
      try {
        const room = rooms.get(code?.toUpperCase());
        if (!room) return callback?.({ success: false, error: "Oda bulunamadı." });

        // Cevapları kaydet
        if (!room.answers) room.answers = {};
        room.answers[playerId] = answers;

        callback?.({ success: true });
        console.log(`[Game] Cevaplar alındı: ${socket.id} -> ${code}`);

        // Tüm aktif oyuncular cevap gönderdiyse, round_complete
        const activePlayers = room.players;
        const submittedCount = Object.keys(room.answers).length;

        if (submittedCount >= activePlayers.length) {
          room.currentPhase = "evaluating";
          const roomId = `room_${room.code}`;

          // Nick→answers formatını oluştur
          const kullanicilar = activePlayers.map((p) => ({
            nick: p.nick,
            cevaplar: room.answers[p.id] ?? {},
          }));

          io.to(roomId).emit("round_complete", {
            letter: room.currentLetter,
            round: room.currentRound,
            kullanicilar,
            categories: room.settings.categories,
          });
          console.log(`[Game] Tur tamamlandı: ${code} | Tur: ${room.currentRound}`);
        }
      } catch (err) {
        console.error("[submit_answers] Hata:", err);
        callback?.({ success: false, error: "Cevaplar gönderilemedi." });
      }
    });

    // ──────────────────────────────────────────────
    // SCORES_UPDATED (Evaluation done, host sends scores)
    // ──────────────────────────────────────────────
    socket.on("scores_updated", ({ code, evaluation, playerScores }) => {
      try {
        const room = rooms.get(code?.toUpperCase());
        if (!room) return;

        // Puanları oyunculara ekle
        playerScores?.forEach(({ nick, score }) => {
          const player = room.players.find((p) => p.nick === nick);
          if (player) {
            player.totalScore = (player.totalScore ?? 0) + score;
            player.roundScores = [...(player.roundScores ?? []), score];
          }
        });

        const roomId = `room_${room.code}`;
        const isGameOver = room.currentRound >= room.totalRounds;

        if (isGameOver) {
          room.currentPhase = "finished";
          io.to(roomId).emit("game_over", {
            players: room.players,
            evaluation,
          });
          console.log(`[Game] Oyun bitti: ${code}`);
        } else {
          room.currentPhase = "lobby";
          io.to(roomId).emit("round_results", {
            evaluation,
            players: room.players,
            nextRound: room.currentRound + 1,
          });
        }
      } catch (err) {
        console.error("[scores_updated] Hata:", err);
      }
    });

    // ──────────────────────────────────────────────
    // DISCONNECT
    // ──────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Bağlantı kesildi: ${socket.id}`);
      // Oyuncuyu bulduğumuz tüm odalardan çıkar
      for (const [code, room] of rooms.entries()) {
        const prevCount = room.players.length;
        room.players = room.players.filter((p) => p.id !== socket.id);

        if (room.players.length !== prevCount) {
          const roomId = `room_${code}`;
          if (room.players.length === 0) {
            rooms.delete(code);
            console.log(`[Room] Boşaldı ve silindi: ${code}`);
          } else {
            // Host gittiyse, sıradaki oyuncuyu host yap
            if (!room.players.find((p) => p.isHost)) {
              room.players[0].isHost = true;
              room.hostId = room.players[0].id;
            }
            io.to(roomId).emit("room_updated", room);
            console.log(`[Room] Oyuncu ayrıldı: ${code}`);
          }
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`✅ Sunucu hazır: http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`);
    console.log(`   Mod: ${dev ? "Geliştirme" : "Production"}`);
  });
});
