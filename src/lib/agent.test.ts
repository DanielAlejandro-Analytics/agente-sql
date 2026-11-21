// Autoprueba: node --test src/lib/agent.test.ts   (modelo falso, no gasta cuota)
import { test } from "node:test";
import assert from "node:assert/strict";
import { ask, extractSql, schemaText, AnswerError } from "./agent.ts";

process.env.GEMINI_MODEL ??= "modelo-de-prueba";

// Modelo falso: devuelve las respuestas en orden y cuenta las llamadas.
function fake(...answers: string[]) {
  const calls: string[] = [];
  const gen = async (o: { prompt: string }) => {
    calls.push(o.prompt);
    if (!answers.length) throw new Error("llamada de más");
    return answers.shift()!;
  };
  return { gen, calls };
}

test("schemaText incluye tablas y columnas", () => {
  const s = schemaText();
  for (const t of ["regiones", "comunas", "clientes", "productos", "ventas", "detalle_venta", "precio_unitario"]) assert.match(s, new RegExp(t));
});

test("extractSql quita bloques de código", () => {
  assert.equal(extractSql("```sql\nSELECT 1;\n```"), "SELECT 1;");
  assert.equal(extractSql("  SELECT 2  "), "SELECT 2");
  assert.equal(extractSql("NO_SQL"), "NO_SQL");
});

test("camino feliz", async () => {
  const { gen, calls } = fake("SELECT COUNT(*) AS n FROM regiones", "Hay 16 regiones.");
  const r = await ask("¿Cuántas regiones hay?", { gen });
  assert.deepEqual(r.rows, [[16]]);
  assert.equal(r.explanation, "Hay 16 regiones.");
  assert.equal(r.corrected, false);
  assert.equal(calls.length, 2);
});

test("sin explicación (para el eval): una sola llamada", async () => {
  const { gen, calls } = fake("SELECT COUNT(*) FROM regiones");
  const r = await ask("¿Cuántas regiones hay?", { gen, explain: false });
  assert.deepEqual(r.rows, [[16]]);
  assert.equal(r.explanation, "");
  assert.equal(calls.length, 1);
});

test("corrige una vez con el error", async () => {
  const { gen, calls } = fake("SELECT nombre FROM clientes_x", "SELECT COUNT(*) FROM clientes", "Hay 300 clientes.");
  const r = await ask("¿Cuántos clientes hay?", { gen });
  assert.equal(r.corrected, true);
  assert.deepEqual(r.rows, [[300]]);
  assert.equal(calls.length, 3);
  assert.match(calls[1], /clientes_x/); // el reintento ve el SQL fallido y el error
});

test("falla dos veces", async () => {
  const { gen, calls } = fake("SELECT x FROM nada", "SELECT y FROM nada");
  await assert.rejects(ask("algo", { gen }), new AnswerError("No pude escribir una consulta válida para esa pregunta."));
  assert.equal(calls.length, 2);
});

test("pide modificar datos", async () => {
  const { gen } = fake("DELETE FROM clientes", "DELETE FROM clientes WHERE 1");
  await assert.rejects(ask("Borra los clientes de Arica", { gen }), new AnswerError("Solo puedo hacer consultas de lectura."));
});

test("el modelo detecta que se pide modificar datos", async () => {
  const { gen, calls } = fake("SOLO_LECTURA");
  await assert.rejects(ask("Borra los clientes de Arica", { gen }), new AnswerError("Solo puedo hacer consultas de lectura."));
  assert.equal(calls.length, 1);
});

test("fuera de tema", async () => {
  const { gen, calls } = fake("NO_SQL");
  await assert.rejects(ask("¿Quién ganó el mundial?", { gen }), new AnswerError("Esa pregunta no se puede responder con esta base de ventas."));
  assert.equal(calls.length, 1);
});

test("cero filas: explicación fija, sin segunda llamada", async () => {
  const { gen, calls } = fake("SELECT * FROM clientes WHERE id < 0");
  const r = await ask("Clientes con id negativo", { gen });
  assert.equal(r.explanation, "La consulta no devolvió resultados.");
  assert.equal(r.total, 0);
  assert.equal(calls.length, 1);
});

test("muchas filas: muestra 50 de 200", async () => {
  const { gen } = fake("SELECT * FROM clientes", "Son los clientes.");
  const r = await ask("Lista los clientes", { gen });
  assert.equal(r.rows.length, 50);
  assert.equal(r.total, 200);
  assert.equal(r.truncated, true);
});
