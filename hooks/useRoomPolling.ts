// hooks/useRoomPolling.ts — Redis polling ile oda durumunu senkronize eder.
// useSocket.ts'in yerini alır. Her 2 saniyede bir /api/room/[code] GET yapar.
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { getRoomState } from "@/lib/gameApi";
import type { Room } from "@/lib/types";

interface UseRoomPollingOptions {
  code: string | null;
  onRoomUpdated?: (room: Room) => void;
  /** Oda fazı değiştiğinde tetiklenir */
  onPhaseChange?: (phase: Room["currentPhase"], room: Room) => void;
  /** ms cinsinden polling aralığı, default: 2000 */
  interval?: number;
}

export function useRoomPolling({
  code,
  onRoomUpdated,
  onPhaseChange,
  interval = 2000,
}: UseRoomPollingOptions) {
  const { setRoom, setIsConnected } = useGameStore();
  const prevPhaseRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onRoomUpdated, onPhaseChange });
  callbacksRef.current = { onRoomUpdated, onPhaseChange };

  const poll = useCallback(async () => {
    if (!code) return;
    try {
      const res = await getRoomState(code);
      if (res.success) {
        setIsConnected(true);
        setRoom(res.room);
        callbacksRef.current.onRoomUpdated?.(res.room);

        // Faz değişikliğini bildir
        if (prevPhaseRef.current !== res.room.currentPhase) {
          prevPhaseRef.current = res.room.currentPhase;
          callbacksRef.current.onPhaseChange?.(res.room.currentPhase, res.room);
        }
      } else {
        setIsConnected(false);
      }
    } catch {
      setIsConnected(false);
    }
  }, [code, setRoom, setIsConnected]);

  useEffect(() => {
    if (!code) return;

    // İlk poll hemen yap
    poll();

    const timer = setInterval(poll, interval);
    return () => clearInterval(timer);
  }, [code, interval, poll]);
}
