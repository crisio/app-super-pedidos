"use server";

import {
  armarLineas,
  calcularTotales,
  metodosPago,
  tiposEntrega,
  type Carrito,
  type MetodoPago,
  type ResultadoPedido,
  type TipoEntrega,
} from "@/lib/pedido";

function leerTexto(datos: FormData, campo: string) {
  const valor = datos.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function leerCarrito(datos: FormData): Carrito {
  try {
    const valor: unknown = JSON.parse(leerTexto(datos, "carrito"));
    if (valor && typeof valor === "object" && !Array.isArray(valor)) {
      return valor as Carrito;
    }
  } catch {
    // Un carrito ilegible se trata como vacío.
  }
  return {};
}

// Valida el pedido y recalcula los totales con los precios del catálogo:
// nunca se confía en precios ni totales enviados por el navegador.
export async function crearPedido(datos: FormData): Promise<ResultadoPedido> {
  const nombre = leerTexto(datos, "nombre");
  const telefono = leerTexto(datos, "telefono").replace(/[\s-]/g, "");
  const direccion = leerTexto(datos, "direccion");
  const notas = leerTexto(datos, "notas").slice(0, 500);
  const entrega = leerTexto(datos, "entrega");
  const pago = leerTexto(datos, "pago");
  const lineas = armarLineas(leerCarrito(datos));

  const errores: Extract<ResultadoPedido, { ok: false }>["errores"] = {};
  if (nombre.length < 2) errores.nombre = "Escribe tu nombre.";
  if (!/^\d{8}$/.test(telefono)) errores.telefono = "Escribe un teléfono de 8 dígitos.";
  if (!Object.hasOwn(tiposEntrega, entrega)) {
    errores.entrega = "Elige cómo quieres recibir tu pedido.";
  }
  if (entrega === "domicilio" && direccion.length < 5) {
    errores.direccion = "Escribe la dirección de entrega.";
  }
  if (!Object.hasOwn(metodosPago, pago)) errores.pago = "Elige un método de pago.";
  if (lineas.length === 0) errores.carrito = "Tu carrito está vacío.";

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  const tipoEntrega = entrega as TipoEntrega;
  const { subtotal, envio, total } = calcularTotales(lineas, tipoEntrega);

  // TODO: guardar el pedido en la base de datos y avisar a la tienda.
  return {
    ok: true,
    pedido: {
      numero: `SP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      fecha: new Date().toISOString(),
      cliente: {
        nombre,
        telefono: `${telefono.slice(0, 4)}-${telefono.slice(4)}`,
        direccion: tipoEntrega === "domicilio" ? direccion : "",
        notas,
      },
      entrega: tipoEntrega,
      pago: pago as MetodoPago,
      lineas: lineas.map(({ producto, cantidad, importe }) => ({
        id: producto.id,
        nombre: producto.nombre,
        emoji: producto.emoji,
        unidad: producto.unidad,
        precio: producto.precio,
        cantidad,
        importe,
      })),
      subtotal,
      envio,
      total,
    },
  };
}
