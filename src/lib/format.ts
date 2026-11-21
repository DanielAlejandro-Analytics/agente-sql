// Formato para la interfaz: resaltado de SQL y celdas de la tabla. Sin librerías.
const KEYWORDS = new Set(
  "select from where join left inner on and or not in as group by order having limit desc asc distinct case when then else end with over partition sum count avg min max round substr union all is null like between".split(" "),
);

export type Token = { text: string; kind: "kw" | "str" | "num" | "id" | "ws" | "op" };

export function tokens(sql: string): Token[] {
  return (sql.match(/'(?:[^']|'')*'?|\d+(?:\.\d+)?|[A-Za-z_][\w]*|\s+|./g) ?? []).map((text) => ({
    text,
    kind: text.startsWith("'")
      ? "str"
      : /^\d/.test(text)
        ? "num"
        : /^\s/.test(text)
          ? "ws"
          : /^[A-Za-z_]/.test(text)
            ? KEYWORDS.has(text.toLowerCase())
              ? "kw"
              : "id"
            : "op",
  }));
}

const MONEY = /total|monto|precio|venta|vendido/i;

export function formatCell(v: unknown, column: string): string {
  if (v === null || v === undefined) return "—";
  if (typeof v !== "number") return String(v);
  const n = v.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  return MONEY.test(column) && Number.isInteger(v) ? `$${n}` : n;
}
