// app/api/room/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis, roomKey, ROOM_TTL } from "@/lib/redis";
import type { Room } from "@/lib/types";

const LETTERS = "ABCDEFGHİJKLMNOPRSTUYZ".split("");

export async function POST(req: NextRequest) {
  try {
    const { code, playerId } = await req.json();
    const upperCode = code?.toUpperCase();

    const raw = await redis.get<string>(roomKey(upperCode));
    if (!raw) {
      return NextResponse.json({ success: false, error: "Oda bulunamadı." }, { status: 404 });
    }

    const room: Room = typeof raw === "string" ? JSON.parse(raw) : raw;

    const host = room.players.find((p) => p.id === playerId);
    if (!host?.isHost) {
      return NextResponse.json({ success: false, error: "Yalnızca host oyunu başlatabilir." }, { status: 403 });
    }

    const available = LETTERS.filter((l) => !room.usedLetters.includes(l));
    if (available.length === 0) {
      return NextResponse.json({ success: false, error: "Tüm harfler kullanıldı." }, { status: 400 });
    }

    const letter = available[Math.floor(Math.random() * available.length)];
    room.usedLetters.push(letter);
    room.currentLetter = letter;
    room.currentRound += 1;
    room.currentPhase = "playing";
    room.answers = {};
    room.evaluation = null;

    await redis.set(roomKey(upperCode), JSON.stringify(room), { ex: ROOM_TTL });

    return NextResponse.json({ success: true, letter, round: room.currentRound, room });
  } catch (err) {
    console.error("[/api/room/start] Hata:", err);
    return NextResponse.json({ success: false, error: "Oyun başlatılamadı." }, { status: 500 });
  }
}
