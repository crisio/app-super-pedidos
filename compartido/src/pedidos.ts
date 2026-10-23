// Reglas del pedido que comparten la API y la app.

export const canales = {
  app: "App",
  whatsapp: "WhatsApp",
  telefono: "Teléfono",
  redes: "Redes sociales",
  delivery_externo: "Delivery externo",
} as const;
export type Canal = keyof typeof canales;

// Canales que el personal puede capturar a mano desde la bandeja.
export const canalesDeCaptura: Canal[] = ["whatsapp", "telefono", "redes", "delivery_externo"];

export const estados = {
  recibido: "Recibido",
  aceptado: "Aceptado",
  preparando: "Preparando",
  listo: "Listo",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
} as const;
export type Estado = keyof typeof estados;

export const estadosActivos: Estado[] = ["recibido", "aceptado", "preparando", "listo", "en_camino"];
export const estadosCerrados: Estado[] = ["entregado", "cancelado"];

export const entregas = {
  domicilio: "Entrega a domicilio",
  recoger: "Recoge el cliente",
  delivery_externo: "Lo recoge un delivery",
} as const;
export type Entrega = keyof typeof entregas;

export const pagos = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
} as const;
export type Pago = keyof typeof pagos;

function esClaveDe(objeto: object, valor: unknown) {
  return typeof valor === "string" && Object.prototype.hasOwnProperty.call(objeto, valor);
}
export function esCanal(valor: unknown): valor is Canal {
  return esClaveDe(canales, valor);
}
export function esEstado(valor: unknown): valor is Estado {
  return esClaveDe(estados, valor);
}
export function esEntrega(valor: unknown): valor is Entrega {
  return esClaveDe(entregas, valor);
}
export function esPago(valor: unknown): valor is Pago {
  return esClaveDe(pagos, valor);
}

// Siguiente paso normal del pedido. Los pedidos que recoge el cliente o un
// delivery externo pasan de "listo" directo a "entregado".
export function siguienteEstado(estado: Estado, entrega: Entrega): Estado | null {
  switch (estado) {
    case "recibido":
      return "aceptado";
    case "aceptado":
      return "preparando";
    case "preparando":
      return "listo";
    case "listo":
      return entrega === "domicilio" ? "en_camino" : "entregado";
    case "en_camino":
      return "entregado";
    default:
      return null;
  }
}

export function puedeCambiarA(actual: Estado, entrega: Entrega, nuevo: Estado) {
  if (estadosCerrados.includes(actual)) return false;
  return nuevo === "cancelado" || nuevo === siguienteEstado(actual, entrega);
}

export function textoAccion(nuevo: Estado, entrega: Entrega) {
  switch (nuevo) {
    case "aceptado":
      return "Aceptar pedido";
    case "preparando":
      return "Empezar a preparar";
    case "listo":
      return "Marcar como listo";
    case "en_camino":
      return "Salió a entregar";
    case "entregado":
      return entrega === "domicilio" ? "Marcar entregado" : "Ya lo recogieron";
    case "cancelado":
      return "Cancelar pedido";
    default:
      return estados[nuevo];
  }
}

// Montos provisionales: ajustarlos con el súper piloto.
export const COSTO_ENVIO_CENTAVOS = 6000;
export const ENVIO_GRATIS_DESDE_CENTAVOS = 80000;
export const TARIFA_DELIVERY_EXTERNO_CENTAVOS = 3000;
export const MAX_CANTIDAD_POR_PRODUCTO = 99;

export function calcularTotales(lineas: { precioCentavos: number; cantidad: number }[], entrega: Entrega) {
  const subtotal = lineas.reduce((suma, linea) => suma + linea.precioCentavos * linea.cantidad, 0);
  const envio =
    entrega === "domicilio" && subtotal > 0 && subtotal < ENVIO_GRATIS_DESDE_CENTAVOS
      ? COSTO_ENVIO_CENTAVOS
      : 0;
  const tarifaServicio = entrega === "delivery_externo" ? TARIFA_DELIVERY_EXTERNO_CENTAVOS : 0;
  return { subtotal, envio, tarifaServicio, total: subtotal + envio + tarifaServicio };
}

// Teléfonos de Honduras: 8 dígitos, con o sin guion.
export function normalizarTelefono(telefono: string) {
  return telefono.replace(/[\s-]/g, "");
}

export function esTelefonoValido(telefono: string) {
  return /^\d{8}$/.test(normalizarTelefono(telefono));
}

export function formatearTelefono(telefono: string) {
  const digitos = normalizarTelefono(telefono);
  return digitos.length === 8 ? `${digitos.slice(0, 4)}-${digitos.slice(4)}` : telefono;
}
