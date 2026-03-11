// app/api/room/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis, roomKey, ROOM_TTL } from "@/lib/redis";
import type { Room } from "@/lib/types";

function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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
    const { player, settings } = await req.json();

    // Benzersiz kod bul
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await redis.exists(roomKey(code));
      if (!exists) break;
      code = generateRoomCode();
      attempts++;
    }

    const roomId = `room_${code}`;
    const host = { ...player, isHost: true, color: getPlayerColor(0) };

    const room: Room = {
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
      answers: {},
      evaluation: null,
    };

    await redis.set(roomKey(code), JSON.stringify(room), { ex: ROOM_TTL });

    return NextResponse.json({ success: true, room });
  } catch (err) {
    console.error("[/api/room/create] Hata:", err);
    return NextResponse.json({ success: false, error: "Oda oluşturulamadı." }, { status: 500 });
  }
}
