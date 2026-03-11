// app/api/room/finish/route.ts
// Host tarafından oyunun tamamlandığını ve sonuçların (podyum) gösterilmesini sağlar.
import { NextRequest, NextResponse } from "next/server";
import { redis, roomKey, ROOM_TTL } from "@/lib/redis";
import type { Room } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { code, playerId } = await req.json();
    const upperCode = code?.toUpperCase();

    const raw = await redis.get<string>(roomKey(upperCode));
    if (!raw) {
      return NextResponse.json({ success: false, error: "Oda bulunamadı." }, { status: 404 });
    }

    const room: Room = typeof raw === "string" ? JSON.parse(raw) : raw;
    
    // Sadece host bitirebilir
    if (room.hostId !== playerId) {
      return NextResponse.json({ success: false, error: "Sadece host oyunu bitirebilir." }, { status: 403 });
    }

    // Phase'i finished yap (Odada bulunanları podyuma göndermek için sinyal verilir)
    room.currentPhase = "finished";

    await redis.set(roomKey(upperCode), JSON.stringify(room), { ex: ROOM_TTL });

    return NextResponse.json({ success: true, phase: room.currentPhase });
  } catch (err) {
    console.error("[/api/room/finish] Hata:", err);
    return NextResponse.json({ success: false, error: "Oyun bitirilemedi." }, { status: 500 });
  }
}
