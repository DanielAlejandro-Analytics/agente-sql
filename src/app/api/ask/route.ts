import { AnswerError, ask } from "@/lib/agent";
import { QuotaError } from "@/lib/llm";
import { MAX_QUESTION, takeQuota } from "@/lib/quota";
import { SqlTimeoutError } from "@/lib/sql";

export async function POST(request: Request) {
  let question: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_QUESTION * 4) return Response.json({ error: "Petición demasiado grande." }, { status: 413 });
    ({ question } = JSON.parse(raw));
  } catch {
    return Response.json({ error: "Petición inválida." }, { status: 400 });
  }
  if (typeof question !== "string" || question.trim().length < 3 || question.length > MAX_QUESTION) {
    return Response.json({ error: `Escribe una pregunta de 3 a ${MAX_QUESTION} caracteres.` }, { status: 400 });
  }

  // En Vercel, el primer valor de x-forwarded-for es la IP del visitante.
  const visitor = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const quota = takeQuota(visitor);
  if (!quota.ok) {
    const error =
      quota.reason === "global"
        ? "El demo llegó a su límite de preguntas de hoy. Vuelve mañana."
        : "Llegaste al límite de preguntas de hoy. Vuelve mañana.";
    return Response.json({ error, remaining: quota.remaining }, { status: 429 });
  }

  const { remaining } = quota;
  try {
    return Response.json({ ...(await ask(question.trim())), remaining });
  } catch (e) {
    if (e instanceof AnswerError) return Response.json({ error: e.message, remaining }, { status: 422 });
    if (e instanceof SqlTimeoutError) {
      return Response.json({ error: "La consulta tardó demasiado. Prueba con una pregunta más acotada.", remaining }, { status: 422 });
    }
    if (e instanceof QuotaError) {
      return Response.json({ error: "Se agotó la cuota gratuita del modelo por ahora. Intenta más tarde.", remaining }, { status: 503 });
    }
    console.error(e);
    return Response.json({ error: "No se pudo generar la respuesta.", remaining }, { status: 500 });
  }
}
