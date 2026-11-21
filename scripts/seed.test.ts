// Autoprueba: node --test scripts/seed.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seed } from "./seed.ts";

const dir = mkdtempSync(join(tmpdir(), "seed-"));
const a = join(dir, "a.db");
const b = join(dir, "b.db");
seed(a);
seed(b);
const db = new DatabaseSync(a, { readOnly: true });
const one = (sql: string) => Object.values(db.prepare(sql).get()!)[0] as number;

test("seed es determinista", () => {
  const hash = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
  assert.equal(hash(a), hash(b));
});

test("conteos", () => {
  assert.equal(one("SELECT COUNT(*) FROM regiones"), 16);
  const clientes = one("SELECT COUNT(*) FROM clientes");
  assert.ok(clientes >= 250 && clientes <= 350, `clientes: ${clientes}`);
  const ventas = one("SELECT COUNT(*) FROM ventas");
  assert.ok(ventas >= 4000 && ventas <= 6000, `ventas: ${ventas}`);
});

test("integridad", () => {
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("fechas", () => {
  assert.ok(one("SELECT MIN(fecha) FROM ventas") as unknown as string >= "2024-01-01");
  assert.ok(one("SELECT MAX(fecha) FROM ventas") as unknown as string <= "2025-12-31");
});

test("concentración: el 10 % de clientes que más compra supera el 30 % del total", () => {
  const totals = db
    .prepare("SELECT SUM(d.cantidad * d.precio_unitario) AS t FROM ventas v JOIN detalle_venta d ON d.venta_id = v.id GROUP BY v.cliente_id ORDER BY t DESC")
    .all()
    .map((r) => r.t as number);
  const all = totals.reduce((s, t) => s + t, 0);
  const top = totals.slice(0, Math.ceil(totals.length / 10)).reduce((s, t) => s + t, 0);
  assert.ok(top / all > 0.3, `top 10 %: ${(top / all).toFixed(2)}`);
});

test("peso menor a 2 MB", () => {
  assert.ok(statSync(a).size < 2 * 1024 * 1024, `${statSync(a).size} bytes`);
});
