// Piezas del diseño de iOS: colores, tipografía y medidas del sistema.
// Los colores son los semánticos de Apple: cambian solos entre modo claro y oscuro.
import { Platform, PlatformColor, type TextStyle } from "react-native";
import type { Estado } from "@super-pedidos/compartido";
import { TINTE_IOS } from "@/tema";

export const color = {
  fondo: PlatformColor("systemGroupedBackground"),
  celda: PlatformColor("secondarySystemGroupedBackground"),
  celdaPresionada: PlatformColor("systemGray4"),
  texto: PlatformColor("label"),
  secundario: PlatformColor("secondaryLabel"),
  terciario: PlatformColor("tertiaryLabel"),
  separador: PlatformColor("separator"),
  relleno: PlatformColor("tertiarySystemFill"),
  marcador: PlatformColor("placeholderText"),
  tinte: TINTE_IOS,
  verde: PlatformColor("systemGreen"),
  rojo: PlatformColor("systemRed"),
  naranja: PlatformColor("systemOrange"),
  amarillo: PlatformColor("systemYellow"),
  azul: PlatformColor("systemBlue"),
  morado: PlatformColor("systemPurple"),
  indigo: PlatformColor("systemIndigo"),
  turquesa: PlatformColor("systemTeal"),
  gris: PlatformColor("systemGray"),
};

// Estilos de texto de iOS en su tamaño base; el texto crece con el tamaño que elija la persona.
export const texto = {
  tituloGrande: { fontSize: 34, fontWeight: "700" },
  titulo1: { fontSize: 28, fontWeight: "700" },
  titulo2: { fontSize: 22, fontWeight: "700" },
  titulo3: { fontSize: 20, fontWeight: "600" },
  encabezado: { fontSize: 17, fontWeight: "600" },
  cuerpo: { fontSize: 17 },
  llamada: { fontSize: 16 },
  subtitulo: { fontSize: 15 },
  nota: { fontSize: 13 },
  leyenda: { fontSize: 12 },
} satisfies Record<string, TextStyle>;

export const VERSION_IOS = Number.parseInt(String(Platform.Version), 10) || 0;

// iOS 26 (Liquid Glass) redondea más las secciones agrupadas.
export const RADIO_SECCION = VERSION_IOS >= 26 ? 26 : 10;
export const MARGEN = 16;

// Color de cada estado del pedido, con los colores del sistema.
export const colorEstado: Record<Estado, (typeof color)[keyof typeof color]> = {
  recibido: color.naranja,
  aceptado: color.azul,
  preparando: color.morado,
  listo: color.verde,
  en_camino: color.turquesa,
  entregado: color.gris,
  cancelado: color.rojo,
};
