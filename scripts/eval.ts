// Eval por ejecución: corre las 30 preguntas por el agente y compara con la referencia.
// Uso: node --env-file=.env.local scripts/eval.ts   (~30-60 llamadas a Gemini)
import { writeFileSync } from "node:fs";
import { AnswerError, ask } from "../src/lib/agent.ts";
import { isOrdered, sameResult } from "../src/lib/compare.ts";
import { EVAL_CASES } from "../src/lib/eval-cases.ts";
import { modelOf } from "../src/lib/llm.ts";
import { runSql, SqlTimeoutError } from "../src/lib/sql.ts";

const PAUSE_MS = 4500; // margen para el límite por minuto del plan gratuito
const MAX_ROWS = 10000;

const cases = [];
for (const c of EVAL_CASES) {
  const ref = await runSql(c.sql, { maxRows: MAX_ROWS });
  const ordered = isOrdered(c.sql);
  try {
    const got = await ask(c.question, { maxRows: MAX_ROWS, explain: false });
    // got.rows viene recortado a lo que se muestra; se vuelve a ejecutar completo (local, sin gastar cuota).
    const ok = sameResult((await runSql(got.sql, { maxRows: MAX_ROWS })).rows, ref.rows, ordered);
    cases.push({ id: c.id, question: c.question, level: c.level, refSql: c.sql, gotSql: got.sql, ok, corrected: got.corrected });
    console.log(`${c.id} ${ok ? "✔" : "✖"}${got.corrected ? " (corregida)" : ""}`);
  } catch (e) {
    if (!(e instanceof AnswerError || e instanceof SqlTimeoutError)) throw e; // cuota u otro error: se detiene la corrida
    cases.push({ id: c.id, question: c.question, level: c.level, refSql: c.sql, gotSql: null, ok: false, corrected: false, error: (e as Error).message });
    console.log(`${c.id} ✖ ${(e as Error).message}`);
  }
  await new Promise((r) => setTimeout(r, PAUSE_MS));
}

const rate = (xs: { ok: boolean }[]) => (xs.length ? xs.filter((x) => x.ok).length / xs.length : 0);
const corrected = cases.filter((c) => c.corrected);
const data = {
  date: new Date().toISOString(),
  model: modelOf("gemini"),
  total: cases.length,
  accuracy: rate(cases),
  byLevel: {
    facil: rate(cases.filter((c) => c.level === "facil")),
    media: rate(cases.filter((c) => c.level === "media")),
    dificil: rate(cases.filter((c) => c.level === "dificil")),
  },
  invalidRate: cases.filter((c) => c.gotSql === null).length / cases.length,
  correctedRate: corrected.length / cases.length,
  rescuedRate: rate(corrected),
  cases,
};
writeFileSync("src/lib/eval-data.json", JSON.stringify(data, null, 2) + "\n");
console.log(`\nExactitud: ${(data.accuracy * 100).toFixed(1)} % (${cases.filter((c) => c.ok).length}/${cases.length})`, data.byLevel);
