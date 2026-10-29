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
  // Código del centro en SAP, si el inventario del local viene de SAP.
  codigoSap: string | null;
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
  // Existencias en el local según el último inventario de SAP.
  existencias: number | null;
};

// Una página de resultados de búsqueda en el catálogo de un local.
export type Catalogo = {
  categorias: Categoria[];
  productos: ProductoCatalogo[];
  hayMas: boolean;
  // Cuántos productos del local están agotados; null si no se pidió el conteo.
  agotados: number | null;
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

// Importación de inventario desde SAP.

export type CentroImportado = {
  codigo: string;
  // Local existente al que corresponde el centro, o nombre para crear uno nuevo.
  localId?: string;
  nombreNuevo?: string;
};

export type NuevaImportacion = {
  archivo: string;
  centros: CentroImportado[];
};

export type ImportacionIniciada = {
  id: string;
  // Local asignado a cada código de centro.
  locales: Record<string, string>;
  localesCreados: number;
};

export type ProductoImportado = {
  sku: string;
  nombre: string | null;
  unidad: string | null;
  codigoBarras: string | null;
  precioCentavos: number | null;
  categoria: string | null;
};

export type ExistenciaImportada = {
  sku: string;
  localId: string;
  cantidad: number;
};

export type LoteImportacion = {
  productos: ProductoImportado[];
  existencias: ExistenciaImportada[];
};

export type ResultadoLote = {
  productosCambiados: number;
  existenciasActualizadas: number;
};

export type FinImportacion = {
  // Todos los SKU del archivo; solo se usa si se piden desactivar los que faltan.
  desactivarFaltantes: boolean;
  skus: string[];
};

export type ResultadoImportacion = {
  productos: number;
  existencias: number;
  agotadosPorFaltar: number;
  desactivados: number;
};

export type ErrorApi = {
  error: string;
  // Mensajes por campo, cuando el error es de validación.
  campos?: Record<string, string>;
};
