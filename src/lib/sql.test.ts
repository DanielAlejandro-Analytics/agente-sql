// Autoprueba: node --test src/lib/sql.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSql, runSql, SqlTimeoutError } from "./sql.ts";

test("checkSql acepta consultas de lectura", () => {
  assert.equal(checkSql("SELECT 1"), null);
  assert.equal(checkSql("select 1;"), null);
  assert.equal(checkSql("WITH a AS (SELECT 1) SELECT * FROM a"), null);
  assert.equal(checkSql("SELECT 'delete; drop'"), null); // dentro de comillas no cuenta
});

test("checkSql rechaza lo que no es una sola lectura", () => {
  for (const sql of [
    "SELECT 1; DELETE FROM ventas",
    "DELETE FROM ventas",
    "PRAGMA table_info(ventas)",
    "ATTACH 'x' AS y",
    "WITH RECURSIVE r(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM r) SELECT * FROM r",
    "SELECT 1 -- ; DROP TABLE x\n; UPDATE ventas SET canal = 'web'",
    "",
  ]) {
    assert.equal(typeof checkSql(sql), "string", sql);
  }
});

test("runSql devuelve columnas y filas", async () => {
  const r = await runSql("SELECT COUNT(*) AS n FROM regiones");
  assert.deepEqual(r.columns, ["n"]);
  assert.deepEqual(r.rows, [[16]]);
  assert.equal(r.truncated, false);
});

test("runSql corta en maxRows", async () => {
  const r = await runSql("SELECT id FROM clientes", { maxRows: 200 });
  assert.equal(r.rows.length, 200);
  assert.equal(r.truncated, true);
});

test("runSql corta una consulta pesada por tiempo", async () => {
  const t = Date.now();
  await assert.rejects(
    runSql("SELECT SUM(a.cantidad * b.cantidad) FROM detalle_venta a, detalle_venta b, ventas c", { timeoutMs: 3000 }),
    SqlTimeoutError,
  );
  assert.ok(Date.now() - t < 4000, `${Date.now() - t} ms`);
});

test("la base es de solo lectura aunque se salte checkSql", async () => {
  await assert.rejects(runSql("INSERT INTO regiones VALUES (99, 'x')"));
});
