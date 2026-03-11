"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore, selectToasts } from "@/store/gameStore";
import { cn } from "@/lib/utils";
import type { Toast as ToastType } from "@/lib/types";

const ICONS: Record<ToastType["type"], string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const COLORS: Record<ToastType["type"], string> = {
  success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  error: "border-red-400/40 bg-red-500/10 text-red-300",
  warning: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  info: "border-violet-400/40 bg-violet-500/10 text-violet-300",
};

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useGameStore((s) => s.removeToast);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "glass-sm border flex items-start gap-3 p-4 pr-10 max-w-sm w-full cursor-pointer",
        "shadow-xl relative",
        COLORS[toast.type]
      )}
      onClick={() => removeToast(toast.id)}
      role="alert"
    >
      <span className="text-lg shrink-0 mt-0.5">{ICONS[toast.type]}</span>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className="font-semibold text-sm text-white">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-white/60 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        className="absolute top-3 right-3 text-white/40 hover:text-white/70 transition-colors text-xs"
        onClick={(e) => {
          e.stopPropagation();
          removeToast(toast.id);
        }}
        aria-label="Bildirimi kapat"
      >
        ✕
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useGameStore(selectToasts);

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end"
      aria-live="polite"
      aria-label="Bildirimler"
    >
      <AnimatePresence mode="sync">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
