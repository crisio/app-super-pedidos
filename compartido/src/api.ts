// Forma de los datos que viajan entre la API y la app.

import type { Canal, Entrega, Estado, Pago } from "./pedidos";

export type Rol = "central" | "local";

export type Usuario = {
  id: string;
  nombre: string;
  rol: Rol;
  // Solo los usuarios de un local tienen local asignado.
  localId: string | null;
};

export type Sesion = {
  token: string;
  usuario: Usuario;
};

export type Local = {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
};

export type Categoria = {
  id: string;
  nombre: string;
};

export type ProductoCatalogo = {
  id: string;
  sku: string;
  codigoBarras: string | null;
  nombre: string;
  categoriaId: string;
  unidad: string;
  precioCentavos: number;
  disponible: boolean;
};

export type Catalogo = {
  categorias: Categoria[];
  productos: ProductoCatalogo[];
};

export type ResumenPedido = {
  id: string;
  numero: number;
  localId: string;
  localNombre: string;
  canal: Canal;
  estado: Estado;
  entrega: Entrega;
  clienteNombre: string;
  clienteTelefono: string;
  totalCentavos: number;
  unidades: number;
  creadoEn: string;
  actualizadoEn: string;
};

export type LineaPedido = {
  productoId: string;
  nombre: string;
  unidad: string;
  precioCentavos: number;
  cantidad: number;
  importeCentavos: number;
};

export type EventoPedido = {
  estado: Estado;
  nota: string;
  usuarioNombre: string | null;
  creadoEn: string;
};

export type DetallePedido = ResumenPedido & {
  direccion: string;
  deliveryNombre: string;
  pago: Pago;
  notas: string;
  subtotalCentavos: number;
  envioCentavos: number;
  tarifaServicioCentavos: number;
  lineas: LineaPedido[];
  eventos: EventoPedido[];
};

export type NuevoPedido = {
  localId: string;
  canal: Canal;
  clienteNombre: string;
  clienteTelefono: string;
  entrega: Entrega;
  direccion: string;
  deliveryNombre: string;
  pago: Pago;
  notas: string;
  lineas: { productoId: string; cantidad: number }[];
};

export type ErrorApi = {
  error: string;
  // Mensajes por campo, cuando el error es de validación.
  campos?: Record<string, string>;
};
