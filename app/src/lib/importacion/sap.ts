// Lectura de inventarios exportados de SAP (Excel, CSV o texto): reconoce las columnas,
// interpreta los números y agrupa las filas por material y centro. No depende del navegador.

import {
  normalizarBusqueda,
  type ExistenciaImportada,
  type LoteImportacion,
  type ProductoImportado,
} from "@super-pedidos/compartido";

export type Celda = string | number | null;
export type Fila = Celda[];

export const campos = {
  sku: "Código de material (SKU)",
  nombre: "Descripción",
  centro: "Centro (sucursal)",
  existencias: "Existencias",
  precio: "Precio de venta",
  unidad: "Unidad de medida",
  codigoBarras: "Código de barras (EAN)",
  categoria: "Categoría o grupo de artículos",
} as const;
export type Campo = keyof typeof campos;

// Columna del archivo que corresponde a cada dato.
export type Mapeo = Partial<Record<Campo, number>>;

// "en": 1,234.56 (lo usual en Honduras) · "es": 1.234,56
export type FormatoNumero = "en" | "es";

// Encabezados habituales en SAP (español e inglés), ya normalizados.
const sinonimos: Record<Campo, string[]> = {
  sku: [
    "material",
    "codigo material",
    "codigo de material",
    "cod material",
    "numero de material",
    "articulo",
    "codigo articulo",
    "sku",
    "material number",
    "codigo",
    "item",
  ],
  nombre: [
    "texto breve de material",
    "texto breve material",
    "texto breve",
    "descripcion",
    "descripcion material",
    "descripcion del material",
    "material description",
    "denominacion",
    "nombre",
    "producto",
    "nombre del producto",
  ],
  centro: ["centro", "plant", "ce", "cen", "sucursal", "tienda", "local", "nombre centro"],
  existencias: [
    "libre utilizacion",
    "libre util",
    "stock libre utilizacion",
    "stock libre",
    "unrestricted",
    "unrestricted use",
    "stock",
    "existencias",
    "existencia",
    "cantidad",
    "inventario",
  ],
  precio: [
    "precio",
    "precio venta",
    "precio de venta",
    "precio unitario",
    "pvp",
    "precio publico",
    "price",
    "sales price",
  ],
  unidad: [
    "unidad medida base",
    "unidad de medida base",
    "unidad de medida",
    "umb",
    "um",
    "unidad",
    "base unit of measure",
    "bun",
    "uom",
  ],
  codigoBarras: ["ean", "ean upc", "codigo ean", "codigo de barras", "cod barras", "upc", "gtin", "barcode"],
  categoria: [
    "grupo de articulos",
    "grupo articulos",
    "grupo art",
    "gr articulos",
    "grupo de material",
    "material group",
    "matl group",
    "categoria",
    "departamento",
    "familia",
    "seccion",
  ],
};

export function normalizarEncabezado(valor: Celda) {
  return normalizarBusqueda(String(valor ?? ""))
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function puntaje(encabezado: string, sinonimo: string) {
  if (!encabezado) return 0;
  if (encabezado === sinonimo) return 10;
  // Los sinónimos cortos ("um", "ce") solo cuentan si son exactos.
  if (sinonimo.length >= 4 && ` ${encabezado} `.includes(` ${sinonimo} `)) return 5 + sinonimo.length / 10;
  return 0;
}

// Asigna a cada dato la columna que mejor coincide, sin repetir columnas.
export function mapearColumnas(encabezados: Fila): { mapeo: Mapeo; puntaje: number } {
  const normalizados = encabezados.map(normalizarEncabezado);
  const opciones: { campo: Campo; columna: number; valor: number }[] = [];
  for (const campo of Object.keys(sinonimos) as Campo[]) {
    normalizados.forEach((encabezado, columna) => {
      const valor = Math.max(...sinonimos[campo].map((sinonimo) => puntaje(encabezado, sinonimo)));
      if (valor > 0) opciones.push({ campo, columna, valor });
    });
  }
  opciones.sort((a, b) => b.valor - a.valor);
  const mapeo: Mapeo = {};
  const usadas = new Set<number>();
  let total = 0;
  for (const { campo, columna, valor } of opciones) {
    if (mapeo[campo] !== undefined || usadas.has(columna)) continue;
    mapeo[campo] = columna;
    usadas.add(columna);
    total += valor;
  }
  return { mapeo, puntaje: total };
}

// Los reportes de SAP suelen traer títulos antes de la fila de encabezados.
export function detectarEncabezado(muestra: Fila[]): { fila: number; mapeo: Mapeo } {
  let mejor = { fila: -1, mapeo: {} as Mapeo, puntaje: 0 };
  muestra.slice(0, 30).forEach((fila, indice) => {
    const resultado = mapearColumnas(fila);
    if (Object.keys(resultado.mapeo).length >= 2 && resultado.puntaje > mejor.puntaje) {
      mejor = { fila: indice, ...resultado };
    }
  });
  if (mejor.fila >= 0) return { fila: mejor.fila, mapeo: mejor.mapeo };
  const primera = muestra.findIndex(
    (fila) => fila.filter((celda) => celda !== null && celda !== "").length >= 2,
  );
  return { fila: Math.max(primera, 0), mapeo: {} };
}

function formatoDe(texto: string): FormatoNumero | null {
  const limpio = texto.trim().replace(/^-|-$/g, "");
  if (!/^[\d.,]+$/.test(limpio)) return null;
  const punto = limpio.lastIndexOf(".");
  const coma = limpio.lastIndexOf(",");
  if (punto >= 0 && coma >= 0) return coma > punto ? "es" : "en";
  // Con tres dígitos después del separador ("1,500") puede ser millares o decimales: no decide.
  if (coma >= 0) return limpio.length - coma - 1 === 3 ? null : "es";
  if (punto >= 0) return limpio.length - punto - 1 === 3 ? null : "en";
  return null;
}

export function detectarFormatoNumero(filas: Fila[], columnas: (number | undefined)[]): FormatoNumero {
  const votos = { en: 0, es: 0 };
  for (const fila of filas) {
    for (const columna of columnas) {
      if (columna === undefined) continue;
      const celda = fila[columna];
      if (typeof celda !== "string") continue;
      const formato = formatoDe(celda);
      if (formato) votos[formato]++;
    }
  }
  return votos.es > votos.en ? "es" : "en";
}

export function parsearNumero(celda: Celda, formato: FormatoNumero): number | null {
  if (typeof celda === "number") return Number.isFinite(celda) ? celda : null;
  if (celda === null) return null;
  let texto = celda
    .trim()
    .replace(/\s/g, "")
    .replace(/^(HNL|L\.?|\$)/i, "");
  if (!texto) return null;
  // SAP escribe los negativos con el signo al final: "5-".
  const negativo = texto.startsWith("-") || texto.endsWith("-");
  texto = texto.replace(/^-|-$/g, "");
  texto = formato === "es" ? texto.replace(/\./g, "").replace(",", ".") : texto.replace(/,/g, "");
  if (!/^\d*\.?\d+$/.test(texto)) return null;
  const numero = Number(texto);
  return negativo ? -numero : numero;
}

// SAP guarda los materiales numéricos con ceros a la izquierda; se quitan para comparar.
export function normalizarSku(celda: Celda) {
  if (celda === null) return "";
  const texto = typeof celda === "number" ? String(Math.trunc(celda)) : celda.trim();
  return /^\d+$/.test(texto) ? texto.replace(/^0+(?=\d)/, "") : texto;
}

function textoDe(celda: Celda) {
  if (celda === null) return null;
  const texto = typeof celda === "number" ? String(celda) : celda.trim();
  return texto === "" ? null : texto;
}

function codigoDe(celda: Celda) {
  if (typeof celda === "number") return String(Math.trunc(celda));
  return textoDe(celda);
}

export type ProductoAgrupado = ProductoImportado & {
  // Existencias por código de centro ("" si el archivo no trae centro).
  existencias: Map<string, number>;
};

export class Agregador {
  productos = new Map<string, ProductoAgrupado>();
  filasPorCentro = new Map<string, number>();
  filasLeidas = 0;
  filasSinMaterial = 0;
  private encabezadoSku: string;

  constructor(
    private mapeo: Mapeo,
    private formato: FormatoNumero,
    encabezados: Fila,
  ) {
    this.encabezadoSku = mapeo.sku === undefined ? "" : normalizarEncabezado(encabezados[mapeo.sku]);
  }

  agregar(fila: Fila) {
    const { mapeo, formato } = this;
    if (mapeo.sku === undefined) return;
    const celdaSku = fila[mapeo.sku] ?? null;
    // Los reportes paginados repiten la fila de encabezados.
    if (normalizarEncabezado(celdaSku) === this.encabezadoSku && this.encabezadoSku) return;
    this.filasLeidas++;
    const sku = normalizarSku(celdaSku);
    if (!sku) {
      this.filasSinMaterial++;
      return;
    }
    const valor = (campo: Campo) => (mapeo[campo] === undefined ? null : (fila[mapeo[campo]!] ?? null));

    let producto = this.productos.get(sku);
    if (!producto) {
      producto = {
        sku,
        nombre: null,
        unidad: null,
        codigoBarras: null,
        precioCentavos: null,
        categoria: null,
        existencias: new Map(),
      };
      this.productos.set(sku, producto);
    }
    producto.nombre ??= textoDe(valor("nombre"))?.slice(0, 200) ?? null;
    producto.unidad ??= textoDe(valor("unidad"))?.slice(0, 30) ?? null;
    producto.codigoBarras ??= codigoDe(valor("codigoBarras"))?.slice(0, 40) ?? null;
    producto.categoria ??= textoDe(valor("categoria"))?.slice(0, 60) ?? null;
    if (producto.precioCentavos === null) {
      const precio = parsearNumero(valor("precio"), formato);
      if (precio !== null && precio >= 0) producto.precioCentavos = Math.round(precio * 100);
    }

    const centro = mapeo.centro === undefined ? "" : (codigoDe(valor("centro")) ?? "");
    this.filasPorCentro.set(centro, (this.filasPorCentro.get(centro) ?? 0) + 1);
    if (mapeo.existencias !== undefined) {
      const cantidad = parsearNumero(valor("existencias"), formato);
      if (cantidad !== null) {
        producto.existencias.set(centro, (producto.existencias.get(centro) ?? 0) + cantidad);
      }
    }
  }
}

const PRODUCTOS_POR_LOTE = 400;
const EXISTENCIAS_POR_LOTE = 4000;

// Arma los lotes para la API. Si dos centros van al mismo local, sus existencias se suman.
// Los centros sin local asignado se omiten.
export function armarLotes(productos: Iterable<ProductoAgrupado>, localPorCentro: Record<string, string>) {
  const lotes: LoteImportacion[] = [];
  let actual: LoteImportacion = { productos: [], existencias: [] };
  for (const { existencias, ...producto } of productos) {
    const porLocal = new Map<string, number>();
    for (const [centro, cantidad] of existencias) {
      const localId = localPorCentro[centro];
      if (localId) porLocal.set(localId, (porLocal.get(localId) ?? 0) + cantidad);
    }
    const filas: ExistenciaImportada[] = [...porLocal].map(([localId, cantidad]) => ({
      sku: producto.sku,
      localId,
      cantidad: Math.round(cantidad * 1000) / 1000,
    }));
    if (
      actual.productos.length >= PRODUCTOS_POR_LOTE ||
      actual.existencias.length + filas.length > EXISTENCIAS_POR_LOTE
    ) {
      lotes.push(actual);
      actual = { productos: [], existencias: [] };
    }
    actual.productos.push(producto);
    actual.existencias.push(...filas);
  }
  if (actual.productos.length > 0) lotes.push(actual);
  return lotes;
}
