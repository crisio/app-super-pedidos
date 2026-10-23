import { Hono } from "hono";
import type { Catalogo, Categoria, Local } from "@super-pedidos/compartido";
import { fallar, leerJson } from "./errores";
import { requiereSesion, verificarAccesoLocal } from "./sesion";
import type { Entorno } from "./tipos";

type FilaProducto = {
  id: string;
  sku: string;
  codigo_barras: string | null;
  nombre: string;
  categoria_id: string;
  unidad: string;
  precio_centavos: number;
  disponible: number;
};

export async function existeLocal(db: D1Database, localId: string) {
  const fila = await db.prepare("SELECT 1 FROM locales WHERE id = ? AND activo = 1").bind(localId).first();
  return fila !== null;
}

// Montadas en /locales.
export const rutasCatalogo = new Hono<Entorno>()
  .use(requiereSesion)
  .get("/", async (c) => {
    const { results } = await c.env.DB.prepare(
      "SELECT id, nombre, direccion, telefono FROM locales WHERE activo = 1 ORDER BY nombre",
    ).all<Local>();
    return c.json(results);
  })
  // Catálogo con la disponibilidad de un local.
  .get("/:localId/catalogo", async (c) => {
    const localId = c.req.param("localId");
    verificarAccesoLocal(c.get("usuario"), localId);
    if (!(await existeLocal(c.env.DB, localId))) throw fallar(404, "Ese local no existe.");

    const [categorias, productos] = await c.env.DB.batch([
      c.env.DB.prepare("SELECT id, nombre FROM categorias ORDER BY orden, nombre"),
      c.env.DB.prepare(
        `SELECT p.id, p.sku, p.codigo_barras, p.nombre, p.categoria_id, p.unidad, p.precio_centavos,
                COALESCE(d.disponible, 1) AS disponible
           FROM productos p
           LEFT JOIN disponibilidad d ON d.producto_id = p.id AND d.local_id = ?
          WHERE p.activo = 1
          ORDER BY p.nombre`,
      ).bind(localId),
    ]);

    const catalogo: Catalogo = {
      categorias: categorias.results as Categoria[],
      productos: (productos.results as FilaProducto[]).map((fila) => ({
        id: fila.id,
        sku: fila.sku,
        codigoBarras: fila.codigo_barras,
        nombre: fila.nombre,
        categoriaId: fila.categoria_id,
        unidad: fila.unidad,
        precioCentavos: fila.precio_centavos,
        disponible: fila.disponible === 1,
      })),
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
