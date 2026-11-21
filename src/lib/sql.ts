// Valida y ejecuta SQL de solo lectura sobre data/ventas.db.
// La consulta corre en un proceso hijo: si se pasa del tiempo, se mata. Un Worker no sirve,
// porque terminate() no interrumpe a SQLite mientras está en código nativo (probado).
import { spawn } from "node:child_process";
import { join } from "node:path";

export class SqlTimeoutError extends Error {}

const FORBIDDEN = /\b(insert|update|delete|replace|drop|create|alter|attach|detach|pragma|vacuum|reindex|analyze|recursive|begin|commit|rollback|savepoint|release)\b/i;

// Devuelve null si es una sola consulta de lectura; si no, el motivo en español.
export function checkSql(sql: string): string | null {
  // Fuera comentarios y el contenido de cadenas/identificadores entre comillas, para no confundirlos con código.
  const code = sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""')
    .trim()
    .replace(/;\s*$/, "");
  if (!code) return "La consulta está vacía.";
  if (code.includes(";")) return "Solo se permite una consulta.";
  if (!/^(select|with)\b/i.test(code)) return "Solo se permiten consultas SELECT.";
  const bad = code.match(FORBIDDEN);
  if (bad) return `No se permite ${bad[0].toUpperCase()}.`;
  return null;
}

// Código del proceso hijo: lee {path, sql, maxRows} por stdin y escribe {columns, rows, truncated} o {error}.
const CHILD = `
const { DatabaseSync } = require("node:sqlite");
let input = "";
process.stdin.on("data", (c) => (input += c)).on("end", () => {
  const { path, sql, maxRows } = JSON.parse(input);
  try {
    const db = new DatabaseSync(path, { readOnly: true });
    const stmt = db.prepare(sql);
    stmt.setReturnArrays(true);
    const columns = stmt.columns().map((c) => c.name);
    const rows = [];
    let truncated = false;
    for (const row of stmt.iterate()) {
      if (rows.length === maxRows) { truncated = true; break; }
      rows.push(row);
    }
    process.stdout.write(JSON.stringify({ columns, rows, truncated }, (_, v) => (typeof v === "bigint" ? Number(v) : v)));
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: e.message }));
  }
});`;

export type SqlResult = { columns: string[]; rows: unknown[][]; truncated: boolean };

export function runSql(sql: string, opts: { maxRows?: number; timeoutMs?: number } = {}): Promise<SqlResult> {
  const { maxRows = 200, timeoutMs = 3000 } = opts;
  const path = join(process.cwd(), "data/ventas.db");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--no-warnings", "-e", CHILD], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new SqlTimeoutError("La consulta tardó demasiado."));
    }, timeoutMs);
    child.stdout.on("data", (c) => (out += c));
    child.stderr.on("data", (c) => (err += c));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", () => {
      clearTimeout(timer);
      if (child.killed) return; // ya se rechazó por tiempo
      try {
        const data = JSON.parse(out);
        if (data.error) reject(new Error(data.error));
        else resolve(data);
      } catch {
        reject(new Error(`El proceso de SQL falló: ${err.slice(0, 300)}`));
      }
    });
    child.stdin.end(JSON.stringify({ path, sql, maxRows }));
  });
}
