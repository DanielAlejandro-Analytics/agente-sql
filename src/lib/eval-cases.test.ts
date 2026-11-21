// Autoprueba: node --test src/lib/eval-cases.test.ts   (sin modelo: solo valida las referencias)
import { test } from "node:test";
import assert from "node:assert/strict";
import { EVAL_CASES } from "./eval-cases.ts";
import { checkSql, runSql } from "./sql.ts";

test("30 casos: 10 fáciles, 12 medios, 8 difíciles, ids únicos", () => {
  assert.equal(EVAL_CASES.length, 30);
  const n = (l: string) => EVAL_CASES.filter((c) => c.level === l).length;
  assert.deepEqual([n("facil"), n("media"), n("dificil")], [10, 12, 8]);
  assert.equal(new Set(EVAL_CASES.map((c) => c.id)).size, 30);
});

for (const c of EVAL_CASES) {
  test(`${c.id}: la referencia es válida, devuelve filas y no tiene empate en el corte`, async () => {
    assert.equal(checkSql(c.sql), null);
    const limit = Number(c.sql.match(/\bLIMIT\s+(\d+)\s*;?\s*$/i)?.[1]);
    // Para revisar el corte se pide una fila más que el LIMIT.
    const sql = limit ? c.sql.replace(/\bLIMIT\s+\d+\s*;?\s*$/i, `LIMIT ${limit + 1}`) : c.sql;
    const { rows } = await runSql(sql, { maxRows: 10000 });
    assert.ok(rows.length > 0, "sin filas");
    if (limit && rows.length > limit) {
      const last = rows[limit - 1].at(-1);
      const next = rows[limit].at(-1);
      assert.notEqual(last, next, `empate en el corte: ${last}`);
    }
  });
}
