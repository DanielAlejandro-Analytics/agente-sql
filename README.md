# Agente SQL

Escribes una pregunta en español sobre las ventas de una distribuidora y el agente la convierte en SQL, la ejecuta y explica el resultado en una o dos frases. Los datos son **ficticios**: una base SQLite generada con semilla fija (300 clientes, ~4.500 ventas de 2024 y 2025).

## Cómo funciona

1. Gemini (`gemini-3.5-flash-lite`) recibe el esquema, tres ejemplos y la pregunta, y devuelve una consulta.
2. La consulta se valida: una sola sentencia `SELECT`/`WITH`, sin `PRAGMA`, `ATTACH` ni `RECURSIVE`.
3. Se ejecuta con la base abierta en solo lectura, en un proceso aparte que se mata a los 3 segundos. Se probó que un `Worker` no sirve para esto: `terminate()` no interrumpe a SQLite mientras calcula.
4. Si falla, el error vuelve al modelo una vez para que corrija.
5. Otra llamada explica el resultado a partir de las primeras filas.

El demo admite 5 preguntas por visitante al día y un tope global, porque usa la cuota gratuita de Gemini.

## Evaluación

30 preguntas en español (10 fáciles, 12 medias, 8 difíciles) con un SQL de referencia escrito a mano antes de correr el modelo. Una respuesta es correcta si el SQL generado devuelve exactamente las mismas filas.

| | Exactitud |
|---|---|
| Total | 93,3 % (28/30) |
| Fáciles | 100 % |
| Medias | 100 % |
| Difíciles | 75 % |

Fallan dos difíciles: en una el modelo agrupó por categoría y devolvió un producto cualquiera; en la otra devolvió la lista de clientes cuando se preguntaba cuántos eran. La primera corrida marcó 90 % porque el comparador exigía orden en un caso donde el `ORDER BY` estaba dentro de una función de ventana; se corrigió el comparador (no las referencias) y se volvió a puntuar con el SQL guardado.

Límites: 30 preguntas es poco (cada una mueve el resultado 3,3 puntos), la comparación es estricta con las columnas y la explicación no se mide.

## Correrlo

Necesita Node 24 o superior (usa `node:sqlite`).

```bash
npm install
cp .env.example .env.local      # completar GEMINI_API_KEY y GEMINI_MODEL
npm run dev
npm test                        # pruebas, sin llamar al modelo
node scripts/seed.ts            # regenera data/ventas.db (idéntica)
node --env-file=.env.local scripts/eval.ts   # eval: ~30-60 llamadas a Gemini
```
