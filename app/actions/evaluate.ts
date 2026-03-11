"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { GeminiInput, EvaluationResult } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// ZOD SCHEMAS — AI yanıtını tip-güvenli şekilde doğrular
// ─────────────────────────────────────────────────────────────
const CategoryScoreSchema = z.object({
  puan: z.number().int().min(0).max(100),
  gerekce: z.string(),
});

const PlayerEvaluationSchema = z.object({
  nick: z.string(),
  puanlar: z.record(z.string(), CategoryScoreSchema),
  toplam: z.number().int().min(0),
});

const EvaluationResultSchema = z.object({
  degerlendirme: z.array(PlayerEvaluationSchema),
});

// ─────────────────────────────────────────────────────────────
// SERVER ACTION: evaluateRound
// ─────────────────────────────────────────────────────────────
export async function evaluateRound(
  input: GeminiInput
): Promise<{ success: true; result: EvaluationResult } | { success: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Gemini API anahtarı bulunamadı." };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Sen "İsim Şehir Hayvan" oyununun hakem yapay zekasısın. Türkçe konuşursun.

Verilen tur harfi: "${input.tur_harfi}"
Kategoriler: ${input.kategoriler.join(", ")}

Oyuncuların cevapları:
${JSON.stringify(input.kullanicilar, null, 2)}

Puanlama kuralları:
1. Cevap boşsa veya tur harfiyle başlamıyorsa: 0 puan
2. Sadece bir oyuncu o cevabı verdiyse (benzersiz): 10 puan
3. Birden fazla oyuncu aynı/çok benzer cevap verdiyse: 5 puan
4. Yaratıcı, doğru ama nadir cevaplar için: 10 puan (benzersizlik değerlendirmesi dahil)
5. Kısaltma veya yazım yanlışları için: toleranslı davran, cevabın özü doğruysa puan ver

Şimdi YALNIZCA aşağıdaki JSON formatında yanıt ver. Başka hiçbir şey yazma:

{
  "degerlendirme": [
    {
      "nick": "OyuncuAdı",
      "puanlar": {
        "Kategori": { "puan": 10, "gerekce": "Kısa açıklama" }
      },
      "toplam": 30
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    // JSON bloğunu temizle (```json ... ``` sarmalayıcısını kaldır)
    const jsonText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(jsonText);
    const validated = EvaluationResultSchema.parse(parsed) as EvaluationResult;

    return { success: true, result: validated };
  } catch (err) {
    console.error("[evaluateRound] Hata:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "AI değerlendirmesi başarısız.",
    };
  }
}
