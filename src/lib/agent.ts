// El agente: pregunta en español → SQL (un reintento con el error) → resultado → explicación corta.
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { generate, modelOf } from "./llm.ts";
import { checkSql, runSql, SqlTimeoutError } from "./sql.ts";

export class AnswerError extends Error {}

export const SHOWN_ROWS = 50;

// Una línea por columna que no se explica sola.
const NOTES: Record<string, string> = {
  "clientes.rubro": "giro del cliente: Ferretería, Comercio, Distribución, Construcción, Agrícola, Servicios o Electricidad",
  "clientes.fecha_alta": "fecha en que el cliente empezó a comprar (YYYY-MM-DD)",
  "productos.precio": "precio de lista en pesos chilenos (CLP), entero",
  "ventas.fecha": "fecha de la venta (YYYY-MM-DD), entre 2024-01-01 y 2025-12-31",
  "ventas.canal": "'tienda', 'web' o 'telefono'",
  "detalle_venta.cantidad": "unidades vendidas",
  "detalle_venta.precio_unitario": "precio cobrado por unidad en CLP; el monto de una línea es cantidad * precio_unitario",
  "vendedores.region_id": "región donde trabaja el vendedor",
};

type Table = { name: string; cols: { name: string; type: string; fk?: string }[] };

// Tablas y columnas leídas de la base; las usan el prompt y el árbol del esquema en la interfaz.
let tablesCache: Table[] | undefined;
export function schemaTables(): Table[] {
  if (tablesCache) return tablesCache;
  const db = new DatabaseSync(join(process.cwd(), "data/ventas.db"), { readOnly: true });
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid").all() as { name: string }[];
  tablesCache = names.map(({ name }) => {
    const cols = db.prepare("SELECT name, type FROM pragma_table_info(?)").all(name) as { name: string; type: string }[];
    const fks = db.prepare('SELECT "from", "table" FROM pragma_foreign_key_list(?)').all(name) as { from: string; table: string }[];
    return { name, cols: cols.map((c) => ({ ...c, fk: fks.find((f) => f.from === c.name)?.table })) };
  });
  db.close();
  return tablesCache;
}

export function schemaText(): string {
  return schemaTables()
    .map(({ name, cols }) => {
      const lines = cols.map((c) => {
        const note = NOTES[`${name}.${c.name}`] ?? (c.fk ? `referencia a ${c.fk}.id` : "");
        return `  ${c.name} ${c.type}${note ? ` -- ${note}` : ""}`;
      });
      return `${name}(\n${lines.join(",\n")}\n)`;
    })
    .join("\n");
}

const SYSTEM = () => `Traduces preguntas en español a SQL de SQLite sobre la base de ventas de una distribuidora chilena ficticia.

Esquema:
${schemaText()}

Reglas:
- Hoy es 2025-12-31. "Este año" es 2025; "el mes pasado" es noviembre de 2025.
- Responde solo con una consulta SELECT de SQLite, sin explicación ni comentarios.
- Si la pregunta pide agregar, modificar o borrar datos, responde exactamente SOLO_LECTURA.
- Si la pregunta no se puede responder con estas tablas, responde exactamente NO_SQL.
- Montos: SUM(detalle_venta.cantidad * detalle_venta.precio_unitario).
- Usa alias de columna claros en español (por ejemplo total, cliente, region).
- Para "los N mayores", usa ORDER BY ... DESC LIMIT N.

Ejemplos:
Pregunta: ¿Cuánto se vendió por canal en 2025?
SELECT v.canal, SUM(d.cantidad * d.precio_unitario) AS total FROM ventas v JOIN detalle_venta d ON d.venta_id = v.id WHERE v.fecha >= '2025-01-01' AND v.fecha < '2026-01-01' GROUP BY v.canal ORDER BY total DESC
Pregunta: ¿Cuáles son los 5 productos con más unidades vendidas?
SELECT p.nombre AS producto, SUM(d.cantidad) AS unidades FROM detalle_venta d JOIN productos p ON p.id = d.producto_id GROUP BY p.id ORDER BY unidades DESC LIMIT 5
Pregunta: ¿Qué clientes son de la Región de Valparaíso?
SELECT c.nombre AS cliente, co.nombre AS comuna FROM clientes c JOIN comunas co ON co.id = c.comuna_id JOIN regiones r ON r.id = co.region_id WHERE r.nombre = 'Valparaíso' ORDER BY c.nombre`;

export function extractSql(text: string): string {
  return text.replace(/```(?:sql)?/gi, "").trim();
}

export type AskResult = {
  sql: string;
  columns: string[];
  rows: unknown[][];
  total: number;
  truncated: boolean;
  explanation: string;
  corrected: boolean;
  model: string;
};

type Gen = (o: { provider: "gemini"; system: string; prompt: string }) => Promise<string>;

export async function ask(question: string, opts: { gen?: Gen; maxRows?: number; explain?: boolean } = {}): Promise<AskResult> {
  const { gen = generate, maxRows = 200, explain: withExplanation = true } = opts;
  const system = SYSTEM();
  let prompt = `Pregunta: ${question}`;
  let lastError = "";
  let wantedWrite = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    const sql = extractSql(await gen({ provider: "gemini", system, prompt }));
    if (sql === "NO_SQL") throw new AnswerError("Esa pregunta no se puede responder con esta base de ventas.");
    if (sql === "SOLO_LECTURA") throw new AnswerError("Solo puedo hacer consultas de lectura.");
    const invalid = checkSql(sql);
    if (invalid) {
      wantedWrite = /^(Solo se permiten consultas SELECT|No se permite)/.test(invalid);
      lastError = invalid;
    } else {
      try {
        const result = await runSql(sql, { maxRows });
        const explanation = !result.rows.length
          ? "La consulta no devolvió resultados."
          : withExplanation
            ? await explain(gen, question, sql, result)
            : "";
        return {
          sql,
          columns: result.columns,
          rows: result.rows.slice(0, SHOWN_ROWS),
          total: result.rows.length,
          truncated: result.truncated,
          explanation,
          corrected: attempt > 0,
          model: modelOf("gemini"),
        };
      } catch (e) {
        if (e instanceof SqlTimeoutError) throw e;
        wantedWrite = false;
        lastError = (e as Error).message;
      }
    }
    prompt = `Pregunta: ${question}\n\nTu consulta anterior falló:\n${sql}\n\nError: ${lastError}\n\nEscribe una consulta corregida.`;
  }
  throw new AnswerError(wantedWrite ? "Solo puedo hacer consultas de lectura." : "No pude escribir una consulta válida para esa pregunta.");
}

async function explain(gen: Gen, question: string, sql: string, r: { columns: string[]; rows: unknown[][]; truncated: boolean }) {
  const sample = [r.columns.join(" | "), ...r.rows.slice(0, 20).map((row) => row.join(" | "))].join("\n");
  return (
    await gen({
      provider: "gemini",
      system:
        "Explicas resultados de consultas a una persona no técnica, en español de Chile, en 1 o 2 frases. Usa solo las cifras que aparecen en las filas; no inventes ni calcules cifras que no estén. Montos en pesos con separador de miles (ej.: $12.480.000). Sin markdown.",
      prompt: `Pregunta: ${question}\nSQL: ${sql}\nFilas${r.truncated || r.rows.length > 20 ? " (solo las primeras)" : ""}:\n${sample}`,
    })
  ).trim();
}
