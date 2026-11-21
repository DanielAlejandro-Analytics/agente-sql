// Preguntas del eval con su SQL de referencia, escritas a mano antes de correr el modelo.
// No se cambian después de ver los resultados; si alguna se corrige, se documenta en el NOW del proyecto.
// Cada pregunta dice qué columnas mostrar, porque la comparación es estricta (columnas de más = incorrecta).
export type EvalCase = { id: string; question: string; level: "facil" | "media" | "dificil"; sql: string };

const MONTO = "SUM(d.cantidad * d.precio_unitario)";
const Y24 = "v.fecha >= '2024-01-01' AND v.fecha < '2025-01-01'";
const Y25 = "v.fecha >= '2025-01-01' AND v.fecha < '2026-01-01'";
const VD = "ventas v JOIN detalle_venta d ON d.venta_id = v.id";
const REGION_CLIENTE = "JOIN clientes c ON c.id = v.cliente_id JOIN comunas co ON co.id = c.comuna_id JOIN regiones r ON r.id = co.region_id";

export const EVAL_CASES: EvalCase[] = [
  // Fáciles: una tabla.
  { id: "f01", level: "facil", question: "¿Cuántos clientes hay en total?", sql: "SELECT COUNT(*) FROM clientes" },
  { id: "f02", level: "facil", question: "¿Cuántas ventas se hicieron en 2025?", sql: "SELECT COUNT(*) FROM ventas WHERE fecha >= '2025-01-01' AND fecha < '2026-01-01'" },
  { id: "f03", level: "facil", question: "¿Cuántas ventas hubo por canal? Muestra el canal y la cantidad de ventas.", sql: "SELECT canal, COUNT(*) FROM ventas GROUP BY canal" },
  { id: "f04", level: "facil", question: "¿Cuál es el producto con el precio de lista más alto? Muestra su nombre y su precio.", sql: "SELECT nombre, precio FROM productos ORDER BY precio DESC LIMIT 1" },
  { id: "f05", level: "facil", question: "¿Cuántos productos tienen un precio de lista mayor a $50.000?", sql: "SELECT COUNT(*) FROM productos WHERE precio > 50000" },
  { id: "f06", level: "facil", question: "¿Cuál es el precio de lista promedio de los productos?", sql: "SELECT AVG(precio) FROM productos" },
  { id: "f07", level: "facil", question: "¿Cuántos clientes se dieron de alta en 2025?", sql: "SELECT COUNT(*) FROM clientes WHERE fecha_alta >= '2025-01-01' AND fecha_alta < '2026-01-01'" },
  { id: "f08", level: "facil", question: "Muestra solo los nombres de los vendedores, ordenados alfabéticamente.", sql: "SELECT nombre FROM vendedores ORDER BY nombre" },
  { id: "f09", level: "facil", question: "¿Cuántas unidades se vendieron en total, sumando todas las ventas?", sql: "SELECT SUM(cantidad) FROM detalle_venta" },
  { id: "f10", level: "facil", question: "¿En qué fecha se hizo la primera venta registrada?", sql: "SELECT MIN(fecha) FROM ventas" },

  // Medias: joins y agrupación.
  { id: "m01", level: "media", question: "¿Cuál fue el monto total vendido en 2024?", sql: `SELECT ${MONTO} FROM ${VD} WHERE ${Y24}` },
  { id: "m02", level: "media", question: "¿Cuánto se vendió en 2025 en cada región, según la región del cliente? Muestra la región y el total.", sql: `SELECT r.nombre, ${MONTO} FROM ${VD} ${REGION_CLIENTE} WHERE ${Y25} GROUP BY r.id` },
  { id: "m03", level: "media", question: "¿Qué tres clientes compraron más en octubre de 2025? Muestra el nombre y el total.", sql: `SELECT c.nombre, ${MONTO} AS total FROM ${VD} JOIN clientes c ON c.id = v.cliente_id WHERE v.fecha >= '2025-10-01' AND v.fecha < '2025-11-01' GROUP BY c.id ORDER BY total DESC LIMIT 3` },
  { id: "m04", level: "media", question: "¿Cuántos clientes hay en cada región? Muestra solo las regiones que tienen clientes, con la región y la cantidad.", sql: "SELECT r.nombre, COUNT(*) FROM clientes c JOIN comunas co ON co.id = c.comuna_id JOIN regiones r ON r.id = co.region_id GROUP BY r.id" },
  { id: "m05", level: "media", question: "¿Cuál es el monto total vendido por categoría? Muestra la categoría y el total, de mayor a menor.", sql: `SELECT ca.nombre, ${MONTO} AS total FROM detalle_venta d JOIN productos p ON p.id = d.producto_id JOIN categorias ca ON ca.id = p.categoria_id GROUP BY ca.id ORDER BY total DESC` },
  { id: "m06", level: "media", question: "¿Qué vendedor vendió más en monto durante 2025? Muestra su nombre y el total.", sql: `SELECT ve.nombre, ${MONTO} AS total FROM ${VD} JOIN vendedores ve ON ve.id = v.vendedor_id WHERE ${Y25} GROUP BY ve.id ORDER BY total DESC LIMIT 1` },
  { id: "m07", level: "media", question: "¿Cuántas ventas hizo cada vendedor en 2024? Muestra el nombre del vendedor y la cantidad de ventas.", sql: `SELECT ve.nombre, COUNT(*) FROM ventas v JOIN vendedores ve ON ve.id = v.vendedor_id WHERE ${Y24} GROUP BY ve.id` },
  { id: "m08", level: "media", question: "¿Cuánto se vendió en cada mes de 2025? Muestra el mes en formato AAAA-MM y el total, en orden cronológico.", sql: `SELECT substr(v.fecha, 1, 7) AS mes, ${MONTO} FROM ${VD} WHERE ${Y25} GROUP BY mes ORDER BY mes` },
  { id: "m09", level: "media", question: "¿Cuáles son los 5 clientes con más ventas, contando el número de ventas? Muestra el nombre y la cantidad de ventas.", sql: "SELECT c.nombre, COUNT(*) AS n FROM ventas v JOIN clientes c ON c.id = v.cliente_id GROUP BY c.id ORDER BY n DESC LIMIT 5" },
  { id: "m10", level: "media", question: "¿Cuántas unidades se vendieron de cada producto de la categoría Jardín? Muestra el producto y las unidades, de mayor a menor.", sql: "SELECT p.nombre, SUM(d.cantidad) AS u FROM detalle_venta d JOIN productos p ON p.id = d.producto_id JOIN categorias ca ON ca.id = p.categoria_id WHERE ca.nombre = 'Jardín' GROUP BY p.id ORDER BY u DESC" },
  { id: "m11", level: "media", question: "¿Cuántos clientes distintos compraron en diciembre de 2025?", sql: "SELECT COUNT(DISTINCT cliente_id) FROM ventas WHERE fecha >= '2025-12-01' AND fecha < '2026-01-01'" },
  { id: "m12", level: "media", question: "¿Qué rubro de clientes generó el mayor monto de ventas? Muestra el rubro y el total.", sql: `SELECT c.rubro, ${MONTO} AS total FROM ${VD} JOIN clientes c ON c.id = v.cliente_id GROUP BY c.rubro ORDER BY total DESC LIMIT 1` },

  // Difíciles: subconsultas, ventanas, porcentajes y condiciones sobre grupos.
  {
    id: "d01",
    level: "dificil",
    question: "¿Qué categoría creció más en porcentaje de monto vendido entre 2024 y 2025? Muestra solo el nombre de la categoría.",
    sql: `SELECT nombre FROM (SELECT ca.nombre, SUM(CASE WHEN ${Y25} THEN d.cantidad * d.precio_unitario END) * 1.0 / SUM(CASE WHEN ${Y24} THEN d.cantidad * d.precio_unitario END) AS g FROM ${VD} JOIN productos p ON p.id = d.producto_id JOIN categorias ca ON ca.id = p.categoria_id GROUP BY ca.id) ORDER BY g DESC LIMIT 1`,
  },
  {
    id: "d02",
    level: "dificil",
    question: "¿Qué vendedor tiene el ticket promedio más alto, es decir, el mayor monto promedio por venta? Muestra solo su nombre.",
    sql: `SELECT nombre FROM (SELECT ve.nombre, AVG(t.monto) AS prom FROM (SELECT v.id, v.vendedor_id, ${MONTO} AS monto FROM ${VD} GROUP BY v.id) t JOIN vendedores ve ON ve.id = t.vendedor_id GROUP BY ve.id) ORDER BY prom DESC LIMIT 1`,
  },
  {
    id: "d03",
    level: "dificil",
    question: "¿Qué clientes compraron en 2024 pero no compraron nada en 2025? Muestra solo sus nombres.",
    sql: "SELECT nombre FROM clientes WHERE id IN (SELECT cliente_id FROM ventas WHERE fecha < '2025-01-01') AND id NOT IN (SELECT cliente_id FROM ventas WHERE fecha >= '2025-01-01')",
  },
  {
    id: "d04",
    level: "dificil",
    question: "¿Cuál fue el mes de 2025 con mayor monto vendido? Muestra el mes en formato AAAA-MM y el total.",
    sql: `SELECT substr(v.fecha, 1, 7) AS mes, ${MONTO} AS total FROM ${VD} WHERE ${Y25} GROUP BY mes ORDER BY total DESC LIMIT 1`,
  },
  {
    id: "d05",
    level: "dificil",
    // Antes era por región, pero dos regiones tenían empate en el primer lugar (cambiado antes de correr el modelo).
    question: "Para cada categoría, ¿cuál fue el producto con más unidades vendidas en 2025? Muestra la categoría, el producto y las unidades.",
    sql: `SELECT categoria, producto, u FROM (SELECT ca.nombre AS categoria, p.nombre AS producto, SUM(d.cantidad) AS u, RANK() OVER (PARTITION BY ca.id ORDER BY SUM(d.cantidad) DESC) AS rk FROM ${VD} JOIN productos p ON p.id = d.producto_id JOIN categorias ca ON ca.id = p.categoria_id WHERE ${Y25} GROUP BY ca.id, p.id) WHERE rk = 1`,
  },
  {
    id: "d06",
    level: "dificil",
    question: "¿Qué porcentaje del monto total vendido en 2025 corresponde al canal web? Muestra solo el porcentaje, de 0 a 100, redondeado a dos decimales.",
    sql: `SELECT ROUND(100.0 * SUM(CASE WHEN v.canal = 'web' THEN d.cantidad * d.precio_unitario END) / ${MONTO}, 2) FROM ${VD} WHERE ${Y25}`,
  },
  {
    id: "d07",
    level: "dificil",
    question: "¿Cuántos clientes compraron en todos los meses de 2025, de enero a diciembre?",
    sql: "SELECT COUNT(*) FROM (SELECT cliente_id FROM ventas WHERE fecha >= '2025-01-01' AND fecha < '2026-01-01' GROUP BY cliente_id HAVING COUNT(DISTINCT substr(fecha, 6, 2)) = 12)",
  },
  {
    id: "d08",
    level: "dificil",
    question: "En 2025, ¿qué cliente compró más en cada canal? Muestra el canal, el nombre del cliente y el total.",
    sql: `SELECT canal, cliente, total FROM (SELECT v.canal, c.nombre AS cliente, ${MONTO} AS total, RANK() OVER (PARTITION BY v.canal ORDER BY ${MONTO} DESC) AS rk FROM ${VD} JOIN clientes c ON c.id = v.cliente_id WHERE ${Y25} GROUP BY v.canal, c.id) WHERE rk = 1`,
  },
];
