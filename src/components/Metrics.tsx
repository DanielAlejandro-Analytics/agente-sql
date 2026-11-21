import Link from "next/link";
import evalData from "@/lib/eval-data.json";

const pct = (v: number) => `${(Math.round(v * 1000) / 10).toLocaleString("es-CL")} %`;
const fecha = new Date(evalData.date).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Santiago" });

export function Metrics({ linkToCases = false }: { linkToCases?: boolean }) {
  const ok = evalData.cases.filter((c) => c.ok).length;
  const n = (level: string) => evalData.cases.filter((c) => c.level === level).length;
  const cells = [
    ["Exactitud por ejecución", pct(evalData.accuracy), `${ok} de ${evalData.total} preguntas`],
    ["Fáciles", pct(evalData.byLevel.facil), `${n("facil")} preguntas, una tabla`],
    ["Medias", pct(evalData.byLevel.media), `${n("media")} preguntas, joins y grupos`],
    ["Difíciles", pct(evalData.byLevel.dificil), `${n("dificil")} preguntas, subconsultas y ventanas`],
  ];
  return (
    <section aria-labelledby="eval" className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <h2 id="eval" className="font-semibold">
          Evaluación · {fecha}
        </h2>
        {linkToCases && (
          <Link href="/resultados" className="text-sm text-accent underline-offset-4 hover:underline">
            Ver los casos fallidos
          </Link>
        )}
      </div>
      <dl className="grid grid-cols-2 lg:grid-cols-4">
        {cells.map(([label, value, note]) => (
          <div key={label} className="border-line p-4 sm:px-5 [&:not(:last-child)]:border-r max-lg:[&:nth-child(2)]:border-r-0 max-lg:[&:nth-child(-n+2)]:border-b">
            <dt className="text-sm">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            <dd className="text-xs text-muted">{note}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-line px-4 py-3 text-xs text-muted sm:px-5">
        Correcta = el SQL generado devuelve exactamente las mismas filas que un SQL de referencia escrito a mano. Modelo: {evalData.model}.
        La explicación en lenguaje natural no se mide.
      </p>
    </section>
  );
}
