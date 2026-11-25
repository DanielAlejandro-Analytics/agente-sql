"use client";

import { useState, type FormEvent } from "react";
import type { AskResult } from "@/lib/agent";
import { formatCell, tokens } from "@/lib/format";

const EXAMPLES = [
  "¿Cuánto vendimos por región en 2025?",
  "¿Qué categoría creció más en porcentaje respecto a 2024?",
  "¿Qué vendedor tiene el ticket promedio más alto?",
  "¿Cuántos clientes nuevos hubo cada mes de 2025?",
];

const TOKEN_CLASS = { kw: "text-accent font-medium", str: "text-ok", num: "text-[#9a4d00]", id: "", ws: "", op: "text-muted" } as const;

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: AskResult }
  | { status: "error"; message: string };

export function Ask({ dailyLimit, maxLength }: { dailyLimit: number; maxLength: number }) {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  // null hasta la primera respuesta: el conteo real lo lleva el servidor.
  const [remaining, setRemaining] = useState<number | null>(null);
  const loading = state.status === "loading";

  async function send(q: string) {
    const text = q.trim();
    if (text.length < 3 || loading) return;
    setQuestion(text);
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: text }) });
      const data = await res.json();
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      setState(res.ok ? { status: "done", result: data } : { status: "error", message: data.error });
    } catch {
      setState({ status: "error", message: "No hubo conexión con el servidor." });
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(question);
  };

  return (
    <>
      <section aria-label="Pregunta" className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="q" className="sr-only">
            Pregunta sobre las ventas
          </label>
          <input
            id="q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={maxLength}
            placeholder="Escribe una pregunta sobre las ventas…"
            className="min-w-0 flex-1 rounded-md border border-line px-3 py-2.5 text-base placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || question.trim().length < 3 || remaining === 0}
            className="rounded-md bg-accent px-5 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Consultando…" : "Preguntar"}
          </button>
        </form>
        <p className="mt-2 text-sm text-muted">
          {remaining === null ? `Hasta ${dailyLimit} preguntas por día` : `Quedan ${remaining} de ${dailyLimit} preguntas hoy`}
        </p>
        <ul aria-label="Preguntas de ejemplo" className="mt-4 grid gap-2 sm:grid-cols-2">
          {EXAMPLES.map((ex, i) => (
            <li key={ex}>
              <button
                type="button"
                onClick={() => send(ex)}
                disabled={loading || remaining === 0}
                className="h-full w-full rounded-md border border-line px-3 py-2 text-left text-sm hover:border-accent hover:bg-surface-2 disabled:opacity-50"
              >
                {i + 1}: {ex}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Resultado" aria-live="polite" className="rounded-lg border border-line bg-surface p-4 sm:p-5">
        {state.status === "idle" && <p className="text-muted">Haz una pregunta para ver el SQL generado, el resultado y una explicación.</p>}
        {loading && <p className="text-muted">Escribiendo el SQL, ejecutándolo y explicando el resultado…</p>}
        {state.status === "error" && (
          <p role="alert" className="text-danger">
            {state.message}
          </p>
        )}
        {state.status === "done" && <Result r={state.result} />}
      </section>
    </>
  );
}

function Result({ r }: { r: AskResult }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="relative min-w-0">
        {r.corrected && (
          <span className="absolute top-2 right-2 rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-muted">Corregido en el 2.º intento</span>
        )}
        <pre className="overflow-x-auto rounded-md bg-surface-2 p-4 pt-8 font-mono text-sm leading-6 whitespace-pre-wrap">
          <code>
            {tokens(r.sql).map((t, i) => (
              <span key={i} className={TOKEN_CLASS[t.kind]}>
                {t.text}
              </span>
            ))}
          </code>
        </pre>
      </div>
      <div className="min-w-0 space-y-3">
        {r.rows.length > 0 && (
          // tabIndex + region: keyboard users can scroll a table wider than the panel.
          <div tabIndex={0} role="region" aria-labelledby="result-caption" className="overflow-x-auto rounded-md border border-line">
            <table className="w-full text-sm tabular-nums">
              <caption id="result-caption" className="sr-only">Filas devueltas por el SQL</caption>
              <thead className="bg-surface-2 text-left">
                <tr>
                  <th scope="col" className="w-10 px-3 py-2 font-medium text-muted">#</th>
                  {r.columns.map((c, i) => (
                    <th key={i} scope="col" className={`px-3 py-2 font-medium ${typeof r.rows[0][i] === "number" ? "text-right" : ""}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.rows.map((row, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-3 py-2 text-muted">{i + 1}</td>
                    {row.map((v, j) => (
                      <td key={j} className={`px-3 py-2 ${typeof v === "number" ? "text-right" : ""}`}>
                        {formatCell(v, r.columns[j])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(r.truncated || r.total > r.rows.length) && (
          <p className="text-sm text-muted">
            Se muestran {r.rows.length} de {r.truncated ? `más de ${r.total}` : r.total} filas.
          </p>
        )}
        <p>{r.explanation}</p>
      </div>
    </div>
  );
}
