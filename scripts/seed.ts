// Genera data/ventas.db: ventas ficticias de una distribuidora chilena, 2024-2025.
// Uso: node scripts/seed.ts   (misma semilla = mismo archivo, byte a byte)
import { rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

// PRNG con semilla (mulberry32): nada de Math.random, para que la base se pueda regenerar idéntica.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REGIONES = [
  "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso", "Metropolitana de Santiago",
  "Libertador General Bernardo O'Higgins", "Maule", "Ñuble", "Biobío", "La Araucanía", "Los Ríos", "Los Lagos",
  "Aysén del General Carlos Ibáñez del Campo", "Magallanes y de la Antártica Chilena",
];
// [comuna, índice de región (1-based)]
const COMUNAS: [string, number][] = [
  ["Arica", 1], ["Iquique", 2], ["Alto Hospicio", 2], ["Antofagasta", 3], ["Calama", 3], ["Copiapó", 4], ["Vallenar", 4],
  ["La Serena", 5], ["Coquimbo", 5], ["Ovalle", 5], ["Valparaíso", 6], ["Viña del Mar", 6], ["Quilpué", 6], ["San Antonio", 6],
  ["Santiago", 7], ["Providencia", 7], ["Las Condes", 7], ["Maipú", 7], ["Puente Alto", 7], ["La Florida", 7], ["Ñuñoa", 7],
  ["Quilicura", 7], ["San Bernardo", 7], ["Rancagua", 8], ["San Fernando", 8], ["Talca", 9], ["Curicó", 9], ["Linares", 9],
  ["Chillán", 10], ["Concepción", 11], ["Talcahuano", 11], ["Los Ángeles", 11], ["Temuco", 12], ["Villarrica", 12],
  ["Valdivia", 13], ["Puerto Montt", 14], ["Osorno", 14], ["Castro", 14], ["Coyhaique", 15], ["Punta Arenas", 16],
];
const PREFIJOS: [string, string][] = [
  ["Ferretería", "Ferretería"], ["Comercial", "Comercio"], ["Distribuidora", "Distribución"], ["Constructora", "Construcción"],
  ["Inmobiliaria", "Construcción"], ["Maderas", "Ferretería"], ["Agrícola", "Agrícola"], ["Servicios", "Servicios"],
  ["Importadora", "Distribución"], ["Electro", "Electricidad"],
];
const NOMBRES = [
  "Sur", "Andes", "Norte", "Pacífico", "Austral", "del Valle", "Los Robles", "San Pedro", "Cordillera", "El Roble",
  "Los Aromos", "Santa Elena", "El Molino", "Río Claro", "La Montaña", "Los Copihues", "Patagonia", "Puerto Nuevo",
  "Valle Central", "Las Araucarias", "El Faro", "Altamira", "Llanquihue", "Atacama", "Los Álamos", "Bío Bío",
  "Mar Azul", "Tres Ríos", "Los Pinos", "La Estrella",
];
const CATEGORIAS: [string, string[], number, number][] = [
  // [nombre, productos, precio mínimo, precio máximo]
  ["Herramientas", ["Taladro percutor", "Esmeril angular", "Set de llaves", "Martillo carpintero", "Sierra circular", "Atornillador inalámbrico", "Nivel de burbuja", "Huincha de medir", "Alicate universal", "Caja de herramientas"], 4990, 129990],
  ["Construcción", ["Cemento 25 kg", "Yeso cartón", "Fierro estriado", "Arena por saco", "Ladrillo fiscal", "Malla acma", "Perfil metalcon", "Plancha OSB", "Clavos por kilo", "Aditivo hormigón"], 1990, 24990],
  ["Electricidad", ["Cable 2,5 mm rollo", "Enchufe doble", "Interruptor simple", "Tablero eléctrico", "Ampolleta LED", "Foco halógeno", "Alargador 5 m", "Automático 16 A", "Canaleta PVC", "Diferencial 25 A"], 990, 89990],
  ["Gasfitería", ["Llave de paso", "Cañería PVC", "Flexible de agua", "Sifón lavaplatos", "Teflón", "Grifería cocina", "Calefont 13 L", "Codo cobre", "Estanque WC", "Válvula de retención"], 790, 249990],
  ["Pinturas", ["Látex 1 galón", "Esmalte sintético", "Barniz marino", "Rodillo antigota", "Brocha 3 pulgadas", "Diluyente", "Pasta muro", "Anticorrosivo", "Cinta de enmascarar", "Bandeja de pintura"], 1490, 39990],
  ["Jardín", ["Manguera 15 m", "Cortacésped eléctrico", "Tierra de hoja", "Pala jardinera", "Rastrillo", "Aspersor", "Tijera de podar", "Macetero grande", "Semillas de pasto", "Carretilla"], 1990, 189990],
  ["Seguridad", ["Casco de seguridad", "Guantes de cabritilla", "Lentes de seguridad", "Zapato de seguridad", "Chaleco reflectante", "Arnés", "Protector auditivo", "Mascarilla N95", "Extintor 6 kg", "Candado"], 990, 79990],
  ["Aseo", ["Detergente industrial", "Cloro 5 L", "Escoba", "Mopa", "Bolsas de basura", "Paño multiuso", "Desengrasante", "Balde 12 L", "Papel higiénico industrial", "Limpiavidrios"], 690, 19990],
];
// Tendencia por categoría (multiplicador 2025 vs 2024), para que "¿qué categoría creció más?" tenga respuesta clara.
const TENDENCIA = [1.05, 0.9, 1.35, 1.0, 1.1, 1.2, 0.95, 1.02];
const VENDEDORES: [string, number][] = [
  ["Camila Rojas", 7], ["Matías González", 7], ["Valentina Muñoz", 7], ["Sebastián Díaz", 7], ["Javiera Soto", 7],
  ["Felipe Contreras", 6], ["Constanza Silva", 6], ["Nicolás Morales", 11], ["Francisca Fuentes", 11], ["Diego Araya", 5],
  ["Catalina Espinoza", 3], ["Tomás Reyes", 12], ["Fernanda Castillo", 9], ["Ignacio Vargas", 14], ["Antonia Herrera", 16],
];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function seed(path: string, seedValue = 42): void {
  const r = rng(seedValue);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];

  rmSync(path, { force: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE regiones (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL);
    CREATE TABLE comunas (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, region_id INTEGER NOT NULL REFERENCES regiones(id));
    CREATE TABLE clientes (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, rubro TEXT NOT NULL, comuna_id INTEGER NOT NULL REFERENCES comunas(id), fecha_alta TEXT NOT NULL);
    CREATE TABLE categorias (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL);
    CREATE TABLE productos (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, categoria_id INTEGER NOT NULL REFERENCES categorias(id), precio INTEGER NOT NULL);
    CREATE TABLE vendedores (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, region_id INTEGER NOT NULL REFERENCES regiones(id));
    CREATE TABLE ventas (id INTEGER PRIMARY KEY, fecha TEXT NOT NULL, cliente_id INTEGER NOT NULL REFERENCES clientes(id), vendedor_id INTEGER NOT NULL REFERENCES vendedores(id), canal TEXT NOT NULL CHECK (canal IN ('tienda','web','telefono')));
    CREATE TABLE detalle_venta (id INTEGER PRIMARY KEY, venta_id INTEGER NOT NULL REFERENCES ventas(id), producto_id INTEGER NOT NULL REFERENCES productos(id), cantidad INTEGER NOT NULL, precio_unitario INTEGER NOT NULL);
  `);

  db.exec("BEGIN");
  const ins = (sql: string) => db.prepare(sql);
  const insRegion = ins("INSERT INTO regiones VALUES (?, ?)");
  REGIONES.forEach((n, i) => insRegion.run(i + 1, n));
  const insComuna = ins("INSERT INTO comunas VALUES (?, ?, ?)");
  COMUNAS.forEach(([n, reg], i) => insComuna.run(i + 1, n, reg));

  // Clientes: combinaciones únicas de prefijo + nombre, barajadas. Casi la mitad en la Región Metropolitana.
  const combos = PREFIJOS.flatMap(([p, rubro]) => NOMBRES.map((n) => [`${p} ${n}`, rubro] as const));
  for (let i = combos.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [combos[i], combos[j]] = [combos[j], combos[i]];
  }
  const rmComunas = COMUNAS.map(([, reg], i) => (reg === 7 ? i + 1 : 0)).filter(Boolean);
  const insCliente = ins("INSERT INTO clientes VALUES (?, ?, ?, ?, ?)");
  const clientes = combos.slice(0, 300).map(([nombre, rubro], i) => {
    const comuna = r() < 0.45 ? pick(rmComunas) : int(1, COMUNAS.length);
    // Alta entre 2022-06 y 2025-10: los clientes nuevos de 2024-2025 dan respuestas a "clientes nuevos por mes".
    const alta = new Date(Date.UTC(2022, 5, 1) + Math.floor(r() * 1248) * 86400000);
    insCliente.run(i + 1, nombre, rubro, comuna, iso(alta));
    // Peso de Pareto: pocos clientes concentran gran parte de las compras.
    return { id: i + 1, alta: iso(alta), region: COMUNAS[comuna - 1][1], peso: Math.pow(1 - r(), -1 / 1.1) };
  });

  const insCat = ins("INSERT INTO categorias VALUES (?, ?)");
  const insProd = ins("INSERT INTO productos VALUES (?, ?, ?, ?)");
  const productos: { id: number; cat: number; precio: number }[] = [];
  CATEGORIAS.forEach(([nombre, prods, min, max], c) => {
    insCat.run(c + 1, nombre);
    for (const p of prods) {
      const precio = Math.round((min + r() * (max - min)) / 10) * 10;
      productos.push({ id: productos.length + 1, cat: c, precio });
      insProd.run(productos.length, p, c + 1, precio);
    }
  });

  const insVend = ins("INSERT INTO vendedores VALUES (?, ?, ?)");
  VENDEDORES.forEach(([n, reg], i) => insVend.run(i + 1, n, reg));

  const insVenta = ins("INSERT INTO ventas VALUES (?, ?, ?, ?, ?)");
  const insDet = ins("INSERT INTO detalle_venta VALUES (?, ?, ?, ?, ?)");
  const pesoTotal = clientes.reduce((s, c) => s + c.peso, 0);
  const elegirCliente = () => {
    let x = r() * pesoTotal;
    for (const c of clientes) if ((x -= c.peso) <= 0) return c;
    return clientes[clientes.length - 1];
  };
  let venta = 0;
  let detalle = 0;
  for (let t = Date.UTC(2024, 0, 1); t <= Date.UTC(2025, 11, 31); t += 86400000) {
    const d = new Date(t);
    const fecha = iso(d);
    const mes = d.getUTCMonth();
    const anio = d.getUTCFullYear();
    // Estacionalidad: más en noviembre-diciembre, menos en febrero; domingos casi sin ventas; 2025 crece algo.
    const factor = (mes >= 10 ? 1.45 : mes === 1 ? 0.65 : 1) * (d.getUTCDay() === 0 ? 0.2 : 1) * (anio === 2025 ? 1.08 : 1);
    const n = Math.floor(6.4 * factor + r());
    for (let k = 0; k < n; k++) {
      let c = elegirCliente();
      for (let tries = 0; c.alta > fecha && tries < 20; tries++) c = elegirCliente();
      if (c.alta > fecha) continue;
      const enRegion = VENDEDORES.map(([, reg], i) => (reg === c.region ? i + 1 : 0)).filter(Boolean);
      const vendedor = enRegion.length && r() < 0.85 ? pick(enRegion) : int(1, VENDEDORES.length);
      const x = r();
      const canal = x < 0.5 ? "tienda" : x < 0.8 ? "web" : "telefono";
      insVenta.run(++venta, fecha, c.id, vendedor, canal);
      const lineas = int(1, 4);
      const usados = new Set<number>();
      for (let l = 0; l < lineas; l++) {
        let p = pick(productos);
        // La tendencia por categoría se aplica en 2025 aceptando o rechazando la línea.
        if (anio === 2025 && r() > TENDENCIA[p.cat] / 1.35) p = pick(productos);
        if (usados.has(p.id)) continue;
        usados.add(p.id);
        const cantidad = r() < 0.7 ? int(1, 5) : int(6, 40);
        const precio = anio === 2025 ? Math.round((p.precio * 1.04) / 10) * 10 : p.precio; // alza de precios 2025
        insDet.run(++detalle, venta, p.id, cantidad, precio);
      }
    }
  }
  db.exec("COMMIT");
  db.exec("VACUUM");
  db.close();
}

if (import.meta.main) {
  seed("data/ventas.db");
  console.log("data/ventas.db generada");
}
