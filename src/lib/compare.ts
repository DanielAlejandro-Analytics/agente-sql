// Exactitud por ejecución: el resultado generado es correcto si tiene las mismas filas que la referencia.
// Estricto a propósito: columnas de más o en otro orden cuentan como distinto (se ve en los casos fallidos).
const cell = (v: unknown) => (typeof v === "number" ? Math.round(v * 100) / 100 : v);
const key = (row: unknown[]) => JSON.stringify(row.map(cell));

export function sameResult(got: unknown[][], want: unknown[][], ordered: boolean): boolean {
  if (got.length !== want.length) return false;
  const a = got.map(key);
  const b = want.map(key);
  if (!ordered) {
    a.sort();
    b.sort();
  }
  return a.every((k, i) => k === b[i]);
}
