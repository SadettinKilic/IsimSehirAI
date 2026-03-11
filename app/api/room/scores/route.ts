// app/api/room/scores/route.ts
// Host tarafından hesaplanan AI değerlendirmesini ve skorları Redis'e yazar.
// Tur sonuna göre phase → "results" veya "finished" olur.
import { NextRequest, NextResponse } from "next/server";
import { redis, roomKey, ROOM_TTL } from "@/lib/redis";
import type { Room } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { code, evaluation, playerScores } = await req.json();
    const upperCode = code?.toUpperCase();

    const raw = await redis.get<string>(roomKey(upperCode));
    if (!raw) {
      return NextResponse.json({ success: false, error: "Oda bulunamadı." }, { status: 404 });
    }

    const room: Room = typeof raw === "string" ? JSON.parse(raw) : raw;

    // Puanları oyunculara ekle
    playerScores?.forEach(({ nick, score }: { nick: string; score: number }) => {
      const player = room.players.find((p) => p.nick === nick);
      if (player) {
        player.totalScore = (player.totalScore ?? 0) + score;
        player.roundScores = [...(player.roundScores ?? []), score];
      }
    });

    room.evaluation = evaluation;

    const isGameOver = room.currentRound >= room.totalRounds;
    // Oyun bitse bile değerlendirmeleri görmek için her zaman 'results' ekranına düşüyoruz.
    // Host results sayfasından "Sonuçları Gör"e basınca 'finished' yapılıp podyuma gidilecek.
    room.currentPhase = "results";

    await redis.set(roomKey(upperCode), JSON.stringify(room), { ex: ROOM_TTL });

    return NextResponse.json({ success: true, phase: room.currentPhase });
  } catch (err) {
    console.error("[/api/room/scores] Hata:", err);
    return NextResponse.json({ success: false, error: "Skorlar güncellenemedi." }, { status: 500 });
  }
}
