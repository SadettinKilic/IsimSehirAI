// app/api/room/[code]/route.ts
// GET — Polling endpoint: oda durumunu döner.
// Client her ~2 saniyede bu endpoint'i çağırır.
import { NextRequest, NextResponse } from "next/server";
import { redis, roomKey } from "@/lib/redis";

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
    console.error("[/api/room/[code]] Hata:", err);
    return NextResponse.json({ success: false, error: "Oda durumu alınamadı." }, { status: 500 });
  }
}
