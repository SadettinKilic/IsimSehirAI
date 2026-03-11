"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// =============================================
// GLASS PANEL
// =============================================
interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  glow?: "primary" | "accent" | "none";
  animate?: boolean;
  onClick?: () => void;
}

export function GlassPanel({
  children,
  className,
  glow = "none",
  animate = false,
  onClick,
}: GlassPanelProps) {
  const glowClass =
    glow === "primary"
      ? "glow-primary"
      : glow === "accent"
      ? "glow-accent"
      : "";

  const base = cn(
    "glass glass-highlight relative w-full",
    glowClass,
    className
  );

  if (animate) {
    return (
      <motion.div
        className={base}
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        onClick={onClick}
      >
        {/* z-[1] garantisi: pseudo-element (z:0) her zaman altta, içerik üstte */}
        <div className="relative z-[1]">{children}</div>
      </motion.div>
    );
  }

  return (
    <div className={base} onClick={onClick}>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

// =============================================
// BUTTON
// =============================================
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-violet-600/90 to-violet-500/90 hover:from-violet-500 hover:to-violet-400 text-white shadow-[0_4px_24px_rgba(124,58,237,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_32px_rgba(124,58,237,0.7),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-violet-400/40",
  secondary:
    "glass-sm border-white/20 text-white/90 hover:bg-white/10 hover:border-white/40 shadow-lg",
  ghost:
    "bg-white/5 border border-transparent text-white/70 hover:text-white hover:border-white/20 hover:bg-white/10",
  danger:
    "bg-gradient-to-r from-red-600/90 to-red-500/90 hover:from-red-500 hover:to-red-400 text-white shadow-[0_4px_24px_rgba(239,68,68,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-red-400/40",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm min-h-[36px] rounded-xl",
  md: "px-6 py-3.5 text-base min-h-[50px] rounded-xl",
  lg: "px-8 py-4 text-lg min-h-[58px] rounded-2xl",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className,
  disabled,
  onClick,
  type = "button",
  ...props
}: ButtonProps) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2.5 font-semibold",
    "transition-all duration-300 cursor-pointer select-none",
    "focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:ring-offset-2 focus:ring-offset-[#090314]",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    fullWidth ? "w-full" : undefined,
    className
  );

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      className={cls}
      style={{ display: fullWidth ? "flex" : "inline-flex" }}
    >
      <button
        type={type}
        className="flex items-center justify-center gap-2.5 w-full h-full"
        disabled={disabled || isLoading}
        onClick={onClick}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {isLoading ? (
          <Spinner />
        ) : (
          <>
            {leftIcon && <span className="shrink-0 text-[1.15em]">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0 text-[1.15em]">{rightIcon}</span>}
          </>
        )}
      </button>
    </motion.div>
  );
}

// =============================================
// TEXT INPUT
// =============================================
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export function TextInput({
  label,
  error,
  hint,
  leftAddon,
  rightAddon,
  className,
  id,
  ...props
}: TextInputProps) {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`;

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold tracking-wide text-white/60 ml-1 uppercase"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center group">
        {leftAddon && (
          <span className="absolute left-4 w-8 flex items-center justify-center text-white/40 pointer-events-none text-xl transition-colors group-focus-within:text-violet-400">
            {leftAddon}
          </span>
        )}
        <input
          id={inputId}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          className={cn(
            "w-full glass-sm text-white/90 placeholder:text-white/20",
            "px-6 py-4 min-h-[56px] text-base font-medium",
            "transition-all duration-300",
            "focus:outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-white/30 focus:bg-white/10",
            "hover:bg-white/5",
            error && "border-red-400/60 focus:border-red-400/80 focus:ring-red-400/30",
            leftAddon ? "pl-14" : undefined,
            rightAddon ? "pr-14" : undefined,
            className
          )}
          {...props}
        />
        {rightAddon && (
          <span className="absolute right-4 w-8 flex items-center justify-center text-white/40 pointer-events-none text-xl transition-colors group-focus-within:text-violet-400">
            {rightAddon}
          </span>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-400 ml-1 flex items-center gap-1 font-medium">
          <span className="text-lg">⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-white/40 ml-1">{hint}</p>
      )}
    </div>
  );
}

// =============================================
// SPINNER
// =============================================
export function Spinner({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = { sm: "w-5 h-5", md: "w-6 h-6", lg: "w-8 h-8" }[size];
  return (
    <svg
      className={cn("animate-spin text-current", sizeClass)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// =============================================
// BADGE
// =============================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "danger" | "neutral";
  className?: string;
}

const BADGE_VARIANTS = {
  primary: "bg-violet-500/20 text-violet-200 border-violet-500/30 shadow-[0_0_10px_rgba(124,58,237,0.3)]",
  success: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
  warning: "bg-amber-500/20 text-amber-200 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
  danger: "bg-red-500/20 text-red-200 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]",
  neutral: "bg-white/10 text-white/80 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]",
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md",
        BADGE_VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
