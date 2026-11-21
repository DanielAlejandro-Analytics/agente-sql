// Cliente mínimo para Gemini y Groq (REST, sin SDK). Ambos en plan gratuito.
// DeepSeek (de pago) queda fuera hasta que haga falta.
export type Provider = "gemini" | "groq";

export class QuotaError extends Error {}

const ENV = {
  gemini: { key: "GEMINI_API_KEY", model: "GEMINI_MODEL" },
  groq: { key: "GROQ_API_KEY", model: "GROQ_MODEL" },
} as const;

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name} en .env.local`);
  return v;
}

export const modelOf = (provider: Provider) => env(ENV[provider].model);

// Claves del proveedor. Gemini admite una segunda clave gratuita (GEMINI_API_KEY2) que se usa
// solo cuando la primera agotó su cuota.
function keys(provider: Provider): string[] {
  const extra = provider === "gemini" ? process.env.GEMINI_API_KEY2 : undefined;
  return [env(ENV[provider].key), ...(extra ? [extra] : [])];
}

async function withKeys<T>(provider: Provider, run: (key: string) => Promise<T>): Promise<T> {
  const list = keys(provider);
  for (let i = 0; ; i++) {
    try {
      return await run(list[i]);
    } catch (e) {
      if (!(e instanceof QuotaError) || i === list.length - 1) throw e;
    }
  }
}

// En Vercel se falla rápido: un visitante no debe esperar minutos de reintentos.
const DEFAULT_RETRIES = process.env.VERCEL ? 1 : 5;

function request(provider: Provider, key: string, model: string, o: { system: string; prompt: string; json?: boolean }) {
  if (provider === "gemini") {
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: o.system }] },
        contents: [{ role: "user", parts: [{ text: o.prompt }] }],
        generationConfig: { temperature: 0, ...(o.json ? { responseMimeType: "application/json" } : {}) },
      }),
    });
  }
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      ...(o.json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: o.system },
        { role: "user", content: o.prompt },
      ],
    }),
  });
}

type GeminiBody = { candidates?: { content?: { parts?: { text?: string }[] } }[] };
type GroqBody = { choices?: { message?: { content?: string } }[] };

type GenerateOptions = { provider: Provider; system: string; prompt: string; json?: boolean; model?: string; retries?: number };

export function generate(o: GenerateOptions): Promise<string> {
  return withKeys(o.provider, (key) => generateWith(key, o));
}

async function generateWith(key: string, o: GenerateOptions): Promise<string> {
  const model = o.model ?? modelOf(o.provider);
  for (let attempt = 0; ; attempt++) {
    const res = await request(o.provider, key, model, o);

    // 429 = límite de uso, 503 = modelo saturado. Ambos son temporales salvo la cuota diaria.
    if (res.status === 429 || res.status === 503) {
      const body = await res.text();
      if (/per ?day|PerDay|tokens per day|TPD|RPD/i.test(body) || attempt >= (o.retries ?? DEFAULT_RETRIES)) {
        throw new QuotaError(`${o.provider} ${res.status}: ${body.slice(0, 300)}`);
      }
      const hinted = Number(res.headers.get("retry-after") ?? body.match(/"retryDelay":\s*"(\d+)s"/)?.[1]);
      const wait = Number.isFinite(hinted) && hinted > 0 ? hinted : 2 ** attempt * 5;
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`${o.provider} ${res.status}: ${(await res.text()).slice(0, 300)}`);

    const data = await res.json();
    const text =
      o.provider === "gemini"
        ? (data as GeminiBody).candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("")
        : (data as GroqBody).choices?.[0]?.message?.content;
    if (!text) throw new Error(`${o.provider} no devolvió texto: ${JSON.stringify(data).slice(0, 300)}`);
    return text;
  }
}
