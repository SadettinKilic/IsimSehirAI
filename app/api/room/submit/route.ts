// app/api/room/submit/route.ts
// Oyuncu cevaplarını Redis'teki oda state'ine kaydeder.
// Tüm oyuncular gönderince phase → "evaluating" olur.
import { NextRequest, NextResponse } from "next/server";
import { redis, roomKey, ROOM_TTL } from "@/lib/redis";
import type { Room } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { code, playerId, answers } = await req.json();
    const upperCode = code?.toUpperCase();

    const raw = await redis.get<string>(roomKey(upperCode));
    if (!raw) {
      return NextResponse.json({ success: false, error: "Oda bulunamadı." }, { status: 404 });
    }

    const room: Room = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (!room.answers) room.answers = {};
    room.answers[playerId] = answers;

    // Tüm aktif oyuncular cevap gönderdiyse → evaluating
    const submittedCount = Object.keys(room.answers).length;
    if (submittedCount >= room.players.length) {
      room.currentPhase = "evaluating";
    }

    await redis.set(roomKey(upperCode), JSON.stringify(room), { ex: ROOM_TTL });

    return NextResponse.json({
      success: true,
      phase: room.currentPhase,
      // Host AI değerlendirmesi için cevapları döner
      kullanicilar: room.players.map((p) => ({
        nick: p.nick,
        cevaplar: room.answers![p.id] ?? {},
      })),
      categories: room.settings.categories,
      letter: room.currentLetter,
    });
  } catch (err) {
    console.error("[/api/room/submit] Hata:", err);
    return NextResponse.json({ success: false, error: "Cevaplar gönderilemedi." }, { status: 500 });
  }
}
