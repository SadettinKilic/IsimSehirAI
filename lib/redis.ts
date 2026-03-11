// lib/redis.ts — Upstash Redis singleton client
// KV_REST_API_URL ve KV_REST_API_TOKEN Vercel env'den okunur.

import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Oda TTL: 2 saat (saniye)
export const ROOM_TTL = 60 * 60 * 2;

// Oda key formatı
export const roomKey = (code: string) => `room:${code.toUpperCase()}`;
