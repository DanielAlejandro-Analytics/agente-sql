// Límite de preguntas por visitante y total, copiado del RAG (rag-docs-nextjs/src/lib/ask.ts).
export const DAILY_LIMIT = 5;
// Tope total. La cuota gratuita de Gemini es por proyecto (no por clave) y se comparte con el demo del RAG;
// un usuario reporta 500 llamadas/día para gemini-3.5-flash-lite (foro de Google AI, nov. 2026, sin confirmar).
// Con hasta 3 llamadas por pregunta, 60 preguntas son a lo más 180 llamadas.
export const GLOBAL_DAILY_LIMIT = 60;
export const MAX_QUESTION = 300;

// Contador en memoria por instancia; se reinicia con cada arranque en frío y no se comparte entre
// instancias. Basta para un demo: el plan gratuito de Gemini no cobra. Pasar a Redis/KV si hay abuso real.
const usage = new Map<string, { day: string; count: number }>();
let total = { day: "", count: 0 };
export function takeQuota(visitor: string): { ok: boolean; remaining: number; reason?: "visitor" | "global" } {
  const day = new Date().toISOString().slice(0, 10);
  if (total.day !== day) {
    total = { day, count: 0 };
    usage.clear(); // los contadores de días anteriores ya no sirven
  }
  const count = usage.get(visitor)?.count ?? 0;
  if (count >= DAILY_LIMIT) return { ok: false, remaining: 0, reason: "visitor" };
  if (total.count >= GLOBAL_DAILY_LIMIT) return { ok: false, remaining: DAILY_LIMIT - count, reason: "global" };
  usage.set(visitor, { day, count: count + 1 });
  total.count++;
  return { ok: true, remaining: DAILY_LIMIT - count - 1 };
}
