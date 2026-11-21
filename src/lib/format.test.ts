// Autoprueba: node --test src/lib/format.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCell, tokens } from "./format.ts";

test("tokens marca palabras clave, cadenas y números", () => {
  assert.deepEqual(
    tokens("SELECT 'a' FROM t LIMIT 3").map((x) => x.kind),
    ["kw", "ws", "str", "ws", "kw", "ws", "id", "ws", "kw", "ws", "num"],
  );
  assert.equal(tokens("select 'it''s'").map((x) => x.text).join(""), "select 'it''s'"); // no pierde texto
});

test("formatCell: nulos, montos y números en formato chileno", () => {
  assert.equal(formatCell(null, "nombre"), "—");
  assert.equal(formatCell(12480000, "total"), "$12.480.000");
  assert.equal(formatCell(12480000, "precio"), "$12.480.000");
  assert.equal(formatCell(1532, "unidades"), "1.532");
  assert.equal(formatCell(36.456, "porcentaje"), "36,46");
  assert.equal(formatCell("Ferretería Sur", "cliente"), "Ferretería Sur");
});
