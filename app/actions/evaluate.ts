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
- Sadece bir oyuncu o doğru cevabı verdiyse (benzersiz): 10 puan
- Birden fazla oyuncu aynı doğru cevabı verdiyse: 5 puan
- Türkçe dışındaki dillerde de olsa gerçek olduğu kanıtlanabilir olanlar kabul edilir (Örn: R harfiyle isim Rose olabilir, şehir de Rosenborg olabilir).
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

  const MAX_RETRIES = 5;
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
    } catch (err: any) {
      lastError = err;
      console.warn(`[evaluateRound] Deneme ${attempt}/${MAX_RETRIES} başarısız:`, err?.message);

      // Sadece 503 Service Unavailable hatasıysa tekrar dene
      if (err?.message?.includes("503") || err?.status === 503) {
        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 5s, 10s, 20s, 40s bekle (maxDuration sınırına takılmamak için dikkatli hesaplandı)
          const delay = 5000 * Math.pow(2, attempt - 1);
          console.log(`[evaluateRound] 503 alındı, ${delay / 1000} saniye sonra tekrar denenecek...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue; // Sonraki denemeye geç
        }
      }

      // Diğer hatalarda (veya tüm denemeler bittiyse) döngüden çık
      break;
    }
  }

  console.error("[evaluateRound] Tüm denemeler başarısız oldu:", lastError);
  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : "AI değerlendirmesi başarısız.",
  };
}
