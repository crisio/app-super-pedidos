import { Hono } from "hono";
import {
  normalizarBusqueda,
  type ImportacionIniciada,
  type ResultadoImportacion,
  type ResultadoLote,
  type Usuario,
} from "@super-pedidos/compartido";
import { fallar, leerJson, texto } from "./errores";
import { requiereSesion } from "./sesion";
import type { Entorno } from "./tipos";

// Importación del inventario exportado de SAP. La app lee el archivo en el navegador
// y lo manda por lotes: así no importa el tamaño del archivo y cada solicitud hace
// pocas consultas (el plan gratis de Workers permite 50 por solicitud).

const MAX_CENTROS = 200;
const MAX_PRODUCTOS_POR_LOTE = 500;
const MAX_EXISTENCIAS_POR_LOTE = 5000;

function soloCentral(usuario: Usuario) {
  if (usuario.rol !== "central") throw fallar(403, "Solo un usuario central puede importar el inventario.");
}

function identificador(texto: string) {
  return (
    normalizarBusqueda(texto)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "sin-nombre"
  );
}

function textoOpcional(valor: unknown, maximo: number) {
  const limpio = texto(valor, maximo);
  return limpio === "" ? null : limpio;
}

type FilaImportacion = { id: string; locales: string; creada_en: string; terminada_en: string | null };

async function importacionAbierta(db: D1Database, id: string) {
  const fila = await db
    .prepare("SELECT id, locales, creada_en, terminada_en FROM importaciones WHERE id = ?")
    .bind(id)
    .first<FilaImportacion>();
  if (!fila) throw fallar(404, "No encontramos esa importación.");
  if (fila.terminada_en) throw fallar(409, "Esa importación ya terminó. Empieza una nueva.");
  return { ...fila, localesIds: JSON.parse(fila.locales) as string[] };
}

export const rutasImportaciones = new Hono<Entorno>()
  .use(requiereSesion)
  // Empieza una importación: asigna cada centro de SAP a un local (o crea el local).
  .post("/", async (c) => {
    const usuario = c.get("usuario");
    soloCentral(usuario);
    const db = c.env.DB;
    const cuerpo = await leerJson(c.req.raw);
    const archivo = texto(cuerpo.archivo, 200) || "inventario";
    if (!Array.isArray(cuerpo.centros) || cuerpo.centros.length > MAX_CENTROS) {
      throw fallar(400, `Indica entre 0 y ${MAX_CENTROS} centros.`);
    }

    const { results: locales } = await db
      .prepare("SELECT id, codigo_sap FROM locales WHERE activo = 1")
      .all<{ id: string; codigo_sap: string | null }>();
    const idsExistentes = new Set(locales.map((local) => local.id));
    const porCodigo = new Map(locales.filter((l) => l.codigo_sap).map((l) => [l.codigo_sap!, l.id]));

    const asignar: { localId: string; codigo: string }[] = [];
    const nuevos: { id: string; nombre: string; codigo: string }[] = [];
    const mapa: Record<string, string> = {};
    for (const centro of cuerpo.centros as Record<string, unknown>[]) {
      const codigo = texto(centro?.codigo, 40);
      if (codigo in mapa) throw fallar(400, `El centro "${codigo}" viene repetido.`);
      const localId = texto(centro?.localId, 100);
      const nombreNuevo = texto(centro?.nombreNuevo, 80);

      if (localId) {
        if (!idsExistentes.has(localId)) throw fallar(400, `El local "${localId}" no existe.`);
        asignar.push({ localId, codigo });
        mapa[codigo] = localId;
      } else if (codigo && porCodigo.has(codigo)) {
        asignar.push({ localId: porCodigo.get(codigo)!, codigo });
        mapa[codigo] = porCodigo.get(codigo)!;
      } else if (nombreNuevo.length >= 2 && codigo) {
        let id = `sap-${identificador(codigo)}`;
        if (idsExistentes.has(id)) id = `${id}-${crypto.randomUUID().slice(0, 4)}`;
        idsExistentes.add(id);
        nuevos.push({ id, nombre: nombreNuevo, codigo });
        mapa[codigo] = id;
      } else {
        throw fallar(400, `Elige un local o escribe el nombre del local nuevo para el centro "${codigo}".`);
      }
    }

    const id = crypto.randomUUID();
    const ahora = new Date().toISOString();
    const codigos = JSON.stringify([...asignar, ...nuevos].map((centro) => centro.codigo).filter(Boolean));
    await db.batch([
      // Un código de centro solo puede pertenecer a un local.
      db
        .prepare("UPDATE locales SET codigo_sap = NULL WHERE codigo_sap IN (SELECT value FROM json_each(?))")
        .bind(codigos),
      db
        .prepare(
          `UPDATE locales SET
           inventario_sap = 1,
           codigo_sap = COALESCE(
             (SELECT json_extract(value, '$.codigo') FROM json_each(?1)
               WHERE json_extract(value, '$.localId') = locales.id AND json_extract(value, '$.codigo') != ''
               LIMIT 1),
             codigo_sap)
         WHERE id IN (SELECT json_extract(value, '$.localId') FROM json_each(?1))`,
        )
        .bind(JSON.stringify(asignar)),
      db
        .prepare(
          `INSERT INTO locales (id, nombre, codigo_sap, inventario_sap)
         SELECT json_extract(value, '$.id'), json_extract(value, '$.nombre'), json_extract(value, '$.codigo'), 1
           FROM json_each(?)`,
        )
        .bind(JSON.stringify(nuevos)),
      db
        .prepare(
          "INSERT INTO importaciones (id, archivo, usuario_id, locales, creada_en) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(id, archivo, usuario.id, JSON.stringify([...new Set(Object.values(mapa))]), ahora),
    ]);

    const respuesta: ImportacionIniciada = { id, locales: mapa, localesCreados: nuevos.length };
    return c.json(respuesta, 201);
  })
  // Un lote de productos y sus existencias por local.
  .post("/:id/lote", async (c) => {
    const usuario = c.get("usuario");
    soloCentral(usuario);
    const db = c.env.DB;
    const importacion = await importacionAbierta(db, c.req.param("id"));
    const cuerpo = await leerJson(c.req.raw);
    const { productos, existencias } = cuerpo;
    if (!Array.isArray(productos) || productos.length > MAX_PRODUCTOS_POR_LOTE) {
      throw fallar(400, `Cada lote lleva hasta ${MAX_PRODUCTOS_POR_LOTE} productos.`);
    }
    if (!Array.isArray(existencias) || existencias.length > MAX_EXISTENCIAS_POR_LOTE) {
      throw fallar(400, `Cada lote lleva hasta ${MAX_EXISTENCIAS_POR_LOTE} existencias.`);
    }

    const categorias = new Map<string, string>([["general", "General"]]);
    const filasProductos = [];
    for (const producto of productos as Record<string, unknown>[]) {
      const sku = texto(producto?.sku, 40);
      if (!sku) throw fallar(400, "Hay productos sin código de material.");
      const nombre = textoOpcional(producto.nombre, 200);
      const categoria = textoOpcional(producto.categoria, 60);
      const categoriaId = categoria ? `sap-${identificador(categoria)}` : null;
      if (categoria && categoriaId) categorias.set(categoriaId, categoria);
      const precio = producto.precioCentavos;
      filasProductos.push({
        id: `sap-${sku}`,
        sku,
        nombre,
        busqueda: nombre ? normalizarBusqueda(nombre) : null,
        unidad: textoOpcional(producto.unidad, 30),
        codigoBarras: textoOpcional(producto.codigoBarras, 40),
        precio: Number.isInteger(precio) && (precio as number) >= 0 ? precio : null,
        categoriaId,
      });
    }

    const localesPermitidos = new Set(importacion.localesIds);
    const filasExistencias = [];
    for (const existencia of existencias as Record<string, unknown>[]) {
      const sku = texto(existencia?.sku, 40);
      const localId = texto(existencia?.localId, 100);
      const cantidad = existencia?.cantidad;
      if (!sku || typeof cantidad !== "number" || !Number.isFinite(cantidad)) {
        throw fallar(400, "Hay existencias con datos inválidos.");
      }
      if (!localesPermitidos.has(localId))
        throw fallar(400, `El local "${localId}" no es parte de esta importación.`);
      filasExistencias.push({ sku, localId, cantidad });
    }

    const [, cambiosProductos, cambiosExistencias] = await db.batch([
      db
        .prepare(
          `INSERT INTO categorias (id, nombre, orden)
         SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), 100 FROM json_each(?)
          WHERE true
         ON CONFLICT (id) DO NOTHING`,
        )
        .bind(JSON.stringify([...categorias])),
      // Un producto nuevo necesita nombre; en los existentes, un dato que no viene se conserva.
      // Solo se reescriben los que cambiaron, para no gastar escrituras de D1.
      db
        .prepare(
          `INSERT INTO productos
           (id, sku, codigo_barras, nombre, nombre_busqueda, categoria_id, unidad, precio_centavos, activo)
         SELECT
           COALESCE(p.id, json_extract(j.value, '$.id')),
           json_extract(j.value, '$.sku'),
           COALESCE(json_extract(j.value, '$.codigoBarras'), p.codigo_barras),
           COALESCE(json_extract(j.value, '$.nombre'), p.nombre),
           COALESCE(json_extract(j.value, '$.busqueda'), p.nombre_busqueda),
           COALESCE(json_extract(j.value, '$.categoriaId'), p.categoria_id, 'general'),
           COALESCE(json_extract(j.value, '$.unidad'), p.unidad, 'Unidad'),
           COALESCE(json_extract(j.value, '$.precio'), p.precio_centavos, 0),
           1
         FROM json_each(?) j
         LEFT JOIN productos p ON p.sku = json_extract(j.value, '$.sku')
         WHERE json_extract(j.value, '$.nombre') IS NOT NULL OR p.id IS NOT NULL
         ON CONFLICT (sku) DO UPDATE SET
           codigo_barras = excluded.codigo_barras,
           nombre = excluded.nombre,
           nombre_busqueda = excluded.nombre_busqueda,
           categoria_id = excluded.categoria_id,
           unidad = excluded.unidad,
           precio_centavos = excluded.precio_centavos,
           activo = 1
         WHERE productos.codigo_barras IS NOT excluded.codigo_barras
            OR productos.nombre IS NOT excluded.nombre
            OR productos.categoria_id IS NOT excluded.categoria_id
            OR productos.unidad IS NOT excluded.unidad
            OR productos.precio_centavos IS NOT excluded.precio_centavos
            OR productos.activo = 0`,
        )
        .bind(JSON.stringify(filasProductos)),
      // Se marca con la hora de inicio de la importación: al terminar, lo que no se tocó
      // en los locales de SAP ya no vino en el archivo y se marca agotado.
      db
        .prepare(
          `INSERT INTO disponibilidad (local_id, producto_id, disponible, existencias, actualizado_en, actualizado_por)
         SELECT json_extract(e.value, '$.localId'), p.id,
                CASE WHEN json_extract(e.value, '$.cantidad') > 0 THEN 1 ELSE 0 END,
                json_extract(e.value, '$.cantidad'), ?, ?
           FROM json_each(?) e
           JOIN productos p ON p.sku = json_extract(e.value, '$.sku')
          WHERE true
         ON CONFLICT (local_id, producto_id) DO UPDATE SET
           disponible = excluded.disponible,
           existencias = excluded.existencias,
           actualizado_en = excluded.actualizado_en,
           actualizado_por = excluded.actualizado_por`,
        )
        .bind(importacion.creada_en, usuario.id, JSON.stringify(filasExistencias)),
    ]);

    const resultado: ResultadoLote = {
      productosCambiados: cambiosProductos.meta.changes,
      existenciasActualizadas: cambiosExistencias.meta.changes,
    };
    await db
      .prepare(
        "UPDATE importaciones SET productos = productos + ?, existencias = existencias + ? WHERE id = ?",
      )
      .bind(resultado.productosCambiados, resultado.existenciasActualizadas, importacion.id)
      .run();
    return c.json(resultado);
  })
  .post("/:id/terminar", async (c) => {
    const usuario = c.get("usuario");
    soloCentral(usuario);
    const db = c.env.DB;
    const importacion = await importacionAbierta(db, c.req.param("id"));
    const cuerpo = await leerJson(c.req.raw);
    const skus = Array.isArray(cuerpo.skus) ? cuerpo.skus.map((sku) => texto(sku, 40)).filter(Boolean) : [];
    // Sin la lista completa de SKU no se desactiva nada, para no vaciar el catálogo por error.
    const desactivar = cuerpo.desactivarFaltantes === true && skus.length > 0;
    const ahora = new Date().toISOString();

    const [agotados, desactivados] = await db.batch([
      db
        .prepare(
          `UPDATE disponibilidad SET disponible = 0, existencias = 0, actualizado_en = ?, actualizado_por = ?
          WHERE local_id IN (SELECT value FROM json_each(?))
            AND actualizado_en < ?
            AND (disponible = 1 OR existencias IS NOT 0)`,
        )
        .bind(ahora, usuario.id, JSON.stringify(importacion.localesIds), importacion.creada_en),
      desactivar
        ? db
            .prepare(
              "UPDATE productos SET activo = 0 WHERE activo = 1 AND sku NOT IN (SELECT value FROM json_each(?))",
            )
            .bind(JSON.stringify(skus))
        : db.prepare("SELECT 0"),
    ]);

    const desactivadosTotal = desactivar ? desactivados.meta.changes : 0;
    const fila = await db
      .prepare(
        `UPDATE importaciones SET terminada_en = ?, desactivados = ? WHERE id = ?
         RETURNING productos, existencias`,
      )
      .bind(ahora, desactivadosTotal, importacion.id)
      .first<{ productos: number; existencias: number }>();

    const resultado: ResultadoImportacion = {
      productos: fila?.productos ?? 0,
      existencias: fila?.existencias ?? 0,
      agotadosPorFaltar: agotados.meta.changes,
      desactivados: desactivadosTotal,
    };
    return c.json(resultado);
  });
