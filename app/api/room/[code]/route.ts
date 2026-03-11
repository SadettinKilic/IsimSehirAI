// app/api/room/[code]/route.ts
// GET — Polling endpoint: oda durumunu döner.
// PATCH — Host'un oda ayarlarını güncellemesi için.
import { NextRequest, NextResponse } from "next/server";
import { redis, roomKey, ROOM_TTL } from "@/lib/redis";
import type { Room } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const upperCode = code?.toUpperCase();

    const raw = await redis.get<string>(roomKey(upperCode));
    if (!raw) {
      return NextResponse.json({ success: false, error: "Oda bulunamadı." }, { status: 404 });
    }

    const room = typeof raw === "string" ? JSON.parse(raw) : raw;

    return NextResponse.json({ success: true, room });
  } catch (err) {
    console.error("[/api/room/[code] GET] Hata:", err);
    return NextResponse.json({ success: false, error: "Oda durumu alınamadı." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const upperCode = code?.toUpperCase();
    const { settings } = await req.json();

    const raw = await redis.get<string>(roomKey(upperCode));
    if (!raw) {
      return NextResponse.json({ success: false, error: "Oda bulunamadı." }, { status: 404 });
    }

    const room: Room = typeof raw === "string" ? JSON.parse(raw) : raw;

    // Sadece lobby aşamasında ayar değişikliğine izin ver
    if (room.currentPhase !== "lobby") {
      return NextResponse.json({ success: false, error: "Oyun devam ederken ayarlar değiştirilemez." }, { status: 400 });
    }

    room.settings = { ...room.settings, ...settings };
    if (settings.totalRounds) room.totalRounds = settings.totalRounds;

    await redis.set(roomKey(upperCode), JSON.stringify(room), { ex: ROOM_TTL });
    return NextResponse.json({ success: true, room });
  } catch (err) {
    console.error("[/api/room/[code] PATCH] Hata:", err);
    return NextResponse.json({ success: false, error: "Ayarlar güncellenemedi." }, { status: 500 });
  }
}
