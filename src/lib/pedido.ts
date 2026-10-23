import { buscarProducto, type Producto } from "./productos";

// Reglas del pedido, compartidas por el navegador (para mostrar totales)
// y el servidor (que vuelve a calcularlos antes de aceptar un pedido).

export const COSTO_ENVIO = 60;
export const ENVIO_GRATIS_DESDE = 800;
export const MAX_POR_PRODUCTO = 50;

export type TipoEntrega = "domicilio" | "recoger";
export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export const tiposEntrega: Record<TipoEntrega, string> = {
  domicilio: "Entrega a domicilio",
  recoger: "Recoger en tienda",
};

export const metodosPago: Record<MetodoPago, string> = {
  efectivo: "Efectivo al recibir",
  tarjeta: "Tarjeta al recibir",
  transferencia: "Transferencia bancaria",
};

// Cantidad por id de producto.
export type Carrito = Record<string, number>;

export type Linea = {
  producto: Producto;
  cantidad: number;
  importe: number;
};

export type LineaPedido = {
  id: string;
  nombre: string;
  emoji: string;
  unidad: string;
  precio: number;
  cantidad: number;
  importe: number;
};

export type Pedido = {
  numero: string;
  fecha: string;
  cliente: {
    nombre: string;
    telefono: string;
    direccion: string;
    notas: string;
  };
  entrega: TipoEntrega;
  pago: MetodoPago;
  lineas: LineaPedido[];
  subtotal: number;
  envio: number;
  total: number;
};

export type CampoConError = "nombre" | "telefono" | "direccion" | "entrega" | "pago" | "carrito";

export type ResultadoPedido =
  | { ok: true; pedido: Pedido }
  | { ok: false; errores: Partial<Record<CampoConError, string>> };

function redondear(valor: number) {
  return Math.round(valor * 100) / 100;
}

// Ignora productos que no existen y cantidades inválidas.
export function armarLineas(carrito: Carrito): Linea[] {
  const lineas: Linea[] = [];
  for (const [id, cantidad] of Object.entries(carrito)) {
    const producto = buscarProducto(id);
    if (!producto || !Number.isInteger(cantidad) || cantidad < 1) continue;
    const cantidadValida = Math.min(cantidad, MAX_POR_PRODUCTO);
    lineas.push({
      producto,
      cantidad: cantidadValida,
      importe: redondear(producto.precio * cantidadValida),
    });
  }
  return lineas;
}

export function calcularTotales(lineas: Linea[], entrega: TipoEntrega) {
  const subtotal = redondear(lineas.reduce((suma, linea) => suma + linea.importe, 0));
  const envio =
    entrega === "domicilio" && subtotal > 0 && subtotal < ENVIO_GRATIS_DESDE ? COSTO_ENVIO : 0;
  return { subtotal, envio, total: redondear(subtotal + envio) };
}

export function contarUnidades(lineas: Linea[]) {
  return lineas.reduce((suma, linea) => suma + linea.cantidad, 0);
}
