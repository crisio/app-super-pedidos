import { Hono } from "hono";
import { normalizarBusqueda, type Catalogo, type Categoria, type Local } from "@super-pedidos/compartido";
import { fallar, leerJson } from "./errores";
import { requiereSesion, verificarAccesoLocal } from "./sesion";
import type { Entorno } from "./tipos";

const LIMITE_POR_DEFECTO = 50;
const LIMITE_MAXIMO = 200;

type FilaProducto = {
  id: string;
  sku: string;
  codigo_barras: string | null;
  nombre: string;
  categoria_id: string;
  unidad: string;
  precio_centavos: number;
  disponible: number;
  existencias: number | null;
};

type FilaLocal = { id: string; inventario_sap: number };

export async function buscarLocal(db: D1Database, localId: string) {
  return db
    .prepare("SELECT id, inventario_sap FROM locales WHERE id = ? AND activo = 1")
    .bind(localId)
    .first<FilaLocal>();
}

export async function existeLocal(db: D1Database, localId: string) {
  return (await buscarLocal(db, localId)) !== null;
}

// Condiciones de disponibilidad de un local. En los locales con inventario de SAP
// solo existe lo que vino en el archivo: un producto sin fila no se vende ahí.
// En los demás, un producto sin fila está disponible.
export function condicionesDisponibilidad(local: FilaLocal) {
  const deSap = local.inventario_sap === 1;
  return {
    disponible: deSap ? "COALESCE(d.disponible, 0)" : "COALESCE(d.disponible, 1)",
    loManeja: deSap ? "d.producto_id IS NOT NULL" : "1 = 1",
  };
}

function escaparLike(texto: string) {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

// Montadas en /locales.
export const rutasCatalogo = new Hono<Entorno>()
  .use(requiereSesion)
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT id, nombre, direccion, telefono, codigo_sap AS codigoSap
         FROM locales WHERE activo = 1 ORDER BY nombre`,
    ).all<Local>();
    return c.json(results);
  })
  // Búsqueda en el catálogo de un local:
  // ?q= texto, SKU o código de barras · ?categoria= · ?agotados=1 · ?limite=
  .get("/:localId/catalogo", async (c) => {
    const localId = c.req.param("localId");
    verificarAccesoLocal(c.get("usuario"), localId);
    const local = await buscarLocal(c.env.DB, localId);
    if (!local) throw fallar(404, "Ese local no existe.");

    const { disponible, loManeja } = condicionesDisponibilidad(local);
    const condiciones = ["p.activo = 1", loManeja];
    const parametros: unknown[] = [localId];

    const busqueda = (c.req.query("q") ?? "").trim().slice(0, 100);
    if (busqueda) {
      const palabras = normalizarBusqueda(busqueda).split(" ").filter(Boolean).slice(0, 5);
      const porNombre = palabras.map(() => "p.nombre_busqueda LIKE ? ESCAPE '\\'").join(" AND ");
      condiciones.push(`((${porNombre || "0"}) OR p.sku = ? OR p.codigo_barras = ?)`);
      parametros.push(...palabras.map((palabra) => `%${escaparLike(palabra)}%`), busqueda, busqueda);
    }
    const categoria = c.req.query("categoria");
    if (categoria) {
      condiciones.push("p.categoria_id = ?");
      parametros.push(categoria);
    }
    if (c.req.query("agotados") === "1") condiciones.push(`${disponible} = 0`);

    const limitePedido = Number(c.req.query("limite"));
    const limite = Number.isInteger(limitePedido)
      ? Math.min(Math.max(limitePedido, 1), LIMITE_MAXIMO)
      : LIMITE_POR_DEFECTO;

    const desde = `FROM productos p LEFT JOIN disponibilidad d ON d.producto_id = p.id AND d.local_id = ?`;
    const [categorias, productos, agotados] = await c.env.DB.batch([
      c.env.DB.prepare(
        `SELECT id, nombre FROM categorias c
          WHERE EXISTS (SELECT 1 FROM productos WHERE categoria_id = c.id AND activo = 1)
          ORDER BY orden, nombre`,
      ),
      c.env.DB.prepare(
        `SELECT p.id, p.sku, p.codigo_barras, p.nombre, p.categoria_id, p.unidad, p.precio_centavos,
                ${disponible} AS disponible, d.existencias
           ${desde}
          WHERE ${condiciones.join(" AND ")}
          ORDER BY p.nombre
          LIMIT ?`,
      ).bind(...parametros, limite + 1),
      c.env.DB.prepare(
        `SELECT COUNT(*) AS total ${desde} WHERE p.activo = 1 AND ${loManeja} AND ${disponible} = 0`,
      ).bind(localId),
    ]);

    const filas = productos.results as FilaProducto[];
    const catalogo: Catalogo = {
      categorias: categorias.results as Categoria[],
      productos: filas.slice(0, limite).map((fila) => ({
        id: fila.id,
        sku: fila.sku,
        codigoBarras: fila.codigo_barras,
        nombre: fila.nombre,
        categoriaId: fila.categoria_id,
        unidad: fila.unidad,
        precioCentavos: fila.precio_centavos,
        disponible: fila.disponible === 1,
        existencias: fila.existencias,
      })),
      hayMas: filas.length > limite,
      agotados: (agotados.results[0] as { total: number }).total,
    };
    return c.json(catalogo);
  })
  .put("/:localId/productos/:productoId/disponibilidad", async (c) => {
    const { localId, productoId } = c.req.param();
    const usuario = c.get("usuario");
    verificarAccesoLocal(usuario, localId);

    const cuerpo = await leerJson(c.req.raw);
    if (typeof cuerpo.disponible !== "boolean") {
      throw fallar(400, "Indica si el producto está disponible (true o false).");
    }
    const producto = await c.env.DB.prepare("SELECT 1 FROM productos WHERE id = ?").bind(productoId).first();
    if (!producto || !(await existeLocal(c.env.DB, localId))) {
      throw fallar(404, "No encontramos ese producto o local.");
    }

    await c.env.DB.prepare(
      `INSERT INTO disponibilidad (local_id, producto_id, disponible, actualizado_en, actualizado_por)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (local_id, producto_id) DO UPDATE SET
         disponible = excluded.disponible,
         actualizado_en = excluded.actualizado_en,
         actualizado_por = excluded.actualizado_por`,
    )
      .bind(localId, productoId, cuerpo.disponible ? 1 : 0, new Date().toISOString(), usuario.id)
      .run();
    return c.json({ productoId, disponible: cuerpo.disponible });
  });
