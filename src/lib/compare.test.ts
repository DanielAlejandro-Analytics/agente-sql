// Autoprueba: node --test src/lib/compare.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOrdered, sameResult } from "./compare.ts";

test("isOrdered: solo cuenta el ORDER BY final, no el de una ventana", () => {
  assert.equal(isOrdered("SELECT a FROM t ORDER BY a DESC LIMIT 3"), true);
  assert.equal(isOrdered("SELECT a FROM (SELECT a, RANK() OVER (PARTITION BY b ORDER BY c DESC) AS rk FROM t) WHERE rk = 1"), false);
  assert.equal(isOrdered("SELECT a FROM t"), false);
});

test("sin orden: ignora el orden de las filas", () => {
  assert.equal(sameResult([[1], [2]], [[2], [1]], false), true);
});

test("con orden: lo respeta", () => {
  assert.equal(sameResult([[1], [2]], [[2], [1]], true), false);
  assert.equal(sameResult([[1], [2]], [[1], [2]], true), true);
});

test("redondea a 2 decimales", () => {
  assert.equal(sameResult([[1.004]], [[1.0]], false), true);
  assert.equal(sameResult([[1.01]], [[1.0]], false), false);
});

test("cuenta duplicados", () => {
  assert.equal(sameResult([[1], [1]], [[1]], false), false);
});

test("una columna de más es distinto", () => {
  assert.equal(sameResult([["a", 1]], [["a"]], false), false);
});

test("el orden de las columnas importa; los nombres no se comparan", () => {
  assert.equal(sameResult([["a", 1]], [[1, "a"]], false), false);
});
