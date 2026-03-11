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
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `Sen "İsim Şehir Hayvan" oyununun hakem yapay zekasısın. Türkçe konuşursun.

'İ' ile 'I', 'U' ile 'Ü', 'O' ile 'Ö', 'C' ile 'Ç', 'S' ile 'Ş' birbirinin yerine geçer
Verilen tur harfi: "${input.tur_harfi}"
Kategoriler: ${input.kategoriler.join(", ")}

Oyuncuların cevapları:
${JSON.stringify(input.kullanicilar, null, 2)}

Puanlama kuralları (cevapları lowercase olarak incele):
- Cevap, kategoriyle doğrudan ve net bir şekilde ilişkili olmalıdır (Örn: 'N' harfinde 'Bitki' kategorisine 'Narenciye' yazılamaz, çünkü bu bir gruptur, bir bitki adı değildir).
- Cevap boşsa veya tur harfiyle başlamıyorsa: 0 puan
- Sadece bir oyuncu o cevabı verdiyse (benzersiz): 10 puan
- Birden fazla oyuncu aynı cevabı verdiyse: 5 puan
- Türkçe dışındaki dillerde de olsa gerçek olduğu kanıtlanabilir olanlar kabul edilir.
- Yazım yanlışları için: toleranslı olma, yanlış yazım 0 puan

Şimdi YALNIZCA aşağıdaki JSON formatında yanıt ver. Başka hiçbir şey yazma:

{
  "degerlendirme": [
    {
      "nick": "OyuncuAdı",
      "puanlar": {
        "Kategori": { "puan": 10, "gerekce": "Kısa açıklama(Sadece 1 cümle)" }
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
