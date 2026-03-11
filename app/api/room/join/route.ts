// app/api/room/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis, roomKey, ROOM_TTL } from "@/lib/redis";
import type { Room } from "@/lib/types";

function getPlayerColor(index: number): string {
  const colors = [
    "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b",
    "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4",
    "#84cc16", "#f97316", "#e11d48", "#6366f1",
  ];
  return colors[index % colors.length];
}

export async function POST(req: NextRequest) {
  try {
    const { code, player, password } = await req.json();
    const upperCode = code?.toUpperCase();

    const raw = await redis.get<string>(roomKey(upperCode));
    if (!raw) {
      return NextResponse.json({ success: false, error: "Bu oda kodu bulunamadı." }, { status: 404 });
    }

    const room: Room = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (room.currentPhase !== "lobby") {
      return NextResponse.json({ success: false, error: "Oyun zaten başladı." }, { status: 400 });
    }
    if (room.players.length >= room.settings.maxPlayers) {
      return NextResponse.json({ success: false, error: "Oda dolu." }, { status: 400 });
    }
    if (room.settings.isPrivate && room.settings.password !== password) {
      return NextResponse.json({ success: false, error: "Şifre yanlış." }, { status: 403 });
    }

    // Aynı oyuncu tekrar katılıyorsa (reconnect), mevcut kaydı güncelle
    const existingIndex = room.players.findIndex((p) => p.id === player.id);
    if (existingIndex >= 0) {
      room.players[existingIndex] = { ...room.players[existingIndex], ...player };
    } else {
      const colorIndex = room.players.length;
      const newPlayer = { ...player, isHost: false, color: getPlayerColor(colorIndex) };
      room.players.push(newPlayer);
    }

    await redis.set(roomKey(upperCode), JSON.stringify(room), { ex: ROOM_TTL });

    return NextResponse.json({ success: true, room });
  } catch (err) {
    console.error("[/api/room/join] Hata:", err);
    return NextResponse.json({ success: false, error: "Odaya katılınamadı." }, { status: 500 });
  }
}
