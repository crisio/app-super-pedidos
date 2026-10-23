import { Hono } from "hono";
import {
  calcularTotales,
  canales,
  canalesDeCaptura,
  esCanal,
  esEntrega,
  esEstado,
  esPago,
  esTelefonoValido,
  estados,
  estadosActivos,
  estadosCerrados,
  formatearTelefono,
  MAX_CANTIDAD_POR_PRODUCTO,
  puedeCambiarA,
  type DetallePedido,
  type Estado,
  type EventoPedido,
  type LineaPedido,
  type ResumenPedido,
  type Usuario,
} from "@super-pedidos/compartido";
import { existeLocal } from "./catalogo";
import { fallar, leerJson, texto } from "./errores";
import { requiereSesion, verificarAccesoLocal } from "./sesion";
import type { Entorno } from "./tipos";

const MAX_LINEAS = 200;
const MAX_CERRADOS = 100;

const COLUMNAS_RESUMEN = `
  p.id, p.numero, p.local_id, l.nombre AS local_nombre, p.canal, p.estado, p.entrega,
  p.cliente_nombre, p.cliente_telefono, p.total_centavos, p.creado_en, p.actualizado_en,
  (SELECT COALESCE(SUM(cantidad), 0) FROM lineas_pedido WHERE pedido_id = p.id) AS unidades`;

type FilaResumen = {
  id: string;
  numero: number;
  local_id: string;
  local_nombre: string;
  canal: ResumenPedido["canal"];
  estado: Estado;
  entrega: ResumenPedido["entrega"];
  cliente_nombre: string;
  cliente_telefono: string;
  total_centavos: number;
  creado_en: string;
  actualizado_en: string;
  unidades: number;
};

type FilaDetalle = FilaResumen & {
  direccion: string;
  delivery_nombre: string;
  pago: DetallePedido["pago"];
  notas: string;
  subtotal_centavos: number;
  envio_centavos: number;
  tarifa_servicio_centavos: number;
};

function aResumen(fila: FilaResumen): ResumenPedido {
  return {
    id: fila.id,
    numero: fila.numero,
    localId: fila.local_id,
    localNombre: fila.local_nombre,
    canal: fila.canal,
    estado: fila.estado,
    entrega: fila.entrega,
    clienteNombre: fila.cliente_nombre,
    clienteTelefono: fila.cliente_telefono,
    totalCentavos: fila.total_centavos,
    unidades: fila.unidades,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  };
}

async function buscarDetalle(db: D1Database, id: string): Promise<DetallePedido | null> {
  const [pedido, lineas, eventos] = await db.batch([
    db
      .prepare(
        `SELECT ${COLUMNAS_RESUMEN}, p.direccion, p.delivery_nombre, p.pago, p.notas,
              p.subtotal_centavos, p.envio_centavos, p.tarifa_servicio_centavos
         FROM pedidos p JOIN locales l ON l.id = p.local_id
        WHERE p.id = ?`,
      )
      .bind(id),
    db
      .prepare(
        `SELECT producto_id AS productoId, nombre, unidad, precio_centavos AS precioCentavos,
              cantidad, importe_centavos AS importeCentavos
         FROM lineas_pedido WHERE pedido_id = ? ORDER BY nombre`,
      )
      .bind(id),
    db
      .prepare(
        `SELECT e.estado, e.nota, u.nombre AS usuarioNombre, e.creado_en AS creadoEn
         FROM eventos_pedido e LEFT JOIN usuarios u ON u.id = e.usuario_id
        WHERE e.pedido_id = ? ORDER BY e.id`,
      )
      .bind(id),
  ]);

  const fila = pedido.results[0] as FilaDetalle | undefined;
  if (!fila) return null;
  return {
    ...aResumen(fila),
    direccion: fila.direccion,
    deliveryNombre: fila.delivery_nombre,
    pago: fila.pago,
    notas: fila.notas,
    subtotalCentavos: fila.subtotal_centavos,
    envioCentavos: fila.envio_centavos,
    tarifaServicioCentavos: fila.tarifa_servicio_centavos,
    lineas: lineas.results as LineaPedido[],
    eventos: eventos.results as EventoPedido[],
  };
}

async function detalleConAcceso(db: D1Database, usuario: Usuario, id: string) {
  const detalle = await buscarDetalle(db, id);
  if (!detalle) throw fallar(404, "No encontramos ese pedido.");
  verificarAccesoLocal(usuario, detalle.localId);
  return detalle;
}

type LineaValidada = {
  productoId: string;
  nombre: string;
  unidad: string;
  precioCentavos: number;
  cantidad: number;
};

type ResultadoLineas = { ok: true; lineas: LineaValidada[] } | { ok: false; error: string };

// Valida las líneas contra el catálogo y la disponibilidad del local.
// Los precios siempre salen de la base de datos, nunca del cliente.
async function validarLineas(db: D1Database, localId: string, valor: unknown): Promise<ResultadoLineas> {
  if (!Array.isArray(valor) || valor.length === 0) {
    return { ok: false, error: "Agrega al menos un producto." };
  }
  if (valor.length > MAX_LINEAS) return { ok: false, error: `Máximo ${MAX_LINEAS} productos por pedido.` };

  const cantidades = new Map<string, number>();
  for (const item of valor) {
    const productoId = texto(item?.productoId, 100);
    const cantidad = item?.cantidad;
    if (!productoId || !Number.isInteger(cantidad) || cantidad < 1) {
      return { ok: false, error: "Hay productos con cantidades inválidas." };
    }
    cantidades.set(productoId, (cantidades.get(productoId) ?? 0) + cantidad);
  }

  // D1 acepta hasta 100 parámetros por consulta: se consulta por bloques.
  const ids = [...cantidades.keys()];
  const consultas = [];
  for (let inicio = 0; inicio < ids.length; inicio += 90) {
    const bloque = ids.slice(inicio, inicio + 90);
    consultas.push(
      db
        .prepare(
          `SELECT p.id, p.nombre, p.unidad, p.precio_centavos, COALESCE(d.disponible, 1) AS disponible
             FROM productos p
             LEFT JOIN disponibilidad d ON d.producto_id = p.id AND d.local_id = ?
            WHERE p.activo = 1 AND p.id IN (${bloque.map(() => "?").join(", ")})`,
        )
        .bind(localId, ...bloque),
    );
  }
  type FilaProducto = {
    id: string;
    nombre: string;
    unidad: string;
    precio_centavos: number;
    disponible: number;
  };
  const resultados = await db.batch<FilaProducto>(consultas);

  const porId = new Map(resultados.flatMap((r) => r.results).map((fila) => [fila.id, fila]));
  const lineas: LineaValidada[] = [];
  const agotados: string[] = [];
  for (const [productoId, cantidad] of cantidades) {
    const producto = porId.get(productoId);
    if (!producto) return { ok: false, error: "Uno de los productos ya no existe en el catálogo." };
    if (producto.disponible !== 1) agotados.push(producto.nombre);
    if (cantidad > MAX_CANTIDAD_POR_PRODUCTO) {
      return { ok: false, error: `Máximo ${MAX_CANTIDAD_POR_PRODUCTO} unidades de ${producto.nombre}.` };
    }
    lineas.push({
      productoId,
      nombre: producto.nombre,
      unidad: producto.unidad,
      precioCentavos: producto.precio_centavos,
      cantidad,
    });
  }
  if (agotados.length > 0) {
    return { ok: false, error: `Agotado en este local: ${agotados.join(", ")}.` };
  }
  return { ok: true, lineas };
}

export const rutasPedidos = new Hono<Entorno>()
  .use(requiereSesion)
  // ?vista=activos (por defecto) o cerrados; ?local= para filtrar (solo central).
  .get("/", async (c) => {
    const usuario = c.get("usuario");
    const vista = c.req.query("vista") === "cerrados" ? "cerrados" : "activos";
    const localId = usuario.rol === "local" ? usuario.localId : c.req.query("local") || null;

    const estadosVista = vista === "activos" ? estadosActivos : estadosCerrados;
    const condiciones = [`p.estado IN (${estadosVista.map(() => "?").join(", ")})`];
    const parametros: unknown[] = [...estadosVista];
    if (localId) {
      condiciones.push("p.local_id = ?");
      parametros.push(localId);
    }
    // Activos: el más antiguo primero (se atiende en orden de llegada).
    const orden = vista === "activos" ? "p.creado_en ASC" : `p.actualizado_en DESC LIMIT ${MAX_CERRADOS}`;

    const { results } = await c.env.DB.prepare(
      `SELECT ${COLUMNAS_RESUMEN}
         FROM pedidos p JOIN locales l ON l.id = p.local_id
        WHERE ${condiciones.join(" AND ")}
        ORDER BY ${orden}`,
    )
      .bind(...parametros)
      .all<FilaResumen>();
    return c.json(results.map(aResumen));
  })
  .get("/:id", async (c) => {
    return c.json(await detalleConAcceso(c.env.DB, c.get("usuario"), c.req.param("id")));
  })
  .post("/", async (c) => {
    const usuario = c.get("usuario");
    const db = c.env.DB;

    const claveIdempotencia = texto(c.req.header("Idempotency-Key"), 100) || null;
    if (claveIdempotencia) {
      const existente = await db
        .prepare("SELECT id FROM pedidos WHERE clave_idempotencia = ?")
        .bind(claveIdempotencia)
        .first<{ id: string }>();
      if (existente) return c.json(await detalleConAcceso(db, usuario, existente.id));
    }

    const cuerpo = await leerJson(c.req.raw);
    const localId = texto(cuerpo.localId, 100);
    const clienteNombre = texto(cuerpo.clienteNombre, 100);
    const clienteTelefono = texto(cuerpo.clienteTelefono, 20);
    const direccion = texto(cuerpo.direccion, 300);
    const deliveryNombre = texto(cuerpo.deliveryNombre, 100);
    const notas = texto(cuerpo.notas, 500);
    const { canal, entrega, pago } = cuerpo;

    const campos: Record<string, string> = {};
    if (!localId || !(await existeLocal(db, localId))) campos.localId = "Elige el local.";
    if (!esCanal(canal) || !canalesDeCaptura.includes(canal))
      campos.canal = "Elige por dónde llegó el pedido.";
    if (clienteNombre.length < 2) campos.clienteNombre = "Escribe el nombre del cliente.";
    if (!esTelefonoValido(clienteTelefono)) campos.clienteTelefono = "Escribe un teléfono de 8 dígitos.";
    if (!esEntrega(entrega)) campos.entrega = "Elige cómo se entrega el pedido.";
    if (entrega === "domicilio" && direccion.length < 5)
      campos.direccion = "Escribe la dirección de entrega.";
    if (entrega === "delivery_externo" && deliveryNombre.length < 2) {
      campos.deliveryNombre = "Escribe quién recoge (delivery o empresa).";
    }
    if (!esPago(pago)) campos.pago = "Elige el método de pago.";

    if (localId) verificarAccesoLocal(usuario, localId);
    const validacion = campos.localId ? null : await validarLineas(db, localId, cuerpo.lineas);
    if (validacion && !validacion.ok) campos.lineas = validacion.error;

    if (Object.keys(campos).length > 0 || !validacion?.ok) {
      throw fallar(400, "Revisa los datos del pedido.", campos);
    }
    if (!esCanal(canal) || !esEntrega(entrega) || !esPago(pago)) throw fallar(400, "Datos inválidos.");

    const { lineas } = validacion;
    const totales = calcularTotales(lineas, entrega);
    const id = crypto.randomUUID();
    const ahora = new Date().toISOString();

    // Todo en una transacción: pedido, líneas y primer evento.
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO pedidos (
             id, numero, local_id, canal, estado, cliente_nombre, cliente_telefono, entrega,
             direccion, delivery_nombre, pago, notas, subtotal_centavos, envio_centavos,
             tarifa_servicio_centavos, total_centavos, clave_idempotencia, creado_por,
             creado_en, actualizado_en)
           SELECT ?, COALESCE(MAX(numero), 1000) + 1, ?, ?, 'recibido', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
             FROM pedidos`,
          )
          .bind(
            id,
            localId,
            canal,
            clienteNombre,
            formatearTelefono(clienteTelefono),
            entrega,
            entrega === "domicilio" ? direccion : "",
            entrega === "delivery_externo" ? deliveryNombre : "",
            pago,
            notas,
            totales.subtotal,
            totales.envio,
            totales.tarifaServicio,
            totales.total,
            claveIdempotencia,
            usuario.id,
            ahora,
            ahora,
          ),
        ...lineas.map((linea) =>
          db
            .prepare(
              `INSERT INTO lineas_pedido
               (pedido_id, producto_id, nombre, unidad, precio_centavos, cantidad, importe_centavos)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              id,
              linea.productoId,
              linea.nombre,
              linea.unidad,
              linea.precioCentavos,
              linea.cantidad,
              linea.precioCentavos * linea.cantidad,
            ),
        ),
        db
          .prepare(
            "INSERT INTO eventos_pedido (pedido_id, estado, nota, usuario_id, creado_en) VALUES (?, 'recibido', ?, ?, ?)",
          )
          .bind(id, `Llegó por ${canales[canal]}`, usuario.id, ahora),
      ]);
    } catch (error) {
      // Dos solicitudes con la misma clave al mismo tiempo: se devuelve el pedido que ganó.
      if (claveIdempotencia && String(error).includes("UNIQUE")) {
        const existente = await db
          .prepare("SELECT id FROM pedidos WHERE clave_idempotencia = ?")
          .bind(claveIdempotencia)
          .first<{ id: string }>();
        if (existente) return c.json(await detalleConAcceso(db, usuario, existente.id));
      }
      throw error;
    }

    return c.json(await detalleConAcceso(db, usuario, id), 201);
  })
  .post("/:id/estado", async (c) => {
    const usuario = c.get("usuario");
    const db = c.env.DB;
    const actual = await detalleConAcceso(db, usuario, c.req.param("id"));

    const cuerpo = await leerJson(c.req.raw);
    const nuevo = cuerpo.estado;
    const nota = texto(cuerpo.nota, 300);
    if (!esEstado(nuevo) || !puedeCambiarA(actual.estado, actual.entrega, nuevo)) {
      throw fallar(409, `No se puede pasar de "${estados[actual.estado]}" a ese estado.`);
    }
    if (nuevo === "cancelado" && nota.length < 3) {
      throw fallar(400, "Escribe el motivo de la cancelación.", { nota: "Escribe el motivo." });
    }

    const ahora = new Date().toISOString();
    // Solo cambia si nadie más lo cambió desde que se leyó.
    const [actualizacion] = await db.batch([
      db
        .prepare("UPDATE pedidos SET estado = ?, actualizado_en = ? WHERE id = ? AND estado = ?")
        .bind(nuevo, ahora, actual.id, actual.estado),
      db
        .prepare(
          `INSERT INTO eventos_pedido (pedido_id, estado, nota, usuario_id, creado_en)
         SELECT ?, ?, ?, ?, ? WHERE changes() > 0`,
        )
        .bind(actual.id, nuevo, nota, usuario.id, ahora),
    ]);
    if (actualizacion.meta.changes === 0) {
      throw fallar(409, "Otra persona acaba de actualizar este pedido. Recarga para ver su estado.");
    }
    return c.json(await detalleConAcceso(db, usuario, actual.id));
  });
