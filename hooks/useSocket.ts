// hooks/useSocket.ts — React lifecycle ile Socket.io yönetimi
// Bileşen mount edildiğinde socket bağlar, unmount'ta temizleme yapar.
// Zustand store'u ile bağlantı durumunu senkronize eder.

"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";
import type { Room } from "@/lib/types";

interface UseSocketOptions {
  onRoomUpdated?: (room: Room) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { setIsConnected, setRoom } = useGameStore();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const socket = getSocket();

    // Bağlan (zaten bağlıysa idempotent)
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
      console.log("[useSocket] Bağlantı kuruldu:", socket.id);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log("[useSocket] Bağlantı kesildi");
    };

    const onRoomUpdated = (room: Room) => {
      setRoom(room);
      optionsRef.current.onRoomUpdated?.(room);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room_updated", onRoomUpdated);

    // Bağlantı anlık olarak gerçekleşmiş olabilir
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_updated", onRoomUpdated);
      // Socket'i kapatmıyoruz; singleton olduğu için uygulama genelinde canlı kalır.
    };
  }, [setIsConnected, setRoom]);

  return getSocket();
}
