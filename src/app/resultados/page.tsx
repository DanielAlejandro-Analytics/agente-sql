import type { Metadata } from "next";
import { Metrics } from "@/components/Metrics";
import evalData from "@/lib/eval-data.json";

export const metadata: Metadata = { title: "Resultados del eval · Agente SQL" };

const LEVEL = { facil: "Fácil", media: "Media", dificil: "Difícil" } as Record<string, string>;

export default function Resultados() {
  // Los fallidos primero: son lo más interesante de leer.
  const cases = [...evalData.cases].sort((a, b) => Number(a.ok) - Number(b.ok));
  return (
    <>
      <h1 className="text-xl font-semibold">Resultados de la evaluación</h1>
      <Metrics />
      <section aria-labelledby="casos" className="space-y-3">
        <h2 id="casos" className="font-semibold">
          Las {evalData.total} preguntas
        </h2>
        <p className="text-sm text-muted">
          Cada pregunta dice qué columnas mostrar, porque la comparación es estricta. Las referencias se escribieron antes de correr el modelo.
          Abre una fila para comparar el SQL generado con el de referencia.
        </p>
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {cases.map((c) => (
            <li key={c.id}>
              <details>
                <summary className="grid cursor-pointer grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="font-mono text-sm text-muted">{c.id}</span>
                  <span>
                    {c.question} <span className="text-xs text-muted">· {LEVEL[c.level]}</span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.ok ? "bg-ok/10 text-ok" : "bg-danger/10 text-danger"}`}>
                    {c.ok ? "Correcta" : "Incorrecta"}
                  </span>
                </summary>
                <div className="grid gap-4 border-t border-line bg-surface-2/50 px-4 py-4 text-sm lg:grid-cols-2">
                  <div className="min-w-0">
                    <p className="mb-1 text-muted">SQL generado</p>
                    <pre className="overflow-x-auto rounded-md bg-surface p-3 font-mono text-xs leading-5 whitespace-pre-wrap">{c.gotSql ?? "—"}</pre>
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-muted">SQL de referencia</p>
                    <pre className="overflow-x-auto rounded-md bg-surface p-3 font-mono text-xs leading-5 whitespace-pre-wrap">{c.refSql}</pre>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
