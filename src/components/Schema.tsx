import { schemaTables } from "@/lib/agent";

// Árbol del esquema leído de la base. Cada tabla se abre para ver sus columnas.
export function Schema() {
  return (
    <ul className="space-y-1 font-mono text-sm">
      {schemaTables().map((t) => (
        <li key={t.name}>
          <details open={t.name === "ventas"} className="group/t">
            <summary className="cursor-pointer list-none rounded px-1 py-0.5 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="mr-1 inline-block text-muted transition-transform group-open/t:rotate-90">›</span>
              {t.name}
            </summary>
            <ul className="mt-1 mb-2 ml-3 border-l border-line pl-4 text-muted">
              {t.cols.map((c) => (
                <li key={c.name} className="py-0.5" title={c.fk ? `referencia a ${c.fk}` : c.type}>
                  {c.name}
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
}
